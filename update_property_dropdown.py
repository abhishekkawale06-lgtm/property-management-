import sys

with open('app.js', 'r', encoding='utf-8') as f:
    content = f.read()

target = '''                        <!-- Stay Information -->
                        <h4 style="margin: 24px 0 16px 0; font-size: 14px; font-weight: 600; color: var(--text-main); border-bottom: 1px solid var(--border-color); padding-bottom: 8px;">Stay Information</h4>
                        <div class="form-grid">
                            <div class="form-group">
                                <label class="form-label">Status</label>'''

replacement = '''                        <!-- Stay Information -->
                        <h4 style="margin: 24px 0 16px 0; font-size: 14px; font-weight: 600; color: var(--text-main); border-bottom: 1px solid var(--border-color); padding-bottom: 8px;">Stay Information</h4>
                        <div class="form-grid">
                            <div class="form-group col-span-2">
                                <label class="form-label">Property</label>
                                <select name="propertyId" class="form-select">
                                    ${window.db.get('properties').map(p => `<option value="${p.id}" ${res.propertyId === p.id ? 'selected' : ''}>${p.name}</option>`).join('')}
                                </select>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Status</label>'''

if target in content:
    content = content.replace(target, replacement)
    with open('app.js', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Updated Edit Resident modal")
else:
    print("Target not found for Edit Resident modal")

add_target = '''                        <!-- Stay Information -->
                        <h4 style="margin: 24px 0 16px 0; font-size: 14px; font-weight: 600; color: var(--text-main); border-bottom: 1px solid var(--border-color); padding-bottom: 8px;">Stay Information</h4>
                        <div class="form-grid">
                            <div class="form-group">
                                <label class="form-label">Bed Allocation</label>'''

add_replacement = '''                        <!-- Stay Information -->
                        <h4 style="margin: 24px 0 16px 0; font-size: 14px; font-weight: 600; color: var(--text-main); border-bottom: 1px solid var(--border-color); padding-bottom: 8px;">Stay Information</h4>
                        <div class="form-grid">
                            <div class="form-group col-span-2">
                                <label class="form-label">Property</label>
                                <select name="propertyId" class="form-select">
                                    ${window.db.get('properties').map(p => `<option value="${p.id}" ${room.propertyId === p.id ? 'selected' : ''}>${p.name}</option>`).join('')}
                                </select>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Bed Allocation</label>'''

if add_target in content:
    content = content.replace(add_target, add_replacement)
    with open('app.js', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Updated Add Resident modal")
else:
    print("Target not found for Add Resident modal")
