import { auth, db } from '../../../db/firebase-config.js';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { getAuth, createUserWithEmailAndPassword, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, getDoc, setDoc } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

// Configuration for secondary instance to create users without logging out admin
const firebaseConfig = {
  apiKey: "AIzaSyDINqAKeeoVU8KRhvYc_c9PMkYCkR07Z1I",
  authDomain: "bniattendance-96205.firebaseapp.com",
  projectId: "bniattendance-96205",
  storageBucket: "bniattendance-96205.firebasestorage.app",
  messagingSenderId: "250805340036",
  appId: "1:250805340036:web:0eaf64fcecc66535a27fd1",
  measurementId: "G-NY8CV4X36R"
};

const secondaryApp = initializeApp(firebaseConfig, "SecondaryManager");
const secondaryAuth = getAuth(secondaryApp);

class ManageData {
  constructor() {
    this.captains = [];
    this.teams = [];
    this.members = [];
    this.init();
  }

  async init() {
    this.bindEvents();
    this.setupTabs();
    this.setupModals();
    this.checkAuth();
  }

  checkAuth() {
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        const docRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists() && docSnap.data().role === 'admin') {
          await this.loadAllData();
        } else {
          window.location.href = './login.html';
        }
      } else {
        window.location.href = './login.html';
      }
    });
  }

  bindEvents() {
    document.getElementById('captainForm')?.addEventListener('submit', (e) => this.handleCaptainSubmit(e));
    document.getElementById('teamForm')?.addEventListener('submit', (e) => this.handleTeamSubmit(e));
    document.getElementById('memberForm')?.addEventListener('submit', (e) => this.handleMemberSubmit(e));
    document.getElementById('cancelDeleteBtn')?.addEventListener('click', () => this.closeModal(document.getElementById('deleteConfirmModal')));
  }

  setupTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const sections = document.querySelectorAll('.tab-content');

    tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const targetId = btn.getAttribute('data-tab');
        tabBtns.forEach(b => {
          b.className = "tab-btn whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm text-slate-500 border-transparent hover:text-slate-700 hover:border-slate-300 transition-all duration-200";
        });
        btn.className = "tab-btn active whitespace-nowrap py-4 px-1 border-b-2 font-bold text-sm text-bni-red border-bni-red transition-all duration-200";
        sections.forEach(s => {
          s.classList.add('hidden');
          s.classList.remove('opacity-100');
        });
        const target = document.getElementById(targetId);
        if (target) {
            target.classList.remove('hidden');
            setTimeout(() => target.classList.add('opacity-100'), 10);
        }
      });
    });
  }

  setupModals() {
    document.querySelectorAll('.open-modal').forEach(btn => {
      btn.addEventListener('click', () => {
        const modalId = btn.getAttribute('data-modal');
        const modal = document.getElementById(modalId);
        if(!modal) return;
        
        // Reset form if it's an "Add" action
        const form = modal.querySelector('form');
        if (form) {
            form.reset();
            const hiddenId = form.querySelector('input[type="hidden"]');
            if (hiddenId) hiddenId.value = '';
            const title = modal.querySelector('h3');
            if (title) title.textContent = title.textContent.replace('Edit', 'Add');
        }

        modal.classList.remove('hidden');
        setTimeout(() => modal.querySelector('.modal-anim').classList.add('active'), 10);
      });
    });

    document.querySelectorAll('.close-modal').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const modal = e.target.closest('.fixed.inset-0');
        this.closeModal(modal);
      });
    });
  }

  closeModal(modal) {
    if (!modal) return;
    const anim = modal.querySelector('.modal-anim');
    if (anim) anim.classList.remove('active');
    setTimeout(() => modal.classList.add('hidden'), 300);
  }

  showToast(msg, type = "success") {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `px-6 py-4 rounded-xl shadow-2xl font-bold flex items-center transition-all duration-500 transform translate-x-[120%] border ${
      type === 'success' ? 'bg-emerald-500 text-white border-emerald-400' : 'bg-red-600 text-white border-red-400'
    }`;
    toast.textContent = msg;
    container.appendChild(toast);
    requestAnimationFrame(() => toast.classList.remove('translate-x-[120%]'));
    setTimeout(() => {
      toast.classList.add('translate-x-[120%]');
      setTimeout(() => toast.remove(), 500);
    }, 3500);
  }

  showDeleteConfirm(title, message, onConfirm) {
    const modal = document.getElementById('deleteConfirmModal');
    if (!modal) return;
    document.getElementById('deleteModalTitle').textContent = title;
    document.getElementById('deleteModalMessage').textContent = message;
    const confirmBtn = document.getElementById('confirmDeleteBtn');

    modal.classList.remove('hidden');
    setTimeout(() => modal.querySelector('.modal-anim').classList.add('active'), 10);

    const newConfirmBtn = confirmBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);

    newConfirmBtn.addEventListener('click', async () => {
      newConfirmBtn.disabled = true;
      newConfirmBtn.innerHTML = '<span class="animate-spin mr-2">◌</span> Deleting...';
      await onConfirm();
      this.closeModal(modal);
    });
  }

  async loadAllData() {
    const loading = document.getElementById('pageLoading');
    const content = document.getElementById('tabContent');
    if (loading) loading.classList.remove('hidden');
    if (content) content.classList.add('hidden');

    try {
      const [caps, tms, mems] = await Promise.all([
        getDocs(collection(db, 'captains')),
        getDocs(collection(db, 'teams')),
        getDocs(collection(db, 'members'))
      ]);

      this.captains = caps.docs.map(d => ({ id: d.id, ...d.data() }));
      this.teams = tms.docs.map(d => ({ id: d.id, ...d.data() }));
      this.members = mems.docs.map(d => ({ id: d.id, ...d.data() }));

      this.refreshDropdowns();
      this.renderTables();
    } catch (err) {
      console.error(err);
      this.showToast('Master data sync failed', 'error');
    } finally {
      if (loading) loading.classList.add('hidden');
      if (content) content.classList.remove('hidden');
    }
  }

  refreshDropdowns() {
    ['capTeam', 'memTeam', 'teamCaptain'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.innerHTML = '<option value="">Unassigned</option>';
    });

    const capTeamSelect = document.getElementById('capTeam');
    const memTeamSelect = document.getElementById('memTeam');
    this.teams.forEach(t => {
      const opt = `<option value="${t.id}">${t.teamName}</option>`;
      if (capTeamSelect) capTeamSelect.insertAdjacentHTML('beforeend', opt);
      if (memTeamSelect) memTeamSelect.insertAdjacentHTML('beforeend', opt);
    });

    const teamCapSelect = document.getElementById('teamCaptain');
    if (teamCapSelect) {
      this.captains.forEach(c => {
        teamCapSelect.insertAdjacentHTML('beforeend', `<option value="${c.id}">${c.name}</option>`);
      });
    }
  }

  renderTables() {
    this.renderCaptains();
    this.renderTeams();
    this.renderMembers();
  }

  // ============== CAPTAINS ==============
  renderCaptains() {
    const tbody = document.getElementById('captainsTbody');
    if (!tbody) return;
    tbody.innerHTML = this.captains.length ? '' : '<tr><td colspan="5" class="py-12 text-center text-slate-500 font-medium">No captains designated yet.</td></tr>';

    this.captains.forEach(cap => {
      const team = this.teams.find(t => t.id === cap.teamId)?.teamName || 'Unassigned';
      const badge = cap.status === 'active' 
        ? '<span class="px-3 py-1 bg-green-100 text-green-700 rounded-full text-[10px] font-black uppercase">Active</span>'
        : '<span class="px-3 py-1 bg-slate-100 text-slate-500 rounded-full text-[10px] font-black uppercase">Inactive</span>';

      const tr = document.createElement('tr');
      tr.className = "hover:bg-slate-50 transition-colors group border-b border-slate-100";
      tr.innerHTML = `
        <td class="px-8 py-5 text-sm font-extrabold text-slate-800">${cap.name}</td>
        <td class="px-8 py-5 text-sm font-medium text-slate-500">${cap.email}</td>
        <td class="px-8 py-5 text-sm font-bold text-slate-600">${team}</td>
        <td class="px-8 py-5">${badge}</td>
        <td class="px-8 py-5 text-right space-x-3">
          <button class="text-blue-500 font-black text-xs uppercase hover:underline" onclick="window.manageData.editCaptain('${cap.id}')">Edit</button>
          <button class="text-red-500 font-black text-xs uppercase hover:underline" onclick="window.manageData.deleteCaptain('${cap.id}', '${cap.name}')">Delete</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  async handleCaptainSubmit(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    const id = document.getElementById('capId').value;
    const name = document.getElementById('capName').value;
    const email = document.getElementById('capEmail').value;
    const password = document.getElementById('capPassword').value;
    const teamId = document.getElementById('capTeam').value;
    const status = document.getElementById('capStatus').value;

    btn.disabled = true;
    const originalText = btn.textContent;
    btn.textContent = 'Processing...';

    const data = { name, email, teamId, status, role: 'captain' };

    try {
      if (id) {
        await Promise.all([
          updateDoc(doc(db, 'captains', id), data),
          updateDoc(doc(db, 'users', id), data)
        ]);
        this.showToast('Captain profile updated');
      } else {
        if (!password || password.length < 6) throw new Error('Password must be at least 6 characters');
        const userCred = await createUserWithEmailAndPassword(secondaryAuth, email, password);
        const uid = userCred.user.uid;
        await Promise.all([
          setDoc(doc(db, 'captains', uid), data),
          setDoc(doc(db, 'users', uid), data)
        ]);
        await secondaryAuth.signOut();
        this.showToast('New Captain account created');
      }
      this.closeModal(document.getElementById('captainModal'));
      await this.loadAllData();
    } catch (err) {
      console.error(err);
      this.showToast(err.message, 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = originalText;
    }
  }

  editCaptain(id) {
    const cap = this.captains.find(c => c.id === id);
    if(!cap) return;
    document.getElementById('capId').value = cap.id;
    document.getElementById('capName').value = cap.name;
    document.getElementById('capEmail').value = cap.email;
    document.getElementById('capTeam').value = cap.teamId || '';
    document.getElementById('capStatus').value = cap.status || 'active';
    document.getElementById('capPassword').placeholder = '•••••••• (Leave blank to keep)';
    
    document.getElementById('capModalTitle').textContent = 'Edit Captain Details';
    const m = document.getElementById('captainModal');
    m.classList.remove('hidden');
    setTimeout(() => m.querySelector('.modal-anim').classList.add('active'), 10);
  }

  deleteCaptain(id, name) {
    this.showDeleteConfirm('Delete Captain', `Remove ${name}? This will also delete their login access.`, async () => {
      try {
        await Promise.all([
          deleteDoc(doc(db, 'captains', id)),
          deleteDoc(doc(db, 'users', id))
        ]);
        this.showToast('Account successfully removed');
        await this.loadAllData();
      } catch (e) { this.showToast('Deletion failed', 'error'); }
    });
  }

  // ============== TEAMS ==============
  renderTeams() {
    const tbody = document.getElementById('teamsTbody');
    if (!tbody) return;
    tbody.innerHTML = this.teams.length ? '' : '<tr><td colspan="3" class="py-12 text-center text-slate-500 font-medium">No teams created yet.</td></tr>';

    this.teams.forEach(t => {
      const captain = this.captains.find(c => c.id === t.captainId)?.name || 'Unassigned';
      const tr = document.createElement('tr');
      tr.className = "hover:bg-slate-50 transition-colors border-b border-slate-100";
      tr.innerHTML = `
        <td class="px-8 py-5 text-sm font-extrabold text-slate-800">${t.teamName}</td>
        <td class="px-8 py-5 text-sm font-bold text-slate-500">${captain}</td>
        <td class="px-8 py-5 text-right space-x-3">
          <button class="text-blue-500 font-black text-xs uppercase hover:underline" onclick="window.manageData.editTeam('${t.id}')">Edit</button>
          <button class="text-red-500 font-black text-xs uppercase hover:underline" onclick="window.manageData.deleteTeam('${t.id}', '${t.teamName}')">Delete</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  async handleTeamSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('teamId').value;
    const name = document.getElementById('teamNameInput').value;
    const captainId = document.getElementById('teamCaptain').value || null;

    try {
      const data = { teamName: name, captainId };
      if (id) await updateDoc(doc(db, 'teams', id), data);
      else await addDoc(collection(db, 'teams'), data);
      
      this.showToast('Team records updated');
      this.closeModal(document.getElementById('teamModal'));
      await this.loadAllData();
    } catch (e) { this.showToast('Error saving team', 'error'); }
  }

  editTeam(id) {
    const t = this.teams.find(t => t.id === id);
    if(!t) return;
    document.getElementById('teamId').value = t.id;
    document.getElementById('teamNameInput').value = t.teamName;
    document.getElementById('teamCaptain').value = t.captainId || '';
    document.getElementById('teamModalTitle').textContent = 'Edit Team Hub';
    const m = document.getElementById('teamModal');
    m.classList.remove('hidden');
    setTimeout(() => m.querySelector('.modal-anim').classList.add('active'), 10);
  }

  deleteTeam(id, name) {
    this.showDeleteConfirm('Delete Team', `Are you sure you want to delete ${name}?`, async () => {
      try {
        await deleteDoc(doc(db, 'teams', id));
        this.showToast('Team deleted');
        await this.loadAllData();
      } catch (e) { this.showToast('Failed to delete', 'error'); }
    });
  }

  // ============== MEMBERS ==============
  renderMembers() {
    const tbody = document.getElementById('membersTbody');
    if (!tbody) return;
    tbody.innerHTML = this.members.length ? '' : '<tr><td colspan="3" class="py-12 text-center text-slate-500 font-medium">No members listed.</td></tr>';

    this.members.forEach(m => {
      const tr = document.createElement('tr');
      tr.className = "hover:bg-slate-50 transition-colors border-b border-slate-100";
      tr.innerHTML = `
        <td class="px-8 py-5 text-sm font-extrabold text-slate-800">${m.memberName || m.name}</td>
        <td class="px-8 py-5 text-sm font-bold text-slate-500">${this.teams.find(t => t.id === m.teamId)?.teamName || 'Unassigned'}</td>
        <td class="px-8 py-5 text-right space-x-3">
          <button class="text-blue-500 font-black text-xs uppercase hover:underline" onclick="window.manageData.editMember('${m.id}')">Edit</button>
          <button class="text-red-500 font-black text-xs uppercase hover:underline" onclick="window.manageData.deleteMember('${m.id}', '${m.memberName || m.name}')">Delete</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  async handleMemberSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('memId').value;
    const name = document.getElementById('memName').value;
    const teamId = document.getElementById('memTeam').value;
    const team = this.teams.find(t => t.id === teamId);

    try {
      const data = { memberName: name, teamId, captainId: team ? team.captainId : null };
      if (id) await updateDoc(doc(db, 'members', id), data);
      else await addDoc(collection(db, 'members'), data);
      this.showToast('Member list updated');
      this.closeModal(document.getElementById('memberModal'));
      await this.loadAllData();
    } catch (e) { this.showToast('Failed to save member', 'error'); }
  }

  editMember(id) {
    const m = this.members.find(m => m.id === id);
    if(!m) return;
    document.getElementById('memId').value = m.id;
    document.getElementById('memName').value = m.memberName || m.name;
    document.getElementById('memTeam').value = m.teamId || '';
    document.getElementById('memberModalTitle').textContent = 'Edit Member Profile';
    const md = document.getElementById('memberModal');
    md.classList.remove('hidden');
    setTimeout(() => md.querySelector('.modal-anim').classList.add('active'), 10);
  }

  deleteMember(id, name) {
    this.showDeleteConfirm('Delete Member', `Remove ${name} from records?`, async () => {
      try {
        await deleteDoc(doc(db, 'members', id));
        this.showToast('Member removed');
        await this.loadAllData();
      } catch (e) { this.showToast('Error during deletion', 'error'); }
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.manageData = new ManageData();
});