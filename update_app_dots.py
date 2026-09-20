import sys

with open('app.js', 'r', encoding='utf-8') as f:
    content = f.read()

target = '''            <td style="text-align:right;">
                <button class="btn btn-secondary btn-sm">Edit</button>
            </td>'''

replacement = '''            <td style="text-align:right;">
                <button class="btn btn-ghost btn-sm" onclick="openEmployeeInfoModal('${e.description ? e.description.replace(/'/g, \"\\\\'\") : 'Staff Member'}')" style="padding: 4px; border: none; background: transparent; cursor: pointer;">
                    <i data-lucide="more-vertical" style="width: 18px; height: 18px; color: var(--text-muted);"></i>
                </button>
            </td>'''

modal_code = '''
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
'''

if target in content:
    content = content.replace(target, replacement)
    content += modal_code
    with open('app.js', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Replaced successfully")
else:
    print("Target not found")
