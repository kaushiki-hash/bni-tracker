// 1. Imports FIRST
import { db } from './db/firebase-config.js';
import { collection, addDoc } from "firebase/firestore";

// 2. Global Toggle Function
window.toggleAbsenceFields = (memberId) => {
    const statusCheckbox = document.getElementById(`status-${memberId}`);
    const fields = document.getElementById(`absence-fields-${memberId}`);
    
    if (statusCheckbox.checked) {
        fields.classList.add('hidden');
    } else {
        fields.classList.remove('hidden');
    }
};

// 3. Database Test Function
const testAddMember = async () => {
    try {
        const docRef = await addDoc(collection(db, "members"), {
            memberName: "Test Member 1",
            teamId: "Team - A",
            status: "active",
            captainId: "kn5AecqvSpBM5lWubJue" 
        });
        console.log("✅ Success! Member added with ID: ", docRef.id);
    } catch (e) {
        console.error("❌ Error adding member: ", e);
    }
};

// 4. Page Initialization
document.addEventListener('DOMContentLoaded', () => {
    console.log("BNI Tracker App Initialized");
    
    const dateEl = document.getElementById('current-date');
    if (dateEl) {
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        dateEl.innerText = new Date().toLocaleDateString(undefined, options);
    }

    // Run test once
    testAddMember(); 
});
