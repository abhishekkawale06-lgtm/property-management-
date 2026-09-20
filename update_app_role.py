import sys

with open('app.js', 'r', encoding='utf-8') as f:
    content = f.read()

target = '''                            <div class="form-group">
                                <label class="form-label">Role</label>
                                <select class="form-select">
                                    <option>Warden</option>
                                    <option>Cleaner</option>
                                    <option>Security</option>
                                    <option>Manager</option>
                                </select>
                            </div>'''

replacement = '''                            <div class="form-group">
                                <label class="form-label">Role</label>
                                <input type="text" class="form-input" placeholder="e.g. Warden, Cook...">
                            </div>'''

if target in content:
    content = content.replace(target, replacement)
    with open('app.js', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Replaced successfully")
else:
    print("Target not found")
