/**
 * Global Firebase Initialization for Server-Side (Node.js)
 * File: server/config/firebase.js
 */
const { initializeApp, cert } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');

// Make sure the path to your JSON file is correct.
// const serviceAccount = require('./scene-zone-e1517-firebase-adminsdk-fbsvc-6e95473068.json');
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY_JSON)

try {
  const app = initializeApp({
    credential: cert(serviceAccount),
  });

  module.exports = {
    auth: getAuth(app),
  };
} catch (error) {
  console.error('Firebase initialization error:', error);
  throw new Error('Failed to initialize Firebase Admin SDK');
}