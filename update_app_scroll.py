import sys

with open('app.js', 'r', encoding='utf-8') as f:
    content = f.read()

target = '''        <div>
            <div class="card" style="margin-bottom: 20px;">
                <div class="card-header">
                    <h3 class="card-title">Other Expenses</h3>
                </div>
                <div class="card-body" style="padding:0; flex-grow: 1;">
                    <div class="table-container" style="height: 100%;">'''

replacement = '''        <div>
            <div class="card" style="margin-bottom: 20px;">
                <div class="card-header">
                    <h3 class="card-title">Other Expenses</h3>
                </div>
                <div class="card-body" style="padding:0; flex-grow: 1;">
                    <div class="table-container" style="max-height: 400px; overflow-y: auto;">'''

if target in content:
    content = content.replace(target, replacement)
    with open('app.js', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Replaced successfully")
else:
    print("Target not found")
