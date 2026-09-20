import sys

with open('app.js', 'r', encoding='utf-8') as f:
    content = f.read()

target1 = '''        <!-- Interactive Floor-by-Floor Room & Bed Matrix -->
        <div class="card">

            <div class="card-body">
                ${renderBedMatrixHtml(rooms)}
            </div>
        </div>'''
replacement1 = '''        <!-- Interactive Floor-by-Floor Room & Bed Matrix -->
        <div>
            ${renderBedMatrixHtml(rooms)}
        </div>'''

if target1 in content:
    content = content.replace(target1, replacement1)
    print("Replaced wrapper card")
else:
    print("Could not find wrapper card block")
    
target2 = '''    return Object.entries(floorsMap).map(([floorName, floorRooms]) => `
        <div class="floor-section">'''
replacement2 = '''    return Object.entries(floorsMap).map(([floorName, floorRooms]) => `
        <div class="floor-section card" style="padding: 24px; margin-bottom: 24px;">'''

if target2 in content:
    content = content.replace(target2, replacement2)
    print("Replaced floor section")
else:
    print("Could not find floor section block")

with open('app.js', 'w', encoding='utf-8') as f:
    f.write(content)
