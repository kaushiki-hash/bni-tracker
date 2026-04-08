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
  // Tab buttons
  document.querySelectorAll('[data-tab]').forEach(tab => {
    tab.addEventListener('click', () => {
      switchTab(tab.dataset.tab);
    });
  });

  // Add buttons
  document.getElementById('btn-add-captain').addEventListener('click', () => openCaptainModal());
  document.getElementById('btn-add-team').addEventListener('click', () => openTeamModal());
  document.getElementById('btn-add-member').addEventListener('click', () => openMemberModal());

  // Save buttons
  document.getElementById('btn-save-captain').addEventListener('click', saveCaptain);
  document.getElementById('btn-save-team').addEventListener('click', saveTeam);
  document.getElementById('btn-save-member').addEventListener('click', saveMember);

  // Cancel buttons
  document.getElementById('btn-cancel-captain').addEventListener('click', closeCaptainModal);
  document.getElementById('btn-cancel-team').addEventListener('click', closeTeamModal);
  document.getElementById('btn-cancel-member').addEventListener('click', closeMemberModal);

  // Modal close buttons
  document.querySelectorAll('.modal-close').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const modal = e.target.closest('.modal');
      modal.classList.add('hidden');
    });
  });

  // Modal backdrops
  document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
    backdrop.addEventListener('click', (e) => {
      const modal = e.target.closest('.modal');
      modal.classList.add('hidden');
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
    showLoading('captains-tbody', true);
    const result = await getCaptains();

    if (result.success) {
      renderCaptainsList(result.data);
    }

    showLoading('captains-tbody', false);
  } catch (error) {
    console.error('Error loading captains:', error);
    showNotification('Error loading captains', 'error');
    showLoading('captains-tbody', false);
  }
};

const renderCaptainsList = (captains) => {
  const tbody = document.getElementById('captains-tbody');

  if (captains.length === 0) {
    tbody.innerHTML = `
      <tr class="table-row">
        <td colspan="5" class="table-empty">
          <div class="empty-state">
            <p>No captains found</p>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = captains.map(captain => `
    <tr class="table-row">
      <td class="table-cell">${captain.name}</td>
      <td class="table-cell">${captain.email}</td>
      <td class="table-cell">${captain.teamName}</td>
      <td class="table-cell">
        <span class="status-pill ${captain.status === 'active' ? 'status-pill--active' : 'status-pill--inactive'}">${captain.status}</span>
      </td>
      <td class="table-cell">
        <div class="action-buttons">
          <button onclick="window.editCaptain('${captain.id}')" class="button button--small button--primary">Edit</button>
          ${captain.status === 'active' ? `<button onclick="window.deactivateCaptainHandler('${captain.id}')" class="button button--small button--danger">Deactivate</button>` : ''}
        </div>
      </td>
    </tr>
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

const openCaptainModal = async () => {
  // Populate teams dropdown
  const teamsResult = await getTeams();
  const select = document.getElementById('captain-team');
  select.innerHTML = '<option value="">Select Team</option>' +
    teamsResult.data.map(t => `<option value="${t.id}">${t.teamName}</option>`).join('');

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
    showLoading('teams-tbody', true);
    const result = await getTeams();

    if (result.success) {
      renderTeamsList(result.data);
    }

    showLoading('teams-tbody', false);
  } catch (error) {
    console.error('Error loading teams:', error);
    showNotification('Error loading teams', 'error');
    showLoading('teams-tbody', false);
  }
};

const renderTeamsList = (teams) => {
  const tbody = document.getElementById('teams-tbody');

  if (teams.length === 0) {
    tbody.innerHTML = `
      <tr class="table-row">
        <td colspan="3" class="table-empty">
          <div class="empty-state">
            <p>No teams found</p>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = teams.map(team => `
    <tr class="table-row">
      <td class="table-cell">${team.teamName}</td>
      <td class="table-cell">${team.captainName}</td>
      <td class="table-cell">
        <div class="action-buttons">
          <button onclick="window.editTeam('${team.id}')" class="button button--small button--primary">Edit</button>
        </div>
      </td>
    </tr>
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
 * ========================
 * MEMBERS MANAGEMENT
 * ========================
 */

const loadMembers = async () => {
  try {
    showLoading('members-tbody', true);
    const result = await getMembers();

    if (result.success) {
      renderMembersList(result.data);
    }

    showLoading('members-tbody', false);
  } catch (error) {
    console.error('Error loading members:', error);
    showNotification('Error loading members', 'error');
    showLoading('members-tbody', false);
  }
};

const renderMembersList = (members) => {
  const tbody = document.getElementById('members-tbody');

  if (members.length === 0) {
    tbody.innerHTML = `
      <tr class="table-row">
        <td colspan="3" class="table-empty">
          <div class="empty-state">
            <p>No members found</p>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = members.map(member => `
    <tr class="table-row">
      <td class="table-cell">${member.memberName}</td>
      <td class="table-cell">${member.teamName}</td>
      <td class="table-cell">
        <div class="action-buttons">
          <button onclick="window.editMember('${member.id}')" class="button button--small button--primary">Edit</button>
          <button onclick="window.removeMemberHandler('${member.id}')" class="button button--small button--danger">Delete</button>
        </div>
      </td>
    </tr>
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
    const colspan = containerId.includes('captains') ? 5 : containerId.includes('teams') ? 3 : 3;
    container.innerHTML = `
      <tr class="table-row">
        <td colspan="${colspan}" class="loading-state">
          <div class="spinner"></div>
        </td>
      </tr>
    `;
  } else {
    // Don't clear here, as render functions will set the content
  }
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
  document.addEventListener('DOMContentLoaded', initManageData);
} else {
  initManageData();
}

