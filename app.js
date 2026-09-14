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
    // Global Property Selector
    const propSelect = document.getElementById('global-property-selector');
    if (propSelect) {
        propSelect.addEventListener('change', async (e) => {
            const selectedId = e.target.value;
            await window.db.loadState(selectedId);
            showToast(selectedId === 'all' ? 'Switched to All Properties' : `Filtered to ${e.target.options[e.target.selectedIndex].text}`, 'info');
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

    switch (currentView) {
        case 'dashboard':
            pageTitle.textContent = 'Dashboard' + propSuffix;
            renderDashboardView(container);
            break;
        case 'properties':
            pageTitle.textContent = 'Properties & Room Matrix' + propSuffix;
            renderPropertiesView(container);
            break;
        case 'residents':
            pageTitle.textContent = 'Resident Management & KYC' + propSuffix;
            renderResidentsView(container);
            break;
        case 'payments':
            pageTitle.textContent = 'Rent & Payments' + propSuffix;
            renderPaymentsView(container);
            break;
        case 'complaints':
            pageTitle.textContent = 'Complaints & Maintenance' + propSuffix;
            renderComplaintsView(container);
            break;
        case 'leads':
            pageTitle.textContent = 'Leads & Enquiries CRM' + propSuffix;
            renderLeadsView(container);
            break;
        case 'reports':
            pageTitle.textContent = 'Reports & Business Analytics' + propSuffix;
            renderReportsView(container);
            break;
        default:
            renderDashboardView(container);
    }
    lucide.createIcons();
}

// =========================================================================
// 1. DASHBOARD VIEW (Business Summary & Actionable Alerts)
// =========================================================================
function renderDashboardView(container) {
    const analytics = window.db.state.analytics || {};
    const alerts = analytics.alerts || {};
    const settings = window.db.get('settings') || {};
    const currency = settings.currency || '₹';

    container.innerHTML = `
        <!-- Top Actionable Attention Banners -->
        <div class="alert-banner-grid">
            <div class="alert-banner danger" onclick="navigateTo('payments')">
                <div class="alert-banner-left">
                    <i data-lucide="alert-circle"></i>
                    <span>Overdue Rent Collections</span>
                </div>
                <span class="alert-count-pill">${currency}${(alerts.overdueRent || 0).toLocaleString()}</span>
            </div>
            <div class="alert-banner warning" onclick="navigateTo('residents')">
                <div class="alert-banner-left">
                    <i data-lucide="shield-alert"></i>
                    <span>Pending KYC Verifications</span>
                </div>
                <span class="alert-count-pill">${alerts.pendingKyc || 0} Residents</span>
            </div>
            <div class="alert-banner danger" onclick="navigateTo('complaints')">
                <div class="alert-banner-left">
                    <i data-lucide="wrench"></i>
                    <span>Active Maintenance Tickets</span>
                </div>
                <span class="alert-count-pill">${alerts.pendingComplaints || 0} Open</span>
            </div>
            <div class="alert-banner info" onclick="navigateTo('leads')">
                <div class="alert-banner-left">
                    <i data-lucide="user-plus"></i>
                    <span>Leads Requiring Follow-up</span>
                </div>
                <span class="alert-count-pill">${alerts.leadsFollowup || 0} Leads</span>
            </div>
        </div>

        <!-- 9 Core KPI Cards -->
        <div class="kpi-grid">
            <div class="kpi-card">
                <div class="kpi-icon primary"><i data-lucide="building"></i></div>
                <div class="kpi-info">
                    <span class="kpi-label">Properties</span>
                    <span class="kpi-value">${analytics.totalProperties || 1}</span>
                    <span class="kpi-sub">Active Locations</span>
                </div>
            </div>

            <div class="kpi-card">
                <div class="kpi-icon purple"><i data-lucide="bed"></i></div>
                <div class="kpi-info">
                    <span class="kpi-label">Total Beds</span>
                    <span class="kpi-value">${analytics.totalBeds || 0}</span>
                    <span class="kpi-sub">Capacity across PG</span>
                </div>
            </div>

            <div class="kpi-card">
                <div class="kpi-icon success"><i data-lucide="user-check"></i></div>
                <div class="kpi-info">
                    <span class="kpi-label">Occupied Beds</span>
                    <span class="kpi-value">${analytics.occupiedBeds || 0}</span>
                    <span class="kpi-sub">Active Residents</span>
                </div>
            </div>

            <div class="kpi-card">
                <div class="kpi-icon warning"><i data-lucide="bed-double"></i></div>
                <div class="kpi-info">
                    <span class="kpi-label">Vacant Beds</span>
                    <span class="kpi-value">${analytics.vacantBeds || 0}</span>
                    <span class="kpi-sub">Available for Booking</span>
                </div>
            </div>

            <div class="kpi-card">
                <div class="kpi-icon primary"><i data-lucide="pie-chart"></i></div>
                <div class="kpi-info">
                    <span class="kpi-label">Occupancy Rate</span>
                    <span class="kpi-value">${analytics.occupancyRate || 0}%</span>
                    <span class="kpi-sub">Target: >85%</span>
                </div>
            </div>

            <div class="kpi-card">
                <div class="kpi-icon success"><i data-lucide="indian-rupee"></i></div>
                <div class="kpi-info">
                    <span class="kpi-label">Rent Collected</span>
                    <span class="kpi-value">${currency}${(analytics.rentCollected || 0).toLocaleString()}</span>
                    <span class="kpi-sub">Current Month</span>
                </div>
            </div>

            <div class="kpi-card">
                <div class="kpi-icon danger"><i data-lucide="clock"></i></div>
                <div class="kpi-info">
                    <span class="kpi-label">Pending Rent</span>
                    <span class="kpi-value">${currency}${(analytics.rentPending || 0).toLocaleString()}</span>
                    <span class="kpi-sub">To be collected</span>
                </div>
            </div>

            <div class="kpi-card">
                <div class="kpi-icon warning"><i data-lucide="receipt"></i></div>
                <div class="kpi-info">
                    <span class="kpi-label">Total Expenses</span>
                    <span class="kpi-value">${currency}${(analytics.monthExpenses || 0).toLocaleString()}</span>
                    <span class="kpi-sub">Current Month</span>
                </div>
            </div>

            <div class="kpi-card">
                <div class="kpi-icon success"><i data-lucide="trending-up"></i></div>
                <div class="kpi-info">
                    <span class="kpi-label">Net Profit</span>
                    <span class="kpi-value">${currency}${(analytics.netProfit || 0).toLocaleString()}</span>
                    <span class="kpi-sub">${analytics.profitMargin || 0}% Margin</span>
                </div>
            </div>
        </div>

        <!-- Charts Section -->
        <div style="display:grid; grid-template-columns: 2fr 1fr; gap:20px; margin-bottom:24px;">
            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">Revenue vs Expenses (Monthly Trend)</h3>
                </div>
                <div class="card-body">
                    <canvas id="chart-monthly-trends" height="110"></canvas>
                </div>
            </div>

            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">Bed Status Breakdown</h3>
                </div>
                <div class="card-body" style="display:flex; justify-content:center;">
                    <canvas id="chart-occupancy-donut" height="180"></canvas>
                </div>
            </div>
        </div>

        <!-- Recent Activity Quick Feed -->
        <div class="card">
            <div class="card-header">
                <h3 class="card-title">Operational Workflow Activity</h3>
                <button class="btn btn-secondary btn-sm" onclick="navigateTo('residents')">View All Residents</button>
            </div>
            <div class="card-body" style="padding:0;">
                <div class="table-container">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Workflow Stage</th>
                                <th>Details</th>
                                <th>Property</th>
                                <th>Time / Date</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td><span class="badge badge-purple"><i data-lucide="user-plus"></i> Lead Enquiry</span></td>
                                <td><strong>Abhinav Saxena</strong> interested in Double Sharing (₹9,500/mo)</td>
                                <td>Urban Stay PG - Yelahanka</td>
                                <td>2026-09-12</td>
                                <td><span class="badge badge-info">Visit Scheduled</span></td>
                            </tr>
                            <tr>
                                <td><span class="badge badge-success"><i data-lucide="user-check"></i> Resident Onboarded</span></td>
                                <td><strong>Aarav Sharma</strong> assigned to Room 101, Bed A</td>
                                <td>Urban Stay PG - Yelahanka</td>
                                <td>2026-09-10</td>
                                <td><span class="badge badge-success">Active & Verified</span></td>
                            </tr>
                            <tr>
                                <td><span class="badge badge-info"><i data-lucide="credit-card"></i> Rent Collection</span></td>
                                <td>₹8,000 paid via UPI (Ref: UPI9874512345)</td>
                                <td>Green View PG - Hebbal</td>
                                <td>2026-09-06</td>
                                <td><span class="badge badge-success">Receipt Issued</span></td>
                            </tr>
                            <tr>
                                <td><span class="badge badge-danger"><i data-lucide="wrench"></i> Complaint Raised</span></td>
                                <td>Geyser MCB trip in Room 101 assigned to Electrician Manjunath</td>
                                <td>Urban Stay PG - Yelahanka</td>
                                <td>2026-09-12</td>
                                <td><span class="badge badge-warning">In Progress</span></td>
                            </tr>
                            <tr>
                                <td><span class="badge badge-neutral"><i data-lucide="log-out"></i> Scheduled Checkout</span></td>
                                <td>Karthik Sharma on 30-day notice period ending Sept 30</td>
                                <td>Urban Stay PG - Yelahanka</td>
                                <td>2026-09-01</td>
                                <td><span class="badge badge-warning">Notice Active</span></td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;

    // Render Chart.js
    setTimeout(() => {
        renderDashboardCharts(analytics);
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
                    { label: 'Revenue Collected', data: revData, backgroundColor: '#4F46E5', borderRadius: 6 },
                    { label: 'Operational Expenses', data: expData, backgroundColor: '#F59E0B', borderRadius: 6 }
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
}

// =========================================================================
// 2. PROPERTIES & ROOM MATRIX VIEW
// =========================================================================
function renderPropertiesView(container) {
    const properties = window.db.get('properties');
    const rooms = window.db.get('rooms');
    const selectedPropId = window.db.selectedPropertyId;
    const filteredProps = selectedPropId === 'all' ? properties : properties.filter(p => p.id === selectedPropId);

    container.innerHTML = `
        <div class="filter-bar">
            <div class="filter-bar-left">
                <span style="font-weight:600; font-size:15px; color:var(--text-main);">Configured PG Properties (${filteredProps.length})</span>
            </div>
            <div class="filter-bar-right">
                <button class="btn btn-secondary btn-sm" onclick="openAddRoomModal()"><i data-lucide="plus-circle"></i> Add Room</button>
                <button class="btn btn-primary btn-sm" onclick="openPropertyModal()"><i data-lucide="plus"></i> Add Property</button>
            </div>
        </div>

        <!-- Property Overview Cards -->
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(320px, 1fr)); gap:18px; margin-bottom:28px;">
            ${filteredProps.map(p => `
                <div class="card" style="border-top:4px solid var(--primary);">
                    <div class="card-header">
                        <div>
                            <h3 class="card-title">${p.name}</h3>
                            <span style="font-size:11.5px; color:var(--text-muted);">${p.city} • ${p.floors} Floors • ${p.rooms} Rooms</span>
                        </div>
                        <span class="badge badge-success">Active</span>
                    </div>
                    <div class="card-body">
                        <p style="font-size:12.5px; color:var(--text-muted); margin-bottom:12px;"><i data-lucide="map-pin" style="width:14px; height:14px; vertical-align:middle;"></i> ${p.address}</p>
                        
                        <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap:10px; background:var(--bg-main); padding:10px; border-radius:8px; margin-bottom:14px;">
                            <div>
                                <div style="font-size:11px; color:var(--text-muted);">Capacity</div>
                                <div style="font-weight:700; font-size:14px;">${p.totalBeds} Beds</div>
                            </div>
                            <div>
                                <div style="font-size:11px; color:var(--text-muted);">Occupied</div>
                                <div style="font-weight:700; font-size:14px; color:var(--primary);">${p.occupiedBeds} Beds</div>
                            </div>
                            <div>
                                <div style="font-size:11px; color:var(--text-muted);">Occupancy</div>
                                <div style="font-weight:700; font-size:14px; color:var(--success);">${p.occupancyRate}%</div>
                            </div>
                        </div>

                        <div style="display:flex; justify-content:space-between; align-items:center; font-size:12px; color:var(--text-muted);">
                            <span>Deposit: ₹${(p.securityDeposit || 10000).toLocaleString()}</span>
                            <span>Notice: ${p.noticePeriodDays || 30} Days</span>
                        </div>
                    </div>
                </div>
            `).join('')}
        </div>

        <!-- Interactive Floor-by-Floor Room & Bed Matrix -->
        <div class="card">
            <div class="card-header">
                <div>
                    <h3 class="card-title">Live Room & Bed Allocation Matrix</h3>
                    <span style="font-size:12px; color:var(--text-muted);">Real-time status: Green = Available, Indigo = Occupied, Amber = Reserved, Gray = Maintenance</span>
                </div>
                <div style="display:flex; gap:8px;">
                    <span class="badge badge-success"><span class="badge-dot-indicator"></span> Available</span>
                    <span class="badge badge-purple"><span class="badge-dot-indicator"></span> Occupied</span>
                    <span class="badge badge-warning"><span class="badge-dot-indicator"></span> Reserved</span>
                    <span class="badge badge-neutral"><span class="badge-dot-indicator"></span> Maintenance</span>
                </div>
            </div>
            <div class="card-body">
                ${renderBedMatrixHtml(rooms)}
            </div>
        </div>
    `;
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
        <div class="floor-section">
            <div class="floor-title"><i data-lucide="layers"></i> ${floorName} (${floorRooms.length} Rooms)</div>
            <div class="room-grid">
                ${floorRooms.map(room => `
                    <div class="room-card">
                        <div class="room-header">
                            <div>
                                <span class="room-number">Room ${room.roomNumber}</span>
                                <span class="room-type-tag">${room.type}</span>
                            </div>
                            <span style="font-size:12px; font-weight:600; color:var(--primary);">₹${(room.rentPerBed || 0).toLocaleString()}/bed</span>
                        </div>
                        <div class="bed-list">
                            ${(room.beds || []).map(bed => `
                                <div class="bed-item ${bed.status}">
                                    <div class="bed-info-left">
                                        <i data-lucide="bed" style="width:15px; height:15px;"></i>
                                        <span>${bed.name}</span>
                                        <span class="badge ${getBedStatusBadgeClass(bed.status)}" style="padding:1px 6px; font-size:10px;">${bed.status}</span>
                                    </div>
                                    <div>
                                        ${bed.status === 'Occupied' && bed.resident ? 
                                            `<span class="bed-resident-name" title="${bed.resident.phone}">👤 ${bed.resident.name}</span>` : 
                                            (bed.status === 'Available' ? 
                                                `<button class="btn btn-secondary btn-sm" style="padding:2px 6px; font-size:10.5px;" onclick="openOnboardResidentModal('${room.propertyId}', '${room.id}', '${bed.id}')">+ Onboard</button>` : 
                                                `<button class="btn btn-secondary btn-sm" style="padding:2px 6px; font-size:10.5px;" onclick="toggleBedStatus('${bed.id}', '${bed.status === 'Maintenance' ? 'Available' : 'Maintenance'}')">${bed.status === 'Maintenance' ? 'Set Available' : 'Set Maint'}</button>`)
                                        }
                                    </div>
                                </div>
                            `).join('')}
                        </div>
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
            <div class="filter-bar-right">
                <button class="btn btn-primary btn-sm" onclick="openOnboardResidentModal()"><i data-lucide="user-plus"></i> Onboard Resident</button>
            </div>
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
                                <th>Bed</th>
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
        return `<tr><td colspan="9" style="text-align:center; padding:32px; color:var(--text-muted);">No residents matching current filters.</td></tr>`;
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
            <td>${r.bedName || '-'}</td>
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
                        <button onclick="openKycModal('${r.id}')"><i data-lucide="shield-check"></i> View KYC</button>
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
                <button class="btn btn-secondary btn-sm" onclick="generateNextMonthRent()"><i data-lucide="calendar"></i> Generate Invoices</button>
                <button class="btn btn-primary btn-sm" onclick="openRecordPaymentModal()"><i data-lucide="credit-card"></i> Record Payment</button>
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
                                <th>Room & Bed</th>
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
            <td>Room ${p.roomNumber || '-'}, ${p.bedName || '-'}</td>
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
                <button class="btn btn-primary btn-sm" onclick="openComplaintModal()"><i data-lucide="plus"></i> Raise Complaint</button>
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
                <button class="btn btn-secondary btn-sm" onclick="window.print()"><i data-lucide="printer"></i> Print Statement</button>
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
        <div class="card" style="margin-bottom:24px;">
            <div class="card-header">
                <h3 class="card-title">Property-wise Comparison & Yields</h3>
            </div>
            <div class="card-body" style="padding:0;">
                <div class="table-container">
                    <table class="data-table">
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
                                            <div style="flex:1; background:#E2E8F0; height:6px; border-radius:3px; overflow:hidden; width:80px;">
                                                <div style="background:var(--primary); height:100%; width:${p.occupancyRate}%;"></div>
                                            </div>
                                            <span style="font-weight:600;">${p.occupancyRate}%</span>
                                        </div>
                                    </td>
                                    <td style="color:var(--success-text); font-weight:600;">₹${p.collected.toLocaleString()}</td>
                                    <td style="color:var(--warning-text);">₹${p.expenses.toLocaleString()}</td>
                                    <td style="font-weight:700; color:var(--primary);">₹${p.netProfit.toLocaleString()}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

        <!-- Expense Categories Breakdown -->
        <div class="card">
            <div class="card-header">
                <h3 class="card-title">Category-wise Operational Expenses</h3>
                <button class="btn btn-secondary btn-sm" onclick="openExpenseModal()">+ Add Expense</button>
            </div>
            <div class="card-body">
                <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:14px;">
                    ${(analytics.expenseCategories || []).map(c => `
                        <div style="background:var(--bg-main); padding:14px; border-radius:8px; border:1px solid var(--border-color);">
                            <div style="font-size:12px; color:var(--text-muted);">${c.category}</div>
                            <div style="font-size:18px; font-weight:700; color:var(--text-main); margin-top:4px;">₹${c.total.toLocaleString()}</div>
                        </div>
                    `).join('')}
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
                                <label class="form-label">Floors Count</label>
                                <input type="number" name="floors" class="form-input" value="3" min="1">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Default Security Deposit (₹)</label>
                                <input type="number" name="securityDeposit" class="form-input" value="15000">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Notice Period (Days)</label>
                                <input type="number" name="noticePeriodDays" class="form-input" value="30">
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
                            <div class="form-group col-span-2">
                                <label class="form-label">Select Property *</label>
                                <select name="propertyId" class="form-select" required>
                                    ${properties.map(p => `<option value="${p.id}">${p.name}</option>`).join('')}
                                </select>
                            </div>
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
                        <button type="button" class="btn btn-secondary" onclick="closeModal()">Close</button>
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
                        <button type="button" class="btn btn-secondary" onclick="closeModal()">Close</button>
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
                    <h3 class="modal-title">KYC Document Verification: ${res.name}</h3>
                    <button class="modal-close-btn" onclick="closeModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <div style="background:var(--bg-main); border:1px solid var(--border-color); padding:16px; border-radius:8px; margin-bottom:18px;">
                        <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
                            <span style="color:var(--text-muted);">Document Type:</span>
                            <strong>${res.idProofType || 'Aadhaar Card'}</strong>
                        </div>
                        <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
                            <span style="color:var(--text-muted);">Document ID Number:</span>
                            <strong style="letter-spacing:1px;">${res.idProofNumber || 'Not provided'}</strong>
                        </div>
                        <div style="display:flex; justify-content:space-between;">
                            <span style="color:var(--text-muted);">Current Verification:</span>
                            <span class="badge ${res.kycStatus === 'Verified' ? 'badge-success' : 'badge-warning'}">${res.kycStatus}</span>
                        </div>
                    </div>

                    <div style="border:2px dashed var(--border-color); border-radius:8px; padding:24px; text-align:center; color:var(--text-muted); margin-bottom:18px;">
                        <i data-lucide="shield-check" style="width:36px; height:36px; color:var(--primary); margin-bottom:8px;"></i>
                        <p style="font-size:12.5px;">Ready for UIDAI / Digilocker e-KYC Integration API hook.</p>
                        <span style="font-size:11px; color:var(--text-light);">Document hash signature verified</span>
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
                <div class="modal-body">
                    <form onsubmit="submitEditResident(event, '${res.id}')">
                        <div class="form-grid">
                            <div class="form-group">
                                <label class="form-label">Full Name</label>
                                <input type="text" name="name" class="form-input" value="${res.name}" required>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Phone Number</label>
                                <input type="tel" name="phone" class="form-input" value="${res.phone}" required>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Email</label>
                                <input type="email" name="email" class="form-input" value="${res.email || ''}">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Monthly Rent (₹)</label>
                                <input type="number" name="monthlyRent" class="form-input" value="${res.monthlyRent || 8000}">
                            </div>
                            <div class="form-group col-span-2">
                                <label class="form-label">Status</label>
                                <select name="status" class="form-select">
                                    <option value="Active" ${res.status === 'Active' ? 'selected' : ''}>Active</option>
                                    <option value="Notice Period" ${res.status === 'Notice Period' ? 'selected' : ''}>Notice Period</option>
                                    <option value="Checked Out" ${res.status === 'Checked Out' ? 'selected' : ''}>Checked Out</option>
                                </select>
                            </div>
                        </div>
                        <div class="modal-footer" style="padding:16px 0 0 0; margin-top:20px; background:none;">
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
