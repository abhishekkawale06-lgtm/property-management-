import sys

with open('app.js', 'r', encoding='utf-8') as f:
    content = f.read()

target = '''    container.innerHTML = `
        <div class="kpi-grid" style="margin-bottom: 20px; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));">
            <div class="kpi-card">
                <div class="kpi-icon warning"><i data-lucide="receipt"></i></div>
                <div class="kpi-info">
                    <span class="kpi-label">All Expenses</span>
                    <span class="kpi-value">₹${totalExpenses.toLocaleString()}</span>
                    <span class="kpi-sub">Total Operational Expenses</span>
                </div>
            </div>
            <div class="kpi-card">
                <div class="kpi-icon primary"><i data-lucide="users"></i></div>
                <div class="kpi-info">
                    <span class="kpi-label">Employees Salary</span>
                    <span class="kpi-value">₹${staffSalary.toLocaleString()}</span>
                    <span class="kpi-sub">Staff & Employee Pay</span>
                </div>
            </div>
        </div>
        <div class="filter-bar" style="margin-bottom: 20px;">
            <div class="filter-bar-left">
                <input type="text" id="exp-search" class="search-input" placeholder="Search expenses..." oninput="filterExpensesTable()">
            </div>
            <div class="filter-bar-right">
                <button class="btn btn-primary btn-sm" onclick="openExpenseModal()"><i data-lucide="plus"></i> Add Expense</button>
            </div>
        </div>

        <div class="card">
            <div class="card-body" style="padding:0;">
                <div class="table-container">
                    <table class="data-table" id="expenses-table">
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
                        <tbody id="expenses-table-body">
                            ${renderExpensesRows(filteredExpenses)}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;

    // Add filter function
    window.filterExpensesTable = function() {
        const query = document.getElementById('exp-search').value.toLowerCase();
        const filtered = filteredExpenses.filter(e => 
            e.category.toLowerCase().includes(query) || 
            (e.description && e.description.toLowerCase().includes(query))
        );
        document.getElementById('expenses-table-body').innerHTML = renderExpensesRows(filtered);
        lucide.createIcons();
    };'''

replacement = '''    const staffSalaryList = filteredExpenses.filter(e => e.category === 'Staff Salary');
    const otherExpensesList = filteredExpenses.filter(e => e.category !== 'Staff Salary');

    container.innerHTML = `
        <div class="kpi-grid" style="margin-bottom: 20px; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));">
            <div class="kpi-card">
                <div class="kpi-icon warning"><i data-lucide="receipt"></i></div>
                <div class="kpi-info">
                    <span class="kpi-label">All Expenses</span>
                    <span class="kpi-value">₹${totalExpenses.toLocaleString()}</span>
                    <span class="kpi-sub">Total Operational Expenses</span>
                </div>
            </div>
            <div class="kpi-card">
                <div class="kpi-icon primary"><i data-lucide="users"></i></div>
                <div class="kpi-info">
                    <span class="kpi-label">Employees Salary</span>
                    <span class="kpi-value">₹${staffSalary.toLocaleString()}</span>
                    <span class="kpi-sub">Staff & Employee Pay</span>
                </div>
            </div>
        </div>
        <div class="filter-bar" style="margin-bottom: 20px;">
            <div class="filter-bar-left">
                <input type="text" id="exp-search" class="search-input" placeholder="Search expenses..." oninput="filterExpensesTable()">
            </div>
            <div class="filter-bar-right">
                <button class="btn btn-primary btn-sm" onclick="openExpenseModal()"><i data-lucide="plus"></i> Add Expense</button>
            </div>
        </div>

        <div class="card" style="margin-bottom: 20px;">
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
        </div>
    `;

    // Add filter function
    window.filterExpensesTable = function() {
        const query = document.getElementById('exp-search').value.toLowerCase();
        
        const filteredStaff = filteredExpenses.filter(e => e.category === 'Staff Salary' && (
            e.category.toLowerCase().includes(query) || 
            (e.description && e.description.toLowerCase().includes(query))
        ));
        
        const filteredOther = filteredExpenses.filter(e => e.category !== 'Staff Salary' && (
            e.category.toLowerCase().includes(query) || 
            (e.description && e.description.toLowerCase().includes(query))
        ));

        const otherBody = document.getElementById('other-expenses-table-body');
        const salaryBody = document.getElementById('salary-expenses-table-body');
        
        if (otherBody) otherBody.innerHTML = renderExpensesRows(filteredOther);
        if (salaryBody) salaryBody.innerHTML = renderExpensesRows(filteredStaff);
        
        lucide.createIcons();
    };'''

if target in content:
    content = content.replace(target, replacement)
    with open('app.js', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Replaced successfully")
else:
    print("Target not found")
