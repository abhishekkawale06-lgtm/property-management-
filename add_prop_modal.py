import sys

with open('app.js', 'r', encoding='utf-8') as f:
    content = f.read()

new_code = '''
// --- Add Property Modal ---
window.openAddPropertyModal = function() {
    const modal = document.getElementById('modal-container');
    modal.innerHTML = `
        <div class="modal-backdrop" onclick="closeModal(event)">
            <div class="modal-dialog">
                <div class="modal-header">
                    <h3 class="modal-title">Add New Property</h3>
                    <button class="modal-close-btn" onclick="closeModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <form onsubmit="submitAddProperty(event)">
                        <div class="form-group">
                            <label class="form-label">Property Name <span style="color:red;">*</span></label>
                            <input type="text" id="new-prop-name" class="form-input" required placeholder="e.g. Sunrise PG">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Property Address <span style="color:red;">*</span></label>
                            <input type="text" id="new-prop-address" class="form-input" required placeholder="e.g. HSR Layout, Bengaluru">
                        </div>
                        
                        <div class="modal-footer" style="padding:16px 0 0 0; margin-top:24px; background:none;">
                            <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
                            <button type="submit" class="btn btn-primary">Save Property</button>
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

window.submitAddProperty = function(e) {
    e.preventDefault();
    const name = document.getElementById('new-prop-name').value;
    const address = document.getElementById('new-prop-address').value;
    
    if (!name || !address) return;
    
    const props = window.db.get('properties');
    const newId = 'p' + (props.length + 1) + '_' + Math.random().toString(36).substr(2, 5);
    
    const newProp = {
        id: newId,
        name: name,
        address: address,
        rooms: 0,
        totalBeds: 0,
        active: true
    };
    
    props.push(newProp);
    window.db.set('properties', props);
    
    // Also update global selector if it exists
    const globalSelector = document.getElementById('global-property-selector');
    if (globalSelector) {
        const option = document.createElement('option');
        option.value = newId;
        option.textContent = name;
        globalSelector.appendChild(option);
        
        // Trigger change to update dashboard if we are on 'all'
        if (globalSelector.value === 'all') {
            globalSelector.dispatchEvent(new Event('change'));
        }
    }
    
    closeModal();
    
    // Refresh the current view
    const activeNav = document.querySelector('.nav-item.active');
    if (activeNav) {
        activeNav.click();
    }
};
'''

if 'window.openAddPropertyModal' not in content:
    with open('app.js', 'a', encoding='utf-8') as f:
        f.write('\n' + new_code)
    print('Added modal logic to app.js')
else:
    print('Modal logic already exists')
