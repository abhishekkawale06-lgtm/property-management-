import sys

with open('server.py', 'r', encoding='utf-8') as f:
    content = f.read()

target = '''        idProofType = COALESCE(?, idProofType),
        idProofNumber = COALESCE(?, idProofNumber),
        kycStatus = COALESCE(?, kycStatus),
        status = COALESCE(?, status)
        WHERE id = ?''',
        (data.get('name'), data.get('phone'), data.get('email'), data.get('gender'),
         data.get('dob'), data.get('emergencyContactName'), data.get('emergencyContactPhone'),
         data.get('currentAddress'), data.get('monthlyRent'), data.get('securityDeposit'),
         data.get('idProofType'), data.get('idProofNumber'), data.get('kycStatus'), data.get('status'), res_id))'''

replacement = '''        idProofType = COALESCE(?, idProofType),
        idProofNumber = COALESCE(?, idProofNumber),
        aadhaarNumber = COALESCE(?, aadhaarNumber),
        panNumber = COALESCE(?, panNumber),
        kycStatus = COALESCE(?, kycStatus),
        status = COALESCE(?, status)
        WHERE id = ?''',
        (data.get('name'), data.get('phone'), data.get('email'), data.get('gender'),
         data.get('dob'), data.get('emergencyContactName'), data.get('emergencyContactPhone'),
         data.get('currentAddress'), data.get('monthlyRent'), data.get('securityDeposit'),
         data.get('idProofType'), data.get('idProofNumber'), data.get('aadhaarNumber'), data.get('panNumber'), data.get('kycStatus'), data.get('status'), res_id))'''

if target in content:
    content = content.replace(target, replacement)
    print("Updated update_resident")
else:
    print("Target not found")

with open('server.py', 'w', encoding='utf-8') as f:
    f.write(content)
