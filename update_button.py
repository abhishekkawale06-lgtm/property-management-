import sys

with open('app.js', 'r', encoding='utf-8') as f:
    content = f.read()

target = '''<button onclick="openKycModal('${r.id}')"><i data-lucide="shield-check"></i> View KYC</button>'''
replacement = '''<button onclick="openKycModal('${r.id}')"><i data-lucide="file-text"></i> View Documents</button>'''

if target in content:
    content = content.replace(target, replacement)
    with open('app.js', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Updated button text")
else:
    print("Target not found")
