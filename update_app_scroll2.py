import sys

with open('app.js', 'r', encoding='utf-8') as f:
    content = f.read()

target = '''            <div class="card" style="height: 100%; display: flex; flex-direction: column;">
                <div class="card-header">
                    <h3 class="card-title">Employees Salary</h3>
                </div>
                <div class="card-body" style="padding:0; flex-grow: 1;">
                    <div class="table-container" style="height: 100%;">'''

replacement = '''            <div class="card" style="height: 100%; display: flex; flex-direction: column;">
                <div class="card-header">
                    <h3 class="card-title">Employees Salary</h3>
                </div>
                <div class="card-body" style="padding:0; flex-grow: 1;">
                    <div class="table-container" style="max-height: 400px; overflow-y: auto;">'''

# The previous replacement failed to replace this because I already removed 'style="height: 100%; display: flex; flex-direction: column;"'
# from the 'card' div in the previous step when I made them stacked!
# Let's search with the actual current string

target2 = '''            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">Employees Salary</h3>
                </div>
                <div class="card-body" style="padding:0; flex-grow: 1;">
                    <div class="table-container" style="height: 100%;">'''

replacement2 = '''            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">Employees Salary</h3>
                </div>
                <div class="card-body" style="padding:0; flex-grow: 1;">
                    <div class="table-container" style="max-height: 400px; overflow-y: auto;">'''

if target2 in content:
    content = content.replace(target2, replacement2)
    with open('app.js', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Replaced Employees Salary successfully")
else:
    print("Target 2 not found")
