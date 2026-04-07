import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "",
  authDomain: ".firebaseapp.com",
  projectId: "-app",
  storageBucket: ".appspot.com",
  messagingSenderId: "123456789",
  appId: "1:12345:web:abc123"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
