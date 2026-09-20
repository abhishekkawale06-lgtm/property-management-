import sys

with open('app.js', 'r', encoding='utf-8') as f:
    content = f.read()

target = '''                        <button class="btn btn-secondary btn-sm" style="margin-right: 8px;"><i data-lucide="history"></i> View Previous Months</button>'''

replacement = '''                        <input type="month" id="salary-month-filter" class="search-input" style="margin-right: 8px; width: auto; padding: 4px 12px; height: 32px;" onchange="filterSalaryByMonth(this.value)" title="Select Month">'''

target_render = '''    window.filterExpensesTable = function() {'''

replacement_render = '''    window.filterSalaryByMonth = function(monthValue) {
        // monthValue is like '2026-09'
        const query = document.getElementById('exp-search').value.toLowerCase();
        let filteredStaff = filteredExpenses.filter(e => e.category === 'Staff Salary');
        
        if (monthValue) {
            filteredStaff = filteredStaff.filter(e => e.date.startsWith(monthValue));
        }
        
        if (query) {
            filteredStaff = filteredStaff.filter(e => 
                e.category.toLowerCase().includes(query) || 
                (e.description && e.description.toLowerCase().includes(query))
            );
        }
        
        const salaryBody = document.getElementById('salary-expenses-table-body');
        if (salaryBody) salaryBody.innerHTML = renderSalaryRows(filteredStaff);
        lucide.createIcons();
    };

    window.filterExpensesTable = function() {'''

target_filter_exp = '''        const filteredStaff = filteredExpenses.filter(e => e.category === 'Staff Salary' && (
            e.category.toLowerCase().includes(query) || 
            (e.description && e.description.toLowerCase().includes(query))
        ));'''

replacement_filter_exp = '''        let filteredStaff = filteredExpenses.filter(e => e.category === 'Staff Salary' && (
            e.category.toLowerCase().includes(query) || 
            (e.description && e.description.toLowerCase().includes(query))
        ));
        const monthVal = document.getElementById('salary-month-filter')?.value;
        if (monthVal) {
            filteredStaff = filteredStaff.filter(e => e.date.startsWith(monthVal));
        }'''


if target in content and target_render in content and target_filter_exp in content:
    content = content.replace(target, replacement).replace(target_render, replacement_render).replace(target_filter_exp, replacement_filter_exp)
    with open('app.js', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Replaced successfully")
else:
    print("Target not found")
