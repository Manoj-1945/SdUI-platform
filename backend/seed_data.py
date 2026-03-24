"""
Seed test data for Smart Energy Monitoring System
"""
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone, timedelta
import asyncio
import bcrypt
import uuid
import random
import os
from dotenv import load_dotenv

load_dotenv()

MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")

async def seed_database():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client["smart_energy_db"]
    
    # Clear existing data
    print("Clearing existing data...")
    await db.users.delete_many({})
    await db.user_sessions.delete_many({})
    await db.energy_readings.delete_many({})
    await db.bills.delete_many({})
    await db.payments.delete_many({})
    await db.notifications.delete_many({})
    await db.power_control.delete_many({})
    
    # Create admin user
    print("Creating admin user...")
    admin_id = f"user_{uuid.uuid4().hex[:12]}"
    admin_password = bcrypt.hashpw("admin123".encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    await db.users.insert_one({
        "user_id": admin_id,
        "email": "admin@smartenergy.com",
        "password": admin_password,
        "name": "Admin User",
        "role": "admin",
        "picture": None,
        "balance": 0,
        "tariffRate": 8.0,
        "created_at": datetime.now(timezone.utc)
    })
    print(f"Admin created: admin@smartenergy.com / admin123")
    
    # Create test users
    print("Creating test users...")
    test_users = []
    for i in range(1, 6):
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        password = bcrypt.hashpw(f"user{i}123".encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        
        user = {
            "user_id": user_id,
            "email": f"user{i}@test.com",
            "password": password,
            "name": f"Test User {i}",
            "role": "user",
            "picture": None,
            "balance": random.uniform(500, 2000),
            "tariffRate": 8.0,
            "created_at": datetime.now(timezone.utc) - timedelta(days=random.randint(10, 30))
        }
        await db.users.insert_one(user)
        test_users.append(user)
        print(f"User created: user{i}@test.com / user{i}123")
    
    # Create energy readings for each user
    print("Creating energy readings...")
    for user in test_users:
        readings = []
        for day in range(30):
            for hour in range(0, 24, 2):  # Every 2 hours
                timestamp = datetime.now(timezone.utc) - timedelta(days=day, hours=hour)
                voltage = random.uniform(220, 240)
                current = random.uniform(5, 25)
                power = voltage * current
                energy = random.uniform(0.5, 5.0)
                
                reading = {
                    "readingId": f"read_{uuid.uuid4().hex[:12]}",
                    "userId": user["user_id"],
                    "voltage": voltage,
                    "current": current,
                    "power": power,
                    "energy": energy,
                    "timestamp": timestamp
                }
                readings.append(reading)
        
        await db.energy_readings.insert_many(readings)
        print(f"Created {len(readings)} readings for {user['name']}")
    
    # Create bills for each user
    print("Creating bills...")
    for user in test_users:
        for month in range(3):  # Last 3 months
            bill_date = datetime.now(timezone.utc) - timedelta(days=30 * month)
            units_consumed = random.uniform(100, 300)
            amount = units_consumed * user["tariffRate"]
            status = "paid" if month > 0 else random.choice(["paid", "unpaid"])
            
            bill = {
                "billId": f"bill_{uuid.uuid4().hex[:12]}",
                "userId": user["user_id"],
                "amount": amount,
                "unitsConsumed": units_consumed,
                "billMonth": bill_date.strftime("%B %Y"),
                "dueDate": bill_date + timedelta(days=15),
                "status": status,
                "generatedAt": bill_date
            }
            
            if status == "paid":
                bill["paidAt"] = bill_date + timedelta(days=random.randint(1, 10))
            
            await db.bills.insert_one(bill)
    
    print(f"Created bills for all users")
    
    # Create notifications for each user
    print("Creating notifications...")
    notification_types = [
        ("payment", "Payment of ₹500.00 successful"),
        ("high_usage", "High power usage detected: 5500W"),
        ("bill_due", "Your bill is due in 3 days"),
        ("power_control", "Power status updated")
    ]
    
    for user in test_users:
        for i in range(5):
            notif_type, message = random.choice(notification_types)
            notif = {
                "notifId": f"notif_{uuid.uuid4().hex[:12]}",
                "userId": user["user_id"],
                "type": notif_type,
                "message": message,
                "isRead": random.choice([True, False]),
                "createdAt": datetime.now(timezone.utc) - timedelta(days=random.randint(0, 7))
            }
            await db.notifications.insert_one(notif)
    
    print("Database seeded successfully!")
    print("\n" + "="*50)
    print("LOGIN CREDENTIALS:")
    print("="*50)
    print("Admin:")
    print("  Email: admin@smartenergy.com")
    print("  Password: admin123")
    print("\nTest Users:")
    for i in range(1, 6):
        print(f"  User {i}: user{i}@test.com / user{i}123")
    print("="*50)
    
    client.close()

if __name__ == "__main__":
    asyncio.run(seed_database())
