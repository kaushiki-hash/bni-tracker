import { db } from './firebase-config.js';
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  Timestamp
} from 'firebase/firestore';

/**
 * ========================
 * OVERVIEW & STATISTICS
 * ========================
 */

export const getOverviewStats = async () => {
  try {
    const stats = {
      totalTeams: 0,
      totalMembers: 0,
      attendancePercentage: 0,
      totalAbsent: 0
    };

    // Get total teams
    const teamsSnap = await getDocs(collection(db, 'teams'));
    stats.totalTeams = teamsSnap.size;

    // Get total members
    const membersSnap = await getDocs(collection(db, 'members'));
    stats.totalMembers = membersSnap.size;

    // Get this week's attendance stats
    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());
    weekStart.setHours(0, 0, 0, 0);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    const attendanceQuery = query(
      collection(db, 'attendance'),
      where('meetingDate', '>=', Timestamp.fromDate(weekStart)),
      where('meetingDate', '<=', Timestamp.fromDate(weekEnd))
    );

    const attendanceSnap = await getDocs(attendanceQuery);
    let presentCount = 0;
    let absentCount = 0;

    attendanceSnap.forEach(doc => {
      const data = doc.data();
      if (data.presentStatus === 'Yes') presentCount++;
      else absentCount++;
    });

    stats.totalAbsent = absentCount;
    stats.attendancePercentage = attendanceSnap.size > 0
      ? Math.round((presentCount / attendanceSnap.size) * 100)
      : 0;

    return { success: true, data: stats };
  } catch (error) {
    console.error('Error fetching overview stats:', error);
    return { success: false, error: error.message };
  }
};

/**
 * ========================
 * ATTENDANCE RECORDS
 * ========================
 */

export const getAllAttendance = async (filters = {}) => {
  try {
    let attendanceQuery;
    const constraints = [];

    // Filter by date range if provided
    if (filters.startDate && filters.endDate) {
      const start = new Date(filters.startDate);
      const end = new Date(filters.endDate);
      end.setHours(23, 59, 59, 999);

      constraints.push(where('meetingDate', '>=', Timestamp.fromDate(start)));
      constraints.push(where('meetingDate', '<=', Timestamp.fromDate(end)));
    }

    // Filter by captain if provided
    if (filters.captainId) {
      constraints.push(where('captainId', '==', filters.captainId));
    }

    // Filter by team if provided
    if (filters.teamId) {
      constraints.push(where('teamId', '==', filters.teamId));
    }

    if (constraints.length > 0) {
      attendanceQuery = query(collection(db, 'attendance'), ...constraints);
    } else {
      attendanceQuery = collection(db, 'attendance');
    }

    const attendanceSnap = await getDocs(attendanceQuery);
    const records = [];

    for (const docSnap of attendanceSnap.docs) {
      const data = docSnap.data();
      
      // Get member details
      const memberDoc = await getDoc(doc(db, 'members', data.memberId));
      const memberData = memberDoc.data() || {};

      // Get team details
      const teamDoc = await getDoc(doc(db, 'teams', data.teamId));
      const teamData = teamDoc.data() || {};

      // Get captain details
      const captainDoc = await getDoc(doc(db, 'captains', data.captainId));
      const captainData = captainDoc.data() || {};

      records.push({
        id: docSnap.id,
        memberName: memberData.memberName || 'Unknown',
        teamName: teamData.teamName || 'Unknown',
        captainName: captainData.name || 'Unknown',
        presentStatus: data.presentStatus,
        absenceReason: data.absenceReason || '-',
        priorIntimation: data.priorIntimation ? 'Yes' : 'No',
        meetingDate: data.meetingDate?.toDate ? data.meetingDate.toDate() : new Date(data.meetingDate),
        memberId: data.memberId,
        teamId: data.teamId,
        captainId: data.captainId,
        timestamp: data.timestamp?.toDate ? data.timestamp.toDate() : new Date(data.timestamp)
      });
    }

    return { success: true, data: records };
  } catch (error) {
    console.error('Error fetching attendance:', error);
    return { success: false, error: error.message };
  }
};

/**
 * ========================
 * CAPTAINS MANAGEMENT
 * ========================
 */

export const getCaptains = async () => {
  try {
    const captainsSnap = await getDocs(collection(db, 'captains'));
    const captains = [];

    for (const docSnap of captainsSnap.docs) {
      const data = docSnap.data();
      const teamDoc = await getDoc(doc(db, 'teams', data.teamId));
      const teamData = teamDoc.data();

      captains.push({
        id: docSnap.id,
        name: data.name,
        email: data.email,
        teamId: data.teamId,
        teamName: teamData?.teamName || 'Unknown',
        status: data.status,
        createdAt: data.createdAt
      });
    }

    return { success: true, data: captains };
  } catch (error) {
    console.error('Error fetching captains:', error);
    return { success: false, error: error.message };
  }
};

export const addCaptain = async (captainData) => {
  try {
    const captainId = `captain_${Date.now()}`;
    
    await setDoc(doc(db, 'captains', captainId), {
      name: captainData.name,
      email: captainData.email,
      teamId: captainData.teamId,
      status: 'active',
      createdAt: Timestamp.now()
    });

    return { success: true, data: { id: captainId } };
  } catch (error) {
    console.error('Error adding captain:', error);
    return { success: false, error: error.message };
  }
};

export const updateCaptain = async (captainId, captainData) => {
  try {
    await updateDoc(doc(db, 'captains', captainId), {
      name: captainData.name,
      email: captainData.email,
      teamId: captainData.teamId,
      updatedAt: Timestamp.now()
    });

    return { success: true };
  } catch (error) {
    console.error('Error updating captain:', error);
    return { success: false, error: error.message };
  }
};

export const deactivateCaptain = async (captainId) => {
  try {
    await updateDoc(doc(db, 'captains', captainId), {
      status: 'inactive',
      deactivatedAt: Timestamp.now()
    });

    return { success: true };
  } catch (error) {
    console.error('Error deactivating captain:', error);
    return { success: false, error: error.message };
  }
};

/**
 * ========================
 * TEAMS MANAGEMENT
 * ========================
 */

export const getTeams = async () => {
  try {
    const teamsSnap = await getDocs(collection(db, 'teams'));
    const teams = [];

    for (const docSnap of teamsSnap.docs) {
      const data = docSnap.data();
      const captainDoc = await getDoc(doc(db, 'captains', data.captainId));
      const captainData = captainDoc.data();

      teams.push({
        id: docSnap.id,
        teamName: data.teamName,
        captainId: data.captainId,
        captainName: captainData?.name || 'Unknown',
        createdAt: data.createdAt
      });
    }

    return { success: true, data: teams };
  } catch (error) {
    console.error('Error fetching teams:', error);
    return { success: false, error: error.message };
  }
};

export const addTeam = async (teamData) => {
  try {
    const teamId = `team_${Date.now()}`;
    
    await setDoc(doc(db, 'teams', teamId), {
      teamName: teamData.teamName,
      captainId: teamData.captainId,
      createdAt: Timestamp.now()
    });

    return { success: true, data: { id: teamId } };
  } catch (error) {
    console.error('Error adding team:', error);
    return { success: false, error: error.message };
  }
};

export const updateTeam = async (teamId, teamData) => {
  try {
    await updateDoc(doc(db, 'teams', teamId), {
      teamName: teamData.teamName,
      captainId: teamData.captainId,
      updatedAt: Timestamp.now()
    });

    return { success: true };
  } catch (error) {
    console.error('Error updating team:', error);
    return { success: false, error: error.message };
  }
};

export const assignCaptainToTeam = async (teamId, captainId) => {
  try {
    await updateDoc(doc(db, 'teams', teamId), {
      captainId: captainId,
      updatedAt: Timestamp.now()
    });

    return { success: true };
  } catch (error) {
    console.error('Error assigning captain:', error);
    return { success: false, error: error.message };
  }
};

/**
 * ========================
 * MEMBERS MANAGEMENT
 * ========================
 */

export const getMembers = async () => {
  try {
    const membersSnap = await getDocs(collection(db, 'members'));
    const members = [];

    for (const docSnap of membersSnap.docs) {
      const data = docSnap.data();
      const teamDoc = await getDoc(doc(db, 'teams', data.teamId));
      const teamData = teamDoc.data();

      members.push({
        id: docSnap.id,
        memberName: data.memberName,
        teamId: data.teamId,
        teamName: teamData?.teamName || 'Unknown',
        captainId: data.captainId,
        status: data.status,
        createdAt: data.createdAt
      });
    }

    return { success: true, data: members };
  } catch (error) {
    console.error('Error fetching members:', error);
    return { success: false, error: error.message };
  }
};

export const addMember = async (memberData) => {
  try {
    const memberId = `member_${Date.now()}`;
    
    await setDoc(doc(db, 'members', memberId), {
      memberName: memberData.memberName,
      teamId: memberData.teamId,
      captainId: memberData.captainId,
      status: 'active',
      createdAt: Timestamp.now()
    });

    return { success: true, data: { id: memberId } };
  } catch (error) {
    console.error('Error adding member:', error);
    return { success: false, error: error.message };
  }
};

export const updateMember = async (memberId, memberData) => {
  try {
    await updateDoc(doc(db, 'members', memberId), {
      memberName: memberData.memberName,
      teamId: memberData.teamId,
      captainId: memberData.captainId,
      status: memberData.status,
      updatedAt: Timestamp.now()
    });

    return { success: true };
  } catch (error) {
    console.error('Error updating member:', error);
    return { success: false, error: error.message };
  }
};

export const removeMember = async (memberId) => {
  try {
    await deleteDoc(doc(db, 'members', memberId));
    return { success: true };
  } catch (error) {
    console.error('Error removing member:', error);
    return { success: false, error: error.message };
  }
};

