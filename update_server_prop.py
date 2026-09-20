import sys

with open('server.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Add pgType to add_property
target_add = '''    rent_structure = data.get('rentStructure', 'Monthly Advance')
    rules = data.get('rules', 'Standard PG guidelines apply.')'''
replacement_add = '''    rent_structure = data.get('rentStructure', 'Monthly Advance')
    rules = data.get('rules', 'Standard PG guidelines apply.')
    pg_type = data.get('pgType', 'Coliving')'''
content = content.replace(target_add, replacement_add)

target_add_insert = '''    conn.execute(\'''INSERT INTO properties 
        (id, name, address, city, floors, rooms, totalBeds, securityDeposit, noticePeriodDays, rentStructure, rules, active)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)\''',
        (p_id, name, address, city, floors, rooms, total_beds, security_deposit, notice_period, rent_structure, rules))'''
replacement_add_insert = '''    conn.execute(\'''INSERT INTO properties 
        (id, name, address, city, floors, rooms, totalBeds, securityDeposit, noticePeriodDays, rentStructure, rules, active, pgType)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)\''',
        (p_id, name, address, city, floors, rooms, total_beds, security_deposit, notice_period, rent_structure, rules, pg_type))'''
content = content.replace(target_add_insert, replacement_add_insert)

# Add pgType to update_property
target_update = '''        rules = COALESCE(?, rules)
        WHERE id = ?\''',
        (data.get('name'), data.get('address'), data.get('city'), data.get('floors'), data.get('rooms'),
         data.get('totalBeds'), data.get('securityDeposit'), data.get('noticePeriodDays'), 
         data.get('rentStructure'), data.get('rules'), prop_id))'''

replacement_update = '''        rules = COALESCE(?, rules),
        pgType = COALESCE(?, pgType)
        WHERE id = ?\''',
        (data.get('name'), data.get('address'), data.get('city'), data.get('floors'), data.get('rooms'),
         data.get('totalBeds'), data.get('securityDeposit'), data.get('noticePeriodDays'), 
         data.get('rentStructure'), data.get('rules'), data.get('pgType'), prop_id))'''
content = content.replace(target_update, replacement_update)

with open('server.py', 'w', encoding='utf-8') as f:
    f.write(content)
print('Updated server.py')
