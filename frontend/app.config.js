const fs = require('fs');
const dotenv = require('dotenv');
const appJson = require('./app.json');

const envFile = '.env.local';
if (fs.existsSync(envFile)) {
  dotenv.config({ path: envFile });
}

module.exports = {
  ...appJson,
  expo: {
    ...appJson.expo,
    extra: {
      ...appJson.expo.extra,
      EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
      EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
      EXPO_PUBLIC_BACKEND_URL: process.env.EXPO_PUBLIC_BACKEND_URL || appJson.expo.extra.EXPO_PUBLIC_BACKEND_URL,
    },
  },
};
