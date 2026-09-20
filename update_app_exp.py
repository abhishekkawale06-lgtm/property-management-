import sys

with open('app.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Add expenses view
expenses_code = '''
// =========================================================================
// EXPENSES VIEW
// =========================================================================
function renderExpensesView(container) {
    const expenses = window.db.get('expenses');
    
    // Filter by selected property
    const propId = window.db.selectedPropertyId;
    let filteredExpenses = expenses;
    if (propId && propId !== 'all') {
        filteredExpenses = expenses.filter(e => e.propertyId === propId);
    }

    container.innerHTML = `
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
    };
}

function renderExpensesRows(expensesList) {
    if (expensesList.length === 0) {
        return `<tr><td colspan="6" style="text-align:center; padding:32px; color:var(--text-muted);">No expenses found.</td></tr>`;
    }

    return expensesList.map(e => {
        const prop = window.db.get('properties').find(p => p.id === e.propertyId);
        const propName = prop ? prop.name : 'All / General';
        return `
        <tr>
            <td><span class="badge badge-neutral">${e.date}</span></td>
            <td><strong>${e.category}</strong></td>
            <td>${e.description || '-'}</td>
            <td><strong>₹${(e.amount || 0).toLocaleString()}</strong></td>
            <td>${propName}</td>
            <td style="text-align:right;">
                <button class="btn btn-secondary btn-sm">Edit</button>
            </td>
        </tr>
    `}).join('');
}
'''

if 'renderExpensesView(' not in content:
    # Insert it before renderReportsView
    content = content.replace('function renderReportsView(container)', expenses_code + '\nfunction renderReportsView(container)')

if 'case \'expenses\':' not in content:
    content = content.replace('case \'complaints\':\n            renderComplaintsView(container);\n            break;', 'case \'complaints\':\n            renderComplaintsView(container);\n            break;\n        case \'expenses\':\n            renderExpensesView(container);\n            break;')

with open('app.js', 'w', encoding='utf-8') as f:
    f.write(content)
print('Updated app.js')
