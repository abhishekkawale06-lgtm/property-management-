import sys

with open('app.js', 'r', encoding='utf-8') as f:
    content = f.read()

target = '''                    <div>
                        <select id="salary-month-filter" class="search-input" style="margin-right: 8px; width: auto; padding: 4px 24px 4px 12px; height: 32px;" onchange="filterSalaryByMonth(this.value)">
                            <option value="">September 2026 (Current)</option>
                            <option value="2026-08">August 2026</option>
                            <option value="2026-07">July 2026</option>
                            <option value="2026-06">June 2026</option>
                            <option value="2026-05">May 2026</option>
                            <option value="2026-04">April 2026</option>
                            <option value="2026-03">March 2026</option>
                        </select>
                        <button class="btn btn-primary btn-sm" onclick="openExpenseModal()"><i data-lucide="plus"></i> Add Salary</button>
                    </div>'''

replacement = '''                    <div style="display: flex; align-items: center; gap: 8px;">
                        <select id="salary-month-filter" class="search-input" style="width: auto; height: 32px; padding: 0 24px 0 12px; font-size: 13px;" onchange="filterSalaryByMonth(this.value)">
                            <option value="">September 2026 (Current)</option>
                            <option value="2026-08">August 2026</option>
                            <option value="2026-07">July 2026</option>
                            <option value="2026-06">June 2026</option>
                            <option value="2026-05">May 2026</option>
                            <option value="2026-04">April 2026</option>
                            <option value="2026-03">March 2026</option>
                        </select>
                        <button class="btn btn-secondary btn-sm" style="height: 32px; display: flex; align-items: center;"><i data-lucide="edit" style="width: 14px; height: 14px; margin-right: 4px;"></i> Edit</button>
                        <button class="btn btn-primary btn-sm" onclick="openExpenseModal()" style="height: 32px; display: flex; align-items: center;"><i data-lucide="plus" style="width: 14px; height: 14px; margin-right: 4px;"></i> Add Salary</button>
                    </div>'''

if target in content:
    content = content.replace(target, replacement)
    with open('app.js', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Replaced successfully")
else:
    print("Target not found")
