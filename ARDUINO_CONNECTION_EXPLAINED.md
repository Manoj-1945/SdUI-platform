# 🔌 Arduino to App Connection - Complete Flow Explained

## Where is Arduino Connection in Your App?

### 🎯 Connection Point: IoT API Endpoint

**Location in Backend:** `/app/backend/server.py`
**Endpoint:** `POST /api/iot/data`
**Line Number:** ~470-520

```python
@app.post("/api/iot/data")
async def receive_iot_data(iot_data: IoTData):
    """Receive IoT sensor data from Arduino"""
    
    # 1. Validate user exists
    user = await users_collection.find_one({"user_id": iot_data.userId})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # 2. Store energy reading in database
    reading_doc = {
        "readingId": f"read_{uuid.uuid4().hex[:12]}",
        "userId": iot_data.userId,
        "voltage": iot_data.voltage,
        "current": iot_data.current,
        "power": iot_data.power,
        "energy": iot_data.energy,
        "timestamp": datetime.now(timezone.utc)
    }
    await energy_readings_collection.insert_one(reading_doc)
    
    # 3. Check for high usage → Create alert
    if iot_data.power > 5000:  # More than 5kW
        # Send notification to user
        ...
    
    return {"message": "Data received successfully"}
```

---

## 🔄 Complete Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                     YOUR HOME                                │
│                                                              │
│  ┌──────────────┐    WiFi     ┌─────────────────┐         │
│  │   Arduino    │─────────────>│   Home Router   │         │
│  │   Device     │              │   (Internet)    │         │
│  └──────────────┘              └─────────────────┘         │
│         │                              │                    │
│         │ Reads every 1 sec            │                    │
│         ▼                              │                    │
│  ┌──────────────┐                      │                    │
│  │   Sensors    │                      │                    │
│  │ - Voltage    │                      │                    │
│  │ - Current    │                      │                    │
│  └──────────────┘                      │                    │
└────────────────────────────────────────┼────────────────────┘
                                         │
                                         │ HTTPS POST
                                         │ Every 10 seconds
                                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    CLOUD SERVER                              │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  POST /api/iot/data                                  │  │
│  │  {                                                   │  │
│  │    "userId": "user_abc123",                         │  │
│  │    "voltage": 230.5,                                │  │
│  │    "current": 5.2,                                  │  │
│  │    "power": 1198.6,                                 │  │
│  │    "energy": 1.5                                    │  │
│  │  }                                                   │  │
│  └──────────────────────────────────────────────────────┘  │
│                          │                                   │
│                          ▼                                   │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         MongoDB Database                             │  │
│  │  - Stores in energy_readings collection             │  │
│  │  - Links to user via userId                         │  │
│  │  - Timestamps each reading                          │  │
│  └──────────────────────────────────────────────────────┘  │
│                          │                                   │
│                          ▼                                   │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         Automatic Processing                         │  │
│  │  1. Calculate daily energy usage                    │  │
│  │  2. Generate monthly bill                           │  │
│  │  3. Check payment status                            │  │
│  │  4. Control power ON/OFF                            │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────────────────────────┬────────────────────────────┘
                                 │
                                 │ Real-time Updates
                                 ▼
┌─────────────────────────────────────────────────────────────┐
│                   MOBILE APP                                 │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  User Dashboard Screen                               │  │
│  │  - Live voltage: 230V                               │  │
│  │  - Live current: 5.2A                               │  │
│  │  - Live power: 1,198W                               │  │
│  │  - Energy: 1.5 kWh                                  │  │
│  │  - Bill: ₹12.00                                     │  │
│  │  - Power Status: ON/OFF                             │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  Updates every 10 seconds automatically!                    │
└─────────────────────────────────────────────────────────────┘
```

---

## 📍 Where to Find in Your App

### 1. **Backend API Endpoint** (Receives Arduino Data)
**File:** `/app/backend/server.py`
**Line:** ~470
**Function:** `receive_iot_data()`

```python
@app.post("/api/iot/data")
async def receive_iot_data(iot_data: IoTData):
    """This is where Arduino sends data!"""
```

### 2. **Frontend Dashboard** (Shows Live Data)
**File:** `/app/frontend/app/user/dashboard.tsx`
**Component:** `UserDashboard`

```typescript
// Fetches dashboard data every 10 seconds
useEffect(() => {
    fetchDashboard();
    const interval = setInterval(fetchDashboard, 10000);
    return () => clearInterval(interval);
}, []);

// Shows live readings
<View style={styles.readingsGrid}>
  <View style={styles.readingCard}>
    <Text>{dashboardData?.currentReading.voltage}V</Text>
    <Text>Voltage</Text>
  </View>
  // ... current, power, energy
</View>
```

### 3. **Database Storage**
**Collection:** `energy_readings`
**Structure:**
```json
{
  "readingId": "read_abc123",
  "userId": "user_xyz789",
  "voltage": 230.5,
  "current": 5.2,
  "power": 1198.6,
  "energy": 1.5,
  "timestamp": "2024-01-15T10:30:00Z"
}
```

---

## 🔧 How to Test Arduino Connection

### Step 1: Test API Directly (Without Arduino)
```bash
# From your computer terminal:
curl -X POST https://iot-meter-track.preview.emergentagent.com/api/iot/data \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user_b3bf434efa30",
    "voltage": 230.5,
    "current": 5.2,
    "power": 1198.6,
    "energy": 1.5
  }'

# Expected Response:
{"message": "Data received successfully"}
```

### Step 2: Check Data in App
```
1. Login as user1 (user1@test.com / user1123)
2. Go to Dashboard
3. You should see the readings you just sent!
4. Voltage: 230.5V
5. Current: 5.2A
6. Power: 1,198W
```

### Step 3: With Real Arduino
```cpp
// In Arduino code:
const char* userId = "user_b3bf434efa30";  // ← Use real userId from app

void loop() {
  // Read sensors
  voltage = readVoltage();
  current = readCurrent();
  
  // Send to API every 10 seconds
  sendDataToCloud();
}
```

---

## 🎯 Key Points

### ✅ Arduino DOES Connect to App
- **How:** Via HTTPS POST request to `/api/iot/data`
- **When:** Every 10 seconds
- **What:** Voltage, current, power, energy readings
- **Where:** Backend receives → Database stores → App displays

### ✅ No App Pairing Needed
- Arduino sends data directly to cloud API
- Uses userId to identify which user's device
- No Bluetooth/manual pairing required
- Works from anywhere with internet

### ✅ User Sees Data Instantly
- Dashboard auto-refreshes every 10 seconds
- Shows latest reading from Arduino
- Updates graphs automatically
- Calculates bill in real-time

### ✅ Admin Can Monitor
- Admin sees all users' devices
- Can view any user's consumption
- Remote power control
- All from admin dashboard

---

## 🔍 How to Get Your userId

### Method 1: From App
```
1. Login to app as user
2. Your userId is shown in:
   - Profile screen (if you add it)
   - Or check backend logs after login
```

### Method 2: From Database
```bash
# Run this command:
mongosh --eval "db.users.find({email: 'user1@test.com'}, {user_id: 1})"

# Output:
{ "user_id": "user_b3bf434efa30" }
```

### Method 3: After Signup
```
When user signs up:
1. Backend generates userId
2. App should display it
3. User notes it down
4. Electrician enters it in Arduino
```

---

## 🎨 Visual Flow

```
┌─────────────┐
│   Arduino   │ Reads voltage/current every 1 second
│   Device    │
└──────┬──────┘
       │
       │ Every 10 seconds, sends data:
       │ POST /api/iot/data
       │ { userId, voltage, current, power, energy }
       │
       ▼
┌─────────────┐
│  Backend    │ 1. Validates userId exists
│    API      │ 2. Stores in database
└──────┬──────┘ 3. Checks for alerts
       │
       │ Stores in MongoDB
       ▼
┌─────────────┐
│  Database   │ energy_readings collection
│   MongoDB   │ Linked to user via userId
└──────┬──────┘
       │
       │ App fetches every 10 seconds
       ▼
┌─────────────┐
│  User App   │ Shows live data:
│  Dashboard  │ Voltage, Current, Power, Energy
└─────────────┘ Updates automatically!
```

---

## 🎓 For Your Demonstration

### Show This Flow:

**1. Arduino Side (2 mins)**
```
- Open Arduino Serial Monitor
- Show readings being printed
- Show "Data sent successfully" message
- Explain: "This data is going to cloud API"
```

**2. API Side (1 min)**
```
- Show backend logs
- Point to POST /api/iot/data endpoint
- Show: "Data received and stored"
```

**3. App Side (2 mins)**
```
- Open user dashboard
- Wait 10 seconds
- Data updates automatically
- Point to: "This came from Arduino!"
```

**4. Database Side (1 min)**
```
- Open MongoDB
- Show energy_readings collection
- Point to: Latest reading with timestamp
- Show: Links to user via userId
```

---

## ❓ Common Questions

**Q: Do I need to pair Arduino with phone?**
A: No! Arduino connects to cloud API directly via WiFi

**Q: Can Arduino work without internet?**
A: No, it needs internet to send data to cloud

**Q: What if WiFi disconnects?**
A: Arduino keeps reading, sends data when WiFi returns

**Q: Can multiple users have Arduino?**
A: Yes! Each Arduino has unique userId

**Q: Where is userId stored in Arduino?**
A: In the code: `const char* userId = "user_abc123";`

**Q: Can I change userId later?**
A: Yes, re-upload Arduino code with new userId

---

## 🚀 Next Steps

Now that you understand how Arduino connects, I'll add:
1. ✅ Razorpay payment gateway
2. ✅ Automatic power disconnection on unpaid bills
3. ✅ Power reconnection after payment
4. ✅ Monthly billing cycle

Let me implement these now!
