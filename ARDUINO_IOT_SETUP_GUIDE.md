# Arduino IoT Setup Guide for Smart Energy Monitoring

## 📋 Overview
This guide explains how to connect Arduino IoT devices to your Smart Energy Monitoring app. Each user's home will have an Arduino device that measures electricity usage and sends data to the cloud.

---

## 🛠️ Hardware Requirements

### 1. **Arduino Board**
- Arduino UNO WiFi Rev2 (Recommended)
- OR Arduino MKR WiFi 1010
- OR ESP32 (Alternative, cheaper option)

### 2. **Sensors**
- **Voltage Sensor**: ZMPT101B AC Voltage Sensor Module (0-250V)
- **Current Sensor**: ACS712 Current Sensor Module (5A/20A/30A)
  - For home use: 20A or 30A version recommended
- **Power Supply**: 5V/2A adapter for Arduino

### 3. **Additional Components**
- Jumper wires
- Breadboard
- 10kΩ resistor (for sensor calibration)
- Enclosure box (for safety)

**Estimated Cost:** $25-40 USD per device

---

## 🔌 Hardware Connections

### Voltage Sensor (ZMPT101B) Connections:
```
ZMPT101B    →    Arduino
VCC         →    5V
GND         →    GND
OUT         →    A0 (Analog Pin)
```

### Current Sensor (ACS712) Connections:
```
ACS712      →    Arduino
VCC         →    5V
GND         →    GND
OUT         →    A1 (Analog Pin)
```

### Wiring Diagram:
```
[AC Main Line] → [Voltage Sensor] → [Arduino A0]
       ↓
  [Load/Appliances]
       ↓
[Current Sensor] → [Arduino A1]
       ↓
  [Neutral Line]
```

⚠️ **SAFETY WARNING**: 
- AC voltage is dangerous! Only qualified electricians should handle AC connections
- Always disconnect power before wiring
- Use proper insulation and enclosures
- Keep Arduino away from water and moisture

---

## 💻 Arduino Code

### Complete Arduino Sketch:

```cpp
/*
 * Smart Energy Monitoring - Arduino IoT Client
 * Sends voltage, current, power, and energy data to cloud API
 */

#include <WiFiNINA.h>  // For Arduino UNO WiFi Rev2 / MKR WiFi 1010
// #include <WiFi.h>   // Uncomment for ESP32

// WiFi Credentials (User-specific)
const char* ssid = "YOUR_WIFI_NAME";
const char* password = "YOUR_WIFI_PASSWORD";

// API Configuration
const char* serverUrl = "iot-meter-track.preview.emergentagent.com";
const char* userId = "USER_ID_FROM_APP";  // Get this from user registration
const int serverPort = 443;  // HTTPS

// Sensor Pins
const int VOLTAGE_PIN = A0;
const int CURRENT_PIN = A1;

// Calibration values (adjust based on your sensors)
const float VOLTAGE_CALIBRATION = 234.26;  // For 230V AC
const float CURRENT_CALIBRATION = 0.185;   // For ACS712-20A (0.185V/A)
const float VOLTAGE_OFFSET = 2.5;          // ADC midpoint

// Variables
float voltage = 0.0;
float current = 0.0;
float power = 0.0;
float energy = 0.0;
unsigned long lastSendTime = 0;
const unsigned long SEND_INTERVAL = 10000;  // Send every 10 seconds

WiFiSSLClient client;

void setup() {
  Serial.begin(9600);
  while (!Serial) { ; }
  
  Serial.println("Smart Energy Monitor Starting...");
  
  // Connect to WiFi
  connectToWiFi();
  
  Serial.println("System Ready!");
}

void loop() {
  // Read sensors
  voltage = readVoltage();
  current = readCurrent();
  power = voltage * current;
  
  // Calculate energy (kWh)
  // Energy = Power * Time / 3600000 (ms to hours)
  unsigned long currentTime = millis();
  float timeDiff = (currentTime - lastSendTime) / 3600000.0;
  energy += (power * timeDiff) / 1000.0;  // Convert W to kW
  
  // Display on Serial Monitor
  Serial.println("=== Energy Reading ===");
  Serial.print("Voltage: "); Serial.print(voltage); Serial.println(" V");
  Serial.print("Current: "); Serial.print(current); Serial.println(" A");
  Serial.print("Power: "); Serial.print(power); Serial.println(" W");
  Serial.print("Energy: "); Serial.print(energy); Serial.println(" kWh");
  Serial.println("====================");
  
  // Send data to cloud every 10 seconds
  if (currentTime - lastSendTime >= SEND_INTERVAL) {
    sendDataToCloud();
    lastSendTime = currentTime;
  }
  
  delay(1000);  // Read sensors every second
}

void connectToWiFi() {
  Serial.print("Connecting to WiFi: ");
  Serial.println(ssid);
  
  while (WiFi.begin(ssid, password) != WL_CONNECTED) {
    delay(5000);
    Serial.print(".");
  }
  
  Serial.println("\nWiFi Connected!");
  Serial.print("IP Address: ");
  Serial.println(WiFi.localIP());
}

float readVoltage() {
  int sensorValue = analogRead(VOLTAGE_PIN);
  float voltage = (sensorValue / 1024.0) * 5.0;  // Convert to voltage
  voltage = (voltage - VOLTAGE_OFFSET) * VOLTAGE_CALIBRATION;
  return abs(voltage);
}

float readCurrent() {
  int sensorValue = analogRead(CURRENT_PIN);
  float voltage = (sensorValue / 1024.0) * 5.0;
  float current = (voltage - VOLTAGE_OFFSET) / CURRENT_CALIBRATION;
  return abs(current);
}

void sendDataToCloud() {
  Serial.println("Sending data to cloud...");
  
  if (client.connect(serverUrl, serverPort)) {
    Serial.println("Connected to server");
    
    // Prepare JSON payload
    String jsonData = "{";
    jsonData += "\"userId\":\"" + String(userId) + "\",";
    jsonData += "\"voltage\":" + String(voltage, 2) + ",";
    jsonData += "\"current\":" + String(current, 2) + ",";
    jsonData += "\"power\":" + String(power, 2) + ",";
    jsonData += "\"energy\":" + String(energy, 4);
    jsonData += "}";
    
    // Send HTTP POST request
    client.println("POST /api/iot/data HTTP/1.1");
    client.println("Host: " + String(serverUrl));
    client.println("Content-Type: application/json");
    client.print("Content-Length: ");
    client.println(jsonData.length());
    client.println("Connection: close");
    client.println();
    client.println(jsonData);
    
    // Wait for response
    delay(500);
    
    // Read response
    while (client.available()) {
      String line = client.readStringUntil('\n');
      Serial.println(line);
    }
    
    client.stop();
    Serial.println("Data sent successfully!");
    
  } else {
    Serial.println("Connection failed!");
  }
}

// Reset energy counter (call when bill is paid)
void resetEnergy() {
  energy = 0.0;
  Serial.println("Energy counter reset");
}
```

---

## 📱 User Setup Process

### Step 1: User Registration in App
1. User signs up in the mobile app
2. App generates unique `userId` (e.g., `user_abc123xyz`)
3. User receives their `userId` via email or in-app

### Step 2: Arduino Configuration
1. Electrician installs Arduino device with sensors
2. Update Arduino code with:
   ```cpp
   const char* ssid = "UserHomeWiFi";
   const char* password = "WiFiPassword123";
   const char* userId = "user_abc123xyz";  // From app
   ```
3. Upload code to Arduino
4. Device auto-connects and starts sending data

### Step 3: Verification in App
1. User logs into app
2. Navigate to Dashboard
3. Within 10 seconds, live readings appear
4. Energy consumption updates every 10 seconds

---

## 🔧 Sensor Calibration

### Voltage Sensor Calibration:
```cpp
// Measure actual AC voltage with multimeter
// Adjust VOLTAGE_CALIBRATION until Arduino reading matches
float actualVoltage = 230.0;  // Measured with multimeter
float arduinoReading = 220.5;  // Current Arduino reading
float newCalibration = VOLTAGE_CALIBRATION * (actualVoltage / arduinoReading);
```

### Current Sensor Calibration:
```cpp
// Turn ON a known load (e.g., 100W bulb)
// Current = Power / Voltage = 100W / 230V = 0.43A
// Adjust CURRENT_CALIBRATION until reading matches
```

---

## 🌐 Network Requirements

### For Arduino Device:
- **WiFi**: 2.4GHz network (most Arduino WiFi modules don't support 5GHz)
- **Internet**: Minimum 512 Kbps upload speed
- **Firewall**: Allow outbound HTTPS (port 443)
- **Router**: Must support DHCP

### Data Usage:
- Each data point: ~200 bytes
- Sending every 10 seconds: ~1.7 MB/day
- Monthly data usage: ~50 MB/month (very low!)

---

## 🔐 Security Features

1. **HTTPS Communication**: All data encrypted in transit
2. **User-Specific ID**: Each device linked to one user account
3. **API Authentication**: Backend validates user existence
4. **No Passwords in Device**: Only user ID stored, not sensitive data

---

## 🐛 Troubleshooting

### Device Not Connecting to WiFi:
```
Problem: WiFi connection fails
Solution:
1. Check WiFi credentials (case-sensitive)
2. Ensure 2.4GHz network (not 5GHz)
3. Move Arduino closer to router
4. Restart router and Arduino
```

### Data Not Appearing in App:
```
Problem: App shows zero readings
Solution:
1. Verify userId matches app registration
2. Check Serial Monitor for "Data sent successfully"
3. Test API endpoint manually (see below)
4. Ensure Arduino has internet access
```

### Inaccurate Readings:
```
Problem: Voltage/current readings incorrect
Solution:
1. Calibrate sensors with multimeter
2. Check sensor connections
3. Adjust calibration constants
4. Ensure sensors are not damaged
```

---

## 🧪 Testing API Manually

### Test if Arduino can reach server:
```bash
# From computer on same network
curl -X POST https://iot-meter-track.preview.emergentagent.com/api/iot/data \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user_abc123xyz",
    "voltage": 230.5,
    "current": 5.2,
    "power": 1198.6,
    "energy": 1.5
  }'
```

Expected Response:
```json
{"message": "Data received successfully"}
```

---

## 📊 What Data Gets Sent?

Every 10 seconds, Arduino sends:
```json
{
  "userId": "user_abc123xyz",
  "voltage": 230.5,      // Volts (V)
  "current": 5.2,        // Amperes (A)
  "power": 1198.6,       // Watts (W)
  "energy": 1.5          // Kilowatt-hours (kWh)
}
```

This data is:
- Stored in MongoDB
- Displayed on user dashboard
- Used for billing calculations
- Analyzed for AI predictions
- Monitored by admin for anomalies

---

## 💰 Deployment at Scale

### For Multiple Users:

1. **Bulk Device Setup**:
   - Pre-program devices with app server URL
   - Leave `userId` blank
   - Provide QR code for easy configuration

2. **User Activation Process**:
   - User scans QR on device
   - App sends userId to device via Bluetooth/WiFi
   - Device auto-configures and starts

3. **Remote Management**:
   - Admin can see device status
   - Reset energy counter remotely
   - Update firmware OTA (Over-The-Air)

---

## 🎯 Next Steps

1. ✅ Purchase Arduino and sensors
2. ✅ Test on breadboard with LED loads
3. ✅ Calibrate sensors
4. ✅ Install in electrical panel (by electrician)
5. ✅ Configure WiFi and userId
6. ✅ Verify data in mobile app
7. ✅ Monitor for 24 hours
8. ✅ Deploy to multiple homes

---

## 📞 Support

For Arduino setup issues:
- Check Serial Monitor output
- Verify sensor connections
- Test with known loads
- Contact technical support with device logs

**Your IoT device is now connected to the cloud!** ⚡📱
