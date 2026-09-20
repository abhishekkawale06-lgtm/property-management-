import sys

with open('app.js', 'r', encoding='utf-8') as f:
    content = f.read()

target = '''                        <div class="form-grid">
                            <div class="form-group col-span-2">
                                <label class="form-label">Select Property *</label>
                                <select name="propertyId" class="form-select" required>
                                    ${properties.map(p => `<option value="${p.id}">${p.name}</option>`).join('')}
                                </select>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Room Number *</label>'''

replacement = '''                        <div class="form-grid">
                            <div class="form-group">
                                <label class="form-label">Room Number *</label>'''

if target in content:
    content = content.replace(target, replacement)
    print("Replaced Add Room form")

target_submit = '''    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target).entries());
    try {
        await window.db.addRoom(data);'''

replacement_submit = '''    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target).entries());
    data.propertyId = window.state.currentPropertyId;
    try {
        await window.db.addRoom(data);'''

if target_submit in content:
    content = content.replace(target_submit, replacement_submit)
    print("Replaced submitAddRoom")

with open('app.js', 'w', encoding='utf-8') as f:
    f.write(content)
