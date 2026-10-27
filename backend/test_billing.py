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
