// PG Manager - UI Controller

let currentActivePropertyId = null;
let currentPropertyTab = 'overview';
let currentCharts = [];
let currentResidentSearch = '';
let currentPaymentSearch = '';
let currentPaymentMonth = '2026-09';

document.addEventListener('DOMContentLoaded', async () => {
    lucide.createIcons();
    initNavigation();
    
    window.addEventListener('stateChanged', () => {
        const activeNav = document.querySelector('.nav-item.active');
        if (activeNav) {
            if (activeNav.dataset.view === 'properties' && currentActivePropertyId) {
                renderView('property-view');
            } else {
                renderView(activeNav.dataset.view);
            }
        }
    });

    await window.db.loadState();
    renderView('dashboard');
});

function initNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            navItems.forEach(nav => nav.classList.remove('active'));
            e.currentTarget.classList.add('active');
            
            const view = e.currentTarget.dataset.view;
            if (view === 'properties') {
                currentActivePropertyId = null; // reset when explicitly clicking sidebar
            }
            renderView(view);
        });
    });
}

function renderView(view) {
    const container = document.getElementById('view-container');
    const pageTitle = document.getElementById('page-title');

    // Clean up old charts
    currentCharts.forEach(chart => chart.destroy());
    currentCharts = [];

    switch(view) {
        case 'dashboard':
            pageTitle.textContent = 'Dashboard';
            renderGlobalDashboard(container);
            break;
        case 'properties':
            pageTitle.textContent = 'Properties';
            renderProperties(container);
            break;
        case 'collections':
            pageTitle.textContent = 'Overall Collections';
            renderGlobalCollections(container);
            break;
        case 'expenses':
            pageTitle.textContent = 'Expenses';
            renderExpenses(container);
            break;
        case 'notifications':
            pageTitle.textContent = 'Notifications';
            renderNotifications(container);
            break;
        case 'property-view':
            pageTitle.textContent = 'Property Management';
            renderPropertyLayout(container);
            break;
        case 'settings':
            pageTitle.textContent = 'Settings';
            renderSettings(container);
            break;
        default:
            container.innerHTML = `<div class="card"><div class="card-body"><h2>Coming Soon</h2><p>This module is under construction.</p></div></div>`;
    }
    lucide.createIcons();
}

// ----------------------------------------------------
// GLOBAL DASHBOARD
// ----------------------------------------------------
function renderGlobalDashboard(container) {
    const properties = db.get('properties');
    let html = `<div style="display:flex; flex-direction:column; gap:32px;">`;

    properties.forEach(p => {
        const pBeds = db.get('beds').filter(b => b.propertyId === p.id);
        const occupied = pBeds.filter(b => b.status === 'Occupied').length;
        const vacant = pBeds.length - occupied;
        const occupancyRate = pBeds.length ? Math.round((occupied / pBeds.length) * 100) : 0;

        const pPayments = db.get('payments').filter(pay => pay.propertyId === p.id && pay.month === '2026-09');
        const pComplaints = db.get('complaints').filter(c => c.propertyId === p.id && c.status !== 'Resolved');
        let expectedRent = 0, collectedRent = 0, pendingRent = 0, overdueRent = 0;
        
        pPayments.forEach(pay => {
            expectedRent += pay.amountExpected;
            collectedRent += pay.amountPaid;
            if (pay.status === 'Overdue') overdueRent += (pay.amountExpected - pay.amountPaid);
            if (pay.status !== 'Paid' && pay.status !== 'Overdue') pendingRent += (pay.amountExpected - pay.amountPaid);
        });

        html += `
            <div class="card" style="border: 1px solid var(--border-color); box-shadow: var(--shadow-sm);">
                <div class="card-header d-flex justify-content-between align-center" style="border-bottom: 1px solid var(--border-color); padding-bottom: 16px;">
                    <div>
                        <h2 style="margin:0 0 8px 0; font-size:24px; color:var(--primary);">${p.name}</h2>
                        <div class="text-muted" style="display:flex; align-items:center; gap:6px;">
                            <i data-lucide="map-pin" style="width:14px; height:14px;"></i> ${p.address}
                        </div>
                    </div>
                </div>
                <div class="card-body" style="padding-top:24px;">

                    <div class="grid-cards">
                        <div class="card stat-card" style="box-shadow:none; border:1px solid var(--border-color);">
                            <div class="stat-info"><span class="stat-label">Total Rooms</span><span class="stat-value">${p.rooms}</span></div>
                        </div>
                        <div class="card stat-card" style="box-shadow:none; border:1px solid var(--border-color);">
                            <div class="stat-info"><span class="stat-label">Total Beds</span><span class="stat-value">${p.totalBeds}</span></div>
                        </div>
                        <div class="card stat-card" style="box-shadow:none; border:1px solid var(--border-color);">
                            <div class="stat-info"><span class="stat-label">Occupied Beds</span><span class="stat-value">${occupied}</span></div>
                        </div>
                        <div class="card stat-card" style="box-shadow:none; border:1px solid var(--border-color);">
                            <div class="stat-info"><span class="stat-label">Vacant Beds</span><span class="stat-value">${vacant}</span></div>
                        </div>
                        <div class="card stat-card" style="box-shadow:none; border:1px solid var(--border-color);">
                            <div class="stat-info"><span class="stat-label">Occupancy Rate</span><span class="stat-value">${occupancyRate}%</span></div>
                        </div>
                    </div>
                    

                </div>
            </div>
        `;
    });

    html += `</div>`;
    container.innerHTML = html;
}

// ----------------------------------------------------
// PROPERTIES LIST (Global)
// ----------------------------------------------------
function renderProperties(container) {
    const properties = db.get('properties');
    
    let html = `
        <div class="d-flex align-center justify-content-between mb-4" style="justify-content: space-between;">
            <h2 class="card-title">All Properties</h2>
            <button class="btn btn-primary" onclick="showAddPropertyModal()"><i data-lucide="plus"></i> Add Property</button>
        </div>
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(350px, 1fr)); gap: 24px;">
    `;

    properties.forEach(p => {
        const pBeds = db.get('beds').filter(b => b.propertyId === p.id);
        const occupied = pBeds.filter(b => b.status === 'Occupied').length;
        const vacant = pBeds.length - occupied;
        const occupancy = pBeds.length ? Math.round((occupied / pBeds.length) * 100) : 0;

        html += `
            <div class="property-card">
                <div class="property-card-title">${p.name}</div>
                <div class="property-card-address"><i data-lucide="map-pin" style="width:14px; height:14px;"></i> ${p.address}</div>
                
                <div class="property-card-stats">
                    <div class="property-card-stat">
                        <span class="property-card-stat-label">Total Rooms</span>
                        <span class="property-card-stat-value">${p.rooms}</span>
                    </div>
                    <div class="property-card-stat">
                        <span class="property-card-stat-label">Total Beds</span>
                        <span class="property-card-stat-value">${p.totalBeds}</span>
                    </div>
                    <div class="property-card-stat">
                        <span class="property-card-stat-label">Occupied</span>
                        <span class="property-card-stat-value text-success">${occupied}</span>
                    </div>
                    <div class="property-card-stat">
                        <span class="property-card-stat-label">Vacant</span>
                        <span class="property-card-stat-value text-warning">${vacant}</span>
                    </div>
                    <div class="property-card-stat">
                        <span class="property-card-stat-label">Occupancy</span>
                        <span class="property-card-stat-value">${occupancy}%</span>
                    </div>
                </div>
                
                <button class="btn btn-primary" style="width: 100%; justify-content: center;" onclick="openProperty('${p.id}')">Open Property</button>
            </div>
        `;
    });

    html += `</div>`;
    container.innerHTML = html;
}

// ----------------------------------------------------
// PROPERTY LAYOUT (Sub-routing)
// ----------------------------------------------------
window.openProperty = function(propId, tab = 'overview') {
    currentActivePropertyId = propId;
    currentPropertyTab = tab;
    // Ensure sidebar state matches
    document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
    document.querySelector('[data-view="properties"]').classList.add('active');
    renderView('property-view');
}

window.switchPropertyTab = function(tab) {
    currentPropertyTab = tab;
    renderView('property-view');
}

window.handlePropertySwitch = function(selectElement) {
    currentActivePropertyId = selectElement.value;
    renderView('property-view');
}

function renderPropertyLayout(container) {
    if (!currentActivePropertyId) return renderProperties(container);
    
    const propObj = db.get('properties').find(p => p.id === currentActivePropertyId);
    const properties = db.get('properties');

    let html = `
        <div class="property-layout-header">
            <div class="card mb-4" style="padding: 12px 20px; border: 1px solid var(--border-color); box-shadow: var(--shadow-sm);">
                <div style="display: flex; align-items: flex-start; justify-content: space-between;">
                    <div>
                        <div style="margin-bottom: 8px;">
                            <h2 style="font-size: 24px; font-weight: 700; color: var(--primary); margin:0;">${propObj.name}</h2>
                        </div>
                        <div class="text-muted"><i data-lucide="map-pin" style="width:14px; height:14px; display:inline-block; vertical-align:middle;"></i> ${propObj.address}</div>
                    </div>
                    <div>
                        <button class="btn btn-secondary" onclick="alert('Edit property details functionality to be implemented')" style="display: flex; align-items: center; gap: 8px;">
                            <i data-lucide="edit"></i> Edit Property
                        </button>
                    </div>
                </div>
            </div>

            <div class="property-tabs">
                <div class="property-tab ${currentPropertyTab === 'overview' ? 'active' : ''}" onclick="switchPropertyTab('overview')">Overview</div>
                <div class="property-tab ${currentPropertyTab === 'rooms' ? 'active' : ''}" onclick="switchPropertyTab('rooms')">Rooms & Beds</div>
                <div class="property-tab ${currentPropertyTab === 'residents' ? 'active' : ''}" onclick="switchPropertyTab('residents')">Residents</div>
                <div class="property-tab ${currentPropertyTab === 'payments' ? 'active' : ''}" onclick="switchPropertyTab('payments')">Rent & Payments</div>
                <div class="property-tab ${currentPropertyTab === 'complaints' ? 'active' : ''}" onclick="switchPropertyTab('complaints')">Complaints</div>
                <div class="property-tab ${currentPropertyTab === 'reports' ? 'active' : ''}" onclick="switchPropertyTab('reports')">Reports</div>
            </div>
        </div>
        <div id="property-subview" class="property-content"></div>
    `;

    container.innerHTML = html;
    const subContainer = document.getElementById('property-subview');

    switch(currentPropertyTab) {
        case 'overview': renderPropertyOverview(subContainer, propObj); break;
        case 'rooms': renderPropertyRooms(subContainer, propObj); break;
        case 'residents': renderPropertyResidents(subContainer, propObj); break;
        case 'payments': renderPropertyPayments(subContainer, propObj); break;
        case 'complaints': renderPropertyComplaints(subContainer, propObj); break;
        case 'reports': renderPropertyReports(subContainer, propObj); break;
    }
}

// ----------------------------------------------------
// PROPERTY SUB-VIEWS
// ----------------------------------------------------

function renderPropertyOverview(container, propObj) {
    const pBeds = db.get('beds').filter(b => b.propertyId === propObj.id);
    const occupiedBeds = pBeds.filter(b => b.status === 'Occupied').length;
    const vacantBeds = pBeds.length - occupiedBeds;
    const occupancyRate = pBeds.length ? Math.round((occupiedBeds / pBeds.length) * 100) : 0;

    const pComplaints = db.get('complaints').filter(c => c.propertyId === propObj.id && c.status !== 'Resolved');



    const pRooms = db.get('rooms').filter(r => r.propertyId === propObj.id);
    const roomDetails = pRooms.map(r => db.getRoomDetails(r.id));
    const floorStats = {};
    
    roomDetails.forEach(r => {
        if (!floorStats[r.floor]) floorStats[r.floor] = { emptyRooms: 0 };
        if (r.derivedStatus === 'Vacant') floorStats[r.floor].emptyRooms++;
    });

    let floorHtml = '';
    const sortedFloors = Object.keys(floorStats).sort((a,b) => Number(a) - Number(b));
    if (sortedFloors.length > 0) {
        sortedFloors.forEach((f, idx) => {
            const isLast = idx === sortedFloors.length - 1;
            floorHtml += `
                <div style="display:flex; justify-content:space-between; align-items:center; ${!isLast ? 'border-bottom:1px solid var(--border-color); padding-bottom:8px;' : ''}">
                    <span style="font-size:15px; font-weight:600; color:var(--text-muted);">Floor ${f}</span>
                    <span style="color: var(--primary); font-size:20px; font-weight:700;">${floorStats[f].emptyRooms}</span>
                </div>
            `;
        });
    } else {
        floorHtml = `<div style="text-align:center; color:var(--text-muted);">No room data available</div>`;
    }

    container.innerHTML = `
        <div style="display:flex; gap:24px; flex-wrap:wrap; margin-bottom:24px;">
            <div class="card" style="flex:1; min-width:300px; max-width: 400px; padding: 24px;">
                <div style="display:flex; flex-direction:column; gap:16px;">
                    <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border-color); padding-bottom:8px;">
                        <span style="font-size:15px; font-weight:600; color:var(--text-muted);">Total Rooms</span>
                        <span style="color: var(--primary); font-size:20px; font-weight:700;">${propObj.rooms}</span>
                    </div>
                    <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border-color); padding-bottom:8px;">
                        <span style="font-size:15px; font-weight:600; color:var(--text-muted);">Total Beds</span>
                        <span style="color: var(--primary); font-size:20px; font-weight:700;">${propObj.totalBeds}</span>
                    </div>
                    <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border-color); padding-bottom:8px;">
                        <span style="font-size:15px; font-weight:600; color:var(--text-muted);">Occupied Beds</span>
                        <span style="color: var(--primary); font-size:20px; font-weight:700;">${occupiedBeds}</span>
                    </div>
                    <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border-color); padding-bottom:8px;">
                        <span style="font-size:15px; font-weight:600; color:var(--text-muted);">Vacant Beds</span>
                        <span style="color: var(--primary); font-size:20px; font-weight:700;">${vacantBeds}</span>
                    </div>
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <span style="font-size:15px; font-weight:600; color:var(--text-muted);">Occupancy Rate</span>
                        <span style="color: var(--primary); font-size:20px; font-weight:700;">${occupancyRate}%</span>
                    </div>
                </div>
            </div>
            
            <div class="card" style="flex:1; min-width:300px; max-width: 400px; padding: 24px;">
                <div style="margin-bottom:16px; border-bottom:1px solid var(--border-color); padding-bottom:12px;">
                    <h3 style="margin:0; color:var(--text-main); font-size:16px;">Empty Rooms by Floor</h3>
                </div>
                <div style="display:flex; flex-direction:column; gap:16px;">
                    ${floorHtml}
                </div>
            </div>
        </div>


    `;
}

let currentRoomFilter = { floor: 'all', status: 'all', search: '' };

function renderPropertyRooms(container, propObj) {
    const rawRooms = db.get('rooms').filter(r => r.propertyId === propObj.id);
    const rooms = rawRooms.map(r => db.getRoomDetails(r.id));

    let filteredRooms = rooms;
    if (currentRoomFilter.floor !== 'all') {
        filteredRooms = filteredRooms.filter(r => r.floor.toString() === currentRoomFilter.floor);
    }
    if (currentRoomFilter.status !== 'all') {
        filteredRooms = filteredRooms.filter(r => r.derivedStatus === currentRoomFilter.status);
    }

    if (currentRoomFilter.search) {
        filteredRooms = filteredRooms.filter(r => r.roomNumber.includes(currentRoomFilter.search));
    }

    const floors = {};
    filteredRooms.forEach(r => {
        if (!floors[r.floor]) floors[r.floor] = [];
        floors[r.floor].push(r);
    });

    let html = `
        <div class="d-flex align-center gap-4 mb-4">
            <div class="card" style="padding: 12px 16px; flex: 1; margin-bottom: 0;">
                <div class="d-flex gap-4">
                    <select class="form-control" style="width: auto;" id="filter-floor">
                        <option value="all">All Floors</option>
                        <option value="0">Ground Floor</option>
                        <option value="1">1st Floor</option>
                        <option value="2">2nd Floor</option>
                        <option value="3">3rd Floor</option>
                        <option value="4">4th Floor</option>
                    </select>
                    <select class="form-control" style="width: auto;" id="filter-status">
                        <option value="all">All Statuses</option>
                        <option value="Fully Occupied">Fully Occupied</option>
                        <option value="Partially Occupied">Partially Occupied</option>
                        <option value="Vacant">Vacant</option>
                        <option value="Maintenance">Maintenance</option>
                    </select>
                    <input type="text" class="form-control" placeholder="Search room number..." id="filter-search" value="${currentRoomFilter.search}" style="flex:1;">
                </div>
            </div>
            <button class="btn btn-primary" style="white-space: nowrap;"><i data-lucide="plus"></i> Add Room</button>
        </div>
    `;

    Object.keys(floors).sort().forEach(floorStr => {
        const fName = floorStr === '0' ? 'GROUND FLOOR' : (floorStr === '1' ? '1ST FLOOR' : (floorStr === '2' ? '2ND FLOOR' : (floorStr === '3' ? '3RD FLOOR' : floorStr + 'TH FLOOR')));
        html += `
            <div class="mb-4">
                <div class="card mb-4" style="padding: 12px 20px; font-weight: 800; font-size: 16px; color: var(--primary); letter-spacing: 0.02em; width: fit-content; border: 1px solid var(--border-color); box-shadow: var(--shadow-sm);">${fName}</div>
                <div class="rooms-grid-v2">
        `;
        
        floors[floorStr].forEach(r => {
            let colorClass = 'bg-grey';
            let rentCollected = 0;
            if (r.derivedStatus === 'Fully Occupied') colorClass = 'bg-red';
            if (r.derivedStatus === 'Partially Occupied') colorClass = 'bg-yellow';
            if (r.derivedStatus === 'Vacant') colorClass = 'bg-green';
            if (r.derivedStatus === 'Maintenance') colorClass = 'bg-grey';

            r.beds.forEach(b => {
                if (b.currentPayment && b.currentPayment.status === 'Paid') {
                    rentCollected += b.currentPayment.amountPaid;
                }
            });

            html += `
                <div class="room-card-v2" onclick="showRoomModal('${r.id}')">
                    <div class="room-card-header">
                        <span class="room-card-title">Room ${r.roomNumber}</span>
                        <div class="status-indicator ${colorClass}" title="${r.derivedStatus}"></div>
                    </div>
                    <div class="room-card-details">
                        <div class="room-card-row">
                            <i data-lucide="bed" style="width:14px; height:14px;"></i> ${r.totalBeds} Beds
                        </div>
                        <div class="room-card-row text-green">
                            <i data-lucide="user-check" style="width:14px; height:14px;"></i> ${r.occupiedCount} Occupied
                        </div>
                        <div class="room-card-row text-grey">
                            <i data-lucide="user-x" style="width:14px; height:14px;"></i> ${r.totalBeds - r.occupiedCount} Vacant
                        </div>
                        <div class="room-card-row fw-bold mt-4" style="border-top: 1px solid var(--border-color); padding-top: 8px;">
                            ₹${rentCollected.toLocaleString('en-IN')} / month
                        </div>
                    </div>
                </div>
            `;
        });
        
        html += `</div></div>`;
    });

    container.innerHTML = html;

    setTimeout(() => {
        document.getElementById('filter-floor').value = currentRoomFilter.floor;
        document.getElementById('filter-status').value = currentRoomFilter.status;

        const updateFilters = () => {
            currentRoomFilter.floor = document.getElementById('filter-floor').value;
            currentRoomFilter.status = document.getElementById('filter-status').value;
            currentRoomFilter.search = document.getElementById('filter-search').value;
            renderView('property-view');
        };

        document.getElementById('filter-floor').addEventListener('change', updateFilters);
        document.getElementById('filter-status').addEventListener('change', updateFilters);
        document.getElementById('filter-search').addEventListener('input', updateFilters);
    }, 50);
}

function renderPropertyResidents(container, propObj) {
    let residents = db.get('residents').filter(r => r.propertyId === propObj.id);
    
    if (currentResidentSearch) {
        residents = residents.filter(r => r.name.toLowerCase().includes(currentResidentSearch.toLowerCase()));
    }
    
    let html = `
        <div class="d-flex align-center justify-content-between mb-4">
            <div class="card" style="padding: 12px 16px; flex: 1; max-width: 400px; margin-bottom: 0;">
                <input type="text" class="form-control" placeholder="Search resident name..." id="resident-search" value="${currentResidentSearch}" style="width: 100%;">
            </div>
        </div>
        <div class="card">
            <div class="card-body" style="padding:0; overflow-x: auto;">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Resident Name</th>
                            <th>Room & Bed</th>
                            <th>Joining Date</th>
                            <th>Monthly Rent</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
    `;

    residents.forEach(res => {
        const fullRes = db.getResidentDetails(res.id);

        html += `
            <tr onclick="showResidentModal('${res.id}')" style="cursor:pointer;">
                <td class="fw-bold">
                    <div style="display:flex; align-items:center; gap:8px;">
                        <div class="avatar" style="width:32px; height:32px; font-size:12px;">${res.name.charAt(0)}</div>
                        ${res.name}
                    </div>
                </td>
                <td>Room ${fullRes.bedDetails?.room?.roomNumber || '-'} (${fullRes.bedDetails?.name || '-'})</td>
                <td>${new Date(res.joiningDate).toLocaleDateString('en-IN')}</td>
                <td>₹${res.monthlyRent.toLocaleString('en-IN')}</td>
                <td style="position: relative;">
                    <button class="icon-btn" onclick="event.stopPropagation(); window.toggleDropdown('resident-dropdown-${res.id}')">
                        <i data-lucide="more-vertical"></i>
                    </button>
                    <div id="resident-dropdown-${res.id}" class="resident-dropdown-menu" style="display:none; position:absolute; right:24px; top:32px; z-index:100; background:#ffffff; border:1px solid var(--border-color); border-radius:8px; box-shadow:0 4px 12px rgba(0,0,0,0.15); padding:8px 0; min-width:160px; width:max-content; text-align:left;">
                        <div style="padding:10px 20px; cursor:pointer; font-size:14px; font-weight:500; color:var(--text-main); white-space:nowrap; transition:background 0.2s;" onmouseover="this.style.background='var(--bg-main)'" onmouseout="this.style.background='transparent'" onclick="event.stopPropagation(); alert('View Profile'); window.toggleDropdown('resident-dropdown-${res.id}')">View Profile</div>
                        <div style="padding:10px 20px; cursor:pointer; font-size:14px; font-weight:500; color:var(--text-main); white-space:nowrap; transition:background 0.2s;" onmouseover="this.style.background='var(--bg-main)'" onmouseout="this.style.background='transparent'" onclick="event.stopPropagation(); alert('Edit Resident'); window.toggleDropdown('resident-dropdown-${res.id}')">Edit Resident</div>
                        <div style="padding:10px 20px; cursor:pointer; font-size:14px; font-weight:500; color:var(--text-main); white-space:nowrap; transition:background 0.2s;" onmouseover="this.style.background='var(--bg-main)'" onmouseout="this.style.background='transparent'" onclick="event.stopPropagation(); alert('Change Room'); window.toggleDropdown('resident-dropdown-${res.id}')">Change Room</div>
                        <div style="padding:10px 20px; cursor:pointer; font-size:14px; font-weight:500; color:#dc2626; white-space:nowrap; transition:background 0.2s;" onmouseover="this.style.background='var(--bg-main)'" onmouseout="this.style.background='transparent'" onclick="event.stopPropagation(); alert('Deactivate Resident'); window.toggleDropdown('resident-dropdown-${res.id}')">Deactivate Resident</div>
                    </div>
                </td>
            </tr>
        `;
    });

    html += `</tbody></table></div></div>`;
    container.innerHTML = html;

    setTimeout(() => {
        const searchInput = document.getElementById('resident-search');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                currentResidentSearch = e.target.value;
                renderView('property-view');
                // Re-focus the input after re-render so user can keep typing
                setTimeout(() => {
                    const newSearch = document.getElementById('resident-search');
                    if (newSearch) {
                        newSearch.focus();
                        newSearch.setSelectionRange(newSearch.value.length, newSearch.value.length);
                    }
                }, 10);
            });
        }
    }, 50);
}

function renderPropertyPayments(container, propObj) {
    let pPayments = db.get('payments').filter(p => p.propertyId === propObj.id && p.month === currentPaymentMonth);
    
    if (currentPaymentSearch) {
        const query = currentPaymentSearch.toLowerCase();
        pPayments = pPayments.filter(pay => {
            const res = db.getResidentDetails(pay.residentId);
            const residentName = (res?.name || '').toLowerCase();
            const roomNumber = (res?.bedDetails?.room?.roomNumber || '').toLowerCase();
            return residentName.includes(query) || roomNumber.includes(query);
        });
    }
    
    let html = `
        <div class="d-flex align-center justify-content-between mb-4">
            <div class="card" style="padding: 12px 16px; flex: 1; max-width: 400px; margin-bottom: 0;">
                <input type="text" class="form-control" placeholder="Search resident or room number..." id="payment-search" value="${currentPaymentSearch}" style="width: 100%;">
            </div>
            <div class="d-flex align-center" style="gap: 16px;">
                <select class="form-control" id="payment-month" style="width: auto;">
                    <option value="2026-09" ${currentPaymentMonth === '2026-09' ? 'selected' : ''}>September 2026</option>
                    <option value="2026-08" ${currentPaymentMonth === '2026-08' ? 'selected' : ''}>August 2026</option>
                    <option value="2026-07" ${currentPaymentMonth === '2026-07' ? 'selected' : ''}>July 2026</option>
                    <option value="2026-06" ${currentPaymentMonth === '2026-06' ? 'selected' : ''}>June 2026</option>
                </select>
                <button class="btn btn-primary" style="white-space: nowrap;"><i data-lucide="indian-rupee"></i> Record Payment</button>
            </div>
        </div>
        <div class="card">
            <div class="card-body" style="padding:0; overflow-x: auto;">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Resident</th>
                            <th>Room</th>
                            <th>Rent</th>
                            <th>Paid</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
    `;

    pPayments.forEach(pay => {
        const res = db.getResidentDetails(pay.residentId);
        const colors = { 'Paid': 'bg-green', 'Pending': 'bg-yellow', 'Partial': 'bg-yellow', 'Overdue': 'bg-red' };
        
        html += `
            <tr>
                <td class="fw-bold">${res?.name || '-'}</td>
                <td>Room ${res?.bedDetails?.room?.roomNumber || '-'}</td>
                <td>₹${pay.amountExpected.toLocaleString('en-IN')}</td>
                <td>₹${pay.amountPaid.toLocaleString('en-IN')}</td>
                <td><span class="badge ${colors[pay.status]}">${pay.status}</span></td>
            </tr>
        `;
    });

    html += `</tbody></table></div></div>`;
    container.innerHTML = html;

    setTimeout(() => {
        const monthSelect = document.getElementById('payment-month');
        if (monthSelect) {
            monthSelect.addEventListener('change', (e) => {
                currentPaymentMonth = e.target.value;
                renderView('property-view');
            });
        }

        const searchInput = document.getElementById('payment-search');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                currentPaymentSearch = e.target.value;
                renderView('property-view');
                // Re-focus the input after re-render
                setTimeout(() => {
                    const newSearch = document.getElementById('payment-search');
                    if (newSearch) {
                        newSearch.focus();
                        newSearch.setSelectionRange(newSearch.value.length, newSearch.value.length);
                    }
                }, 10);
            });
        }
    }, 50);
}

function renderPropertyComplaints(container, propObj) {
    const comps = db.get('complaints').filter(c => c.propertyId === propObj.id);
    
    let html = `
        <div class="d-flex align-center justify-content-between mb-4">
            <h3 style="margin:0;">Complaints & Maintenance</h3>
            <button class="btn btn-primary"><i data-lucide="plus"></i> Log Complaint</button>
        </div>
        <div class="card">
            <div class="card-body" style="padding:0; overflow-x: auto;">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Room</th>
                            <th>Category</th>
                            <th>Description</th>
                            <th>Date</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
    `;

    comps.forEach(c => {
        const room = db.getRoomDetails(c.roomId);
        const colors = { 'Resolved': 'bg-green', 'In Progress': 'bg-yellow', 'Pending': 'bg-red' };
        
        html += `
            <tr>
                <td class="fw-bold">Room ${room?.roomNumber || '-'}</td>
                <td>${c.category}</td>
                <td>${c.description}</td>
                <td>${new Date(c.date).toLocaleDateString('en-IN')}</td>
                <td><span class="badge ${colors[c.status]}">${c.status}</span></td>
            </tr>
        `;
    });

    html += `</tbody></table></div></div>`;
    container.innerHTML = html;
}

function renderPropertyReports(container, propObj) {
    container.innerHTML = `
        <div class="card">
            <div class="card-header"><h3 class="card-title">Reports for ${propObj.name}</h3></div>
            <div class="card-body" style="display:flex; flex-direction:column; gap:16px;">
                <button class="btn btn-secondary" style="justify-content:space-between; padding: 16px;" onclick="window.downloadOccupancyReport('${propObj.id}')">
                    <span style="display:flex; align-items:center;"><i data-lucide="pie-chart" style="margin-right:12px;"></i> Occupancy Report</span>
                    <i data-lucide="download" style="width:18px; height:18px; color:var(--text-muted);"></i>
                </button>
                <button class="btn btn-secondary" style="justify-content:space-between; padding: 16px;" onclick="window.downloadRentCollectionReport('${propObj.id}')">
                    <span style="display:flex; align-items:center;"><i data-lucide="indian-rupee" style="margin-right:12px;"></i> Rent Collection Report</span>
                    <i data-lucide="download" style="width:18px; height:18px; color:var(--text-muted);"></i>
                </button>
                <button class="btn btn-secondary" style="justify-content:space-between; padding: 16px;" onclick="window.downloadResidentReport('${propObj.id}')">
                    <span style="display:flex; align-items:center;"><i data-lucide="users" style="margin-right:12px;"></i> Resident Report</span>
                    <i data-lucide="download" style="width:18px; height:18px; color:var(--text-muted);"></i>
                </button>
                <button class="btn btn-secondary" style="justify-content:space-between; padding: 16px;" onclick="window.downloadComplaintReport('${propObj.id}')">
                    <span style="display:flex; align-items:center;"><i data-lucide="wrench" style="margin-right:12px;"></i> Complaint Report</span>
                    <i data-lucide="download" style="width:18px; height:18px; color:var(--text-muted);"></i>
                </button>
            </div>
        </div>
    `;
}

function renderSettings(container) {
    const settings = db.get('settings');
    const ownerName = settings.ownerName || '';
    const email = settings.email || '';
    const phone = settings.phone || '';

    let html = `
        <div style="display:flex; flex-direction:column; gap:24px;">
            
            <!-- Admin Profile -->
            <div class="card" style="border: 1px solid var(--border-color); box-shadow: var(--shadow-sm);">
                <div class="card-header" style="border-bottom: 1px solid var(--border-color); padding-bottom: 16px;">
                    <h3 class="card-title" style="margin:0;"><i data-lucide="user" style="margin-right:8px;"></i> Admin Profile</h3>
                </div>
                <div class="card-body" style="padding-top: 16px;">
                    <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap:16px; margin-bottom: 16px;">
                        <div>
                            <label style="display:block; margin-bottom:4px; font-weight:500; font-size:14px;">Full Name</label>
                            <input type="text" id="set-name" class="form-control" value="${ownerName}" style="width:100%;">
                        </div>
                        <div>
                            <label style="display:block; margin-bottom:4px; font-weight:500; font-size:14px;">Email Address</label>
                            <input type="email" id="set-email" class="form-control" value="${email}" style="width:100%;">
                        </div>
                        <div>
                            <label style="display:block; margin-bottom:4px; font-weight:500; font-size:14px;">Phone Number</label>
                            <input type="text" id="set-phone" class="form-control" value="${phone}" style="width:100%;">
                        </div>
                    </div>
                    <button class="btn btn-primary" onclick="window.saveSettings()">Save Changes</button>
                </div>
            </div>



            <!-- Bank Details -->
            <div class="card" style="border: 1px solid var(--border-color); box-shadow: var(--shadow-sm);">
                <div class="card-header" style="border-bottom: 1px solid var(--border-color); padding-bottom: 16px;">
                    <h3 class="card-title" style="margin:0;"><i data-lucide="landmark" style="margin-right:8px;"></i> Bank Details</h3>
                </div>
                <div class="card-body" style="padding-top: 16px;">
                    <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap:16px; margin-bottom: 16px;">
                        <div>
                            <label style="display:block; margin-bottom:4px; font-weight:500; font-size:14px;">Bank Name</label>
                            <input type="text" id="set-bank-name" class="form-control" placeholder="e.g., State Bank of India" style="width:100%;">
                        </div>
                        <div>
                            <label style="display:block; margin-bottom:4px; font-weight:500; font-size:14px;">Account Number</label>
                            <input type="text" id="set-account-no" class="form-control" placeholder="Enter account number" style="width:100%;">
                        </div>
                        <div>
                            <label style="display:block; margin-bottom:4px; font-weight:500; font-size:14px;">IFSC Code</label>
                            <input type="text" id="set-ifsc" class="form-control" placeholder="e.g., SBIN0001234" style="width:100%;">
                        </div>
                        <div>
                            <label style="display:block; margin-bottom:4px; font-weight:500; font-size:14px;">Account Holder Name</label>
                            <input type="text" id="set-acc-holder" class="form-control" placeholder="Enter account holder name" style="width:100%;">
                        </div>
                    </div>
                    <button class="btn btn-primary" onclick="alert('Bank details saved!')">Save Bank Details</button>
                </div>
            </div>
            <!-- Data Management -->
            <div class="card" style="border: 1px solid var(--border-color); box-shadow: var(--shadow-sm);">
                <div class="card-header" style="border-bottom: 1px solid var(--border-color); padding-bottom: 16px;">
                    <h3 class="card-title" style="margin:0;"><i data-lucide="database" style="margin-right:8px;"></i> Data Management</h3>
                </div>
                <div class="card-body" style="padding-top: 16px; display:flex; gap:12px;">
                    <button class="btn btn-secondary" onclick="alert('Data exported to CSV!')"><i data-lucide="download"></i> Export Data</button>
                    <button class="btn btn-secondary" style="color:var(--danger); border-color:var(--danger);" onclick="window.resetApplication()"><i data-lucide="trash-2"></i> Reset Application</button>
                </div>
            </div>

        </div>
    `;
    container.innerHTML = html;
}

// ----------------------------------------------------
// MODALS
// ----------------------------------------------------
window.showRoomModal = function(roomId) {
    const r = db.getRoomDetails(roomId);
    if (!r) return;

    let fName = r.floor === 0 ? 'Ground Floor' : (r.floor === 1 ? '1st Floor' : (r.floor === 2 ? '2nd Floor' : (r.floor === 3 ? '3rd Floor' : r.floor + 'th Floor')));

    let bedsHtml = '';
    r.beds.forEach(b => {
        if (b.status === 'Occupied' && b.resident) {
            let pStatus = '<span class="text-grey">Unknown</span>';
            if (b.currentPayment) {
                if(b.currentPayment.status === 'Paid') pStatus = `<span class="text-green fw-bold">PAID</span>`;
                else if(b.currentPayment.status === 'Pending') pStatus = `<span class="text-yellow fw-bold">PENDING</span>`;
                else if(b.currentPayment.status === 'Overdue') pStatus = `<span class="text-red fw-bold">OVERDUE</span>`;
            }
            
            bedsHtml += `
                <div class="bed-card" onclick="showResidentModal('${b.resident.id}')" style="cursor:pointer; transition:all 0.2s; border:1px solid var(--border-color); padding:16px; border-radius:8px; margin-bottom:12px;">
                    <div style="font-weight: 700; color:var(--primary); margin-bottom: 8px;">${b.name}</div>
                    <div style="font-size: 16px; font-weight: 600; margin-bottom: 4px;">${b.resident.name}</div>
                    <div style="display:flex; justify-content:space-between; color: var(--text-muted); font-size: 13px;">
                        <span>₹${b.resident.monthlyRent.toLocaleString('en-IN')}</span>
                        ${pStatus}
                    </div>
                </div>
            `;
        } else {
            bedsHtml += `
                <div class="bed-card vacant" style="border:1px dashed var(--border-color); padding:16px; border-radius:8px; margin-bottom:12px; display:flex; flex-direction:column; align-items:center; justify-content:center; color:var(--text-muted); min-height: 90px;">
                    <div style="font-weight: 700; margin-bottom: 4px;">${b.name}</div>
                    <div>VACANT</div>
                </div>
            `;
        }
    });

    const modalHtml = `
        <div class="modal-overlay active" onclick="closeModal(event)">
            <div class="modal" style="max-width: 800px; padding: 0;">
                <div class="d-flex" style="height: 100%;">
                    <div style="flex: 2; padding: 24px; border-right: 1px solid var(--border-color); overflow-y: auto;">
                        <div class="d-flex justify-content-between align-center mb-4">
                            <h2 style="margin:0;">Beds</h2>
                        </div>
                        ${bedsHtml}
                    </div>
                    
                    <div style="flex: 1; padding: 24px; background: var(--bg-main);">
                        <div class="d-flex justify-content-between align-center mb-4">
                            <h2 style="margin:0;">Room ${r.roomNumber}</h2>
                            <button class="icon-btn" onclick="closeModal(null, true)"><i data-lucide="x"></i></button>
                        </div>
                        
                        <div style="display:flex; flex-direction:column; gap: 16px; margin-bottom: 32px;">
                            <div><div class="text-muted" style="font-size:12px; font-weight:600;">Property</div><div class="fw-bold">${r.property.name}</div></div>
                            <div><div class="text-muted" style="font-size:12px; font-weight:600;">Floor</div><div class="fw-bold">${fName}</div></div>
                            <div><div class="text-muted" style="font-size:12px; font-weight:600;">Room Type</div><div class="fw-bold">${r.type}</div></div>
                        </div>

                        <div style="display:flex; flex-direction:column; gap: 12px;">
                            <button class="btn btn-primary" style="width:100%; justify-content:center;"><i data-lucide="user-plus"></i> Add Resident</button>
                            <button class="btn btn-secondary" style="width:100%; justify-content:center;"><i data-lucide="edit"></i> Edit Room</button>
                            <button class="btn btn-secondary" style="width:100%; justify-content:center; color: var(--danger);"><i data-lucide="wrench"></i> Mark Maintenance</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.getElementById('modal-container').innerHTML = modalHtml;
    lucide.createIcons();
}

window.showResidentModal = function(resId) {
    const res = db.getResidentDetails(resId);
    if (!res) return;

    const modalHtml = `
        <div class="modal-overlay active" onclick="closeModal(event)">
            <div class="modal" style="max-width: 500px;">
                <div class="modal-header">
                    <h2 class="modal-title">Resident Profile</h2>
                    <button class="icon-btn" onclick="closeModal(null, true)"><i data-lucide="x"></i></button>
                </div>
                <div class="modal-body">
                    <div style="display:flex; align-items:center; gap: 16px; margin-bottom: 24px;">
                        <div class="avatar" style="width:64px; height:64px; font-size:24px;">${res.name.charAt(0)}</div>
                        <div>
                            <h3 style="margin:0 0 4px 0;">${res.name}</h3>
                            <div class="text-muted">Room ${res.bedDetails?.room?.roomNumber || '-'} • ${res.bedDetails?.name || '-'}</div>
                        </div>
                    </div>
                    
                    <div class="grid-cards" style="grid-template-columns: 1fr 1fr; margin-bottom: 24px;">
                        <div style="padding: 12px; border: 1px solid var(--border-color); border-radius: 8px;">
                            <div class="text-muted" style="font-size:12px;">Monthly Rent</div>
                            <div class="fw-bold">₹${res.monthlyRent.toLocaleString('en-IN')}</div>
                        </div>
                        <div style="padding: 12px; border: 1px solid var(--border-color); border-radius: 8px;">
                            <div class="text-muted" style="font-size:12px;">Deposit Paid</div>
                            <div class="fw-bold">₹${res.deposit.toLocaleString('en-IN')}</div>
                        </div>
                    </div>

                    <div style="display:flex; flex-direction:column; gap: 16px; margin-bottom: 24px;">
                        <div style="display:flex; align-items:center; gap: 12px;"><i data-lucide="phone" class="text-muted"></i> ${res.phone}</div>
                        <div style="display:flex; align-items:center; gap: 12px;"><i data-lucide="mail" class="text-muted"></i> ${res.email}</div>
                        <div style="display:flex; align-items:center; gap: 12px;"><i data-lucide="calendar" class="text-muted"></i> Joined ${new Date(res.joiningDate).toLocaleDateString('en-IN')}</div>
                    </div>

                    <div style="display:flex; gap: 12px;">
                        <button class="btn btn-primary" style="flex:1; justify-content:center;"><i data-lucide="indian-rupee"></i> Record Payment</button>
                        <button class="btn btn-secondary" style="flex:1; justify-content:center;"><i data-lucide="log-out"></i> Check Out</button>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.getElementById('modal-container').innerHTML = modalHtml;
    lucide.createIcons();
}

window.closeModal = function(e, force = false) {
    if (force || (e && e.target.classList.contains('modal-overlay'))) {
        document.getElementById('modal-container').innerHTML = '';
    }
}

function renderGlobalCollections(container) {
    const properties = db.get('properties');
    let totalExpected = 0, totalCollected = 0, totalPending = 0, totalOverdue = 0;
    const propertyStats = [];
    const expenses = db.get('expenses') || [];
    const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

    properties.forEach(p => {
        const pPayments = db.get('payments').filter(pay => pay.propertyId === p.id && pay.month === '2026-09');
        let expected = 0, collected = 0, pending = 0, overdue = 0;
        
        pPayments.forEach(pay => {
            expected += pay.amountExpected;
            collected += pay.amountPaid;
            if (pay.status === 'Overdue') overdue += (pay.amountExpected - pay.amountPaid);
            if (pay.status !== 'Paid' && pay.status !== 'Overdue') pending += (pay.amountExpected - pay.amountPaid);
        });

        totalExpected += expected;
        totalCollected += collected;
        totalPending += pending;
        totalOverdue += overdue;

        propertyStats.push({ name: p.name, expected, collected, pending, overdue });
    });

    let html = `
        <div class="card mb-4" style="border: 1px solid var(--border-color); box-shadow: var(--shadow-sm);">
            <div class="card-header">
                <h2 style="margin:0 0 8px 0; font-size:20px; color:var(--text-main);">Combined Collection (All PGs)</h2>
            </div>
            <div class="card-body">
                <div class="grid-cards">
                    <div class="card stat-card" style="box-shadow:none; border:1px solid var(--border-color);">
                        <div class="stat-icon info"><i data-lucide="indian-rupee"></i></div>
                        <div class="stat-info"><span class="stat-label">Expected Rent</span><span class="stat-value">₹${totalExpected.toLocaleString('en-IN')}</span></div>
                    </div>
                    <div class="card stat-card" style="box-shadow:none; border:1px solid var(--border-color);">
                        <div class="stat-icon success"><i data-lucide="check-circle"></i></div>
                        <div class="stat-info"><span class="stat-label">Collected Rent</span><span class="stat-value text-success">₹${totalCollected.toLocaleString('en-IN')}</span></div>
                    </div>
                    <div class="card stat-card" style="box-shadow:none; border:1px solid var(--border-color);">
                        <div class="stat-icon warning"><i data-lucide="clock"></i></div>
                        <div class="stat-info"><span class="stat-label">Pending Rent</span><span class="stat-value text-warning">₹${totalPending.toLocaleString('en-IN')}</span></div>
                    </div>
                    <div class="card stat-card" style="box-shadow:none; border:1px solid var(--border-color);">
                        <div class="stat-icon danger"><i data-lucide="alert-triangle"></i></div>
                        <div class="stat-info"><span class="stat-label">Overdue Rent</span><span class="stat-value text-danger">₹${totalOverdue.toLocaleString('en-IN')}</span></div>
                    </div>
                    <div class="card stat-card" style="box-shadow:none; border:1px solid var(--border-color);">
                        <div class="stat-icon" style="background:var(--bg-main); color:var(--danger);"><i data-lucide="minus-circle"></i></div>
                        <div class="stat-info"><span class="stat-label">Expenses</span><span class="stat-value text-danger">₹${totalExpenses.toLocaleString('en-IN')}</span></div>
                    </div>
                    <div class="card stat-card" style="box-shadow:none; border:1px solid var(--border-color);">
                        <div class="stat-icon" style="background:var(--bg-main); color:var(--primary);"><i data-lucide="wallet"></i></div>
                        <div class="stat-info"><span class="stat-label">Net Collected</span><span class="stat-value text-primary" style="color:var(--primary)!important;">₹${(totalCollected - totalExpenses).toLocaleString('en-IN')}</span></div>
                    </div>
                </div>
            </div>
        </div>
        <div style="display:flex; flex-direction:column; gap:24px;">
    `;

    propertyStats.forEach(stat => {
        html += `
            <div class="card" style="border: 1px solid var(--border-color); box-shadow: var(--shadow-sm);">
                <div class="card-header">
                    <h2 style="margin:0; font-size:18px; color:var(--primary);">${stat.name}</h2>
                </div>
                <div class="card-body">
                    <div class="grid-cards">
                        <div class="card stat-card" style="box-shadow:none; border:1px solid var(--border-color);">
                            <div class="stat-info"><span class="stat-label">Expected Rent</span><span class="stat-value">₹${stat.expected.toLocaleString('en-IN')}</span></div>
                        </div>
                        <div class="card stat-card" style="box-shadow:none; border:1px solid var(--border-color);">
                            <div class="stat-info"><span class="stat-label">Collected Rent</span><span class="stat-value text-success">₹${stat.collected.toLocaleString('en-IN')}</span></div>
                        </div>
                        <div class="card stat-card" style="box-shadow:none; border:1px solid var(--border-color);">
                            <div class="stat-info"><span class="stat-label">Pending Rent</span><span class="stat-value text-warning">₹${stat.pending.toLocaleString('en-IN')}</span></div>
                        </div>
                        <div class="card stat-card" style="box-shadow:none; border:1px solid var(--border-color);">
                            <div class="stat-info"><span class="stat-label">Overdue Rent</span><span class="stat-value text-danger">₹${stat.overdue.toLocaleString('en-IN')}</span></div>
                        </div>
                        <div class="card stat-card" style="box-shadow:none; border:1px solid var(--border-color);">
                            <div class="stat-info"><span class="stat-label">Expenses</span><span class="stat-value text-danger">₹0</span></div>
                        </div>
                        <div class="card stat-card" style="box-shadow:none; border:1px solid var(--border-color);">
                            <div class="stat-info"><span class="stat-label">Net Collected</span><span class="stat-value text-primary" style="color:var(--primary)!important;">₹${stat.collected.toLocaleString('en-IN')}</span></div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    });

    html += `</div>`;
    container.innerHTML = html;
}

// ----------------------------------------------------
// NOTIFICATIONS
// ----------------------------------------------------
function renderNotifications(container) {
    const notifications = db.get('notifications');

    let html = `
        <div class="card">
            <div class="card-header border-bottom" style="border-bottom: 1px solid var(--border-color); padding-bottom: 16px; margin-bottom: 16px;">
                <h3 class="card-title" style="margin:0;">Recent Notifications</h3>
            </div>
            <div class="card-body">
                <div style="display:flex; flex-direction:column; gap:16px;">
                    ${notifications.length === 0 ? '<div style="color:var(--text-muted);">No new notifications.</div>' : notifications.map(n => `
                        <div style="padding: 16px; border: 1px solid var(--border-color); border-radius: var(--border-radius); background-color: var(--bg-surface); display:flex; gap: 16px; align-items:flex-start;">
                            <div class="avatar bg-${n.type}" style="width:40px; height:40px; flex-shrink:0;">
                                <i data-lucide="${n.icon}" style="width:20px; height:20px; color:white;"></i>
                            </div>
                            <div>
                                <div style="font-weight:700; font-size:16px; margin-bottom:4px; color: var(--text-main);">${n.title}</div>
                                <div style="color: var(--text-muted); font-size:14px; margin-bottom:8px;">${n.desc}</div>
                                <div style="font-size:12px; color: var(--primary); font-weight: 500;">${n.time}</div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `;
    container.innerHTML = html;
}

// ----------------------------------------------------
// EXPENSES
// ----------------------------------------------------
function renderExpenses(container) {
    let html = `
        <div class="card">
            <div class="card-header border-bottom" style="border-bottom: 1px solid var(--border-color); padding-bottom: 16px; margin-bottom: 16px; display:flex; justify-content:space-between; align-items:center;">
                <h3 class="card-title" style="margin:0;">Recent Expenses</h3>
                <button class="btn btn-primary" onclick="showAddExpenseModal()"><i data-lucide="plus" style="margin-right:8px;"></i> Add Expense</button>
            </div>
            <div class="card-body">
                <table class="table" style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr style="border-bottom: 2px solid var(--border-color); text-align: left;">
                            <th style="padding: 12px; color: var(--text-muted); font-weight: 600;">Date</th>
                            <th style="padding: 12px; color: var(--text-muted); font-weight: 600;">Category</th>
                            <th style="padding: 12px; color: var(--text-muted); font-weight: 600;">Description</th>
                            <th style="padding: 12px; color: var(--text-muted); font-weight: 600;">Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr style="border-bottom: 1px solid var(--border-color);">
                            <td style="padding: 12px;">Sep 10, 2026</td>
                            <td style="padding: 12px;"><span class="badge bg-yellow">Maintenance</span></td>
                            <td style="padding: 12px;">Plumbing repair in Room 101</td>
                            <td style="padding: 12px; font-weight: 600;">₹1,500</td>
                        </tr>
                        <tr style="border-bottom: 1px solid var(--border-color);">
                            <td style="padding: 12px;">Sep 08, 2026</td>
                            <td style="padding: 12px;"><span class="badge bg-blue">Utilities</span></td>
                            <td style="padding: 12px;">Electricity Bill - Aug</td>
                            <td style="padding: 12px; font-weight: 600;">₹12,400</td>
                        </tr>
                        <tr style="border-bottom: 1px solid var(--border-color);">
                            <td style="padding: 12px;">Sep 05, 2026</td>
                            <td style="padding: 12px;"><span class="badge bg-green">Supplies</span></td>
                            <td style="padding: 12px;">Cleaning supplies bulk order</td>
                            <td style="padding: 12px; font-weight: 600;">₹3,200</td>
                        </tr>
                        <tr style="border-bottom: 1px solid var(--border-color);">
                            <td style="padding: 12px;">Sep 01, 2026</td>
                            <td style="padding: 12px;"><span class="badge bg-purple">Internet</span></td>
                            <td style="padding: 12px;">Broadband monthly renewal</td>
                            <td style="padding: 12px; font-weight: 600;">₹2,999</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    `;
    container.innerHTML = html;
}

window.showAddExpenseModal = function() {
    const modalContainer = document.getElementById('modal-container');
    const html = `
        <div class="modal-overlay active" onclick="closeModal(event)">
            <div class="modal" style="max-width: 500px;" onclick="event.stopPropagation()">
                <div class="d-flex justify-content-between align-center mb-4">
                    <h2 style="margin:0;">Add Expense</h2>
                    <button class="icon-btn" onclick="closeModal(null, true)"><i data-lucide="x"></i></button>
                </div>
                
                <div style="display:flex; flex-direction:column; gap:16px;">
                    <div>
                        <label style="display:block; margin-bottom:4px; font-weight:500; font-size:14px;">Date</label>
                        <input type="date" id="exp-date" class="form-control" style="width:100%;">
                    </div>
                    <div>
                        <label style="display:block; margin-bottom:4px; font-weight:500; font-size:14px;">Category</label>
                        <select id="exp-cat" class="form-control" style="width:100%;">
                            <option>Maintenance</option>
                            <option>Utilities</option>
                            <option>Supplies</option>
                            <option>Internet</option>
                            <option>Other</option>
                        </select>
                    </div>
                    <div>
                        <label style="display:block; margin-bottom:4px; font-weight:500; font-size:14px;">Description</label>
                        <textarea id="exp-desc" class="form-control" style="width:100%; min-height:80px;" placeholder="Enter expense details..."></textarea>
                    </div>
                    <div>
                        <label style="display:block; margin-bottom:4px; font-weight:500; font-size:14px;">Amount (₹)</label>
                        <input type="number" id="exp-amt" class="form-control" placeholder="0" style="width:100%;">
                    </div>
                </div>
                
                <div style="display:flex; justify-content:flex-end; gap:12px; margin-top:24px;">
                    <button class="btn btn-secondary" onclick="closeModal(null, true)">Cancel</button>
                    <button class="btn btn-primary" onclick="submitExpense()">Save Expense</button>
                </div>
            </div>
        </div>
    `;
    modalContainer.innerHTML = html;
    lucide.createIcons();
}

window.submitExpense = async function() {
    const date = document.getElementById('exp-date').value;
    const cat = document.getElementById('exp-cat').value;
    const desc = document.getElementById('exp-desc').value;
    const amt = document.getElementById('exp-amt').value;
    if(!date || !cat || !desc || !amt) {
        alert("Please fill all fields!");
        return;
    }
    await window.db.addExpense(date, cat, desc, amt);
    closeModal(null, true);
    alert('Expense added successfully!');
}

window.showAddPropertyModal = function() {
    const modalContainer = document.getElementById('modal-container');
    const html = `
        <div class="modal-overlay active" onclick="closeModal(event)">
            <div class="modal-content" style="max-width: 500px;" onclick="event.stopPropagation()">
                <div class="modal-header">
                    <h3 class="modal-title">Add New Property</h3>
                    <button class="modal-close" onclick="closeModal(null, true)"><i data-lucide="x"></i></button>
                </div>
                <div class="modal-body">
                    <div style="display:flex; flex-direction:column; gap:16px;">
                        <div>
                            <label style="display:block; margin-bottom:4px; font-weight:500; font-size:14px;">Property Name</label>
                            <input type="text" id="prop-name" class="form-control" style="width:100%;" placeholder="e.g. Royal Palace PG">
                        </div>
                        <div>
                            <label style="display:block; margin-bottom:4px; font-weight:500; font-size:14px;">Address</label>
                            <input type="text" id="prop-addr" class="form-control" style="width:100%;" placeholder="e.g. Koramangala, Bengaluru">
                        </div>
                        <div>
                            <label style="display:block; margin-bottom:4px; font-weight:500; font-size:14px;">Total Rooms</label>
                            <input type="number" id="prop-rooms" class="form-control" style="width:100%;">
                        </div>
                        <div>
                            <label style="display:block; margin-bottom:4px; font-weight:500; font-size:14px;">Total Beds</label>
                            <input type="number" id="prop-beds" class="form-control" style="width:100%;">
                        </div>
                    </div>
                    
                    <div style="display:flex; justify-content:flex-end; gap:12px; margin-top:24px;">
                        <button class="btn btn-secondary" onclick="closeModal(null, true)">Cancel</button>
                        <button class="btn btn-primary" onclick="submitProperty()">Save Property</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    modalContainer.innerHTML = html;
    lucide.createIcons();
}

window.submitProperty = async function() {
    const name = document.getElementById('prop-name').value;
    const addr = document.getElementById('prop-addr').value;
    const rooms = document.getElementById('prop-rooms').value;
    const beds = document.getElementById('prop-beds').value;
    
    if(!name || !addr || !rooms || !beds) {
        alert("Please fill all fields!");
        return;
    }
    
    await window.db.addProperty(name, addr, rooms, beds);
    closeModal(null, true);
    alert('Property added successfully!');
    renderView('properties');
}

window.saveSettings = async function() {
    const name = document.getElementById('set-name').value;
    const email = document.getElementById('set-email').value;
    const phone = document.getElementById('set-phone').value;
    await window.db.updateSettings(name, email, phone);
    alert('Profile updated successfully!');
}

window.updatePassword = function() {
    alert('Password updated successfully!');
}

window.resetApplication = async function() {
    if(confirm('Are you sure you want to clear all data? This will reset the database.')) {
        await window.db.resetApp();
        alert('Application reset successfully!');
        window.location.reload();
    }
}

// ----------------------------------------------------
// REPORTS LOGIC
// ----------------------------------------------------
window.downloadCSV = function(filename, csvData) {
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

window.downloadOccupancyReport = function(propertyId) {
    const property = db.get('properties').find(p => p.id === propertyId);
    const rooms = db.get('rooms').filter(r => r.propertyId === propertyId);
    const beds = db.get('beds').filter(b => b.propertyId === propertyId);
    
    let csvContent = "Room Number,Floor,Type,Bed Name,Status,Resident ID\\n";
    
    rooms.forEach(room => {
        const roomBeds = beds.filter(b => b.roomId === room.id);
        roomBeds.forEach(bed => {
            csvContent += `${room.roomNumber},${room.floor},${room.type},${bed.name},${bed.status},${bed.residentId || 'None'}\\n`;
        });
    });
    
    window.downloadCSV(`${property.name.replace(/ /g, '_')}_Occupancy_Report.csv`, csvContent);
}

window.downloadRentCollectionReport = function(propertyId) {
    const property = db.get('properties').find(p => p.id === propertyId);
    const payments = db.get('payments').filter(p => p.propertyId === propertyId);
    const residents = db.get('residents').filter(r => r.propertyId === propertyId);
    
    let csvContent = "Resident Name,Room,Month,Amount Expected,Amount Paid,Status\\n";
    payments.forEach(p => {
        const resident = residents.find(r => r.id === p.residentId);
        const room = resident ? db.getRoomDetails(resident.roomId) : null;
        const residentName = resident ? resident.name : 'Unknown';
        const roomNum = room ? room.roomNumber : 'Unknown';
        csvContent += `${residentName},${roomNum},${p.month},${p.amountExpected},${p.amountPaid},${p.status}\\n`;
    });
    
    window.downloadCSV(`${property.name.replace(/ /g, '_')}_Rent_Collection_Report.csv`, csvContent);
}

window.downloadResidentReport = function(propertyId) {
    const property = db.get('properties').find(p => p.id === propertyId);
    const residents = db.get('residents').filter(r => r.propertyId === propertyId);
    
    let csvContent = "Name,Phone,Email,Joining Date,Monthly Rent,Status\\n";
    residents.forEach(r => {
        csvContent += `${r.name},${r.phone},${r.email},${r.joiningDate},${r.monthlyRent},${r.status}\\n`;
    });
    
    window.downloadCSV(`${property.name.replace(/ /g, '_')}_Resident_Report.csv`, csvContent);
}

window.downloadComplaintReport = function(propertyId) {
    const property = db.get('properties').find(p => p.id === propertyId);
    const complaints = db.get('complaints').filter(c => c.propertyId === propertyId);
    
    let csvContent = "Room,Category,Description,Date,Priority,Status\\n";
    complaints.forEach(c => {
        const room = db.getRoomDetails(c.roomId);
        const roomNum = room ? room.roomNumber : 'Unknown';
        // replace commas in description to avoid breaking CSV format
        const safeDesc = c.description.replace(/,/g, ''); 
        csvContent += `${roomNum},${c.category},${safeDesc},${c.date},${c.priority},${c.status}\\n`;
    });
    
    window.downloadCSV(`${property.name.replace(/ /g, '_')}_Complaint_Report.csv`, csvContent);
}

window.toggleDropdown = function(id) {
    const el = document.getElementById(id);
    if (!el) return;
    
    // Close any other open dropdowns
    document.querySelectorAll('.resident-dropdown-menu').forEach(menu => {
        if (menu.id !== id) menu.style.display = 'none';
    });
    
    // Toggle current
    el.style.display = el.style.display === 'none' ? 'block' : 'none';
}

// Close dropdowns when clicking outside
document.addEventListener('click', () => {
    document.querySelectorAll('.resident-dropdown-menu').forEach(menu => {
        menu.style.display = 'none';
    });
});
