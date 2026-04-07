import { db, auth } from '../../db/firebase-config.js';
import { collection, query, where, getDocs, writeBatch, doc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { createMemberCard } from '../../components/MemberCard.js';

/**
 * 1. THE SECURITY GUARD
 * Ensures only logged-in Captains can see this page.
 */
onAuthStateChanged(auth, (user) => {
    if (!user) {
        window.location.href = "index.html"; // Kick out unauthorized users
    } else {
        const teamId = localStorage.getItem("teamId");
        if (teamId) {
            initializeDashboard(teamId);
        }
    }
});

/**
 * 2. THE DASHBOARD ENGINE
 */
const initializeDashboard = async (teamId) => {
    const container = document.getElementById('member-list-container');
    const saveBtn = document.getElementById('save-attendance-btn');
    const meetingDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    
    let memberIds = [];

    try {
        // Fetch Team Members
        const q = query(collection(db, "members"), where("teamId", "==", teamId));
        const querySnapshot = await getDocs(q);
        
        let memberHtml = "";

        querySnapshot.forEach((docSnap) => {
            const member = { id: docSnap.id, ...docSnap.data() };
            memberIds.push(member.id);
            // Passing 'Yes' as dummy history for now
            memberHtml += createMemberCard(member, "Yes");
        });

        container.innerHTML = memberHtml || "<p class='text-center py-10 text-slate-400'>No members assigned to your team.</p>";

        // Show the save button only if members exisSt
        if (memberIds.length > 0) saveBtn.classList.remove('hidden');

    } catch (error) {
        console.error("Load Error:", error);
        container.innerHTML = "<p class='text-red-500 text-center'>Error loading dashboard.</p>";
    }

    /**
     * 3. THE BATCH SUBMISSION (The "Save All" Logic)
     */
    saveBtn.onclick = async () => {
        const batch = writeBatch(db);
        saveBtn.disabled = true;
        saveBtn.innerText = "Saving...";

        memberIds.forEach(id => {
            const isPresent = document.getElementById(`status-${id}`).checked;
            const reason = document.getElementById(`reason-${id}`).value;
            const priorIntimation = document.getElementById(`intimation-${id}`).checked;

            // Use the Composite Key: MemberID_Date
            const attendanceRef = doc(db, "attendance", `${id}_${meetingDate}`);
            
            batch.set(attendanceRef, {
                memberId: id,
                teamId: teamId,
                meetingDate: meetingDate,
                presentStatus: isPresent ? "Yes" : "No",
                absenceReason: isPresent ? "" : reason,
                priorIntimation: isPresent ? false : priorIntimation,
                markedBy: auth.currentUser.uid, // Tracks who did the entry
                timestamp: new Date()
            }, { merge: true }); // prevents overwriting unrelated fields
        });

        try {
            await batch.commit();
            alert("Attendance successfully submitted for " + meetingDate);
            saveBtn.innerText = "Submitted ✅";
            saveBtn.classList.replace('bg-cyan-600', 'bg-green-600');
        } catch (error) {
            console.error("Batch Error:", error);
            alert("Submission failed. Please check your internet.");
            saveBtn.disabled = false;
            saveBtn.innerText = "Submit Weekly Report";
        }
    };
};
