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

// Initialize secondary app for creating new captains
const secondaryApp = initializeApp(firebaseConfig, "Secondary");
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
    document.getElementById('captainForm').addEventListener('submit', (e) => this.handleCaptainSubmit(e));
    document.getElementById('teamForm').addEventListener('submit', (e) => this.handleTeamSubmit(e));
    document.getElementById('memberForm').addEventListener('submit', (e) => this.handleMemberSubmit(e));
    
    // Custom delete modal events
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
          s.classList.remove('opacity-100');
          s.classList.add('hidden', 'opacity-0', 'pointer-events-none');
        });

        const target = document.getElementById(targetId);
        target.classList.remove('hidden', 'opacity-0', 'pointer-events-none');
        target.classList.add('opacity-100');
      });
    });
  }

  setupModals() {
    const openBtns = document.querySelectorAll('.open-modal');
    const closeBtns = document.querySelectorAll('.close-modal');

    openBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const modalId = btn.getAttribute('data-modal');
        const modal = document.getElementById(modalId);
        modal.classList.remove('hidden');
        setTimeout(() => modal.querySelector('.modal-anim').classList.add('active'), 10);
      });
    });

    closeBtns.forEach(btn => {
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
    setTimeout(() => {
      modal.classList.add('hidden');
    }, 300);
  }

  showToast(msg, type = "success") {
    const container = document.getElementById('toastContainer');
    if (!container) return alert(msg);
    const toast = document.createElement('div');
    toast.className = `px-6 py-4 rounded-xl shadow-2xl font-bold flex items-center transition-all duration-500 transform translate-x-[120%] border ${type === 'success' ? 'bg-emerald-500 text-white border-emerald-400' : 'bg-red-600 text-white border-red-400'
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
    const titleEl = document.getElementById('deleteModalTitle');
    const msgEl = document.getElementById('deleteModalMessage');
    const confirmBtn = document.getElementById('confirmDeleteBtn');

    titleEl.textContent = title;
    msgEl.textContent = message;

    modal.classList.remove('hidden');
    setTimeout(() => modal.querySelector('.modal-anim').classList.add('active'), 10);

    // Replace confirm button with a clone to remove old listeners
    const newConfirmBtn = confirmBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);

    newConfirmBtn.addEventListener('click', async () => {
      newConfirmBtn.disabled = true;
      newConfirmBtn.textContent = 'Deleting...';
      await onConfirm();
      this.closeModal(modal);
      newConfirmBtn.disabled = false;
      newConfirmBtn.textContent = 'Delete';
    });
  }

  async loadAllData() {
    document.getElementById('pageLoading').classList.remove('hidden');
    document.getElementById('tabContent').classList.add('hidden');

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
      this.showToast('Failed to sync master data', 'error');
    } finally {
      document.getElementById('pageLoading').classList.add('hidden');
      document.getElementById('tabContent').classList.remove('hidden');
    }
  }

  refreshDropdowns() {
    const capTeamSelect = document.getElementById('capTeam');
    const memTeamSelect = document.getElementById('memTeam');
    if (capTeamSelect) capTeamSelect.innerHTML = '<option value="">Unassigned</option>';
    if (memTeamSelect) memTeamSelect.innerHTML = '<option value="">Unassigned</option>';

    this.teams.forEach(t => {
      const opt = `<option value="${t.id}">${t.teamName}</option>`;
      if (capTeamSelect) capTeamSelect.insertAdjacentHTML('beforeend', opt);
      if (memTeamSelect) memTeamSelect.insertAdjacentHTML('beforeend', opt);
    });

    const teamCapSelect = document.getElementById('teamCaptain');
    if (teamCapSelect) {
      teamCapSelect.innerHTML = '<option value="">Unassigned</option>';
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

  getTeamName(id) {
    const t = this.teams.find(t => t.id === id);
    return t ? t.teamName : '-';
  }

  getCaptainName(id) {
    const c = this.captains.find(c => c.id === id);
    return c ? c.name : '-';
  }

  // ============== CAPTAINS ==============
  renderCaptains() {
    const tbody = document.getElementById('captainsTbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (this.captains.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" class="py-12 text-center text-slate-500 font-medium">No captains designated yet.</td></tr>`;
      return;
    }

    this.captains.forEach(cap => {
      const badge = cap.status === 'active'
        ? `<span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700">Active</span>`
        : `<span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-500">Inactive</span>`;

      const tr = document.createElement('tr');
      tr.className = "hover:bg-slate-50 transition-colors group";
      tr.innerHTML = `
        <td class="px-8 py-5 text-sm font-extrabold text-slate-800">${cap.name}</td>
        <td class="px-8 py-5 text-sm font-medium text-slate-500">${cap.email}</td>
        <td class="px-8 py-5 text-sm font-medium text-slate-600">${this.getTeamName(cap.teamId)}</td>
        <td class="px-8 py-5">${badge}</td>
        <td class="px-8 py-5 text-right text-sm space-x-3">
          <button class="font-bold text-blue-500 hover:text-blue-700" onclick="window.manageData.editCaptain('${cap.id}')">Edit</button>
          <button class="font-bold text-red-500 hover:text-red-700" onclick="window.manageData.deleteCaptain('${cap.id}', '${cap.name}')">Delete</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  async handleCaptainSubmit(e) {
    e.preventDefault();
    const saveBtn = e.target.querySelector('button[type="submit"]');
    const id = document.getElementById('capId').value;
    const password = document.getElementById('capPassword').value;
    const email = document.getElementById('capEmail').value;
    const name = document.getElementById('capName').value;
    const teamId = document.getElementById('capTeam').value;
    const status = document.getElementById('capStatus').value;

    const originalBtnText = saveBtn.textContent;
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';

    const data = {
      name: name,
      email: email,
      teamId: teamId,
      status: status,
      role: 'captain'
    };

    try {
      if (id) {
        // Update existing captain
        await updateDoc(doc(db, 'captains', id), data);
        await updateDoc(doc(db, 'users', id), { name, email, teamId, status, role: 'captain' });
        this.showToast('Captain updated successfully!');
      } else {
        // New captain - create Auth user then Firestore doc
        if (!password || password.length < 6) {
          throw new Error('Password must be at least 6 characters');
        }

        // Use secondaryAuth to avoid logging out admin
        const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
        const uid = userCredential.user.uid;

        // Use the generated UID as document ID
        await setDoc(doc(db, 'captains', uid), data);
        await setDoc(doc(db, 'users', uid), data);
        
        this.showToast('Captain created successfully! They can now login.');
        
        // Clear secondary auth to prevent state issues
        await secondaryAuth.signOut();
      }
      this.closeModal(document.getElementById('captainModal'));
      await this.loadAllData();
    } catch (err) {
      console.error(err);
      let msg = err.message || 'Error syncing captain data';
      if (err.code === 'auth/email-already-in-use') msg = 'Email already in use';
      if (err.code === 'auth/weak-password') msg = 'Password too weak';
      this.showToast(msg, 'error');
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = originalBtnText;
    }
  }

  editCaptain(id) {
    const cap = this.captains.find(c => c.id === id);
    if(!cap) return;
    
    document.getElementById('capId').value = cap.id;
    document.getElementById('capName').value = cap.name || '';
    document.getElementById('capEmail').value = cap.email || '';
    document.getElementById('capTeam').value = cap.teamId || '';
    document.getElementById('capStatus').value = cap.status || 'active';
    
    const passInput = document.getElementById('capPassword');
    if (passInput) {
      passInput.value = '';
      passInput.placeholder = 'Leave blank to keep current password';
    }
    
    document.getElementById('capModalTitle').textContent = 'Edit Captain';
    const m = document.getElementById('captainModal');
    m.classList.remove('hidden');
    setTimeout(() => m.querySelector('.modal-anim').classList.add('active'), 10);
  }

  deleteCaptain(id, name) {
    this.showDeleteConfirm(
      'Delete Captain',
      `Are you sure you want to delete ${name}? This will remove their authentication and record forever.`,
      async () => {
        try {
          await deleteDoc(doc(db, 'captains', id));
          await deleteDoc(doc(db, 'users', id));
          this.showToast('Captain deleted successfully');
          await this.loadAllData();
        } catch (err) {
          console.error(err);
          this.showToast('Failed to delete captain', 'error');
        }
      }
    );
  }

  // ============== TEAMS ==============
  renderTeams() {
    const tbody = document.getElementById('teamsTbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (this.teams.length === 0) {
      tbody.innerHTML = `<tr><td colspan="3" class="py-12 text-center text-slate-500 font-medium">No teams established.</td></tr>`;
      return;
    }

    this.teams.forEach(t => {
      const tr = document.createElement('tr');
      tr.className = "hover:bg-slate-50 transition-colors group";
      tr.innerHTML = `
        <td class="px-8 py-5 text-sm font-extrabold text-slate-800">${t.teamName}</td>
        <td class="px-8 py-5 text-sm font-medium text-slate-500">${this.getCaptainName(t.captainId)}</td>
        <td class="px-8 py-5 text-right text-sm space-x-3">
          <button class="font-bold text-blue-500 hover:text-blue-700" onclick="window.manageData.editTeam('${t.id}')">Edit</button>
          <button class="font-bold text-red-500 hover:text-red-700" onclick="window.manageData.deleteTeam('${t.id}', '${t.teamName}')">Delete</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  async handleTeamSubmit(e) {
    e.preventDefault();
    const saveBtn = e.target.querySelector('button[type="submit"]');
    const id = document.getElementById('teamId').value;
    const name = document.getElementById('teamNameInput').value;
    const captainId = document.getElementById('teamCaptain').value || null;

    const originalBtnText = saveBtn.textContent;
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';

    const data = {
      teamName: name,
      captainId: captainId
    };

    try {
      if (id) {
        await updateDoc(doc(db, 'teams', id), data);
        this.showToast('Team updated successfully');
      } else {
        await addDoc(collection(db, 'teams'), data);
        this.showToast('Team created successfully');
      }
      this.closeModal(document.getElementById('teamModal'));
      await this.loadAllData();
    } catch (err) {
      console.error(err);
      this.showToast('Failed to save team', 'error');
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = originalBtnText;
    }
  }

  editTeam(id) {
    const t = this.teams.find(t => t.id === id);
    if (!t) return;

    document.getElementById('teamId').value = t.id;
    document.getElementById('teamNameInput').value = t.teamName;
    document.getElementById('teamCaptain').value = t.captainId || '';

    document.getElementById('teamModalTitle').textContent = 'Edit Team';
    const m = document.getElementById('teamModal');
    m.classList.remove('hidden');
    setTimeout(() => m.querySelector('.modal-anim').classList.add('active'), 10);
  }

  deleteTeam(id, name) {
    this.showDeleteConfirm(
      'Delete Team',
      `Are you sure you want to delete ${name}? Associated members will remain but become unassigned.`,
      async () => {
        try {
          await deleteDoc(doc(db, 'teams', id));
          this.showToast('Team deleted successfully');
          await this.loadAllData();
        } catch (err) {
          console.error(err);
          this.showToast('Failed to delete team', 'error');
        }
      }
    );
  }

  // ============== MEMBERS ==============
  renderMembers() {
    const tbody = document.getElementById('membersTbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (this.members.length === 0) {
      tbody.innerHTML = `<tr><td colspan="3" class="py-12 text-center text-slate-500 font-medium">No members added yet.</td></tr>`;
      return;
    }

    this.members.forEach(m => {
      const tr = document.createElement('tr');
      tr.className = "hover:bg-slate-50 transition-colors group";
      tr.innerHTML = `
        <td class="px-8 py-5 text-sm font-extrabold text-slate-800">${m.memberName || m.name}</td>
        <td class="px-8 py-5 text-sm font-medium text-slate-500">${this.getTeamName(m.teamId)}</td>
        <td class="px-8 py-5 text-right text-sm space-x-3">
          <button class="font-bold text-blue-500 hover:text-blue-700" onclick="window.manageData.editMember('${m.id}')">Edit</button>
          <button class="font-bold text-red-500 hover:text-red-700" onclick="window.manageData.deleteMember('${m.id}', '${m.memberName || m.name}')">Delete</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  async handleMemberSubmit(e) {
    e.preventDefault();
    const saveBtn = e.target.querySelector('button[type="submit"]');
    const id = document.getElementById('memId').value;
    const name = document.getElementById('memName').value;
    const teamId = document.getElementById('memTeam').value;
    const team = this.teams.find(t => t.id === teamId);

    const originalBtnText = saveBtn.textContent;
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';

    const data = {
      memberName: name,
      teamId: teamId,
      captainId: team ? team.captainId : null
    };

    try {
      if (id) {
        await updateDoc(doc(db, 'members', id), data);
        this.showToast('Member updated successfully');
      } else {
        await addDoc(collection(db, 'members'), data);
        this.showToast('Member added successfully');
      }
      this.closeModal(document.getElementById('memberModal'));
      await this.loadAllData();
    } catch (err) {
      console.error(err);
      this.showToast('Failed to save member', 'error');
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = originalBtnText;
    }
  }

  editMember(id) {
    const m = this.members.find(m => m.id === id);
    if (!m) return;

    document.getElementById('memId').value = m.id;
    document.getElementById('memName').value = m.memberName || m.name;
    document.getElementById('memTeam').value = m.teamId || '';

    document.getElementById('memberModalTitle').textContent = 'Edit Member';
    const md = document.getElementById('memberModal');
    md.classList.remove('hidden');
    setTimeout(() => md.querySelector('.modal-anim').classList.add('active'), 10);
  }

  deleteMember(id, name) {
    this.showDeleteConfirm(
      'Delete Member',
      `Are you sure you want to remove ${name} from the directory?`,
      async () => {
        try {
          await deleteDoc(doc(db, 'members', id));
          this.showToast('Member deleted successfully');
          await this.loadAllData();
        } catch (err) {
          console.error(err);
          this.showToast('Failed to delete member', 'error');
        }
      }
    );
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.manageData = new ManageData();
});