"""
Seed test data for Smart Energy Monitoring System
SQLite / SQLAlchemy version — populates smart_energy.db directly.
Run this AFTER server.py has been started at least once (so the
tables exist), or it will create the tables itself on first run.
"""

from sqlalchemy import create_engine, Column, String, Float, DateTime, Boolean, Integer, Text
from sqlalchemy.orm import sessionmaker, declarative_base
from datetime import datetime, timezone, timedelta
import bcrypt
import uuid
import random

# ---------------------------------------------------------------------------
# DB setup — must match server.py exactly (same file, same table layout)
# ---------------------------------------------------------------------------
DATABASE_URL = "sqlite:///./smart_energy.db"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class UserORM(Base):
    __tablename__ = "users"
    id            = Column(Integer, primary_key=True, autoincrement=True)
    user_id       = Column(String, unique=True, index=True, nullable=False)
    email         = Column(String, unique=True, index=True, nullable=False)
    password      = Column(String, nullable=True)
    name          = Column(String, nullable=False)
    role          = Column(String, default="user")
    picture       = Column(String, nullable=True)
    balance       = Column(Float, default=1000.0)
    tariffRate    = Column(Float, default=8.0)
    session_token = Column(String, nullable=True, index=True)
    created_at    = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class EnergyReadingORM(Base):
    __tablename__ = "energy_readings"
    id        = Column(Integer, primary_key=True, autoincrement=True)
    readingId = Column(String, unique=True, index=True)
    userId    = Column(String, index=True)
    voltage   = Column(Float)
    current   = Column(Float)
    power     = Column(Float)
    energy    = Column(Float)
    timestamp = Column(DateTime, index=True)


class BillORM(Base):
    __tablename__ = "bills"
    id          = Column(Integer, primary_key=True, autoincrement=True)
    billId      = Column(String, unique=True, index=True)
    userId      = Column(String, index=True)
    amount      = Column(Float)
    status      = Column(String, default="unpaid")
    generatedAt = Column(DateTime)
    dueDate     = Column(DateTime, nullable=True)
    paidAt      = Column(DateTime, nullable=True)


class PaymentORM(Base):
    __tablename__ = "payments"
    id          = Column(Integer, primary_key=True, autoincrement=True)
    paymentId   = Column(String, unique=True, index=True)
    userId      = Column(String, index=True)
    billId      = Column(String, index=True)
    amount      = Column(Float)
    paymentDate = Column(DateTime)
    method      = Column(String, default="wallet")


class NotificationORM(Base):
    __tablename__ = "notifications"
    id        = Column(Integer, primary_key=True, autoincrement=True)
    notifId   = Column(String, unique=True, index=True)
    userId    = Column(String, index=True)
    type      = Column(String)
    message   = Column(String)
    data_json = Column(Text, nullable=True)
    isRead    = Column(Boolean, default=False)
    createdAt = Column(DateTime, index=True)


class PowerControlORM(Base):
    __tablename__ = "power_control"
    id           = Column(Integer, primary_key=True, autoincrement=True)
    controlId    = Column(String, unique=True, index=True)
    userId       = Column(String, index=True)
    status       = Column(String)
    controlledBy = Column(String, nullable=True)
    timestamp    = Column(DateTime, index=True)


# Make sure tables exist (no-op if server.py already created them)
Base.metadata.create_all(bind=engine)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def seed_database():
    db = SessionLocal()
    try:
        # ── Clear existing data ────────────────────────────────────────────
        print("Clearing existing data...")
        db.query(NotificationORM).delete()
        db.query(PowerControlORM).delete()
        db.query(PaymentORM).delete()
        db.query(BillORM).delete()
        db.query(EnergyReadingORM).delete()
        db.query(UserORM).delete()
        db.commit()

        # ── Create admin user ──────────────────────────────────────────────
        print("Creating admin user...")
        admin_id       = f"user_{uuid.uuid4().hex[:12]}"
        admin_password = hash_password("admin123")

        admin = UserORM(
            user_id    = admin_id,
            email      = "admin@smartenergy.com",
            password   = admin_password,
            name       = "Admin User",
            role       = "admin",
            picture    = None,
            balance    = 0,
            tariffRate = 8.0,
            created_at = datetime.now(timezone.utc),
        )
        db.add(admin)
        db.commit()
        print("Admin created: admin@smartenergy.com / admin123")

        # ── Create test users ──────────────────────────────────────────────
        print("Creating test users...")
        test_users = []
        for i in range(1, 6):
            user_id  = f"user_{uuid.uuid4().hex[:12]}"
            password = hash_password(f"user{i}123")

            user = UserORM(
                user_id    = user_id,
                email      = f"user{i}@test.com",
                password   = password,
                name       = f"Test User {i}",
                role       = "user",
                picture    = None,
                balance    = random.uniform(500, 2000),
                tariffRate = 8.0,
                created_at = datetime.now(timezone.utc) - timedelta(days=random.randint(10, 30)),
            )
            db.add(user)
            test_users.append(user)
            print(f"User created: user{i}@test.com / user{i}123")

        db.commit()
        # Refresh so each user object has its DB-assigned id usable downstream
        for u in test_users:
            db.refresh(u)

        # ── Create energy readings for each user ───────────────────────────
        print("Creating energy readings...")
        for user in test_users:
            readings = []
            for day in range(30):
                for hour in range(0, 24, 2):  # Every 2 hours
                    timestamp = datetime.now(timezone.utc) - timedelta(days=day, hours=hour)
                    voltage = random.uniform(220, 240)
                    current = random.uniform(5, 25)
                    power   = voltage * current
                    energy  = random.uniform(0.5, 5.0)

                    readings.append(EnergyReadingORM(
                        readingId = f"read_{uuid.uuid4().hex[:12]}",
                        userId    = user.user_id,
                        voltage   = voltage,
                        current   = current,
                        power     = power,
                        energy    = energy,
                        timestamp = timestamp,
                    ))

            db.bulk_save_objects(readings)
            db.commit()
            print(f"Created {len(readings)} readings for {user.name}")

        # ── Create bills for each user ─────────────────────────────────────
        print("Creating bills...")
        for user in test_users:
            for month in range(3):  # Last 3 months
                bill_date       = datetime.now(timezone.utc) - timedelta(days=30 * month)
                units_consumed  = random.uniform(100, 300)
                amount          = units_consumed * user.tariffRate
                status          = "paid" if month > 0 else random.choice(["paid", "unpaid"])

                bill = BillORM(
                    billId      = f"bill_{uuid.uuid4().hex[:12]}",
                    userId      = user.user_id,
                    amount      = amount,
                    dueDate     = bill_date + timedelta(days=15),
                    status      = status,
                    generatedAt = bill_date,
                )

                if status == "paid":
                    bill.paidAt = bill_date + timedelta(days=random.randint(1, 10))

                db.add(bill)

        db.commit()
        print("Created bills for all users")

        # ── Create notifications for each user ─────────────────────────────
        print("Creating notifications...")
        notification_types = [
            ("payment", "Payment of ₹500.00 successful"),
            ("high_usage", "High power usage detected: 5500W"),
            ("bill_due", "Your bill is due in 3 days"),
            ("power_control", "Power status updated"),
        ]

        for user in test_users:
            for _ in range(5):
                notif_type, message = random.choice(notification_types)
                db.add(NotificationORM(
                    notifId   = f"notif_{uuid.uuid4().hex[:12]}",
                    userId    = user.user_id,
                    type      = notif_type,
                    message   = message,
                    isRead    = random.choice([True, False]),
                    createdAt = datetime.now(timezone.utc) - timedelta(days=random.randint(0, 7)),
                ))

        db.commit()

        print("Database seeded successfully!")
        print("\n" + "=" * 50)
        print("LOGIN CREDENTIALS:")
        print("=" * 50)
        print("Admin:")
        print("  Email: admin@smartenergy.com")
        print("  Password: admin123")
        print("\nTest Users:")
        for i in range(1, 6):
            print(f"  User {i}: user{i}@test.com / user{i}123")
        print("=" * 50)

    except Exception as e:
        db.rollback()
        print(f"Error while seeding database: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()