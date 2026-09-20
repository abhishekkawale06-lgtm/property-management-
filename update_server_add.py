import sys

with open('server.py', 'r', encoding='utf-8') as f:
    content = f.read()

target = """        (id, name, phone, email, gender, dob, emergencyContactName,
         emergencyContactPhone, currentAddress, propertyId, roomId, bedId,
         joiningDate, monthlyRent, securityDeposit, idProofType, idProofNumber)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)''',
        (data.get('id'), data.get('name'), data.get('phone'), data.get('email'),"""
replacement = """        (id, name, phone, email, gender, dob, emergencyContactName,
         emergencyContactPhone, currentAddress, propertyId, roomId, bedId,
         joiningDate, monthlyRent, securityDeposit, idProofType, idProofNumber, aadhaarNumber, panNumber)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)''',
        (data.get('id'), data.get('name'), data.get('phone'), data.get('email'),"""

if target in content:
    content = content.replace(target, replacement)
    
    target_params = """         data.get('joiningDate'), data.get('monthlyRent'), data.get('securityDeposit'),
         data.get('idProofType'), data.get('idProofNumber')))"""
    replacement_params = """         data.get('joiningDate'), data.get('monthlyRent'), data.get('securityDeposit'),
         data.get('idProofType'), data.get('idProofNumber'), data.get('aadhaarNumber'), data.get('panNumber')))"""
    
    content = content.replace(target_params, replacement_params)
    
    with open('server.py', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Updated server.py add_resident")
else:
    print("Target not found for add_resident")
