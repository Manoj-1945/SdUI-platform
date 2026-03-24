#!/usr/bin/env python3
"""
Backend API Testing for Smart Energy Monitoring System
Tests all endpoints with the exact credentials from seed data
"""

import requests
import json
import sys
from datetime import datetime, timezone

# Backend URL from frontend .env
BASE_URL = "https://iot-meter-track.preview.emergentagent.com/api"

# Test credentials from seed data
USER_EMAIL = "user1@test.com"
USER_PASSWORD = "user1123"
ADMIN_EMAIL = "admin@smartenergy.com"
ADMIN_PASSWORD = "admin123"

class APITester:
    def __init__(self):
        self.user_token = None
        self.admin_token = None
        self.test_results = []
        self.user_id = None
        
    def log_result(self, test_name, success, details="", response_data=None):
        """Log test result"""
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}")
        if details:
            print(f"    {details}")
        if response_data and not success:
            print(f"    Response: {response_data}")
        print()
        
        self.test_results.append({
            "test": test_name,
            "success": success,
            "details": details,
            "response": response_data
        })
    
    def test_user_login(self):
        """Test user authentication"""
        print("🔐 Testing User Authentication...")
        
        try:
            response = requests.post(
                f"{BASE_URL}/auth/login",
                json={
                    "email": USER_EMAIL,
                    "password": USER_PASSWORD
                },
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if "session_token" in data and "user" in data:
                    self.user_token = data["session_token"]
                    self.user_id = data["user"]["user_id"]
                    self.log_result(
                        "User Login", 
                        True, 
                        f"Successfully logged in as {USER_EMAIL}, got session token"
                    )
                    return True
                else:
                    self.log_result(
                        "User Login", 
                        False, 
                        "Missing session_token or user in response",
                        data
                    )
            else:
                self.log_result(
                    "User Login", 
                    False, 
                    f"HTTP {response.status_code}",
                    response.text
                )
        except Exception as e:
            self.log_result("User Login", False, f"Exception: {str(e)}")
        
        return False
    
    def test_user_dashboard(self):
        """Test user dashboard endpoint"""
        print("📊 Testing User Dashboard...")
        
        if not self.user_token:
            self.log_result("User Dashboard", False, "No user token available")
            return False
        
        try:
            response = requests.get(
                f"{BASE_URL}/user/dashboard",
                headers={"Authorization": f"Bearer {self.user_token}"},
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                required_fields = ["user", "currentReading", "currentBill", "powerStatus", "balance"]
                
                missing_fields = [field for field in required_fields if field not in data]
                if not missing_fields:
                    self.log_result(
                        "User Dashboard", 
                        True, 
                        f"All required fields present: {required_fields}"
                    )
                    return True
                else:
                    self.log_result(
                        "User Dashboard", 
                        False, 
                        f"Missing fields: {missing_fields}",
                        data
                    )
            else:
                self.log_result(
                    "User Dashboard", 
                    False, 
                    f"HTTP {response.status_code}",
                    response.text
                )
        except Exception as e:
            self.log_result("User Dashboard", False, f"Exception: {str(e)}")
        
        return False
    
    def test_energy_history(self):
        """Test energy history endpoints"""
        print("⚡ Testing Energy History...")
        
        if not self.user_token:
            self.log_result("Energy History", False, "No user token available")
            return False
        
        periods = ["daily", "weekly"]
        all_success = True
        
        for period in periods:
            try:
                response = requests.get(
                    f"{BASE_URL}/user/energy-history?period={period}",
                    headers={"Authorization": f"Bearer {self.user_token}"},
                    timeout=10
                )
                
                if response.status_code == 200:
                    data = response.json()
                    if "period" in data and "readings" in data:
                        self.log_result(
                            f"Energy History ({period})", 
                            True, 
                            f"Got {len(data['readings'])} readings"
                        )
                    else:
                        self.log_result(
                            f"Energy History ({period})", 
                            False, 
                            "Missing period or readings in response",
                            data
                        )
                        all_success = False
                else:
                    self.log_result(
                        f"Energy History ({period})", 
                        False, 
                        f"HTTP {response.status_code}",
                        response.text
                    )
                    all_success = False
            except Exception as e:
                self.log_result(f"Energy History ({period})", False, f"Exception: {str(e)}")
                all_success = False
        
        return all_success
    
    def test_user_bills(self):
        """Test user bills endpoint"""
        print("💰 Testing User Bills...")
        
        if not self.user_token:
            self.log_result("User Bills", False, "No user token available")
            return False
        
        try:
            response = requests.get(
                f"{BASE_URL}/user/bills",
                headers={"Authorization": f"Bearer {self.user_token}"},
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if "bills" in data:
                    bills = data["bills"]
                    if bills and len(bills) > 0:
                        # Check if bills have required fields
                        first_bill = bills[0]
                        required_fields = ["billId", "amount", "status"]
                        missing_fields = [field for field in required_fields if field not in first_bill]
                        
                        if not missing_fields:
                            self.log_result(
                                "User Bills", 
                                True, 
                                f"Got {len(bills)} bills with required fields"
                            )
                            return True
                        else:
                            self.log_result(
                                "User Bills", 
                                False, 
                                f"Bills missing fields: {missing_fields}",
                                first_bill
                            )
                    else:
                        self.log_result(
                            "User Bills", 
                            True, 
                            "No bills found (empty array is valid)"
                        )
                        return True
                else:
                    self.log_result(
                        "User Bills", 
                        False, 
                        "Missing bills field in response",
                        data
                    )
            else:
                self.log_result(
                    "User Bills", 
                    False, 
                    f"HTTP {response.status_code}",
                    response.text
                )
        except Exception as e:
            self.log_result("User Bills", False, f"Exception: {str(e)}")
        
        return False
    
    def test_user_notifications(self):
        """Test user notifications endpoint"""
        print("🔔 Testing User Notifications...")
        
        if not self.user_token:
            self.log_result("User Notifications", False, "No user token available")
            return False
        
        try:
            response = requests.get(
                f"{BASE_URL}/user/notifications",
                headers={"Authorization": f"Bearer {self.user_token}"},
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if "notifications" in data:
                    self.log_result(
                        "User Notifications", 
                        True, 
                        f"Got {len(data['notifications'])} notifications"
                    )
                    return True
                else:
                    self.log_result(
                        "User Notifications", 
                        False, 
                        "Missing notifications field in response",
                        data
                    )
            else:
                self.log_result(
                    "User Notifications", 
                    False, 
                    f"HTTP {response.status_code}",
                    response.text
                )
        except Exception as e:
            self.log_result("User Notifications", False, f"Exception: {str(e)}")
        
        return False
    
    def test_predicted_bill(self):
        """Test predicted bill endpoint"""
        print("🔮 Testing Predicted Bill...")
        
        if not self.user_token:
            self.log_result("Predicted Bill", False, "No user token available")
            return False
        
        try:
            response = requests.get(
                f"{BASE_URL}/user/predicted-bill",
                headers={"Authorization": f"Bearer {self.user_token}"},
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if "predictedAmount" in data:
                    self.log_result(
                        "Predicted Bill", 
                        True, 
                        f"Predicted amount: ₹{data['predictedAmount']}"
                    )
                    return True
                else:
                    self.log_result(
                        "Predicted Bill", 
                        False, 
                        "Missing predictedAmount in response",
                        data
                    )
            else:
                self.log_result(
                    "Predicted Bill", 
                    False, 
                    f"HTTP {response.status_code}",
                    response.text
                )
        except Exception as e:
            self.log_result("Predicted Bill", False, f"Exception: {str(e)}")
        
        return False
    
    def test_admin_login(self):
        """Test admin authentication"""
        print("🔐 Testing Admin Authentication...")
        
        try:
            response = requests.post(
                f"{BASE_URL}/admin/login",
                json={
                    "email": ADMIN_EMAIL,
                    "password": ADMIN_PASSWORD
                },
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if "session_token" in data and "user" in data:
                    self.admin_token = data["session_token"]
                    if data["user"]["role"] == "admin":
                        self.log_result(
                            "Admin Login", 
                            True, 
                            f"Successfully logged in as admin {ADMIN_EMAIL}"
                        )
                        return True
                    else:
                        self.log_result(
                            "Admin Login", 
                            False, 
                            f"User role is {data['user']['role']}, expected 'admin'",
                            data
                        )
                else:
                    self.log_result(
                        "Admin Login", 
                        False, 
                        "Missing session_token or user in response",
                        data
                    )
            else:
                self.log_result(
                    "Admin Login", 
                    False, 
                    f"HTTP {response.status_code}",
                    response.text
                )
        except Exception as e:
            self.log_result("Admin Login", False, f"Exception: {str(e)}")
        
        return False
    
    def test_admin_get_users(self):
        """Test admin get all users endpoint"""
        print("👥 Testing Admin - Get All Users...")
        
        if not self.admin_token:
            self.log_result("Admin Get Users", False, "No admin token available")
            return False
        
        try:
            response = requests.get(
                f"{BASE_URL}/admin/users",
                headers={"Authorization": f"Bearer {self.admin_token}"},
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if "users" in data:
                    users = data["users"]
                    if users and len(users) > 0:
                        # Store a user ID for later tests
                        if not self.user_id and users:
                            self.user_id = users[0]["user_id"]
                        
                        self.log_result(
                            "Admin Get Users", 
                            True, 
                            f"Got {len(users)} users"
                        )
                        return True
                    else:
                        self.log_result(
                            "Admin Get Users", 
                            False, 
                            "No users found in response"
                        )
                else:
                    self.log_result(
                        "Admin Get Users", 
                        False, 
                        "Missing users field in response",
                        data
                    )
            else:
                self.log_result(
                    "Admin Get Users", 
                    False, 
                    f"HTTP {response.status_code}",
                    response.text
                )
        except Exception as e:
            self.log_result("Admin Get Users", False, f"Exception: {str(e)}")
        
        return False
    
    def test_admin_user_consumption(self):
        """Test admin get user consumption endpoint"""
        print("📈 Testing Admin - User Consumption...")
        
        if not self.admin_token:
            self.log_result("Admin User Consumption", False, "No admin token available")
            return False
        
        if not self.user_id:
            self.log_result("Admin User Consumption", False, "No user ID available")
            return False
        
        try:
            response = requests.get(
                f"{BASE_URL}/admin/user/{self.user_id}/consumption",
                headers={"Authorization": f"Bearer {self.admin_token}"},
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if "readings" in data:
                    self.log_result(
                        "Admin User Consumption", 
                        True, 
                        f"Got {len(data['readings'])} consumption readings for user {self.user_id}"
                    )
                    return True
                else:
                    self.log_result(
                        "Admin User Consumption", 
                        False, 
                        "Missing readings field in response",
                        data
                    )
            else:
                self.log_result(
                    "Admin User Consumption", 
                    False, 
                    f"HTTP {response.status_code}",
                    response.text
                )
        except Exception as e:
            self.log_result("Admin User Consumption", False, f"Exception: {str(e)}")
        
        return False
    
    def test_admin_power_control(self):
        """Test admin power control endpoint"""
        print("🔌 Testing Admin - Power Control...")
        
        if not self.admin_token:
            self.log_result("Admin Power Control", False, "No admin token available")
            return False
        
        if not self.user_id:
            self.log_result("Admin Power Control", False, "No user ID available")
            return False
        
        # Test turning power OFF then ON
        statuses = ["OFF", "ON"]
        all_success = True
        
        for status in statuses:
            try:
                response = requests.put(
                    f"{BASE_URL}/admin/user/{self.user_id}/power-control",
                    headers={"Authorization": f"Bearer {self.admin_token}"},
                    json={
                        "userId": self.user_id,
                        "status": status
                    },
                    timeout=10
                )
                
                if response.status_code == 200:
                    data = response.json()
                    if "message" in data:
                        self.log_result(
                            f"Admin Power Control ({status})", 
                            True, 
                            f"Successfully turned power {status}"
                        )
                    else:
                        self.log_result(
                            f"Admin Power Control ({status})", 
                            False, 
                            "Missing message in response",
                            data
                        )
                        all_success = False
                else:
                    self.log_result(
                        f"Admin Power Control ({status})", 
                        False, 
                        f"HTTP {response.status_code}",
                        response.text
                    )
                    all_success = False
            except Exception as e:
                self.log_result(f"Admin Power Control ({status})", False, f"Exception: {str(e)}")
                all_success = False
        
        return all_success
    
    def test_iot_data(self):
        """Test IoT data endpoint"""
        print("🌐 Testing IoT Data Endpoint...")
        
        if not self.user_id:
            self.log_result("IoT Data", False, "No user ID available")
            return False
        
        try:
            # Sample IoT sensor data
            iot_data = {
                "userId": self.user_id,
                "voltage": 230.5,
                "current": 15.2,
                "power": 3503.6,
                "energy": 2.5,
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
            
            response = requests.post(
                f"{BASE_URL}/iot/data",
                json=iot_data,
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if "message" in data:
                    self.log_result(
                        "IoT Data", 
                        True, 
                        "Successfully submitted IoT sensor data"
                    )
                    return True
                else:
                    self.log_result(
                        "IoT Data", 
                        False, 
                        "Missing message in response",
                        data
                    )
            else:
                self.log_result(
                    "IoT Data", 
                    False, 
                    f"HTTP {response.status_code}",
                    response.text
                )
        except Exception as e:
            self.log_result("IoT Data", False, f"Exception: {str(e)}")
        
        return False
    
    def run_all_tests(self):
        """Run all backend API tests"""
        print("🚀 Starting Smart Energy Monitoring System Backend API Tests")
        print("=" * 70)
        print(f"Backend URL: {BASE_URL}")
        print(f"User Credentials: {USER_EMAIL} / {USER_PASSWORD}")
        print(f"Admin Credentials: {ADMIN_EMAIL} / {ADMIN_PASSWORD}")
        print("=" * 70)
        print()
        
        # Test user authentication first
        user_login_success = self.test_user_login()
        
        # Test user endpoints
        if user_login_success:
            self.test_user_dashboard()
            self.test_energy_history()
            self.test_user_bills()
            self.test_user_notifications()
            self.test_predicted_bill()
        
        # Test admin authentication
        admin_login_success = self.test_admin_login()
        
        # Test admin endpoints
        if admin_login_success:
            self.test_admin_get_users()
            self.test_admin_user_consumption()
            self.test_admin_power_control()
        
        # Test IoT endpoint (doesn't require auth)
        self.test_iot_data()
        
        # Print summary
        print("=" * 70)
        print("📋 TEST SUMMARY")
        print("=" * 70)
        
        passed = sum(1 for result in self.test_results if result["success"])
        total = len(self.test_results)
        
        print(f"Total Tests: {total}")
        print(f"Passed: {passed}")
        print(f"Failed: {total - passed}")
        print(f"Success Rate: {(passed/total)*100:.1f}%")
        print()
        
        # List failed tests
        failed_tests = [result for result in self.test_results if not result["success"]]
        if failed_tests:
            print("❌ FAILED TESTS:")
            for test in failed_tests:
                print(f"  - {test['test']}: {test['details']}")
        else:
            print("🎉 ALL TESTS PASSED!")
        
        print("=" * 70)
        
        return passed == total

if __name__ == "__main__":
    tester = APITester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)