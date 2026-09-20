import sys

with open('app.js', 'r', encoding='utf-8') as f:
    content = f.read()

target = '''<button type="button" class="btn btn-secondary" onclick="closeModal()">Close</button>'''
replacement = '''<button type="button" class="btn btn-secondary" onclick="closeModal(); openEditResidentModal('${res.id}')"><i data-lucide="edit" style="width:16px;height:16px; margin-right:6px; vertical-align:middle;"></i> Edit</button>'''

if target in content:
    content = content.replace(target, replacement)
    with open('app.js', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Replaced Close with Edit")
else:
    print("Target not found")
