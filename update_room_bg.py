import sys

with open('styles.css', 'r', encoding='utf-8') as f:
    content = f.read()

target = '.room-card {\n    background: #fff;'
replacement = '.room-card {\n    background: #f1f5f9;'

if target in content:
    content = content.replace(target, replacement)
    with open('styles.css', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Replaced successfully")
else:
    print("Target not found")
