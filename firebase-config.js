// Firebase Configuration
// Replace these values with your actual Firebase project credentials

const firebaseConfig = {
  apiKey: "AIzaSyCrLVlk8jaNMm2gyx_pDMC1dzwvy9RZsRg",
  authDomain: "okloo-oasis-of-hope-725d9.firebaseapp.com",
  databaseURL: "https://okloo-oasis-of-hope-725d9-default-rtdb.firebaseio.com",
  projectId: "okloo-oasis-of-hope-725d9",
  storageBucket: "okloo-oasis-of-hope-725d9.firebasestorage.app",
  messagingSenderId: "900820306948",
  appId: "1:900820306948:web:841d7e78b5020029ec3951"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize services
const db = firebase.firestore();

// Export for use in other files
window.db = db;
window.firebase = firebase;
