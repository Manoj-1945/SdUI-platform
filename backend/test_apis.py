"""
Backend API Testing for Smart Energy Monitoring System
"""
import requests
import json

BASE_URL = "https://iot-meter-track.preview.emergentagent.com/api"

# Test credentials
USER_EMAIL = "user1@test.com"
USER_PASSWORD = "user1123"
ADMIN_EMAIL = "admin@smartenergy.com"
ADMIN_PASSWORD = "admin123"

def test_user_login():
    """Test user login"""
    print("\n" + "="*50)
    print("TEST 1: User Login")
    print("="*50)
    
    try:
        response = requests.post(f"{BASE_URL}/auth/login", json={
            "email": USER_EMAIL,
            "password": USER_PASSWORD
        })
        
        if response.status_code == 200:
            data = response.json()
            print("✅ User login successful")
            print(f"   Session Token: {data['session_token'][:20]}...")
            return data['session_token']
        else:
            print(f"❌ User login failed: {response.status_code}")
            print(f"   Response: {response.text}")
            return None
    except Exception as e:
        print(f"❌ Error: {e}")
        return None

def test_user_dashboard(token):
    """Test user dashboard"""
    print("\n" + "="*50)
    print("TEST 2: User Dashboard")
    print("="*50)
    
    try:
        response = requests.get(
            f"{BASE_URL}/user/dashboard",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        if response.status_code == 200:
            data = response.json()
            print("✅ Dashboard data retrieved")
            print(f"   Balance: ₹{data['balance']:.2f}")
            print(f"   Power Status: {data['powerStatus']}")
            print(f"   Current Energy: {data['currentReading']['energy']:.2f} kWh")
            print(f"   Current Bill: ₹{data['currentBill']['amount']:.2f}")
            return True
        else:
            print(f"❌ Failed: {response.status_code}")
            print(f"   Response: {response.text}")
            return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def test_energy_history(token):
    """Test energy history"""
    print("\n" + "="*50)
    print("TEST 3: Energy History")
    print("="*50)
    
    for period in ['daily', 'weekly', 'monthly']:
        try:
            response = requests.get(
                f"{BASE_URL}/user/energy-history?period={period}",
                headers={"Authorization": f"Bearer {token}"}
            )
            
            if response.status_code == 200:
                data = response.json()
                print(f"✅ {period.capitalize()} history: {len(data['readings'])} readings")
            else:
                print(f"❌ {period.capitalize()} failed: {response.status_code}")
        except Exception as e:
            print(f"❌ {period.capitalize()} error: {e}")

def test_bills(token):
    """Test bills endpoint"""
    print("\n" + "="*50)
    print("TEST 4: Bills")
    print("="*50)
    
    try:
        response = requests.get(
            f"{BASE_URL}/user/bills",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Retrieved {len(data['bills'])} bills")
            if data['bills']:
                bill = data['bills'][0]
                print(f"   Latest: ₹{bill['amount']:.2f} ({bill['status']})")
            return True
        else:
            print(f"❌ Failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def test_notifications(token):
    """Test notifications endpoint"""
    print("\n" + "="*50)
    print("TEST 5: Notifications")
    print("="*50)
    
    try:
        response = requests.get(
            f"{BASE_URL}/user/notifications",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Retrieved {len(data['notifications'])} notifications")
            return True
        else:
            print(f"❌ Failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def test_predicted_bill(token):
    """Test predicted bill endpoint"""
    print("\n" + "="*50)
    print("TEST 6: AI Predicted Bill")
    print("="*50)
    
    try:
        response = requests.get(
            f"{BASE_URL}/user/predicted-bill",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Predicted bill: ₹{data['predictedAmount']:.2f}")
            print(f"   Confidence: {data['confidence']}")
            return True
        else:
            print(f"❌ Failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def test_admin_login():
    """Test admin login"""
    print("\n" + "="*50)
    print("TEST 7: Admin Login")
    print("="*50)
    
    try:
        response = requests.post(f"{BASE_URL}/admin/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        
        if response.status_code == 200:
            data = response.json()
            print("✅ Admin login successful")
            return data['session_token']
        else:
            print(f"❌ Admin login failed: {response.status_code}")
            return None
    except Exception as e:
        print(f"❌ Error: {e}")
        return None

def test_admin_users(token):
    """Test admin get all users"""
    print("\n" + "="*50)
    print("TEST 8: Admin - Get All Users")
    print("="*50)
    
    try:
        response = requests.get(
            f"{BASE_URL}/admin/users",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Retrieved {len(data['users'])} users")
            if data['users']:
                return data['users'][0]['user_id']
            return None
        else:
            print(f"❌ Failed: {response.status_code}")
            return None
    except Exception as e:
        print(f"❌ Error: {e}")
        return None

def test_admin_user_consumption(token, user_id):
    """Test admin get user consumption"""
    print("\n" + "="*50)
    print("TEST 9: Admin - User Consumption")
    print("="*50)
    
    try:
        response = requests.get(
            f"{BASE_URL}/admin/user/{user_id}/consumption",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Retrieved {len(data['readings'])} consumption readings")
            return True
        else:
            print(f"❌ Failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def test_admin_power_control(token, user_id):
    """Test admin power control"""
    print("\n" + "="*50)
    print("TEST 10: Admin - Power Control")
    print("="*50)
    
    try:
        # Turn OFF
        response = requests.put(
            f"{BASE_URL}/admin/user/{user_id}/power-control",
            headers={"Authorization": f"Bearer {token}"},
            json={"userId": user_id, "status": "OFF"}
        )
        
        if response.status_code == 200:
            print("✅ Power turned OFF successfully")
        else:
            print(f"❌ Power OFF failed: {response.status_code}")
        
        # Turn ON
        response = requests.put(
            f"{BASE_URL}/admin/user/{user_id}/power-control",
            headers={"Authorization": f"Bearer {token}"},
            json={"userId": user_id, "status": "ON"}
        )
        
        if response.status_code == 200:
            print("✅ Power turned ON successfully")
            return True
        else:
            print(f"❌ Power ON failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def test_iot_data(user_id):
    """Test IoT data endpoint"""
    print("\n" + "="*50)
    print("TEST 11: IoT Data Submission")
    print("="*50)
    
    try:
        response = requests.post(
            f"{BASE_URL}/iot/data",
            json={
                "userId": user_id,
                "voltage": 230.5,
                "current": 15.2,
                "power": 3503.6,
                "energy": 3.5
            }
        )
        
        if response.status_code == 200:
            print("✅ IoT data accepted successfully")
            return True
        else:
            print(f"❌ Failed: {response.status_code}")
            print(f"   Response: {response.text}")
            return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def main():
    """Run all tests"""
    print("\n" + "="*70)
    print("SMART ENERGY MONITORING SYSTEM - BACKEND API TESTS")
    print("="*70)
    
    # User flow tests
    user_token = test_user_login()
    if user_token:
        test_user_dashboard(user_token)
        test_energy_history(user_token)
        test_bills(user_token)
        test_notifications(user_token)
        test_predicted_bill(user_token)
    
    # Admin flow tests
    admin_token = test_admin_login()
    if admin_token:
        user_id = test_admin_users(admin_token)
        if user_id:
            test_admin_user_consumption(admin_token, user_id)
            test_admin_power_control(admin_token, user_id)
            test_iot_data(user_id)
    
    print("\n" + "="*70)
    print("TESTING COMPLETE")
    print("="*70 + "\n")

if __name__ == "__main__":
    main()
