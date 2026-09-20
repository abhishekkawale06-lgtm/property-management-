import re

with open('app.js', 'r', encoding='utf-8') as f:
    content = f.read()

old_open = re.search(r'window\.openEditPropertyModal\s*=\s*function\(propId\)\s*\{.*?\}, 10\);\s*\};', content, flags=re.DOTALL)
old_submit = re.search(r'window\.submitEditProperty\s*=\s*function\(e,\s*propId\)\s*\{.*?\}\s*\};\s*window\.deleteProperty', content, flags=re.DOTALL)

if not old_open or not old_submit:
    print('Regex failed to match functions.')
    exit(1)

new_open = '''window.openEditPropertyModal = function(propId) {
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
                        
                        <hr style="border: 0; border-top: 1px solid var(--border-color); margin: 24px 0;">
                        
                        <!-- 4. PG Rules / Operational Information -->
                        <h4 style="margin-bottom: 16px; font-weight: 600; font-size: 14px; color: var(--primary);">4. PG Rules & Operations</h4>
                        <div class="form-row" style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px;">
                            <div class="form-group">
                                <label class="form-label">Check-in Time</label>
                                <input type="time" id="edit-prop-checkin" class="form-input" value="${propToEdit.checkInTime || '10:00'}">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Check-out Time</label>
                                <input type="time" id="edit-prop-checkout" class="form-input" value="${propToEdit.checkOutTime || '11:00'}">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Rent Due Day</label>
                                <input type="number" id="edit-prop-rent-due" class="form-input" min="1" max="31" value="${propToEdit.rentDueDay || 5}">
                            </div>
                        </div>
                        <div class="form-row" style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                            <div class="form-group">
                                <label class="form-label">Security Deposit (₹)</label>
                                <input type="number" id="edit-prop-deposit" class="form-input" value="${propToEdit.securityDeposit || 10000}">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Notice Period (Days)</label>
                                <input type="number" id="edit-prop-notice" class="form-input" value="${propToEdit.noticePeriodDays || 30}">
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
};'''

new_submit = '''window.submitEditProperty = async function(e, propId) {
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
        totalBeds: document.getElementById('edit-prop-beds').value,
        
        checkInTime: document.getElementById('edit-prop-checkin').value,
        checkOutTime: document.getElementById('edit-prop-checkout').value,
        rentDueDay: document.getElementById('edit-prop-rent-due').value,
        securityDeposit: document.getElementById('edit-prop-deposit').value,
        noticePeriodDays: document.getElementById('edit-prop-notice').value
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
window.deleteProperty'''

content = content.replace(old_open.group(0), new_open)
content = content.replace(old_submit.group(0), new_submit)

with open('app.js', 'w', encoding='utf-8') as f:
    f.write(content)

print('Updated app.js')
