import { db } from './firebase-config.js';
import { doc, setDoc, getDoc } from "firebase/firestore";

export const submitAttendance = async (memberData) => {
  const { memberId, meetingDate, isPresent, reason, priorIntimation, captainId } = memberData;
  
  // Format: member_123_2026-04-07
  const docId = `${memberId}_${meetingDate}`;

  try {
    await setDoc(doc(db, "attendance", docId), {
      memberId,
      meetingDate,
      presentStatus: isPresent ? "Yes" : "No",
      absenceReason: isPresent ? "" : reason,
      priorIntimation: isPresent ? false : priorIntimation,
      markedBy: captainId,
      timestamp: new Date()
    });
    console.log("Record Saved!");
  } catch (error) {
    console.error("Error saving record: ", error);
  }
};
