import sys

with open('app.js', 'r', encoding='utf-8') as f:
    content = f.read()

target = '''        <div class="filter-bar" style="margin-bottom: 20px;">
            <div class="filter-bar-left" style="width: 100%;">
                <input type="text" id="exp-search" class="search-input" placeholder="Search expenses & salaries..." oninput="filterExpensesTable()" style="width: 100%; max-width: 400px;">
            </div>
        </div>

        <div>
            <div class="card" style="margin-bottom: 20px;">
                <div class="card-header" style="display: flex; justify-content: space-between; align-items: center;">
                    <h3 class="card-title">Other Expenses</h3>
                    <button class="btn btn-primary btn-sm" onclick="openExpenseModal()"><i data-lucide="plus"></i> Add Expense</button>
                </div>'''

replacement = '''        <div>
            <div class="card" style="margin-bottom: 20px;">
                <div class="card-header" style="display: flex; justify-content: space-between; align-items: center; gap: 16px;">
                    <h3 class="card-title" style="white-space: nowrap;">Other Expenses</h3>
                    <div style="flex-grow: 1; max-width: 400px;">
                        <input type="text" id="exp-search" class="search-input" placeholder="Search expenses & salaries..." oninput="filterExpensesTable()" style="width: 100%;">
                    </div>
                    <button class="btn btn-primary btn-sm" onclick="openExpenseModal()" style="white-space: nowrap;"><i data-lucide="plus"></i> Add Expense</button>
                </div>'''

if target in content:
    content = content.replace(target, replacement)
    with open('app.js', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Replaced successfully")
else:
    print("Target not found")
