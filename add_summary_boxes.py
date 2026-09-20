import sys

with open('app.js', 'r', encoding='utf-8') as f:
    content = f.read()

target = '''    container.innerHTML = `
        <div class="filter-bar" style="margin-bottom: 20px;">'''

replacement = '''
    const totalExpenses = filteredExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    const staffSalary = filteredExpenses.filter(e => e.category === 'Staff Salary').reduce((sum, e) => sum + (e.amount || 0), 0);

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
        <div class="filter-bar" style="margin-bottom: 20px;">'''

content = content.replace(target, replacement)

with open('app.js', 'w', encoding='utf-8') as f:
    f.write(content)
print('Updated app.js')
