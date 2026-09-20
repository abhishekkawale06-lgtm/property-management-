import sys

with open('app.js', 'r', encoding='utf-8') as f:
    content = f.read()

target1 = '''        <div class="filter-bar" style="margin-bottom: 20px;">
            <div class="filter-bar-left">
                <input type="text" id="exp-search" class="search-input" placeholder="Search expenses..." oninput="filterExpensesTable()">
            </div>
            <div class="filter-bar-right">
                <button class="btn btn-primary btn-sm" onclick="openExpenseModal()"><i data-lucide="plus"></i> Add Expense</button>
            </div>
        </div>'''

replacement1 = '''        <div class="filter-bar" style="margin-bottom: 20px;">
            <div class="filter-bar-left" style="width: 100%;">
                <input type="text" id="exp-search" class="search-input" placeholder="Search expenses & salaries..." oninput="filterExpensesTable()" style="width: 100%; max-width: 400px;">
            </div>
        </div>'''

target2 = '''            <div class="card" style="margin-bottom: 20px;">
                <div class="card-header">
                    <h3 class="card-title">Other Expenses</h3>
                </div>'''

replacement2 = '''            <div class="card" style="margin-bottom: 20px;">
                <div class="card-header" style="display: flex; justify-content: space-between; align-items: center;">
                    <h3 class="card-title">Other Expenses</h3>
                    <button class="btn btn-primary btn-sm" onclick="openExpenseModal()"><i data-lucide="plus"></i> Add Expense</button>
                </div>'''

target3 = '''            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">Employees Salary</h3>
                </div>'''

replacement3 = '''            <div class="card">
                <div class="card-header" style="display: flex; justify-content: space-between; align-items: center;">
                    <h3 class="card-title">Employees Salary</h3>
                    <button class="btn btn-primary btn-sm" onclick="openExpenseModal()"><i data-lucide="plus"></i> Add Salary</button>
                </div>'''

if target1 in content and target2 in content and target3 in content:
    content = content.replace(target1, replacement1).replace(target2, replacement2).replace(target3, replacement3)
    with open('app.js', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Replaced successfully")
else:
    print("Target not found")
