import { db, auth } from '../../db/firebase-config.js';
import { collection, query, where, getDocs, writeBatch, doc } from "firebase/firestore";
import { createMemberCard } from '../../components/MemberCard.js';

const captainDashboard = async (teamId) => {
    const container = document.getElementById('member-list-container');
    const meetingDate = new Date().toISOString().split('T')[0]; // Today's date YYYY-MM-DD

    // 1. Fetch all members for this Captain's team
    const q = query(collection(db, "members"), where("teamId", "==", teamId));
    const querySnapshot = await getDocs(q);
    
    let memberHtml = "";
    let memberIds = [];

    querySnapshot.forEach((doc) => {
        const member = { id: doc.id, ...doc.data() };
        memberIds.push(member.id);
        
        // For now, passing 'Yes' as dummy history. 
        // Vasanthi will connect the real history logic later.
        memberHtml += createMemberCard(member, "Yes");
    });

    container.innerHTML = memberHtml;

    // 2. Handle the "Submit All" Button
    document.getElementById('save-attendance-btn').addEventListener('click', async () => {
        const batch = writeBatch(db); // Use batch for efficiency
        
        memberIds.forEach(id => {
            const isPresent = document.getElementById(`status-${id}`).checked;
            const reason = document.getElementById(`reason-${id}`).value;
            const priorIntimation = document.getElementById(`intimation-${id}`).checked;

            const attendanceRef = doc(db, "attendance", `${id}_${meetingDate}`);
            
            batch.set(attendanceRef, {
                memberId: id,
                teamId: teamId,
                meetingDate: meetingDate,
                presentStatus: isPresent ? "Yes" : "No",
                absenceReason: isPresent ? "" : reason,
                priorIntimation: isPresent ? false : priorIntimation,
                timestamp: new Date()
            });
        });

        try {
            await batch.commit();
            alert("Attendance submitted successfully!");
        } catch (error) {
            console.error("Error submitting attendance:", error);
            alert("Submission failed.");
        }
    });
};
