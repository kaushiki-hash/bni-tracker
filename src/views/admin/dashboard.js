import { auth, db } from '../../../db/firebase-config.js';
import { onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import { collection, query, getDocs, doc, getDoc, orderBy } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

class AdminDashboard {
  constructor() {
    this.attendanceData = [];
    this.captains = [];
    this.teams = [];
    this.members = {};
    this.teamMap = {};

    this.init();
  }

  async init() {
    this.bindEvents();
    this.checkAuth();
  }

  bindEvents() {
    document.getElementById('btnLogout')?.addEventListener('click', () => this.handleLogout());
    document.getElementById('btnApplyFilters')?.addEventListener('click', () => this.applyFilters());
    document.getElementById('btnResetFilters')?.addEventListener('click', () => this.resetFilters());
    document.getElementById('btnExportExcel')?.addEventListener('click', () => this.exportExcel());
    document.getElementById('btnExportPDF')?.addEventListener('click', () => this.exportPDF());
    document.getElementById('btnShareWA')?.addEventListener('click', () => this.shareWhatsApp());
  }

  showToast(msg, type = "success") {
    const container = document.getElementById('toastContainer');
    if (!container) return alert(msg);
    const toast = document.createElement('div');
    toast.className = `px-6 py-4 rounded-xl shadow-2xl font-bold flex items-center transition-all duration-500 transform translate-x-[120%] border ${type === 'success' ? 'bg-emerald-500 text-white border-emerald-400' : 'bg-red-600 text-white border-red-400'
      }`;
    toast.textContent = msg;
    container.appendChild(toast);

    requestAnimationFrame(() => {
      toast.classList.remove('translate-x-[120%]');
    });

    setTimeout(() => {
      toast.classList.add('translate-x-[120%]');
      setTimeout(() => toast.remove(), 500);
    }, 3500);
  }

  checkAuth() {
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const docRef = doc(db, 'users', user.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists() && docSnap.data().role === 'admin') {
            const name = docSnap.data().name || 'Admin';
            const initials = name.charAt(0).toUpperCase();
            const nameEl = document.getElementById('adminName');
            if (nameEl) nameEl.textContent = name;
            const initialsEl = document.getElementById('userInitials');
            if (initialsEl) initialsEl.textContent = initials;
            await this.loadInitialData();
          } else {
            window.location.href = './login.html';
          }
        } catch (err) {
          console.error(err);
        }
      } else {
        window.location.href = './login.html';
      }
    });
  }

  async handleLogout() {
    try {
      await signOut(auth);
      window.location.href = './login.html';
    } catch (error) {
      console.error('Logout error:', error);
    }
  }

  async loadInitialData() {
    try {
      const teamsSnap = await getDocs(collection(db, 'teams'));
      const membersSnap = await getDocs(collection(db, 'members'));
      const captainsSnap = await getDocs(collection(db, 'captains'));

      this.teams = teamsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      this.captains = captainsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      const membersData = membersSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      membersData.forEach(m => this.members[m.id] = m.memberName || m.name);
      this.teams.forEach(t => this.teamMap[t.id] = t.teamName);

      document.getElementById('statTeams').textContent = this.teams.length;
      document.getElementById('statMembers').textContent = membersData.length;

      const teamFilter = document.getElementById('filterTeam');
      this.teams.forEach(t => {
        teamFilter.add(new Option(t.teamName, t.id));
      });

      const captainFilter = document.getElementById('filterCaptain');
      this.captains.forEach(c => {
        captainFilter.add(new Option(c.name, c.id));
      });

      await this.loadAttendanceData();
    } catch (err) {
      console.error('Error:', err);
      this.showToast('Failed to load framework data', 'error');
    }
  }

  async loadAttendanceData() {
    const tableLoading = document.getElementById('tableLoading');
    const tableContainer = document.getElementById('tableContainer');

    if (tableLoading) tableLoading.classList.remove('hidden');
    if (tableContainer) tableContainer.classList.add('hidden');

    try {
      const attSnap = await getDocs(query(collection(db, 'attendance'), orderBy('date', 'desc')));
      this.attendanceData = attSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      this.calculateStats();
      this.renderTable(this.attendanceData);
    } catch (err) {
      console.error('Error fetching attendance:', err);
      this.showToast('Failed to fetch attendance records', 'error');
    } finally {
      if (tableLoading) tableLoading.classList.add('hidden');
      if (tableContainer) tableContainer.classList.remove('hidden');
    }
  }

  calculateStats() {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const isoDate7 = sevenDaysAgo.toISOString().split('T')[0];

    const recentRecords = this.attendanceData.filter(r => r.date >= isoDate7);

    let presents = 0;
    let absents = 0;

    recentRecords.forEach(r => {
      if (r.status === 'Present' || r.status === true) presents++;
      else absents++;
    });

    const total = presents + absents;
    const percentage = total > 0 ? Math.round((presents / total) * 100) : 0;

    document.getElementById('statAttendance').textContent = `${percentage}%`;
    document.getElementById('statAbsent').textContent = absents;
  }

  applyFilters() {
    const date = document.getElementById('filterDate').value;
    const captain = document.getElementById('filterCaptain').value;
    const team = document.getElementById('filterTeam').value;

    let filtered = this.attendanceData;

    if (date) filtered = filtered.filter(a => a.date === date);
    if (captain) filtered = filtered.filter(a => a.captainId === captain);
    if (team) filtered = filtered.filter(a => a.teamId === team);

    this.renderTable(filtered);
    this.showToast('Filters applied successfully');
  }

  resetFilters() {
    document.getElementById('filterDate').value = '';
    document.getElementById('filterCaptain').value = '';
    document.getElementById('filterTeam').value = '';
    this.renderTable(this.attendanceData);
    this.showToast('Filters cleared');
  }

  formatDate(dateStr) {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB');
  }

  getCaptainName(id) {
    const cap = this.captains.find(c => c.id === id);
    return cap ? cap.name : '-';
  }

  renderTable(data) {
    const tbody = document.getElementById('attendanceTbody');
    const theTable = document.getElementById('attendanceTable');
    const emptyState = document.getElementById('emptyState');
    tbody.innerHTML = '';

    if (data.length === 0) {
      theTable.classList.add('hidden');
      emptyState.classList.remove('hidden');
      emptyState.classList.add('flex');
      return;
    }

    theTable.classList.remove('hidden');
    emptyState.classList.add('hidden');
    emptyState.classList.remove('flex');

    data.forEach((row, i) => {
      const isPresent = row.status === 'Present' || row.status === true;
      const statusBadge = isPresent
        ? `<span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700 shadow-sm">Present</span>`
        : `<span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700 shadow-sm">Absent</span>`;

      const intimationBadge = row.priorIntimation === 'Yes' || row.priorIntimation === true
        ? `<span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700 shadow-sm">Yes</span>`
        : (row.priorIntimation === 'No' || row.priorIntimation === false ? `<span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-500 shadow-sm">No</span>` : '-');

      const tr = document.createElement('tr');
      tr.className = "hover:bg-blue-50/50 transition-colors group";
      tr.innerHTML = `
        <td class="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-400 group-hover:text-blue-500">00${i + 1}</td>
        <td class="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-800">${row.memberName || this.members[row.memberId] || '-'}</td>
        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-600">${this.teamMap[row.teamId] || '-'}</td>
        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-600">${this.getCaptainName(row.captainId)}</td>
        <td class="px-6 py-4 whitespace-nowrap">${statusBadge}</td>
        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-500">${row.reason || '-'}</td>
        <td class="px-6 py-4 whitespace-nowrap">${intimationBadge}</td>
        <td class="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-500">${this.formatDate(row.date)}</td>
      `;
      tbody.appendChild(tr);
    });
  }

  getTableData() {
    const data = [];
    const tbody = document.getElementById('attendanceTbody');
    const rows = tbody.querySelectorAll('tr');
    rows.forEach(tr => {
      const cells = tr.querySelectorAll('td');
      if (cells.length > 1) {
        data.push([
          cells[0].innerText,
          cells[1].innerText,
          cells[2].innerText,
          cells[3].innerText,
          cells[4].innerText,
          cells[5].innerText,
          cells[6].innerText,
          cells[7].innerText
        ]);
      }
    });
    return data;
  }

  exportExcel() {
    const data = this.getTableData();
    if (data.length === 0) return this.showToast('No data to export!', 'error');

    const ws = XLSX.utils.aoa_to_sheet([["ID", "Member Name", "Team", "Captain", "Status", "Reason", "Prior Intimation", "Date"], ...data]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Attendance");
    XLSX.writeFile(wb, "BNI_Overall_Attendance.xlsx");
    this.showToast('Excel document generated');
  }

  exportPDF() {
    const data = this.getTableData();
    if (data.length === 0) return this.showToast('No data to export!', 'error');

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.text("BNI Attendance Master Report", 14, 15);

    doc.autoTable({
      head: [["ID", "Member", "Team", "Captain", "Status", "Reason", "Intimation", "Date"]],
      body: data,
      startY: 20,
      styles: { fontSize: 8, font: 'helvetica' },
      headStyles: { fillColor: [10, 37, 64] }
    });

    doc.save("BNI_Attendance_Report.pdf");
    this.showToast('PDF document generated');
  }

  shareWhatsApp() {
    const data = this.getTableData();
    if (data.length === 0) return this.showToast('No data to share!', 'error');

    const total = data.length;
    let present = 0;
    data.forEach(row => { if (row[4] === 'Present') present++; });

    const message = `*📊 BNI CHAPTER ATTENDANCE SUMMARY*\n\n*Total Records:* ${total}\n*Present:* ${present} ✅\n*Absent:* ${total - present} ❌\n\n_Generated securely via BNI Admin Tracker._`;
    const encoded = encodeURIComponent(message);
    window.open(`https://wa.me/?text=${encoded}`, '_blank');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.adminDashboard = new AdminDashboard();
});