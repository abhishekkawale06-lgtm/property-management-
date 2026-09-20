import sys

with open('app.js', 'r', encoding='utf-8') as f:
    content = f.read()

target = '''        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: 20px; align-items: start;">
            <div class="card" style="height: 100%; display: flex; flex-direction: column;">'''

replacement = '''        <div>
            <div class="card" style="margin-bottom: 20px;">'''

target2 = '''            <div class="card" style="height: 100%; display: flex; flex-direction: column;">
                <div class="card-header">
                    <h3 class="card-title">Employees Salary</h3>'''

replacement2 = '''            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">Employees Salary</h3>'''

if target in content and target2 in content:
    content = content.replace(target, replacement).replace(target2, replacement2)
    with open('app.js', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Replaced successfully")
else:
    print("Target not found")
