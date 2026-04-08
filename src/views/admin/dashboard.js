import { getCurrentUser, logoutUser } from '../../auth/auth.js';
import { 
  getOverviewStats, 
  getAllAttendance, 
  getCaptains, 
  getTeams 
} from '../../db/admin-service.js';
import { formatDate, parseDate } from '../../utils/date-helper.js';
import { exportToExcel, exportToPDF, shareViaWhatsApp } from '../../components/ExportButton.js';

let currentUser = null;
let allAttendanceData = [];
let filteredAttendanceData = [];

/**
 * Initialize dashboard
 */
export const initAdminDashboard = async () => {
  try {
    // Check authentication
    currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== 'admin') {
      window.location.href = '/admin.html';
      return;
    }

    // Update header
    document.getElementById('admin-name').textContent = currentUser.name;

    // Load initial data
    await loadOverviewStats();
    await loadAttendanceTable();
    await populateFilters();

    // Set up event listeners
    setupEventListeners();

    console.log('Admin dashboard initialized');
  } catch (error) {
    console.error('Error initializing dashboard:', error);
    showNotification('Error loading dashboard', 'error');
  }
};

/**
 * Load overview statistics cards
 */
const loadOverviewStats = async () => {
  try {
    showLoading('stats-container', true);
    const result = await getOverviewStats();

    if (result.success) {
      const stats = result.data;
      document.getElementById('total-teams').textContent = stats.totalTeams;
      document.getElementById('total-members').textContent = stats.totalMembers;
      document.getElementById('attendance-percentage').textContent = stats.attendancePercentage + '%';
      document.getElementById('total-absent').textContent = stats.totalAbsent;
    }

    showLoading('stats-container', false);
  } catch (error) {
    console.error('Error loading stats:', error);
    showNotification('Error loading statistics', 'error');
    showLoading('stats-container', false);
  }
};

/**
 * Load attendance table with all records
 */
const loadAttendanceTable = async () => {
  try {
    showLoading('table-container', true);
    const result = await getAllAttendance();

    if (result.success) {
      allAttendanceData = result.data;
      filteredAttendanceData = result.data;
      renderAttendanceTable(filteredAttendanceData);
      updateExportButtons();
    } else {
      showNotification('Error loading attendance records', 'error');
    }

    showLoading('table-container', false);
  } catch (error) {
    console.error('Error loading attendance:', error);
    showNotification('Error loading attendance records', 'error');
    showLoading('table-container', false);
  }
};

/**
 * Render attendance table
 */
const renderAttendanceTable = (data) => {
  const tbody = document.getElementById('attendance-tbody');
  if (!tbody) return;

  if (data.length === 0) {
    tbody.innerHTML = `
      <tr class="table-row">
        <td colspan="8" class="table-cell table-empty">
          <div class="empty-state">
            <span class="empty-icon">📭</span>
            <p>No records found</p>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = data.map((record, index) => `
    <tr class="table-row">
      <td class="table-cell table-index">${index + 1}</td>
      <td class="table-cell">${record.memberName}</td>
      <td class="table-cell">${record.teamName}</td>
      <td class="table-cell">${record.captainName}</td>
      <td class="table-cell">
        <span class="status-pill ${record.presentStatus === 'Yes' ? 'status-pill--present' : 'status-pill--absent'}">
          ${record.presentStatus === 'Yes' ? 'Present' : 'Absent'}
        </span>
      </td>
      <td class="table-cell">${record.absenceReason || '-'}</td>
      <td class="table-cell">
        <span class="badge ${record.priorIntimation === 'Yes' ? 'badge--yes' : 'badge--no'}">${record.priorIntimation}</span>
      </td>
      <td class="table-cell">${formatDate(record.meetingDate, 'DD/MM/YYYY')}</td>
    </tr>
  `).join('');
};

/**
 * Populate filter dropdowns
 */
const populateFilters = async () => {
  try {
    // Load captains
    const captainsResult = await getCaptains();
    if (captainsResult.success) {
      const captainSelect = document.getElementById('filter-captain');
      const captains = captainsResult.data;
      
      captainSelect.innerHTML = '<option value="">All Captains</option>' +
        captains.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    }

    // Load teams
    const teamsResult = await getTeams();
    if (teamsResult.success) {
      const teamSelect = document.getElementById('filter-team');
      const teams = teamsResult.data;
      
      teamSelect.innerHTML = '<option value="">All Teams</option>' +
        teams.map(t => `<option value="${t.id}">${t.teamName}</option>`).join('');
    }
  } catch (error) {
    console.error('Error populating filters:', error);
  }
};

/**
 * Apply filters to attendance table
 */
const applyFilters = () => {
  const dateInput = document.getElementById('filter-date').value;
  const captainId = document.getElementById('filter-captain').value;
  const teamId = document.getElementById('filter-team').value;

  filteredAttendanceData = allAttendanceData.filter(record => {
    const recordDate = formatDate(record.meetingDate, 'YYYY-MM-DD');
    
    // Date filter
    if (dateInput && recordDate !== dateInput) {
      return false;
    }

    // Captain filter
    if (captainId && record.captainId !== captainId) {
      return false;
    }

    // Team filter
    if (teamId && record.teamId !== teamId) {
      return false;
    }

    return true;
  });

  renderAttendanceTable(filteredAttendanceData);
  updateExportButtons();
  showNotification(`Found ${filteredAttendanceData.length} records`, 'success');
};

/**
 * Reset filters
 */
const resetFilters = () => {
  document.getElementById('filter-date').value = '';
  document.getElementById('filter-captain').value = '';
  document.getElementById('filter-team').value = '';
  
  filteredAttendanceData = allAttendanceData;
  renderAttendanceTable(filteredAttendanceData);
  updateExportButtons();
  showNotification('Filters reset', 'info');
};

/**
 * Update export buttons state
 */
const updateExportButtons = () => {
  const hasData = filteredAttendanceData.length > 0;
  document.getElementById('btn-export-excel').disabled = !hasData;
  document.getElementById('btn-export-pdf').disabled = !hasData;
  document.getElementById('btn-share-whatsapp').disabled = !hasData;
};

/**
 * Setup event listeners
 */
const setupEventListeners = () => {
  const applyButton = document.getElementById('btn-apply-filters');
  const resetButton = document.getElementById('btn-reset-filters');
  const logoutButton = document.getElementById('btn-logout');
  const excelButton = document.getElementById('btn-export-excel');
  const pdfButton = document.getElementById('btn-export-pdf');
  const whatsappButton = document.getElementById('btn-share-whatsapp');

  if (applyButton) {
    applyButton.addEventListener('click', applyFilters);
  }

  if (resetButton) {
    resetButton.addEventListener('click', resetFilters);
  }

  if (logoutButton) {
    logoutButton.addEventListener('click', handleLogout);
  }

  if (excelButton) {
    excelButton.addEventListener('click', () => {
      if (filteredAttendanceData.length === 0) {
        showNotification('No data to export', 'warning');
        return;
      }
      exportToExcel(filteredAttendanceData, 'attendance_report');
      showNotification('Excel file downloaded', 'success');
    });
  }

  if (pdfButton) {
    pdfButton.addEventListener('click', () => {
      if (filteredAttendanceData.length === 0) {
        showNotification('No data to export', 'warning');
        return;
      }
      exportToPDF(filteredAttendanceData, 'attendance_report', 'BNI Attendance Report');
      showNotification('PDF file downloaded', 'success');
    });
  }

  if (whatsappButton) {
    whatsappButton.addEventListener('click', () => {
      if (filteredAttendanceData.length === 0) {
        showNotification('No data to share', 'warning');
        return;
      }
      shareViaWhatsApp(filteredAttendanceData, 'attendance');
      showNotification('Opening WhatsApp...', 'info');
    });
  }
};

/**
 * Logout handler
 */
const handleLogout = async () => {
  try {
    const result = await logoutUser();
    if (result.success) {
      window.location.href = '/admin.html';
    }
  } catch (error) {
    console.error('Error logging out:', error);
    showNotification('Error logging out', 'error');
  }
};

/**
 * Show loading state
 */
const showLoading = (containerId, loading) => {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = loading
    ? `<div class="loading-state"><div class="spinner"></div></div>`
    : '';
};

/**
 * Show notification
 */
const showNotification = (message, type = 'info') => {
  const notification = document.createElement('div');
  notification.className = `notification notification--${type}`;
  notification.textContent = message;

  document.body.appendChild(notification);

  setTimeout(() => {
    notification.style.animation = 'slide-out 0.3s ease-out';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
};

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAdminDashboard);
} else {
  initAdminDashboard();
}

