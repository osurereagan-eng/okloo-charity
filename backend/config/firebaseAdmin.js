const admin = require('firebase-admin');

// 1. Get the environment variable string
const serviceAccountString = process.env.FIREBASE_SERVICE_ACCOUNT;

if (!serviceAccountString) {
    throw new Error("The FIREBASE_SERVICE_ACCOUNT environment variable is not defined.");
}

// 2. Parse it into a JSON object
const serviceAccount = JSON.parse(serviceAccountString);

// 3. Initialize
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Use FieldValue for increments
const { FieldValue } = admin.firestore;

module.exports = { db, admin, FieldValue };
