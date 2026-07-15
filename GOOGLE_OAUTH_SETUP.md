# Google OAuth Setup Guide

This document explains how to set up and use your own Google OAuth client ID in this project.

## Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Select a Project" → "NEW PROJECT"
3. Enter project name: "SdUI Platform" (or your preferred name)
4. Click "CREATE"

## Step 2: Enable Required APIs

1. In the sidebar, click "APIs & Services" → "Library"
2. Search for and enable:
   - **Google Identity Services API**
   - **People API** (optional)

## Step 3: Configure OAuth Consent Screen

1. Go to "APIs & Services" → "OAuth consent screen"
2. Choose "External" user type
3. Fill in the form:
   - **App name**: SdUI Platform
   - **User support email**: your-email@example.com
   - **Developer contact information**: your-email@example.com
4. Click "SAVE AND CONTINUE"
5. On "Scopes" page, click "SAVE AND CONTINUE"
6. Review and click "BACK TO DASHBOARD"

## Step 4: Create OAuth 2.0 Credentials

1. Go to "APIs & Services" → "Credentials"
2. Click "CREATE CREDENTIALS" → "OAuth client ID"
3. Choose application type: **Web application**
4. Under "Authorized JavaScript origins", add:
   - `http://localhost:8000`
   - `http://localhost:19000` (Expo dev server)
   - `http://localhost:19006` (Expo web)
   - Your production domain

5. Under "Authorized redirect URIs", add:
   - `http://localhost:8000/auth/callback`
   - Your production callback URL

6. Click "CREATE"
7. Copy your **Client ID** (looks like: `xxx-yyy.apps.googleusercontent.com`)

## Step 5: Configure Your Project

### Backend (.env or environment variable)

Set the environment variable in your backend:

```bash
export GOOGLE_CLIENT_ID="your-client-id.apps.googleusercontent.com"
```

Or add to `backend/.env`:

```
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
```

### Frontend (.env)

Create or update `frontend/.env.local`:

```
EXPO_PUBLIC_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
```

Or add to `app.json` in the `expo.extra` section:

```json
{
  "expo": {
    "extra": {
      "EXPO_PUBLIC_GOOGLE_CLIENT_ID": "your-client-id.apps.googleusercontent.com"
    }
  }
}
```

## Step 6: Test the Setup

### Start the Backend

```bash
cd backend
export GOOGLE_CLIENT_ID="your-client-id.apps.googleusercontent.com"
python server.py
```

### Start the Frontend (Expo)

```bash
cd frontend
npm start
# Then choose:
# 'i' for iOS simulator
# 'a' for Android emulator
# 'w' for web browser
```

### Test Google Login

1. Open the app and click "Continue with Google"
2. You should see the Google consent screen
3. After signing in, you should be redirected to the dashboard

## Step 7 (Optional): Native Mobile Setup

For native Android/iOS builds, you may need additional setup:

### Android

1. Get your app's SHA-1 fingerprint:
   ```bash
   cd android && ./gradlew signingReport
   ```

2. Add it to Google Cloud Console under Credentials

### iOS

1. Add your iOS Bundle ID to Google Cloud Console
2. Configure Apple Sign-In (optional but recommended)

## Troubleshooting

### "Please add your Google Client ID" message

- Check that `EXPO_PUBLIC_GOOGLE_CLIENT_ID` is set in your environment
- Make sure the value doesn't have `YOUR_GOOGLE_CLIENT_ID` placeholder

### Invalid client ID error

- Verify your Client ID is correct from Google Cloud Console
- Check that your redirect URI is added in Google Cloud Console
- Ensure HTTPS is configured for production

### CORS errors

- Make sure backend allows your frontend origin in CORS settings
- Add to `backend/server.py` if needed:
  ```python
  app.add_middleware(
      CORSMiddleware,
      allow_origins=["http://localhost:19006", "your-frontend-domain"],
      allow_credentials=True,
      allow_methods=["*"],
      allow_headers=["*"],
  )
  ```

### Token verification fails

- Check that the `GOOGLE_CLIENT_ID` in backend matches the one in Google Cloud Console
- Verify the token hasn't expired
- Check backend logs for specific error messages

## What's Been Updated

1. **frontend/src/config/googleAuth.ts** - Google client configuration
2. **frontend/app/auth/login.tsx** - Real Google Sign-In flow using expo-auth-session
3. **frontend/src/store/authStore.ts** - Updated to pass ID token to backend
4. **backend/server.py** - Already configured to verify Google ID tokens

## Next Steps

1. Get your Google Client ID from Google Cloud Console
2. Add it to your environment variables
3. Test the Google login flow
4. Configure for your production domain

For more information, see [Google OAuth Documentation](https://developers.google.com/identity/protocols/oauth2)
