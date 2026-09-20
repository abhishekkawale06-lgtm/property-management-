import sys

with open('app.js', 'r', encoding='utf-8') as f:
    content = f.read()

target = '''<button class="btn btn-secondary btn-sm" style="height: 32px; display: flex; align-items: center;"><i data-lucide="edit" style="width: 14px; height: 14px; margin-right: 4px;"></i> Edit</button>'''

replacement = '''<button class="btn btn-secondary btn-sm" onclick="openEditEmployeesModal()" style="height: 32px; display: flex; align-items: center;"><i data-lucide="edit" style="width: 14px; height: 14px; margin-right: 4px;"></i> Edit</button>'''

if target in content:
    content = content.replace(target, replacement)
    print("Replaced button onclick successfully")
else:
    print("Target not found")

modal_code = '''
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
                                <select class="form-select">
                                    <option>Warden</option>
                                    <option>Cleaner</option>
                                    <option>Security</option>
                                    <option>Manager</option>
                                </select>
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
'''

content += modal_code

with open('app.js', 'w', encoding='utf-8') as f:
    f.write(content)
print("Added modal function")
