import { getCurrentUser } from '../../auth/auth.js';
import {
  getCaptains,
  addCaptain,
  updateCaptain,
  deactivateCaptain,
  getTeams,
  addTeam,
  updateTeam,
  getMembers,
  addMember,
  updateMember,
  removeMember
} from '../../db/admin-service.js';
import { validateCaptainData, validateTeamData, validateMemberData } from '../../utils/validator.js';

let currentTab = 'captains';
let currentUser = null;

/**
 * Initialize manage data page
 */
export const initManageData = async () => {
  try {
    currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== 'admin') {
      window.location.href = '/admin.html';
      return;
    }

    setupTabNavigation();
    setupEventListeners();
    await switchTab('captains');

    console.log('Manage data page initialized');
  } catch (error) {
    console.error('Error initializing:', error);
    showNotification('Error loading page', 'error');
  }
};

/**
 * Setup tab navigation
 */
const setupTabNavigation = () => {
  const tabs = document.querySelectorAll('[data-tab]');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      switchTab(tab.dataset.tab);
    });
  });
};

/**
 * Switch between tabs
 */
const switchTab = async (tabName) => {
  currentTab = tabName;

  // Update tab buttons
  document.querySelectorAll('[data-tab]').forEach(tab => {
    if (tab.dataset.tab === tabName) {
      tab.classList.add('active');
    } else {
      tab.classList.remove('active');
    }
  });

  // Show corresponding content
  document.querySelectorAll('[data-content]').forEach(content => {
    if (content.dataset.content === tabName) {
      content.classList.remove('hidden');
    } else {
      content.classList.add('hidden');
    }
  });

  // Load data based on tab
  if (tabName === 'captains') {
    await loadCaptains();
  } else if (tabName === 'teams') {
    await loadTeams();
  } else if (tabName === 'members') {
    await loadMembers();
  }
};

/**
 * ========================
 * CAPTAINS MANAGEMENT
 * ========================
 */

const loadCaptains = async () => {
  try {
    showLoading('captains-list', true);
    const result = await getCaptains();

    if (result.success) {
      renderCaptainsList(result.data);
    }

    showLoading('captains-list', false);
  } catch (error) {
    console.error('Error loading captains:', error);
    showNotification('Error loading captains', 'error');
    showLoading('captains-list', false);
  }
};

const renderCaptainsList = (captains) => {
  const container = document.getElementById('captains-list');

  if (captains.length === 0) {
    container.innerHTML = '<p class="text-slate-500 text-center py-8">No captains found</p>';
    return;
  }

  container.innerHTML = captains.map(captain => `
    <div class="bg-white p-4 rounded-lg border border-slate-200 mb-3">
      <div class="flex justify-between items-start mb-2">
        <div>
          <h3 class="font-bold text-slate-900">${captain.name}</h3>
          <p class="text-sm text-slate-600">${captain.email}</p>
          <p class="text-sm text-slate-600">Team: ${captain.teamName}</p>
        </div>
        <span class="px-2 py-1 text-xs font-semibold rounded ${
          captain.status === 'active'
            ? 'bg-green-100 text-green-700'
            : 'bg-gray-100 text-gray-700'
        }">
          ${captain.status}
        </span>
      </div>
      <div class="flex gap-2 mt-3">
        <button onclick="window.editCaptain('${captain.id}')" class="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700">
          Edit
        </button>
        ${captain.status === 'active' ? `
          <button onclick="window.deactivateCaptainHandler('${captain.id}')" class="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700">
            Deactivate
          </button>
        ` : ''}
      </div>
    </div>
  `).join('');
};

const saveCaptain = async () => {
  const name = document.getElementById('captain-name').value;
  const email = document.getElementById('captain-email').value;
  const teamId = document.getElementById('captain-team').value;

  const errors = validateCaptainData({ name, email, teamId });
  if (errors.length > 0) {
    showNotification(errors[0], 'error');
    return;
  }

  try {
    const captainId = document.getElementById('captain-modal').dataset.captainId;
    
    if (captainId) {
      const result = await updateCaptain(captainId, { name, email, teamId });
      if (result.success) {
        showNotification('Captain updated successfully', 'success');
      }
    } else {
      const result = await addCaptain({ name, email, teamId });
      if (result.success) {
        showNotification('Captain added successfully', 'success');
      }
    }

    closeCaptainModal();
    await loadCaptains();
  } catch (error) {
    console.error('Error saving captain:', error);
    showNotification('Error saving captain', 'error');
  }
};

window.editCaptain = async (captainId) => {
  const result = await getCaptains();
  const captain = result.data?.find(c => c.id === captainId);

  if (captain) {
    document.getElementById('captain-name').value = captain.name;
    document.getElementById('captain-email').value = captain.email;
    document.getElementById('captain-team').value = captain.teamId;
    document.getElementById('captain-modal').dataset.captainId = captainId;
    openCaptainModal();
  }
};

window.deactivateCaptainHandler = async (captainId) => {
  if (confirm('Are you sure you want to deactivate this captain?')) {
    const result = await deactivateCaptain(captainId);
    if (result.success) {
      showNotification('Captain deactivated', 'success');
      await loadCaptains();
    }
  }
};

const openCaptainModal = () => {
  document.getElementById('captain-modal').classList.remove('hidden');
};

const closeCaptainModal = () => {
  document.getElementById('captain-modal').classList.add('hidden');
  document.getElementById('captain-name').value = '';
  document.getElementById('captain-email').value = '';
  document.getElementById('captain-team').value = '';
  delete document.getElementById('captain-modal').dataset.captainId;
};

/**
 * ========================
 * TEAMS MANAGEMENT
 * ========================
 */

const loadTeams = async () => {
  try {
    showLoading('teams-list', true);
    const result = await getTeams();

    if (result.success) {
      renderTeamsList(result.data);
    }

    showLoading('teams-list', false);
  } catch (error) {
    console.error('Error loading teams:', error);
    showNotification('Error loading teams', 'error');
    showLoading('teams-list', false);
  }
};

const renderTeamsList = (teams) => {
  const container = document.getElementById('teams-list');

  if (teams.length === 0) {
    container.innerHTML = '<p class="text-slate-500 text-center py-8">No teams found</p>';
    return;
  }

  container.innerHTML = teams.map(team => `
    <div class="bg-white p-4 rounded-lg border border-slate-200 mb-3">
      <div class="flex justify-between items-start">
        <div>
          <h3 class="font-bold text-slate-900">${team.teamName}</h3>
          <p class="text-sm text-slate-600">Captain: ${team.captainName}</p>
        </div>
        <div class="flex gap-2">
          <button onclick="window.editTeam('${team.id}')" class="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700">
            Edit
          </button>
        </div>
      </div>
    </div>
  `).join('');
};

const saveTeam = async () => {
  const teamName = document.getElementById('team-name').value;
  const captainId = document.getElementById('team-captain').value;

  const errors = validateTeamData({ teamName, captainId });
  if (errors.length > 0) {
    showNotification(errors[0], 'error');
    return;
  }

  try {
    const teamId = document.getElementById('team-modal').dataset.teamId;
    
    if (teamId) {
      const result = await updateTeam(teamId, { teamName, captainId });
      if (result.success) {
        showNotification('Team updated successfully', 'success');
      }
    } else {
      const result = await addTeam({ teamName, captainId });
      if (result.success) {
        showNotification('Team added successfully', 'success');
      }
    }

    closeTeamModal();
    await loadTeams();
  } catch (error) {
    console.error('Error saving team:', error);
    showNotification('Error saving team', 'error');
  }
};

window.editTeam = async (teamId) => {
  const result = await getTeams();
  const team = result.data?.find(t => t.id === teamId);

  if (team) {
    document.getElementById('team-name').value = team.teamName;
    document.getElementById('team-captain').value = team.captainId;
    document.getElementById('team-modal').dataset.teamId = teamId;
    openTeamModal();
  }
};

const openTeamModal = async () => {
  // Populate captains dropdown
  const captainsResult = await getCaptains();
  const select = document.getElementById('team-captain');
  select.innerHTML = '<option value="">Select Captain</option>' +
    captainsResult.data.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
  
  document.getElementById('team-modal').classList.remove('hidden');
};

const closeTeamModal = () => {
  document.getElementById('team-modal').classList.add('hidden');
  document.getElementById('team-name').value = '';
  document.getElementById('team-captain').value = '';
  delete document.getElementById('team-modal').dataset.teamId;
};

/**
 * ========================
 * MEMBERS MANAGEMENT
 * ========================
 */

const loadMembers = async () => {
  try {
    showLoading('members-list', true);
    const result = await getMembers();

    if (result.success) {
      renderMembersList(result.data);
    }

    showLoading('members-list', false);
  } catch (error) {
    console.error('Error loading members:', error);
    showNotification('Error loading members', 'error');
    showLoading('members-list', false);
  }
};

const renderMembersList = (members) => {
  const container = document.getElementById('members-list');

  if (members.length === 0) {
    container.innerHTML = '<p class="text-slate-500 text-center py-8">No members found</p>';
    return;
  }

  container.innerHTML = members.map(member => `
    <div class="bg-white p-4 rounded-lg border border-slate-200 mb-3">
      <div class="flex justify-between items-start">
        <div>
          <h3 class="font-bold text-slate-900">${member.memberName}</h3>
          <p class="text-sm text-slate-600">Team: ${member.teamName}</p>
          <span class="inline-block text-xs font-semibold px-2 py-1 mt-1 rounded ${
            member.status === 'active'
              ? 'bg-green-100 text-green-700'
              : 'bg-gray-100 text-gray-700'
          }">
            ${member.status}
          </span>
        </div>
        <div class="flex gap-2">
          <button onclick="window.editMember('${member.id}')" class="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700">
            Edit
          </button>
          <button onclick="window.removeMemberHandler('${member.id}')" class="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700">
            Remove
          </button>
        </div>
      </div>
    </div>
  `).join('');
};

const saveMember = async () => {
  const memberName = document.getElementById('member-name').value;
  const teamId = document.getElementById('member-team').value;
  const status = document.getElementById('member-status').value;

  const errors = validateMemberData({ memberName, teamId });
  if (errors.length > 0) {
    showNotification(errors[0], 'error');
    return;
  }

  try {
    const memberId = document.getElementById('member-modal').dataset.memberId;
    const teamResult = await getTeams();
    const team = teamResult.data?.find(t => t.id === teamId);
    const captainId = team?.captainId || '';
    
    if (memberId) {
      const result = await updateMember(memberId, { memberName, teamId, captainId, status });
      if (result.success) {
        showNotification('Member updated successfully', 'success');
      }
    } else {
      const result = await addMember({ memberName, teamId, captainId });
      if (result.success) {
        showNotification('Member added successfully', 'success');
      }
    }

    closeMemberModal();
    await loadMembers();
  } catch (error) {
    console.error('Error saving member:', error);
    showNotification('Error saving member', 'error');
  }
};

window.editMember = async (memberId) => {
  const result = await getMembers();
  const member = result.data?.find(m => m.id === memberId);

  if (member) {
    document.getElementById('member-name').value = member.memberName;
    document.getElementById('member-team').value = member.teamId;
    document.getElementById('member-status').value = member.status;
    document.getElementById('member-modal').dataset.memberId = memberId;
    openMemberModal();
  }
};

window.removeMemberHandler = async (memberId) => {
  if (confirm('Are you sure you want to remove this member?')) {
    const result = await removeMember(memberId);
    if (result.success) {
      showNotification('Member removed', 'success');
      await loadMembers();
    }
  }
};

const openMemberModal = async () => {
  // Populate teams dropdown
  const teamsResult = await getTeams();
  const select = document.getElementById('member-team');
  select.innerHTML = '<option value="">Select Team</option>' +
    teamsResult.data.map(t => `<option value="${t.id}">${t.teamName}</option>`).join('');
  
  document.getElementById('member-modal').classList.remove('hidden');
};

const closeMemberModal = () => {
  document.getElementById('member-modal').classList.add('hidden');
  document.getElementById('member-name').value = '';
  document.getElementById('member-team').value = '';
  document.getElementById('member-status').value = 'active';
  delete document.getElementById('member-modal').dataset.memberId;
};

/**
 * Setup event listeners
 */
const setupEventListeners = () => {
  // Captain buttons
  document.getElementById('btn-add-captain').addEventListener('click', () => {
    document.getElementById('captain-modal').dataset.captainId = '';
    openCaptainModal();
  });
  document.getElementById('btn-save-captain').addEventListener('click', saveCaptain);
  document.getElementById('btn-cancel-captain').addEventListener('click', closeCaptainModal);

  // Team buttons
  document.getElementById('btn-add-team').addEventListener('click', () => {
    document.getElementById('team-modal').dataset.teamId = '';
    openTeamModal();
  });
  document.getElementById('btn-save-team').addEventListener('click', saveTeam);
  document.getElementById('btn-cancel-team').addEventListener('click', closeTeamModal);

  // Member buttons
  document.getElementById('btn-add-member').addEventListener('click', () => {
    document.getElementById('member-modal').dataset.memberId = '';
    openMemberModal();
  });
  document.getElementById('btn-save-member').addEventListener('click', saveMember);
  document.getElementById('btn-cancel-member').addEventListener('click', closeMemberModal);
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
  document.addEventListener('DOMContentLoaded', initManageData);
} else {
  initManageData();
}

