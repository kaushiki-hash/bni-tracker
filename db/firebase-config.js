// Imports
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// 2nd acc Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDINqAKeeoVU8KRhvYc_c9PMkYCkR07Z1I",
  authDomain: "bniattendance-96205.firebaseapp.com",
  projectId: "bniattendance-96205",
  storageBucket: "bniattendance-96205.firebasestorage.app",
  messagingSenderId: "250805340036",
  appId: "1:250805340036:web:0eaf64fcecc66535a27fd1",
  measurementId: "G-NY8CV4X36R"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export instances to use in auth.js and app.js
export const db = getFirestore(app);
export const auth = getAuth(app);
