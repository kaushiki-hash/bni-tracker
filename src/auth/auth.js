import { auth, db } from '../db/firebase-config.js';
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

export const loginUser = async (email, password) => {
    try {
        // 1. Authenticate with Firebase Auth
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const uid = userCredential.user.uid;

        // 2. Fetch User Role from Firestore 'users' collection
        const userDoc = await getDoc(doc(db, "users", uid));

        if (userDoc.exists()) {
            const userData = userDoc.data();
            const role = userData.role;

            // 3. Redirect based on Role
            if (role === "admin") {
                window.location.href = "admin-dashboard.html";
            } else if (role === "captain") {
                // Store teamId so the Captain Dashboard knows what to load
                localStorage.setItem("teamId", userData.teamId);
                window.location.href = "captain-dashboard.html";
            } else {
                alert("Unauthorized role. Please contact Admin.");
            }
        } else {
            alert("User profile not found in database.");
        }
    } catch (error) {
        console.error("Login Error:", error.message);
        alert("Invalid credentials. Please try again.");
    }
};
