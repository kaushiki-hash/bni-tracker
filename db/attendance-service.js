import { db } from './firebase-config.js';
import { doc, setDoc } from "firebase/firestore";

export const submitAttendance = async (memberData) => {
  const { 
    memberId, 
    meetingDate, 
    isPresent, 
    reason, 
    priorIntimation, 
    captainId, 
    teamId, 
    lastWeekStatus 
  } = memberData;
  
  const docId = `${memberId}_${meetingDate}`;

  try {
    await setDoc(doc(db, "attendance", docId), {
      memberId,
      meetingDate,
      teamId,      // Added for Admin filtering
      captainId,   // Added for Admin filtering
      presentStatus: isPresent ? "Yes" : "No",
      absenceReason: isPresent ? "" : reason,
      priorIntimation: isPresent ? false : (priorIntimation || false),
      previousWeekPresent: lastWeekStatus || "No Record", // Milestone 1 field
      markedBy: captainId,
      timestamp: new Date() 
    });
    console.log(`✅ Attendance saved for Member: ${memberId}`);
  } catch (error) {
    console.error("❌ Error saving record: ", error);
    throw error; // Pass the error up so the UI can show an alert
  }
};
