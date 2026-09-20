import re

with open('app.js', 'r', encoding='utf-8') as f:
    content = f.read()

old_open = re.search(r'window\.openAddPropertyModal\s*=\s*function\(\)\s*\{.*?\}, 10\);\s*\};', content, flags=re.DOTALL)
old_submit = re.search(r'window\.submitAddProperty\s*=\s*function\(e\)\s*\{.*?\}\s*\}\s*globalSelector\.dispatchEvent.*?\}', content, flags=re.DOTALL)

if not old_open or not old_submit:
    print('Regex failed to match functions.')
    exit(1)

new_open = '''window.openAddPropertyModal = function() {
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
                        
                        <hr style="border: 0; border-top: 1px solid var(--border-color); margin: 24px 0;">
                        
                        <!-- 4. PG Rules / Operational Information -->
                        <h4 style="margin-bottom: 16px; font-weight: 600; font-size: 14px; color: var(--primary);">4. PG Rules & Operations</h4>
                        <div class="form-row" style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px;">
                            <div class="form-group">
                                <label class="form-label">Check-in Time</label>
                                <input type="time" id="new-prop-checkin" class="form-input" value="10:00">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Check-out Time</label>
                                <input type="time" id="new-prop-checkout" class="form-input" value="11:00">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Rent Due Day</label>
                                <input type="number" id="new-prop-rent-due" class="form-input" min="1" max="31" value="5" placeholder="e.g. 5">
                            </div>
                        </div>
                        <div class="form-row" style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                            <div class="form-group">
                                <label class="form-label">Security Deposit (₹)</label>
                                <input type="number" id="new-prop-deposit" class="form-input" placeholder="e.g. 10000">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Notice Period (Days)</label>
                                <input type="number" id="new-prop-notice" class="form-input" placeholder="e.g. 30" value="30">
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
};'''

new_submit = '''window.submitAddProperty = async function(e) {
    e.preventDefault();
    const btn = document.getElementById('save-property-btn');
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
        totalBeds: document.getElementById('new-prop-beds').value,
        
        checkInTime: document.getElementById('new-prop-checkin').value,
        checkOutTime: document.getElementById('new-prop-checkout').value,
        rentDueDay: document.getElementById('new-prop-rent-due').value,
        securityDeposit: document.getElementById('new-prop-deposit').value,
        noticePeriodDays: document.getElementById('new-prop-notice').value
    };
    
    try {
        const result = await window.db.addProperty(data);
        if (result && result.success) {
            showToast('Property created successfully! Please configure rooms.');
            closeModal();
            
            // Switch global selector to new property
            const globalSelector = document.getElementById('global-property-selector');
            if (globalSelector) {
                const option = document.createElement('option');
                option.value = result.id;
                option.textContent = data.name;
                globalSelector.appendChild(option);
                globalSelector.value = result.id;
                globalSelector.dispatchEvent(new Event('change'));
            }
            
            // Switch to Rooms tab
            setTimeout(() => {
                switchTab('rooms');
            }, 500);
        } else {
            showToast(result.error || 'Failed to create property', 'error');
            if (btn) { btn.disabled = false; btn.textContent = 'Save Property'; }
        }
    } catch (err) {
        console.error(err);
        showToast('Error saving property', 'error');
        if (btn) { btn.disabled = false; btn.textContent = 'Save Property'; }
    }
}'''

content = content.replace(old_open.group(0), new_open)
content = content.replace(old_submit.group(0), new_submit)

with open('app.js', 'w', encoding='utf-8') as f:
    f.write(content)

print('Updated app.js')
