# ESP32 Device Onboarding & Appliance Detection System

## Overview
Complete system for ESP32 device registration, power spike detection, and appliance identification with real-time notifications.

## Architecture

```
ESP32 Device → IoT API → MongoDB → Background Worker → Push Notification
     │                      │              │
     │                      │              ▼
     └──────────────────────┴────> User Mobile App
                                  (Calibration Screen)
```

## Features to Implement

### 1. Device Registration
- User enters ESP32 Device ID
- Links device to user account
- Validates device connectivity

### 2. Power Spike Calibration
- App listens for power spikes from device
- User names the appliance when spike detected
- Saves wattage range to profile

### 3. Appliance Detection
- Background worker monitors live power
- Matches power to saved appliances
- Sends push notification when appliance detected

## Implementation Required

**Backend APIs:**
- POST /api/user/register-device
- POST /api/user/calibrate-appliance  
- GET /api/user/devices
- GET /api/user/appliances

**Frontend Screens:**
- Device Setup Screen
- Calibration Screen
- Appliances List Screen

**Real-time Components:**
- WebSocket or polling for live power data
- Background listener for spike detection
- Push notification system

Would you like me to implement this complete system now?
