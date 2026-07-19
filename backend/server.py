from fastapi import FastAPI, HTTPException, Header, Response, Request, WebSocket, WebSocketDisconnect, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, Boolean, Text
from sqlalchemy.orm import declarative_base, sessionmaker
from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime, timezone, timedelta
from dotenv import load_dotenv
import json
import os
import uuid
import bcrypt
import razorpay
import requests
from fpdf import FPDF
from pywebpush import webpush, WebPushException
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ConnectionManager:
    """Tracks live WebSocket connections per user so new sensor readings
    can be pushed instantly instead of the frontend having to poll."""

    def __init__(self):
        self.active_connections: dict = {}

    async def connect(self, user_id: str, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.setdefault(user_id, []).append(websocket)

    def disconnect(self, user_id: str, websocket: WebSocket):
        conns = self.active_connections.get(user_id)
        if conns and websocket in conns:
            conns.remove(websocket)
        if conns is not None and not conns:
            self.active_connections.pop(user_id, None)

    async def send_to_user(self, user_id: str, message: dict):
        for ws in list(self.active_connections.get(user_id, [])):
            try:
                await ws.send_json(message)
            except Exception:
                self.disconnect(user_id, ws)


manager = ConnectionManager()

DATABASE_URL = "sqlite:///./smart_energy.db"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class DBUser(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password = Column(String, nullable=True)
    name = Column(String, nullable=True)
    role = Column(String, default="user")
    picture = Column(String, nullable=True)
    balance = Column(Float, default=1000.0)
    tariffRate = Column(Float, default=8.0)
    session_token = Column(String, nullable=True)
    session_expires_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class Bill(Base):
    __tablename__ = "bills"
    id = Column(Integer, primary_key=True)
    billId = Column(String, unique=True, index=True, nullable=False)
    userId = Column(String, nullable=False)
    amount = Column(Float, default=0.0)
    status = Column(String, default="unpaid")
    generatedAt = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    paidAt = Column(DateTime, nullable=True)
    dueDate = Column(DateTime, nullable=True)


class EnergyReading(Base):
    __tablename__ = "energy_readings"
    id = Column(Integer, primary_key=True)
    readingId = Column(String, unique=True, index=True, nullable=False)
    userId = Column(String, nullable=False)
    voltage = Column(Float, default=0.0)
    current = Column(Float, default=0.0)
    power = Column(Float, default=0.0)
    energy = Column(Float, default=0.0)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class Payment(Base):
    __tablename__ = "payments"
    id = Column(Integer, primary_key=True)
    paymentId = Column(String, unique=True, index=True, nullable=False)
    userId = Column(String, nullable=False)
    billId = Column(String, nullable=False)
    amount = Column(Float, default=0.0)
    paymentDate = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    method = Column(String, default="wallet")


class Notification(Base):
    __tablename__ = "notifications"
    id = Column(Integer, primary_key=True)
    notifId = Column(String, unique=True, index=True, nullable=False)
    userId = Column(String, nullable=False)
    type = Column(String, nullable=False)
    message = Column(String, nullable=False)
    data = Column(String, nullable=True)
    isRead = Column(Boolean, default=False)
    createdAt = Column(DateTime, default=lambda: datetime.now(timezone.utc))

class PushSubscription(Base):
    __tablename__ = "push_subscriptions"
    id = Column(Integer, primary_key=True)
    userId = Column(String, nullable=False, index=True)
    platform = Column(String, nullable=False)  # "web" or "native"
    token = Column(Text, nullable=False)
    createdAt = Column(DateTime, default=lambda: datetime.now(timezone.utc))

class PowerControl(Base):
    __tablename__ = "power_control"
    id = Column(Integer, primary_key=True)
    controlId = Column(String, unique=True, index=True, nullable=False)
    userId = Column(String, nullable=False)
    status = Column(String, nullable=False)
    controlledBy = Column(String, nullable=False)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class Device(Base):
    __tablename__ = "devices"
    id = Column(Integer, primary_key=True)
    deviceId = Column(String, unique=True, index=True, nullable=False)
    deviceName = Column(String, nullable=False)
    userId = Column(String, nullable=False)
    registeredAt = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    status = Column(String, default="active")
    lastSeen = Column(DateTime, nullable=True)


class Appliance(Base):
    __tablename__ = "appliances"
    id = Column(Integer, primary_key=True)
    applianceId = Column(String, unique=True, index=True, nullable=False)
    userId = Column(String, nullable=False)
    deviceId = Column(String, nullable=False)
    name = Column(String, nullable=False)
    minPower = Column(Float, default=0.0)
    maxPower = Column(Float, default=0.0)
    avgPower = Column(Float, default=0.0)
    calibratedAt = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    notificationsEnabled = Column(Boolean, default=True)


class PowerSpike(Base):
    __tablename__ = "power_spikes"
    id = Column(Integer, primary_key=True)
    spikeId = Column(String, unique=True, index=True, nullable=False)
    userId = Column(String, nullable=False)
    deviceId = Column(String, nullable=False)
    power = Column(Float, default=0.0)
    voltage = Column(Float, default=0.0)
    current = Column(Float, default=0.0)
    powerIncrease = Column(Float, default=0.0)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    calibrated = Column(Boolean, default=False)


Base.metadata.create_all(bind=engine)

RAZORPAY_KEY_ID = os.getenv("RAZORPAY_KEY_ID", "rzp_test_xxxxxxxxxx")
RAZORPAY_KEY_SECRET = os.getenv("RAZORPAY_KEY_SECRET", "xxxxxxxxxxxxxx")
razorpay_client = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))

VAPID_PUBLIC_KEY = os.getenv("VAPID_PUBLIC_KEY", "")
VAPID_PRIVATE_KEY = os.getenv("VAPID_PRIVATE_KEY", "")
VAPID_CLAIM_EMAIL = os.getenv("VAPID_CLAIM_EMAIL", "mailto:admin@example.com")


def send_push_to_user(db, user_id: str, title: str, body: str, data: dict = None):
    """Best-effort push notification to every device/browser this user has
    registered. Never raises - a failed push should never break the request
    that triggered it (e.g. a power spike being recorded)."""
    if not VAPID_PRIVATE_KEY:
        return  # push not configured yet, silently skip

    subs = db.query(PushSubscription).filter(PushSubscription.userId == user_id).all()
    for sub in subs:
        try:
            if sub.platform == "native":
                requests.post(
                    "https://exp.host/--/api/v2/push/send",
                    json={"to": sub.token, "sound": "default", "title": title, "body": body, "data": data or {}},
                    headers={"Content-Type": "application/json", "Accept": "application/json"},
                    timeout=5,
                )
            elif sub.platform == "web":
                subscription_info = json.loads(sub.token)
                webpush(
                    subscription_info=subscription_info,
                    data=json.dumps({"title": title, "body": body, "data": data or {}}),
                    vapid_private_key=VAPID_PRIVATE_KEY,
                    vapid_claims={"sub": VAPID_CLAIM_EMAIL},
                )
        except WebPushException as exc:
            print(f"[push] web push failed for user {user_id}: {exc}")
            status = exc.response.status_code if exc.response is not None else None
            if status in (404, 410):
                db.delete(sub)
                db.commit()
        except Exception as exc:
            print(f"[push] failed for user {user_id}: {exc}")

def generate_bill_for_user(db, user):
    """Sums a user's energy readings since their last bill (or account
    creation, if they've never had one) and creates a new Bill row.
    Returns the created Bill, or None if there was nothing to bill."""
    last_bill = (
        db.query(Bill)
        .filter(Bill.userId == user.user_id)
        .order_by(Bill.generatedAt.desc())
        .first()
    )
    period_start = last_bill.generatedAt if last_bill else user.created_at
    if period_start and period_start.tzinfo is None:
        period_start = period_start.replace(tzinfo=timezone.utc)

    readings = (
        db.query(EnergyReading)
        .filter(EnergyReading.userId == user.user_id, EnergyReading.timestamp >= period_start)
        .all()
    )
    total_energy = sum(r.energy for r in readings)
    if total_energy <= 0:
        return None

    amount = round(total_energy * user.tariffRate, 2)
    now = datetime.now(timezone.utc)
    bill = Bill(
        billId=f"bill_{uuid.uuid4().hex[:12]}",
        userId=user.user_id,
        amount=amount,
        status="unpaid",
        generatedAt=now,
        dueDate=now + timedelta(days=15),
    )
    db.add(bill)
    db.add(
        Notification(
            notifId=f"notif_{uuid.uuid4().hex[:12]}",
            userId=user.user_id,
            type="bill_generated",
            message=f"Your new bill of Rs.{amount} has been generated.",
            data=None,
        )
    )
    return bill


def generate_bills_for_all_users():
    """Runs monthly (see scheduler below): generates a bill for every
    regular user based on their energy usage since their last bill."""
    db = SessionLocal()
    try:
        users = db.query(DBUser).filter(DBUser.role == "user").all()
        generated = 0
        for user in users:
            if generate_bill_for_user(db, user):
                generated += 1
        db.commit()
        print(f"[billing] Monthly run complete: {generated} bill(s) generated")
    finally:
        db.close()


scheduler = AsyncIOScheduler()


@app.on_event("startup")
async def start_billing_scheduler():
    # Fires on the 1st of every month at 00:00 UTC. Render's free tier
    # sleeps when idle, so this won't fire reliably unless something
    # keeps the service awake (see /api/admin/generate-bills as a manual
    # fallback, or an external pinger/cron hitting the service beforehand).
    scheduler.add_job(
        generate_bills_for_all_users,
        CronTrigger(day=1, hour=0, minute=0),
        id="monthly_billing",
        replace_existing=True,
    )
    scheduler.start()
    
class UserSignup(BaseModel):
    email: EmailStr
    password: str
    name: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class User(BaseModel):
    user_id: str
    email: str
    name: str
    role: str
    picture: Optional[str] = None
    balance: float = 0.0
    tariffRate: float = 8.0
    created_at: datetime


class IoTData(BaseModel):
    userId: str
    voltage: float
    current: float
    power: float
    energy: float
    timestamp: Optional[datetime] = None


class PaymentRequest(BaseModel):
    billId: str
    amount: float


class CreatePaymentOrderRequest(BaseModel):
    billId: str


class VerifyPaymentRequest(BaseModel):
    billId: str
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str

class PowerControlRequest(BaseModel):
    userId: str
    status: str


class UpdatePaymentStatus(BaseModel):
    billId: str
    status: str


class DeviceRegistration(BaseModel):
    deviceId: str
    deviceName: Optional[str] = None


class ApplianceCalibration(BaseModel):
    deviceId: str
    applianceName: str
    minPower: float
    maxPower: float
    avgPower: float


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode("utf-8"), hashed.encode("utf-8"))

def compute_power_status(db, user_id: str) -> bool:
    """Returns True if power should show as ON for this user, based on
    their latest bill and the most recent admin power-control action."""
    latest_bill = db.query(Bill).filter(Bill.userId == user_id).order_by(Bill.generatedAt.desc()).first()
    power_status = db.query(PowerControl).filter(PowerControl.userId == user_id).order_by(PowerControl.timestamp.desc()).first()

    power_on = True
    if latest_bill and latest_bill.status == "unpaid":
        power_on = False
    if power_status:
        power_on = power_status.status == "ON"
    return power_on

LOW_BALANCE_THRESHOLD = 100.0


def check_low_balance(db, user):
    if user.balance >= LOW_BALANCE_THRESHOLD:
        return
    recent = db.query(Notification).filter(
        Notification.userId == user.user_id,
        Notification.type == "low_balance",
        Notification.createdAt >= datetime.now(timezone.utc) - timedelta(hours=24),
    ).first()
    if recent:
        return

    db.add(Notification(
        notifId=f"notif_{uuid.uuid4().hex[:12]}",
        userId=user.user_id,
        type="low_balance",
        message=f"Your balance is low (Rs.{user.balance:.2f}). Add funds to avoid disruption.",
        data=None,
        isRead=False,
        createdAt=datetime.now(timezone.utc),
    ))
    send_push_to_user(db, user.user_id, "Low balance warning", f"Your balance is Rs.{user.balance:.2f}. Add funds soon.")
    db.commit()

def user_to_schema(user: DBUser) -> dict:
    return {
        "user_id": user.user_id,
        "email": user.email,
        "name": user.name,
        "role": user.role,
        "picture": user.picture,
        "balance": user.balance,
        "tariffRate": user.tariffRate,
        "created_at": user.created_at or datetime.now(timezone.utc),
    }


def bill_to_dict(bill: Bill) -> dict:
    return {
        "billId": bill.billId,
        "userId": bill.userId,
        "amount": bill.amount,
        "status": bill.status,
        "generatedAt": bill.generatedAt,
        "paidAt": bill.paidAt,
        "dueDate": bill.dueDate,
    }


def reading_to_dict(reading: EnergyReading) -> dict:
    return {
        "readingId": reading.readingId,
        "userId": reading.userId,
        "voltage": reading.voltage,
        "current": reading.current,
        "power": reading.power,
        "energy": reading.energy,
        "timestamp": reading.timestamp,
    }


def notification_to_dict(notification: Notification) -> dict:
    return {
        "notifId": notification.notifId,
        "userId": notification.userId,
        "type": notification.type,
        "message": notification.message,
        "data": json.loads(notification.data) if notification.data else None,
        "isRead": notification.isRead,
        "createdAt": notification.createdAt,
    }


def appliance_to_dict(appliance: Appliance) -> dict:
    return {
        "applianceId": appliance.applianceId,
        "userId": appliance.userId,
        "deviceId": appliance.deviceId,
        "name": appliance.name,
        "minPower": appliance.minPower,
        "maxPower": appliance.maxPower,
        "avgPower": appliance.avgPower,
        "calibratedAt": appliance.calibratedAt,
        "notificationsEnabled": appliance.notificationsEnabled,
    }


def device_to_dict(device: Device) -> dict:
    return {
        "deviceId": device.deviceId,
        "deviceName": device.deviceName,
        "userId": device.userId,
        "registeredAt": device.registeredAt,
        "status": device.status,
        "lastSeen": device.lastSeen,
    }


def spike_to_dict(spike: PowerSpike) -> dict:
    return {
        "spikeId": spike.spikeId,
        "userId": spike.userId,
        "deviceId": spike.deviceId,
        "power": spike.power,
        "voltage": spike.voltage,
        "current": spike.current,
        "powerIncrease": spike.powerIncrease,
        "timestamp": spike.timestamp,
        "calibrated": spike.calibrated,
    }


async def get_current_user(authorization: Optional[str] = Header(None), request: Request = None):
    session_token = None
    if request and "session_token" in request.cookies:
        session_token = request.cookies.get("session_token")
    elif authorization:
        session_token = authorization.replace("Bearer ", "")

    if not session_token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    db = SessionLocal()
    try:
        user = db.query(DBUser).filter(DBUser.session_token == session_token).first()
        if not user:
            raise HTTPException(status_code=401, detail="Invalid session")
        expires_at = user.session_expires_at
        if expires_at is not None:
            if expires_at.tzinfo is None:
                expires_at = expires_at.replace(tzinfo=timezone.utc)
            if expires_at < datetime.now(timezone.utc):
                raise HTTPException(status_code=401, detail="Session expired")
        return User(**user_to_schema(user))
    finally:
        db.close()


@app.post("/api/auth/signup")
async def signup(user_data: UserSignup):
    db = SessionLocal()
    try:
        existing_user = db.query(DBUser).filter(DBUser.email == str(user_data.email)).first()
        if existing_user:
            raise HTTPException(status_code=400, detail="Email already registered")

        user_id = f"user_{uuid.uuid4().hex[:12]}"
        session_token = f"session_{uuid.uuid4().hex}"
        new_user = DBUser(
            user_id=user_id,
            email=str(user_data.email),
            password=hash_password(user_data.password),
            name=user_data.name,
            role="user",
            balance=1000.0,
            tariffRate=8.0,
            session_token=session_token,
            session_expires_at=datetime.now(timezone.utc) + timedelta(days=1),
        )
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        return {"user": user_to_schema(new_user), "session_token": session_token}
    except HTTPException:
        raise
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(exc))
    finally:
        db.close()


@app.post("/api/auth/login")
async def login(credentials: UserLogin):
    db = SessionLocal()
    try:
        user = db.query(DBUser).filter(DBUser.email == str(credentials.email)).first()
        if not user or not verify_password(credentials.password, user.password or ""):
            raise HTTPException(status_code=401, detail="Invalid credentials")

        session_token = f"session_{uuid.uuid4().hex}"
        user.session_token = session_token
        user.session_expires_at = datetime.now(timezone.utc) + timedelta(days=1)
        db.commit()
        return {"user": user_to_schema(user), "session_token": session_token}
    finally:
        db.close()


# Load Google Client ID(s) from environment variable(s)
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "418020125400-co486plk0k4qsdus35j78d09vbua049q.apps.googleusercontent.com")
GOOGLE_CLIENT_IDS = [
    client_id.strip()
    for client_id in os.getenv("GOOGLE_CLIENT_IDS", GOOGLE_CLIENT_ID).split(",")
    if client_id.strip()
]


@app.post("/api/auth/google")
async def google_auth(token_data: dict):
    db = SessionLocal()
    try:
        token = token_data.get("idToken")
        idinfo = id_token.verify_oauth2_token(token, google_requests.Request(), GOOGLE_CLIENT_IDS)
        email = idinfo["email"]
        name = idinfo.get("name", "User")

        user = db.query(DBUser).filter(DBUser.email == email).first()
        if not user:
            user_id = f"user_{uuid.uuid4().hex[:12]}"
            user = DBUser(user_id=user_id, email=email, name=name, role="user", balance=1000.0, picture=idinfo.get("picture"))
            db.add(user)

        session_token = f"session_{uuid.uuid4().hex}"
        user.session_token = session_token
        user.session_expires_at = datetime.now(timezone.utc) + timedelta(days=1)
        db.commit()
        db.refresh(user)
        return {"user": user_to_schema(user), "session_token": session_token}
    except ValueError as exc:
        raise HTTPException(status_code=401, detail="Invalid Google Token") from exc
    finally:
        db.close()


@app.post("/api/auth/logout")
async def logout(request: Request, response: Response, authorization: Optional[str] = Header(None)):
    db = SessionLocal()
    try:
        session_token = request.cookies.get("session_token")
        if not session_token and authorization:
            session_token = authorization.replace("Bearer ", "")
        if session_token:
            user = db.query(DBUser).filter(DBUser.session_token == session_token).first()
            if user:
                user.session_token = None
                user.session_expires_at = None
                db.commit()
    finally:
        db.close()

    response.delete_cookie("session_token")
    return {"message": "Logged out successfully"}

@app.get("/api/auth/me")
async def get_current_user_profile(request: Request, authorization: Optional[str] = Header(None)):
    user = await get_current_user(authorization, request)
    return user.dict()

class RegisterPushRequest(BaseModel):
    platform: str
    token: str


@app.get("/api/vapid-public-key")
async def get_vapid_public_key():
    return {"publicKey": VAPID_PUBLIC_KEY}


@app.post("/api/user/register-push-token")
async def register_push_token(req: RegisterPushRequest, request: Request, authorization: Optional[str] = Header(None)):
    user = await get_current_user(authorization, request)
    if req.platform not in ("web", "native"):
        raise HTTPException(status_code=400, detail="platform must be 'web' or 'native'")

    db = SessionLocal()
    try:
        existing = db.query(PushSubscription).filter(PushSubscription.token == req.token).first()
        if existing:
            existing.userId = user.user_id
            existing.platform = req.platform
        else:
            db.add(PushSubscription(userId=user.user_id, platform=req.platform, token=req.token))
        db.commit()
        return {"message": "Push subscription saved"}
    finally:
        db.close()
        
@app.websocket("/ws/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: str, token: str = Query(None)):
    db = SessionLocal()
    try:
        user = db.query(DBUser).filter(DBUser.session_token == token).first() if token else None
        if not user or user.user_id != user_id:
            await websocket.close(code=4001)
            return
    finally:
        db.close()

    await manager.connect(user_id, websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(user_id, websocket)

@app.post("/api/admin/login")
async def admin_login(credentials: UserLogin):
    db = SessionLocal()
    try:
        user = db.query(DBUser).filter(DBUser.email == str(credentials.email)).first()
        if not user or user.role != "admin" or not verify_password(credentials.password, user.password or ""):
            raise HTTPException(status_code=401, detail="Invalid admin credentials")

        session_token = f"session_{uuid.uuid4().hex}"
        user.session_token = session_token
        user.session_expires_at = datetime.now(timezone.utc) + timedelta(days=1)
        db.commit()
        return {"user": {"user_id": user.user_id, "email": user.email, "name": user.name, "role": user.role}, "session_token": session_token}
    finally:
        db.close()


@app.get("/api/user/dashboard")
async def get_user_dashboard(request: Request, authorization: Optional[str] = Header(None)):
    user = await get_current_user(authorization, request)
    db = SessionLocal()
    try:
        latest_reading = db.query(EnergyReading).filter(EnergyReading.userId == user.user_id).order_by(EnergyReading.timestamp.desc()).first()
        latest_bill = db.query(Bill).filter(Bill.userId == user.user_id).order_by(Bill.generatedAt.desc()).first()
        power_on = compute_power_status(db, user.user_id)
        check_low_balance(db, user)

        

        return {
            "user": user.dict(),
            "currentReading": reading_to_dict(latest_reading) if latest_reading else {"voltage": 0, "current": 0, "power": 0, "energy": 0},
            "currentBill": bill_to_dict(latest_bill) if latest_bill else {"amount": 0, "status": "paid", "dueDate": None},
            "powerStatus": "ON" if power_on else "OFF",
            "balance": user.balance,
        }
    finally:
        db.close()


@app.get("/api/user/energy-history")
async def get_energy_history(period: str, request: Request, authorization: Optional[str] = Header(None)):
    user = await get_current_user(authorization, request)
    db = SessionLocal()
    try:
        now = datetime.now(timezone.utc)
        if period == "daily":
            start_date = now - timedelta(days=1)
        elif period == "weekly":
            start_date = now - timedelta(days=7)
        elif period == "monthly":
            start_date = now - timedelta(days=30)
        else:
            start_date = now - timedelta(days=7)

        readings = db.query(EnergyReading).filter(EnergyReading.userId == user.user_id, EnergyReading.timestamp >= start_date).order_by(EnergyReading.timestamp.asc()).all()
        return {"period": period, "readings": [reading_to_dict(item) for item in readings]}
    finally:
        db.close()


@app.get("/api/user/bills")
async def get_user_bills(request: Request, authorization: Optional[str] = Header(None)):
    user = await get_current_user(authorization, request)
    db = SessionLocal()
    try:
        bills = db.query(Bill).filter(Bill.userId == user.user_id).order_by(Bill.generatedAt.desc()).all()
        return {"bills": [bill_to_dict(item) for item in bills]}
    finally:
        db.close()


@app.post("/api/user/pay-bill")
async def pay_bill(payment: PaymentRequest, request: Request, authorization: Optional[str] = Header(None)):
    user = await get_current_user(authorization, request)
    db = SessionLocal()
    try:
        bill = db.query(Bill).filter(Bill.billId == payment.billId, Bill.userId == user.user_id).first()
        if not bill:
            raise HTTPException(status_code=404, detail="Bill not found")
        if bill.status == "paid":
            raise HTTPException(status_code=400, detail="Bill already paid")
        if user.balance < payment.amount:
            raise HTTPException(status_code=400, detail="Insufficient balance")

        bill.status = "paid"
        bill.paidAt = datetime.now(timezone.utc)

        db_user = db.query(DBUser).filter(DBUser.user_id == user.user_id).first()
        if db_user:
            db_user.balance -= payment.amount

        payment_record = Payment(
            paymentId=f"pay_{uuid.uuid4().hex[:12]}",
            userId=user.user_id,
            billId=payment.billId,
            amount=payment.amount,
            paymentDate=datetime.now(timezone.utc),
            method="wallet",
        )
        db.add(payment_record)

        notification = Notification(
            notifId=f"notif_{uuid.uuid4().hex[:12]}",
            userId=user.user_id,
            type="payment",
            message=f"Payment of ₹{payment.amount} successful",
            data=None,
            isRead=False,
            createdAt=datetime.now(timezone.utc),
        )
        db.add(notification)
        send_push_to_user(db, iot_data.userId, "Power spike detected", f"+{power_increase:.0f}W. Tap to calibrate appliance.")
        db.commit()
        return {"message": "Payment successful", "newBalance": db_user.balance if db_user else user.balance}
    finally:
        db.close()
        
@app.post("/api/user/create-payment-order")
async def create_payment_order(order_req: CreatePaymentOrderRequest, request: Request, authorization: Optional[str] = Header(None)):
    user = await get_current_user(authorization, request)
    db = SessionLocal()
    try:
        bill = db.query(Bill).filter(Bill.billId == order_req.billId, Bill.userId == user.user_id).first()
        if not bill:
            raise HTTPException(status_code=404, detail="Bill not found")
        if bill.status == "paid":
            raise HTTPException(status_code=400, detail="Bill already paid")

        try:
            razorpay_order = razorpay_client.order.create({
                "amount": int(round(bill.amount * 100)),
                "currency": "INR",
                "receipt": bill.billId,
                "payment_capture": 1,
            })
        except Exception as exc:
            raise HTTPException(status_code=502, detail=f"Could not create payment order: {exc}")

        return {
            "orderId": razorpay_order["id"],
            "amount": razorpay_order["amount"],
            "currency": razorpay_order["currency"],
            "keyId": RAZORPAY_KEY_ID,
            "billId": bill.billId,
        }
    finally:
        db.close()


@app.post("/api/user/verify-payment")
async def verify_payment(verify_req: VerifyPaymentRequest, request: Request, authorization: Optional[str] = Header(None)):
    user = await get_current_user(authorization, request)
    db = SessionLocal()
    try:
        bill = db.query(Bill).filter(Bill.billId == verify_req.billId, Bill.userId == user.user_id).first()
        if not bill:
            raise HTTPException(status_code=404, detail="Bill not found")
        if bill.status == "paid":
            raise HTTPException(status_code=400, detail="Bill already paid")

        try:
            razorpay_client.utility.verify_payment_signature({
                "razorpay_order_id": verify_req.razorpay_order_id,
                "razorpay_payment_id": verify_req.razorpay_payment_id,
                "razorpay_signature": verify_req.razorpay_signature,
            })
        except razorpay.errors.SignatureVerificationError:
            raise HTTPException(status_code=400, detail="Payment verification failed")

        bill.status = "paid"
        bill.paidAt = datetime.now(timezone.utc)

        payment_record = Payment(
            paymentId=verify_req.razorpay_payment_id,
            userId=user.user_id,
            billId=verify_req.billId,
            amount=bill.amount,
            paymentDate=datetime.now(timezone.utc),
            method="razorpay",
        )
        db.add(payment_record)

        db.add(Notification(
            notifId=f"notif_{uuid.uuid4().hex[:12]}",
            userId=user.user_id,
            type="payment",
            message=f"Payment of Rs.{bill.amount} received via Razorpay",
            data=None,
            isRead=False,
            createdAt=datetime.now(timezone.utc),
        ))
        send_push_to_user(db, iot_data.userId, "Power spike detected", f"+{power_increase:.0f}W. Tap to calibrate appliance.")
        db.commit()
        return {"message": "Payment verified and bill marked as paid"}
    finally:
        db.close()       

@app.get("/api/user/notifications")
async def get_notifications(request: Request, authorization: Optional[str] = Header(None)):
    user = await get_current_user(authorization, request)
    db = SessionLocal()
    try:
        notifications = db.query(Notification).filter(Notification.userId == user.user_id).order_by(Notification.createdAt.desc()).all()
        return {"notifications": [notification_to_dict(item) for item in notifications]}
    finally:
        db.close()


@app.get("/api/user/predicted-bill")
async def get_predicted_bill(request: Request, authorization: Optional[str] = Header(None)):
    user = await get_current_user(authorization, request)
    db = SessionLocal()
    try:
        seven_days_ago = datetime.now(timezone.utc) - timedelta(days=7)
        readings = db.query(EnergyReading).filter(EnergyReading.userId == user.user_id, EnergyReading.timestamp >= seven_days_ago).all()
        if readings:
            avg_daily_energy = sum(item.energy for item in readings) / 7
            predicted_monthly = avg_daily_energy * 30 * user.tariffRate
        else:
            predicted_monthly = 0
        return {"predictedAmount": round(predicted_monthly, 2), "confidence": "medium", "basedOn": "7-day average"}
    finally:
        db.close()


@app.post("/api/iot/data")
async def receive_iot_data(iot_data: IoTData):
    db = SessionLocal()
    try:
        user = db.query(DBUser).filter(DBUser.user_id == iot_data.userId).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        last_reading = db.query(EnergyReading).filter(EnergyReading.userId == iot_data.userId).order_by(EnergyReading.timestamp.desc()).first()
        power_increase = iot_data.power - (last_reading.power if last_reading else 0)

        reading = EnergyReading(
            readingId=f"read_{uuid.uuid4().hex[:12]}",
            userId=iot_data.userId,
            voltage=iot_data.voltage,
            current=iot_data.current,
            power=iot_data.power,
            energy=iot_data.energy,
            timestamp=iot_data.timestamp or datetime.now(timezone.utc),
        )
        db.add(reading)
        db.commit()

        await manager.send_to_user(iot_data.userId, {
            "type": "reading",
            "voltage": reading.voltage,
            "current": reading.current,
            "power": reading.power,
            "energy": reading.energy,
            "timestamp": reading.timestamp.isoformat(),
        })


        if last_reading and power_increase > 100:
            device = db.query(Device).filter(Device.userId == iot_data.userId).first()
            if device:
                spike = PowerSpike(
                    spikeId=f"spike_{uuid.uuid4().hex[:12]}",
                    userId=iot_data.userId,
                    deviceId=device.deviceId,
                    power=iot_data.power,
                    voltage=iot_data.voltage,
                    current=iot_data.current,
                    powerIncrease=power_increase,
                    timestamp=datetime.now(timezone.utc),
                    calibrated=False,
                )
                db.add(spike)
                notification = Notification(
                    notifId=f"notif_{uuid.uuid4().hex[:12]}",
                    userId=iot_data.userId,
                    type="power_spike",
                    message=f"Power spike detected: +{power_increase:.0f}W. Tap to calibrate appliance.",
                    data=json.dumps({"spikeId": spike.spikeId, "power": iot_data.power}),
                    isRead=False,
                    createdAt=datetime.now(timezone.utc),
                )
                db.add(notification)
                send_push_to_user(db, iot_data.userId, "Power spike detected", f"+{power_increase:.0f}W. Tap to calibrate appliance.")

        appliances = db.query(Appliance).filter(Appliance.userId == iot_data.userId, Appliance.notificationsEnabled.is_(True)).all()
        for appliance in appliances:
            min_power = appliance.minPower * 0.9
            max_power = appliance.maxPower * 1.1
            if min_power <= iot_data.power <= max_power:
                recent_notif = db.query(Notification).filter(Notification.userId == iot_data.userId, Notification.type == "appliance_detected", Notification.createdAt >= datetime.now(timezone.utc) - timedelta(minutes=5)).first()
                if not recent_notif:
                    notif = Notification(
                        notifId=f"notif_{uuid.uuid4().hex[:12]}",
                        userId=iot_data.userId,
                        type="appliance_detected",
                        message=f"🔌 {appliance.name} turned ON ({iot_data.power:.0f}W)",
                        data=json.dumps({"applianceId": appliance.applianceId, "applianceName": appliance.name, "power": iot_data.power}),
                        isRead=False,
                        createdAt=datetime.now(timezone.utc),
                    )
                    db.add(notif)
                    send_push_to_user(db, iot_data.userId, f"{appliance.name} turned on", f"{iot_data.power:.0f}W")

        if iot_data.power > 5000:
            notification = Notification(
                notifId=f"notif_{uuid.uuid4().hex[:12]}",
                userId=iot_data.userId,
                type="high_usage",
                message=f"⚠️ High power usage detected: {iot_data.power}W",
                data=None,
                isRead=False,
                createdAt=datetime.now(timezone.utc),
            )
            db.add(notification)
            send_push_to_user(db, iot_data.userId, "High power usage", f"{iot_data.power}W detected - check your appliances.")

        db.commit()
        return {
            "message": "Data received successfully",
            "powerSpikeDetected": power_increase > 100 if last_reading else False,
            "appliancesDetected": len([a for a in appliances if a.minPower * 0.9 <= iot_data.power <= a.maxPower * 1.1]),
        }
    finally:
        db.close()


@app.get("/api/admin/users")
async def get_all_users(request: Request, authorization: Optional[str] = Header(None)):
    admin = await get_current_user(authorization, request)
    if admin.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    db = SessionLocal()
    try:
        users = db.query(DBUser).filter(DBUser.role == "user").all()
        return {"users": [user_to_schema(user) for user in users]}
    finally:
        db.close()


@app.get("/api/admin/user/{user_id}/consumption")
async def get_user_consumption(user_id: str, request: Request, authorization: Optional[str] = Header(None)):
    admin = await get_current_user(authorization, request)
    if admin.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    db = SessionLocal()
    try:
        thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)
        readings = db.query(EnergyReading).filter(EnergyReading.userId == user_id, EnergyReading.timestamp >= thirty_days_ago).order_by(EnergyReading.timestamp.desc()).all()
        return {"readings": [reading_to_dict(item) for item in readings]}
    finally:
        db.close()


@app.put("/api/admin/user/{user_id}/payment-status")
async def update_payment_status(user_id: str, update: UpdatePaymentStatus, request: Request, authorization: Optional[str] = Header(None)):
    admin = await get_current_user(authorization, request)
    if admin.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    db = SessionLocal()
    try:
        bill = db.query(Bill).filter(Bill.billId == update.billId, Bill.userId == user_id).first()
        if not bill:
            raise HTTPException(status_code=404, detail="Bill not found")
        bill.status = update.status
        db.commit()
        return {"message": "Payment status updated"}
    finally:
        db.close()


@app.put("/api/admin/user/{user_id}/power-control")
async def control_power(user_id: str, control: PowerControlRequest, request: Request, authorization: Optional[str] = Header(None)):
    admin = await get_current_user(authorization, request)
    if admin.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    db = SessionLocal()
    try:
        control_record = PowerControl(controlId=f"ctrl_{uuid.uuid4().hex[:12]}", userId=user_id, status=control.status, controlledBy=admin.user_id, timestamp=datetime.now(timezone.utc))
        db.add(control_record)
        notification = Notification(notifId=f"notif_{uuid.uuid4().hex[:12]}", userId=user_id, type="power_control", message=f"Power has been turned {control.status} by admin", data=None, isRead=False, createdAt=datetime.now(timezone.utc))
        db.add(notification)
        db.commit()
        return {"message": f"Power turned {control.status}"}
    finally:
        db.close()

@app.post("/api/admin/generate-bills")
async def admin_generate_bills(request: Request, authorization: Optional[str] = Header(None)):
    admin = await get_current_user(authorization, request)
    if admin.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    db = SessionLocal()
    try:
        users = db.query(DBUser).filter(DBUser.role == "user").all()
        generated = 0
        for user in users:
            if generate_bill_for_user(db, user):
                generated += 1
        db.commit()
    finally:
        db.close()

    return {"message": f"{generated} bill(s) generated"}

@app.get("/api/admin/stats")
async def get_admin_stats(request: Request, authorization: Optional[str] = Header(None)):
    admin = await get_current_user(authorization, request)
    if admin.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    db = SessionLocal()
    try:
        total_users = db.query(DBUser).filter(DBUser.role == "user").count()
        unpaid_bills = db.query(Bill).filter(Bill.status == "unpaid").count()
        total_revenue = sum(item.amount for item in db.query(Payment).all())
        return {"totalUsers": total_users, "unpaidBills": unpaid_bills, "totalRevenue": total_revenue}
    finally:
        db.close()


@app.put("/api/admin/update-tariff")
async def update_tariff_rate(user_id: str, new_rate: float, request: Request, authorization: Optional[str] = Header(None)):
    admin = await get_current_user(authorization, request)
    if admin.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    db = SessionLocal()
    try:
        user = db.query(DBUser).filter(DBUser.user_id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        user.tariffRate = new_rate
        notification = Notification(notifId=f"notif_{uuid.uuid4().hex[:12]}", userId=user_id, type="tariff_update", message=f"Your tariff rate has been updated to ₹{new_rate}/kWh", data=None, isRead=False, createdAt=datetime.now(timezone.utc))
        db.add(notification)
        db.commit()
        return {"message": "Tariff rate updated successfully", "newRate": new_rate}
    finally:
        db.close()


@app.put("/api/admin/update-global-tariff")
async def update_global_tariff(new_rate: float, request: Request, authorization: Optional[str] = Header(None)):
    admin = await get_current_user(authorization, request)
    if admin.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    db = SessionLocal()
    try:
        users = db.query(DBUser).filter(DBUser.role == "user").all()
        for user in users:
            user.tariffRate = new_rate
        db.commit()
        return {"message": "Global tariff rate updated successfully", "newRate": new_rate, "usersAffected": len(users)}
    finally:
        db.close()
        
@app.get("/api/admin/user/{user_id}/power-status")
async def get_user_power_status(user_id: str, request: Request, authorization: Optional[str] = Header(None)):
    admin = await get_current_user(authorization, request)
    if admin.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    db = SessionLocal()
    try:
        power_on = compute_power_status(db, user_id)
        return {"powerStatus": "ON" if power_on else "OFF"}
    finally:
        db.close()

@app.get("/api/admin/users/problematic")
async def get_problematic_users(request: Request, authorization: Optional[str] = Header(None)):
    admin = await get_current_user(authorization, request)
    if admin.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    db = SessionLocal()
    try:
        unpaid_bills = db.query(Bill).filter(Bill.status == "unpaid").all()
        user_ids_with_unpaid = {bill.userId for bill in unpaid_bills}
        low_balance_users = db.query(DBUser).filter(DBUser.role == "user", DBUser.balance < 100).all()
        users_with_unpaid = db.query(DBUser).filter(DBUser.role == "user", DBUser.user_id.in_(list(user_ids_with_unpaid))).all()
        return {"lowBalanceUsers": [user_to_schema(user) for user in low_balance_users], "unpaidBillUsers": [user_to_schema(user) for user in users_with_unpaid], "totalProblematicUsers": len(set([user.user_id for user in low_balance_users] + list(user_ids_with_unpaid)))}
    finally:
        db.close()


@app.get("/api/admin/users/high-consumption")
async def get_high_consumption_users(request: Request, authorization: Optional[str] = Header(None)):
    admin = await get_current_user(authorization, request)
    if admin.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    db = SessionLocal()
    try:
        seven_days_ago = datetime.now(timezone.utc) - timedelta(days=7)
        readings = db.query(EnergyReading).filter(EnergyReading.timestamp >= seven_days_ago).all()
        by_user = {}
        for reading in readings:
            entry = by_user.setdefault(reading.userId, {"totalEnergy": 0.0, "avgPower": 0.0, "count": 0})
            entry["totalEnergy"] += reading.energy
            entry["avgPower"] += reading.power
            entry["count"] += 1

        result = []
        for user_id, data in by_user.items():
            if data["totalEnergy"] > 100:
                user = db.query(DBUser).filter(DBUser.user_id == user_id).first()
                if user:
                    result.append({"user": user_to_schema(user), "totalEnergy": data["totalEnergy"], "avgPower": data["avgPower"] / data["count"], "estimatedCost": data["totalEnergy"] * user.tariffRate})

        result.sort(key=lambda item: item["totalEnergy"], reverse=True)
        return {"highConsumptionUsers": result[:100]}
    finally:
        db.close()


@app.post("/api/user/register-device")
async def register_device(device: DeviceRegistration, request: Request, authorization: Optional[str] = Header(None)):
    user = await get_current_user(authorization, request)
    db = SessionLocal()
    try:
        existing = db.query(Device).filter(Device.deviceId == device.deviceId).first()
        if existing:
            raise HTTPException(status_code=400, detail="Device already registered to another user")

        device_record = Device(deviceId=device.deviceId, deviceName=device.deviceName or device.deviceId, userId=user.user_id, registeredAt=datetime.now(timezone.utc), status="active", lastSeen=None)
        db.add(device_record)
        notification = Notification(notifId=f"notif_{uuid.uuid4().hex[:12]}", userId=user.user_id, type="device_registered", message=f"Device {device.deviceId} registered successfully", data=None, isRead=False, createdAt=datetime.now(timezone.utc))
        db.add(notification)
        db.commit()
        return {"message": "Device registered successfully", "device": device_to_dict(device_record)}
    finally:
        db.close()


@app.get("/api/user/devices")
async def get_user_devices(request: Request, authorization: Optional[str] = Header(None)):
    user = await get_current_user(authorization, request)
    db = SessionLocal()
    try:
        devices = db.query(Device).filter(Device.userId == user.user_id).all()
        return {"devices": [device_to_dict(item) for item in devices]}
    finally:
        db.close()


@app.post("/api/user/calibrate-appliance")
async def calibrate_appliance(appliance: ApplianceCalibration, request: Request, authorization: Optional[str] = Header(None)):
    user = await get_current_user(authorization, request)
    db = SessionLocal()
    try:
        device = db.query(Device).filter(Device.deviceId == appliance.deviceId, Device.userId == user.user_id).first()
        if not device:
            raise HTTPException(status_code=404, detail="Device not found or doesn't belong to you")

        appliance_record = Appliance(applianceId=f"app_{uuid.uuid4().hex[:12]}", userId=user.user_id, deviceId=appliance.deviceId, name=appliance.applianceName, minPower=appliance.minPower, maxPower=appliance.maxPower, avgPower=appliance.avgPower, calibratedAt=datetime.now(timezone.utc), notificationsEnabled=True)
        db.add(appliance_record)
        notification = Notification(notifId=f"notif_{uuid.uuid4().hex[:12]}", userId=user.user_id, type="appliance_calibrated", message=f"Appliance '{appliance.applianceName}' calibrated successfully", data=None, isRead=False, createdAt=datetime.now(timezone.utc))
        db.add(notification)
        send_push_to_user(db, iot_data.userId, "Power spike detected", f"+{power_increase:.0f}W. Tap to calibrate appliance.")
        db.commit()
        return {"message": "Appliance calibrated successfully", "appliance": appliance_to_dict(appliance_record)}
    finally:
        db.close()


@app.get("/api/user/appliances")
async def get_user_appliances(request: Request, authorization: Optional[str] = Header(None)):
    user = await get_current_user(authorization, request)
    db = SessionLocal()
    try:
        appliances = db.query(Appliance).filter(Appliance.userId == user.user_id).all()
        return {"appliances": [appliance_to_dict(item) for item in appliances]}
    finally:
        db.close()


@app.delete("/api/user/appliance/{appliance_id}")
async def delete_appliance(appliance_id: str, request: Request, authorization: Optional[str] = Header(None)):
    user = await get_current_user(authorization, request)
    db = SessionLocal()
    try:
        appliance = db.query(Appliance).filter(Appliance.applianceId == appliance_id, Appliance.userId == user.user_id).first()
        if not appliance:
            raise HTTPException(status_code=404, detail="Appliance not found")
        db.delete(appliance)
        db.commit()
        return {"message": "Appliance deleted successfully"}
    finally:
        db.close()


@app.get("/api/user/power-spikes")
async def get_power_spikes(request: Request, authorization: Optional[str] = Header(None), uncalibrated_only: bool = True):
    user = await get_current_user(authorization, request)
    db = SessionLocal()
    try:
        query = db.query(PowerSpike).filter(PowerSpike.userId == user.user_id)
        if uncalibrated_only:
            query = query.filter(PowerSpike.calibrated.is_(False))
        spikes = query.order_by(PowerSpike.timestamp.desc()).all()
        return {"spikes": [spike_to_dict(item) for item in spikes]}
    finally:
        db.close()


@app.put("/api/user/appliance/{appliance_id}/toggle-notifications")
async def toggle_appliance_notifications(appliance_id: str, request: Request, authorization: Optional[str] = Header(None)):
    user = await get_current_user(authorization, request)
    db = SessionLocal()
    try:
        appliance = db.query(Appliance).filter(Appliance.applianceId == appliance_id, Appliance.userId == user.user_id).first()
        if not appliance:
            raise HTTPException(status_code=404, detail="Appliance not found")
        appliance.notificationsEnabled = not appliance.notificationsEnabled
        db.commit()
        return {"message": f"Notifications {'enabled' if appliance.notificationsEnabled else 'disabled'}", "notificationsEnabled": appliance.notificationsEnabled}
    finally:
        db.close()


@app.get("/")
async def root():
    return {"message": "Smart Energy Monitoring API", "status": "running"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8001)
