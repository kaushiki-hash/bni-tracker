import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore"; 
import { getAuth } from "firebase/auth";

// These keys are from  'bniattendance-96205' project
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

//  These allow  other files to talk to the DB and Login system
export const db = getFirestore(app);
export const auth = getAuth(app);
