const fs = require('fs');
const dotenv = require('dotenv');
const appJson = require('./app.json');

const envFile = '.env.local';
if (fs.existsSync(envFile)) {
  dotenv.config({ path: envFile });
}

const isProduction = process.env.NODE_ENV === 'production';
const backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL || (!isProduction && appJson.expo.extra.EXPO_PUBLIC_BACKEND_URL) || '';

if (isProduction && !backendUrl) {
  throw new Error(
    'EXPO_PUBLIC_BACKEND_URL is required for production builds. Set it in Vercel environment variables.'
  );
}

module.exports = {
  ...appJson,
  expo: {
    ...appJson.expo,
    extra: {
      ...appJson.expo.extra,
      EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
      EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
      EXPO_PUBLIC_BACKEND_URL: backendUrl,
    },
  },
};
