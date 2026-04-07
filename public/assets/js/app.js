
// 1.TO  Make the toggle function global so the HTML can "see" it
window.toggleAbsenceFields = (memberId) => {
    const statusCheckbox = document.getElementById(`status-${memberId}`);
    const fields = document.getElementById(`absence-fields-${memberId}`);
    

    // If checked (Present), hide fields. If unchecked (Absent), show fields.
    if (statusCheckbox.checked) {
        fields.classList.add('hidden');
    } else {
        fields.classList.remove('hidden');
    }
};

// 2. Initialize the page
document.addEventListener('DOMContentLoaded', () => {
    console.log("BNI Tracker App Initialized");
    
    // Logic to show current date in the header
    const dateEl = document.getElementById('current-date');
    if (dateEl) {
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        dateEl.innerText = new Date().toLocaleDateString(undefined, options);
    }
});
import { db } from './db/firebase-config.js';
import { collection, addDoc } from "firebase/firestore";

const testAddMember = async () => {
    try {
        const docRef = await addDoc(collection(db, "members"), {
            memberName: "Test Member 1",
            teamId: "Team - A",
            status: "active",
            captainId: "kn5AecqvSpBM5lWubJue" // Using the ID from your screenshot
        });
        console.log("✅ Success! Member added with ID: ", docRef.id);
    } catch (e) {
        console.error("❌ Error adding member: ", e);
    }
};

// Uncomment the line below to run the test once!
 testAddMember();
