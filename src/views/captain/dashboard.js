import { db, auth } from '../../../db/firebase-config.js';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  writeBatch, 
  doc, 
  getDoc, 
  orderBy, 
  limit 
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
            window.location.href = 'login.html';
            return;
          }

          const userData = userDoc.data();
          this.teamId = userData.teamId;
          
          // Display User Info
          const nameEl = document.getElementById('captain-name');
          const initialsEl = document.getElementById('user-initials');
          if (nameEl) nameEl.textContent = userData.name || 'Captain';
          if (initialsEl) initialsEl.textContent = (userData.name || 'C').charAt(0).toUpperCase();

          // Display Date
          const dateOpts = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
          const dateEl = document.getElementById('current-date');
          if (dateEl) dateEl.textContent = new Date().toLocaleDateString('en-US', dateOpts);

          if (this.teamId) {
            await this.loadTeamInfo();
            await this.loadMembers();
          } else {
            this.showToast('No team assigned to your profile', 'error');
            const loader = document.getElementById('loading-container');
            if (loader) loader.innerHTML = '<p class="text-slate-400 font-bold p-10">No team assigned. Contact Admin.</p>';
          }

        } catch (err) {
          console.error('Auth sync error:', err);
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
        this.teamName = teamDoc.data().teamName;
        const badge = document.getElementById('team-badge');
        if (badge) badge.textContent = this.teamName.toUpperCase();
      }
    } catch (err) {
      console.warn('Team fetch failed', err);
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
        if (loadingContainer) loadingContainer.innerHTML = '<p class="text-slate-400 font-bold p-10">No members found in your team.</p>';
        return;
      }

      if (loadingContainer) loadingContainer.classList.add('hidden');
      if (listContainer) listContainer.classList.remove('hidden');

      let html = '';
      for (const member of this.members) {
        const prevStatus = await this.getPreviousAttendance(member.id);
        const name = member.memberName || member.name;
        
        // Initialize local state
        this.attendanceData[member.id] = { status: 'Present', reason: '', priorIntimation: 'No' };

        html += `
          <div class="bg-white rounded-2xl p-5 mb-4 border border-slate-100 shadow-sm border-l-4 border-emerald-500 transition-all duration-300" id="member-card-${member.id}">
              <div class="flex justify-between items-start">
                  <div class="flex-1">
                      <h3 class="font-bold text-slate-800 text-base leading-tight">${name}</h3>
                      <div class="flex items-center gap-2 mt-1">
                        <span class="text-[9px] uppercase tracking-widest font-black text-slate-400">Previous Meet:</span>
                        <span class="text-[9px] uppercase font-black ${prevStatus === 'Present' ? 'text-emerald-600' : 'text-rose-500'}">${prevStatus}</span>
                      </div>
                  </div>
                  
                  <div class="flex bg-slate-50 p-1 rounded-xl border border-slate-100">
                      <button onclick="window.dashboard.toggleAttendance('${member.id}', true)" 
                        id="btn-p-${member.id}" 
                        class="px-5 py-2 rounded-lg font-black text-xs transition-all bg-emerald-500 text-white shadow-sm">P</button>
                      <button onclick="window.dashboard.toggleAttendance('${member.id}', false)" 
                        id="btn-a-${member.id}" 
                        class="px-5 py-2 rounded-lg font-black text-xs transition-all text-slate-400 hover:text-slate-600">A</button>
                  </div>
              </div>

              <div id="absence-fields-${member.id}" class="hidden space-y-4 pt-4 border-t border-slate-50 mt-4">
                  <div class="space-y-1.5">
                      <label class="text-[10px] font-black text-slate-500 uppercase tracking-widest block ml-1">Reason for Absence</label>
                      <select onchange="window.dashboard.updateField('${member.id}', 'reason', this.value)" 
                        class="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-rose-500/10 focus:border-rose-500 transition-all">
                          <option value="">Select a reason...</option>
                          <option value="Personal / Family">Personal / Family</option>
                          <option value="Health / Medical">Health / Medical</option>
                          <option value="Professional / Business">Professional / Business</option>
                          <option value="Travel / Out of Town">Travel / Out of Town</option>
                          <option value="Emergency">Emergency</option>
                          <option value="No Intimation">No Intimation</option>
                      </select>
                  </div>
                  <div class="flex items-center gap-3 px-1">
                      <label class="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" onchange="window.dashboard.updateField('${member.id}', 'priorIntimation', this.checked ? 'Yes' : 'No')" class="sr-only peer">
                        <div class="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-rose-600"></div>
                        <span class="ms-3 text-xs font-bold text-slate-600">Prior intimation received?</span>
                      </label>
                  </div>
              </div>
          </div>
        `;
      }
      if (listContainer) listContainer.innerHTML = html;

    } catch (err) {
      console.error(err);
      this.showToast('Failed to load team list', 'error');
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
      console.warn('Previous record error', err);
    }
    return 'New User';
  }

  toggleAttendance(memberId, isPresent) {
    const card = document.getElementById(`member-card-${memberId}`);
    const absenceFields = document.getElementById(`absence-fields-${memberId}`);
    const btnP = document.getElementById(`btn-p-${memberId}`);
    const btnA = document.getElementById(`btn-a-${memberId}`);

    this.attendanceData[memberId].status = isPresent ? 'Present' : 'Absent';

    if (isPresent) {
      absenceFields?.classList.add('hidden');
      card?.classList.replace('border-rose-500', 'border-emerald-500');
      if (btnP) btnP.className = "px-5 py-2 rounded-lg font-black text-xs transition-all bg-emerald-500 text-white shadow-sm";
      if (btnA) btnA.className = "px-5 py-2 rounded-lg font-black text-xs transition-all text-slate-400 hover:text-slate-600";
    } else {
      absenceFields?.classList.remove('hidden');
      if (card?.classList.contains('border-emerald-500')) {
        card.classList.replace('border-emerald-500', 'border-rose-500');
      } else {
        card?.classList.add('border-rose-500');
      }
      if (btnP) btnP.className = "px-5 py-2 rounded-lg font-black text-xs transition-all text-slate-400 hover:text-slate-600";
      if (btnA) btnA.className = "px-5 py-2 rounded-lg font-black text-xs transition-all bg-rose-600 text-white shadow-sm";
    }
  }

  updateField(memberId, field, value) {
    if (this.attendanceData[memberId]) {
      this.attendanceData[memberId][field] = value;
    }
  }

  async submitAttendance() {
    const submitBtn = document.getElementById('save-attendance-btn');
    if (!submitBtn) return;
    
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="animate-spin mr-2">◌</span> Saving...';

    try {
      const batch = writeBatch(db);
      const captainId = auth.currentUser.uid;

      for (const memberId of Object.keys(this.attendanceData)) {
        const data = this.attendanceData[memberId];
        const member = this.members.find(m => m.id === memberId);
        
        // Validation for absent reasons
        if (data.status === 'Absent' && !data.reason) {
          throw new Error(`Reason required for ${member.memberName || member.name}`);
        }

        // Composite key: memberId_date
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
      this.showToast('Attendance logged for today!', 'success');
      
      submitBtn.textContent = 'Submitted ✅';
      submitBtn.classList.replace('bg-rose-600', 'bg-emerald-500');
      
      setTimeout(() => {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
        submitBtn.classList.replace('bg-emerald-500', 'bg-rose-600');
      }, 5000);

    } catch (err) {
      console.error(err);
      this.showToast(err.message || 'Submission failed!', 'error');
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
    }
  }

  handleLogout() {
    signOut(auth).then(() => {
      window.location.href = 'login.html';
    }).catch(err => {
      console.error(err);
    });
  }

  showToast(msg, type = 'success') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `px-6 py-4 rounded-2xl shadow-2xl font-bold flex items-center transition-all duration-300 border ${
      type === 'success' ? 'bg-emerald-500 text-white border-emerald-400' : 'bg-red-600 text-white border-red-400'
    } transform translate-y-20 opacity-0`;
    toast.textContent = msg;
    container.appendChild(toast);

    requestAnimationFrame(() => {
        toast.classList.remove('translate-y-20', 'opacity-0');
    });

    setTimeout(() => {
      toast.classList.add('opacity-0', 'translate-y-10');
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }
}

document.addEventListener('DOMContentLoaded', () => {
    window.dashboard = new CaptainDashboard();
});
