import sys

with open('app.js', 'r', encoding='utf-8') as f:
    content = f.read()

target = '''        <div class="card" style="margin-bottom: 20px;">
            <div class="card-header" style="padding: 16px 20px; border-bottom: 1px solid var(--border-color);">
                <h3 class="card-title">Other Expenses</h3>
            </div>
            <div class="card-body" style="padding:0;">
                <div class="table-container">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Category</th>
                                <th>Description</th>
                                <th>Amount</th>
                                <th>Property</th>
                                <th style="text-align:right;">Actions</th>
                            </tr>
                        </thead>
                        <tbody id="other-expenses-table-body">
                            ${renderExpensesRows(otherExpensesList)}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

        <div class="card">
            <div class="card-header" style="padding: 16px 20px; border-bottom: 1px solid var(--border-color);">
                <h3 class="card-title">Employees Salary</h3>
            </div>
            <div class="card-body" style="padding:0;">
                <div class="table-container">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Category</th>
                                <th>Description</th>
                                <th>Amount</th>
                                <th>Property</th>
                                <th style="text-align:right;">Actions</th>
                            </tr>
                        </thead>
                        <tbody id="salary-expenses-table-body">
                            ${renderExpensesRows(staffSalaryList)}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>'''

replacement = '''        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: 20px; align-items: start;">
            <div class="card" style="height: 100%; display: flex; flex-direction: column;">
                <div class="card-header">
                    <h3 class="card-title">Other Expenses</h3>
                </div>
                <div class="card-body" style="padding:0; flex-grow: 1;">
                    <div class="table-container" style="height: 100%;">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Category</th>
                                    <th>Description</th>
                                    <th>Amount</th>
                                    <th>Property</th>
                                    <th style="text-align:right;">Actions</th>
                                </tr>
                            </thead>
                            <tbody id="other-expenses-table-body">
                                ${renderExpensesRows(otherExpensesList)}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <div class="card" style="height: 100%; display: flex; flex-direction: column;">
                <div class="card-header">
                    <h3 class="card-title">Employees Salary</h3>
                </div>
                <div class="card-body" style="padding:0; flex-grow: 1;">
                    <div class="table-container" style="height: 100%;">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Category</th>
                                    <th>Description</th>
                                    <th>Amount</th>
                                    <th>Property</th>
                                    <th style="text-align:right;">Actions</th>
                                </tr>
                            </thead>
                            <tbody id="salary-expenses-table-body">
                                ${renderExpensesRows(staffSalaryList)}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>'''

if target in content:
    content = content.replace(target, replacement)
    with open('app.js', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Replaced successfully")
else:
    print("Target not found")
