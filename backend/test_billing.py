from datetime import date, datetime, timedelta, timezone
import json
from pathlib import Path
import sys

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

sys.path.insert(0, str(Path(__file__).resolve().parent))
import server


@pytest.fixture
def db_factory(monkeypatch):
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    server.Base.metadata.create_all(bind=engine)
    test_session = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    monkeypatch.setattr(server, "SessionLocal", test_session)
    monkeypatch.setattr(server, "send_push_to_user", lambda *args, **kwargs: None)
    monkeypatch.setattr(server, "attempt_recurring_charge", lambda *args: False)
    yield test_session
    server.Base.metadata.drop_all(bind=engine)
    engine.dispose()


def create_user(db, created_at, session_token=None, meter_install_date=None):
    user = server.DBUser(
        user_id="user_test",
        email="billing-test@example.com",
        name="Billing Test",
        role="user",
        tariffRate=8.0,
        created_at=created_at,
        session_token=session_token,
        session_expires_at=datetime.now(timezone.utc) + timedelta(days=1),
    )
    db.add(user)
    db.commit()
    if meter_install_date:
        db.add(server.ConsumerProfile(userId=user.user_id, meterInstallDate=meter_install_date))
        db.commit()
    return user


def add_reading(db, user_id, timestamp, energy):
    db.add(
        server.EnergyReading(
            readingId=f"read_{timestamp.timestamp()}",
            userId=user_id,
            voltage=230.0,
            current=1.0,
            power=230.0,
            energy=energy,
            timestamp=timestamp,
        )
    )
    db.commit()


def test_billing_cycle_clamps_short_months_to_anchor_day():
    anchor = date(2026, 1, 31)

    february_end = server._next_anchor_after(
        anchor, datetime(2026, 1, 31, tzinfo=timezone.utc)
    )
    march_end = server._next_anchor_after(anchor, february_end)

    assert february_end.astimezone(server.IST).date() == date(2026, 2, 28)
    assert march_end.astimezone(server.IST).date() == date(2026, 3, 31)


def test_estimate_is_monthly_preview_only(db_factory):
    db = db_factory()
    now = datetime.now(timezone.utc)
    install_date = now.strftime("%d/%m/%Y")
    user = create_user(
        db,
        now - timedelta(days=60),
        session_token="test-session",
        meter_install_date=install_date,
    )
    add_reading(db, user.user_id, now - timedelta(minutes=2), 10.0)
    add_reading(db, user.user_id, now - timedelta(minutes=1), 10.75)
    db.close()

    with TestClient(server.app, cookies={"session_token": "test-session"}) as client:
        response = client.get("/api/user/bill-estimate")
        removed_generation_endpoint = client.post("/api/user/generate-bill")

    assert response.status_code == 200
    assert response.json()["isEstimate"] is True
    assert response.json()["unitsConsumed"] == pytest.approx(0.75)
    assert removed_generation_endpoint.status_code == 404


def test_final_bill_is_created_once_for_monthly_cycle(db_factory):
    db = db_factory()
    now = datetime.now(timezone.utc)
    anchor_date = now.date() - timedelta(days=40)
    user = create_user(
        db,
        now - timedelta(days=90),
        meter_install_date=anchor_date.strftime("%d/%m/%Y"),
    )
    period_end = server._next_anchor_after(
        anchor_date,
        datetime.combine(anchor_date, datetime.min.time(), timezone.utc),
    )
    add_reading(
        db,
        user.user_id,
        server._anchor_datetime(anchor_date) - timedelta(minutes=1),
        0.0,
    )
    add_reading(
        db,
        user.user_id,
        period_end - timedelta(minutes=1),
        300.0,
    )

    bill = server.generate_bill_for_user(db, user)
    db.commit()
    breakdown = db.query(server.BillBreakdown).filter_by(billId=bill.billId).one()
    another_bill_for_same_due_cycle = server.generate_bill_for_user(db, user)

    assert bill.billId == server._period_bill_id(user.user_id, period_end)
    assert breakdown.unitsConsumed == pytest.approx(300.0)
    assert another_bill_for_same_due_cycle is None
    db.close()


def test_estimate_rejects_stale_meter_reading(db_factory):
    db = db_factory()
    now = datetime.now(timezone.utc)
    user = create_user(
        db,
        now - timedelta(days=60),
        session_token="test-session",
        meter_install_date=now.strftime("%d/%m/%Y"),
    )
    add_reading(db, user.user_id, now - timedelta(minutes=15), 1.0)
    add_reading(db, user.user_id, now - timedelta(minutes=11), 1.5)
    db.close()

    with TestClient(server.app, cookies={"session_token": "test-session"}) as client:
        response = client.get("/api/user/bill-estimate")

    assert response.status_code == 409
    assert "older than 10 minutes" in response.json()["detail"]


def test_monthly_usage_rejects_reset_between_readings(db_factory):
    db = db_factory()
    now = datetime.now(timezone.utc)
    period_start = now - timedelta(minutes=5)
    period_end = now + timedelta(minutes=5)
    add_reading(db, "user_test", period_start - timedelta(minutes=1), 10.0)
    add_reading(db, "user_test", period_start + timedelta(minutes=1), 12.0)
    add_reading(db, "user_test", period_start + timedelta(minutes=2), 1.0)
    add_reading(db, "user_test", period_start + timedelta(minutes=3), 13.0)

    with pytest.raises(ValueError, match="counter decreased"):
        server.meter_energy_delta(db, "user_test", period_start, period_end)
    db.close()


def test_due_reminders_send_each_stage_once(db_factory):
    db = db_factory()
    now = datetime.now(timezone.utc)
    user = create_user(db, now - timedelta(days=60))
    for offset, bill_id in ((3, "bill_before"), (0, "bill_due"), (-3, "bill_overdue")):
        db.add(
            server.Bill(
                billId=bill_id,
                userId=user.user_id,
                amount=50.0,
                status="unpaid",
                generatedAt=now - timedelta(days=10),
                dueDate=now + timedelta(days=offset),
            )
        )
    db.commit()
    db.close()

    server.send_due_bill_reminders()
    server.send_due_bill_reminders()

    db = db_factory()
    reminders = db.query(server.Notification).filter_by(
        userId="user_test",
        type="bill_due_reminder",
    ).all()
    stages = {json.loads(item.data)["stage"] for item in reminders}
    assert stages == {"three_days_before", "due_today", "three_days_overdue"}
    assert len(reminders) == 3
    db.close()


def test_usage_payment_preview_uses_recent_cumulative_meter_movement(db_factory):
    db = db_factory()
    now = datetime.now(timezone.utc)
    user = create_user(
        db,
        now - timedelta(days=60),
        session_token="test-session",
        meter_install_date=now.strftime("%d/%m/%Y"),
    )
    add_reading(db, user.user_id, now - timedelta(minutes=9), 10.0)
    add_reading(db, user.user_id, now - timedelta(minutes=2), 11.5)
    db.close()

    with TestClient(server.app, cookies={"session_token": "test-session"}) as client:
        response = client.post("/api/user/usage-payment/preview", json={"minutes": 10})

    assert response.status_code == 200
    assert response.json()["unitsConsumed"] == pytest.approx(1.5)
    assert response.json()["amount"] == pytest.approx(12.0)
    assert response.json()["paymentMode"] == "test"
    assert response.json()["monthlyCredit"] is True
    db = db_factory()
    reminder = db.query(server.UsagePaymentReminder).one()
    assert response.json()["reminderId"] == reminder.reminderId
    assert reminder.status == "pending"
    assert reminder.notifyAt - reminder.createdAt == timedelta(minutes=1)
    db.close()


def test_unpaid_usage_quote_sends_one_reminder_after_deadline(db_factory, monkeypatch):
    db = db_factory()
    now = datetime.now(timezone.utc)
    user = create_user(
        db,
        now - timedelta(days=60),
        session_token="test-session",
        meter_install_date=now.strftime("%d/%m/%Y"),
    )
    add_reading(db, user.user_id, now - timedelta(minutes=9), 10.0)
    add_reading(db, user.user_id, now - timedelta(minutes=2), 11.5)
    db.close()

    with TestClient(server.app, cookies={"session_token": "test-session"}) as client:
        response = client.post("/api/user/usage-payment/preview", json={"minutes": 10})

    assert response.status_code == 200
    db = db_factory()
    reminder = db.query(server.UsagePaymentReminder).one()
    reminder.notifyAt = datetime.now(timezone.utc) - timedelta(seconds=1)
    db.commit()
    db.close()

    pushed = []
    monkeypatch.setattr(
        server,
        "send_push_to_user",
        lambda _db, user_id, title, body: pushed.append((user_id, title, body)),
    )
    server.send_due_usage_payment_reminders()
    server.send_due_usage_payment_reminders()

    db = db_factory()
    reminder = db.query(server.UsagePaymentReminder).one()
    notifications = db.query(server.Notification).filter_by(
        userId="user_test",
        type="usage_payment_reminder",
    ).all()
    assert reminder.status == "sent"
    assert len(notifications) == 1
    assert len(pushed) == 1
    assert "haven't completed payment" in notifications[0].message
    db.close()


def test_usage_payment_order_is_blocked_outside_razorpay_test_mode(
    db_factory, monkeypatch
):
    db = db_factory()
    now = datetime.now(timezone.utc)
    user = create_user(
        db,
        now - timedelta(days=60),
        session_token="test-session",
        meter_install_date=now.strftime("%d/%m/%Y"),
    )
    add_reading(db, user.user_id, now - timedelta(minutes=9), 10.0)
    add_reading(db, user.user_id, now - timedelta(minutes=2), 11.5)
    db.close()
    monkeypatch.setattr(server, "RAZORPAY_KEY_ID", "rzp_live_not_allowed")

    with TestClient(server.app, cookies={"session_token": "test-session"}) as client:
        response = client.post("/api/user/usage-payment/order", json={"minutes": 10})

    assert response.status_code == 503
    assert "test mode" in response.json()["detail"]


def test_usage_payment_test_checkout_verifies_once_and_records_credit(db_factory, monkeypatch):
    db = db_factory()
    now = datetime.now(timezone.utc)
    user = create_user(
        db,
        now - timedelta(days=60),
        session_token="test-session",
        meter_install_date=now.strftime("%d/%m/%Y"),
    )
    add_reading(db, user.user_id, now - timedelta(minutes=9), 10.0)
    add_reading(db, user.user_id, now - timedelta(minutes=2), 11.5)
    db.close()

    monkeypatch.setattr(server, "RAZORPAY_KEY_ID", "rzp_test_demo")
    monkeypatch.setattr(
        server.razorpay_client.order,
        "create",
        lambda _order: {"id": "order_test", "amount": 1200, "currency": "INR"},
    )
    monkeypatch.setattr(
        server.razorpay_client.utility,
        "verify_payment_signature",
        lambda _signature: None,
    )

    with TestClient(server.app, cookies={"session_token": "test-session"}) as client:
        preview_response = client.post(
            "/api/user/usage-payment/preview", json={"minutes": 10}
        )
        order_response = client.post(
            "/api/user/usage-payment/order",
            json={
                "minutes": 10,
                "reminderId": preview_response.json()["reminderId"],
            },
        )
        order = order_response.json()
        verification_payload = {
            "usagePaymentId": order["usagePaymentId"],
            "razorpay_order_id": order["orderId"],
            "razorpay_payment_id": "pay_test_usage",
            "razorpay_signature": "test-signature",
        }
        verify_response = client.post(
            "/api/user/usage-payment/verify", json=verification_payload
        )
        duplicate_response = client.post(
            "/api/user/usage-payment/verify", json=verification_payload
        )

    assert order_response.status_code == 200
    assert order["paymentMode"] == "test"
    assert verify_response.status_code == 200
    assert duplicate_response.status_code == 200

    db = db_factory()
    prepayment = db.query(server.UsagePrepayment).one()
    payment = db.query(server.Payment).one()
    assert prepayment.status == "paid"
    assert prepayment.amount == pytest.approx(12.0)
    assert payment.method == "razorpay_test_usage"
    assert payment.billId == prepayment.usagePaymentId
    reminder = db.query(server.UsagePaymentReminder).one()
    assert reminder.status == "paid"
    db.close()


def test_monthly_bill_applies_usage_prepayment_credit(db_factory):
    db = db_factory()
    now = datetime.now(timezone.utc)
    anchor_date = now.date() - timedelta(days=40)
    user = create_user(
        db,
        now - timedelta(days=90),
        meter_install_date=anchor_date.strftime("%d/%m/%Y"),
    )
    period_start = server._anchor_datetime(anchor_date)
    period_end = server._next_anchor_after(anchor_date, period_start)
    bill_id = server._period_bill_id(user.user_id, period_end)
    add_reading(db, user.user_id, period_start - timedelta(minutes=1), 0.0)
    add_reading(db, user.user_id, period_end - timedelta(minutes=1), 10.0)
    db.add(
        server.UsagePrepayment(
            usagePaymentId="usage_test_credit",
            userId=user.user_id,
            monthlyBillId=bill_id,
            fromReadingId="reading_start",
            toReadingId="reading_end",
            windowStart=period_start,
            windowEnd=period_end - timedelta(minutes=1),
            unitsConsumed=1.0,
            amount=20.0,
            status="paid",
            createdAt=now - timedelta(days=2),
            expiresAt=now + timedelta(days=1),
        )
    )
    db.commit()
    total_before_credit = server.calculate_bill_total(db, user, 10.0)[3]

    bill = server.generate_bill_for_user(db, user)
    db.commit()
    breakdown = db.query(server.BillBreakdown).filter_by(billId=bill_id).one()

    assert bill.amount == pytest.approx(max(0.0, total_before_credit - 20.0))
    assert breakdown.totalPayable - bill.amount == pytest.approx(
        min(total_before_credit, 20.0)
    )
    db.close()
