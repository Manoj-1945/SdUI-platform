from fastapi import FastAPI, HTTPException, Header, Response, Request
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime, timezone, timedelta
from dotenv import load_dotenv
import os
import uuid
import bcrypt
import requests
import razorpay

load_dotenv()

app = FastAPI()

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# MongoDB connection
MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")
client = AsyncIOMotorClient(MONGO_URL)
db = client["smart_energy_db"]

# Razorpay Client (Test Mode)
RAZORPAY_KEY_ID = os.getenv("RAZORPAY_KEY_ID", "rzp_test_xxxxxxxxxx")
RAZORPAY_KEY_SECRET = os.getenv("RAZORPAY_KEY_SECRET", "xxxxxxxxxxxxxx")
razorpay_client = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))

# Collections
users_collection = db["users"]
sessions_collection = db["user_sessions"]
energy_readings_collection = db["energy_readings"]
bills_collection = db["bills"]
payments_collection = db["payments"]
notifications_collection = db["notifications"]
power_control_collection = db["power_control"]

# Pydantic Models
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

class SessionData(BaseModel):
    session_id: str

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

class PowerControlRequest(BaseModel):
    userId: str
    status: str  # "ON" or "OFF"

class UpdatePaymentStatus(BaseModel):
    billId: str
    status: str  # "paid" or "unpaid"

# Helper functions
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

async def get_current_user(authorization: Optional[str] = Header(None), request: Request = None):
    """Get user from session token (cookie or Authorization header)"""
    session_token = None
    
    # Check cookie first
    if request and "session_token" in request.cookies:
        session_token = request.cookies.get("session_token")
    # Fallback to Authorization header
    elif authorization:
        session_token = authorization.replace("Bearer ", "")
    
    if not session_token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Find session
    session_doc = await sessions_collection.find_one(
        {"session_token": session_token},
        {"_id": 0}
    )
    
    if not session_doc:
        raise HTTPException(status_code=401, detail="Invalid session")
    
    # Check expiry
    expires_at = session_doc["expires_at"]
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Session expired")
    
    # Get user
    user_doc = await users_collection.find_one(
        {"user_id": session_doc["user_id"]},
        {"_id": 0}
    )
    
    if not user_doc:
        raise HTTPException(status_code=404, detail="User not found")
    
    return User(**user_doc)

# Authentication Endpoints
@app.post("/api/auth/signup")
async def signup(user_data: UserSignup):
    """Email/Password Signup"""
    # Check if user exists
    existing_user = await users_collection.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create user
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    hashed_pwd = hash_password(user_data.password)
    
    user_doc = {
        "user_id": user_id,
        "email": user_data.email,
        "password": hashed_pwd,
        "name": user_data.name,
        "role": "user",
        "picture": None,
        "balance": 1000.0,  # Initial balance
        "tariffRate": 8.0,  # ₹8 per kWh
        "created_at": datetime.now(timezone.utc)
    }
    
    await users_collection.insert_one(user_doc)
    
    # Create session
    session_token = f"session_{uuid.uuid4().hex}"
    session_doc = {
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": datetime.now(timezone.utc) + timedelta(days=7),
        "created_at": datetime.now(timezone.utc)
    }
    await sessions_collection.insert_one(session_doc)
    
    user_doc.pop("password")
    user_doc.pop("_id")
    
    return {
        "user": user_doc,
        "session_token": session_token
    }

@app.post("/api/auth/login")
async def login(credentials: UserLogin):
    """Email/Password Login"""
    user_doc = await users_collection.find_one({"email": credentials.email})
    
    if not user_doc or not verify_password(credentials.password, user_doc.get("password", "")):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Create session
    session_token = f"session_{uuid.uuid4().hex}"
    session_doc = {
        "user_id": user_doc["user_id"],
        "session_token": session_token,
        "expires_at": datetime.now(timezone.utc) + timedelta(days=7),
        "created_at": datetime.now(timezone.utc)
    }
    await sessions_collection.insert_one(session_doc)
    
    user_doc.pop("password", None)
    user_doc.pop("_id")
    
    return {
        "user": user_doc,
        "session_token": session_token
    }

@app.post("/api/auth/google")
async def google_auth(session_data: SessionData, response: Response):
    """Google OAuth Authentication via Emergent Auth"""
    try:
        # Exchange session_id for user data
        auth_response = requests.get(
            "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
            headers={"X-Session-ID": session_data.session_id},
            timeout=10
        )
        
        if auth_response.status_code != 200:
            raise HTTPException(status_code=401, detail="Invalid session_id")
        
        google_data = auth_response.json()
        
        # Check if user exists
        user_doc = await users_collection.find_one({"email": google_data["email"]})
        
        if user_doc:
            # Update user data
            await users_collection.update_one(
                {"email": google_data["email"]},
                {"$set": {
                    "name": google_data.get("name", user_doc["name"]),
                    "picture": google_data.get("picture", user_doc.get("picture"))
                }}
            )
            user_id = user_doc["user_id"]
        else:
            # Create new user
            user_id = f"user_{uuid.uuid4().hex[:12]}"
            user_doc = {
                "user_id": user_id,
                "email": google_data["email"],
                "name": google_data.get("name", "User"),
                "role": "user",
                "picture": google_data.get("picture"),
                "googleId": google_data.get("id"),
                "balance": 1000.0,
                "tariffRate": 8.0,
                "created_at": datetime.now(timezone.utc)
            }
            await users_collection.insert_one(user_doc)
        
        # Create session
        session_token = google_data.get("session_token", f"session_{uuid.uuid4().hex}")
        session_doc = {
            "user_id": user_id,
            "session_token": session_token,
            "expires_at": datetime.now(timezone.utc) + timedelta(days=7),
            "created_at": datetime.now(timezone.utc)
        }
        await sessions_collection.insert_one(session_doc)
        
        # Set cookie
        response.set_cookie(
            key="session_token",
            value=session_token,
            httponly=True,
            secure=True,
            samesite="none",
            path="/",
            max_age=7*24*60*60
        )
        
        # Get user without _id
        user_result = await users_collection.find_one({"user_id": user_id}, {"_id": 0, "password": 0})
        
        return {
            "user": user_result,
            "session_token": session_token
        }
    
    except requests.RequestException as e:
        raise HTTPException(status_code=500, detail=f"Auth service error: {str(e)}")

@app.get("/api/auth/me")
async def get_me(request: Request, authorization: Optional[str] = Header(None)):
    """Get current user"""
    user = await get_current_user(authorization, request)
    return user

@app.post("/api/auth/logout")
async def logout(request: Request, response: Response, authorization: Optional[str] = Header(None)):
    """Logout user"""
    session_token = None
    
    if "session_token" in request.cookies:
        session_token = request.cookies.get("session_token")
    elif authorization:
        session_token = authorization.replace("Bearer ", "")
    
    if session_token:
        await sessions_collection.delete_one({"session_token": session_token})
    
    response.delete_cookie("session_token", path="/")
    return {"message": "Logged out successfully"}

# Admin Authentication
@app.post("/api/admin/login")
async def admin_login(credentials: UserLogin):
    """Admin Login - separate from user login"""
    user_doc = await users_collection.find_one({"email": credentials.email, "role": "admin"})
    
    if not user_doc or not verify_password(credentials.password, user_doc.get("password", "")):
        raise HTTPException(status_code=401, detail="Invalid admin credentials")
    
    # Create session
    session_token = f"session_{uuid.uuid4().hex}"
    session_doc = {
        "user_id": user_doc["user_id"],
        "session_token": session_token,
        "expires_at": datetime.now(timezone.utc) + timedelta(days=7),
        "created_at": datetime.now(timezone.utc)
    }
    await sessions_collection.insert_one(session_doc)
    
    user_doc.pop("password", None)
    user_doc.pop("_id")
    
    return {
        "user": user_doc,
        "session_token": session_token
    }

# User Endpoints
@app.get("/api/user/dashboard")
async def get_user_dashboard(request: Request, authorization: Optional[str] = Header(None)):
    """Get user dashboard data"""
    user = await get_current_user(authorization, request)
    
    # Get latest energy reading
    latest_reading = await energy_readings_collection.find_one(
        {"userId": user.user_id},
        {"_id": 0},
        sort=[("timestamp", -1)]
    )
    
    # Get latest bill
    latest_bill = await bills_collection.find_one(
        {"userId": user.user_id},
        {"_id": 0},
        sort=[("generatedAt", -1)]
    )
    
    # Get power status
    power_status = await power_control_collection.find_one(
        {"userId": user.user_id},
        {"_id": 0},
        sort=[("timestamp", -1)]
    )
    
    # Check if power should be disconnected due to unpaid bill
    power_on = True
    if latest_bill and latest_bill.get("status") == "unpaid":
        power_on = False
    if power_status:
        power_on = power_status.get("status") == "ON"
    
    return {
        "user": user.dict(),
        "currentReading": latest_reading or {
            "voltage": 0,
            "current": 0,
            "power": 0,
            "energy": 0
        },
        "currentBill": latest_bill or {
            "amount": 0,
            "status": "paid",
            "dueDate": None
        },
        "powerStatus": "ON" if power_on else "OFF",
        "balance": user.balance
    }

@app.get("/api/user/energy-history")
async def get_energy_history(
    period: str,
    request: Request,
    authorization: Optional[str] = Header(None)
):
    """Get energy consumption history"""
    user = await get_current_user(authorization, request)
    
    # Calculate date range based on period
    now = datetime.now(timezone.utc)
    if period == "daily":
        start_date = now - timedelta(days=1)
    elif period == "weekly":
        start_date = now - timedelta(days=7)
    elif period == "monthly":
        start_date = now - timedelta(days=30)
    else:
        start_date = now - timedelta(days=7)
    
    # Get readings
    cursor = energy_readings_collection.find(
        {
            "userId": user.user_id,
            "timestamp": {"$gte": start_date}
        },
        {"_id": 0}
    ).sort("timestamp", 1)
    
    readings = await cursor.to_list(length=1000)
    
    return {
        "period": period,
        "readings": readings
    }

@app.get("/api/user/bills")
async def get_user_bills(request: Request, authorization: Optional[str] = Header(None)):
    """Get user bills"""
    user = await get_current_user(authorization, request)
    
    cursor = bills_collection.find(
        {"userId": user.user_id},
        {"_id": 0}
    ).sort("generatedAt", -1)
    
    bills = await cursor.to_list(length=100)
    
    return {"bills": bills}

@app.post("/api/user/pay-bill")
async def pay_bill(
    payment: PaymentRequest,
    request: Request,
    authorization: Optional[str] = Header(None)
):
    """Pay a bill (mock payment)"""
    user = await get_current_user(authorization, request)
    
    # Get bill
    bill = await bills_collection.find_one({"billId": payment.billId, "userId": user.user_id})
    
    if not bill:
        raise HTTPException(status_code=404, detail="Bill not found")
    
    if bill["status"] == "paid":
        raise HTTPException(status_code=400, detail="Bill already paid")
    
    # Check balance
    if user.balance < payment.amount:
        raise HTTPException(status_code=400, detail="Insufficient balance")
    
    # Update bill status
    await bills_collection.update_one(
        {"billId": payment.billId},
        {"$set": {"status": "paid", "paidAt": datetime.now(timezone.utc)}}
    )
    
    # Deduct balance
    new_balance = user.balance - payment.amount
    await users_collection.update_one(
        {"user_id": user.user_id},
        {"$set": {"balance": new_balance}}
    )
    
    # Record payment
    payment_doc = {
        "paymentId": f"pay_{uuid.uuid4().hex[:12]}",
        "userId": user.user_id,
        "billId": payment.billId,
        "amount": payment.amount,
        "paymentDate": datetime.now(timezone.utc),
        "method": "wallet"
    }
    await payments_collection.insert_one(payment_doc)
    
    # Create notification
    notif_doc = {
        "notifId": f"notif_{uuid.uuid4().hex[:12]}",
        "userId": user.user_id,
        "type": "payment",
        "message": f"Payment of ₹{payment.amount} successful",
        "isRead": False,
        "createdAt": datetime.now(timezone.utc)
    }
    await notifications_collection.insert_one(notif_doc)
    
    return {
        "message": "Payment successful",
        "newBalance": new_balance
    }

@app.get("/api/user/notifications")
async def get_notifications(request: Request, authorization: Optional[str] = Header(None)):
    """Get user notifications"""
    user = await get_current_user(authorization, request)
    
    cursor = notifications_collection.find(
        {"userId": user.user_id},
        {"_id": 0}
    ).sort("createdAt", -1)
    
    notifications = await cursor.to_list(length=100)
    
    return {"notifications": notifications}

@app.get("/api/user/predicted-bill")
async def get_predicted_bill(request: Request, authorization: Optional[str] = Header(None)):
    """Get AI-predicted monthly bill (placeholder)"""
    user = await get_current_user(authorization, request)
    
    # Simple prediction based on last 7 days average
    seven_days_ago = datetime.now(timezone.utc) - timedelta(days=7)
    cursor = energy_readings_collection.find(
        {
            "userId": user.user_id,
            "timestamp": {"$gte": seven_days_ago}
        }
    )
    
    readings = await cursor.to_list(length=1000)
    
    if readings:
        avg_daily_energy = sum(r.get("energy", 0) for r in readings) / 7
        predicted_monthly = avg_daily_energy * 30 * user.tariffRate
    else:
        predicted_monthly = 0
    
    return {
        "predictedAmount": round(predicted_monthly, 2),
        "confidence": "medium",
        "basedOn": "7-day average"
    }

# IoT Data Endpoint
@app.post("/api/iot/data")
async def receive_iot_data(iot_data: IoTData):
    """Receive IoT sensor data"""
    # Validate user exists
    user = await users_collection.find_one({"user_id": iot_data.userId})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Store reading
    reading_doc = {
        "readingId": f"read_{uuid.uuid4().hex[:12]}",
        "userId": iot_data.userId,
        "voltage": iot_data.voltage,
        "current": iot_data.current,
        "power": iot_data.power,
        "energy": iot_data.energy,
        "timestamp": iot_data.timestamp or datetime.now(timezone.utc)
    }
    await energy_readings_collection.insert_one(reading_doc)
    
    # Check for high usage and create alert
    if iot_data.power > 5000:  # More than 5kW
        notif_doc = {
            "notifId": f"notif_{uuid.uuid4().hex[:12]}",
            "userId": iot_data.userId,
            "type": "high_usage",
            "message": f"High power usage detected: {iot_data.power}W",
            "isRead": False,
            "createdAt": datetime.now(timezone.utc)
        }
        await notifications_collection.insert_one(notif_doc)
    
    return {"message": "Data received successfully"}

# Admin Endpoints
@app.get("/api/admin/users")
async def get_all_users(request: Request, authorization: Optional[str] = Header(None)):
    """Get all users (admin only)"""
    admin = await get_current_user(authorization, request)
    
    if admin.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    cursor = users_collection.find(
        {"role": "user"},
        {"_id": 0, "password": 0}
    )
    
    users = await cursor.to_list(length=1000)
    
    return {"users": users}

@app.get("/api/admin/user/{user_id}/consumption")
async def get_user_consumption(
    user_id: str,
    request: Request,
    authorization: Optional[str] = Header(None)
):
    """Get specific user's consumption (admin only)"""
    admin = await get_current_user(authorization, request)
    
    if admin.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Get last 30 days
    thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)
    cursor = energy_readings_collection.find(
        {
            "userId": user_id,
            "timestamp": {"$gte": thirty_days_ago}
        },
        {"_id": 0}
    ).sort("timestamp", -1)
    
    readings = await cursor.to_list(length=1000)
    
    return {"readings": readings}

@app.put("/api/admin/user/{user_id}/payment-status")
async def update_payment_status(
    user_id: str,
    update: UpdatePaymentStatus,
    request: Request,
    authorization: Optional[str] = Header(None)
):
    """Update payment status (admin only)"""
    admin = await get_current_user(authorization, request)
    
    if admin.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    result = await bills_collection.update_one(
        {"billId": update.billId, "userId": user_id},
        {"$set": {"status": update.status}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Bill not found")
    
    return {"message": "Payment status updated"}

@app.put("/api/admin/user/{user_id}/power-control")
async def control_power(
    user_id: str,
    control: PowerControlRequest,
    request: Request,
    authorization: Optional[str] = Header(None)
):
    """Control user's power (admin only)"""
    admin = await get_current_user(authorization, request)
    
    if admin.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Record power control action
    control_doc = {
        "controlId": f"ctrl_{uuid.uuid4().hex[:12]}",
        "userId": user_id,
        "status": control.status,
        "controlledBy": admin.user_id,
        "timestamp": datetime.now(timezone.utc)
    }
    await power_control_collection.insert_one(control_doc)
    
    # Create notification
    notif_doc = {
        "notifId": f"notif_{uuid.uuid4().hex[:12]}",
        "userId": user_id,
        "type": "power_control",
        "message": f"Power has been turned {control.status} by admin",
        "isRead": False,
        "createdAt": datetime.now(timezone.utc)
    }
    await notifications_collection.insert_one(notif_doc)
    
    return {"message": f"Power turned {control.status}"}

@app.get("/api/admin/stats")
async def get_admin_stats(request: Request, authorization: Optional[str] = Header(None)):
    """Get overall statistics (admin only)"""
    admin = await get_current_user(authorization, request)
    
    if admin.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    total_users = await users_collection.count_documents({"role": "user"})
    unpaid_bills = await bills_collection.count_documents({"status": "unpaid"})
    total_revenue = await payments_collection.aggregate([
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
    ]).to_list(length=1)
    
    revenue = total_revenue[0]["total"] if total_revenue else 0
    
    return {
        "totalUsers": total_users,
        "unpaidBills": unpaid_bills,
        "totalRevenue": revenue
    }

@app.put("/api/admin/update-tariff")
async def update_tariff_rate(
    user_id: str,
    new_rate: float,
    request: Request,
    authorization: Optional[str] = Header(None)
):
    """Update tariff rate for a specific user (admin only)"""
    admin = await get_current_user(authorization, request)
    
    if admin.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    result = await users_collection.update_one(
        {"user_id": user_id},
        {"$set": {"tariffRate": new_rate}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Create notification for user
    notif_doc = {
        "notifId": f"notif_{uuid.uuid4().hex[:12]}",
        "userId": user_id,
        "type": "tariff_update",
        "message": f"Your tariff rate has been updated to ₹{new_rate}/kWh",
        "isRead": False,
        "createdAt": datetime.now(timezone.utc)
    }
    await notifications_collection.insert_one(notif_doc)
    
    return {"message": "Tariff rate updated successfully", "newRate": new_rate}

@app.put("/api/admin/update-global-tariff")
async def update_global_tariff(
    new_rate: float,
    request: Request,
    authorization: Optional[str] = Header(None)
):
    """Update tariff rate for all users (admin only)"""
    admin = await get_current_user(authorization, request)
    
    if admin.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    result = await users_collection.update_many(
        {"role": "user"},
        {"$set": {"tariffRate": new_rate}}
    )
    
    return {
        "message": "Global tariff rate updated successfully",
        "newRate": new_rate,
        "usersAffected": result.modified_count
    }

@app.get("/api/admin/users/problematic")
async def get_problematic_users(
    request: Request,
    authorization: Optional[str] = Header(None)
):
    """Get users with unpaid bills or low balance (admin only)"""
    admin = await get_current_user(authorization, request)
    
    if admin.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Get users with unpaid bills
    unpaid_bills = await bills_collection.find(
        {"status": "unpaid"},
        {"_id": 0}
    ).to_list(length=1000)
    
    user_ids_with_unpaid = list(set([bill["userId"] for bill in unpaid_bills]))
    
    # Get users with low balance (less than 100)
    low_balance_users = await users_collection.find(
        {"role": "user", "balance": {"$lt": 100}},
        {"_id": 0, "password": 0}
    ).to_list(length=1000)
    
    # Get users with unpaid bills
    users_with_unpaid = await users_collection.find(
        {"role": "user", "user_id": {"$in": user_ids_with_unpaid}},
        {"_id": 0, "password": 0}
    ).to_list(length=1000)
    
    return {
        "lowBalanceUsers": low_balance_users,
        "unpaidBillUsers": users_with_unpaid,
        "totalProblematicUsers": len(set([u["user_id"] for u in low_balance_users] + user_ids_with_unpaid))
    }

@app.get("/api/admin/users/high-consumption")
async def get_high_consumption_users(
    request: Request,
    authorization: Optional[str] = Header(None)
):
    """Get users with high energy consumption (admin only)"""
    admin = await get_current_user(authorization, request)
    
    if admin.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Get last 7 days consumption
    seven_days_ago = datetime.now(timezone.utc) - timedelta(days=7)
    
    pipeline = [
        {
            "$match": {
                "timestamp": {"$gte": seven_days_ago}
            }
        },
        {
            "$group": {
                "_id": "$userId",
                "totalEnergy": {"$sum": "$energy"},
                "avgPower": {"$avg": "$power"}
            }
        },
        {
            "$match": {
                "totalEnergy": {"$gt": 100}  # More than 100 kWh in 7 days
            }
        },
        {
            "$sort": {"totalEnergy": -1}
        }
    ]
    
    high_consumption = await energy_readings_collection.aggregate(pipeline).to_list(length=100)
    
    # Get user details
    user_ids = [item["_id"] for item in high_consumption]
    users = await users_collection.find(
        {"user_id": {"$in": user_ids}},
        {"_id": 0, "password": 0}
    ).to_list(length=100)
    
    # Combine data
    result = []
    for consumption in high_consumption:
        user = next((u for u in users if u["user_id"] == consumption["_id"]), None)
        if user:
            result.append({
                "user": user,
                "totalEnergy": consumption["totalEnergy"],
                "avgPower": consumption["avgPower"],
                "estimatedCost": consumption["totalEnergy"] * user.get("tariffRate", 8.0)
            })
    
    return {"highConsumptionUsers": result}

@app.get("/")
async def root():
    return {"message": "Smart Energy Monitoring API", "status": "running"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
