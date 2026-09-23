// PG & Hostel Management SaaS - Core Application Controller

let currentView = 'dashboard';
let currentCharts = [];

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', async () => {
    initNavigation();
    initTopBarControls();
    
    // Listen for state updates
    window.addEventListener('stateChanged', () => {
        updateGlobalPropertyDropdown();
        updateNotificationBadge();
        renderActiveView();
    });

    // Initial load
    await window.db.loadState('all');
    updateGlobalPropertyDropdown();
    updateNotificationBadge();
    renderActiveView();
});

// --- Toast Notification Helper ---
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const iconName = type === 'success' ? 'check-circle' : (type === 'error' ? 'alert-circle' : 'info');
    toast.innerHTML = `<i data-lucide="${iconName}"></i> <span>${message}</span>`;
    container.appendChild(toast);
    lucide.createIcons();
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(10px)';
        toast.style.transition = 'all 0.2s ease';
        setTimeout(() => toast.remove(), 200);
    }, 3200);
}

// --- Navigation Controller ---
function initNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            navItems.forEach(n => n.classList.remove('active'));
            item.classList.add('active');
            currentView = item.dataset.view;
            renderActiveView();
        });
    });
}

function navigateTo(viewName) {
    const navItem = document.querySelector(`.nav-item[data-view="${viewName}"]`);
    if (navItem) {
        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
        navItem.classList.add('active');
    }
    currentView = viewName;
    renderActiveView();
}

// --- Topbar Controls ---
function initTopBarControls() {
    const dateDisplay = document.getElementById('current-date-display');
    if (dateDisplay) {
        const options = { weekday: 'long', day: 'numeric', month: 'long' };
        dateDisplay.textContent = new Date().toLocaleDateString('en-US', options);
    }

    // Global Property Selector
    const propSelect = document.getElementById('global-property-selector');
    if (propSelect) {
        propSelect.addEventListener('change', async (e) => {
            const selectedId = e.target.value;
            const propertyName = selectedId === 'all' ? 'All Properties (Consolidated)' : e.target.options[e.target.selectedIndex].text.replace('🏢 ', '').trim();
            
            // Highlight dropdown
            propSelect.classList.add('property-switch-highlight');
            setTimeout(() => propSelect.classList.remove('property-switch-highlight'), 500);
            
            const mainContent = document.getElementById('view-container');
            const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
            
            if (!reduceMotion && mainContent) {
                mainContent.classList.add('dashboard-fade-out');
                await new Promise(r => setTimeout(r, 50));
            }
            
            await window.db.loadState(selectedId);
            
            showToast(selectedId === 'all' ? 'Switched to All Properties' : `Switched to ${propertyName}`, 'info');
            
            renderActiveView();
            
            if (!reduceMotion && mainContent) {
                mainContent.classList.remove('dashboard-fade-out');
                mainContent.classList.add('dashboard-fade-in');
                setTimeout(() => mainContent.classList.remove('dashboard-fade-in'), 50);
            }
        });
    }

    // Quick Action Dropdown
    const quickBtn = document.getElementById('btn-quick-action');
    const quickMenu = document.getElementById('quick-action-menu');
    if (quickBtn && quickMenu) {
        quickBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            quickMenu.classList.toggle('show');
        });
        document.addEventListener('click', () => quickMenu.classList.remove('show'));

        quickMenu.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                quickMenu.classList.remove('show');
                handleQuickAction(link.dataset.action);
            });
        });
    }

    // Notification Dropdown
    const notifBtn = document.getElementById('btn-notifications');
    const notifDropdown = document.getElementById('notification-dropdown');
    if (notifBtn && notifDropdown) {
        notifBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            notifDropdown.classList.toggle('show');
        });
        document.addEventListener('click', () => notifDropdown.classList.remove('show'));
    }

    // Settings Button & User Profile Click
    const settingsBtn = document.getElementById('btn-topbar-settings');
    const userProfile = document.getElementById('user-profile-trigger');
    if (settingsBtn) settingsBtn.addEventListener('click', () => openSettingsModal());
    if (userProfile) userProfile.addEventListener('click', () => openSettingsModal());
}

function handleQuickAction(action) {
    switch (action) {
        case 'new-lead': openLeadModal(); break;
        case 'new-resident': openOnboardResidentModal(); break;
        case 'record-payment': openRecordPaymentModal(); break;
        case 'new-complaint': openComplaintModal(); break;
        case 'add-expense': openExpenseModal(); break;
        case 'post-notice': openNoticeModal(); break;
    }
}

function updateGlobalPropertyDropdown() {
    const propSelect = document.getElementById('global-property-selector');
    if (!propSelect) return;
    const properties = window.db.get('properties');
    const currentVal = window.db.selectedPropertyId || 'all';

    let html = `<option value="all" ${currentVal === 'all' ? 'selected' : ''}>🏢 All Properties (Consolidated)</option>`;
    properties.forEach(p => {
        html += `<option value="${p.id}" ${currentVal === p.id ? 'selected' : ''}>📍 ${p.name}</option>`;
    });
    propSelect.innerHTML = html;
}

function updateNotificationBadge() {
    const notifs = window.db.get('notifications');
    const badgeDot = document.getElementById('notif-badge-dot');
    const badgeText = document.getElementById('notif-count-badge');
    const list = document.getElementById('notif-list');

    if (badgeDot) badgeDot.style.display = notifs.length > 0 ? 'block' : 'none';
    if (badgeText) badgeText.textContent = `${notifs.length} Alerts`;

    if (list) {
        if (notifs.length === 0) {
            list.innerHTML = `<div style="padding:24px; text-align:center; color:var(--text-muted);">No urgent notifications</div>`;
            return;
        }
        list.innerHTML = notifs.map(n => `
            <div class="notif-item" onclick="handleNotificationClick('${n.link || 'dashboard'}')">
                <div class="notif-icon ${n.type}"><i data-lucide="${n.icon || 'bell'}"></i></div>
                <div class="notif-content">
                    <div class="notif-title">${n.title}</div>
                    <div class="notif-desc">${n.desc}</div>
                    <div class="notif-time">${n.time}</div>
                </div>
            </div>
        `).join('');
        lucide.createIcons();
    }
}

function handleNotificationClick(linkView) {
    const notifDropdown = document.getElementById('notification-dropdown');
    if (notifDropdown) notifDropdown.classList.remove('show');
    if (linkView === 'collections') navigateTo('payments');
    else navigateTo(linkView);
}

// --- Dynamic View Router ---
function renderActiveView() {
    const container = document.getElementById('view-container');
    const pageTitle = document.getElementById('page-title');
    if (!container) return;

    // Destroy existing Chart.js instances
    currentCharts.forEach(c => c.destroy());
    currentCharts = [];

    const selectedProp = window.db.get('properties').find(p => p.id === window.db.selectedPropertyId);
    const propSuffix = selectedProp ? ` • ${selectedProp.name}` : ' • All Properties';

    pageTitle.textContent = selectedProp ? selectedProp.name : 'All Properties';

    switch (currentView) {
        case 'dashboard':
            renderDashboardView(container);
            break;
        case 'properties':
            renderPropertiesView(container);
            break;
        case 'residents':
            renderResidentsView(container);
            break;
        case 'payments':
            renderPaymentsView(container);
            break;
        case 'complaints':
            renderComplaintsView(container);
            break;
        case 'expenses':
            renderExpensesView(container);
            break;
        case 'leads':
            renderLeadsView(container);
            break;
        case 'reports':
            renderReportsView(container);
            break;
        case 'settings':
            renderSettingsView(container);
            break;
        default:
            renderDashboardView(container);
            renderDashboardView(container);
    }
    lucide.createIcons();
}

// =========================================================================
// 1. DASHBOARD VIEW (Business Summary & Actionable Alerts)
// =========================================================================
function renderDashboardView(container) {
    const analytics = window.db.state.analytics || {};
    
    container.innerHTML = `

        <div style="margin-top: 32px;">
            <h3 style="margin-bottom: 16px; color: var(--text-main);">Property Overview</h3>
            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px;">
                ${window.db.get('properties')
                    .filter(p => !window.db.selectedPropertyId || window.db.selectedPropertyId === 'all' || p.id === window.db.selectedPropertyId)
                    .map(prop => {
                    const allRooms = window.db.get('rooms') || [];
                    const propRooms = allRooms.filter(r => r.propertyId === prop.id);
                    
                    const numRooms = propRooms.length;
                    const floorsSet = new Set();
                    let numBeds = 0;
                    let occupiedBedsCount = 0;
                    let occupiedRoomsCount = 0;
                    
                    propRooms.forEach(r => {
                        if (r.floor) floorsSet.add(r.floor);
                        if (r.beds) {
                            numBeds += r.beds.length;
                            const occupiedInRoom = r.beds.filter(b => b.status === 'Occupied').length;
                            occupiedBedsCount += occupiedInRoom;
                            if (occupiedInRoom > 0) occupiedRoomsCount++;
                        }
                    });
                    
                    const numFloors = floorsSet.size;
                    const occupancyPercentage = numBeds > 0 ? Math.round((occupiedBedsCount / numBeds) * 100) : 0;
                    
                    const vacantBedsCount = numBeds - occupiedBedsCount;
                    
                    return `
                    <div class="card" style="padding: 24px; border-radius: 12px; background-color: #ffffff; cursor: pointer; transition: transform 0.2s, box-shadow 0.2s; box-shadow: 0 1px 3px rgba(0,0,0,0.1);" 
                         onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 6px rgba(0,0,0,0.1)';" 
                         onmouseout="this.style.transform='none'; this.style.boxShadow='0 1px 3px rgba(0,0,0,0.1)';"
                         onclick="document.getElementById('global-property-selector').value = '${prop.id}'; document.getElementById('global-property-selector').dispatchEvent(new Event('change'));">
                        
                        <div style="display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 24px;">
                            <div style="display: flex; align-items: center; gap: 16px;">
                                <div style="font-size: 32px; line-height: 1;">&#x1F3E2;</div>
                                <div>
                                    <h4 style="margin: 0 0 4px 0; font-size: 18px; font-weight: 700; color: #0f172a;">${prop.name}</h4>
                                    <span style="font-size: 13px; color: #64748b;">${prop.address}</span>
                                </div>
                            </div>
                            <button class="btn btn-outline btn-sm" onclick="event.stopPropagation(); window.openEditPropertyModal('${prop.id}')" style="padding: 6px 10px; font-size: 12px; display: flex; align-items: center; gap: 4px; color: #475569; border: 1px solid #e2e8f0; border-radius: 6px; background-color: #f8fafc; cursor: pointer; transition: all 0.2s;" onmouseover="this.style.backgroundColor='#e2e8f0'; this.style.color='#0f172a';" onmouseout="this.style.backgroundColor='#f8fafc'; this.style.color='#475569';">
                                <i data-lucide="edit-3" style="width: 14px; height: 14px;"></i> Edit
                            </button>
                        </div>
                        
                        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 24px 16px; padding-top: 24px; border-top: 1px solid #e2e8f0;">
                            
                            <!-- Floors -->
                            <div style="display: flex; flex-direction: column;">
                                <span style="font-size: 11px; font-weight: 600; color: #64748b; text-transform: uppercase; margin-bottom: 4px;">Floors</span>
                                <strong style="font-size: 24px; color: #0f172a;">${numFloors}</strong>
                            </div>
                            
                            <!-- Rooms -->
                            <div style="display: flex; flex-direction: column;">
                                <span style="font-size: 11px; font-weight: 600; color: #64748b; text-transform: uppercase; margin-bottom: 4px;">Rooms</span>
                                <strong style="font-size: 24px; color: #0f172a;">${propRooms.length}</strong>
                            </div>
                            
                            <!-- Total Beds -->
                            <div style="display: flex; flex-direction: column;">
                                <span style="font-size: 11px; font-weight: 600; color: #64748b; text-transform: uppercase; margin-bottom: 4px;">Total Beds</span>
                                <strong style="font-size: 24px; color: #0f172a;">${numBeds}</strong>
                            </div>
                            
                            <!-- Occupied Rooms -->
                            <div style="display: flex; flex-direction: column;">
                                <span style="font-size: 11px; font-weight: 600; color: #64748b; text-transform: uppercase; margin-bottom: 4px;">Occupied Rooms</span>
                                <strong style="font-size: 24px; color: #10b981;">${occupiedRoomsCount}</strong>
                            </div>
                            
                            <!-- Occupied Beds -->
                            <div style="display: flex; flex-direction: column;">
                                <span style="font-size: 11px; font-weight: 600; color: #64748b; text-transform: uppercase; margin-bottom: 4px;">Occupied Beds</span>
                                <strong style="font-size: 24px; color: #10b981;">${occupiedBedsCount}</strong>
                            </div>

                            <!-- Vacant Beds -->
                            <div style="display: flex; flex-direction: column;">
                                <span style="font-size: 11px; font-weight: 600; color: #64748b; text-transform: uppercase; margin-bottom: 4px;">Vacant Beds</span>
                                <strong style="font-size: 24px; color: #ef4444;">${vacantBedsCount}</strong>
                            </div>
                            
                            <!-- Occupancy Rate -->
                            <div style="display: flex; flex-direction: column; grid-column: 1 / -1;">
                                <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 8px;">
                                    <span style="font-size: 11px; font-weight: 600; color: #64748b; text-transform: uppercase;">Occupancy Rate</span>
                                    <strong style="font-size: 24px; color: var(--primary); line-height: 1;">${occupancyPercentage}%</strong>
                                </div>
                                <div style="width: 100%; height: 16px; background-color: #e2e8f0; border-radius: 8px; overflow: hidden; box-shadow: inset 0 1px 2px rgba(0,0,0,0.05);">
                                    <div style="height: 100%; width: ${occupancyPercentage}%; background-color: var(--primary); border-radius: 8px; transition: width 0.5s ease;"></div>
                                </div>
                            </div>
                            
                        </div>
                    </div>
                `;}).join('')}
            </div>
            
            ${(() => {
                const currentMonthStr = new Date().toISOString().slice(0, 7);
                const allPayments = window.db.get('payments') || [];
                const pendingPayments = allPayments.filter(p => 
                    p.month === currentMonthStr && 
                    (p.status === 'Pending' || p.status === 'Overdue' || p.status === 'Partial') &&
                    (!window.db.selectedPropertyId || window.db.selectedPropertyId === 'all' || p.propertyId === window.db.selectedPropertyId)
                );
                
                if (pendingPayments.length === 0) return '';
                
                const fullyPendingCount = pendingPayments.filter(p => p.status === 'Pending' || p.status === 'Overdue').length;
                const partialPendingCount = pendingPayments.filter(p => p.status === 'Partial').length;
                
                const totalPending = pendingPayments.reduce((sum, p) => sum + (p.amountExpected - (p.amountPaid || 0)), 0);
                
                const allResidents = window.db.get('residents') || [];
                const allProperties = window.db.get('properties') || [];
                const residentsListHTML = pendingPayments.map(p => {
                    const resident = allResidents.find(r => r.id === p.residentId);
                    if (!resident) return '';
                    const property = allProperties.find(pr => pr.id === resident.propertyId);
                    const propName = property ? property.name : 'Unknown Property';
                    const owed = p.amountExpected - (p.amountPaid || 0);
                    const dueDateFormatted = p.dueDate ? new Date(p.dueDate).toLocaleDateString('en-IN', {day:'numeric', month:'short'}) : 'N/A';
                    
                    return `
                        <div style="display: flex; align-items: center; padding: 12px 16px; background: rgba(255,255,255,0.7); border-radius: 8px; margin-bottom: 8px;">
                            <div style="width: 36px; height: 36px; border-radius: 50%; background-color: #f1f5f9; color: #475569; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 600; flex-shrink: 0; margin-right: 16px;">
                                ${resident.name.charAt(0)}
                            </div>
                            <div style="flex: 1; display: grid; grid-template-columns: 280px 100px 120px 120px 120px 1fr; gap: 24px; align-items: center;">
                                <div style="min-width: 0;">
                                    <div style="font-size: 14px; font-weight: 600; color: #0f172a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${resident.name}</div>
                                    <div style="font-size: 12px; color: #64748b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${propName} • Room ${resident.roomId.split('_').pop()}</div>
                                </div>
                                <div style="font-size: 13px; color: #475569; font-weight: 500;">
                                    ${dueDateFormatted}
                                </div>
                                <div style="font-size: 13px; color: #475569; font-weight: 500;">
                                    ₹${(resident.monthlyRent || p.amountExpected).toLocaleString('en-IN')}
                                </div>
                                <div style="font-size: 14px; font-weight: 700; color: #e11d48;">
                                    ₹${owed.toLocaleString('en-IN')}
                                </div>
                                <div style="font-size: 14px; color: #475569; font-weight: 600;">
                                    ${resident.phone || 'N/A'}
                                </div>
                                <div style="display: flex; justify-content: flex-end;">
                                    <button onclick="alert('Reminder sent to ${resident.name}'); return false;" style="background-color: #eff6ff; color: #2563eb; border: 1px solid #93c5fd; border-radius: 6px; padding: 6px 12px; font-size: 12px; font-weight: 600; cursor: pointer; transition: all 0.2s;">
                                        Remind
                                    </button>
                                </div>
                            </div>
                        </div>
                    `;
                }).join('');

                return `
                    <!-- Rent Due Notification Bar -->
                    <div style="margin-top: 32px; background: linear-gradient(135deg, #fff1f2 0%, #fef2f2 100%); border-left: 4px solid #f43f5e; border-radius: 12px; padding: 20px 24px; box-shadow: 0 4px 12px rgba(244, 63, 94, 0.05); border: 1px solid #ffe4e6; border-left-width: 4px;">
                        <div style="display: flex; align-items: center; padding-bottom: 20px; border-bottom: 1px solid rgba(244, 63, 94, 0.15); margin-bottom: ${pendingPayments.length > 0 ? '20px' : '0'};">
                            <div style="display: flex; align-items: center; gap: 24px;">
                                <div style="display: flex; align-items: center; gap: 16px;">
                                    <div style="width: 44px; height: 44px; background-color: #f43f5e; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(244, 63, 94, 0.25);">
                                        <i data-lucide="bell-ring" style="width: 22px; height: 22px;"></i>
                                    </div>
                                    <h4 style="margin: 0; font-size: 16px; font-weight: 700; color: #9f1239;">Rent Collection Reminder</h4>
                                </div>
                                
                                <div style="display: flex; gap: 12px;">
                                    <div style="background-color: rgba(255,255,255,0.7); border: 1px solid rgba(244, 63, 94, 0.2); border-radius: 8px; padding: 8px 16px; display: flex; flex-direction: column; align-items: center; min-width: 90px; box-shadow: 0 2px 4px rgba(244, 63, 94, 0.05);">
                                        <span style="font-size: 20px; font-weight: 800; color: #e11d48; line-height: 1;">${fullyPendingCount}</span>
                                        <span style="font-size: 11px; font-weight: 700; color: #9f1239; text-transform: uppercase; margin-top: 4px;">Unpaid</span>
                                    </div>
                                    <div style="background-color: rgba(255,255,255,0.7); border: 1px solid rgba(245, 158, 11, 0.3); border-radius: 8px; padding: 8px 16px; display: flex; flex-direction: column; align-items: center; min-width: 90px; box-shadow: 0 2px 4px rgba(245, 158, 11, 0.05);">
                                        <span style="font-size: 20px; font-weight: 800; color: #d97706; line-height: 1;">${partialPendingCount}</span>
                                        <span style="font-size: 11px; font-weight: 700; color: #b45309; text-transform: uppercase; margin-top: 4px;">Partial</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        ${pendingPayments.length > 0 ? `
                        <div style="max-height: 600px; overflow-y: auto; padding-right: 8px; margin-right: -8px;" class="custom-scrollbar">
                            <div style="display: flex; align-items: center; padding: 0 16px 12px 16px; margin-bottom: 8px; border-bottom: 1px solid rgba(244, 63, 94, 0.1); position: sticky; top: 0; background: #fef2f2; z-index: 10; margin-left: -8px; margin-right: -8px; padding-left: 24px; padding-right: 24px;">
                                <div style="width: 36px; margin-right: 16px;"></div>
                                <div style="flex: 1; display: grid; grid-template-columns: 280px 100px 120px 120px 120px 1fr; gap: 24px; align-items: center;">
                                    <div style="font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: 800; letter-spacing: 0.5px;">Resident Details</div>
                                    <div style="font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: 800; letter-spacing: 0.5px;">Due Date</div>
                                    <div style="font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: 800; letter-spacing: 0.5px;">Monthly Rent</div>
                                    <div style="font-size: 11px; color: #e11d48; text-transform: uppercase; font-weight: 900; letter-spacing: 0.5px;">Pending</div>
                                    <div style="font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: 800; letter-spacing: 0.5px;">Contact</div>
                                    <div style="font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: 800; letter-spacing: 0.5px; text-align: right;">Action</div>
                                </div>
                            </div>
                            ${residentsListHTML}
                        </div>
                        ` : ''}
                    </div>
                `;
            })()}
            
            <!-- Complaints Row -->
            <div style="margin-top: 32px;">
                <div class="card" style="border-radius: 20px; background-color: #ffffff; box-shadow: 0 4px 20px rgba(0,0,0,0.03); border: 1px solid #f1f5f9; padding: 24px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                        <h3 style="margin: 0; font-size: 18px; color: #0f172a;">Recent Complaints</h3>
                        <a href="#" onclick="navigateTo('complaints'); return false;" style="font-size: 13px; font-weight: 600; color: var(--primary); text-decoration: none;">View All</a>
                    </div>
                    
                    <div style="display: flex; flex-direction: column; gap: 12px;">
                        ${(() => {
                            const allComplaints = window.db.get('complaints') || [];
                            const filteredComplaints = allComplaints
                                .filter(c => !window.db.selectedPropertyId || window.db.selectedPropertyId === 'all' || c.propertyId === window.db.selectedPropertyId)
                                .sort((a,b) => new Date(b.date) - new Date(a.date))
                                .slice(0, 3);
                            
                            if (filteredComplaints.length === 0) {
                                return '<div style="padding: 24px; text-align: center; color: #94a3b8; font-size: 14px;">No recent complaints found.</div>';
                            }
                            
                            return filteredComplaints.map(c => {
                                const prop = window.db.get('properties').find(p => p.id === c.propertyId);
                                const room = window.db.get('rooms').find(r => r.id === c.roomId);
                                const roomNum = room ? room.roomNumber : 'N/A';
                                
                                let statusColor = '#f59e0b';
                                let statusBg = '#fef3c7';
                                if (c.status === 'Resolved') { statusColor = '#10b981'; statusBg = '#d1fae5'; }
                                else if (c.priority === 'High') { statusColor = '#ef4444'; statusBg = '#fee2e2'; }
                                
                                return `
                                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 16px; border: 1px solid #f1f5f9; border-radius: 12px;">
                                        <div style="display: flex; gap: 16px; align-items: center;">
                                            <div style="width: 40px; height: 40px; border-radius: 10px; background-color: #f8fafc; display: flex; align-items: center; justify-content: center; color: #64748b;">
                                                <i data-lucide="alert-circle" style="width: 20px; height: 20px;"></i>
                                            </div>
                                            <div>
                                                <h4 style="margin: 0 0 4px 0; font-size: 14px; font-weight: 600; color: #0f172a;">${c.category} Issue - Room ${roomNum}</h4>
                                                <div style="font-size: 12px; color: #64748b; display: flex; gap: 12px; align-items: center;">
                                                    <span style="display: flex; align-items: center; gap: 4px;"><i data-lucide="calendar" style="width: 12px; height: 12px;"></i> ${c.date}</span>
                                                    <span>•</span>
                                                    <span>${prop ? prop.name : ''}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div>
                                            <span style="display: inline-block; padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 600; background-color: ${statusBg}; color: ${statusColor};">${c.status}</span>
                                        </div>
                                    </div>
                                `;
                            }).join('');
                        })()}
                    </div>
                </div>
            </div>

            <!-- Charts Row -->
            <div style="display: grid; grid-template-columns: 1fr; gap: 24px; margin-top: 32px;">
                <!-- Performance Overview Chart Section -->
                <div class="card" style="border-radius: 20px; background-color: #ffffff; box-shadow: 0 4px 20px rgba(0,0,0,0.03); border: 1px solid #f1f5f9; overflow: hidden;">
                    <div style="padding: 32px 32px 0 32px;">
                        <span style="font-size: 13px; font-weight: 500; color: #64748b;">Performance Overview</span>
                        <div style="display: flex; align-items: baseline; gap: 12px; margin-top: 8px;">
                            <h3 id="perf-total-revenue" style="margin: 0; color: #0f172a; font-size: 28px; font-weight: 800; letter-spacing: -0.5px;">$0.00</h3>
                            <span id="perf-pct-change" style="font-size: 13px; font-weight: 600; color: #10b981;">+0.0% compared to last month</span>
                        </div>
                    </div>
                    
                    <div style="position: relative; height: 280px; width: 100%; padding: 0 16px;">
                        <canvas id="chart-performance-overview"></canvas>
                    </div>
                    
                    <div style="padding: 16px 32px; background-color: #f8fafc; border-top: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: center;">
                        <span style="font-size: 13px; font-weight: 600; color: #475569; display: flex; align-items: center; gap: 6px;">Monthly Revenue Goal <i data-lucide="info" style="width: 14px; height: 14px; color: #cbd5e1;"></i></span>
                        <span id="perf-goal-progress" style="font-size: 13px; font-weight: 600; color: #10b981;">0.0% of monthly goal achieved</span>
                    </div>
                </div>
            </div>

        </div>
    `;

    setTimeout(() => {
        lucide.createIcons();
        if (typeof renderDashboardCharts === 'function') {
            renderDashboardCharts(analytics);
        }
    }, 50);
}

function renderDashboardCharts(analytics) {
    // 1. Monthly Trends Bar Chart
    const trendsCtx = document.getElementById('chart-monthly-trends');
    if (trendsCtx && analytics.monthlyTrends) {
        const labels = analytics.monthlyTrends.map(t => t.month);
        const revData = analytics.monthlyTrends.map(t => t.revenue);
        const expData = analytics.monthlyTrends.map(t => t.expenses);

        const chart = new Chart(trendsCtx, {
            type: 'bar',
            data: {
                labels,
                datasets: [
                    { label: 'Revenue Collected', data: revData, backgroundColor: '#4F46E5', borderRadius: 6, barPercentage: 0.8, categoryPercentage: 0.8 },
                    { label: 'Operational Expenses', data: expData, backgroundColor: '#F59E0B', borderRadius: 6, barPercentage: 0.8, categoryPercentage: 0.8 }
                ]
            },
            options: {
                responsive: true,
                plugins: { legend: { position: 'top' } },
                scales: { y: { beginAtZero: true } }
            }
        });
        currentCharts.push(chart);
    }

    // 2. Bed Occupancy Donut Chart
    const donutCtx = document.getElementById('chart-occupancy-donut');
    if (donutCtx) {
        const chart = new Chart(donutCtx, {
            type: 'doughnut',
            data: {
                labels: ['Occupied', 'Available', 'Reserved', 'Maintenance'],
                datasets: [{
                    data: [
                        analytics.occupiedBeds || 0,
                        analytics.vacantBeds || 0,
                        analytics.reservedBeds || 0,
                        analytics.maintenanceBeds || 0
                    ],
                    backgroundColor: ['#4F46E5', '#10B981', '#F59E0B', '#94A3B8'],
                    borderWidth: 2,
                    borderColor: '#fff'
                }]
            },
            options: {
                responsive: true,
                cutout: '68%',
                plugins: { legend: { position: 'bottom' } }
            }
        });
        currentCharts.push(chart);
    }

    // 3. Performance Overview Chart
    const perfCtx = document.getElementById('chart-performance-overview');
    if (perfCtx) {
        const payments = window.db.get('payments') || [];
        const expenses = window.db.get('expenses') || [];
        
        // Calculate totals for current month and last month
        const today = new Date();
        const currentMonth = today.toISOString().slice(0, 7);
        const lastMonthDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const lastMonth = lastMonthDate.toISOString().slice(0, 7);

        // Filter based on selected property
        const selectedId = window.db.selectedPropertyId;
        const filteredPayments = payments.filter(p => !selectedId || selectedId === 'all' || p.propertyId === selectedId);
        const filteredExpenses = expenses.filter(e => !selectedId || selectedId === 'all' || e.propertyId === selectedId);

        const currentRev = filteredPayments.filter(p => p.month === currentMonth && (p.status === 'Paid' || p.status === 'Partial')).reduce((sum, p) => sum + (p.amountPaid || 0), 0);
        const lastRev = filteredPayments.filter(p => p.month === lastMonth && (p.status === 'Paid' || p.status === 'Partial')).reduce((sum, p) => sum + (p.amountPaid || 0), 0);

        const currentExp = filteredExpenses.filter(e => e.date && e.date.startsWith(currentMonth)).reduce((sum, e) => sum + (e.amount || 0), 0);
        
        const currentProfit = currentRev - currentExp;

        // Calculate % change in Revenue
        let pctChange = 0;
        if (lastRev > 0) {
            pctChange = ((currentRev - lastRev) / lastRev) * 100;
        } else if (currentRev > 0) {
            pctChange = 100;
        }

        // Update DOM headers
        const totalEl = document.getElementById('perf-total-revenue');
        const changeEl = document.getElementById('perf-pct-change');
        const goalProgressEl = document.getElementById('perf-goal-progress');
        
        if (totalEl) totalEl.textContent = `₹${currentRev.toLocaleString('en-IN')}`;
        if (changeEl) {
            const isPositive = pctChange >= 0;
            changeEl.textContent = `${isPositive ? '+' : ''}${pctChange.toFixed(1)}% compared to last month`;
            changeEl.style.color = isPositive ? '#10b981' : '#ef4444';
        }
        
        // Goal calculation (mock goal: 50,000 or last month * 1.2)
        const monthlyGoal = lastRev > 0 ? lastRev * 1.2 : 50000;
        const goalPct = Math.min(100, Math.max(0, (currentRev / monthlyGoal) * 100)).toFixed(1);
        if (goalProgressEl) {
            goalProgressEl.textContent = `${goalPct}% of monthly goal achieved`;
        }

        // Mock 7-day data for the chart
        const labels = [];
        const profitData = [];
        const expData = [];
        
        for (let i = 6; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(d.getDate() - i);
            const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            labels.push(dateStr);
            
            const randomFactor1 = 0.5 + (Math.random() * 0.8); 
            const randomFactor2 = 0.5 + (Math.random() * 0.8);
            
            // Distribute the total profit and exp roughly across 7 days
            profitData.push(Math.max(0, (currentProfit / 7) * randomFactor1));
            expData.push((currentExp / 7) * randomFactor2);
        }

        const ctx = perfCtx.getContext('2d');
        const gradientBlue = ctx.createLinearGradient(0, 0, 0, 300);
        gradientBlue.addColorStop(0, '#6366f1'); // Lighter blue at top
        gradientBlue.addColorStop(1, '#3730a3'); // Darker blue at bottom

        const chart = new Chart(perfCtx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Profit',
                        data: profitData,
                        backgroundColor: gradientBlue,
                        borderRadius: { bottomLeft: 4, bottomRight: 4, topLeft: 0, topRight: 0 },
                        barPercentage: 0.5,
                        categoryPercentage: 0.8,
                        stack: 'Stack 0'
                    },
                    {
                        label: 'Expenses',
                        data: expData,
                        backgroundColor: '#e0e7ff', // Very light blue
                        borderRadius: { topLeft: 4, topRight: 4, bottomLeft: 0, bottomRight: 0 },
                        barPercentage: 0.5,
                        categoryPercentage: 0.8,
                        stack: 'Stack 0'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { 
                    legend: { display: false },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        titleColor: '#0f172a',
                        bodyColor: '#475569',
                        borderColor: '#e2e8f0',
                        borderWidth: 1,
                        padding: 12,
                        boxPadding: 6,
                        usePointStyle: true,
                        callbacks: {
                            label: function(context) {
                                let label = context.dataset.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                if (context.parsed.y !== null) {
                                    label += '₹' + Math.round(context.parsed.y).toLocaleString('en-IN');
                                }
                                return label;
                            }
                        }
                    }
                },
                scales: { 
                    x: { 
                        grid: { display: false, drawBorder: false },
                        ticks: { color: '#94a3b8', font: { size: 11, family: "'Inter', sans-serif" }, padding: 10 }
                    },
                    y: { 
                        beginAtZero: true,
                        grid: { 
                            color: '#e2e8f0',
                            borderDash: [5, 5],
                            drawBorder: false,
                            tickLength: 0
                        },
                        border: { display: false },
                        ticks: { 
                            color: '#94a3b8', 
                            font: { size: 11, family: "'Inter', sans-serif" },
                            padding: 12,
                            maxTicksLimit: 5,
                            callback: function(value) {
                                if (value >= 1000) {
                                    return (value / 1000).toFixed(0) + 'K';
                                }
                                return value;
                            }
                        }
                    }
                },
                interaction: {
                    mode: 'index',
                    intersect: false,
                },
            }
        });
        currentCharts.push(chart);
    }

    // 4. Customer Feedback Chart
    const feedbackCtx = document.getElementById('chart-customer-feedback');
    if (feedbackCtx) {
        const chart = new Chart(feedbackCtx, {
            type: 'bar',
            data: {
                labels: ['Q1', 'Q2', 'Q3', 'Q4'],
                datasets: [{
                    label: 'Positive comments',
                    data: [19, 26, 33, 39],
                    backgroundColor: '#5200ff',
                    borderRadius: { topLeft: 12, topRight: 12, bottomLeft: 0, bottomRight: 0 },
                    borderSkipped: false,
                    barPercentage: 0.45,
                    categoryPercentage: 1.0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: '#0f172a',
                        titleFont: { size: 13, family: 'Inter' },
                        bodyFont: { size: 13, family: 'Inter' },
                        padding: 12,
                        cornerRadius: 8,
                        callbacks: {
                            label: function(context) {
                                return context.parsed.y + '%';
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { display: false, drawBorder: false },
                        ticks: { color: '#475569', font: { size: 13, family: 'Inter' } },
                        border: { display: false }
                    },
                    y: {
                        position: 'right',
                        beginAtZero: true,
                        max: 42,
                        grid: {
                            color: '#e2e8f0',
                            drawBorder: false,
                            tickLength: 0,
                            lineWidth: 1
                        },
                        border: { display: false },
                        ticks: {
                            color: '#475569',
                            font: { size: 13, family: 'Inter' },
                            stepSize: 10,
                            callback: function(value) {
                                return value + '%';
                            }
                        }
                    }
                }
            }
        });
        currentCharts.push(chart);
    }
}

// =========================================================================
// 2. PROPERTIES & ROOM MATRIX VIEW
// =========================================================================
function renderPropertiesView(container) {
    const properties = window.db.get('properties');
    const rooms = window.db.get('rooms');
    const selectedPropId = window.db.selectedPropertyId;
    const filteredProps = selectedPropId === 'all' ? properties : properties.filter(p => p.id === selectedPropId);

    const beds = window.db.get('beds') || [];
    
    let totalRooms = rooms.length;
    let emptyRooms = 0;
    let occupiedRooms = 0;
    
    let totalBeds = beds.length;
    let occupiedBedsCount = 0;
    
    rooms.forEach(r => {
        const roomBeds = beds.filter(b => b.roomId === r.id);
        const occ = roomBeds.filter(b => b.status === 'Occupied' || b.status === 'Reserved').length;
        if (occ > 0) occupiedRooms++;
        else emptyRooms++;
    });
    
    occupiedBedsCount = beds.filter(b => b.status === 'Occupied' || b.status === 'Reserved').length;
    let vacantBedsCount = totalBeds - occupiedBedsCount;

    container.innerHTML = `
        <div class="filter-bar" style="margin-bottom: 24px;">
            <div class="filter-bar-left" style="display: flex; gap: 16px; align-items: center;">
                <div style="background: white; border: 1px solid var(--border-color); padding: 10px 16px; border-radius: 8px; font-size: 14px; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
                    <span style="color: var(--text-muted); font-weight: 500; margin-right: 4px;">Rooms:</span>
                    <span style="font-weight: 700; font-size: 15px; color: var(--text-main);">${totalRooms}</span>
                    <span style="color: var(--border-color); margin: 0 10px;">|</span>
                    <span style="color: var(--text-muted); margin-right: 4px;">Occupied</span> <span style="color: var(--success); font-weight: 700; font-size: 15px;">${occupiedRooms}</span>
                    <span style="color: var(--border-color); margin: 0 10px;">|</span>
                    <span style="color: var(--text-muted); margin-right: 4px;">Empty</span> <span style="color: var(--danger); font-weight: 700; font-size: 15px;">${emptyRooms}</span>
                </div>
                <div style="background: white; border: 1px solid var(--border-color); padding: 10px 16px; border-radius: 8px; font-size: 14px; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
                    <span style="color: var(--text-muted); font-weight: 500; margin-right: 4px;">Beds:</span>
                    <span style="font-weight: 700; font-size: 15px; color: var(--text-main);">${totalBeds}</span>
                    <span style="color: var(--border-color); margin: 0 10px;">|</span>
                    <span style="color: var(--text-muted); margin-right: 4px;">Occupied</span> <span style="color: var(--success); font-weight: 700; font-size: 15px;">${occupiedBedsCount}</span>
                    <span style="color: var(--border-color); margin: 0 10px;">|</span>
                    <span style="color: var(--text-muted); margin-right: 4px;">Vacant</span> <span style="color: var(--danger); font-weight: 700; font-size: 15px;">${vacantBedsCount}</span>
                </div>
            </div>
            <div class="filter-bar-right">
                <button class="btn btn-primary btn-sm" onclick="openAddRoomModal()"><i data-lucide="plus-circle"></i> Add Room</button>
            </div>
        </div>

        <!-- Interactive Floor-by-Floor Room & Bed Matrix -->
        <div>
            ${renderBedMatrixHtml(rooms)}
        </div>
    `;
    
    setTimeout(() => {
        if (window.lucide) {
            window.lucide.createIcons();
        }
    }, 50);
}

function renderBedMatrixHtml(rooms) {
    if (rooms.length === 0) {
        return `<div style="text-align:center; padding:40px; color:var(--text-muted);">No rooms found for this property. Click "Add Room" to create one.</div>`;
    }

    // Group rooms by floor
    const floorsMap = {};
    rooms.forEach(r => {
        const floorKey = `Floor ${r.floor}`;
        if (!floorsMap[floorKey]) floorsMap[floorKey] = [];
        floorsMap[floorKey].push(r);
    });

    return Object.entries(floorsMap).map(([floorName, floorRooms]) => `
        <div class="floor-section card" style="padding: 24px; margin-bottom: 24px;">
            <div class="floor-title"><strong>${floorName.toUpperCase()}</strong></div>
            <div class="room-grid">
                ${floorRooms.map(room => `
                        <div class="room-card" style="padding: 16px; border-radius: 10px; cursor: pointer; transition: transform 0.2s;" onclick="openRoomInfoModal('${room.id}')" onmouseover="this.style.transform='scale(1.02)'" onmouseout="this.style.transform='scale(1)'">
                            ${(() => {
                                const totalBeds = room.beds ? room.beds.length : 0;
                                const occupiedBeds = room.beds ? room.beds.filter(b => b.status === 'Occupied').length : 0;
                                const vacantBeds = room.beds ? room.beds.filter(b => b.status === 'Available').length : 0;
                                return `
                                    <div class="room-header" style="display:flex; justify-content:space-between; align-items:center; border-bottom: 1px solid var(--border-color); padding-bottom: 12px; margin-bottom: 16px;">
                                        <span class="room-number" style="font-size:16px; font-weight:700; color:#1e293b;">Room ${room.roomNumber}</span>
                                        <div style="display:flex; align-items:center; gap: 10px;">
                                            <span class="room-type-tag" style="font-size:12px; font-weight:500; color:#94a3b8; background:transparent; padding:0;">${room.type}</span>
                                        </div>
                                    </div>
                                    
                                    <div style="display:flex; justify-content:center; gap: 8px; margin-bottom: 16px; min-height: 44px;">
                                        ${(room.beds || []).map(bed => `
                                            <div style="display:flex; align-items:center; justify-content:center; width: 44px; height: 38px; border-radius: 6px; border: ${bed.status === 'Occupied' ? '1.5px' : '1px'} solid ${bed.status === 'Occupied' ? '#059669' : '#e2e8f0'}; background-color: ${bed.status === 'Occupied' ? '#86efac' : '#f1f5f9'};">
                                                <i data-lucide="bed-double" style="width:20px; height:20px; color:#4F46E5; fill:#EEF2FF;"></i>
                                            </div>
                                        `).join('')}
                                    </div>
                                    
                                    <div style="border-top: 1px solid var(--border-color); padding-top: 12px; display:flex; justify-content:space-around;">
                                        <div style="display:flex; flex-direction:column; align-items:center; gap: 4px;">
                                            <span style="font-size:16px; font-weight:700; color:#10b981; line-height: 1;">${occupiedBeds}</span>
                                            <span style="font-size:11px; color:#94a3b8;">Occupied</span>
                                        </div>
                                        <div style="display:flex; flex-direction:column; align-items:center; gap: 4px;">
                                            <span style="font-size:16px; font-weight:700; color:#64748b; line-height: 1;">${vacantBeds}</span>
                                            <span style="font-size:11px; color:#94a3b8;">Vacant</span>
                                        </div>
                                    </div>
                                `;
                            })()}
                        </div>
                `).join('')}
            </div>
        </div>
    `).join('');
}

function getBedStatusBadgeClass(status) {
    switch (status) {
        case 'Available': return 'badge-success';
        case 'Occupied': return 'badge-purple';
        case 'Reserved': return 'badge-warning';
        case 'Maintenance': return 'badge-neutral';
        default: return 'badge-neutral';
    }
}

async function toggleBedStatus(bedId, newStatus) {
    try {
        await window.db.updateBedStatus(bedId, newStatus);
        showToast(`Bed status updated to ${newStatus}`);
    } catch (e) {
        alert(e.message);
    }
}

// =========================================================================
// 3. RESIDENTS & KYC VIEW (Fulfills Rule 5 & 6)
// =========================================================================
function renderResidentsView(container) {
    const residents = window.db.get('residents');
    const properties = window.db.get('properties');

    container.innerHTML = `
        <div class="filter-bar">
            <div class="filter-bar-left">
                <div class="search-input-wrap">
                    <i data-lucide="search"></i>
                    <input type="text" id="res-search" class="search-input" placeholder="Search by name, phone, room..." oninput="filterResidentsTable()">
                </div>
                <select id="res-status-filter" class="select-filter" onchange="filterResidentsTable()">
                    <option value="">All Resident Statuses</option>
                    <option value="Active">Active</option>
                    <option value="Notice Period">Notice Period</option>
                    <option value="Checked Out">Checked Out</option>
                </select>
                <select id="res-kyc-filter" class="select-filter" onchange="filterResidentsTable()">
                    <option value="">All KYC Statuses</option>
                    <option value="Verified">KYC Verified</option>
                    <option value="Pending">KYC Pending</option>
                    <option value="Rejected">KYC Rejected</option>
                </select>
            </div>
            <div class="filter-bar-right"></div>
        </div>

        <div class="card">
            <div class="card-body" style="padding:0;">
                <div class="table-container">
                    <table class="data-table" id="residents-table">
                        <thead>
                            <tr>
                                <th>Resident Name</th>
                                <th>Property</th>
                                <th>Room</th>
                                <th>Joining Date</th>
                                <th>Monthly Rent</th>
                                <th>KYC Status</th>
                                <th>Status</th>
                                <th style="text-align:right;">Actions</th>
                            </tr>
                        </thead>
                        <tbody id="residents-table-body">
                            ${renderResidentsRows(residents)}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
}

function renderResidentsRows(residentsList) {
    if (residentsList.length === 0) {
        return `<tr><td colspan="8" style="text-align:center; padding:32px; color:var(--text-muted);">No residents matching current filters.</td></tr>`;
    }

    return residentsList.map(r => `
        <tr>
            <td>
                <div style="display:flex; align-items:center; gap:10px;">
                    <div class="avatar" style="width:32px; height:32px; font-size:11px;">${r.name.split(' ').map(n=>n[0]).join('').substring(0,2)}</div>
                    <div>
                        <div style="font-weight:600;">${r.name}</div>
                        <div style="font-size:11.5px; color:var(--text-muted);">${r.phone}</div>
                    </div>
                </div>
            </td>
            <td>${r.propertyName || 'PG Property'}</td>
            <td><strong>Room ${r.roomNumber || '-'}</strong></td>
            <td>${r.joiningDate}</td>
            <td><strong>₹${(r.monthlyRent || 0).toLocaleString()}</strong></td>
            <td>
                <span class="badge ${r.kycStatus === 'Verified' ? 'badge-success' : (r.kycStatus === 'Pending' ? 'badge-warning' : 'badge-danger')}">
                    <span class="badge-dot-indicator"></span> ${r.kycStatus}
                </span>
            </td>
            <td>
                <span class="badge ${r.status === 'Active' ? 'badge-success' : (r.status === 'Notice Period' ? 'badge-warning' : 'badge-neutral')}">
                    ${r.status}
                </span>
            </td>
            <td style="text-align:right;">
                <div class="action-menu-wrap">
                    <button class="icon-btn" style="width:30px; height:30px;" onclick="toggleRowActionMenu(event, '${r.id}')"><i data-lucide="more-vertical"></i></button>
                    <div class="action-menu" id="menu-${r.id}">
                        <button onclick="openResidentProfileModal('${r.id}')"><i data-lucide="user"></i> View Profile</button>
                        <button onclick="openEditResidentModal('${r.id}')"><i data-lucide="edit-3"></i> Edit Resident</button>
                        <button onclick="openKycModal('${r.id}')"><i data-lucide="file-text"></i> View Documents</button>
                        ${r.status !== 'Checked Out' ? `
                            <button onclick="openTransferModal('${r.id}')"><i data-lucide="repeat"></i> Change Room/Bed</button>
                            <button class="danger" onclick="openCheckoutModal('${r.id}')"><i data-lucide="log-out"></i> Start Checkout</button>
                        ` : ''}
                        <button onclick="viewResidentRentHistory('${r.id}')"><i data-lucide="receipt"></i> View Rent History</button>
                    </div>
                </div>
            </td>
        </tr>
    `).join('');
}

function filterResidentsTable() {
    const search = (document.getElementById('res-search')?.value || '').toLowerCase();
    const status = document.getElementById('res-status-filter')?.value || '';
    const kyc = document.getElementById('res-kyc-filter')?.value || '';

    const all = window.db.get('residents');
    const filtered = all.filter(r => {
        const matchesSearch = !search || r.name.toLowerCase().includes(search) || r.phone.includes(search) || (r.roomNumber && r.roomNumber.includes(search));
        const matchesStatus = !status || r.status === status;
        const matchesKyc = !kyc || r.kycStatus === kyc;
        return matchesSearch && matchesStatus && matchesKyc;
    });

    const tbody = document.getElementById('residents-table-body');
    if (tbody) {
        tbody.innerHTML = renderResidentsRows(filtered);
        lucide.createIcons();
    }
}

function toggleRowActionMenu(e, id) {
    e.stopPropagation();
    document.querySelectorAll('.action-menu').forEach(m => {
        if (m.id !== `menu-${id}`) m.classList.remove('show');
    });
    const menu = document.getElementById(`menu-${id}`);
    if (menu) menu.classList.toggle('show');
}
document.addEventListener('click', () => {
    document.querySelectorAll('.action-menu').forEach(m => m.classList.remove('show'));
});

// =========================================================================
// 4. RENT & PAYMENTS VIEW
// =========================================================================
function renderPaymentsView(container) {
    const payments = window.db.get('payments');
    const selectedMonth = '2026-09';

    const totalExpected = payments.reduce((acc, p) => acc + (p.amountExpected || 0), 0);
    const totalCollected = payments.reduce((acc, p) => acc + (p.amountPaid || 0), 0);
    const totalPending = Math.max(0, totalExpected - totalCollected);
    const totalOverdue = payments.filter(p => p.status === 'Overdue').reduce((acc, p) => acc + (p.amountExpected - p.amountPaid), 0);

    container.innerHTML = `
        <!-- Summary Cards -->
        <div class="kpi-grid" style="margin-bottom:20px;">
            <div class="kpi-card">
                <div class="kpi-icon primary"><i data-lucide="receipt"></i></div>
                <div class="kpi-info">
                    <span class="kpi-label">Total Expected</span>
                    <span class="kpi-value">₹${totalExpected.toLocaleString()}</span>
                </div>
            </div>
            <div class="kpi-card">
                <div class="kpi-icon success"><i data-lucide="check-circle"></i></div>
                <div class="kpi-info">
                    <span class="kpi-label">Total Collected</span>
                    <span class="kpi-value">₹${totalCollected.toLocaleString()}</span>
                </div>
            </div>
            <div class="kpi-card">
                <div class="kpi-icon warning"><i data-lucide="clock"></i></div>
                <div class="kpi-info">
                    <span class="kpi-label">Pending Dues</span>
                    <span class="kpi-value">₹${totalPending.toLocaleString()}</span>
                </div>
            </div>
            <div class="kpi-card">
                <div class="kpi-icon danger"><i data-lucide="alert-triangle"></i></div>
                <div class="kpi-info">
                    <span class="kpi-label">Overdue Rent</span>
                    <span class="kpi-value">₹${totalOverdue.toLocaleString()}</span>
                </div>
            </div>
        </div>

        <!-- Filter & Action Bar -->
        <div class="filter-bar">
            <div class="filter-bar-left">
                <div class="search-input-wrap">
                    <i data-lucide="search"></i>
                    <input type="text" id="pay-search" class="search-input" placeholder="Search by resident name or receipt..." oninput="filterPaymentsTable()">
                </div>
                <select id="pay-month-filter" class="select-filter" onchange="filterPaymentsTable()">
                    <option value="">All Months</option>
                    <option value="2026-09" selected>September 2026</option>
                    <option value="2026-08">August 2026</option>
                    <option value="2026-07">July 2026</option>
                    <option value="2026-06">June 2026</option>
                </select>
                <select id="pay-status-filter" class="select-filter" onchange="filterPaymentsTable()">
                    <option value="">All Payment Statuses</option>
                    <option value="Paid">Paid</option>
                    <option value="Pending">Pending</option>
                    <option value="Partial">Partial</option>
                    <option value="Overdue">Overdue</option>
                </select>
            </div>
            <div class="filter-bar-right">
            </div>
        </div>

        <div class="card">
            <div class="card-body" style="padding:0;">
                <div class="table-container">
                    <table class="data-table" id="payments-table">
                        <thead>
                            <tr>
                                <th>Resident</th>
                                <th>Property</th>
                                <th>Room</th>
                                <th>Month</th>
                                <th>Expected</th>
                                <th>Paid</th>
                                <th>Status</th>
                                <th>Payment Mode & Ref</th>
                                <th style="text-align:right;">Action</th>
                            </tr>
                        </thead>
                        <tbody id="payments-table-body">
                            ${renderPaymentsRows(payments)}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
}

function renderPaymentsRows(paymentsList) {
    if (paymentsList.length === 0) {
        return `<tr><td colspan="9" style="text-align:center; padding:32px; color:var(--text-muted);">No payment records found.</td></tr>`;
    }

    return paymentsList.map(p => `
        <tr>
            <td>
                <strong>${p.residentName || 'Resident'}</strong>
                <div style="font-size:11.5px; color:var(--text-muted);">${p.residentPhone || ''}</div>
            </td>
            <td>${p.propertyName || 'PG Property'}</td>
            <td>Room ${p.roomNumber || '-'}</td>
            <td><span class="badge badge-neutral">${p.month}</span></td>
            <td><strong>₹${(p.amountExpected || 0).toLocaleString()}</strong></td>
            <td style="color:${p.amountPaid > 0 ? 'var(--success-text)' : 'var(--text-muted)'}; font-weight:600;">
                ₹${(p.amountPaid || 0).toLocaleString()}
            </td>
            <td>
                <span class="badge ${p.status === 'Paid' ? 'badge-success' : (p.status === 'Partial' ? 'badge-warning' : (p.status === 'Overdue' ? 'badge-danger' : 'badge-neutral'))}">
                    <span class="badge-dot-indicator"></span> ${p.status}
                </span>
            </td>
            <td>
                ${p.paymentMode ? `<span style="font-weight:500;">${p.paymentMode}</span>` : '<span style="color:var(--text-light);">-</span>'}
                ${p.referenceNumber ? `<div style="font-size:11px; color:var(--text-light);">${p.referenceNumber}</div>` : ''}
            </td>
            <td style="text-align:right;">
                ${p.status !== 'Paid' ? `
                    <button class="btn btn-primary btn-sm" onclick="openRecordPaymentModal('${p.id}', ${p.amountExpected - p.amountPaid})">Collect</button>
                ` : `
                    <button class="btn btn-secondary btn-sm" onclick="openReceiptModal('${p.id}')"><i data-lucide="file-text"></i> Receipt</button>
                `}
            </td>
        </tr>
    `).join('');
}

function filterPaymentsTable() {
    const search = (document.getElementById('pay-search')?.value || '').toLowerCase();
    const month = document.getElementById('pay-month-filter')?.value || '';
    const status = document.getElementById('pay-status-filter')?.value || '';

    const all = window.db.get('payments');
    const filtered = all.filter(p => {
        const matchesSearch = !search || (p.residentName && p.residentName.toLowerCase().includes(search)) || (p.receiptNumber && p.receiptNumber.toLowerCase().includes(search));
        const matchesMonth = !month || p.month === month;
        const matchesStatus = !status || p.status === status;
        return matchesSearch && matchesMonth && matchesStatus;
    });

    const tbody = document.getElementById('payments-table-body');
    if (tbody) {
        tbody.innerHTML = renderPaymentsRows(filtered);
        lucide.createIcons();
    }
}

async function generateNextMonthRent() {
    const nextMonth = '2026-10';
    if (!confirm(`Generate rent invoices for all active residents for ${nextMonth}?`)) return;
    try {
        const res = await window.db.generateMonthRent(nextMonth);
        showToast(`Generated ${res.createdCount} invoices for ${nextMonth}!`);
    } catch (e) {
        alert(e.message);
    }
}

// =========================================================================
// 5. COMPLAINTS & MAINTENANCE VIEW
// =========================================================================
function renderComplaintsView(container) {
    const complaints = window.db.get('complaints');

    container.innerHTML = `
        <div class="filter-bar">
            <div class="filter-bar-left">
                <select id="comp-status-filter" class="select-filter" onchange="filterComplaintsTable()">
                    <option value="">All Statuses</option>
                    <option value="Pending">Pending</option>
                    <option value="Assigned">Assigned</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Resolved">Resolved</option>
                </select>
                <select id="comp-cat-filter" class="select-filter" onchange="filterComplaintsTable()">
                    <option value="">All Categories</option>
                    <option value="Electricity">Electricity</option>
                    <option value="Water">Water</option>
                    <option value="Wi-Fi">Wi-Fi</option>
                    <option value="Cleaning">Cleaning</option>
                    <option value="Plumbing">Plumbing</option>
                    <option value="Maintenance">Maintenance</option>
                    <option value="Food">Food</option>
                </select>
            </div>
            <div class="filter-bar-right">
            </div>
        </div>

        <div class="card">
            <div class="card-body" style="padding:0;">
                <div class="table-container">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Complaint Title</th>
                                <th>Category</th>
                                <th>Resident & Room</th>
                                <th>Property</th>
                                <th>Priority</th>
                                <th>Assigned Staff</th>
                                <th>Status</th>
                                <th>Date</th>
                                <th style="text-align:right;">Actions</th>
                            </tr>
                        </thead>
                        <tbody id="complaints-table-body">
                            ${renderComplaintsRows(complaints)}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
}

function renderComplaintsRows(complaintsList) {
    if (complaintsList.length === 0) {
        return `<tr><td colspan="9" style="text-align:center; padding:32px; color:var(--text-muted);">No complaints matching filter.</td></tr>`;
    }

    return complaintsList.map(c => `
        <tr>
            <td>
                <strong>${c.title}</strong>
                ${c.description ? `<div style="font-size:11.5px; color:var(--text-muted);">${c.description}</div>` : ''}
            </td>
            <td><span class="badge badge-neutral">${c.category}</span></td>
            <td>${c.residentName ? `👤 ${c.residentName}` : 'General'}${c.roomNumber ? ` (Rm ${c.roomNumber})` : ''}</td>
            <td>${c.propertyName}</td>
            <td>
                <span class="badge ${c.priority === 'High' ? 'badge-danger' : (c.priority === 'Medium' ? 'badge-warning' : 'badge-info')}">
                    ${c.priority}
                </span>
            </td>
            <td>${c.staffName || '<span style="color:var(--text-light);">Unassigned</span>'}</td>
            <td>
                <span class="badge ${c.status === 'Resolved' ? 'badge-success' : (c.status === 'In Progress' ? 'badge-warning' : 'badge-danger')}">
                    <span class="badge-dot-indicator"></span> ${c.status}
                </span>
            </td>
            <td>${c.createdDate}</td>
            <td style="text-align:right;">
                ${c.status !== 'Resolved' ? `
                    <button class="btn btn-secondary btn-sm" onclick="openUpdateComplaintModal('${c.id}')">Update / Resolve</button>
                ` : `
                    <span style="color:var(--success); font-size:12px; font-weight:600;"><i data-lucide="check"></i> Resolved</span>
                `}
            </td>
        </tr>
    `).join('');
}

function filterComplaintsTable() {
    const status = document.getElementById('comp-status-filter')?.value || '';
    const cat = document.getElementById('comp-cat-filter')?.value || '';

    const all = window.db.get('complaints');
    const filtered = all.filter(c => {
        const matchesStatus = !status || c.status === status;
        const matchesCat = !cat || c.category === cat;
        return matchesStatus && matchesCat;
    });

    const tbody = document.getElementById('complaints-table-body');
    if (tbody) {
        tbody.innerHTML = renderComplaintsRows(filtered);
        lucide.createIcons();
    }
}

// =========================================================================
// 6. LEADS & ENQUIRIES CRM VIEW
// =========================================================================
function renderLeadsView(container) {
    const leads = window.db.get('leads');

    container.innerHTML = `
        <div class="filter-bar">
            <div class="filter-bar-left">
                <select id="lead-status-filter" class="select-filter" onchange="filterLeadsTable()">
                    <option value="">All Lead Stages</option>
                    <option value="New">New Enquiries</option>
                    <option value="Contacted">Contacted</option>
                    <option value="Visit Scheduled">Visit Scheduled</option>
                    <option value="Booked">Booked (Converted)</option>
                    <option value="Lost">Lost</option>
                </select>
            </div>
            <div class="filter-bar-right">
                <button class="btn btn-primary btn-sm" onclick="openLeadModal()"><i data-lucide="plus"></i> New Enquiry</button>
            </div>
        </div>

        <div class="card">
            <div class="card-body" style="padding:0;">
                <div class="table-container">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Prospective Resident</th>
                                <th>Preferred Property</th>
                                <th>Room Type</th>
                                <th>Budget</th>
                                <th>Move-in Date</th>
                                <th>Source</th>
                                <th>Status</th>
                                <th>Follow-up</th>
                                <th style="text-align:right;">Conversion Action</th>
                            </tr>
                        </thead>
                        <tbody id="leads-table-body">
                            ${renderLeadsRows(leads)}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
}

function renderLeadsRows(leadsList) {
    if (leadsList.length === 0) {
        return `<tr><td colspan="9" style="text-align:center; padding:32px; color:var(--text-muted);">No enquiries found.</td></tr>`;
    }

    return leadsList.map(l => `
        <tr>
            <td>
                <strong>${l.name}</strong>
                <div style="font-size:11.5px; color:var(--text-muted);">${l.phone} ${l.email ? `• ${l.email}` : ''}</div>
            </td>
            <td>${l.propertyName || 'Any Property'}</td>
            <td><span class="badge badge-neutral">${l.preferredRoomType || 'Double'}</span></td>
            <td><strong>₹${(l.budget || 0).toLocaleString()}</strong></td>
            <td>${l.moveInDate || '-'}</td>
            <td><span class="badge badge-neutral">${l.source || 'Website'}</span></td>
            <td>
                <span class="badge ${l.status === 'Booked' ? 'badge-success' : (l.status === 'Visit Scheduled' ? 'badge-purple' : (l.status === 'Contacted' ? 'badge-info' : (l.status === 'Lost' ? 'badge-danger' : 'badge-warning')))}">
                    ${l.status}
                </span>
            </td>
            <td>
                ${l.followUpDate ? `📅 ${l.followUpDate}` : '-'}
                ${l.notes ? `<div style="font-size:11px; color:var(--text-muted); max-width:180px; overflow:hidden; text-overflow:ellipsis;">${l.notes}</div>` : ''}
            </td>
            <td style="text-align:right;">
                ${l.status !== 'Booked' && l.status !== 'Lost' ? `
                    <button class="btn btn-success btn-sm" onclick="openConvertLeadModal('${l.id}')"><i data-lucide="user-check"></i> Convert to Resident</button>
                ` : `
                    <span style="font-size:12px; color:var(--text-muted);">${l.status === 'Booked' ? '✅ Converted' : 'Closed'}</span>
                `}
            </td>
        </tr>
    `).join('');
}

function filterLeadsTable() {
    const status = document.getElementById('lead-status-filter')?.value || '';
    const all = window.db.get('leads');
    const filtered = status ? all.filter(l => l.status === status) : all;
    const tbody = document.getElementById('leads-table-body');
    if (tbody) {
        tbody.innerHTML = renderLeadsRows(filtered);
        lucide.createIcons();
    }
}

// =========================================================================
// 7. REPORTS & BUSINESS ANALYTICS VIEW
// =========================================================================

// =========================================================================
// EXPENSES VIEW
// =========================================================================
function renderExpensesView(container) {
    const expenses = window.db.get('expenses');
    
    // Filter by selected property
    const propId = window.db.selectedPropertyId;
    let filteredExpenses = expenses;
    if (propId && propId !== 'all') {
        filteredExpenses = expenses.filter(e => e.propertyId === propId);
    }


    const totalExpenses = filteredExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    const staffSalary = filteredExpenses.filter(e => e.category === 'Staff Salary').reduce((sum, e) => sum + (e.amount || 0), 0);

    const staffSalaryList = filteredExpenses.filter(e => e.category === 'Staff Salary');
    const otherExpensesList = filteredExpenses.filter(e => e.category !== 'Staff Salary');

    container.innerHTML = `
        <div class="kpi-grid" style="margin-bottom: 20px; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));">
            <div class="kpi-card">
                <div class="kpi-icon warning"><i data-lucide="receipt"></i></div>
                <div class="kpi-info">
                    <span class="kpi-label">All Expenses</span>
                    <span class="kpi-value">₹${totalExpenses.toLocaleString()}</span>
                    <span class="kpi-sub">Total Operational Expenses</span>
                </div>
            </div>
            <div class="kpi-card">
                <div class="kpi-icon primary"><i data-lucide="users"></i></div>
                <div class="kpi-info">
                    <span class="kpi-label">Employees Salary</span>
                    <span class="kpi-value">₹${staffSalary.toLocaleString()}</span>
                    <span class="kpi-sub">Staff & Employee Pay</span>
                </div>
            </div>
        </div>
        <div>
            <div class="card" style="margin-bottom: 20px;">
                <div class="card-header" style="display: flex; justify-content: space-between; align-items: center; gap: 16px;">
                    <h3 class="card-title" style="white-space: nowrap;">Other Expenses</h3>
                    <div style="flex-grow: 1; max-width: 400px;">
                        <input type="text" id="exp-search" class="search-input" placeholder="Search expenses & salaries..." oninput="filterExpensesTable()" style="width: 100%;">
                    </div>
                    <button class="btn btn-primary btn-sm" onclick="openExpenseModal()" style="white-space: nowrap;"><i data-lucide="plus"></i> Add Expense</button>
                </div>
                <div class="card-body" style="padding:0; flex-grow: 1;">
                    <div class="table-container" style="max-height: 400px; overflow-y: auto;">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Category</th>
                                    <th>Description</th>
                                    <th>Amount</th>
                                    <th>Property</th>
                                    <th style="text-align:right;">Actions</th>
                                </tr>
                            </thead>
                            <tbody id="other-expenses-table-body">
                                ${renderExpensesRows(otherExpensesList)}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <div class="card">
                <div class="card-header" style="display: flex; justify-content: space-between; align-items: center;">
                    <h3 class="card-title">Employees Salary</h3>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <select id="salary-month-filter" class="search-input" style="width: auto; height: 32px; padding: 0 24px 0 12px; font-size: 13px;" onchange="filterSalaryByMonth(this.value)">
                            <option value="">September 2026 (Current)</option>
                            <option value="2026-08">August 2026</option>
                            <option value="2026-07">July 2026</option>
                            <option value="2026-06">June 2026</option>
                            <option value="2026-05">May 2026</option>
                            <option value="2026-04">April 2026</option>
                            <option value="2026-03">March 2026</option>
                        </select>
                        <button class="btn btn-secondary btn-sm" onclick="openEditEmployeesModal()" style="height: 32px; display: flex; align-items: center;"><i data-lucide="edit" style="width: 14px; height: 14px; margin-right: 4px;"></i> Edit</button>
                        <button class="btn btn-primary btn-sm" onclick="openExpenseModal()" style="height: 32px; display: flex; align-items: center;"><i data-lucide="plus" style="width: 14px; height: 14px; margin-right: 4px;"></i> Add Salary</button>
                    </div>
                </div>
                <div class="card-body" style="padding:0; flex-grow: 1;">
                    <div class="table-container" style="max-height: 400px; overflow-y: auto;">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>Employee Name</th>
                                    <th>Payment Date</th>
                                    <th>Salary Month</th>
                                    <th>Amount</th>
                                    <th>Property</th>
                                    <th style="text-align:right;">Actions</th>
                                </tr>
                            </thead>
                            <tbody id="salary-expenses-table-body">
                                ${renderSalaryRows(staffSalaryList)}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Add filter function
    window.filterSalaryByMonth = function(monthValue) {
        // monthValue is like '2026-09'
        const query = document.getElementById('exp-search').value.toLowerCase();
        let filteredStaff = filteredExpenses.filter(e => e.category === 'Staff Salary');
        
        if (monthValue) {
            filteredStaff = filteredStaff.filter(e => e.date.startsWith(monthValue));
        }
        
        if (query) {
            filteredStaff = filteredStaff.filter(e => 
                e.category.toLowerCase().includes(query) || 
                (e.description && e.description.toLowerCase().includes(query))
            );
        }
        
        const salaryBody = document.getElementById('salary-expenses-table-body');
        if (salaryBody) salaryBody.innerHTML = renderSalaryRows(filteredStaff);
        lucide.createIcons();
    };

    window.filterExpensesTable = function() {
        const query = document.getElementById('exp-search').value.toLowerCase();
        
        let filteredStaff = filteredExpenses.filter(e => e.category === 'Staff Salary' && (
            e.category.toLowerCase().includes(query) || 
            (e.description && e.description.toLowerCase().includes(query))
        ));
        const monthVal = document.getElementById('salary-month-filter')?.value;
        if (monthVal) {
            filteredStaff = filteredStaff.filter(e => e.date.startsWith(monthVal));
        }
        
        const filteredOther = filteredExpenses.filter(e => e.category !== 'Staff Salary' && (
            e.category.toLowerCase().includes(query) || 
            (e.description && e.description.toLowerCase().includes(query))
        ));

        const otherBody = document.getElementById('other-expenses-table-body');
        const salaryBody = document.getElementById('salary-expenses-table-body');
        
        if (otherBody) otherBody.innerHTML = renderExpensesRows(filteredOther);
        if (salaryBody) salaryBody.innerHTML = renderSalaryRows(filteredStaff);
        
        lucide.createIcons();
    };
}

function renderSalaryRows(salaryList) {
    if (salaryList.length === 0) {
        return `<tr><td colspan="6" style="text-align:center; padding:32px; color:var(--text-muted);">No salary records found.</td></tr>`;
    }

    return salaryList.map(e => {
        const prop = window.db.get('properties').find(p => p.id === e.propertyId);
        const propName = prop ? prop.name : 'All / General';
        const dateObj = new Date(e.date);
        const monthName = dateObj.toLocaleString('default', { month: 'short', year: 'numeric' });
        
        return `
        <tr>
            <td><strong>${e.description || 'Staff Member'}</strong></td>
            <td><span class="badge badge-neutral">${e.date}</span></td>
            <td>${monthName}</td>
            <td><strong>₹${(e.amount || 0).toLocaleString()}</strong></td>
            <td>${propName}</td>
            <td style="text-align:right;">
                <button class="btn btn-ghost btn-sm" onclick="openEmployeeInfoModal('${e.description ? e.description.replace(/'/g, "\\'") : 'Staff Member'}')" style="padding: 4px; border: none; background: transparent; cursor: pointer;">
                    <i data-lucide="more-vertical" style="width: 18px; height: 18px; color: var(--text-muted);"></i>
                </button>
            </td>
        </tr>
    `}).join('');
}

function renderExpensesRows(expensesList) {
    if (expensesList.length === 0) {
        return `<tr><td colspan="6" style="text-align:center; padding:32px; color:var(--text-muted);">No expenses found.</td></tr>`;
    }

    return expensesList.map(e => {
        const prop = window.db.get('properties').find(p => p.id === e.propertyId);
        const propName = prop ? prop.name : 'All / General';
        return `
        <tr>
            <td><span class="badge badge-neutral">${e.date}</span></td>
            <td><strong>${e.category}</strong></td>
            <td>${e.description || '-'}</td>
            <td><strong>₹${(e.amount || 0).toLocaleString()}</strong></td>
            <td>${propName}</td>
            <td style="text-align:right;">
                <button class="btn btn-ghost btn-sm" onclick="openEmployeeInfoModal('${e.description ? e.description.replace(/'/g, "\\'") : 'Staff Member'}')" style="padding: 4px; border: none; background: transparent; cursor: pointer;">
                    <i data-lucide="more-vertical" style="width: 18px; height: 18px; color: var(--text-muted);"></i>
                </button>
            </td>
        </tr>
    `}).join('');
}

function renderReportsView(container) {
    const analytics = window.db.state.analytics || {};
    const settings = window.db.get('settings') || {};
    const currency = settings.currency || '₹';

    container.innerHTML = `
        <div class="filter-bar">
            <div class="filter-bar-left">
                <span style="font-weight:700; font-size:16px;">Executive Performance & Profitability</span>
            </div>
            <div class="filter-bar-right">
                <!-- Print Statement removed -->
            </div>
        </div>

        <!-- Profit Calculation Card Banner -->
        <div class="card" style="background: linear-gradient(135deg, #4338CA, #3730A3); color:#fff; margin-bottom:24px;">
            <div class="card-body" style="display:flex; justify-content:space-around; align-items:center; padding:28px 20px; text-align:center;">
                <div>
                    <div style="font-size:12px; opacity:0.85; text-transform:uppercase;">Gross Collections</div>
                    <div style="font-size:24px; font-weight:800;">${currency}${(analytics.rentCollected || 0).toLocaleString()}</div>
                </div>
                <div style="font-size:26px; opacity:0.6;">-</div>
                <div>
                    <div style="font-size:12px; opacity:0.85; text-transform:uppercase;">Operational Expenses</div>
                    <div style="font-size:24px; font-weight:800; color:#FCD34D;">${currency}${(analytics.monthExpenses || 0).toLocaleString()}</div>
                </div>
                <div style="font-size:26px; opacity:0.6;">=</div>
                <div>
                    <div style="font-size:12px; opacity:0.85; text-transform:uppercase;">Net Operating Profit</div>
                    <div style="font-size:28px; font-weight:800; color:#34D399;">${currency}${(analytics.netProfit || 0).toLocaleString()}</div>
                    <div style="font-size:11.5px; opacity:0.9; margin-top:2px;">Profit Margin: ${analytics.profitMargin || 0}%</div>
                </div>
            </div>
        </div>
        
        <!-- Property-wise Performance Table -->
        ${window.db.selectedPropertyId === 'all' ? `
        <div class="card" style="margin-bottom:24px;">
            <div class="card-header">
                <h3 class="card-title">Property-wise Comparison & Yields</h3>
            </div>
            <div class="card-body" style="padding:0;">
                <div class="table-container">
                    <table class="data-table" style="table-layout: fixed; width: 100%;">
                        <thead>
                            <tr>
                                <th>Property Name</th>
                                <th>Total Capacity</th>
                                <th>Occupancy</th>
                                <th>Rent Collected</th>
                                <th>Expenses</th>
                                <th>Net Profit</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${(analytics.propertyComparison || []).map(p => `
                                <tr>
                                    <td><strong>${p.name}</strong></td>
                                    <td>${p.occupiedBeds} / ${p.totalBeds} Beds</td>
                                    <td>
                                        <div style="display:flex; align-items:center; gap:8px;">
                                            <div style="background:#E2E8F0; height:6px; border-radius:3px; overflow:hidden; width:80px;">
                                                <div style="background:var(--primary); height:100%; width:${p.occupancyRate}%;"></div>
                                            </div>
                                            <span style="font-weight:600; width:36px; text-align:right;">${p.occupancyRate}%</span>
                                        </div>
                                    </td>
                                    <td style="color:var(--primary); font-weight:600;">₹${p.collected.toLocaleString()}</td>
                                    <td style="color:var(--warning-text);">₹${p.expenses.toLocaleString()}</td>
                                    <td style="font-weight:700; color:var(--success-text);">₹${p.netProfit.toLocaleString()}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
        ` : ''}


    
        <!-- Statements & Reports -->
        <h3 style="font-size:16px; margin-bottom:16px; margin-top:24px;">Statements & Reports</h3>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin-bottom: 32px;">
            
            <!-- Payment Statement Card -->
            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">Payment Statement</h3>
                </div>
                <div class="card-body">
                    <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 16px;">Download complete rent collection and payment records.</p>
                    <div style="display: flex; flex-direction: column; gap: 12px; margin-bottom: 20px;">
                        <div>
                            <label style="display:block; font-size:12px; font-weight:600; color:var(--text-muted); margin-bottom:4px;">Month / Year</label>
                            <select id="report-payment-month" class="form-control" style="border: 1.5px solid var(--primary);">
                                <option value="2026-09">September 2026</option>
                                <option value="2026-08">August 2026</option>
                                <option value="2026-07">July 2026</option>
                                <option value="2026-06">June 2026</option>
                                <option value="2026-05">May 2026</option>
                                <option value="2026-04">April 2026</option>
                            </select>
                        </div>
                        <div>
                            <label style="display:block; font-size:12px; font-weight:600; color:var(--text-muted); margin-bottom:4px;">Property</label>
                            <select id="report-payment-property" class="form-control" style="border: 1.5px solid var(--primary);">
                                <option value="all">All Properties</option>
                                ${window.db.get('properties').map(p => `<option value="${p.id}">${p.name}</option>`).join('')}
                            </select>
                        </div>
                    </div>
                    <button class="btn btn-primary" style="width: 100%; display: flex; justify-content: center; gap: 8px;" onclick="downloadPaymentStatement()">
                        <i data-lucide="download" style="width:16px; height:16px;"></i> Download Excel
                    </button>
                </div>
            </div>

            <!-- Occupancy & Resident Statement Card -->
            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">Occupancy & Resident Statement</h3>
                </div>
                <div class="card-body">
                    <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 16px;">Download complete room occupancy and resident information.</p>
                    <div style="display: flex; flex-direction: column; gap: 12px; margin-bottom: 20px;">
                        <div>
                            <label style="display:block; font-size:12px; font-weight:600; color:var(--text-muted); margin-bottom:4px;">Property</label>
                            <select id="report-occ-property" class="form-control" style="border: 1.5px solid var(--primary);" onchange="updateReportFloorDropdown(this.value)">
                                <option value="all">All Properties</option>
                                ${window.db.get('properties').map(p => `<option value="${p.id}">${p.name}</option>`).join('')}
                            </select>
                        </div>
                        <div>
                            <label style="display:block; font-size:12px; font-weight:600; color:var(--text-muted); margin-bottom:4px;">Floor</label>
                            <select id="report-occ-floor" class="form-control" style="border: 1.5px solid var(--primary);" disabled>
                                <option value="all">All Floors</option>
                            </select>
                        </div>
                    </div>
                    <button class="btn btn-primary" style="width: 100%; display: flex; justify-content: center; gap: 8px;" onclick="downloadOccupancyStatement()">
                        <i data-lucide="download" style="width:16px; height:16px;"></i> Download Excel
                    </button>
                </div>
            </div>
            
        </div>
`;
}

// =========================================================================
// MODALS & WORKFLOWS CONTROLLERS
// =========================================================================

// --- 1. Property Modal ---
function openPropertyModal() {
    const modal = document.getElementById('modal-container');
    modal.innerHTML = `
        <div class="modal-backdrop" onclick="closeModal(event)">
            <div class="modal-dialog">
                <div class="modal-header">
                    <h3 class="modal-title">Add New PG Property</h3>
                    <button class="modal-close-btn" onclick="closeModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <form id="form-add-property" onsubmit="submitAddProperty(event)">
                        <div class="form-grid">
                            <div class="form-group col-span-2">
                                <label class="form-label">Property Name *</label>
                                <input type="text" name="name" class="form-input" placeholder="e.g. Urban Stays - Whitefield" required>
                            </div>
                            <div class="form-group col-span-2">
                                <label class="form-label">Full Address *</label>
                                <input type="text" name="address" class="form-input" placeholder="Street, landmark, locality" required>
                            </div>
                            <div class="form-group">
                                <label class="form-label">City</label>
                                <input type="text" name="city" class="form-input" value="Bengaluru">
                            </div>
                            <div class="form-group">
                                <label class="form-label">PG Type</label>
                                <select name="pgType" class="form-input">
                                    <option value="Coliving">Coliving</option>
                                    <option value="Boys">Boys</option>
                                    <option value="Girls">Girls</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Floors Count</label>
                                <input type="number" id="prop-floors" name="floors" class="form-input" value="3" min="1" oninput="generateFloorInputs()">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Total Rooms</label>
                                <input type="number" id="prop-total-rooms" name="rooms" class="form-input" value="0" readonly style="background:#f9fafb; cursor:not-allowed; font-weight:bold;">
                            </div>
                            <div class="form-group col-span-2" id="floor-rooms-container" style="display:grid; grid-template-columns: repeat(auto-fit, minmax(80px, 1fr)); gap:10px; background:var(--bg-main); padding:12px; border-radius:8px;">
                                <!-- dynamically generated -->
                            </div>
                            <div class="form-group col-span-2">
                                <label class="form-label">Default Security Deposit (₹)</label>
                                <input type="number" name="securityDeposit" class="form-input" value="15000">
                            </div>
                            <div class="form-group col-span-2">
                                <label class="form-label">Rules & Guidelines</label>
                                <textarea name="rules" class="form-textarea" placeholder="Gate closing time, visitor rules, smoking policies..."></textarea>
                            </div>
                        </div>
                        <div class="modal-footer" style="padding:16px 0 0 0; margin-top:16px; background:none;">
                            <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
                            <button type="submit" class="btn btn-primary">Create Property</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;
    lucide.createIcons();

    // Generate initial floor inputs
    window.generateFloorInputs = function() {
        const floors = parseInt(document.getElementById('prop-floors').value) || 0;
        const container = document.getElementById('floor-rooms-container');
        if (!container) return;
        
        container.innerHTML = '';
        
        for (let i = 1; i <= floors; i++) {
            container.innerHTML += `
                <div>
                    <label style="font-size:11px; color:var(--text-muted); display:block; margin-bottom:4px; font-weight:600;">Floor ${i}</label>
                    <input type="number" class="form-input floor-room-input" min="0" value="0" oninput="calculateTotalRooms()" placeholder="Rooms" style="text-align:center;">
                </div>
            `;
        }
        calculateTotalRooms();
    };

    window.calculateTotalRooms = function() {
        const inputs = document.querySelectorAll('.floor-room-input');
        let total = 0;
        inputs.forEach(input => {
            total += parseInt(input.value) || 0;
        });
        const totalRoomsInput = document.getElementById('prop-total-rooms');
        if (totalRoomsInput) {
            totalRoomsInput.value = total;
        }
    };

    // Run once to initialize
    setTimeout(() => {
        if(document.getElementById('prop-floors')) {
            generateFloorInputs();
        }
    }, 50);
}

async function submitAddProperty(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());
    try {
        await window.db.addProperty(data);
        closeModal();
        showToast('Property created successfully!');
    } catch (err) {
        alert(err.message);
    }
}

// --- 2. Add Room Modal ---
function openAddRoomModal() {
    const properties = window.db.get('properties');
    const modal = document.getElementById('modal-container');
    modal.innerHTML = `
        <div class="modal-backdrop" onclick="closeModal(event)">
            <div class="modal-dialog">
                <div class="modal-header">
                    <h3 class="modal-title">Configure & Add Room</h3>
                    <button class="modal-close-btn" onclick="closeModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <form id="form-add-room" onsubmit="submitAddRoom(event)">
                        <div class="form-grid">
                            <div class="form-group">
                                <label class="form-label">Room Number *</label>
                                <input type="text" name="roomNumber" class="form-input" placeholder="e.g. 101, 204" required>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Floor</label>
                                <input type="number" name="floor" class="form-input" value="1" min="0">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Room Type</label>
                                <select name="type" class="form-select" id="room-type-select" onchange="updateBedsByRoomType(this.value)">
                                    <option value="Single Sharing">Single Sharing (1 Bed)</option>
                                    <option value="Double Sharing" selected>Double Sharing (2 Beds)</option>
                                    <option value="Triple Sharing">Triple Sharing (3 Beds)</option>
                                    <option value="Four Sharing">Four Sharing (4 Beds)</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Total Beds</label>
                                <input type="number" name="totalBeds" id="room-beds-input" class="form-input" value="2" min="1" max="6">
                            </div>
                            <div class="form-group col-span-2">
                                <label class="form-label">Rent Per Bed / Month (₹) *</label>
                                <input type="number" name="rentPerBed" class="form-input" value="8500" required>
                            </div>
                        </div>
                        <div class="modal-footer" style="padding:16px 0 0 0; margin-top:16px; background:none;">
                            <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
                            <button type="submit" class="btn btn-primary">Create Room & Auto-generate Beds</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;
    lucide.createIcons();
}

function updateBedsByRoomType(type) {
    const bedsInput = document.getElementById('room-beds-input');
    if (!bedsInput) return;
    if (type.includes('Single')) bedsInput.value = 1;
    else if (type.includes('Double')) bedsInput.value = 2;
    else if (type.includes('Triple')) bedsInput.value = 3;
    else if (type.includes('Four')) bedsInput.value = 4;
}

async function submitAddRoom(e) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target).entries());
    data.propertyId = window.state.currentPropertyId;
    try {
        await window.db.addRoom(data);
        closeModal();
        showToast('Room and beds created successfully!');
    } catch (err) {
        alert(err.message);
    }
}

// --- 3. Resident Onboarding & KYC Modal (Rule 2: Bed becomes Occupied) ---
function openOnboardResidentModal(prePropId, preRoomId, preBedId) {
    const properties = window.db.get('properties');
    const beds = window.db.get('beds');
    const availableBeds = beds.filter(b => b.status === 'Available');

    const modal = document.getElementById('modal-container');
    modal.innerHTML = `
        <div class="modal-backdrop" onclick="closeModal(event)">
            <div class="modal-dialog modal-lg">
                <div class="modal-header">
                    <div>
                        <h3 class="modal-title">Resident Onboarding & KYC Verification</h3>
                        <span style="font-size:11.5px; color:var(--text-muted);">Allocating a room/bed automatically marks it as Occupied</span>
                    </div>
                    <button class="modal-close-btn" onclick="closeModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <form id="form-onboard-resident" onsubmit="submitOnboardResident(event)">
                        <h4 style="font-size:13px; font-weight:700; margin-bottom:12px; color:var(--primary); text-transform:uppercase;">1. Personal Information</h4>
                        <div class="form-grid" style="margin-bottom:20px;">
                            <div class="form-group">
                                <label class="form-label">Full Name *</label>
                                <input type="text" name="name" class="form-input" placeholder="e.g. Siddharth Rao" required>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Phone Number *</label>
                                <input type="tel" name="phone" class="form-input" placeholder="+91 9876543210" required>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Email Address</label>
                                <input type="email" name="email" class="form-input" placeholder="siddharth@example.com">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Gender</label>
                                <select name="gender" class="form-select">
                                    <option value="Male">Male</option>
                                    <option value="Female">Female</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                            <div class="form-group col-span-2">
                                <label class="form-label">Permanent / Current Address</label>
                                <input type="text" name="currentAddress" class="form-input" placeholder="Full home address">
                            </div>
                        </div>

                        <h4 style="font-size:13px; font-weight:700; margin-bottom:12px; color:var(--primary); text-transform:uppercase;">2. Room & Bed Allocation</h4>
                        <div class="form-grid" style="margin-bottom:20px;">
                            <div class="form-group col-span-2">
                                <label class="form-label">Select Available Bed *</label>
                                <select name="bedId" id="onboard-bed-select" class="form-select" onchange="handleOnboardBedSelect(this)" required>
                                    <option value="">-- Choose Available Bed --</option>
                                    ${availableBeds.map(b => `
                                        <option value="${b.id}" data-prop="${b.propertyId}" data-room="${b.roomId}" data-rent="${b.rentPerBed || 8000}" ${preBedId === b.id ? 'selected' : ''}>
                                            ${b.propertyName} • Room ${b.roomNumber} (${b.roomType}) - ${b.name} [₹${(b.rentPerBed || 8000).toLocaleString()}/mo]
                                        </option>
                                    `).join('')}
                                </select>
                            </div>
                            <input type="hidden" name="propertyId" id="onboard-prop-id" value="${prePropId || ''}">
                            <input type="hidden" name="roomId" id="onboard-room-id" value="${preRoomId || ''}">

                            <div class="form-group">
                                <label class="form-label">Joining Date</label>
                                <input type="date" name="joiningDate" class="form-input" value="${new Date().toISOString().split('T')[0]}">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Agreed Monthly Rent (₹) *</label>
                                <input type="number" name="monthlyRent" id="onboard-rent-input" class="form-input" value="8500" required>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Security Deposit (₹)</label>
                                <input type="number" name="securityDeposit" id="onboard-deposit-input" class="form-input" value="17000">
                            </div>
                        </div>

                        <h4 style="font-size:13px; font-weight:700; margin-bottom:12px; color:var(--primary); text-transform:uppercase;">3. KYC & Emergency Contact</h4>
                        <div class="form-grid">
                            <div class="form-group">
                                <label class="form-label">ID Proof Type</label>
                                <select name="idProofType" class="form-select">
                                    <option value="Aadhaar">Aadhaar Card (UIDAI)</option>
                                    <option value="Passport">Passport</option>
                                    <option value="PAN Card">PAN Card</option>
                                    <option value="Driving License">Driving License</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label class="form-label">ID Document Number</label>
                                <input type="text" name="idProofNumber" class="form-input" placeholder="e.g. 12-digit Aadhaar / Passport #">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Emergency Contact Name</label>
                                <input type="text" name="emergencyContactName" class="form-input" placeholder="Parent / Guardian / Sibling">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Emergency Contact Phone</label>
                                <input type="tel" name="emergencyContactPhone" class="form-input" placeholder="+91 9876543210">
                            </div>
                            <div class="form-group">
                                <label class="form-label">KYC Verification Status</label>
                                <select name="kycStatus" class="form-select">
                                    <option value="Verified">Verified (Documents Checked)</option>
                                    <option value="Pending" selected>Pending Verification</option>
                                    <option value="Rejected">Rejected</option>
                                </select>
                            </div>
                        </div>

                        <div class="modal-footer" style="padding:16px 0 0 0; margin-top:20px; background:none;">
                            <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
                            <button type="submit" class="btn btn-primary">Complete Onboarding & Allocate Bed</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;
    lucide.createIcons();

    // Trigger initial select if pre-selected
    const sel = document.getElementById('onboard-bed-select');
    if (sel && sel.value) handleOnboardBedSelect(sel);
}

function handleOnboardBedSelect(selectElem) {
    const opt = selectElem.options[selectElem.selectedIndex];
    if (!opt) return;
    document.getElementById('onboard-prop-id').value = opt.dataset.prop || '';
    document.getElementById('onboard-room-id').value = opt.dataset.room || '';
    const rent = parseInt(opt.dataset.rent) || 8000;
    document.getElementById('onboard-rent-input').value = rent;
    document.getElementById('onboard-deposit-input').value = rent * 2;
}

async function submitOnboardResident(e) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target).entries());
    try {
        await window.db.addResident(data);
        closeModal();
        showToast('Resident onboarded and bed marked as Occupied!');
    } catch (err) {
        alert(err.message);
    }
}

// --- 4. Room Transfer Modal (Rule 4: Release old bed, occupy new bed) ---
function openTransferModal(residentId) {
    const res = window.db.get('residents').find(r => r.id === residentId);
    if (!res) return;
    const availableBeds = window.db.get('beds').filter(b => b.status === 'Available');

    const modal = document.getElementById('modal-container');
    modal.innerHTML = `
        <div class="modal-backdrop" onclick="closeModal(event)">
            <div class="modal-dialog">
                <div class="modal-header">
                    <h3 class="modal-title">Room & Bed Transfer</h3>
                    <button class="modal-close-btn" onclick="closeModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <div style="background:var(--bg-main); padding:12px; border-radius:8px; margin-bottom:18px;">
                        <div style="font-weight:700;">${res.name}</div>
                        <div style="font-size:12px; color:var(--text-muted);">Current: Room ${res.roomNumber || '-'}, ${res.bedName || '-'} (${res.propertyName})</div>
                    </div>

                    <form onsubmit="submitRoomTransfer(event, '${res.id}')">
                        <div class="form-group" style="margin-bottom:18px;">
                            <label class="form-label">Select Destination Available Bed *</label>
                            <select name="bedId" id="transfer-bed-select" class="form-select" required>
                                <option value="">-- Choose Available Bed --</option>
                                ${availableBeds.map(b => `
                                    <option value="${b.id}" data-room="${b.roomId}">
                                        ${b.propertyName} • Room ${b.roomNumber} - ${b.name} (${b.roomType})
                                    </option>
                                `).join('')}
                            </select>
                        </div>
                        <div class="modal-footer" style="padding:16px 0 0 0; background:none;">
                            <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
                            <button type="submit" class="btn btn-primary">Transfer & Update Allocation</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;
    lucide.createIcons();
}

async function submitRoomTransfer(e, resId) {
    e.preventDefault();
    const sel = document.getElementById('transfer-bed-select');
    const bedId = sel.value;
    const roomId = sel.options[sel.selectedIndex].dataset.room;

    try {
        await window.db.transferResident(resId, roomId, bedId);
        closeModal();
        showToast('Room transfer completed! Old bed released to Available.');
    } catch (err) {
        alert(err.message);
    }
}

// --- 5. Resident Checkout Modal (Rule 3 & Section 10: Auto-release bed to Available) ---
function openCheckoutModal(residentId) {
    const res = window.db.get('residents').find(r => r.id === residentId);
    if (!res) return;

    // Calculate pending rent dues for this resident
    const residentPayments = window.db.get('payments').filter(p => p.residentId === residentId);
    const pendingRent = residentPayments.reduce((acc, p) => acc + (p.amountExpected - p.amountPaid), 0);
    const deposit = res.securityDeposit || (res.monthlyRent * 2);

    const modal = document.getElementById('modal-container');
    modal.innerHTML = `
        <div class="modal-backdrop" onclick="closeModal(event)">
            <div class="modal-dialog">
                <div class="modal-header">
                    <div>
                        <h3 class="modal-title">Resident Checkout Settlement</h3>
                        <span style="font-size:11.5px; color:var(--text-muted);">Completing checkout automatically releases the bed to Available</span>
                    </div>
                    <button class="modal-close-btn" onclick="closeModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <form id="form-checkout" onsubmit="submitResidentCheckout(event, '${res.id}')">
                        <div style="background:var(--bg-main); padding:14px; border-radius:8px; margin-bottom:18px;">
                            <div style="font-weight:700; font-size:14px;">${res.name}</div>
                            <div style="font-size:12px; color:var(--text-muted);">${res.propertyName} • Room ${res.roomNumber}, ${res.bedName}</div>
                            <div style="font-size:12px; color:var(--text-muted); margin-top:4px;">Joined: ${res.joiningDate} • Security Deposit: ₹${deposit.toLocaleString()}</div>
                        </div>

                        <div class="form-grid">
                            <div class="form-group">
                                <label class="form-label">Notice Date</label>
                                <input type="date" name="noticeDate" class="form-input" value="${new Date(Date.now() - 30*24*60*60*1000).toISOString().split('T')[0]}">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Actual Checkout Date</label>
                                <input type="date" name="checkoutDate" class="form-input" value="${new Date().toISOString().split('T')[0]}">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Pending Rent Dues (₹)</label>
                                <input type="number" name="pendingDues" id="chk-pending-dues" class="form-input" value="${pendingRent}" oninput="recalcCheckoutSettlement(${deposit})">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Damage / Repair Deduction (₹)</label>
                                <input type="number" name="damageDeduction" id="chk-damage" class="form-input" value="0" oninput="recalcCheckoutSettlement(${deposit})">
                            </div>
                            <div class="form-group col-span-2">
                                <label class="form-label">Other Utilities / Miscellaneous Dues (₹)</label>
                                <input type="number" name="otherDues" id="chk-other" class="form-input" value="0" oninput="recalcCheckoutSettlement(${deposit})">
                            </div>
                            <div class="form-group col-span-2">
                                <label class="form-label">Remarks & Handover Notes</label>
                                <textarea name="remarks" class="form-textarea" placeholder="Keys received, room inspection passed, AC remote returned..."></textarea>
                            </div>
                        </div>

                        <!-- Settlement Summary Box -->
                        <div style="background:var(--success-bg); border:1px solid var(--success-border); padding:16px; border-radius:8px; margin-top:18px;">
                            <div style="display:flex; justify-content:space-between; font-size:12.5px; margin-bottom:6px;">
                                <span>Total Security Deposit:</span>
                                <strong>₹${deposit.toLocaleString()}</strong>
                            </div>
                            <div style="display:flex; justify-content:space-between; font-size:12.5px; margin-bottom:6px; color:var(--danger);">
                                <span>Total Deductions:</span>
                                <strong id="chk-total-deductions">₹${pendingRent.toLocaleString()}</strong>
                            </div>
                            <div style="display:flex; justify-content:space-between; font-size:15px; font-weight:800; border-top:1px solid var(--success-border); padding-top:8px; color:var(--success-text);">
                                <span>Refundable Settlement:</span>
                                <span id="chk-final-refund">₹${Math.max(0, deposit - pendingRent).toLocaleString()}</span>
                            </div>
                        </div>

                        <div class="modal-footer" style="padding:16px 0 0 0; margin-top:20px; background:none;">
                            <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
                            <button type="submit" class="btn btn-danger">Confirm Checkout & Release Bed</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;
    lucide.createIcons();
}

function recalcCheckoutSettlement(deposit) {
    const pending = parseInt(document.getElementById('chk-pending-dues')?.value) || 0;
    const damage = parseInt(document.getElementById('chk-damage')?.value) || 0;
    const other = parseInt(document.getElementById('chk-other')?.value) || 0;
    const totalDeductions = pending + damage + other;
    const refundable = Math.max(0, deposit - totalDeductions);

    document.getElementById('chk-total-deductions').textContent = `₹${totalDeductions.toLocaleString()}`;
    document.getElementById('chk-final-refund').textContent = `₹${refundable.toLocaleString()}`;
}

async function submitResidentCheckout(e, resId) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target).entries());
    try {
        await window.db.checkoutResident(resId, data);
        closeModal();
        showToast('Resident checked out successfully! Bed is now Available.');
    } catch (err) {
        alert(err.message);
    }
}

// --- 6. Record Payment Modal & Printable Receipt Modal ---
function openRecordPaymentModal(prePaymentId, defaultAmount) {
    const payments = window.db.get('payments');
    const unpaidPayments = payments.filter(p => p.status !== 'Paid');

    const modal = document.getElementById('modal-container');
    modal.innerHTML = `
        <div class="modal-backdrop" onclick="closeModal(event)">
            <div class="modal-dialog">
                <div class="modal-header">
                    <h3 class="modal-title">Record Rent Payment Collection</h3>
                    <button class="modal-close-btn" onclick="closeModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <form onsubmit="submitRecordPayment(event)">
                        <div class="form-group" style="margin-bottom:14px;">
                            <label class="form-label">Select Pending Rent Invoice *</label>
                            <select name="paymentId" id="pay-record-select" class="form-select" onchange="handleRecordPaySelect(this)" required>
                                <option value="">-- Choose Invoice --</option>
                                ${unpaidPayments.map(p => `
                                    <option value="${p.id}" data-due="${p.amountExpected - p.amountPaid}" ${prePaymentId === p.id ? 'selected' : ''}>
                                        ${p.residentName} (${p.propertyName} Rm ${p.roomNumber}) • ${p.month} [Pending: ₹${(p.amountExpected - p.amountPaid).toLocaleString()}]
                                    </option>
                                `).join('')}
                            </select>
                        </div>

                        <div class="form-grid">
                            <div class="form-group">
                                <label class="form-label">Amount Paid (₹) *</label>
                                <input type="number" name="amountPaid" id="pay-record-amount" class="form-input" value="${defaultAmount || 8000}" required min="1">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Payment Mode</label>
                                <select name="paymentMode" class="form-select">
                                    <option value="UPI">UPI (GPay / PhonePe / Paytm)</option>
                                    <option value="Cash">Cash</option>
                                    <option value="Bank Transfer">Bank Transfer / IMPS / NEFT</option>
                                    <option value="Card">Debit / Credit Card</option>
                                </select>
                            </div>
                            <div class="form-group col-span-2">
                                <label class="form-label">Transaction Reference Number</label>
                                <input type="text" name="referenceNumber" class="form-input" placeholder="e.g. UPI Ref # or Bank Txn ID">
                            </div>
                            <div class="form-group col-span-2">
                                <label class="form-label">Notes</label>
                                <input type="text" name="notes" class="form-input" value="Monthly rent payment received">
                            </div>
                        </div>

                        <div class="modal-footer" style="padding:16px 0 0 0; margin-top:20px; background:none;">
                            <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
                            <button type="submit" class="btn btn-primary">Record Payment & Generate Receipt</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;
    lucide.createIcons();
}

function handleRecordPaySelect(selectElem) {
    const opt = selectElem.options[selectElem.selectedIndex];
    if (opt && opt.dataset.due) {
        document.getElementById('pay-record-amount').value = opt.dataset.due;
    }
}

async function submitRecordPayment(e) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target).entries());
    try {
        const result = await window.db.recordPayment(data.paymentId, data.amountPaid, data.paymentMode, data.referenceNumber, data.notes);
        closeModal();
        showToast('Payment recorded successfully!');
        if (result.receiptNumber) {
            openReceiptModal(data.paymentId);
        }
    } catch (err) {
        alert(err.message);
    }
}

function openReceiptModal(paymentId) {
    const pay = window.db.get('payments').find(p => p.id === paymentId);
    if (!pay) return;
    const settings = window.db.get('settings') || {};

    const modal = document.getElementById('modal-container');
    modal.innerHTML = `
        <div class="modal-backdrop" onclick="closeModal(event)">
            <div class="modal-dialog">
                <div class="modal-header">
                    <h3 class="modal-title">Rent Payment Receipt</h3>
                    <button class="modal-close-btn" onclick="closeModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="receipt-box" id="printable-receipt">
                        <div class="receipt-header">
                            <h2 style="font-size:18px; font-weight:800; color:var(--primary);">${settings.companyName || 'Urban Stays PG'}</h2>
                            <p style="font-size:11.5px; color:var(--text-muted);">${settings.address || 'Bengaluru, Karnataka'}</p>
                            <p style="font-size:11.5px; color:var(--text-muted);">Phone: ${settings.phone || '+91 9876543210'}</p>
                            <div style="margin-top:10px; font-weight:700; font-size:13px; color:var(--text-main);">
                                RECEIPT NO: ${pay.receiptNumber || 'REC-2026-001'}
                            </div>
                        </div>

                        <div class="receipt-row">
                            <span style="color:var(--text-muted);">Resident Name</span>
                            <strong>${pay.residentName}</strong>
                        </div>
                        <div class="receipt-row">
                            <span style="color:var(--text-muted);">Property</span>
                            <span>${pay.propertyName}</span>
                        </div>
                        <div class="receipt-row">
                            <span style="color:var(--text-muted);">Room & Bed</span>
                            <span>Room ${pay.roomNumber}, ${pay.bedName}</span>
                        </div>
                        <div class="receipt-row">
                            <span style="color:var(--text-muted);">Billing Month</span>
                            <span>${pay.month}</span>
                        </div>
                        <div class="receipt-row">
                            <span style="color:var(--text-muted);">Payment Date</span>
                            <span>${pay.paidDate || 'Today'}</span>
                        </div>
                        <div class="receipt-row">
                            <span style="color:var(--text-muted);">Payment Mode</span>
                            <span>${pay.paymentMode || 'UPI'}</span>
                        </div>
                        <div class="receipt-row">
                            <span style="color:var(--text-muted);">Txn Reference #</span>
                            <span>${pay.referenceNumber || '-'}</span>
                        </div>
                        <div class="receipt-row total">
                            <span>Amount Paid</span>
                            <span style="color:var(--primary);">₹${(pay.amountPaid || 0).toLocaleString()}</span>
                        </div>
                    </div>

                    <div class="modal-footer" style="padding:16px 0 0 0; margin-top:20px; background:none;">
                        <button type="button" class="btn btn-secondary" onclick="closeModal(); openEditResidentModal('${res.id}')"><i data-lucide="edit" style="width:16px;height:16px; margin-right:6px; vertical-align:middle;"></i> Edit</button>
                        <button type="button" class="btn btn-primary" onclick="window.print()"><i data-lucide="printer"></i> Print Receipt</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    lucide.createIcons();
}

// --- 7. Convert Lead to Resident Modal ---
function openConvertLeadModal(leadId) {
    const lead = window.db.get('leads').find(l => l.id === leadId);
    if (!lead) return;
    const availableBeds = window.db.get('beds').filter(b => b.status === 'Available');

    const modal = document.getElementById('modal-container');
    modal.innerHTML = `
        <div class="modal-backdrop" onclick="closeModal(event)">
            <div class="modal-dialog">
                <div class="modal-header">
                    <div>
                        <h3 class="modal-title">Convert Lead to Resident</h3>
                        <span style="font-size:11.5px; color:var(--text-muted);">Auto-creates resident, allocates bed, and sets bed to Occupied</span>
                    </div>
                    <button class="modal-close-btn" onclick="closeModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <div style="background:var(--bg-main); padding:12px; border-radius:8px; margin-bottom:18px;">
                        <div style="font-weight:700;">${lead.name} (${lead.phone})</div>
                        <div style="font-size:12px; color:var(--text-muted);">Prefers: ${lead.preferredRoomType || 'Double'} • Budget: ₹${(lead.budget || 8000).toLocaleString()}</div>
                    </div>

                    <form onsubmit="submitConvertLead(event, '${lead.id}')">
                        <div class="form-grid">
                            <div class="form-group col-span-2">
                                <label class="form-label">Allocate Available Bed *</label>
                                <select name="bedId" id="conv-bed-select" class="form-select" required>
                                    <option value="">-- Choose Available Bed --</option>
                                    ${availableBeds.map(b => `
                                        <option value="${b.id}" data-room="${b.roomId}" data-rent="${b.rentPerBed || lead.budget || 8000}">
                                            ${b.propertyName} • Room ${b.roomNumber} - ${b.name} (${b.roomType})
                                        </option>
                                    `).join('')}
                                </select>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Move-in / Joining Date</label>
                                <input type="date" name="joiningDate" class="form-input" value="${lead.moveInDate || new Date().toISOString().split('T')[0]}">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Monthly Rent (₹)</label>
                                <input type="number" name="monthlyRent" class="form-input" value="${lead.budget || 8500}">
                            </div>
                        </div>

                        <div class="modal-footer" style="padding:16px 0 0 0; margin-top:20px; background:none;">
                            <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
                            <button type="submit" class="btn btn-success">Confirm Booking & Onboard</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;
    lucide.createIcons();
}

async function submitConvertLead(e, leadId) {
    e.preventDefault();
    const sel = document.getElementById('conv-bed-select');
    const bedId = sel.value;
    const roomId = sel.options[sel.selectedIndex].dataset.room;
    const formData = new FormData(e.target);

    try {
        await window.db.convertLead(leadId, {
            roomId,
            bedId,
            joiningDate: formData.get('joiningDate'),
            monthlyRent: formData.get('monthlyRent')
        });
        closeModal();
        showToast('Lead converted to resident and bed marked as Occupied!');
    } catch (err) {
        alert(err.message);
    }
}

// --- 8. Lead Creation Modal ---
function openLeadModal() {
    const properties = window.db.get('properties');
    const modal = document.getElementById('modal-container');
    modal.innerHTML = `
        <div class="modal-backdrop" onclick="closeModal(event)">
            <div class="modal-dialog">
                <div class="modal-header">
                    <h3 class="modal-title">Record Potential Resident Enquiry</h3>
                    <button class="modal-close-btn" onclick="closeModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <form onsubmit="submitAddLead(event)">
                        <div class="form-grid">
                            <div class="form-group">
                                <label class="form-label">Full Name *</label>
                                <input type="text" name="name" class="form-input" placeholder="e.g. Rahul Verma" required>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Phone Number *</label>
                                <input type="tel" name="phone" class="form-input" placeholder="+91 9876543210" required>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Email Address</label>
                                <input type="email" name="email" class="form-input" placeholder="rahul@gmail.com">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Target Property</label>
                                <select name="propertyId" class="form-select">
                                    ${properties.map(p => `<option value="${p.id}">${p.name}</option>`).join('')}
                                </select>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Preferred Room Type</label>
                                <select name="preferredRoomType" class="form-select">
                                    <option value="Single Sharing">Single Sharing</option>
                                    <option value="Double Sharing" selected>Double Sharing</option>
                                    <option value="Triple Sharing">Triple Sharing</option>
                                    <option value="Four Sharing">Four Sharing</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Budget (₹)</label>
                                <input type="number" name="budget" class="form-input" value="8500">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Expected Move-in Date</label>
                                <input type="date" name="moveInDate" class="form-input" value="${new Date().toISOString().split('T')[0]}">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Enquiry Source</label>
                                <select name="source" class="form-select">
                                    <option value="Website">Website</option>
                                    <option value="Walk-in">Walk-in</option>
                                    <option value="Referral">Friend / Referral</option>
                                    <option value="Social Media">Social Media (Instagram/FB)</option>
                                    <option value="Google Maps">Google Maps</option>
                                </select>
                            </div>
                            <div class="form-group col-span-2">
                                <label class="form-label">Notes & Requirements</label>
                                <textarea name="notes" class="form-textarea" placeholder="Work location, parking requirement, food preference..."></textarea>
                            </div>
                        </div>
                        <div class="modal-footer" style="padding:16px 0 0 0; margin-top:20px; background:none;">
                            <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
                            <button type="submit" class="btn btn-primary">Save Lead</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;
    lucide.createIcons();
}

async function submitAddLead(e) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target).entries());
    try {
        await window.db.addLead(data);
        closeModal();
        showToast('Enquiry recorded successfully!');
    } catch (err) {
        alert(err.message);
    }
}

// --- 9. Raise Complaint Modal ---
function openComplaintModal() {
    const properties = window.db.get('properties');
    const staff = window.db.get('staff');

    const modal = document.getElementById('modal-container');
    modal.innerHTML = `
        <div class="modal-backdrop" onclick="closeModal(event)">
            <div class="modal-dialog">
                <div class="modal-header">
                    <h3 class="modal-title">Raise Maintenance Complaint</h3>
                    <button class="modal-close-btn" onclick="closeModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <form onsubmit="submitAddComplaint(event)">
                        <div class="form-grid">
                            <div class="form-group col-span-2">
                                <label class="form-label">Issue Title *</label>
                                <input type="text" name="title" class="form-input" placeholder="e.g. Geyser tripping MCB in Room 204" required>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Property *</label>
                                <select name="propertyId" class="form-select" required>
                                    ${properties.map(p => `<option value="${p.id}">${p.name}</option>`).join('')}
                                </select>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Category</label>
                                <select name="category" class="form-select">
                                    <option value="Electricity">Electricity</option>
                                    <option value="Water">Water</option>
                                    <option value="Wi-Fi">Wi-Fi / Internet</option>
                                    <option value="Cleaning">Cleaning</option>
                                    <option value="Plumbing">Plumbing</option>
                                    <option value="Maintenance">General Maintenance</option>
                                    <option value="Food">Food / Kitchen</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Priority</label>
                                <select name="priority" class="form-select">
                                    <option value="High">High (Urgent)</option>
                                    <option value="Medium" selected>Medium</option>
                                    <option value="Low">Low</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Assign Staff Member</label>
                                <select name="assignedStaffId" class="form-select">
                                    <option value="">-- Unassigned --</option>
                                    ${staff.map(s => `<option value="${s.id}">${s.name} (${s.role})</option>`).join('')}
                                </select>
                            </div>
                            <div class="form-group col-span-2">
                                <label class="form-label">Description</label>
                                <textarea name="description" class="form-textarea" placeholder="Detailed problem description..."></textarea>
                            </div>
                        </div>
                        <div class="modal-footer" style="padding:16px 0 0 0; margin-top:20px; background:none;">
                            <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
                            <button type="submit" class="btn btn-primary">Create Ticket</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;
    lucide.createIcons();
}

async function submitAddComplaint(e) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target).entries());
    try {
        await window.db.addComplaint(data);
        closeModal();
        showToast('Complaint ticket raised successfully!');
    } catch (err) {
        alert(err.message);
    }
}

function openUpdateComplaintModal(compId) {
    const comp = window.db.get('complaints').find(c => c.id === compId);
    if (!comp) return;
    const staff = window.db.get('staff');

    const modal = document.getElementById('modal-container');
    modal.innerHTML = `
        <div class="modal-backdrop" onclick="closeModal(event)">
            <div class="modal-dialog">
                <div class="modal-header">
                    <h3 class="modal-title">Update Complaint #${comp.id}</h3>
                    <button class="modal-close-btn" onclick="closeModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <div style="background:var(--bg-main); padding:12px; border-radius:8px; margin-bottom:18px;">
                        <div style="font-weight:700;">${comp.title}</div>
                        <div style="font-size:12px; color:var(--text-muted);">${comp.category} • Priority: ${comp.priority}</div>
                    </div>

                    <form onsubmit="submitUpdateComplaint(event, '${comp.id}')">
                        <div class="form-group" style="margin-bottom:14px;">
                            <label class="form-label">Status</label>
                            <select name="status" class="form-select">
                                <option value="Pending" ${comp.status === 'Pending' ? 'selected' : ''}>Pending</option>
                                <option value="Assigned" ${comp.status === 'Assigned' ? 'selected' : ''}>Assigned</option>
                                <option value="In Progress" ${comp.status === 'In Progress' ? 'selected' : ''}>In Progress</option>
                                <option value="Resolved" ${comp.status === 'Resolved' ? 'selected' : ''}>Resolved</option>
                            </select>
                        </div>
                        <div class="form-group" style="margin-bottom:14px;">
                            <label class="form-label">Assigned Staff</label>
                            <select name="assignedStaffId" class="form-select">
                                <option value="">-- Unassigned --</option>
                                ${staff.map(s => `<option value="${s.id}" ${comp.assignedStaffId === s.id ? 'selected' : ''}>${s.name} (${s.role})</option>`).join('')}
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Resolution Notes</label>
                            <textarea name="resolutionNotes" class="form-textarea" placeholder="Actions taken to resolve the issue...">${comp.resolutionNotes || ''}</textarea>
                        </div>
                        <div class="modal-footer" style="padding:16px 0 0 0; margin-top:20px; background:none;">
                            <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
                            <button type="submit" class="btn btn-primary">Update Complaint</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;
    lucide.createIcons();
}

async function submitUpdateComplaint(e, compId) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target).entries());
    try {
        await window.db.updateComplaint(compId, data);
        closeModal();
        showToast('Complaint ticket updated!');
    } catch (err) {
        alert(err.message);
    }
}

// --- 10. Operational Expenses Modal ---
function openExpenseModal() {
    const properties = window.db.get('properties');
    const modal = document.getElementById('modal-container');
    modal.innerHTML = `
        <div class="modal-backdrop" onclick="closeModal(event)">
            <div class="modal-dialog">
                <div class="modal-header">
                    <h3 class="modal-title">Record PG Operating Expense</h3>
                    <button class="modal-close-btn" onclick="closeModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <form onsubmit="submitAddExpense(event)">
                        <div class="form-grid">
                            <div class="form-group col-span-2">
                                <label class="form-label">Property *</label>
                                <select name="propertyId" class="form-select" required>
                                    ${properties.map(p => `<option value="${p.id}">${p.name}</option>`).join('')}
                                </select>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Expense Date</label>
                                <input type="date" name="date" class="form-input" value="${new Date().toISOString().split('T')[0]}">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Category</label>
                                <select name="category" class="form-select">
                                    <option value="Utilities">Utilities (Electricity/Water)</option>
                                    <option value="Staff Salary">Staff Salary</option>
                                    <option value="Maintenance">Repairs & Maintenance</option>
                                    <option value="Supplies">Cleaning & Toiletries Supplies</option>
                                    <option value="Internet">Wi-Fi / Internet Broadband</option>
                                    <option value="Food">Kitchen Groceries & Food</option>
                                    <option value="Misc">Miscellaneous</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Amount (₹) *</label>
                                <input type="number" name="amount" class="form-input" placeholder="e.g. 4500" required min="1">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Payment Mode</label>
                                <select name="paymentMethod" class="form-select">
                                    <option value="UPI">UPI</option>
                                    <option value="Bank Transfer">Bank Transfer</option>
                                    <option value="Cash">Cash</option>
                                </select>
                            </div>
                            <div class="form-group col-span-2">
                                <label class="form-label">Description / Bill Notes</label>
                                <input type="text" name="description" class="form-input" placeholder="e.g. BESCOM electricity bill for Block B" required>
                            </div>
                        </div>
                        <div class="modal-footer" style="padding:16px 0 0 0; margin-top:20px; background:none;">
                            <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
                            <button type="submit" class="btn btn-primary">Save Expense</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;
    lucide.createIcons();
}

async function submitAddExpense(e) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target).entries());
    try {
        await window.db.addExpense(data);
        closeModal();
        showToast('Expense recorded successfully!');
    } catch (err) {
        alert(err.message);
    }
}

// --- 11. Post Property Notice Modal ---
function openNoticeModal() {
    const properties = window.db.get('properties');
    const modal = document.getElementById('modal-container');
    modal.innerHTML = `
        <div class="modal-backdrop" onclick="closeModal(event)">
            <div class="modal-dialog">
                <div class="modal-header">
                    <h3 class="modal-title">Broadcast Notice to Residents</h3>
                    <button class="modal-close-btn" onclick="closeModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <form onsubmit="submitAddNotice(event)">
                        <div class="form-group" style="margin-bottom:14px;">
                            <label class="form-label">Notice Title *</label>
                            <input type="text" name="title" class="form-input" placeholder="e.g. Scheduled Water Tank Cleaning This Saturday" required>
                        </div>
                        <div class="form-grid" style="margin-bottom:14px;">
                            <div class="form-group">
                                <label class="form-label">Property</label>
                                <select name="propertyId" class="form-select">
                                    <option value="">All PG Properties</option>
                                    ${properties.map(p => `<option value="${p.id}">${p.name}</option>`).join('')}
                                </select>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Priority</label>
                                <select name="priority" class="form-select">
                                    <option value="Normal">Normal</option>
                                    <option value="High">Important</option>
                                    <option value="Urgent">Urgent</option>
                                </select>
                            </div>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Message / Details *</label>
                            <textarea name="message" class="form-textarea" placeholder="Provide full details of the notice for residents..." required></textarea>
                        </div>
                        <div class="modal-footer" style="padding:16px 0 0 0; margin-top:20px; background:none;">
                            <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
                            <button type="submit" class="btn btn-primary">Publish Notice</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;
    lucide.createIcons();
}

async function submitAddNotice(e) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target).entries());
    try {
        await window.db.addNotice(data);
        closeModal();
        showToast('Notice published successfully!');
    } catch (err) {
        alert(err.message);
    }
}

// --- 12. View Resident Profile / KYC Details Modal ---
function openResidentProfileModal(residentId) {
    const res = window.db.get('residents').find(r => r.id === residentId);
    if (!res) return;

    const modal = document.getElementById('modal-container');
    modal.innerHTML = `
        <div class="modal-backdrop" onclick="closeModal(event)">
            <div class="modal-dialog modal-lg">
                <div class="modal-header">
                    <h3 class="modal-title">Resident Profile: ${res.name}</h3>
                    <button class="modal-close-btn" onclick="closeModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <div style="display:flex; align-items:center; gap:16px; margin-bottom:20px; padding-bottom:16px; border-bottom:1px solid var(--border-color);">
                        <div class="avatar" style="width:54px; height:54px; font-size:18px;">${res.name.split(' ').map(n=>n[0]).join('').substring(0,2)}</div>
                        <div>
                            <h2 style="font-size:18px; font-weight:700;">${res.name}</h2>
                            <div style="font-size:12.5px; color:var(--text-muted);">${res.phone} • ${res.email || 'No email registered'}</div>
                            <div style="margin-top:6px; display:flex; gap:8px;">
                                <span class="badge ${res.status === 'Active' ? 'badge-success' : 'badge-warning'}">${res.status}</span>
                                <span class="badge ${res.kycStatus === 'Verified' ? 'badge-success' : 'badge-warning'}">KYC: ${res.kycStatus}</span>
                            </div>
                        </div>
                    </div>

                    <div class="form-grid">
                        <div>
                            <span style="font-size:11px; color:var(--text-muted); text-transform:uppercase;">Property & Room</span>
                            <div style="font-weight:600; font-size:13.5px;">${res.propertyName || 'PG'} • Room ${res.roomNumber}, ${res.bedName}</div>
                        </div>
                        <div>
                            <span style="font-size:11px; color:var(--text-muted); text-transform:uppercase;">Joining Date</span>
                            <div style="font-weight:600; font-size:13.5px;">${res.joiningDate}</div>
                        </div>
                        <div>
                            <span style="font-size:11px; color:var(--text-muted); text-transform:uppercase;">Monthly Rent</span>
                            <div style="font-weight:600; font-size:13.5px; color:var(--primary);">₹${(res.monthlyRent || 0).toLocaleString()}</div>
                        </div>
                        <div>
                            <span style="font-size:11px; color:var(--text-muted); text-transform:uppercase;">Security Deposit</span>
                            <div style="font-weight:600; font-size:13.5px;">₹${(res.securityDeposit || 0).toLocaleString()}</div>
                        </div>
                        <div>
                            <span style="font-size:11px; color:var(--text-muted); text-transform:uppercase;">ID Proof Type & #</span>
                            <div style="font-weight:600; font-size:13.5px;">${res.idProofType || 'Aadhaar'}: ${res.idProofNumber || 'XXXX-XXXX-XXXX'}</div>
                        </div>
                        <div>
                            <span style="font-size:11px; color:var(--text-muted); text-transform:uppercase;">Emergency Contact</span>
                            <div style="font-weight:600; font-size:13.5px;">${res.emergencyContactName || '-'} (${res.emergencyContactPhone || '-'})</div>
                        </div>
                        <div class="col-span-2">
                            <span style="font-size:11px; color:var(--text-muted); text-transform:uppercase;">Permanent Address</span>
                            <div style="font-weight:500; font-size:13px;">${res.currentAddress || 'Not specified'}</div>
                        </div>
                    </div>

                    <div class="modal-footer" style="padding:16px 0 0 0; margin-top:24px; background:none;">
                        <button type="button" class="btn btn-secondary" onclick="closeModal(); openEditResidentModal('${res.id}')"><i data-lucide="edit" style="width:16px;height:16px; margin-right:6px; vertical-align:middle;"></i> Edit</button>
                        <button type="button" class="btn btn-primary" onclick="closeModal(); openTransferModal('${res.id}')"><i data-lucide="repeat"></i> Transfer Room</button>
                        ${res.status !== 'Checked Out' ? `<button type="button" class="btn btn-danger" onclick="closeModal(); openCheckoutModal('${res.id}')"><i data-lucide="log-out"></i> Start Checkout</button>` : ''}
                    </div>
                </div>
            </div>
        </div>
    `;
    lucide.createIcons();
}

function openKycModal(residentId) {
    const res = window.db.get('residents').find(r => r.id === residentId);
    if (!res) return;

    const modal = document.getElementById('modal-container');
    modal.innerHTML = `
        <div class="modal-backdrop" onclick="closeModal(event)">
            <div class="modal-dialog">
                <div class="modal-header">
                    <h3 class="modal-title">View Documents: ${res.name}</h3>
                    <button class="modal-close-btn" onclick="closeModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <div style="background:var(--bg-main); border:1px solid var(--border-color); padding:16px; border-radius:8px; margin-bottom:18px;">
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                            <div>
                                <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 4px;">Aadhaar Number</div>
                                <div style="font-weight: 500; color: var(--text-main);">${res.aadhaarNumber || 'Not provided'}</div>
                                <a href="#" onclick="window.open('demo_aadhaar.webp', '_blank', 'width=700,height=500,menubar=no,toolbar=no,location=no,status=no'); return false;" style="font-size: 11px; color: var(--primary); text-decoration: none; margin-top: 6px; display: inline-flex; align-items: center; gap: 4px;"><i data-lucide="eye" style="width: 12px; height: 12px;"></i> View Image</a>
                            </div>
                            <div>
                                <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 4px;">PAN Number</div>
                                <div style="font-weight: 500; color: var(--text-main);">${res.panNumber || 'Not provided'}</div>
                                <a href="#" onclick="window.open('demo_pan.jpg', '_blank', 'width=700,height=500,menubar=no,toolbar=no,location=no,status=no'); return false;" style="font-size: 11px; color: var(--primary); text-decoration: none; margin-top: 6px; display: inline-flex; align-items: center; gap: 4px;"><i data-lucide="eye" style="width: 12px; height: 12px;"></i> View Image</a>
                            </div>
                        </div>
                    </div>

                    <form onsubmit="submitUpdateKyc(event, '${res.id}')">
                        <div class="form-group" style="margin-bottom:14px;">
                            <label class="form-label">Admin KYC Decision</label>
                            <select name="kycStatus" class="form-select">
                                <option value="Verified" ${res.kycStatus === 'Verified' ? 'selected' : ''}>Verified (Approve)</option>
                                <option value="Pending" ${res.kycStatus === 'Pending' ? 'selected' : ''}>Pending Verification</option>
                                <option value="Rejected" ${res.kycStatus === 'Rejected' ? 'selected' : ''}>Rejected (Invalid Document)</option>
                            </select>
                        </div>
                        <div class="modal-footer" style="padding:16px 0 0 0; background:none;">
                            <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
                            <button type="submit" class="btn btn-primary">Save KYC Status</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;
    lucide.createIcons();
}

async function submitUpdateKyc(e, resId) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target).entries());
    try {
        await window.db.updateResident(resId, { kycStatus: data.kycStatus });
        closeModal();
        showToast(`KYC status set to ${data.kycStatus}!`);
    } catch (err) {
        alert(err.message);
    }
}

function openEditResidentModal(residentId) {
    const res = window.db.get('residents').find(r => r.id === residentId);
    if (!res) return;

    const modal = document.getElementById('modal-container');
    modal.innerHTML = `
        <div class="modal-backdrop" onclick="closeModal(event)">
            <div class="modal-dialog">
                <div class="modal-header">
                    <h3 class="modal-title">Edit Resident: ${res.name}</h3>
                    <button class="modal-close-btn" onclick="closeModal()">&times;</button>
                </div>
                <div class="modal-body" style="max-height: 70vh; overflow-y: auto;">
                    <form onsubmit="submitEditResident(event, '${res.id}')">
                        
                        <!-- Personal Information -->
                        <h4 style="margin: 10px 0 16px 0; font-size: 14px; font-weight: 600; color: var(--text-main); border-bottom: 1px solid var(--border-color); padding-bottom: 8px;">Personal Information</h4>
                        <div class="form-grid">
                            <div class="form-group">
                                <label class="form-label">Full Name</label>
                                <input type="text" name="name" class="form-input" value="${res.name}" required>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Date of Birth</label>
                                <input type="date" name="dob" class="form-input" value="${res.dob || '1995-08-15'}">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Gender</label>
                                <select name="gender" class="form-select">
                                    <option value="Male" ${res.gender === 'Male' ? 'selected' : ''}>Male</option>
                                    <option value="Female" ${res.gender === 'Female' ? 'selected' : ''}>Female</option>
                                    <option value="Other" ${res.gender === 'Other' ? 'selected' : ''}>Other</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Occupation</label>
                                <input type="text" name="occupation" class="form-input" value="${res.occupation || 'Software Engineer'}">
                            </div>
                        </div>

                        <!-- Contact Information -->
                        <h4 style="margin: 24px 0 16px 0; font-size: 14px; font-weight: 600; color: var(--text-main); border-bottom: 1px solid var(--border-color); padding-bottom: 8px;">Contact Information</h4>
                        <div class="form-grid">
                            <div class="form-group">
                                <label class="form-label">Phone Number</label>
                                <input type="tel" name="phone" class="form-input" value="${res.phone}" required>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Email</label>
                                <input type="email" name="email" class="form-input" value="${res.email || ''}">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Emergency Contact Name</label>
                                <input type="text" name="emergencyContactName" class="form-input" value="${res.emergencyContactName || 'Parent/Guardian'}">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Emergency Contact Phone</label>
                                <input type="tel" name="emergencyContactPhone" class="form-input" value="${res.emergencyContactPhone || '+91 9876543210'}">
                            </div>
                        </div>

                        <!-- Stay Information -->
                        <h4 style="margin: 24px 0 16px 0; font-size: 14px; font-weight: 600; color: var(--text-main); border-bottom: 1px solid var(--border-color); padding-bottom: 8px;">Stay Information</h4>
                        <div class="form-grid">
                            <div class="form-group col-span-2">
                                <label class="form-label">Property</label>
                                <select name="propertyId" class="form-select">
                                    ${window.db.get('properties').map(p => `<option value="${p.id}" ${res.propertyId === p.id ? 'selected' : ''}>${p.name}</option>`).join('')}
                                </select>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Status</label>
                                <select name="status" class="form-select">
                                    <option value="Active" ${res.status === 'Active' ? 'selected' : ''}>Active</option>
                                    <option value="Notice Period" ${res.status === 'Notice Period' ? 'selected' : ''}>Notice Period</option>
                                    <option value="Checked Out" ${res.status === 'Checked Out' ? 'selected' : ''}>Checked Out</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Joining Date</label>
                                <input type="date" name="joiningDate" class="form-input" value="${res.joiningDate || '2023-01-10'}">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Monthly Rent (₹)</label>
                                <input type="number" name="monthlyRent" class="form-input" value="${res.monthlyRent || 8000}">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Deposit (₹)</label>
                                <input type="number" name="deposit" class="form-input" value="${res.securityDeposit || res.deposit || 0}">
                            </div>
                        </div>

                        <!-- Address & Documents -->
                        <h4 style="margin: 24px 0 16px 0; font-size: 14px; font-weight: 600; color: var(--text-main); border-bottom: 1px solid var(--border-color); padding-bottom: 8px;">Address & Documents</h4>
                        <div class="form-grid">
                            <div class="form-group col-span-2">
                                <label class="form-label">Permanent Address</label>
                                <input type="text" name="currentAddress" class="form-input" value="${res.currentAddress || '123 Main Street, Layout, Bengaluru, Karnataka'}">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Pincode</label>
                                <input type="text" name="pincode" class="form-input" value="${res.pincode || '560001'}">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Aadhaar Number <span style="color:red;">*</span></label>
                                <input type="text" name="aadhaarNumber" class="form-input" value="${res.aadhaarNumber || ''}" required>
                                <div style="margin-top: 8px; display: flex; align-items: center; justify-content: space-between;">
                                    <input type="file" name="aadhaarDoc" class="form-input" accept="image/*,.pdf" style="padding: 4px; font-size: 11px; width: calc(100% - 80px);">
                                    <button type="button" class="btn btn-secondary btn-sm" onclick="window.open('demo_aadhaar.webp', '_blank', 'width=700,height=500,menubar=no,toolbar=no,location=no,status=no')" style="padding: 4px 8px; font-size: 11px;">View</button>
                                </div>
                            </div>
                            <div class="form-group">
                                <label class="form-label">PAN Number <span style="color:red;">*</span></label>
                                <input type="text" name="panNumber" class="form-input" value="${res.panNumber || ''}" required>
                                <div style="margin-top: 8px; display: flex; align-items: center; justify-content: space-between;">
                                    <input type="file" name="panDoc" class="form-input" accept="image/*,.pdf" style="padding: 4px; font-size: 11px; width: calc(100% - 80px);">
                                    <button type="button" class="btn btn-secondary btn-sm" onclick="window.open('demo_pan.jpg', '_blank', 'width=700,height=500,menubar=no,toolbar=no,location=no,status=no')" style="padding: 4px 8px; font-size: 11px;">View</button>
                                </div>
                            </div>
                        </div>

                        <div class="modal-footer" style="padding:16px 0 0 0; margin-top:24px; background:none;">
                            <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
                            <button type="submit" class="btn btn-primary">Save Changes</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;
    lucide.createIcons();
}

async function submitEditResident(e, resId) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target).entries());
    try {
        await window.db.updateResident(resId, data);
        closeModal();
        showToast('Resident details updated!');
    } catch (err) {
        alert(err.message);
    }
}

function viewResidentRentHistory(residentId) {
    closeModal();
    navigateTo('payments');
    const searchInput = document.getElementById('pay-search');
    const res = window.db.get('residents').find(r => r.id === residentId);
    if (searchInput && res) {
        searchInput.value = res.name;
        filterPaymentsTable();
    }
}

// --- 13. Settings Modal (Global Account & Business Settings) ---
function openSettingsModal() {
    const settings = window.db.get('settings') || {};
    const staff = window.db.get('staff') || [];
    const notices = window.db.get('notices') || [];

    const modal = document.getElementById('modal-container');
    modal.innerHTML = `
        <div class="modal-backdrop" onclick="closeModal(event)">
            <div class="modal-dialog modal-lg">
                <div class="modal-header">
                    <h3 class="modal-title">System Settings & Operations</h3>
                    <button class="modal-close-btn" onclick="closeModal()">&times;</button>
                </div>
                <div class="modal-body" style="padding-top:10px;">
                    <!-- Settings Tabs -->
                    <div style="display:flex; border-bottom:1px solid var(--border-color); gap:16px; margin-bottom:20px;">
                        <button class="btn btn-secondary btn-sm" id="tab-btn-business" style="border:none; border-bottom:2px solid var(--primary); border-radius:0;" onclick="switchSettingsTab('business')">Business & Profile</button>
                        <button class="btn btn-secondary btn-sm" id="tab-btn-payment" style="border:none; border-radius:0;" onclick="switchSettingsTab('payment')">Payment & Bank</button>
                        <button class="btn btn-secondary btn-sm" id="tab-btn-staff" style="border:none; border-radius:0;" onclick="switchSettingsTab('staff')">Staff Directory</button>
                        <button class="btn btn-secondary btn-sm" id="tab-btn-notices" style="border:none; border-radius:0;" onclick="switchSettingsTab('notices')">Property Notices</button>
                        <button class="btn btn-secondary btn-sm" id="tab-btn-reset" style="border:none; border-radius:0; color:var(--danger);" onclick="switchSettingsTab('reset')">Reset Database</button>
                    </div>

                    <!-- Tab 1: Business Settings -->
                    <div id="settings-tab-business">
                        <form onsubmit="submitUpdateSettings(event)">
                            <div class="form-grid">
                                <div class="form-group">
                                    <label class="form-label">Business / Brand Name</label>
                                    <input type="text" name="companyName" class="form-input" value="${settings.companyName || 'Urban Stays & Co.'}">
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Owner / Manager Name</label>
                                    <input type="text" name="ownerName" class="form-input" value="${settings.ownerName || 'Owner Manager'}">
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Contact Phone</label>
                                    <input type="tel" name="phone" class="form-input" value="${settings.phone || '+91 9876543210'}">
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Contact Email</label>
                                    <input type="email" name="email" class="form-input" value="${settings.email || 'admin@pgmanager.com'}">
                                </div>
                                <div class="form-group col-span-2">
                                    <label class="form-label">Headquarters / Reg. Address</label>
                                    <input type="text" name="address" class="form-input" value="${settings.address || 'Koramangala, Bengaluru, Karnataka'}">
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Monthly Rent Due Day</label>
                                    <input type="number" name="rentDueDate" class="form-input" value="${settings.rentDueDate || 5}" min="1" max="28">
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Currency Symbol</label>
                                    <input type="text" name="currency" class="form-input" value="${settings.currency || '₹'}">
                                </div>
                            </div>
                            <div class="modal-footer" style="padding:16px 0 0 0; margin-top:20px; background:none;">
                                <button type="submit" class="btn btn-primary">Save Business Settings</button>
                            </div>
                        </form>
                    </div>

                    <!-- Tab 2: Payment & Bank -->
                    <div id="settings-tab-payment" style="display:none;">
                        <form onsubmit="submitUpdateSettings(event)">
                            <div class="form-grid">
                                <div class="form-group col-span-2">
                                    <label class="form-label">Primary Business UPI VPA / ID</label>
                                    <input type="text" name="upiId" class="form-input" value="${settings.upiId || 'urbanstays@upi'}">
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Bank Name</label>
                                    <input type="text" name="bankName" class="form-input" value="${settings.bankName || 'HDFC Bank'}">
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Account Number</label>
                                    <input type="text" name="accountNumber" class="form-input" value="${settings.accountNumber || '50100234567890'}">
                                </div>
                                <div class="form-group">
                                    <label class="form-label">IFSC Code</label>
                                    <input type="text" name="ifscCode" class="form-input" value="${settings.ifscCode || 'HDFC0001234'}">
                                </div>
                            </div>
                            <div class="modal-footer" style="padding:16px 0 0 0; margin-top:20px; background:none;">
                                <button type="submit" class="btn btn-primary">Save Payment Settings</button>
                            </div>
                        </form>
                    </div>

                    <!-- Tab 3: Staff Management -->
                    <div id="settings-tab-staff" style="display:none;">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px;">
                            <span style="font-weight:600;">PG Staff & Wardens (${staff.length})</span>
                            <button class="btn btn-secondary btn-sm" onclick="openAddStaffModal()">+ Add Staff</button>
                        </div>
                        <div class="table-container">
                            <table class="data-table">
                                <thead>
                                    <tr>
                                        <th>Name</th>
                                        <th>Role</th>
                                        <th>Phone</th>
                                        <th>Property</th>
                                        <th>Salary</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${staff.map(s => `
                                        <tr>
                                            <td><strong>${s.name}</strong></td>
                                            <td><span class="badge badge-purple">${s.role}</span></td>
                                            <td>${s.phone}</td>
                                            <td>${s.propertyName || 'All Properties'}</td>
                                            <td>₹${(s.salary || 0).toLocaleString()}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <!-- Tab 4: Notices -->
                    <div id="settings-tab-notices" style="display:none;">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px;">
                            <span style="font-weight:600;">Published Notices</span>
                            <button class="btn btn-secondary btn-sm" onclick="openNoticeModal()">+ Post Notice</button>
                        </div>
                        <div style="display:flex; flex-direction:column; gap:12px;">
                            ${notices.map(n => `
                                <div style="background:var(--bg-main); padding:12px; border-radius:8px; border-left:4px solid var(--primary);">
                                    <div style="display:flex; justify-content:space-between;">
                                        <strong>${n.title}</strong>
                                        <span class="badge ${n.priority === 'High' ? 'badge-danger' : 'badge-neutral'}">${n.priority}</span>
                                    </div>
                                    <p style="font-size:12px; color:var(--text-muted); margin-top:4px;">${n.message}</p>
                                    <div style="font-size:10.5px; color:var(--text-light); margin-top:6px;">${n.propertyName || 'All Properties'} • ${n.date}</div>
                                </div>
                            `).join('')}
                        </div>
                    </div>

                    <!-- Tab 5: Reset Database -->
                    <div id="settings-tab-reset" style="display:none;">
                        <div style="background:var(--danger-bg); border:1px solid var(--danger-border); padding:16px; border-radius:8px; color:var(--danger-text);">
                            <h4 style="font-weight:700; margin-bottom:6px;">Reset Demo Database</h4>
                            <p style="font-size:12.5px;">This will re-initialize the SQLite database with clean seed properties, rooms, beds, sample residents, and payments.</p>
                            <button class="btn btn-danger btn-sm" style="margin-top:12px;" onclick="confirmResetDatabase()">Reset Database Now</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    lucide.createIcons();
}

function switchSettingsTab(tabName) {
    ['business', 'payment', 'staff', 'notices', 'reset'].forEach(t => {
        const pane = document.getElementById(`settings-tab-${t}`);
        const btn = document.getElementById(`tab-btn-${t}`);
        if (pane) pane.style.display = (t === tabName) ? 'block' : 'none';
        if (btn) {
            btn.style.borderBottom = (t === tabName) ? '2px solid var(--primary)' : 'none';
            btn.style.fontWeight = (t === tabName) ? '700' : '500';
        }
    });
}

async function submitUpdateSettings(e) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target).entries());
    try {
        await window.db.updateSettings(data);
        showToast('Settings saved successfully!');
    } catch (err) {
        alert(err.message);
    }
}

async function confirmResetDatabase() {
    if (!confirm("Are you sure you want to reset the database? All demo data will be re-seeded.")) return;
    try {
        await window.db.resetApp();
        closeModal();
        showToast('Database reset successfully!');
    } catch (err) {
        alert(err.message);
    }
}

function openAddStaffModal() {
    const properties = window.db.get('properties');
    const modal = document.getElementById('modal-container');
    modal.innerHTML = `
        <div class="modal-backdrop" onclick="closeModal(event)">
            <div class="modal-dialog">
                <div class="modal-header">
                    <h3 class="modal-title">Add Staff Member</h3>
                    <button class="modal-close-btn" onclick="closeModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <form onsubmit="submitAddStaff(event)">
                        <div class="form-grid">
                            <div class="form-group">
                                <label class="form-label">Full Name *</label>
                                <input type="text" name="name" class="form-input" placeholder="e.g. Ramesh Gowda" required>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Role</label>
                                <select name="role" class="form-select">
                                    <option value="Warden">Warden</option>
                                    <option value="Electrician">Electrician</option>
                                    <option value="Plumbing">Plumber</option>
                                    <option value="Cleaning">Cleaning Staff</option>
                                    <option value="Security">Security Guard</option>
                                    <option value="Cook">Cook</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Phone Number *</label>
                                <input type="tel" name="phone" class="form-input" placeholder="+91 9845112233" required>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Assigned Property</label>
                                <select name="propertyId" class="form-select">
                                    <option value="">All Properties</option>
                                    ${properties.map(p => `<option value="${p.id}">${p.name}</option>`).join('')}
                                </select>
                            </div>
                            <div class="form-group col-span-2">
                                <label class="form-label">Monthly Salary (₹)</label>
                                <input type="number" name="salary" class="form-input" value="20000">
                            </div>
                        </div>
                        <div class="modal-footer" style="padding:16px 0 0 0; margin-top:20px; background:none;">
                            <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
                            <button type="submit" class="btn btn-primary">Add Staff</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;
    lucide.createIcons();
}

async function submitAddStaff(e) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target).entries());
    try {
        await window.db.addStaff(data);
        closeModal();
        showToast('Staff member added!');
    } catch (err) {
        alert(err.message);
    }
}

// Modal helper: close modal
function closeModal(e) {
    if (!e || e.target.classList.contains('modal-backdrop') || e.target.classList.contains('modal-close-btn') || e.target.closest('.modal-close-btn') || e.target.textContent === 'Cancel' || e.target.textContent === 'Close') {
        const modal = document.getElementById('modal-container');
        if (modal) modal.innerHTML = '';
    }
}

// --- Room Info Modal ---
function openRoomInfoModal(roomId) {
    const rooms = window.db.get('rooms');
    const beds = window.db.get('beds');
    const residents = window.db.get('residents');
    const settings = window.db.get('settings') || {};
    const currency = settings.currency || '₹';

    const room = rooms.find(r => r.id === roomId);
    if (!room) return;

    const roomBeds = beds.filter(b => b.roomId === roomId).sort((a, b) => a.name.localeCompare(b.name));

    let bedsHtml = '';
    roomBeds.forEach(bed => {
        let occupantHtml = `<div style="color: var(--success); font-weight: 500; font-size: 14px;">Vacant - Available for Allocation</div>`;
        if (bed.status === 'Occupied' && bed.residentId) {
            const resident = residents.find(res => res.id === bed.residentId);
            if (resident) {
                occupantHtml = `
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 4px;">
                        <span style="font-weight: 600; color: var(--text-main); flex: 1;"><i data-lucide="user" style="width: 16px; height: 16px; display: inline-block; vertical-align: middle; margin-right: 4px;"></i>${resident.name}</span>
                        <span style="font-weight: 600; color: var(--primary); flex: 1; text-align: center;">${currency}${resident.monthlyRent}/mo</span>
                        <div style="flex: 1; text-align: right;">
                            <button onclick="openResidentDetailsModal('${resident.id}')" style="background: none; border: none; cursor: pointer; color: var(--text-muted);"><i data-lucide="menu" style="width: 18px; height: 18px;"></i></button>
                        </div>
                    </div>
                `;
            }
        }

        bedsHtml += `
            <div style="border: 1px solid var(--border-color); border-radius: 8px; padding: 16px; margin-bottom: 12px; background: var(--bg-body);">
                <div style="font-size: 13px; font-weight: 600; color: var(--text-muted); text-transform: uppercase; margin-bottom: 4px;">${bed.name}</div>
                ${occupantHtml}
            </div>
        `;
    });

    const modal = document.getElementById('modal-container');
    modal.innerHTML = `
        <div class="modal-backdrop" onclick="closeModal(event)">
            <div class="modal-dialog">
                <div class="modal-header">
                    <div>
                        <h3 class="modal-title">Room ${room.roomNumber}</h3>
                        <div style="font-size: 13px; color: var(--text-muted); margin-top: 4px;">${room.type} • Floor ${room.floor}</div>
                    </div>
                    <div style="display: flex; gap: 12px; align-items: center;">
                        <button class="btn btn-primary btn-sm" style="display: flex; align-items: center; gap: 6px;" onclick="openAddResidentModal('${room.id}')">
                            <i data-lucide="user-plus" style="width: 16px; height: 16px;"></i> Add Resident
                        </button>
                        <button class="modal-close-btn" onclick="closeModal(event)"><i data-lucide="x"></i></button>
                    </div>
                </div>
                <div class="modal-body">
                    ${bedsHtml}
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="closeModal(event)">Close</button>
                </div>
            </div>
        </div>
    `;
    
    setTimeout(() => {
        const backdrop = modal.querySelector('.modal-backdrop');
        const dialog = modal.querySelector('.modal-dialog');
        if (backdrop) backdrop.classList.add('show');
        if (dialog) dialog.classList.add('show');
        lucide.createIcons();
    }, 10);
}

// // --- Resident Details Modal (From Room Matrix) ---
function openResidentDetailsModal(residentId) {
    const residents = window.db.get('residents');
    const settings = window.db.get('settings') || {};
    const currency = settings.currency || '₹';
    
    const resident = residents.find(r => r.id === residentId);
    if (!resident) return;

    const properties = window.db.get('properties');
    const property = properties.find(p => p.id === resident.propertyId);
    const propertyName = property ? property.name : 'Unknown Property';

    const docNumber = resident.idProofNumber || `AADHAAR-${Math.floor(1000 + Math.random() * 9000)}-XXXX-XXXX`;
    const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(resident.name)}&background=random&size=80`;

    const modal = document.getElementById('modal-container');
    modal.innerHTML = `
        <div class="modal-backdrop" onclick="closeModal(event)">
            <div class="modal-dialog">
                <div class="modal-header">
                    <div>
                        <h3 class="modal-title">Resident Profile</h3>
                    </div>
                    <button class="modal-close-btn" onclick="closeModal(event)"><i data-lucide="x"></i></button>
                </div>
                <div class="modal-body" style="text-align: center;">
                    <img src="${avatarUrl}" alt="${resident.name}" style="border-radius: 50%; margin-bottom: 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
                    <h2 style="margin-bottom: 24px; font-size: 20px; color: var(--text-main); font-weight: 700;">${resident.name}</h2>
                    
                    <div style="text-align: left; display: flex; flex-direction: column; gap: 16px;">
                        <!-- Personal Information -->
                        <div style="border: 1px solid #cbd5e1; border-radius: 8px; padding: 16px; background: #f1f5f9;">
                            <h4 style="font-size: 14px; font-weight: 700; color: var(--text-main); margin-bottom: 12px; border-bottom: 1px solid var(--border-color); padding-bottom: 8px;">Personal Information</h4>
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                                <div>
                                    <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 4px;">Full Name</div>
                                    <div style="font-weight: 500; color: var(--text-main);">${resident.name}</div>
                                </div>
                                <div>
                                    <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 4px;">Date of Birth</div>
                                    <div style="font-weight: 500; color: var(--text-main);">${resident.dob || '1995-08-15'}</div>
                                </div>
                                <div>
                                    <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 4px;">Gender</div>
                                    <div style="font-weight: 500; color: var(--text-main);">${resident.gender || 'Male'}</div>
                                </div>
                                <div>
                                    <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 4px;">Occupation</div>
                                    <div style="font-weight: 500; color: var(--text-main);">${resident.occupation || 'Software Engineer'}</div>
                                </div>
                            </div>
                        </div>

                        <!-- Contact -->
                        <div style="border: 1px solid #cbd5e1; border-radius: 8px; padding: 16px; background: #f1f5f9;">
                            <h4 style="font-size: 14px; font-weight: 700; color: var(--text-main); margin-bottom: 12px; border-bottom: 1px solid var(--border-color); padding-bottom: 8px;">Contact</h4>
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                                <div>
                                    <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 4px;">Mobile Number</div>
                                    <div style="font-weight: 500; color: var(--text-main);">${resident.phone}</div>
                                </div>
                                <div>
                                    <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 4px;">Email</div>
                                    <div style="font-weight: 500; color: var(--text-main);">${resident.email || 'N/A'}</div>
                                </div>
                                <div style="grid-column: span 2;">
                                    <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 4px;">Emergency Contact</div>
                                    <div style="font-weight: 500; color: var(--text-main);">${resident.emergencyContactName || 'Parent/Guardian'} (${resident.emergencyContactPhone || '+91 9876543210'})</div>
                                </div>
                            </div>
                        </div>

                        <!-- Stay Info -->
                        <div style="border: 1px solid #cbd5e1; border-radius: 8px; padding: 16px; background: #f1f5f9;">
                            <h4 style="font-size: 14px; font-weight: 700; color: var(--text-main); margin-bottom: 12px; border-bottom: 1px solid var(--border-color); padding-bottom: 8px;">Stay Info</h4>
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                                <div>
                                    <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 4px;">Status</div>
                                    <div style="font-weight: 500; color: var(--text-main);"><span class="badge ${resident.status === 'Active' ? 'badge-success' : 'badge-warning'}">${resident.status}</span></div>
                                </div>
                                <div>
                                    <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 4px;">Property Name</div>
                                    <div style="font-weight: 500; color: var(--text-main);">${propertyName}</div>
                                </div>
                                <div>
                                    <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 4px;">Joining Date</div>
                                    <div style="font-weight: 500; color: var(--text-main);">${resident.joiningDate || '2023-01-10'}</div>
                                </div>
                                <div>
                                    <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 4px;">Monthly Rent</div>
                                    <div style="font-weight: 500; color: var(--text-main);">${currency}${resident.monthlyRent}</div>
                                </div>
                                <div>
                                    <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 4px;">Deposit</div>
                                    <div style="font-weight: 500; color: var(--text-main);">${currency}${resident.securityDeposit || resident.deposit || 0}</div>
                                </div>
                            </div>
                        </div>

                        <!-- Address -->
                        <div style="border: 1px solid #cbd5e1; border-radius: 8px; padding: 16px; background: #f1f5f9;">
                            <h4 style="font-size: 14px; font-weight: 700; color: var(--text-main); margin-bottom: 12px; border-bottom: 1px solid var(--border-color); padding-bottom: 8px;">Address</h4>
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                                <div style="grid-column: span 2;">
                                    <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 4px;">Permanent Address</div>
                                    <div style="font-weight: 500; color: var(--text-main); line-height: 1.4;">${resident.currentAddress || '123 Main Street, Layout, Bengaluru, Karnataka'}</div>
                                </div>
                                <div>
                                    <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 4px;">Pincode</div>
                                    <div style="font-weight: 500; color: var(--text-main);">${resident.pincode || '560001'}</div>
                                </div>
                            </div>
                        </div>

                        <!-- Documents -->
                        <div style="border: 1px solid #cbd5e1; border-radius: 8px; padding: 16px; background: #f1f5f9;">
                            <h4 style="font-size: 14px; font-weight: 700; color: var(--text-main); margin-bottom: 12px; border-bottom: 1px solid var(--border-color); padding-bottom: 8px;">Documents</h4>
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                                <div>
                                    <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 4px;">Aadhaar Number</div>
                                    <div style="font-weight: 500; color: var(--text-main);">${resident.aadhaarNumber || 'Not provided'}</div>
                                    <a href="#" onclick="window.open('demo_aadhaar.webp', '_blank', 'width=700,height=500,menubar=no,toolbar=no,location=no,status=no'); return false;" style="font-size: 11px; color: var(--primary); text-decoration: none; margin-top: 6px; display: inline-flex; align-items: center; gap: 4px;"><i data-lucide="eye" style="width: 12px; height: 12px;"></i> View Image</a>
                                </div>
                                <div>
                                    <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 4px;">PAN Number</div>
                                    <div style="font-weight: 500; color: var(--text-main);">${resident.panNumber || 'Not provided'}</div>
                                    <a href="#" onclick="window.open('demo_pan.jpg', '_blank', 'width=700,height=500,menubar=no,toolbar=no,location=no,status=no'); return false;" style="font-size: 11px; color: var(--primary); text-decoration: none; margin-top: 6px; display: inline-flex; align-items: center; gap: 4px;"><i data-lucide="eye" style="width: 12px; height: 12px;"></i> View Image</a>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="modal-footer" style="display: flex; justify-content: space-between; gap: 8px;">
                    <button class="btn btn-outline" style="flex: 1; display: flex; justify-content: center; align-items: center; gap: 6px;" onclick="openEditResidentModal('${resident.id}')"><i data-lucide="edit" style="width:16px; height:16px;"></i> Edit</button>
                    <button class="btn btn-outline" style="flex: 1; display: flex; justify-content: center; align-items: center; gap: 6px;" onclick="openTransferModal('${resident.id}')"><i data-lucide="arrow-right-left" style="width:16px; height:16px;"></i> Change Room</button>
                    <button class="btn btn-danger" style="flex: 1; display: flex; justify-content: center; align-items: center; gap: 6px;" onclick="openCheckoutModal('${resident.id}')"><i data-lucide="log-out" style="width:16px; height:16px;"></i> Proceed Exit</button>
                </div>
            </div>
        </div>
    `;
    
    setTimeout(() => {
        const backdrop = modal.querySelector('.modal-backdrop');
        const dialog = modal.querySelector('.modal-dialog');
        if (backdrop) backdrop.classList.add('show');
        if (dialog) dialog.classList.add('show');
        lucide.createIcons();
    }, 10);
}


// --- Add Resident Modal ---
function openAddResidentModal(roomId) {
    const room = window.db.get('rooms').find(r => r.id === roomId);
    if (!room) return;
    
    const vacantBeds = window.db.get('beds').filter(b => b.roomId === roomId && b.status === 'Vacant');
    
    let bedOptionsHtml = '';
    if (vacantBeds.length > 0) {
        bedOptionsHtml = vacantBeds.map(b => `<option value="${b.id}">${b.name}</option>`).join('');
    } else {
        bedOptionsHtml = `<option value="" disabled selected>No vacant beds available</option>`;
    }

    const modal = document.getElementById('modal-container');
    modal.innerHTML = `
        <div class="modal-backdrop" onclick="closeModal(event)">
            <div class="modal-dialog">
                <div class="modal-header">
                    <h3 class="modal-title">Add Resident to Room ${room.roomNumber}</h3>
                    <button class="modal-close-btn" onclick="closeModal()">&times;</button>
                </div>
                <div class="modal-body" style="max-height: 70vh; overflow-y: auto;">
                    <form onsubmit="submitAddResident(event, '${roomId}')">
                        
                        <!-- Personal Information -->
                        <h4 style="margin: 10px 0 16px 0; font-size: 14px; font-weight: 600; color: var(--text-main); border-bottom: 1px solid var(--border-color); padding-bottom: 8px;">Personal Information</h4>
                        <div class="form-grid">
                            <div class="form-group">
                                <label class="form-label">Full Name</label>
                                <input type="text" name="name" class="form-input" required placeholder="Enter full name">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Date of Birth</label>
                                <input type="date" name="dob" class="form-input">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Gender</label>
                                <select name="gender" class="form-select">
                                    <option value="Male">Male</option>
                                    <option value="Female">Female</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Occupation</label>
                                <input type="text" name="occupation" class="form-input" placeholder="e.g. Student, Engineer">
                            </div>
                        </div>

                        <!-- Contact Information -->
                        <h4 style="margin: 24px 0 16px 0; font-size: 14px; font-weight: 600; color: var(--text-main); border-bottom: 1px solid var(--border-color); padding-bottom: 8px;">Contact Information</h4>
                        <div class="form-grid">
                            <div class="form-group">
                                <label class="form-label">Phone Number</label>
                                <input type="tel" name="phone" class="form-input" required placeholder="+91...">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Email</label>
                                <input type="email" name="email" class="form-input" placeholder="Email address">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Emergency Contact Name</label>
                                <input type="text" name="emergencyContactName" class="form-input" placeholder="Name">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Emergency Contact Phone</label>
                                <input type="tel" name="emergencyContactPhone" class="form-input" placeholder="Phone">
                            </div>
                        </div>

                        <!-- Stay Information -->
                        <h4 style="margin: 24px 0 16px 0; font-size: 14px; font-weight: 600; color: var(--text-main); border-bottom: 1px solid var(--border-color); padding-bottom: 8px;">Stay Information</h4>
                        <div class="form-grid">
                            <div class="form-group col-span-2">
                                <label class="form-label">Property</label>
                                <select name="propertyId" class="form-select">
                                    ${window.db.get('properties').map(p => `<option value="${p.id}" ${room.propertyId === p.id ? 'selected' : ''}>${p.name}</option>`).join('')}
                                </select>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Bed Allocation</label>
                                <select name="bedId" class="form-select" required ${vacantBeds.length === 0 ? 'disabled' : ''}>
                                    ${bedOptionsHtml}
                                </select>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Joining Date</label>
                                <input type="date" name="joiningDate" class="form-input" required value="${new Date().toISOString().split('T')[0]}">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Monthly Rent (₹)</label>
                                <input type="number" name="monthlyRent" class="form-input" required value="${room.type === 'Single Sharing' ? 25000 : room.type === 'Double Sharing' ? 14000 : 8000}">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Deposit (₹)</label>
                                <input type="number" name="deposit" class="form-input" required value="0">
                            </div>
                        </div>

                        <!-- Address & Documents -->
                        <h4 style="margin: 24px 0 16px 0; font-size: 14px; font-weight: 600; color: var(--text-main); border-bottom: 1px solid var(--border-color); padding-bottom: 8px;">Address & Documents</h4>
                        <div class="form-grid">
                            <div class="form-group col-span-2">
                                <label class="form-label">Permanent Address</label>
                                <input type="text" name="currentAddress" class="form-input" placeholder="Full address">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Pincode</label>
                                <input type="text" name="pincode" class="form-input" placeholder="Pincode">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Aadhaar Number <span style="color:red;">*</span></label>
                                <input type="text" name="aadhaarNumber" class="form-input" placeholder="12-digit Aadhaar" required>
                                <div style="margin-top: 8px;">
                                    <label style="font-size: 11px; color: var(--text-muted); display: block; margin-bottom: 4px;">Upload Document (Image/PDF)</label>
                                    <input type="file" name="aadhaarDoc" class="form-input" accept="image/*,.pdf" style="padding: 4px; font-size: 11px;">
                                </div>
                            </div>
                            <div class="form-group">
                                <label class="form-label">PAN Number <span style="color:red;">*</span></label>
                                <input type="text" name="panNumber" class="form-input" placeholder="10-character PAN" required>
                                <div style="margin-top: 8px;">
                                    <label style="font-size: 11px; color: var(--text-muted); display: block; margin-bottom: 4px;">Upload Document (Image/PDF)</label>
                                    <input type="file" name="panDoc" class="form-input" accept="image/*,.pdf" style="padding: 4px; font-size: 11px;">
                                </div>
                            </div>
                        </div>

                        <div class="modal-footer" style="padding:16px 0 0 0; margin-top:24px; background:none;">
                            <button type="button" class="btn btn-secondary" onclick="openRoomInfoModal('${roomId}')">Cancel</button>
                            <button type="submit" class="btn btn-primary" ${vacantBeds.length === 0 ? 'disabled' : ''}>Add Resident</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;
    lucide.createIcons();
}

async function submitAddResident(e, roomId) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target).entries());
    const bedId = data.bedId;
    delete data.bedId; // Don't save bedId directly on resident in db if it uses relations, but actually we do link bed to resident. 
    // In this mock DB, bed stores residentId, and resident doesn't necessarily store bedId, but let's check.
    
    data.id = 'res_' + Date.now();
    data.propertyId = window.state.currentPropertyId;
    data.status = 'Active';
    data.securityDeposit = data.deposit;
    
    try {
        // 1. Add resident
        const residents = window.db.get('residents');
        residents.push(data);
        window.db.set('residents', residents);
        
        // 2. Update bed
        const beds = window.db.get('beds');
        const bedIndex = beds.findIndex(b => b.id === bedId);
        if(bedIndex > -1) {
            beds[bedIndex].status = 'Occupied';
            beds[bedIndex].residentId = data.id;
            window.db.set('beds', beds);
        }
        
        showToast('Resident added successfully!');
        
        // Refresh room info modal to see changes
        openRoomInfoModal(roomId);
        
        // If we're on the dashboard, refresh the matrix
        if(window.state.currentPage === 'dashboard') {
            await renderDashboard();
        }
    } catch (err) {
        alert(err.message);
    }
}


window.openEditEmployeesModal = function() {
    const modal = document.getElementById('modal-container');
    modal.innerHTML = `
        <div class="modal-backdrop" onclick="closeModal(event)">
            <div class="modal-dialog" style="max-width: 600px;">
                <div class="modal-header">
                    <h3 class="modal-title">Manage Employees & Salary Options</h3>
                    <button class="modal-close-btn" onclick="closeModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <div style="margin-bottom: 20px;">
                        <h4 style="margin-bottom: 10px; font-weight: 600;">Current Employees</h4>
                        <ul class="form-group" style="list-style: none; padding: 0; border: 1px solid var(--border-color); border-radius: 6px; overflow: hidden;">
                            <li style="padding: 12px; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center;">
                                <div><strong>Ramesh</strong> (Warden)</div>
                                <div>
                                    <button class="btn btn-secondary btn-sm">Edit</button>
                                </div>
                            </li>
                            <li style="padding: 12px; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center;">
                                <div><strong>Lakshmi</strong> (Cleaner)</div>
                                <div>
                                    <button class="btn btn-secondary btn-sm">Edit</button>
                                </div>
                            </li>
                            <li style="padding: 12px; display: flex; justify-content: space-between; align-items: center;">
                                <div><strong>Anil</strong> (Warden)</div>
                                <div>
                                    <button class="btn btn-secondary btn-sm">Edit</button>
                                </div>
                            </li>
                        </ul>
                    </div>
                    
                    <div style="border-top: 1px solid var(--border-color); padding-top: 20px;">
                        <h4 style="margin-bottom: 10px; font-weight: 600;">Add New Employee</h4>
                        <div class="form-grid">
                            <div class="form-group">
                                <label class="form-label">Employee Name</label>
                                <input type="text" class="form-input" placeholder="e.g. John Doe">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Role</label>
                                <input type="text" class="form-input" placeholder="e.g. Warden, Cook...">
                            </div>
                            <div class="form-group col-span-2">
                                <label class="form-label">Default Monthly Salary</label>
                                <input type="number" class="form-input" placeholder="₹ Amount">
                            </div>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
                    <button class="btn btn-primary" onclick="closeModal(); alert('Employees list updated successfully!');">Save Changes</button>
                </div>
            </div>
        </div>
    `;
    lucide.createIcons();
};

window.openEmployeeInfoModal = function(employeeDesc) {
    const nameStr = employeeDesc || 'Employee';
    let name = nameStr;
    if (nameStr.includes('Warden Ramesh')) name = 'Ramesh';
    else if (nameStr.includes('Anil')) name = 'Anil';
    else if (nameStr.includes('Lakshmi')) name = 'Lakshmi';
    else if (nameStr.includes('Sunita')) name = 'Sunita';

    const gender = (name === 'Lakshmi' || name === 'Sunita') ? 'Female' : 'Male';
    
    const modal = document.getElementById('modal-container');
    modal.innerHTML = `
        <div class="modal-backdrop" onclick="closeModal(event)">
            <div class="modal-dialog" style="max-width: 400px;">
                <div class="modal-header">
                    <h3 class="modal-title">Employee Details</h3>
                    <button class="modal-close-btn" onclick="closeModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <div style="display: flex; flex-direction: column; gap: 16px;">
                        <div style="display: flex; align-items: center; gap: 16px;">
                            <div style="width: 60px; height: 60px; border-radius: 50%; background-color: var(--primary-color); color: white; display: flex; justify-content: center; align-items: center; font-size: 24px; font-weight: bold;">
                                ${name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <h4 style="margin: 0; font-size: 18px;">${name}</h4>
                                <span style="color: var(--text-muted); font-size: 14px;">Staff Member</span>
                            </div>
                        </div>
                        
                        <div style="border-top: 1px solid var(--border-color); padding-top: 16px; display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                            <div>
                                <div style="font-size: 12px; color: var(--text-muted); text-transform: uppercase; font-weight: 600;">Full Name</div>
                                <div style="font-size: 15px;">${name} Kumar</div>
                            </div>
                            <div>
                                <div style="font-size: 12px; color: var(--text-muted); text-transform: uppercase; font-weight: 600;">Gender</div>
                                <div style="font-size: 15px;">${gender}</div>
                            </div>
                            <div style="grid-column: span 2;">
                                <div style="font-size: 12px; color: var(--text-muted); text-transform: uppercase; font-weight: 600;">Phone Number</div>
                                <div style="font-size: 15px;">+91 98765 43210</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    lucide.createIcons();
};


// --- Add Property Modal ---
window.openAddPropertyModal = function() {
    const modal = document.getElementById('modal-container');
    modal.innerHTML = `
        <div class="modal-backdrop" onclick="closeModal(event)">
            <div class="modal-dialog" style="max-width: 650px; max-height: 90vh; display: flex; flex-direction: column;">
                <div class="modal-header">
                    <h3 class="modal-title">Add New Property</h3>
                    <button class="modal-close-btn" onclick="closeModal()">&times;</button>
                </div>
                <div class="modal-body" style="overflow-y: auto; padding: 24px; padding-bottom: 0;">
                    <form onsubmit="submitAddProperty(event)" id="add-property-form">
                        
                        <!-- 1. Basic Property Information -->
                        <h4 style="margin-bottom: 16px; font-weight: 600; font-size: 14px; color: var(--primary);">1. Basic Property Information</h4>
                        <div class="form-row" style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                            <div class="form-group">
                                <label class="form-label">Property Name <span style="color:red;">*</span></label>
                                <input type="text" id="new-prop-name" class="form-input" required placeholder="e.g. Sunrise PG">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Property Type <span style="color:red;">*</span></label>
                                <select id="new-prop-type" class="form-input" required>
                                    <option value="PG">PG</option>
                                    <option value="Hostel">Hostel</option>
                                    <option value="Co-living">Co-living</option>
                                </select>
                            </div>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Property Address <span style="color:red;">*</span></label>
                            <input type="text" id="new-prop-address" class="form-input" required placeholder="e.g. HSR Layout, Sector 2">
                        </div>
                        <div class="form-row" style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px;">
                            <div class="form-group">
                                <label class="form-label">City <span style="color:red;">*</span></label>
                                <input type="text" id="new-prop-city" class="form-input" required placeholder="Bengaluru">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Pincode</label>
                                <input type="text" id="new-prop-pincode" class="form-input" placeholder="560102">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Occupancy Type <span style="color:red;">*</span></label>
                                <select id="new-prop-occupancy" class="form-input" required>
                                    <option value="Boys">Boys</option>
                                    <option value="Girls">Girls</option>
                                    <option value="Co-living">Co-living</option>
                                </select>
                            </div>
                        </div>
                        
                        <hr style="border: 0; border-top: 1px solid var(--border-color); margin: 24px 0;">
                        
                        <!-- 2. Owner / Manager Information -->
                        <h4 style="margin-bottom: 16px; font-weight: 600; font-size: 14px; color: var(--primary);">2. Owner / Manager Details</h4>
                        <div class="form-row" style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                            <div class="form-group">
                                <label class="form-label">Owner Name <span style="color:red;">*</span></label>
                                <input type="text" id="new-prop-owner-name" class="form-input" required placeholder="Owner Name">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Owner Contact Number <span style="color:red;">*</span></label>
                                <input type="text" id="new-prop-owner-contact" class="form-input" required placeholder="Mobile Number">
                            </div>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Owner Email</label>
                            <input type="email" id="new-prop-owner-email" class="form-input" placeholder="owner@example.com">
                        </div>
                        <div class="form-row" style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                            <div class="form-group">
                                <label class="form-label">Property Manager Name</label>
                                <input type="text" id="new-prop-manager-name" class="form-input" placeholder="Manager Name">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Property Manager Contact Number</label>
                                <input type="text" id="new-prop-manager-contact" class="form-input" placeholder="Mobile Number">
                            </div>
                        </div>
                        
                        <hr style="border: 0; border-top: 1px solid var(--border-color); margin: 24px 0;">
                        
                        <!-- 3. Property Structure -->
                        <h4 style="margin-bottom: 8px; font-weight: 600; font-size: 14px; color: var(--primary);">3. Property Structure</h4>
                        <p style="font-size: 12px; color: var(--text-muted); margin-bottom: 16px;">* You can configure individual rooms and beds after creating the property.</p>
                        
                        <div class="form-row" style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px;">
                            <div class="form-group">
                                <label class="form-label">Number of Floors <span style="color:red;">*</span></label>
                                <input type="number" id="new-prop-floors" class="form-input" required min="1" value="1">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Total Rooms <span style="color:red;">*</span></label>
                                <input type="number" id="new-prop-rooms" class="form-input" required min="1" value="10">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Total Beds / Capacity <span style="color:red;">*</span></label>
                                <input type="number" id="new-prop-beds" class="form-input" required min="1" value="20">
                            </div>
                        </div>
                        

                        <div class="modal-footer" style="padding:16px 0; margin-top:24px; background:none; position: sticky; bottom: -24px; background-color: var(--card-bg); z-index: 10; border-top: 1px solid var(--border-color);">
                            <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
                            <button type="submit" class="btn btn-primary" id="save-property-btn">Save Property</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;
    
    setTimeout(() => {
        const backdrop = modal.querySelector('.modal-backdrop');
        const dialog = modal.querySelector('.modal-dialog');
        if (backdrop) backdrop.classList.add('show');
        if (dialog) dialog.classList.add('show');
    }, 10);
};

window.submitAddProperty = async function(e) {
    e.preventDefault();
    const btn = document.querySelector('#add-property-form button[type="submit"]');
    if (btn) { btn.disabled = true; btn.textContent = 'Saving...'; }
    
    const data = {
        name: document.getElementById('new-prop-name').value,
        propertyType: document.getElementById('new-prop-type').value,
        address: document.getElementById('new-prop-address').value,
        city: document.getElementById('new-prop-city').value,
        pincode: document.getElementById('new-prop-pincode').value,
        occupancyType: document.getElementById('new-prop-occupancy').value,
        
        ownerName: document.getElementById('new-prop-owner-name').value,
        ownerContact: document.getElementById('new-prop-owner-contact').value,
        ownerEmail: document.getElementById('new-prop-owner-email').value,
        managerName: document.getElementById('new-prop-manager-name').value,
        managerContact: document.getElementById('new-prop-manager-contact').value,
        
        floors: document.getElementById('new-prop-floors').value,
        rooms: document.getElementById('new-prop-rooms').value,
        totalBeds: document.getElementById('new-prop-beds').value
    };
    
    try {
        const result = await window.db.addProperty(data);
        if (result && result.success) {
            showToast('Property created successfully! Please configure rooms.');
            closeModal();
            
            // Switch global selector to new property if exists
            const globalSelector = document.getElementById('global-property-selector');
            if (globalSelector) {
                const option = document.createElement('option');
                option.value = result.id;
                option.textContent = data.name;
                globalSelector.appendChild(option);
                globalSelector.value = result.id;
                globalSelector.dispatchEvent(new Event('change'));
            } else {
                // Refresh data if no selector
                await window.db.loadInitialData();
            }
            
            // Try to switch to Rooms tab
            if (typeof switchTab === 'function') {
                setTimeout(() => {
                    switchTab('rooms');
                }, 500);
            }
        } else {
            showToast(result.error || 'Failed to create property', 'error');
            if (btn) { btn.disabled = false; btn.textContent = 'Save Property'; }
        }
    } catch (err) {
        console.error(err);
        showToast('Error saving property', 'error');
        if (btn) { btn.disabled = false; btn.textContent = 'Save Property'; }
    }
};


// --- Edit Property Modal ---
window.openEditPropertyModal = function(propId) {
    const selectedPropId = propId || window.db.selectedPropertyId;
    
    if (!selectedPropId || selectedPropId === 'all') {
        alert('Please select a specific property from the top dropdown to edit.');
        return;
    }
    
    const props = window.db.get('properties');
    const propToEdit = props.find(p => p.id === selectedPropId);
    
    if (!propToEdit) return;

    const modal = document.getElementById('modal-container');
    modal.innerHTML = `
        <div class="modal-backdrop" onclick="closeModal(event)">
            <div class="modal-dialog" style="max-width: 650px; max-height: 90vh; display: flex; flex-direction: column;">
                <div class="modal-header">
                    <h3 class="modal-title">Edit Property Details</h3>
                    <button class="modal-close-btn" onclick="closeModal()">&times;</button>
                </div>
                <div class="modal-body" style="overflow-y: auto; padding: 24px; padding-bottom: 0;">
                    <div style="margin-bottom: 20px; padding: 8px 12px; background-color: var(--sidebar-bg); border-radius: 6px; font-size: 12px; color: var(--text-muted); display: inline-block;">
                        <strong>Property ID:</strong> ${propToEdit.id}
                    </div>
                    
                    <form onsubmit="submitEditProperty(event, '${propToEdit.id}')" id="edit-property-form">
                        
                        <!-- 1. Basic Property Information -->
                        <h4 style="margin-bottom: 16px; font-weight: 600; font-size: 14px; color: var(--primary);">1. Basic Property Information</h4>
                        <div class="form-row" style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                            <div class="form-group">
                                <label class="form-label">Property Name <span style="color:red;">*</span></label>
                                <input type="text" id="edit-prop-name" class="form-input" required value="${propToEdit.name || ''}">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Property Type <span style="color:red;">*</span></label>
                                <select id="edit-prop-type" class="form-input" required>
                                    <option value="PG" ${propToEdit.propertyType === 'PG' ? 'selected' : ''}>PG</option>
                                    <option value="Hostel" ${propToEdit.propertyType === 'Hostel' ? 'selected' : ''}>Hostel</option>
                                    <option value="Co-living" ${propToEdit.propertyType === 'Co-living' ? 'selected' : ''}>Co-living</option>
                                </select>
                            </div>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Property Address <span style="color:red;">*</span></label>
                            <input type="text" id="edit-prop-address" class="form-input" required value="${propToEdit.address || ''}">
                        </div>
                        <div class="form-row" style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px;">
                            <div class="form-group">
                                <label class="form-label">City <span style="color:red;">*</span></label>
                                <input type="text" id="edit-prop-city" class="form-input" required value="${propToEdit.city || ''}">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Pincode</label>
                                <input type="text" id="edit-prop-pincode" class="form-input" value="${propToEdit.pincode || ''}">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Occupancy Type <span style="color:red;">*</span></label>
                                <select id="edit-prop-occupancy" class="form-input" required>
                                    <option value="Boys" ${propToEdit.occupancyType === 'Boys' ? 'selected' : ''}>Boys</option>
                                    <option value="Girls" ${propToEdit.occupancyType === 'Girls' ? 'selected' : ''}>Girls</option>
                                    <option value="Co-living" ${propToEdit.occupancyType === 'Co-living' ? 'selected' : ''}>Co-living</option>
                                </select>
                            </div>
                        </div>
                        
                        <hr style="border: 0; border-top: 1px solid var(--border-color); margin: 24px 0;">
                        
                        <!-- 2. Owner / Manager Information -->
                        <h4 style="margin-bottom: 16px; font-weight: 600; font-size: 14px; color: var(--primary);">2. Owner / Manager Details</h4>
                        <div class="form-row" style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                            <div class="form-group">
                                <label class="form-label">Owner Name <span style="color:red;">*</span></label>
                                <input type="text" id="edit-prop-owner-name" class="form-input" required value="${propToEdit.ownerName || ''}">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Owner Contact Number <span style="color:red;">*</span></label>
                                <input type="text" id="edit-prop-owner-contact" class="form-input" required value="${propToEdit.ownerContact || ''}">
                            </div>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Owner Email</label>
                            <input type="email" id="edit-prop-owner-email" class="form-input" value="${propToEdit.ownerEmail || ''}">
                        </div>
                        <div class="form-row" style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                            <div class="form-group">
                                <label class="form-label">Property Manager Name</label>
                                <input type="text" id="edit-prop-manager-name" class="form-input" value="${propToEdit.managerName || ''}">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Property Manager Contact Number</label>
                                <input type="text" id="edit-prop-manager-contact" class="form-input" value="${propToEdit.managerContact || ''}">
                            </div>
                        </div>
                        
                        <hr style="border: 0; border-top: 1px solid var(--border-color); margin: 24px 0;">
                        
                        <!-- 3. Property Structure -->
                        <h4 style="margin-bottom: 8px; font-weight: 600; font-size: 14px; color: var(--primary);">3. Property Structure</h4>
                        <p style="font-size: 12px; color: var(--text-muted); margin-bottom: 16px;">* You can configure individual rooms and beds after creating the property.</p>
                        
                        <div class="form-row" style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px;">
                            <div class="form-group">
                                <label class="form-label">Number of Floors <span style="color:red;">*</span></label>
                                <input type="number" id="edit-prop-floors" class="form-input" required min="1" value="${propToEdit.floors || 1}">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Total Rooms <span style="color:red;">*</span></label>
                                <input type="number" id="edit-prop-rooms" class="form-input" required min="1" value="${propToEdit.rooms || 0}">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Total Beds / Capacity <span style="color:red;">*</span></label>
                                <input type="number" id="edit-prop-beds" class="form-input" required min="1" value="${propToEdit.totalBeds || 0}">
                            </div>
                        </div>
                        

                        <div class="modal-footer" style="padding:16px 0; margin-top:24px; background:none; position: sticky; bottom: -24px; background-color: var(--card-bg); z-index: 10; border-top: 1px solid var(--border-color); display: flex; justify-content: space-between;">
                            <button type="button" class="btn btn-danger" onclick="deleteProperty('${propToEdit.id}')" style="background-color: #ef4444; color: white; border: none;">Delete Property</button>
                            <div style="display: flex; gap: 8px;">
                                <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
                                <button type="submit" class="btn btn-primary" id="save-edit-btn">Save Changes</button>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;
    
    setTimeout(() => {
        const backdrop = modal.querySelector('.modal-backdrop');
        const dialog = modal.querySelector('.modal-dialog');
        if (backdrop) backdrop.classList.add('show');
        if (dialog) dialog.classList.add('show');
    }, 10);
};

window.submitEditProperty = async function(e, propId) {
    e.preventDefault();
    const btn = document.getElementById('save-edit-btn');
    if (btn) { btn.disabled = true; btn.textContent = 'Saving...'; }
    
    const data = {
        name: document.getElementById('edit-prop-name').value,
        propertyType: document.getElementById('edit-prop-type').value,
        address: document.getElementById('edit-prop-address').value,
        city: document.getElementById('edit-prop-city').value,
        pincode: document.getElementById('edit-prop-pincode').value,
        occupancyType: document.getElementById('edit-prop-occupancy').value,
        
        ownerName: document.getElementById('edit-prop-owner-name').value,
        ownerContact: document.getElementById('edit-prop-owner-contact').value,
        ownerEmail: document.getElementById('edit-prop-owner-email').value,
        managerName: document.getElementById('edit-prop-manager-name').value,
        managerContact: document.getElementById('edit-prop-manager-contact').value,
        
        floors: document.getElementById('edit-prop-floors').value,
        rooms: document.getElementById('edit-prop-rooms').value,
        totalBeds: document.getElementById('edit-prop-beds').value
    };
    
    try {
        const result = await window.db.updateProperty(propId, data);
        if (result && result.success) {
            showToast('Property updated successfully!');
            closeModal();
            
            // Also update global selector text if it exists
            const globalSelector = document.getElementById('global-property-selector');
            if (globalSelector) {
                for (let i = 0; i < globalSelector.options.length; i++) {
                    if (globalSelector.options[i].value === propId) {
                        globalSelector.options[i].textContent = data.name;
                        break;
                    }
                }
            }
            
            // Refresh data
            await window.db.loadInitialData();
            
            // Refresh the current view
            const activeNav = document.querySelector('.nav-item.active');
            if (activeNav) {
                activeNav.click();
            }
            
        } else {
            showToast(result.error || 'Failed to update property', 'error');
            if (btn) { btn.disabled = false; btn.textContent = 'Save Changes'; }
        }
    } catch (err) {
        console.error(err);
        showToast('Error updating property', 'error');
        if (btn) { btn.disabled = false; btn.textContent = 'Save Changes'; }
    }
};
window.deleteProperty = function(propId) {
    if (!confirm('Are you sure you want to permanently delete this property?')) {
        return;
    }
    
    let props = window.db.get('properties');
    props = props.filter(p => p.id !== propId);
    window.db.set('properties', props);
    
    // Switch to all properties
    window.db.selectedPropertyId = 'all';
    
    const globalSelector = document.getElementById('global-property-selector');
    if (globalSelector) {
        // Remove option
        for (let i = 0; i < globalSelector.options.length; i++) {
            if (globalSelector.options[i].value === propId) {
                globalSelector.remove(i);
                break;
            }
        }
        globalSelector.value = 'all';
        globalSelector.dispatchEvent(new Event('change'));
    }
    
    closeModal();
    
    // Refresh the current view
    const activeNav = document.querySelector('.nav-item.active');
    if (activeNav) {
        activeNav.click();
    }
};

// --- Excel Reports & Downloads ---

window.updateReportFloorDropdown = function(propId) {
    const floorSelect = document.getElementById('report-occ-floor');
    if (!floorSelect) return;
    
    if (propId === 'all') {
        floorSelect.innerHTML = '<option value="all">All Floors</option>';
        floorSelect.disabled = true;
        return;
    }
    
    floorSelect.disabled = false;
    const rooms = window.db.get('rooms').filter(r => r.propertyId === propId);
    const floorsSet = new Set(rooms.map(r => parseInt(r.floor)));
    const floors = Array.from(floorsSet).sort((a,b) => a-b);
    
    let html = '<option value="all">All Floors</option>';
    floors.forEach(f => {
        html += `<option value="${f}">${f === 0 ? 'Ground' : f}</option>`;
    });
    
    floorSelect.innerHTML = html;
};

window.downloadPaymentStatement = function() {
    const month = document.getElementById('report-payment-month').value;
    const propId = document.getElementById('report-payment-property').value;
    
    let payments = window.db.get('payments').filter(p => p.month === month);
    if (propId !== 'all') {
        payments = payments.filter(p => p.propertyId === propId);
    }
    
    if (payments.length === 0) {
        alert('No payment records found for the selected month and property.');
        return;
    }
    
    const residents = window.db.get('residents');
    const rooms = window.db.get('rooms');
    const properties = window.db.get('properties');
    const beds = window.db.get('beds');
    
    let totalExpected = 0;
    let totalCollected = 0;
    let totalPending = 0;
    let numPaid = 0;
    let numPending = 0;
    
    const data = payments.map(p => {
        const res = residents.find(r => r.id === p.residentId) || {};
        const room = rooms.find(r => r.id === res.roomId) || {};
        const bed = beds.find(b => b.id === res.bedId) || {};
        const prop = properties.find(pr => pr.id === p.propertyId) || {};
        
        const expected = p.amountExpected || 0;
        const paid = p.amountPaid || 0;
        
        totalExpected += expected;
        totalCollected += paid;
        
        if (p.status === 'Paid') {
            numPaid++;
        } else if (p.status === 'Pending' || p.status === 'Overdue') {
            numPending++;
            totalPending += expected;
        } else if (p.status === 'Partial') {
            numPending++;
            totalPending += (expected - paid);
        }
        
        return {
            'Property Name': prop.name || 'Unknown',
            'Floor No.': room.floor !== undefined ? (room.floor === 0 ? 'G' : room.floor) : 'N/A',
            'Room No.': room.roomNumber || 'N/A',
            'Bed No.': bed.name || 'N/A',
            'Resident Name': res.name || 'Unknown',
            'Resident Contact Number': res.phone || 'N/A',
            'Monthly Rent': expected,
            'Amount Paid': paid,
            'Payment Date': p.paymentDate || 'N/A',
            'Payment Type / Payment Method': p.paymentMethod || 'Online',
            'Transaction / Reference ID': p.transactionId || 'N/A',
            'Payment Status': p.status || 'Unknown'
        };
    });
    
    // Convert JSON to raw sheet
    const ws = XLSX.utils.json_to_sheet(data);
    
    // Append summary rows manually
    const range = XLSX.utils.decode_range(ws['!ref']);
    let rowIdx = range.e.r + 2; // skip one row
    
    const summaryRows = [
        ['SUMMARY', 'Total Expected Rent', totalExpected],
        ['', 'Total Rent Collected', totalCollected],
        ['', 'Total Pending Rent', totalPending],
        ['', 'Number of Residents Paid', numPaid],
        ['', 'Number of Residents Pending', numPending],
    ];
    
    summaryRows.forEach(row => {
        XLSX.utils.sheet_add_aoa(ws, [row], { origin: `A${rowIdx + 1}` });
        rowIdx++;
    });
    
    // Apply Formatting and Autowidth
    applyExcelStyles(ws, data, ['Monthly Rent', 'Amount Paid']);
    
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Payment Statement");
    XLSX.writeFile(wb, `Payment_Statement_${month}.xlsx`);
};

window.downloadOccupancyStatement = function() {
    const propId = document.getElementById('report-occ-property').value;
    const floorSelect = document.getElementById('report-occ-floor');
    const floor = floorSelect ? floorSelect.value : 'all';
    
    let bedsList = window.db.get('beds');
    if (propId !== 'all') {
        bedsList = bedsList.filter(b => b.propertyId === propId);
    }
    
    const rooms = window.db.get('rooms');
    const residents = window.db.get('residents');
    const properties = window.db.get('properties');
    
    const data = [];
    
    bedsList.forEach(bed => {
        const room = rooms.find(r => r.id === bed.roomId) || {};
        
        // Floor filter
        if (floor !== 'all') {
            if (String(room.floor) !== String(floor)) return;
        }
        
        const prop = properties.find(p => p.id === bed.propertyId) || {};
        let res = null;
        if (bed.residentId) {
            res = residents.find(r => r.id === bed.residentId);
        }
        
        const row = {
            'Property Name': prop.name || 'Unknown',
            'Floor No.': room.floor !== undefined ? (room.floor === 0 ? 'G' : room.floor) : 'N/A',
            'Room No.': room.roomNumber || 'N/A',
            'Bed No.': bed.name || 'Unknown',
            'Bed Status': bed.status || 'Available',
            'Occupancy Status': res ? 'Occupied' : (bed.status || 'Available'),
            'Resident Name': res ? (res.name || 'N/A') : 'N/A',
            'Contact Number': res ? (res.phone || 'N/A') : 'N/A',
            'Email': res ? (res.email || 'N/A') : 'N/A',
            'Date of Birth': res ? (res.dob || 'N/A') : 'N/A',
            'Joining Date': res ? (res.joiningDate || 'N/A') : 'N/A',
            'Monthly Rent': res ? (res.monthlyRent || '') : '',
            'Security Deposit': res ? (res.deposit || '') : '',
            'KYC/ID Type': res ? (res.kycType || 'Aadhaar') : 'N/A',
            'KYC/ID Verification Status': res ? (res.kycStatus || 'Verified') : 'N/A',
            'Emergency Contact Name': res ? (res.emergencyName || 'N/A') : 'N/A',
            'Emergency Contact Number': res ? (res.emergencyPhone || 'N/A') : 'N/A',
            'Permanent Address': res ? (res.permanentAddress || 'N/A') : 'N/A'
        };
        
        data.push(row);
    });
    
    if (data.length === 0) {
        alert('No room/bed data found for the selected property and floor.');
        return;
    }
    
    const ws = XLSX.utils.json_to_sheet(data);
    
    // Apply Formatting and Autowidth
    applyExcelStyles(ws, data, ['Monthly Rent', 'Security Deposit']);
    
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Occupancy Statement");
    
    let filename = 'Occupancy_Statement';
    if (propId !== 'all') {
        const p = properties.find(p => p.id === propId);
        if (p) filename += `_${p.name.replace(/\s+/g, '')}`;
    }
    if (floor !== 'all') filename += `_Floor_${floor}`;
    filename += '.xlsx';
    
    XLSX.writeFile(wb, filename);
};

function applyExcelStyles(ws, dataList, moneyColumns) {
    if (!dataList || dataList.length === 0) return;
    
    const range = XLSX.utils.decode_range(ws['!ref']);
    const C = range.e.c;
    const R = range.e.r;
    
    const colWidths = [];
    const headers = Object.keys(dataList[0]);
    
    // 1. Calculate column widths
    headers.forEach((header, cIdx) => {
        let maxLen = header.length;
        
        dataList.forEach(row => {
            const val = row[header] !== undefined && row[header] !== null ? String(row[header]) : '';
            if (val.length > maxLen) {
                maxLen = val.length;
            }
        });
        
        // Cap max width at 60 characters to wrap long text (Address, etc)
        const width = Math.min(Math.max(maxLen + 4, 10), 60); 
        colWidths[cIdx] = { wch: width };
    });
    ws['!cols'] = colWidths;
    
    // 2. Enable AutoFilters on header
    ws['!autofilter'] = { ref: XLSX.utils.encode_range({s: {r:0, c:0}, e: {r:0, c:C}}) };
    
    // 3. Freeze Header Row
    ws['!freeze'] = { xSplit: 0, ySplit: 1, topLeftCell: "A2", activePane: "bottomRight", state: "frozen" };
    
    // 4. Style Cells
    for (let row = 0; row <= R; row++) {
        for (let col = 0; col <= C; col++) {
            const cellRef = XLSX.utils.encode_cell({c: col, r: row});
            if (!ws[cellRef]) continue;
            
            const cell = ws[cellRef];
            const headerName = headers[col] || '';
            const val = cell.v;
            
            // Base style object
            if (!cell.s) cell.s = {};
            if (!cell.s.font) cell.s.font = {};
            if (!cell.s.alignment) cell.s.alignment = { vertical: "center" };
            
            // Header Row Styling
            if (row === 0) {
                cell.s.font.bold = true;
                cell.s.fill = { fgColor: { rgb: "F3F4F6" } };
                cell.s.alignment.horizontal = "center";
                continue;
            }
            
            // Handle Long Text Wrapping
            if (colWidths[col] && colWidths[col].wch >= 60 && typeof val === 'string' && val.length > 55) {
                cell.s.alignment.wrapText = true;
            }
            
            // Content Alignment based on Header
            if (['Floor No.', 'Room No.', 'Bed No.', 'Bed Status', 'Occupancy Status', 'Payment Status'].includes(headerName)) {
                cell.s.alignment.horizontal = "center";
            } else if (['Resident Name', 'Property Name', 'Email', 'Resident Contact Number', 'Contact Number', 'Emergency Contact Number'].includes(headerName)) {
                cell.s.alignment.horizontal = "left";
            }
            
            // Number formatting for Money
            if (moneyColumns.includes(headerName) && typeof val === 'number') {
                cell.s.alignment.horizontal = "right";
                cell.z = '₹#,##0.00';
            }
            
            // Summary row bolding
            if (typeof val === 'string' && val === 'SUMMARY') {
                cell.s.font.bold = true;
            }
        }
    }
}


// --- Receipt Generation ---
async function generateReceipt(paymentId) {
    const payment = window.db.get('payments').find(p => p.id === paymentId);
    if (!payment) return;
    
    // Get related data
    const resident = window.db.get('residents').find(r => r.id === payment.residentId) || { name: payment.residentName, phone: payment.residentPhone, roomId: null };
    
    // Find room via resident, then fallback to looking it up
    let room;
    if (resident.roomId) {
        room = window.db.get('rooms').find(r => r.id === resident.roomId);
    }
    
    // Get property
    let property;
    if (payment.propertyId) {
        property = window.db.get('properties').find(p => p.id === payment.propertyId);
    } else if (room) {
        property = window.db.get('properties').find(p => p.id === room.propertyId);
    }
    
    if (!property) {
        property = { name: payment.propertyName || 'Property', address: 'Address not found' };
    }
    if (!room) {
        room = { floor: 'N/A', roomNumber: payment.roomNumber || 'N/A' };
    }
    
    // Get bed info if available
    let bedStr = '';
    if (resident.roomId) {
        const bed = window.db.get('beds').find(b => b.roomId === resident.roomId && b.status === 'Occupied');
        if (bed) bedStr = ` · Bed ${bed.bedName}`;
    }

    const currency = window.db.get('settings')?.currency || '₹';
    const amountExpected = payment.amountExpected || 0;
    const amountPaid = payment.amountPaid || 0;
    const balance = Math.max(0, amountExpected - amountPaid);
    
    // Populate Template
    document.getElementById('receipt-property-name').textContent = property.name;
    document.getElementById('receipt-footer-prop-name').textContent = property.name;
    document.getElementById('receipt-footer-prop-address').textContent = property.address || '';
    
    document.getElementById('receipt-resident-name').textContent = resident.name || payment.residentName;
    document.getElementById('receipt-resident-phone').textContent = resident.phone || payment.residentPhone || 'N/A';
    document.getElementById('receipt-resident-room').textContent = `Floor ${room.floor || '0'} · Room ${room.roomNumber}${bedStr}`;
    
    // Receipt No (Mock if not present)
    const recNo = `REC-${payment.id.replace('pay_', '').substring(0, 6).toUpperCase()}`;
    document.getElementById('receipt-no').textContent = recNo;
    
    document.getElementById('receipt-payment-date').textContent = payment.paymentDate || 'N/A';
    document.getElementById('receipt-datetime').textContent = payment.paymentDate ? `${payment.paymentDate} 10:00 AM` : 'N/A';
    
    // Format Month (e.g. 2026-09 to September 2026)
    let displayMonth = payment.month;
    if (displayMonth && displayMonth.includes('-')) {
        const [yyyy, mm] = displayMonth.split('-');
        const date = new Date(parseInt(yyyy), parseInt(mm) - 1, 1);
        displayMonth = date.toLocaleString('default', { month: 'long', year: 'numeric' });
    }
    document.getElementById('receipt-rent-month').textContent = displayMonth;
    document.getElementById('receipt-table-month').textContent = displayMonth;
    
    const dueDate = `${window.db.get('settings')?.rentDueDate || 5} ${displayMonth}`;
    document.getElementById('receipt-due-date').textContent = dueDate;
    
    document.getElementById('receipt-status-top').textContent = payment.status;
    document.getElementById('receipt-status-bottom').textContent = payment.status;
    
    document.getElementById('receipt-table-due').textContent = `${currency}${amountExpected.toLocaleString()}`;
    document.getElementById('receipt-table-paid').textContent = `${currency}${amountPaid.toLocaleString()}`;
    document.getElementById('receipt-table-balance').textContent = `${currency}${balance.toLocaleString()}`;
    
    document.getElementById('receipt-summary-rent').textContent = `${currency}${amountExpected.toLocaleString()}`;
    document.getElementById('receipt-summary-paid').textContent = `${currency}${amountPaid.toLocaleString()}`;
    document.getElementById('receipt-summary-balance').textContent = `${currency}${balance.toLocaleString()}`;
    
    document.getElementById('receipt-mode').textContent = payment.paymentMode || 'N/A';
    document.getElementById('receipt-tx-id').textContent = payment.referenceNumber || 'N/A';

    // Show temporary, generate, hide
    const element = document.getElementById('receipt-template');
    const container = document.getElementById('receipt-container');
    container.style.display = 'block';
    
    showToast('Generating Receipt...', 'info');
    
    const opt = {
      margin:       0,
      filename:     `Receipt_${recNo}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true },
      jsPDF:        { unit: 'in', format: 'a4', orientation: 'portrait' }
    };

    try {
        html2pdf().set(opt).from(element).outputPdf('bloburl').then(function(pdfUrl) {
            container.style.display = 'none';
            // Try opening in new tab
            const newWindow = window.open(pdfUrl, '_blank');
            if(!newWindow) {
                // If popup blocked, fallback to download
                html2pdf().set(opt).from(element).save().then(() => {
                    showToast('Receipt downloaded successfully! (Popup blocked)');
                });
            } else {
                showToast('Receipt opened in new tab!', 'success');
            }
        }).catch(err => {
            console.error(err);
            container.style.display = 'none';
            showToast('Error generating PDF', 'error');
        });
    } catch (err) {
        console.error(err);
        container.style.display = 'none';
        showToast('PDF library not loaded properly', 'error');
    }
}


// =========================================================================
// SETTINGS VIEW & LOGIC
// =========================================================================

function renderSettingsView(container) {
    const settings = window.db.get('settings') || {};
    const ownerName = settings.ownerName || 'Admin User';
    const companyName = settings.companyName || 'PG Management Co.';
    const email = settings.email || 'admin@example.com';
    const phone = settings.phone || '+91 9876543210';
    
    // Check saved theme
    const currentTheme = localStorage.getItem('pg_theme') || 'system';

    container.innerHTML = `
        <div class="filter-bar">
            <div class="filter-bar-left">
                <span style="font-weight:700; font-size:18px;">Application Settings</span>
            </div>
        </div>

        <div style="width: 100%; margin-bottom: 40px;">
            
            <!-- 1. Account & Profile -->
            <div class="settings-section-card">
                <div class="settings-section-header" style="display:flex; justify-content:space-between; align-items:center;">
                    <div>
                        <h3 class="settings-section-title">Account & Profile</h3>
                        <p class="settings-section-desc">Manage your personal and business contact details.</p>
                    </div>
                    <button class="btn btn-secondary btn-sm" onclick="openEditProfileModal()">Edit Profile</button>
                </div>
                <div class="settings-section-body">
                    <div class="settings-row" style="padding-top:0;">
                        <div class="settings-row-info">
                            <h4>Owner Name</h4>
                            <p>${ownerName}</p>
                        </div>
                    </div>
                    <div class="settings-row">
                        <div class="settings-row-info">
                            <h4>Business / Company Name</h4>
                            <p>${companyName}</p>
                        </div>
                    </div>
                    <div class="settings-row">
                        <div class="settings-row-info">
                            <h4>Email Address</h4>
                            <p>${email}</p>
                        </div>
                    </div>
                    <div class="settings-row">
                        <div class="settings-row-info">
                            <h4>Phone Number</h4>
                            <p>${phone}</p>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 2. Security -->
            <div class="settings-section-card">
                <div class="settings-section-header" style="display:flex; justify-content:space-between; align-items:center;">
                    <div>
                        <h3 class="settings-section-title">Security</h3>
                        <p class="settings-section-desc">Manage your password and account security.</p>
                    </div>
                    <button class="btn btn-secondary btn-sm" onclick="openChangePasswordModal()">Change Password</button>
                </div>
                <div class="settings-section-body">
                    <div class="settings-row" style="padding-top:0;">
                        <div class="settings-row-info">
                            <h4>Account Password</h4>
                            <p>Last changed: Never</p>
                        </div>
                    </div>
                    <div class="settings-row" style="border-bottom:none;">
                        <div class="settings-row-info">
                            <h4>Access key</h4>
                            <p>Enter your unique access key</p>
                        </div>
                        <div style="position: relative; width: 180px;">
                            <input type="password" id="access-key-input" class="form-input" style="width: 100%; padding-right: 36px;" placeholder="••••••••••••">
                            <button type="button" onclick="const input = document.getElementById('access-key-input'); const icon = this.querySelector('i'); if (input.type === 'password') { input.type = 'text'; icon.setAttribute('data-lucide', 'eye-off'); } else { input.type = 'password'; icon.setAttribute('data-lucide', 'eye'); } window.lucide.createIcons();" style="position: absolute; right: 8px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; color: var(--text-muted); display: flex; align-items: center; justify-content: center; padding: 2px;">
                                <i data-lucide="eye" style="width: 16px; height: 16px;"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 3. General & Appearance -->
            <div class="settings-section-card">
                <div class="settings-section-header">
                    <h3 class="settings-section-title">General & Appearance</h3>
                    <p class="settings-section-desc">Change the theme and language.</p>
                </div>
                <div class="settings-section-body">
                    <div class="settings-row">
                        <div class="settings-row-info">
                            <h4>Theme</h4>
                            <p>Select your preferred color scheme</p>
                        </div>
                        <div>
                            <select class="form-input" style="width: 200px;" onchange="applyTheme(this.value)">
                                <option value="light" ${currentTheme === 'light' ? 'selected' : ''}>Light Mode</option>
                                <option value="dark" ${currentTheme === 'dark' ? 'selected' : ''}>Dark Mode</option>
                                <option value="system" ${currentTheme === 'system' ? 'selected' : ''}>System Default</option>
                            </select>
                        </div>
                    </div>
                    <div class="settings-row" style="border-bottom:none;">
                        <div class="settings-row-info">
                            <h4>Language</h4>
                            <p>Select your preferred application language</p>
                        </div>
                        <div>
                            <select class="form-input" style="width: 200px;">
                                <option value="en" selected>English</option>
                                <option value="hi">Hindi</option>
                                <option value="kn">Kannada</option>
                                <option value="te">Telugu</option>
                                <option value="ta">Tamil</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 4. Subscription Plan -->
            <div class="settings-section-card">
                <div class="settings-section-header">
                    <h3 class="settings-section-title">Subscription Plan</h3>
                    <p class="settings-section-desc">Manage your PG Manager SaaS subscription.</p>
                </div>
                <div class="settings-section-body">
                    <div style="background-color: var(--bg-main); padding: 24px; border-radius: 12px; border: 1px solid var(--border-color); max-width: 400px; box-shadow: 0 4px 6px rgba(0,0,0,0.02);">
                        
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px;">
                            <div>
                                <h4 style="margin: 0 0 8px 0; font-size: 18px; font-weight: 700; color: var(--text-main);">Premium Plan</h4>
                                <span style="display: inline-block; padding: 4px 10px; background-color: #dcfce7; color: #166534; border-radius: 16px; font-size: 12px; font-weight: 600;">Active</span>
                            </div>
                            <div style="text-align: right;">
                                <h4 style="margin: 0 0 4px 0; font-size: 20px; font-weight: 800; color: var(--text-main);">₹1,999</h4>
                                <p style="margin: 0; font-size: 13px; color: var(--text-muted);">per month</p>
                            </div>
                        </div>

                        <hr style="border: 0; border-top: 1px solid var(--border-color); margin: 0 0 16px 0;">

                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                            <div style="display: flex; align-items: center; gap: 8px; color: var(--text-muted);">
                                <i data-lucide="refresh-cw" style="width: 16px; height: 16px;"></i>
                                <span style="font-size: 14px;">Billing</span>
                            </div>
                            <span style="font-size: 14px; font-weight: 600; color: var(--text-main);">Monthly</span>
                        </div>

                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <div style="display: flex; align-items: center; gap: 8px; color: var(--text-muted);">
                                <i data-lucide="calendar" style="width: 16px; height: 16px;"></i>
                                <span style="font-size: 14px;">Next billing</span>
                            </div>
                            <span style="font-size: 14px; font-weight: 600; color: var(--text-main);">
                                ${new Date(new Date().setMonth(new Date().getMonth() + 1)).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </span>
                        </div>

                    </div>
                </div>
            </div>

            <!-- 5. Support & Contact -->
            <div class="settings-section-card">
                <div class="settings-section-header">
                    <h3 class="settings-section-title">Support & Contact</h3>
                    <p class="settings-section-desc">Need help? Get in touch with the PG Manager support team.</p>
                </div>
                <div class="settings-section-body">
                    <div class="settings-row" style="padding-top:0;">
                        <div class="settings-row-info">
                            <h4>Email Support</h4>
                            <p>Typically replies within 2-4 hours</p>
                        </div>
                        <div>
                            <a href="mailto:support@pgmanager.com" style="color: var(--primary); text-decoration: none; font-weight: 600;">support@pgmanager.com</a>
                        </div>
                    </div>
                    <div class="settings-row">
                        <div class="settings-row-info">
                            <h4>Phone Support</h4>
                            <p>Available Mon-Fri, 9 AM - 6 PM</p>
                        </div>
                        <div>
                            <a href="tel:+9118001234567" style="color: var(--primary); text-decoration: none; font-weight: 600;">1800 123 4567</a>
                        </div>
                    </div>
                    <div class="settings-row" style="border-bottom:none;">
                        <div class="settings-row-info">
                            <h4>Help Center</h4>
                            <p>Browse FAQs and tutorials</p>
                        </div>
                        <div>
                            <button class="btn btn-secondary btn-sm">Visit Help Center</button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 6. Logout -->
            <div style="text-align: center; margin-top: 40px;">
                <button class="btn" style="background-color: #fef2f2; color: #ef4444; border: 1px solid #fecaca; padding: 12px 32px; font-weight: 600; border-radius: 8px;" onclick="openLogoutModal()">
                    <i data-lucide="log-out" style="width:16px; height:16px; display:inline-block; vertical-align:middle; margin-right:8px;"></i>
                    Log Out of PG Manager
                </button>
            </div>
            
        </div>
    `;
}

// --- Settings Modals & Logic ---

function applyTheme(themeName) {
    localStorage.setItem('pg_theme', themeName);
    if (themeName === 'dark' || (themeName === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.documentElement.setAttribute('data-theme', 'dark');
    } else {
        document.documentElement.removeAttribute('data-theme');
    }
    showToast('Theme updated successfully', 'success');
}

// Apply theme on load
(function() {
    const savedTheme = localStorage.getItem('pg_theme') || 'system';
    if (savedTheme === 'dark' || (savedTheme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.documentElement.setAttribute('data-theme', 'dark');
    }
})();

function openEditProfileModal() {
    const settings = window.db.get('settings') || {};
    const modal = document.getElementById('modal-container');
    modal.innerHTML = `
        <div class="modal-backdrop" onclick="closeModal(event)">
            <div class="modal-dialog">
                <div class="modal-header">
                    <h3 class="modal-title">Edit Account Profile</h3>
                    <button class="modal-close-btn" onclick="closeModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <form id="form-edit-profile" onsubmit="submitEditProfile(event)">
                        <div class="form-group">
                            <label class="form-label">Owner Name</label>
                            <input type="text" id="prof_owner" class="form-input" required value="${settings.ownerName || ''}">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Business / Company Name</label>
                            <input type="text" id="prof_company" class="form-input" required value="${settings.companyName || ''}">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Email Address</label>
                            <input type="email" id="prof_email" class="form-input" required value="${settings.email || ''}">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Phone Number</label>
                            <input type="tel" id="prof_phone" class="form-input" required value="${settings.phone || ''}">
                        </div>
                        <div class="modal-actions">
                            <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
                            <button type="submit" class="btn btn-primary">Save Changes</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;
}

async function submitEditProfile(e) {
    e.preventDefault();
    const payload = {
        ownerName: document.getElementById('prof_owner').value,
        companyName: document.getElementById('prof_company').value,
        email: document.getElementById('prof_email').value,
        phone: document.getElementById('prof_phone').value
    };
    
    // Simulate API call since settings update isn't fully implemented
    await new Promise(r => setTimeout(r, 600));
    
    let settings = window.db.get('settings') || {};
    Object.assign(settings, payload);
    window.db.state.settings = settings; // Mock update
    
    showToast('Profile updated successfully', 'success');
    closeModal();
    renderSettingsView(document.getElementById('view-container'));
}

// --- Security / OTP Flow ---

function openChangePasswordModal() {
    const modal = document.getElementById('modal-container');
    modal.innerHTML = `
        <div class="modal-backdrop" onclick="closeModal(event)">
            <div class="modal-dialog">
                <div class="modal-header">
                    <h3 class="modal-title">Change Password</h3>
                    <button class="modal-close-btn" onclick="closeModal()">&times;</button>
                </div>
                <div class="modal-body" id="pwd-step-1">
                    <form onsubmit="submitChangePasswordStep1(event)">
                        <div class="form-group">
                            <label class="form-label">Current Password</label>
                            <input type="password" id="pwd_current" class="form-input" required>
                        </div>
                        <div class="form-group">
                            <label class="form-label">New Password</label>
                            <input type="password" id="pwd_new" class="form-input" required oninput="checkPasswordRequirements()">
                            <ul class="pwd-req-list" id="pwd-req-list">
                                <li id="req-length">Minimum 8 characters</li>
                                <li id="req-upper">At least one uppercase letter</li>
                                <li id="req-lower">At least one lowercase letter</li>
                                <li id="req-number">At least one number</li>
                                <li id="req-special">At least one special character</li>
                            </ul>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Confirm New Password</label>
                            <input type="password" id="pwd_confirm" class="form-input" required>
                        </div>
                        <div id="pwd-error" style="color: #ef4444; font-size: 13px; margin-bottom: 16px; display: none;"></div>
                        <div class="modal-actions">
                            <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
                            <button type="submit" class="btn btn-primary" id="btn-pwd-next" disabled>Next: Verify OTP</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;
}

function checkPasswordRequirements() {
    const val = document.getElementById('pwd_new').value;
    const btn = document.getElementById('btn-pwd-next');
    
    const reqs = {
        length: val.length >= 8,
        upper: /[A-Z]/.test(val),
        lower: /[a-z]/.test(val),
        number: /[0-9]/.test(val),
        special: /[^A-Za-z0-9]/.test(val)
    };
    
    let allValid = true;
    for (const [key, isValid] of Object.entries(reqs)) {
        const el = document.getElementById(`req-${key}`);
        if (isValid) {
            el.style.color = '#10b981'; // Green
        } else {
            el.style.color = 'var(--text-muted)';
            allValid = false;
        }
    }
    
    btn.disabled = !allValid;
    return allValid;
}

async function submitChangePasswordStep1(e) {
    e.preventDefault();
    const curr = document.getElementById('pwd_current').value;
    const newP = document.getElementById('pwd_new').value;
    const conf = document.getElementById('pwd_confirm').value;
    const err = document.getElementById('pwd-error');
    
    if (newP !== conf) {
        err.textContent = "New passwords do not match.";
        err.style.display = 'block';
        return;
    }
    
    // Simulate checking current password (accepting any for prototype)
    err.style.display = 'none';
    const btn = document.getElementById('btn-pwd-next');
    btn.textContent = 'Sending OTP...';
    btn.disabled = true;
    
    await new Promise(r => setTimeout(r, 1000));
    
    const settings = window.db.get('settings') || {};
    const phone = settings.phone || '+91 *******210';
    showOTPVerification(phone);
}

let otpTimerInterval;
let otpAttemptCount = 0;

function showOTPVerification(phoneMasked) {
    const body = document.querySelector('.modal-dialog .modal-body');
    body.innerHTML = `
        <div style="text-align: center; padding: 10px 0;">
            <div style="width: 48px; height: 48px; background-color: #e0e7ff; color: #4338ca; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px auto;">
                <i data-lucide="smartphone" style="width:24px; height:24px;"></i>
            </div>
            <h4 style="font-size: 18px; margin: 0 0 8px 0;">Verify OTP</h4>
            <p style="font-size: 14px; color: var(--text-muted); margin: 0;">Enter the 4-digit code sent to<br><strong>${phoneMasked}</strong></p>
            
            <form onsubmit="verifyOTP(event)">
                <div class="otp-input-container">
                    <input type="text" class="otp-input" maxlength="1" onkeyup="focusNextOTP(this, 'otp2')" id="otp1" required autocomplete="off">
                    <input type="text" class="otp-input" maxlength="1" onkeyup="focusNextOTP(this, 'otp3')" id="otp2" required autocomplete="off">
                    <input type="text" class="otp-input" maxlength="1" onkeyup="focusNextOTP(this, 'otp4')" id="otp3" required autocomplete="off">
                    <input type="text" class="otp-input" maxlength="1" onkeyup="focusNextOTP(this, '')" id="otp4" required autocomplete="off">
                </div>
                
                <div id="otp-error" style="color: #ef4444; font-size: 13px; margin-bottom: 16px; display: none;"></div>
                
                <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 24px;">
                    Code expires in <span id="otp-timer" style="font-weight:700; color:var(--primary);">02:00</span>
                </p>
                
                <button type="submit" class="btn btn-primary" style="width:100%; margin-bottom: 16px;" id="btn-verify-otp">Verify & Change Password</button>
                
                <p style="font-size: 13px; color: var(--text-muted); margin: 0;">
                    Didn't receive code? <a href="#" onclick="resendOTP()" style="color: var(--primary); font-weight: 600; text-decoration: none;" id="btn-resend-otp" disabled>Resend Code</a>
                </p>
            </form>
        </div>
    `;
    lucide.createIcons();
    setTimeout(() => document.getElementById('otp1').focus(), 100);
    startOTPTimer();
}

function focusNextOTP(current, nextId) {
    if (current.value.length === 1 && nextId) {
        document.getElementById(nextId).focus();
    }
}

function startOTPTimer() {
    clearInterval(otpTimerInterval);
    let timeLeft = 120; // 2 minutes
    const timerDisplay = document.getElementById('otp-timer');
    const resendBtn = document.getElementById('btn-resend-otp');
    
    if(resendBtn) {
        resendBtn.style.opacity = '0.5';
        resendBtn.style.pointerEvents = 'none';
    }

    otpTimerInterval = setInterval(() => {
        timeLeft--;
        if(timerDisplay) {
            const m = Math.floor(timeLeft / 60).toString().padStart(2, '0');
            const s = (timeLeft % 60).toString().padStart(2, '0');
            timerDisplay.textContent = `${m}:${s}`;
        }
        
        if (timeLeft <= 0) {
            clearInterval(otpTimerInterval);
            if(timerDisplay) {
                timerDisplay.textContent = 'Expired';
                timerDisplay.style.color = '#ef4444';
            }
            if(resendBtn) {
                resendBtn.style.opacity = '1';
                resendBtn.style.pointerEvents = 'auto';
            }
            const err = document.getElementById('otp-error');
            if(err) {
                err.textContent = "OTP has expired. Please resend.";
                err.style.display = 'block';
            }
        }
    }, 1000);
}

function resendOTP() {
    startOTPTimer();
    document.getElementById('otp1').value = '';
    document.getElementById('otp2').value = '';
    document.getElementById('otp3').value = '';
    document.getElementById('otp4').value = '';
    document.getElementById('otp-error').style.display = 'none';
    showToast('A new OTP has been sent.', 'info');
    document.getElementById('otp1').focus();
}

async function verifyOTP(e) {
    e.preventDefault();
    const btn = document.getElementById('btn-verify-otp');
    const err = document.getElementById('otp-error');
    
    const o1 = document.getElementById('otp1').value;
    const o2 = document.getElementById('otp2').value;
    const o3 = document.getElementById('otp3').value;
    const o4 = document.getElementById('otp4').value;
    const otp = o1+o2+o3+o4;
    
    if(otp.length !== 4) return;
    
    btn.textContent = 'Verifying...';
    btn.disabled = true;
    err.style.display = 'none';
    
    await new Promise(r => setTimeout(r, 1000));
    
    // Simulate failure on "0000" or too many attempts
    otpAttemptCount++;
    if (otpAttemptCount > 3) {
        err.textContent = "Too many failed attempts. Please restart the process.";
        err.style.display = 'block';
        btn.textContent = 'Verify & Change Password';
        btn.disabled = true;
        clearInterval(otpTimerInterval);
        return;
    }
    
    if (otp === '0000') {
        err.textContent = "Incorrect OTP. Please try again.";
        err.style.display = 'block';
        btn.textContent = 'Verify & Change Password';
        btn.disabled = false;
        return;
    }
    
    // Success flow
    clearInterval(otpTimerInterval);
    const body = document.querySelector('.modal-dialog .modal-body');
    body.innerHTML = `
        <div style="text-align: center; padding: 20px 0;">
            <div style="width: 64px; height: 64px; background-color: #d1fae5; color: #10b981; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px auto;">
                <i data-lucide="check-circle" style="width:32px; height:32px;"></i>
            </div>
            <h4 style="font-size: 20px; margin: 0 0 8px 0; color: #10b981;">Password Updated</h4>
            <p style="font-size: 14px; color: var(--text-muted); margin: 0 0 24px 0;">Your account password has been changed successfully.</p>
            <button class="btn btn-primary" onclick="closeModal()">Done</button>
        </div>
    `;
    lucide.createIcons();
    otpAttemptCount = 0;
}

// --- Logout Flow ---
function openLogoutModal() {
    const modal = document.getElementById('modal-container');
    modal.innerHTML = `
        <div class="modal-backdrop" onclick="closeModal(event)">
            <div class="modal-dialog" style="max-width: 400px; text-align: center;">
                <div class="modal-body" style="padding: 32px 24px;">
                    <div style="width: 56px; height: 56px; background-color: #fef2f2; color: #ef4444; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px auto;">
                        <i data-lucide="log-out" style="width:28px; height:28px;"></i>
                    </div>
                    <h3 style="font-size: 20px; margin: 0 0 8px 0;">Log Out</h3>
                    <p style="font-size: 14px; color: var(--text-muted); margin: 0 0 24px 0;">Are you sure you want to log out of your account?</p>
                    <div style="display: flex; gap: 12px; justify-content: center;">
                        <button class="btn btn-secondary" style="flex:1;" onclick="closeModal()">Cancel</button>
                        <button class="btn" style="flex:1; background-color: #ef4444; color: white; border:none;" onclick="confirmLogout()">Log Out</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    lucide.createIcons();
}

function confirmLogout() {
    closeModal();
    // Simulate secure session end
    document.body.innerHTML = `
        <div style="height: 100vh; width: 100vw; display: flex; flex-direction: column; align-items: center; justify-content: center; background-color: #f8fafc; font-family: 'Inter', sans-serif;">
            <div style="width: 64px; height: 64px; background-color: #3b3486; color: white; border-radius: 16px; display: flex; align-items: center; justify-content: center; margin-bottom: 24px;">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
            </div>
            <h2 style="margin: 0 0 8px 0; color: #0f172a;">You have been logged out</h2>
            <p style="color: #64748b; margin: 0 0 24px 0;">Thank you for using PG Manager SaaS.</p>
            <button onclick="window.location.reload()" style="background-color: #3b3486; color: white; border: none; padding: 10px 24px; border-radius: 6px; cursor: pointer; font-weight: 600;">Return to Login</button>
        </div>
    `;
}
