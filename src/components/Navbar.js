import { auth } from './db/firebase-config.js';
import { signOut } from "firebase/auth";

window.handleLogout = async () => {
    try {
        await signOut(auth);
        localStorage.clear(); // Important: Clear teamId and role!
        window.location.href = "index.html";
    } catch (error) {
        console.error("Logout failed", error);
    }
};
