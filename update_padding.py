import sys

with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

target = 'padding: 12px 24px;'
replacement = 'padding: 24px 32px;'

if target in content:
    content = content.replace(target, replacement)
    with open('index.html', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Replaced successfully")
else:
    print("Target not found")
