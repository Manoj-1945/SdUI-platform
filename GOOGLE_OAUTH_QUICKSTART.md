# Google OAuth Quick Start Checklist

Follow these steps to get Google OAuth working in your app:

## 1. Get Your Google Client ID (5-10 minutes)

- [ ] Go to [Google Cloud Console](https://console.cloud.google.com/)
- [ ] Create a new project or select existing one
- [ ] Enable "Google Identity Services API" in APIs & Services → Library
- [ ] Go to APIs & Services → OAuth consent screen
  - [ ] Select "External" user type
  - [ ] Fill in app name and contact emails
  - [ ] Save
- [ ] Go to APIs & Services → Credentials
  - [ ] Click "Create Credentials" → "OAuth client ID"
  - [ ] Select "Web application"
  - [ ] Add authorized origins:
    - `http://localhost:8000`
    - `http://localhost:19000`
  - [ ] Add authorized redirect URIs:
    - `http://localhost:8000/auth/callback`
  - [ ] Click "Create"
  - [ ] **Copy your Client ID** (format: `xxx-yyy.apps.googleusercontent.com`)

## 2. Configure Backend

- [ ] Create `backend/.env` file:
  ```
  GOOGLE_CLIENT_ID=your-actual-client-id.apps.googleusercontent.com
  ```

- [ ] Or set environment variable before running:
  ```bash
  export GOOGLE_CLIENT_ID="your-actual-client-id.apps.googleusercontent.com"
  ```

## 3. Configure Frontend

- [ ] Create `frontend/.env.local` file:
  ```
  EXPO_PUBLIC_GOOGLE_CLIENT_ID=your-actual-client-id.apps.googleusercontent.com
  ```

- [ ] Or add to `frontend/app.json` in `expo.extra`:
  ```json
  "extra": {
    "EXPO_PUBLIC_GOOGLE_CLIENT_ID": "your-actual-client-id.apps.googleusercontent.com"
  }
  ```

## 4. Install Dependencies

- [ ] Dependencies are already installed:
  - `expo-auth-session`
  - `@react-native-google-signin/google-signin`

## 5. Test the Setup

### Terminal 1 - Start Backend:
```bash
cd backend
export GOOGLE_CLIENT_ID="your-client-id.apps.googleusercontent.com"
python server.py
```

### Terminal 2 - Start Frontend:
```bash
cd frontend
npm start
# Press 'w' for web, or 'a'/'i' for Android/iOS simulator
```

### In the App:
- [ ] Click "Continue with Google" on login screen
- [ ] You should see Google consent screen
- [ ] Select your Google account
- [ ] Should redirect to dashboard
- [ ] Check that you're logged in with your Google account

## 6. Troubleshooting

### Error: "Please add your Google Client ID"
- [ ] Check `EXPO_PUBLIC_GOOGLE_CLIENT_ID` is set
- [ ] Make sure it's not the placeholder value
- [ ] Restart the dev server after changing env variables

### Error: "Invalid Google Token"
- [ ] Verify Client ID matches in both frontend and backend
- [ ] Check that Client ID hasn't expired
- [ ] Look at backend logs for details

### Google consent screen doesn't appear
- [ ] Check that OAuth consent screen is configured in Google Cloud
- [ ] Verify the project is in "External" testing mode
- [ ] Check network connectivity

## Files That Were Updated

| File | Changes |
|------|---------|
| `frontend/src/config/googleAuth.ts` | New: Google OAuth configuration |
| `frontend/app/auth/login.tsx` | Updated: Real Google Sign-In flow |
| `frontend/src/store/authStore.ts` | Updated: Pass ID token to backend |
| `backend/server.py` | Updated: Read Google Client ID from env |
| `frontend/.env.example` | New: Environment variable template |
| `backend/.env.example` | New: Environment variable template |

## What Happens When User Signs In

1. User clicks "Continue with Google" button
2. App opens Google auth screen using `expo-auth-session`
3. User selects Google account and consents
4. Google returns ID token to app
5. App sends ID token to your backend: `POST /api/auth/google`
6. Backend verifies token using Google's public key
7. Backend creates or updates user in database
8. Backend returns session token
9. App stores session token and redirects to dashboard

## Production Checklist

Before deploying to production:

- [ ] Add production domain to Google Cloud Console authorized origins
- [ ] Add production callback URLs to authorized redirect URIs
- [ ] Change from "External" to "In production" on OAuth consent screen
- [ ] Set environment variables securely (use CI/CD secrets)
- [ ] Test the flow on production domain
- [ ] Monitor logs for auth errors
- [ ] Set up SSL/HTTPS (required for OAuth in production)

## Need Help?

1. Check `GOOGLE_OAUTH_SETUP.md` for detailed step-by-step guide
2. Check backend logs: `python server.py`
3. Check frontend logs: `npm start` and watch console output
4. Verify all environment variables are set correctly
5. Check that Client ID exists in Google Cloud Console

## Related Files

- Full setup guide: [GOOGLE_OAUTH_SETUP.md](GOOGLE_OAUTH_SETUP.md)
- Backend auth: [backend/server.py](backend/server.py#L378)
- Frontend auth: [frontend/app/auth/login.tsx](frontend/app/auth/login.tsx)
- Auth store: [frontend/src/store/authStore.ts](frontend/src/store/authStore.ts)
