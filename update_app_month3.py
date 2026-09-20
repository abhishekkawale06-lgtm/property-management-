import sys

with open('app.js', 'r', encoding='utf-8') as f:
    content = f.read()

target = '''<select id="salary-month-filter" class="search-input" style="margin-right: 8px; width: auto; padding: 4px 24px 4px 12px; height: 32px;" onchange="filterSalaryByMonth(this.value)">
                            <option value="">View Previous Months</option>
                            <option value="2026-09">September 2026</option>'''

replacement = '''<select id="salary-month-filter" class="search-input" style="margin-right: 8px; width: auto; padding: 4px 24px 4px 12px; height: 32px;" onchange="filterSalaryByMonth(this.value)">
                            <option value="">September 2026 (Current)</option>'''

if target in content:
    content = content.replace(target, replacement)
    with open('app.js', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Replaced successfully")
else:
    print("Target not found")
