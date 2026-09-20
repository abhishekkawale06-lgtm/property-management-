import sys

with open('app.js', 'r', encoding='utf-8') as f:
    content = f.read()

new_code = '''
// --- Edit Property Modal ---
window.openEditPropertyModal = function() {
    const selectedPropId = window.db.selectedPropertyId;
    
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
            <div class="modal-dialog">
                <div class="modal-header">
                    <h3 class="modal-title">Edit Property Details</h3>
                    <button class="modal-close-btn" onclick="closeModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <form onsubmit="submitEditProperty(event, '${propToEdit.id}')">
                        <div class="form-group">
                            <label class="form-label">Property Name <span style="color:red;">*</span></label>
                            <input type="text" id="edit-prop-name" class="form-input" required value="${propToEdit.name}">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Property Address <span style="color:red;">*</span></label>
                            <input type="text" id="edit-prop-address" class="form-input" required value="${propToEdit.address}">
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
    
    setTimeout(() => {
        const backdrop = modal.querySelector('.modal-backdrop');
        const dialog = modal.querySelector('.modal-dialog');
        if (backdrop) backdrop.classList.add('show');
        if (dialog) dialog.classList.add('show');
    }, 10);
};

window.submitEditProperty = function(e, propId) {
    e.preventDefault();
    const name = document.getElementById('edit-prop-name').value;
    const address = document.getElementById('edit-prop-address').value;
    
    if (!name || !address) return;
    
    const props = window.db.get('properties');
    const index = props.findIndex(p => p.id === propId);
    
    if (index !== -1) {
        props[index].name = name;
        props[index].address = address;
        window.db.set('properties', props);
        
        // Also update global selector text if it exists
        const globalSelector = document.getElementById('global-property-selector');
        if (globalSelector) {
            for (let i = 0; i < globalSelector.options.length; i++) {
                if (globalSelector.options[i].value === propId) {
                    globalSelector.options[i].textContent = name;
                    break;
                }
            }
        }
        
        closeModal();
        
        // Refresh the current view
        const activeNav = document.querySelector('.nav-item.active');
        if (activeNav) {
            activeNav.click();
        }
        
        // trigger change on selector so dashboard repopulates properties if on "all"
        if (globalSelector && globalSelector.value === 'all') {
            globalSelector.dispatchEvent(new Event('change'));
        }
    }
};
'''

if 'window.openEditPropertyModal' not in content:
    with open('app.js', 'a', encoding='utf-8') as f:
        f.write('\n' + new_code)
    print('Added edit modal logic to app.js')
else:
    print('Edit modal logic already exists')
