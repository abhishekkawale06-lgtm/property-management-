import sys

with open('app.js', 'r', encoding='utf-8') as f:
    content = f.read()

target_header = '''            <div class="card">
                <div class="card-header" style="display: flex; justify-content: space-between; align-items: center;">
                    <h3 class="card-title">Employees Salary</h3>
                    <button class="btn btn-primary btn-sm" onclick="openExpenseModal()"><i data-lucide="plus"></i> Add Salary</button>
                </div>
                <div class="card-body" style="padding:0; flex-grow: 1;">
                    <div class="table-container" style="max-height: 400px; overflow-y: auto;">
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
                        </table>'''

replacement_header = '''            <div class="card">
                <div class="card-header" style="display: flex; justify-content: space-between; align-items: center;">
                    <h3 class="card-title">Employees Salary</h3>
                    <div>
                        <button class="btn btn-secondary btn-sm" style="margin-right: 8px;"><i data-lucide="history"></i> View Previous Months</button>
                        <button class="btn btn-primary btn-sm" onclick="openExpenseModal()"><i data-lucide="plus"></i> Add Salary</button>
                    </div>
                </div>
                <div class="card-body" style="padding:0; flex-grow: 1;">
                    <div class="table-container" style="max-height: 400px; overflow-y: auto;">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>Employee Name</th>
                                    <th>Payment Date</th>
                                    <th>Salary Month</th>
                                    <th>Amount</th>
                                    <th>Property</th>
                                    <th style="text-align:right;">Actions</th>
                                </tr>
                            </thead>
                            <tbody id="salary-expenses-table-body">
                                ${renderSalaryRows(staffSalaryList)}
                            </tbody>
                        </table>'''

target_render = '''        const salaryBody = document.getElementById('salary-expenses-table-body');
        
        if (otherBody) otherBody.innerHTML = renderExpensesRows(filteredOther);
        if (salaryBody) salaryBody.innerHTML = renderExpensesRows(filteredStaff);
        
        lucide.createIcons();
    };
}

function renderExpensesRows(expensesList) {'''

replacement_render = '''        const salaryBody = document.getElementById('salary-expenses-table-body');
        
        if (otherBody) otherBody.innerHTML = renderExpensesRows(filteredOther);
        if (salaryBody) salaryBody.innerHTML = renderSalaryRows(filteredStaff);
        
        lucide.createIcons();
    };
}

function renderSalaryRows(salaryList) {
    if (salaryList.length === 0) {
        return `<tr><td colspan="6" style="text-align:center; padding:32px; color:var(--text-muted);">No salary records found.</td></tr>`;
    }

    return salaryList.map(e => {
        const prop = window.db.get('properties').find(p => p.id === e.propertyId);
        const propName = prop ? prop.name : 'All / General';
        const dateObj = new Date(e.date);
        const monthName = dateObj.toLocaleString('default', { month: 'short', year: 'numeric' });
        
        return `
        <tr>
            <td><strong>${e.description || 'Staff Member'}</strong></td>
            <td><span class="badge badge-neutral">${e.date}</span></td>
            <td>${monthName}</td>
            <td><strong>₹${(e.amount || 0).toLocaleString()}</strong></td>
            <td>${propName}</td>
            <td style="text-align:right;">
                <button class="btn btn-secondary btn-sm">Edit</button>
            </td>
        </tr>
    `}).join('');
}

function renderExpensesRows(expensesList) {'''

if target_header in content and target_render in content:
    content = content.replace(target_header, replacement_header).replace(target_render, replacement_render)
    with open('app.js', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Replaced successfully")
else:
    print("Target not found")
