import re

with open('app.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Extract the Property-wise Performance Table
table_pattern = re.compile(r'(\s*<!-- Property-wise Performance Table -->\s*\$\{window\.db\.selectedPropertyId === \'all\' \? `.*?` : \'\'\}\s*)', re.DOTALL)
match = table_pattern.search(content)
if not match:
    print('Failed to find table block')
    exit(1)

table_block = match.group(1)

# Remove the table block from its current location
content = content.replace(table_block, '\n')

# Insert it before Statements & Reports
insert_point = '        <!-- Statements & Reports -->'
if insert_point not in content:
    print('Failed to find insert point')
    exit(1)

# Add a bit of spacing
new_content = content.replace(insert_point, table_block.lstrip('\n') + '\n' + insert_point)

with open('app.js', 'w', encoding='utf-8') as f:
    f.write(new_content)

print('Updated app.js successfully')
