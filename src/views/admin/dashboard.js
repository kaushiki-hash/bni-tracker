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
    if (!container) {
      console.log('Toast:', msg);
      return;
    }
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

  checkAuth() {
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const docRef = doc(db, 'users', user.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists() && docSnap.data().role === 'admin') {
            const name = docSnap.data().name || 'Admin';
            const nameEl = document.getElementById('adminName');
            if (nameEl) nameEl.textContent = name;
            await this.loadInitialData();
          } else {
            window.location.href = './login.html';
          }
        } catch (err) {
          console.error('Auth Check Error:', err);
          window.location.href = './login.html';
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
      const [teamsSnap, membersSnap, captainsSnap] = await Promise.all([
        getDocs(collection(db, 'teams')),
        getDocs(collection(db, 'members')),
        getDocs(collection(db, 'captains'))
      ]);

      this.teams = teamsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      this.captains = captainsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      const membersData = membersSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      membersData.forEach(m => this.members[m.id] = m.memberName || m.name);
      this.teams.forEach(t => this.teamMap[t.id] = t.teamName);

      // UI Update
      const statTeams = document.getElementById('statTeams');
      const statMembers = document.getElementById('statMembers');
      if (statTeams) statTeams.textContent = this.teams.length;
      if (statMembers) statMembers.textContent = membersData.length;

      // Populate filters
      const teamFilter = document.getElementById('filterTeam');
      const captainFilter = document.getElementById('filterCaptain');

      if (teamFilter) {
        this.teams.forEach(t => teamFilter.add(new Option(t.teamName, t.id)));
      }
      if (captainFilter) {
        this.captains.forEach(c => captainFilter.add(new Option(c.name, c.id)));
      }

      await this.loadAttendanceData();
    } catch (err) {
      console.error('Initial Data Load Error:', err);
      this.showToast('Failed to load master records', 'error');
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
      console.error('Attendance Load Error:', err);
      this.showToast('Could not sync attendance data', 'error');
    } finally {
      if (tableLoading) tableLoading.classList.add('hidden');
      if (tableContainer) tableContainer.classList.remove('hidden');
    }
  }

  calculateStats() {
    // Stats for recent 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const isoDate7 = sevenDaysAgo.toISOString().split('T')[0];

    const recentRecords = this.attendanceData.filter(r => r.date >= isoDate7);

    let presents = 0;
    let absents = 0;

    recentRecords.forEach(r => {
      const isPresent = r.status === 'Present' || r.status === true;
      if (isPresent) presents++;
      else absents++;
    });

    const total = presents + absents;
    const percentage = total > 0 ? Math.round((presents / total) * 100) : 0;

    const statAtt = document.getElementById('statAttendance');
    const statAbs = document.getElementById('statAbsent');
    if (statAtt) statAtt.textContent = `${percentage}%`;
    if (statAbs) statAbs.textContent = absents;
  }

  applyFilters() {
    const date = document.getElementById('filterDate').value;
    const captainId = document.getElementById('filterCaptain').value;
    const teamId = document.getElementById('filterTeam').value;

    let filtered = this.attendanceData;

    if (date) filtered = filtered.filter(a => a.date === date);
    if (captainId) filtered = filtered.filter(a => a.captainId === captainId);
    if (teamId) filtered = filtered.filter(a => a.teamId === teamId);

    this.renderTable(filtered);
    this.showToast('Filtered results loaded');
  }

  resetFilters() {
    ['filterDate', 'filterCaptain', 'filterTeam'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    this.renderTable(this.attendanceData);
    this.showToast('All filters cleared');
  }

  formatDate(dateStr) {
    if (!dateStr) return '-';
    try {
      const [y, m, d] = dateStr.split('-');
      return `${d}/${m}/${y}`;
    } catch (e) {
      return dateStr;
    }
  }

  renderTable(data) {
    const tbody = document.getElementById('attendanceTbody');
    const theTable = document.getElementById('attendanceTable');
    const emptyState = document.getElementById('emptyState');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (data.length === 0) {
      if (theTable) theTable.classList.add('hidden');
      if (emptyState) {
        emptyState.classList.remove('hidden');
        emptyState.classList.add('flex');
      }
      return;
    }

    if (theTable) theTable.classList.remove('hidden');
    if (emptyState) {
      emptyState.classList.add('hidden');
      emptyState.classList.remove('flex');
    }

    data.forEach((row, i) => {
      const isPresent = row.status === 'Present' || row.status === true;
      const statusBadge = isPresent
        ? `<span class="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase bg-green-100 text-green-700">Present</span>`
        : `<span class="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase bg-red-100 text-red-700">Absent</span>`;

      const hasIntimation = row.priorIntimation === 'Yes' || row.priorIntimation === true;
      const intimationBadge = hasIntimation
        ? `<span class="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase bg-green-100 text-green-700">Yes</span>`
        : (row.priorIntimation === 'No' || row.priorIntimation === false ? `<span class="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase bg-slate-100 text-slate-500">No</span>` : '-');

      const tr = document.createElement('tr');
      tr.className = "hover:bg-blue-50/50 transition-colors group border-b border-slate-100 last:border-0";
      tr.innerHTML = `
        <td class="px-6 py-4 whitespace-nowrap text-xs font-black text-slate-400">00${i + 1}</td>
        <td class="px-6 py-4 whitespace-nowrap text-sm font-extrabold text-slate-800">${row.memberName || this.members[row.memberId] || '-'}</td>
        <td class="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-600">${this.teamMap[row.teamId] || '-'}</td>
        <td class="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-600">${this.captains.find(c => c.id === row.captainId)?.name || '-'}</td>
        <td class="px-6 py-4 whitespace-nowrap">${statusBadge}</td>
        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-500">${row.reason || '-'}</td>
        <td class="px-6 py-4 whitespace-nowrap">${intimationBadge}</td>
        <td class="px-6 py-4 whitespace-nowrap text-sm font-extrabold text-slate-500">${this.formatDate(row.date)}</td>
      `;
      tbody.appendChild(tr);
    });
  }

  getCurrentTableData() {
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
    const data = this.getCurrentTableData();
    if (data.length === 0) return this.showToast('No records to export', 'error');

    const headers = [["SR NO", "MEMBER NAME", "TEAM", "CAPTAIN", "STATUS", "REASON", "INTIMATION", "DATE"]];
    const ws = XLSX.utils.aoa_to_sheet([...headers, ...data]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Attendance Report");
    XLSX.writeFile(wb, `BNI_Attendance_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
    this.showToast('Excel report generated successfully');
  }

  exportPDF() {
    const data = this.getCurrentTableData();
    if (data.length === 0) return this.showToast('No records to export', 'error');

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('l', 'mm', 'a4');
    
    doc.setFontSize(18);
    doc.setTextColor(207, 32, 46); // BNI Redish
    doc.text("BNI CHAPTER ATTENDANCE MASTER REPORT", 14, 20);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 28);

    doc.autoTable({
      head: [["#", "MEMBER NAME", "TEAM", "CAPTAIN", "STATUS", "REASON", "INTIMATION", "DATE"]],
      body: data,
      startY: 35,
      styles: { fontSize: 8, cellPadding: 3, font: 'helvetica' },
      headStyles: { fillColor: [10, 37, 64], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: { 0: { cellWidth: 15 }, 4: { fontStyle: 'bold' } }
    });

    doc.save(`BNI_Attendance_Report_${new Date().getTime()}.pdf`);
    this.showToast('PDF report generated successfully');
  }

  shareWhatsApp() {
    const data = this.getCurrentTableData();
    if (data.length === 0) return this.showToast('Nothing to share', 'error');

    const total = data.length;
    let present = 0;
    data.forEach(row => { if (row[4] === 'PRESENT') present++; });

    const message = `*📊 BNI MC TRACKER: ATTENDANCE SUMMARY*\n\n` +
      `*Total Members:* ${total}\n` +
      `*Present Records:* ${present} ✅\n` +
      `*Absent Records:* ${total - present} ❌\n\n` +
      `_Generated via BNI Admin Dashboard_`;

    const encoded = encodeURIComponent(message);
    window.open(`https://wa.me/?text=${encoded}`, '_blank');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.adminDashboard = new AdminDashboard();
});