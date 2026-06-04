/* ==========================================
   K1 Gym Owner Dashboard - App.js
   Author: Antigravity AI
   Aesthetic: Premium, Light Mode, Reactivity, Persistence
   ========================================== */

// --- INITIAL STATE DATA ---
const DEFAULT_PLANS = [
  { id: "p1", name: "Monthly Cardio", price: 1200, duration: 1, features: "Cardio Access, Locker Room, 1 Safe Session" },
  { id: "p2", name: "3-Month Premium", price: 3200, duration: 3, features: "All Gym Access, Trainer Guidance, Free Steam Bath" },
  { id: "p3", name: "Annual VIP Elite", price: 11999, duration: 12, features: "Full 24/7 Access, Personal Trainer, Diet Matrix, Free Towels" }
];

const DEFAULT_MEMBERS = [
  { id: "m1", name: "Rohan Sharma", phone: "+91 9876543210", planId: "p2", dueDate: "2026-04-15", status: "overdue" },
  { id: "m2", name: "Amit Patel", phone: "+91 9123456789", planId: "p1", dueDate: "2026-06-10", status: "paid" },
  { id: "m3", name: "Priya Singh", phone: "+91 8887776665", planId: "p3", dueDate: "2026-07-28", status: "paid" }
];

const DEFAULT_TRANSACTIONS = [
  { id: "t1", memberName: "Amit Patel", planName: "Monthly Cardio", amount: 1416, date: "2026-05-10", mode: "UPI / GPay" },
  { id: "t2", memberName: "Priya Singh", planName: "Annual VIP Elite", amount: 14158, date: "2026-05-28", mode: "Card" },
  { id: "t3", memberName: "Rohan Sharma", planName: "3-Month Premium", amount: 3776, date: "2026-01-15", mode: "Cash" }
];

const DEFAULT_SETTINGS = {
  gymName: "K1 GYM & FITNESS",
  ownerName: "Avnish",
  currency: "₹",
  taxRate: 18
};

// --- GLOBAL APPLICATION STATE ---
let state = {
  members: [],
  plans: [],
  transactions: [],
  settings: {}
};

// --- DOM ELEMENTS REFERENCE ---
const DOM = {
  // Navigation
  navBtns: document.querySelectorAll('.nav-btn, .mobile-nav-btn'),
  views: document.querySelectorAll('.view-section'),
  
  // Gym display
  gymNameDisplay: document.getElementById('gymNameDisplay'),
  
  // KPI Elements
  kpiActive: document.getElementById('kpi-active-members'),
  kpiRevenue: document.getElementById('kpi-revenue'),
  kpiPending: document.getElementById('kpi-pending'),
  kpiMemberTrend: document.getElementById('kpi-member-trend'),
  
  // Member Views
  memberTableBody: document.getElementById('memberTableBody'),
  memberMobileList: document.getElementById('memberMobileList'),
  memberSearch: document.getElementById('memberSearch'),
  filterChips: document.querySelectorAll('.filter-chip'),
  btnOpenAddMember: document.getElementById('btnOpenAddMember'),
  
  // Member Modal
  memberModal: document.getElementById('memberModal'),
  memberForm: document.getElementById('memberForm'),
  memberModalTitle: document.getElementById('memberModalTitle'),
  memberIdHidden: document.getElementById('memberIdHidden'),
  memberName: document.getElementById('memberName'),
  memberPhone: document.getElementById('memberPhone'),
  memberPlan: document.getElementById('memberPlan'),
  memberDueDate: document.getElementById('memberDueDate'),
  memberStatus: document.getElementById('memberStatus'),
  btnCloseMemberModal: document.getElementById('btnCloseMemberModal'),
  btnCancelMemberModal: document.getElementById('btnCancelMemberModal'),
  
  // Renew Modal
  renewModal: document.getElementById('renewModal'),
  renewForm: document.getElementById('renewForm'),
  renewMemberIdHidden: document.getElementById('renewMemberIdHidden'),
  renewMemberName: document.getElementById('renewMemberName'),
  renewMemberPlan: document.getElementById('renewMemberPlan'),
  renewPlanSelect: document.getElementById('renewPlanSelect'),
  renewPaymentMethod: document.getElementById('renewPaymentMethod'),
  renewBasePrice: document.getElementById('renewBasePrice'),
  renewTaxAmount: document.getElementById('renewTaxAmount'),
  renewTotalAmount: document.getElementById('renewTotalAmount'),
  btnCloseRenewModal: document.getElementById('btnCloseRenewModal'),
  btnCancelRenewModal: document.getElementById('btnCancelRenewModal'),
  
  // Plans Views
  plansContainer: document.getElementById('plansContainer'),
  btnOpenAddPlan: document.getElementById('btnOpenAddPlan'),
  
  // Plan Modal
  planModal: document.getElementById('planModal'),
  planForm: document.getElementById('planForm'),
  planModalTitle: document.getElementById('planModalTitle'),
  planIdHidden: document.getElementById('planIdHidden'),
  planName: document.getElementById('planName'),
  planPrice: document.getElementById('planPrice'),
  planDuration: document.getElementById('planDuration'),
  planDescription: document.getElementById('planDescription'),
  btnClosePlanModal: document.getElementById('btnClosePlanModal'),
  btnCancelPlanModal: document.getElementById('btnCancelPlanModal'),
  
  // Settings
  settingsForm: document.getElementById('settingsForm'),
  inputGymName: document.getElementById('inputGymName'),
  inputOwnerName: document.getElementById('inputOwnerName'),
  inputCurrency: document.getElementById('inputCurrency'),
  inputTaxRate: document.getElementById('inputTaxRate'),
  btnResetDatabase: document.getElementById('btnResetDatabase'),
  
  // Timeline
  recentActivityList: document.getElementById('recentActivityList')
};

// --- DATA INITIALIZATION & LOCALSTORAGE ---
function loadState() {
  const savedState = localStorage.getItem('k1gym_state');
  if (savedState) {
    try {
      state = JSON.parse(savedState);
    } catch (e) {
      console.error("Failed to parse local storage state", e);
      restoreFactoryDefaults();
    }
  } else {
    restoreFactoryDefaults();
  }
  
  // Check and update member overdue statuses based on current date relative to due dates
  checkOverdueMembers();
}

function saveState() {
  localStorage.setItem('k1gym_state', JSON.stringify(state));
  renderApp();
}

function restoreFactoryDefaults() {
  state.members = JSON.parse(JSON.stringify(DEFAULT_MEMBERS));
  state.plans = JSON.parse(JSON.stringify(DEFAULT_PLANS));
  state.transactions = JSON.parse(JSON.stringify(DEFAULT_TRANSACTIONS));
  state.settings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
  saveState();
}

// Automatically switch members to "overdue" if their next due date is in the past
function checkOverdueMembers() {
  const today = new Date().toISOString().split('T')[0]; // relative to local timezone
  let modified = false;
  
  state.members.forEach(member => {
    if (member.dueDate < today && member.status !== 'overdue') {
      member.status = 'overdue';
      modified = true;
      // Log auto-detection event
      state.transactions.unshift({
        id: 't_auto_' + Date.now() + Math.random().toString(36).substr(2, 4),
        memberName: member.name,
        planName: "Auto status update",
        amount: 0,
        date: today,
        mode: "System Notification"
      });
    }
  });
  
  if (modified) {
    saveState();
  }
}

// --- APP ROUTING & NAVIGATION ---
function initNavigation() {
  DOM.navBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const viewId = btn.getAttribute('data-view');
      
      // Update sidebar nav state
      DOM.navBtns.forEach(b => b.classList.remove('active'));
      document.querySelectorAll(`[data-view="${viewId}"]`).forEach(b => b.classList.add('active'));
      
      // Toggle view sections
      DOM.views.forEach(view => {
        view.classList.remove('active');
        if (view.id === `view-${viewId}`) {
          view.classList.add('active');
        }
      });
    });
  });
}

// --- CORE RENDER FUNCTION ---
function renderApp() {
  // Update Title Name
  DOM.gymNameDisplay.textContent = state.settings.gymName;
  
  // Render sub modules
  renderKPIs();
  renderActivityLog();
  renderMembers();
  renderPlans();
  populatePlanSelects();
  populateSettingsForm();
}

// --- KPI CALCULATIONS ---
function renderKPIs() {
  // Active (Paid) Members
  const activeCount = state.members.filter(m => m.status === 'paid').length;
  DOM.kpiActive.textContent = activeCount;
  
  // Calculate dynamic membership trend
  const totalCount = state.members.length;
  const activePercent = totalCount > 0 ? Math.round((activeCount / totalCount) * 100) : 0;
  DOM.kpiMemberTrend.textContent = `${activePercent}% Active`;

  // MTD Revenue (Sum of Transactions in the current Month)
  const currencySymbol = state.settings.currency || '₹';
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth(); // 0-indexed

  const mtdRevenue = state.transactions
    .filter(t => {
      if (!t.date || t.amount === 0) return false;
      const transDate = new Date(t.date);
      return transDate.getFullYear() === currentYear && transDate.getMonth() === currentMonth;
    })
    .reduce((sum, t) => sum + t.amount, 0);

  DOM.kpiRevenue.textContent = `${currencySymbol}${formatAmount(mtdRevenue)}`;

  // Pending Collections (Sum of plan prices of Overdue members)
  const pendingCollections = state.members
    .filter(m => m.status === 'overdue')
    .reduce((sum, m) => {
      const plan = state.plans.find(p => p.id === m.planId);
      return sum + (plan ? plan.price : 0);
    }, 0);

  DOM.kpiPending.textContent = `${currencySymbol}${formatAmount(pendingCollections)}`;
}

function formatAmount(amount) {
  if (amount >= 100000) {
    return (amount / 100000).toFixed(1) + 'L';
  } else if (amount >= 1000) {
    return (amount / 1000).toFixed(1) + 'K';
  }
  return amount.toString();
}

// --- RECENT TIMELINE ACTIVITY ---
function renderActivityLog() {
  DOM.recentActivityList.innerHTML = '';
  const currencySymbol = state.settings.currency || '₹';
  
  if (state.transactions.length === 0) {
    DOM.recentActivityList.innerHTML = `<div class="activity-item"><div class="activity-desc text-muted">No recent activities logged.</div></div>`;
    return;
  }

  // Display top 5 transactions or logs
  state.transactions.slice(0, 5).forEach(t => {
    let markerClass = 'primary';
    let activityDesc = '';
    
    if (t.mode === 'System Notification') {
      markerClass = 'danger';
      activityDesc = `<strong>${t.memberName}</strong> membership status updated to overdue.`;
    } else if (t.amount > 0) {
      markerClass = 'success';
      activityDesc = `Collected <strong>${currencySymbol}${t.amount}</strong> from <strong>${t.memberName}</strong> for <em>${t.planName}</em> via ${t.mode}.`;
    } else {
      activityDesc = `Registered <strong>${t.memberName}</strong> on plan <em>${t.planName}</em>.`;
    }

    const item = document.createElement('div');
    item.className = 'activity-item';
    item.innerHTML = `
      <div class="activity-marker ${markerClass}"></div>
      <div class="activity-content">
        <span class="activity-desc">${activityDesc}</span>
        <span class="activity-time">${formatDateString(t.date)}</span>
      </div>
    `;
    DOM.recentActivityList.appendChild(item);
  });
}

function formatDateString(dateStr) {
  if (!dateStr) return '';
  const options = { day: '2-digit', month: 'short', year: 'numeric' };
  return new Date(dateStr).toLocaleDateString('en-IN', options);
}

// --- MEMBERS MANAGEMENT ---
let currentMemberFilter = 'all';

function renderMembers() {
  const tableBody = DOM.memberTableBody;
  const mobileList = DOM.memberMobileList;
  const searchQuery = DOM.memberSearch.value.trim().toLowerCase();
  
  tableBody.innerHTML = '';
  mobileList.innerHTML = '';

  const filteredMembers = state.members.filter(m => {
    // Status Filter
    if (currentMemberFilter === 'paid' && m.status !== 'paid') return false;
    if (currentMemberFilter === 'overdue' && m.status !== 'overdue') return false;
    
    // Search query matches (Name, Phone, or Plan Name)
    const plan = state.plans.find(p => p.id === m.planId);
    const planName = plan ? plan.name.toLowerCase() : '';
    const nameMatch = m.name.toLowerCase().includes(searchQuery);
    const phoneMatch = m.phone.toLowerCase().includes(searchQuery);
    const planMatch = planName.includes(searchQuery);

    return nameMatch || phoneMatch || planMatch;
  });

  if (filteredMembers.length === 0) {
    const emptyRow = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 32px;">No members found.</td></tr>`;
    tableBody.innerHTML = emptyRow;
    mobileList.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 24px;">No members found.</div>`;
    return;
  }

  filteredMembers.forEach(m => {
    const plan = state.plans.find(p => p.id === m.planId);
    const planName = plan ? plan.name : 'Unknown Plan';
    const initials = m.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    
    // Status Badge & actions styling
    const statusBadge = `<span class="badge status-${m.status}">${m.status}</span>`;
    
    // Renew Button is highlighted/colored for overdue members, but secondary/flat for paid members
    const renewBtnStyle = m.status === 'overdue' ? 'btn-primary' : 'btn-secondary';
    
    // Render Desktop Table Row
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>
        <div class="member-info-cell">
          <div class="member-avatar" style="background-color: ${getAvatarColor(m.name)}">${initials}</div>
          <div class="member-meta">
            <span class="member-name">${m.name}</span>
            <span class="member-phone font-mono">${m.phone}</span>
          </div>
        </div>
      </td>
      <td>
        <span style="font-weight: 500;">${planName}</span>
      </td>
      <td>
        <span class="font-mono">${formatDateString(m.dueDate)}</span>
      </td>
      <td>${statusBadge}</td>
      <td class="text-right">
        <div class="actions-cell">
          <button class="btn btn-secondary px-3 py-1.5 text-xs" onclick="openRenewModal('${m.id}')">
            <span class="material-symbols-outlined" style="font-size: 14px; vertical-align: text-bottom; margin-right: 4px;">autorenew</span>
            Renew
          </button>
          <button class="btn-icon" title="Edit member profile" onclick="openEditMemberModal('${m.id}')">
            <span class="material-symbols-outlined">edit</span>
          </button>
          <button class="btn-icon danger" title="Delete member" onclick="deleteMember('${m.id}')">
            <span class="material-symbols-outlined">delete</span>
          </button>
        </div>
      </td>
    `;
    tableBody.appendChild(tr);

    // Render Mobile Card layout
    const card = document.createElement('div');
    card.className = 'mobile-member-card';
    card.innerHTML = `
      <div class="mobile-member-card-header">
        <div class="member-info-cell">
          <div class="member-avatar" style="background-color: ${getAvatarColor(m.name)}">${initials}</div>
          <div class="member-meta">
            <span class="member-name">${m.name}</span>
            <span class="member-phone font-mono">${m.phone}</span>
          </div>
        </div>
        ${statusBadge}
      </div>
      <div class="mobile-member-card-body">
        <div>
          <div class="mobile-meta-title">Plan</div>
          <div class="mobile-meta-value">${planName}</div>
        </div>
        <div>
          <div class="mobile-meta-title">Next Due</div>
          <div class="mobile-meta-value font-mono">${formatDateString(m.dueDate)}</div>
        </div>
      </div>
      <div class="mobile-member-card-actions">
        <button class="btn btn-secondary btn-icon" onclick="openEditMemberModal('${m.id}')">
          <span class="material-symbols-outlined">edit</span>
        </button>
        <button class="btn btn-secondary btn-icon text-danger" onclick="deleteMember('${m.id}')">
          <span class="material-symbols-outlined">delete</span>
        </button>
        <button class="btn btn-primary px-3 py-1.5" onclick="openRenewModal('${m.id}')">
          <span class="material-symbols-outlined" style="font-size: 14px; vertical-align: text-bottom; margin-right: 4px;">autorenew</span>
          Renew
        </button>
      </div>
    `;
    mobileList.appendChild(card);
  });
}

function getAvatarColor(name) {
  const colors = [
    '#dbeafe', '#d1fae5', '#fef3c7', '#fee2e2', '#f3e8ff', '#fae8ff', '#ffedd5', '#e0f2fe'
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % colors.length;
  return colors[index];
}

// Member filter chip clicks
DOM.filterChips.forEach(chip => {
  chip.addEventListener('click', () => {
    DOM.filterChips.forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    currentMemberFilter = chip.getAttribute('data-filter');
    renderMembers();
  });
});

DOM.memberSearch.addEventListener('input', renderMembers);

// --- MEMBERS CREATE / UPDATE ---
DOM.btnOpenAddMember.addEventListener('click', () => {
  DOM.memberForm.reset();
  DOM.memberIdHidden.value = '';
  DOM.memberModalTitle.textContent = "Register New Member";
  
  // Set default date to today
  DOM.memberDueDate.value = new Date().toISOString().split('T')[0];
  
  DOM.memberModal.classList.add('active');
});

function closeMemberModal() {
  DOM.memberModal.classList.remove('active');
}
DOM.btnCloseMemberModal.addEventListener('click', closeMemberModal);
DOM.btnCancelMemberModal.addEventListener('click', closeMemberModal);

DOM.memberForm.addEventListener('submit', (e) => {
  e.preventDefault();
  
  const id = DOM.memberIdHidden.value;
  const name = DOM.memberName.value.trim();
  const phone = DOM.memberPhone.value.trim();
  const planId = DOM.memberPlan.value;
  const dueDate = DOM.memberDueDate.value;
  const status = DOM.memberStatus.value;
  
  const plan = state.plans.find(p => p.id === planId);
  const planName = plan ? plan.name : '';

  if (id) {
    // EDIT EXISTENT MEMBER
    const index = state.members.findIndex(m => m.id === id);
    if (index !== -1) {
      state.members[index] = { ...state.members[index], name, phone, planId, dueDate, status };
    }
  } else {
    // REGISTER NEW MEMBER
    const newId = 'm_' + Date.now();
    state.members.push({ id: newId, name, phone, planId, dueDate, status });
    
    // Log registration transaction if initial status is paid
    if (status === 'paid') {
      const taxRate = state.settings.taxRate || 0;
      const basePrice = plan ? plan.price : 0;
      const taxAmount = Math.round(basePrice * (taxRate / 100));
      const totalAmount = basePrice + taxAmount;
      
      state.transactions.unshift({
        id: 't_' + Date.now(),
        memberName: name,
        planName: planName,
        amount: totalAmount,
        date: new Date().toISOString().split('T')[0],
        mode: "UPI / GPay"
      });
    }
  }
  
  saveState();
  closeMemberModal();
});

window.openEditMemberModal = function(id) {
  const member = state.members.find(m => m.id === id);
  if (!member) return;
  
  DOM.memberIdHidden.value = member.id;
  DOM.memberName.value = member.name;
  DOM.memberPhone.value = member.phone;
  DOM.memberPlan.value = member.planId;
  DOM.memberDueDate.value = member.dueDate;
  DOM.memberStatus.value = member.status;
  
  DOM.memberModalTitle.textContent = "Edit Member Profile";
  DOM.memberModal.classList.add('active');
};

window.deleteMember = function(id) {
  const member = state.members.find(m => m.id === id);
  if (!member) return;
  
  if (confirm(`Are you sure you want to delete member ${member.name}?`)) {
    state.members = state.members.filter(m => m.id !== id);
    
    // Log deletion
    state.transactions.unshift({
      id: 't_del_' + Date.now(),
      memberName: member.name,
      planName: "Member deregistered",
      amount: 0,
      date: new Date().toISOString().split('T')[0],
      mode: "System"
    });
    
    saveState();
  }
};

// --- MEMBERSHIP RENEWALS ---
window.openRenewModal = function(id) {
  const member = state.members.find(m => m.id === id);
  if (!member) return;
  
  DOM.renewMemberIdHidden.value = member.id;
  DOM.renewMemberName.textContent = member.name;
  
  const plan = state.plans.find(p => p.id === member.planId);
  DOM.renewMemberPlan.textContent = plan ? plan.name : 'None';
  
  // Select matching plan in drop list by default
  DOM.renewPlanSelect.value = member.planId;
  
  calculateRenewPrices();
  DOM.renewModal.classList.add('active');
};

function closeRenewModal() {
  DOM.renewModal.classList.remove('active');
}
DOM.btnCloseRenewModal.addEventListener('click', closeRenewModal);
DOM.btnCancelRenewModal.addEventListener('click', closeRenewModal);

DOM.renewPlanSelect.addEventListener('change', calculateRenewPrices);

function calculateRenewPrices() {
  const planId = DOM.renewPlanSelect.value;
  const plan = state.plans.find(p => p.id === planId);
  if (!plan) return;

  const basePrice = plan.price;
  const taxRate = state.settings.taxRate || 0;
  const taxAmount = Math.round(basePrice * (taxRate / 100));
  const totalAmount = basePrice + taxAmount;
  
  const curSymbol = state.settings.currency || '₹';
  
  DOM.renewBasePrice.textContent = `${curSymbol}${basePrice}`;
  DOM.renewTaxAmount.textContent = `${curSymbol}${taxAmount}`;
  DOM.renewTotalAmount.textContent = `${curSymbol}${totalAmount}`;
}

DOM.renewForm.addEventListener('submit', (e) => {
  e.preventDefault();
  
  const id = DOM.renewMemberIdHidden.value;
  const planId = DOM.renewPlanSelect.value;
  const paymentMode = DOM.renewPaymentMethod.value;
  
  const member = state.members.find(m => m.id === id);
  const plan = state.plans.find(p => p.id === planId);
  
  if (!member || !plan) return;

  // Calculate prices
  const basePrice = plan.price;
  const taxRate = state.settings.taxRate || 0;
  const taxAmount = Math.round(basePrice * (taxRate / 100));
  const totalAmount = basePrice + taxAmount;
  
  // Compute new next due date
  // If membership is overdue, extend starting from Today. If it is active, extend starting from current Due Date.
  const todayStr = new Date().toISOString().split('T')[0];
  let startDate = new Date();
  
  if (member.status === 'paid' && member.dueDate >= todayStr) {
    startDate = new Date(member.dueDate);
  }
  
  // Add months to start date
  startDate.setMonth(startDate.getMonth() + plan.duration);
  const newDueDateStr = startDate.toISOString().split('T')[0];
  
  // Update Member record
  member.planId = planId;
  member.dueDate = newDueDateStr;
  member.status = 'paid';
  
  // Register receipt transaction
  state.transactions.unshift({
    id: 't_ren_' + Date.now(),
    memberName: member.name,
    planName: plan.name,
    amount: totalAmount,
    date: todayStr,
    mode: paymentMode
  });
  
  saveState();
  closeRenewModal();
});

// --- PLANS MANAGEMENT PANEL ---
function renderPlans() {
  DOM.plansContainer.innerHTML = '';
  const curSymbol = state.settings.currency || '₹';

  if (state.plans.length === 0) {
    DOM.plansContainer.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 32px;">No plans created. Create a plan to register members.</div>`;
    return;
  }

  state.plans.forEach(p => {
    const isPremium = p.duration >= 12;
    const featuresList = p.features ? p.features.split(',').map(f => `<li><span class="material-symbols-outlined">check_circle</span>${f.trim()}</li>`).join('') : '';
    
    const card = document.createElement('div');
    card.className = `plan-card ${isPremium ? 'premium-plan' : ''}`;
    card.innerHTML = `
      <h4 class="plan-title">${p.name}</h4>
      <div class="plan-pricing">
        <span class="plan-cost">${curSymbol}${p.price}</span>
        <span class="plan-duration">/ ${p.duration} Mo</span>
      </div>
      <ul class="plan-features">
        ${featuresList}
      </ul>
      <div class="plan-actions">
        <button class="btn btn-secondary px-3 py-1.5 text-xs flex-1" onclick="openEditPlanModal('${p.id}')">
          <span class="material-symbols-outlined" style="font-size: 14px; vertical-align: text-bottom; margin-right: 4px;">edit</span>Edit
        </button>
        <button class="btn-icon danger" onclick="deletePlan('${p.id}')">
          <span class="material-symbols-outlined">delete</span>
        </button>
      </div>
    `;
    DOM.plansContainer.appendChild(card);
  });
}

function populatePlanSelects() {
  const memberPlanSelect = DOM.memberPlan;
  const renewPlanSelect = DOM.renewPlanSelect;
  
  memberPlanSelect.innerHTML = '';
  renewPlanSelect.innerHTML = '';
  
  state.plans.forEach(p => {
    const option = `<option value="${p.id}">${p.name} (${state.settings.currency || '₹'}${p.price})</option>`;
    memberPlanSelect.insertAdjacentHTML('beforeend', option);
    renewPlanSelect.insertAdjacentHTML('beforeend', option);
  });
}

DOM.btnOpenAddPlan.addEventListener('click', () => {
  DOM.planForm.reset();
  DOM.planIdHidden.value = '';
  DOM.planModalTitle.textContent = "Create Membership Plan";
  DOM.planModal.classList.add('active');
});

function closePlanModal() {
  DOM.planModal.classList.remove('active');
}
DOM.btnClosePlanModal.addEventListener('click', closePlanModal);
DOM.btnCancelPlanModal.addEventListener('click', closePlanModal);

DOM.planForm.addEventListener('submit', (e) => {
  e.preventDefault();
  
  const id = DOM.planIdHidden.value;
  const name = DOM.planName.value.trim();
  const price = parseInt(DOM.planPrice.value);
  const duration = parseInt(DOM.planDuration.value);
  const features = DOM.planDescription.value.trim();
  
  if (id) {
    // EDIT
    const index = state.plans.findIndex(p => p.id === id);
    if (index !== -1) {
      state.plans[index] = { ...state.plans[index], name, price, duration, features };
    }
  } else {
    // CREATE
    const newId = 'p_' + Date.now();
    state.plans.push({ id: newId, name, price, duration, features });
  }
  
  saveState();
  closePlanModal();
});

window.openEditPlanModal = function(id) {
  const plan = state.plans.find(p => p.id === id);
  if (!plan) return;
  
  DOM.planIdHidden.value = plan.id;
  DOM.planName.value = plan.name;
  DOM.planPrice.value = plan.price;
  DOM.planDuration.value = plan.duration;
  DOM.planDescription.value = plan.features || '';
  
  DOM.planModalTitle.textContent = "Edit Plan Settings";
  DOM.planModal.classList.add('active');
};

window.deletePlan = function(id) {
  // Check if any member is actively using this plan
  const planUsers = state.members.filter(m => m.planId === id);
  if (planUsers.length > 0) {
    alert(`Cannot delete this plan. It is currently assigned to ${planUsers.length} active member(s).`);
    return;
  }
  
  if (confirm("Are you sure you want to delete this membership plan?")) {
    state.plans = state.plans.filter(p => p.id !== id);
    saveState();
  }
};

// --- SYSTEM SETTINGS CONFIG ---
function populateSettingsForm() {
  DOM.inputGymName.value = state.settings.gymName;
  DOM.inputOwnerName.value = state.settings.ownerName;
  DOM.inputCurrency.value = state.settings.currency;
  DOM.inputTaxRate.value = state.settings.taxRate;
}

DOM.settingsForm.addEventListener('submit', (e) => {
  e.preventDefault();
  
  state.settings.gymName = DOM.inputGymName.value.trim();
  state.settings.ownerName = DOM.inputOwnerName.value.trim();
  state.settings.currency = DOM.inputCurrency.value;
  state.settings.taxRate = parseFloat(DOM.inputTaxRate.value);
  
  saveState();
  
  // Success Toast / Alert
  alert("Settings updated successfully!");
});

DOM.btnResetDatabase.addEventListener('click', () => {
  if (confirm("WARNING: This will wipe all changes and restore the pre-populated gym owner console dataset. Continue?")) {
    restoreFactoryDefaults();
  }
});

// --- CORE APP BOOTSTRAP ---
window.addEventListener('DOMContentLoaded', () => {
  loadState();
  initNavigation();
  renderApp();
});
