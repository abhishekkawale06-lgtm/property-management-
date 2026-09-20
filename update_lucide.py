import sys

with open('app.js', 'r', encoding='utf-8') as f:
    content = f.read()

target = '''        <!-- Interactive Floor-by-Floor Room & Bed Matrix -->
        <div>
            ${renderBedMatrixHtml(rooms)}
        </div>
    `;
}'''

replacement = '''        <!-- Interactive Floor-by-Floor Room & Bed Matrix -->
        <div>
            ${renderBedMatrixHtml(rooms)}
        </div>
    `;
    
    setTimeout(() => {
        if (window.lucide) {
            window.lucide.createIcons();
        }
    }, 50);
}'''

if target in content:
    content = content.replace(target, replacement)
    with open('app.js', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Replaced successfully")
else:
    print("Target not found")
