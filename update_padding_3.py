import sys

with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

target = 'margin: 16px; padding: 32px 32px;'
replacement = 'margin: 12px 16px 16px 16px; padding: 20px 32px;'

if target in content:
    content = content.replace(target, replacement)
    with open('index.html', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Replaced successfully")
else:
    print("Target not found")
