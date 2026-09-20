import sys

with open('server.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Update add_resident
target_add = '''    conn.execute(\'''INSERT INTO residents 
        (id, name, phone, email, gender, dob, emergencyContactName, emergencyContactPhone, 
         currentAddress, propertyId, roomId, bedId, joiningDate, monthlyRent, securityDeposit, 
         idProofType, idProofNumber, kycStatus, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Active')\''',
        (res_id, name, phone, email, gender, dob, emergency_name, emergency_phone, address,
         property_id, room_id, bed_id, joining_date, monthly_rent, security_deposit,
         id_type, id_number, kyc_status))'''

replacement_add = '''    aadhaar_number = data.get('aadhaarNumber')
    pan_number = data.get('panNumber')
    conn.execute(\'''INSERT INTO residents 
        (id, name, phone, email, gender, dob, emergencyContactName, emergencyContactPhone, 
         currentAddress, propertyId, roomId, bedId, joiningDate, monthlyRent, securityDeposit, 
         idProofType, idProofNumber, kycStatus, status, aadhaarNumber, panNumber)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Active', ?, ?)\''',
        (res_id, name, phone, email, gender, dob, emergency_name, emergency_phone, address,
         property_id, room_id, bed_id, joining_date, monthly_rent, security_deposit,
         id_type, id_number, kyc_status, aadhaar_number, pan_number))'''

if target_add in content:
    content = content.replace(target_add, replacement_add)
    print("Updated add_resident")
else:
    print("Target add not found")

with open('server.py', 'w', encoding='utf-8') as f:
    f.write(content)
