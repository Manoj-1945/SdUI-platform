# Smart Energy Monitoring & Automatic Billing System

A modern mobile application for IoT-based Smart Energy Monitoring and Automatic Billing System for conventional electricity meters, built with Expo (React Native), FastAPI, and MongoDB.

## 🚀 Features

### User Features
- **Dual Authentication**: Email/Password + Google Social Login (Emergent Auth)
- **Real-time Dashboard**: Live energy consumption monitoring (voltage, current, power, energy)
- **Energy History**: View consumption with daily, weekly, and monthly graphs
- **Automatic Billing**: System calculates bills based on tariff rates
- **Payment System**: Mock payment system with wallet balance
- **Power Status**: Real-time power supply status (ON/OFF)
- **Notifications**: Alerts for low balance, high usage, and bill reminders
- **AI Prediction**: AI-based monthly bill prediction

### Admin Features
- **Separate Admin Panel**: Dedicated admin authentication
- **User Management**: View all users and their details
- **Consumption Monitoring**: Track individual user energy consumption
- **Remote Power Control**: Turn power ON/OFF for any user
- **Payment Management**: View and update payment statuses
- **System Statistics**: Total users, unpaid bills, and revenue tracking

### Technical Features
- **Dark Theme UI**: Modern, futuristic dark theme design
- **Real-time Updates**: Dashboard auto-refreshes every 10 seconds
- **Responsive Charts**: Interactive energy consumption graphs
- **IoT Integration**: Standard endpoint for IoT hardware data submission
- **Role-Based Access**: Separate user and admin roles
- **Secure Authentication**: JWT-based session management

## 🔑 Login Credentials

### Admin Account
```
Email: admin@smartenergy.com
Password: admin123
```

### Test User Accounts
```
User 1: user1@test.com / user1123
User 2: user2@test.com / user2123
User 3: user3@test.com / user3123
User 4: user4@test.com / user4123
User 5: user5@test.com / user5123
```

## 📱 App Structure

### User Screens
- **Landing Page** (`/`) - Choose User or Admin login
- **Login** (`/auth/login`) - User login with Google or Email/Password
- **Signup** (`/auth/signup`) - New user registration
- **Dashboard** (`/user/dashboard`) - Main user dashboard
- **Energy History** (`/user/energy-history`) - Consumption graphs
- **Billing** (`/user/billing`) - Bills and payment
- **Notifications** (`/user/notifications`) - System alerts
- **AI Prediction** (`/user/predicted-bill`) - Bill forecast

### Admin Screens
- **Admin Login** (`/auth/admin-login`) - Admin authentication
- **Admin Dashboard** (`/admin/dashboard`) - System overview
- **User Detail** (`/admin/user-detail`) - Individual user management

## 🛠️ Technology Stack

### Frontend
- **Framework**: Expo (React Native)
- **Routing**: Expo Router (file-based routing)
- **State Management**: Zustand
- **Charts**: react-native-chart-kit
- **HTTP Client**: Axios
- **Storage**: AsyncStorage
- **UI Components**: React Native core components + Expo Vector Icons

### Backend
- **Framework**: FastAPI
- **Database**: MongoDB (Motor async driver)
- **Authentication**: JWT + bcrypt + Google OAuth (Emergent Auth)
- **Validation**: Pydantic
- **Real-time**: Support for WebSocket/polling

## 📊 Database Schema

### Collections
1. **users** - User accounts with role, balance, tariff
2. **user_sessions** - Active sessions with tokens
3. **energy_readings** - IoT sensor data (voltage, current, power, energy)
4. **bills** - Generated bills with amount, status, due dates
5. **payments** - Payment history
6. **notifications** - System notifications
7. **power_control** - Power ON/OFF control logs

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/signup` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/google` - Google OAuth
- `POST /api/admin/login` - Admin login
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - Logout

### User APIs
- `GET /api/user/dashboard` - Dashboard data
- `GET /api/user/energy-history?period={daily|weekly|monthly}` - Energy history
- `GET /api/user/bills` - User bills
- `POST /api/user/pay-bill` - Pay a bill
- `GET /api/user/notifications` - Notifications
- `GET /api/user/predicted-bill` - AI prediction

### Admin APIs
- `GET /api/admin/users` - All users
- `GET /api/admin/user/{userId}/consumption` - User consumption
- `PUT /api/admin/user/{userId}/payment-status` - Update payment
- `PUT /api/admin/user/{userId}/power-control` - Control power
- `GET /api/admin/stats` - System statistics

### IoT API
- `POST /api/iot/data` - Submit sensor data

## 🧪 Testing

### Backend Testing
All backend APIs have been tested and are working correctly:

```bash
cd /app/backend
python test_apis.py
```

Results:
- ✅ User Login
- ✅ User Dashboard
- ✅ Energy History (daily/weekly/monthly)
- ✅ Bills
- ✅ Notifications
- ✅ AI Predicted Bill
- ✅ Admin Login
- ✅ Admin - Get All Users
- ✅ Admin - User Consumption
- ✅ Admin - Power Control
- ✅ IoT Data Submission

## 📦 Setup & Installation

### Prerequisites
- Node.js 18+
- Python 3.11+
- MongoDB running
- Expo CLI

### Backend Setup
```bash
cd /app/backend
pip install -r requirements.txt
python seed_data.py  # Seed test data
python server.py     # Start server
```

### Frontend Setup
```bash
cd /app/frontend
yarn install
yarn start           # Start Expo dev server
```

## 🎨 Design System

### Color Palette
- **Background**: `#0A0E27` (Dark Navy)
- **Card Background**: `#1A1F3A` (Dark Blue)
- **Primary**: `#4A90E2` (Blue)
- **Success**: `#27AE60` (Green)
- **Danger**: `#E74C3C` (Red)
- **Warning**: `#F39C12` (Orange)
- **Text Primary**: `#FFFFFF` (White)
- **Text Secondary**: `#8B9DC3` (Light Blue Gray)
- **Accent**: `#FFD700` (Gold)

### Design Principles
- Dark theme throughout
- Card-based layouts with rounded corners (12-16px)
- Icon-driven UI with Ionicons
- Consistent spacing (8px grid)
- Touch-friendly targets (48px minimum)
- Clear visual hierarchy

## 🔐 Security Features

- Password hashing with bcrypt
- JWT session tokens (7-day expiry)
- Secure cookie management
- Role-based access control (user/admin)
- Protected API endpoints
- Input validation with Pydantic

## 🌟 Future Enhancements

- Push notifications (Expo Notifications)
- WebSocket for real-time updates
- Data export (PDF bills)
- Payment gateway integration
- Multi-language support
- Advanced analytics dashboard
- Energy usage recommendations
- Carbon footprint calculation

## 📄 Project for

**Final Year Engineering Project Demonstration**
- IoT-based Smart Energy Monitoring
- Automatic Billing System
- Mobile-first approach
- Real-time data visualization
- Admin control panel

## 🏗️ Architecture

```
┌─────────────────┐
│   IoT Hardware  │ (Voltage, Current sensors)
└────────┬────────┘
         │ HTTP POST
         ▼
┌─────────────────┐
│  FastAPI Backend│ (Python 3.11)
│  - REST APIs    │
│  - Auth System  │
│  - Billing Logic│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│    MongoDB      │ (Database)
│  - Users        │
│  - Readings     │
│  - Bills        │
└─────────────────┘
         ▲
         │ API Calls
┌────────┴────────┐
│  Expo Mobile App│ (React Native)
│  - User Portal  │
│  - Admin Panel  │
└─────────────────┘
```

## 📱 Supported Platforms

- ✅ iOS (iPhone/iPad)
- ✅ Android (phones/tablets)
- ✅ Web (responsive)

## 🔧 Environment Variables

### Backend (.env)
```
MONGO_URL=mongodb://localhost:27017
```

### Frontend (.env)
```
EXPO_PUBLIC_BACKEND_URL=https://iot-meter-track.preview.emergentagent.com
```

## � Deployment

### Frontend on Vercel
1. Import the frontend folder into Vercel.
2. Set the Root Directory to frontend.
3. Use these environment variables:
   - EXPO_PUBLIC_BACKEND_URL=https://your-backend-url
   - EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=your-google-web-client-id
   - EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=your-google-android-client-id
4. Deploy.

### Backend on Render
1. Create a new Web Service from the backend folder.
2. Use Python 3.11.
3. Build Command: `pip install -r requirements.txt`
4. Start Command: `uvicorn server:app --host 0.0.0.0 --port $PORT`
5. Add these environment variables:
   - GOOGLE_CLIENT_ID=your-google-client-id
   - GOOGLE_CLIENT_IDS=your-google-client-id
   - RAZORPAY_KEY_ID=your-razorpay-key
   - RAZORPAY_KEY_SECRET=your-razorpay-secret

### Free alternatives
- Frontend: Vercel, Netlify
- Backend: Render, Railway, Fly.io

## �📞 Support

For any issues or questions, refer to:
- Backend logs: `/var/log/supervisor/backend.err.log`
- Frontend logs: `/var/log/supervisor/expo.err.log`
- Database: Check MongoDB collections

---

**Built with ❤️ for Smart Energy Management**
