import { db, auth } from '../../db/firebase-config.js';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  writeBatch, 
  doc, 
  getDoc, 
  orderBy, 
  limit, 
  setDoc 
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';
import { onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';

class CaptainDashboard {
  constructor() {
    this.teamId = null;
    this.teamName = '';
    this.members = [];
    this.attendanceData = {}; // memberId -> { status, reason, priorIntimation }
    this.today = new Date().toISOString().split('T')[0];
    this.init();
  }

  async init() {
    this.bindEvents();
    this.checkAuth();
  }

  bindEvents() {
    document.getElementById('logout-btn')?.addEventListener('click', () => this.handleLogout());
    document.getElementById('save-attendance-btn')?.addEventListener('click', () => this.submitAttendance());
  }

  checkAuth() {
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (!userDoc.exists() || userDoc.data().role !== 'captain') {
            window.location.href = 'home.html';
            return;
          }

          const userData = userDoc.data();
          this.teamId = userData.teamId;
          
          // Display Captain Info
          document.getElementById('captain-name').textContent = userData.name || 'Captain';
          const initials = (userData.name || 'C').charAt(0).toUpperCase();
          document.getElementById('user-initials').textContent = initials;

          // Display Date
          const dateOpts = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
          document.getElementById('current-date').textContent = new Date().toLocaleDateString('en-US', dateOpts);

          if (this.teamId) {
            await this.loadTeamInfo();
            await this.loadMembers();
          } else {
            this.showToast('No team assigned to your profile', 'error');
            document.getElementById('loading-container').innerHTML = '<p class="text-slate-400 font-bold">No team assigned.</p>';
          }

        } catch (err) {
          console.error(err);
          this.showToast('Authentication error', 'error');
        }
      } else {
        window.location.href = 'login.html';
      }
    });
  }

  async loadTeamInfo() {
    try {
      const teamDoc = await getDoc(doc(db, 'teams', this.teamId));
      if (teamDoc.exists()) {
        const teamData = teamDoc.data();
        this.teamName = teamData.teamName;
        document.getElementById('team-badge').textContent = this.teamName.toUpperCase();
      }
    } catch (err) {
      console.warn('Error loading team name:', err);
    }
  }

  async loadMembers() {
    const listContainer = document.getElementById('member-list-container');
    const loadingContainer = document.getElementById('loading-container');

    try {
      const q = query(collection(db, 'members'), where('teamId', '==', this.teamId));
      const snap = await getDocs(q);
      
      this.members = snap.docs.map(d => ({ id: d.id, ...d.data() }));

      if (this.members.length === 0) {
        loadingContainer.innerHTML = '<p class="text-slate-400 font-bold">No members found in this team.</p>';
        return;
      }

      loadingContainer.classList.add('hidden');
      listContainer.classList.remove('hidden');

      let html = '';
      for (const member of this.members) {
        const prevStatus = await this.getPreviousAttendance(member.id);
        const name = member.memberName || member.name;
        
        // Initialize state
        this.attendanceData[member.id] = { status: 'Present', reason: '', priorIntimation: 'No' };

        html += `
          <div class="bg-white rounded-2xl p-4 card-shadow border-l-4 border-green-500 transition-all duration-300" id="member-card-${member.id}">
              <div class="flex justify-between items-start mb-4">
                  <div>
                      <h3 class="font-extrabold text-slate-800 text-lg leading-tight">${name}</h3>
                      <div class="flex items-center gap-2 mt-1">
                        <span class="text-[10px] uppercase tracking-widest font-black text-slate-400">Previous:</span>
                        <span class="text-[10px] uppercase font-black ${prevStatus === 'Present' ? 'text-green-600' : 'text-red-500'}">${prevStatus}</span>
                      </div>
                  </div>
                  
                  <div class="inline-flex bg-slate-100 p-1 rounded-xl shadow-inner">
                      <button onclick="window.dashboard.toggleAttendance('${member.id}', true)" 
                        id="btn-p-${member.id}" 
                        class="px-5 py-2 rounded-lg font-black text-xs transition-all bg-green-500 text-white shadow-md">P</button>
                      <button onclick="window.dashboard.toggleAttendance('${member.id}', false)" 
                        id="btn-a-${member.id}" 
                        class="px-5 py-2 rounded-lg font-black text-xs transition-all text-slate-400">A</button>
                  </div>
              </div>

              <div id="absence-fields-${member.id}" class="hidden space-y-4 pt-4 border-t border-slate-50 mt-2">
                  <div class="bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <label class="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1.5">Reason for Absence</label>
                      <select onchange="window.dashboard.updateField('${member.id}', 'reason', this.value)" 
                        class="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-red-500/10 focus:border-red-500 transition-all">
                          <option value="">Select a reason...</option>
                          <option value="Personal / Family">Personal / Family</option>
                          <option value="Health / Medical">Health / Medical</option>
                          <option value="Professional / Business">Professional / Business</option>
                          <option value="Out of Town">Out of Town</option>
                          <option value="Emergency">Emergency</option>
                          <option value="No Intimation">No Intimation</option>
                      </select>
                  </div>
                  <div class="flex items-center gap-3 px-2">
                      <div class="relative flex items-center">
                        <input type="checkbox" id="intimation-checkbox-${member.id}" 
                          onchange="window.dashboard.updateField('${member.id}', 'priorIntimation', this.checked ? 'Yes' : 'No')"
                          class="w-5 h-5 rounded-md border-slate-300 text-red-600 focus:ring-red-500 transition-all accent-red-600">
                      </div>
                      <label class="text-xs font-bold text-slate-600">Prior intimation received?</label>
                  </div>
              </div>
          </div>
        `;
      }
      listContainer.innerHTML = html;

    } catch (err) {
      console.error(err);
      this.showToast('Failed to load team members', 'error');
    }
  }

  async getPreviousAttendance(memberId) {
    try {
      const q = query(
        collection(db, 'attendance'), 
        where('memberId', '==', memberId),
        orderBy('date', 'desc'),
        limit(1)
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        return snap.docs[0].data().status;
      }
    } catch (err) {
      console.warn('Prev attendance fetch failed', err);
    }
    return 'No record';
  }

  toggleAttendance(memberId, isPresent) {
    const card = document.getElementById(`member-card-${memberId}`);
    const absenceFields = document.getElementById(`absence-fields-${memberId}`);
    const btnP = document.getElementById(`btn-p-${memberId}`);
    const btnA = document.getElementById(`btn-a-${memberId}`);

    this.attendanceData[memberId].status = isPresent ? 'Present' : 'Absent';

    if (isPresent) {
      absenceFields.classList.add('hidden');
      card.classList.replace('border-red-500', 'border-green-500');
      btnP.className = "px-5 py-2 rounded-lg font-black text-xs transition-all bg-green-500 text-white shadow-md";
      btnA.className = "px-5 py-2 rounded-lg font-black text-xs transition-all text-slate-400";
    } else {
      absenceFields.classList.remove('hidden');
      card.classList.contains('border-green-500') ? card.classList.replace('border-green-500', 'border-red-500') : card.classList.add('border-red-500');
      btnP.className = "px-5 py-2 rounded-lg font-black text-xs transition-all text-slate-400";
      btnA.className = "px-5 py-2 rounded-lg font-black text-xs transition-all bg-red-600 text-white shadow-md";
    }
  }

  updateField(memberId, field, value) {
    this.attendanceData[memberId][field] = value;
  }

  async submitAttendance() {
    const submitBtn = document.getElementById('save-attendance-btn');
    const originalText = submitBtn.textContent;
    
    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting Data...';

    try {
      const batch = writeBatch(db);
      const captainId = auth.currentUser.uid;

      for (const memberId of Object.keys(this.attendanceData)) {
        const data = this.attendanceData[memberId];
        const member = this.members.find(m => m.id === memberId);
        
        // Composite key to prevent duplicates: memberId_date
        const docRef = doc(db, 'attendance', `${memberId}_${this.today}`);
        
        batch.set(docRef, {
          memberId,
          memberName: member.memberName || member.name,
          teamId: this.teamId,
          captainId: captainId,
          date: this.today,
          status: data.status,
          reason: data.status === 'Present' ? '' : data.reason,
          priorIntimation: data.status === 'Present' ? 'No' : data.priorIntimation,
          timestamp: new Date().toISOString()
        });
      }

      await batch.commit();
      this.showToast('Attendance submitted successfully!', 'success');
      
      submitBtn.textContent = 'Submitted ✅';
      submitBtn.classList.replace('bni-red', 'bg-emerald-500');
      
      setTimeout(() => {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
        submitBtn.classList.replace('bg-emerald-500', 'bni-red');
      }, 3000);

    } catch (err) {
      console.error(err);
      this.showToast('Submission failed! Check connection.', 'error');
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
    }
  }

  handleLogout() {
    signOut(auth).then(() => {
      window.location.href = 'login.html';
    }).catch(err => {
      console.error(err);
      this.showToast('Logout failed', 'error');
    });
  }

  showToast(msg, type = 'success') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `px-6 py-4 rounded-2xl shadow-2xl font-bold flex items-center transition-all duration-300 toast-animate border ${
      type === 'success' ? 'bg-emerald-500 text-white border-emerald-400' : 'bg-red-600 text-white border-red-400'
    }`;
    toast.textContent = msg;
    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('opacity-0', 'translate-x-full');
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }
}

// Global hook for events
document.addEventListener('DOMContentLoaded', () => {
    window.dashboard = new CaptainDashboard();
});
