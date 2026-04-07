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
  
  if (data.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="px-6 py-8 text-center text-slate-500 text-sm">
          <div class="flex flex-col items-center justify-center gap-2">
            <span class="text-3xl">📭</span>
            <span>No records found</span>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = data.map((record, index) => `
    <tr class="border-b border-slate-200 hover:bg-slate-50 transition-colors">
      <td class="px-6 py-3 text-sm text-slate-900 font-medium">${index + 1}</td>
      <td class="px-6 py-3 text-sm text-slate-900">${record.memberName}</td>
      <td class="px-6 py-3 text-sm text-slate-600">${record.teamName}</td>
      <td class="px-6 py-3 text-sm text-slate-600">${record.captainName}</td>
      <td class="px-6 py-3 text-sm">
        <span class="px-3 py-1 rounded-full text-xs font-semibold ${
          record.presentStatus === 'Yes' 
            ? 'bg-green-100 text-green-700' 
            : 'bg-red-100 text-red-700'
        }">
          ${record.presentStatus === 'Yes' ? '✅ Present' : '❌ Absent'}
        </span>
      </td>
      <td class="px-6 py-3 text-sm text-slate-600">${record.absenceReason}</td>
      <td class="px-6 py-3 text-sm">
        <span class="px-2 py-1 text-xs font-semibold ${
          record.priorIntimation === 'Yes'
            ? 'bg-blue-100 text-blue-700'
            : 'bg-gray-100 text-gray-700'
        }">
          ${record.priorIntimation}
        </span>
      </td>
      <td class="px-6 py-3 text-sm text-slate-600">${formatDate(record.meetingDate, 'DD/MM/YYYY')}</td>
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
  document.getElementById('btn-apply-filters').addEventListener('click', applyFilters);
  document.getElementById('btn-reset-filters').addEventListener('click', resetFilters);
  document.getElementById('btn-logout').addEventListener('click', handleLogout);

  // Export handlers
  window.exportToExcelHandler = () => {
    if (filteredAttendanceData.length === 0) {
      showNotification('No data to export', 'warning');
      return;
    }
    exportToExcel(filteredAttendanceData, 'attendance_report');
    showNotification('Excel file downloaded', 'success');
  };

  window.exportToPDFHandler = () => {
    if (filteredAttendanceData.length === 0) {
      showNotification('No data to export', 'warning');
      return;
    }
    exportToPDF(filteredAttendanceData, 'attendance_report', 'BNI Attendance Report');
    showNotification('PDF file downloaded', 'success');
  };

  window.shareViaWhatsAppHandler = () => {
    if (filteredAttendanceData.length === 0) {
      showNotification('No data to share', 'warning');
      return;
    }
    shareViaWhatsApp(filteredAttendanceData, 'attendance');
    showNotification('Opening WhatsApp...', 'info');
  };
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

  if (loading) {
    container.innerHTML = `
      <div class="flex items-center justify-center py-8">
        <div class="animate-spin">
          <div class="w-8 h-8 border-4 border-slate-300 border-t-cyan-600 rounded-full"></div>
        </div>
      </div>
    `;
  }
};

/**
 * Show notification
 */
const showNotification = (message, type = 'info') => {
  const notification = document.createElement('div');
  const bgColor = type === 'success' ? 'bg-green-100 border-green-300' : 
                  type === 'error' ? 'bg-red-100 border-red-300' :
                  type === 'warning' ? 'bg-yellow-100 border-yellow-300' :
                  'bg-blue-100 border-blue-300';
  const textColor = type === 'success' ? 'text-green-700' : 
                    type === 'error' ? 'text-red-700' :
                    type === 'warning' ? 'text-yellow-700' :
                    'text-blue-700';

  notification.className = `fixed top-4 right-4 px-4 py-3 rounded-lg border ${bgColor} ${textColor} shadow-lg animate-slide-in z-50`;
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

