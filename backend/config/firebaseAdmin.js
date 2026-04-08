const admin = require('firebase-admin');

// Parse the service account JSON from environment variable
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Use FieldValue for increments
const { FieldValue } = admin.firestore;

module.exports = { db, admin, FieldValue };