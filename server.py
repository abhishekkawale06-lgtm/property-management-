from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from pg_wrapper import get_db
import os
import uuid
from datetime import datetime, timedelta
import jwt
from functools import wraps
from werkzeug.security import check_password_hash
from werkzeug.utils import secure_filename
import pandas as pd

from dotenv import load_dotenv
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests

load_dotenv()

app = Flask(__name__, static_folder='.')
CORS(app)

app.config['SECRET_KEY'] = os.environ.get('JWT_SECRET', 'fallback-dev-secret-change-in-prod')
app.config['UPLOAD_FOLDER'] = 'uploads'
app.config['SECURE_UPLOAD_FOLDER'] = 'secure_uploads'
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
os.makedirs(app.config['SECURE_UPLOAD_FOLDER'], exist_ok=True)

@app.before_request
def verify_token():
    if request.method == 'OPTIONS':
        return
    if request.path.startswith('/api/') and request.path not in ['/api/login']:
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({'error': 'Token is missing'}), 401
        token = auth_header.split(' ')[1]
        try:
            data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=['HS256'])
            request.current_user_id = data.get('user_id')
            request.current_user_role = data.get('role', 'Viewer')
        except Exception:
            return jsonify({'error': 'Token is invalid'}), 401

def get_current_user():
    """Returns (user_id, role, list_of_property_ids) for the logged-in user."""
    user_id = getattr(request, 'current_user_id', None)
    role = getattr(request, 'current_user_role', 'Viewer')
    if not user_id:
        return None, None, []
    if role == 'Owner':
        return user_id, role, None  # None means 'all properties'
    conn = get_db()
    rows = conn.execute('SELECT propertyId FROM user_properties WHERE userId = ?', (user_id,)).fetchall()
    conn.close()
    return user_id, role, [r['propertyId'] for r in rows]

@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

@app.route('/<path:path>')
def static_files(path):
    if path.startswith('secure_uploads/'):
        return "Forbidden", 403
    if os.path.exists(path):
        return send_from_directory('.', path)
    return "Not Found", 404


@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    if not data or not data.get('email') or not data.get('password'):
        return jsonify({'error': 'Missing credentials'}), 400
    
    conn = get_db()
    user = conn.execute('SELECT * FROM users WHERE email = ? AND status = ?', (data['email'], 'Active')).fetchone()
    
    if not user or not check_password_hash(user['password'], data['password']):
        conn.close()
        return jsonify({'error': 'Invalid credentials'}), 401

    # Get accessible properties for this user
    if user['role'] == 'Owner':
        props = conn.execute('SELECT id, name FROM properties WHERE active = 1').fetchall()
    else:
        props = conn.execute('''SELECT p.id, p.name FROM properties p
            JOIN user_properties up ON p.id = up.propertyId
            WHERE up.userId = ? AND p.active = 1''', (user['id'],)).fetchall()
    conn.close()

    token = jwt.encode({
        'user_id': user['id'],
        'role': user['role'],
        'exp': datetime.utcnow() + timedelta(hours=24)
    }, app.config['SECRET_KEY'], algorithm='HS256')

    return jsonify({
        'success': True,
        'token': token,
        'user': {
            'id': user['id'],
            'name': user['name'],
            'role': user['role'],
            'avatar': user['avatar']
        },
        'accessibleProperties': [dict(p) for p in props]
    })

@app.route('/api/login/google', methods=['POST'])
def login_google():
    data = request.json
    if not data or not data.get('credential'):
        return jsonify({'error': 'Missing credential'}), 400

    try:
        # Verify the Google token
        client_id = '968890788287-q8ihe5m7i77fgtd6ed2h58dgpuaunv11.apps.googleusercontent.com'
        idinfo = id_token.verify_oauth2_token(data['credential'], google_requests.Request(), client_id)

        email = idinfo['email']
        name = idinfo.get('name', '')
        
        conn = get_db()
        user = conn.execute('SELECT * FROM users WHERE email = ?', (email,)).fetchone()
        
        if not user:
            # Auto-create user for Google Login
            user_id = str(uuid.uuid4())[:8]
            from werkzeug.security import generate_password_hash
            import secrets
            # Generate a random password since they login with Google
            random_pw = generate_password_hash(secrets.token_urlsafe(16), method='pbkdf2:sha256')
            avatar = ''.join([w[0].upper() for w in name.split()[:2]]) if name else 'G'
            
            # Default to Manager role (requires Owner to assign properties later)
            conn.execute('INSERT INTO users VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                (user_id, name, email, random_pw, '', 'Manager', avatar, 'Active'))
            conn.commit()
            
            user = conn.execute('SELECT * FROM users WHERE id = ?', (user_id,)).fetchone()
        
        if user['status'] != 'Active':
            conn.close()
            return jsonify({'error': 'Account is inactive'}), 401

        # Get accessible properties for this user
        if user['role'] == 'Owner':
            props = conn.execute('SELECT id, name FROM properties WHERE active = 1').fetchall()
        else:
            props = conn.execute('''SELECT p.id, p.name FROM properties p
                JOIN user_properties up ON p.id = up.propertyId
                WHERE up.userId = ? AND p.active = 1''', (user['id'],)).fetchall()
        conn.close()

        # Issue our own JWT
        token = jwt.encode({
            'user_id': user['id'],
            'role': user['role'],
            'exp': datetime.utcnow() + timedelta(hours=24)
        }, app.config['SECRET_KEY'], algorithm='HS256')

        return jsonify({
            'success': True,
            'token': token,
            'user': {
                'id': user['id'],
                'name': user['name'],
                'role': user['role'],
                'avatar': user['avatar']
            },
            'accessibleProperties': [dict(p) for p in props]
        })

    except ValueError:
        return jsonify({'error': 'Invalid Google token'}), 401


@app.route('/api/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    file = request.files['file']
    is_secure = request.form.get('secure') == 'true'
    
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
    if file:
        filename = secure_filename(file.filename)
        unique_filename = f"{uuid.uuid4().hex}_{filename}"
        
        try:
            from supabase import create_client
            supabase = create_client(os.environ.get('SUPABASE_URL'), os.environ.get('SUPABASE_KEY'))
            file_bytes = file.read()
            bucket = 'secure-uploads' if is_secure else 'uploads'
            supabase.storage.from_(bucket).upload(
                path=unique_filename,
                file=file_bytes,
                file_options={"content-type": file.content_type or 'application/octet-stream'}
            )
            public_url = supabase.storage.from_(bucket).get_public_url(unique_filename)
            return jsonify({'success': True, 'fileUrl': public_url, 'isSecure': is_secure})
        except Exception as e:
            return jsonify({'error': str(e)}), 500

@app.route('/api/secure-file', methods=['GET'])
def get_secure_file():
    filepath = request.args.get('path')
    if not filepath:
        return "Forbidden", 403
    _, role, _ = get_current_user()
    if role not in ['Owner', 'Manager']:
        return jsonify({'error': 'Unauthorized'}), 403
    try:
        from supabase import create_client
        supabase = create_client(os.environ.get('SUPABASE_URL'), os.environ.get('SUPABASE_KEY'))
        filename = filepath.split('/')[-1]
        signed = supabase.storage.from_('secure-uploads').create_signed_url(filename, 60)
        from flask import redirect
        return redirect(signed['signedURL'])
    except Exception as e:
        return jsonify({'error': 'File not found'}), 404

@app.route('/api/export/residents', methods=['GET'])
def export_residents():
    conn = get_db()
    df = pd.read_sql_query('SELECT name, phone, email, joiningDate, monthlyRent, kycStatus, status FROM residents', conn)
    conn.close()
    
    format_type = request.args.get('format', 'csv')
    timestamp = datetime.today().strftime('%Y%m%d%H%M%S')
    
    if format_type == 'excel':
        filename = f"residents_export_{timestamp}.xlsx"
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        df.to_excel(filepath, index=False)
    else:
        filename = f"residents_export_{timestamp}.csv"
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        df.to_csv(filepath, index=False)
        
    return jsonify({'success': True, 'downloadUrl': f'/{filepath}'})

@app.route('/api/export/payments', methods=['GET'])
def export_payments():
    conn = get_db()
    df = pd.read_sql_query('SELECT month, amountExpected, amountPaid, dueDate, paymentMode, receiptNumber, status FROM payments', conn)
    conn.close()
    
    format_type = request.args.get('format', 'csv')
    timestamp = datetime.today().strftime('%Y%m%d%H%M%S')
    
    if format_type == 'excel':
        filename = f"payments_export_{timestamp}.xlsx"
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        df.to_excel(filepath, index=False)
    else:
        filename = f"payments_export_{timestamp}.csv"
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        df.to_csv(filepath, index=False)
        
    return jsonify({'success': True, 'downloadUrl': f'/{filepath}'})

@app.route('/api/notify/rent', methods=['POST'])
def notify_rent():
    data = request.json or {}
    res_id = data.get('residentId')
    month = data.get('month')
    amount = data.get('amount')
    print(f"\\n[EMAIL MOCK] Sending Rent Receipt to Resident {res_id} for {month}. Amount: {amount}")
    print("[EMAIL MOCK] Email Sent Successfully!\\n")
    return jsonify({'success': True})
@app.route('/api/properties', methods=['GET'])
def get_properties():
    conn = get_db()
    props = conn.execute('SELECT * FROM properties WHERE active = 1 ORDER BY name').fetchall()
    prop_list = []
    for p in props:
        p_dict = dict(p)
        # Enrich with live room & bed counts
        beds = conn.execute('SELECT status FROM beds WHERE propertyId = ?', (p['id'],)).fetchall()
        total_beds = len(beds)
        occupied = sum(1 for b in beds if b['status'] == 'Occupied')
        p_dict['totalBeds'] = total_beds
        p_dict['occupiedBeds'] = occupied
        p_dict['vacantBeds'] = sum(1 for b in beds if b['status'] == 'Available')
        p_dict['occupancyRate'] = round((occupied / total_beds * 100)) if total_beds > 0 else 0
        prop_list.append(p_dict)
    conn.close()
    return jsonify(prop_list)

@app.route('/api/properties', methods=['POST'])
def add_property():
    data = request.json or {}
    name = data.get('name')
    address = data.get('address')
    city = data.get('city', 'Bengaluru')
    pincode = data.get('pincode', '')
    property_type = data.get('propertyType', 'PG')
    occupancy_type = data.get('occupancyType', 'Co-living')
    owner_name = data.get('ownerName', '')
    owner_contact = data.get('ownerContact', '')
    owner_email = data.get('ownerEmail', '')
    manager_name = data.get('managerName', '')
    manager_contact = data.get('managerContact', '')
    floors = int(data.get('floors', 1) or 1)
    rooms = int(data.get('rooms', 0) or 0)
    total_beds = int(data.get('totalBeds', 0) or 0)
    check_in_time = data.get('checkInTime', '')
    check_out_time = data.get('checkOutTime', '')
    rent_due_day = int(data.get('rentDueDay', 5) or 5)
    security_deposit = int(data.get('securityDeposit', 10000) or 10000)
    notice_period = int(data.get('noticePeriodDays', 30) or 30)
    rent_structure = data.get('rentStructure', 'Monthly Advance')
    rules = data.get('rules', 'Standard PG guidelines apply.')

    if not name or not address:
        return jsonify({"error": "Property name and address are required"}), 400

    conn = get_db()
    
    # Generate PROP-XXX ID
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM properties")
    count = cursor.fetchone()[0]
    p_id = f"PROP-{(count + 1):03d}"
    
    conn.execute('''INSERT INTO properties 
        (id, name, address, city, pincode, propertyType, occupancyType, ownerName, ownerContact, ownerEmail, managerName, managerContact, floors, rooms, totalBeds, checkInTime, checkOutTime, rentDueDay, securityDeposit, noticePeriodDays, rentStructure, rules, active)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)''',
        (p_id, name, address, city, pincode, property_type, occupancy_type, owner_name, owner_contact, owner_email, manager_name, manager_contact, floors, rooms, total_beds, check_in_time, check_out_time, rent_due_day, security_deposit, notice_period, rent_structure, rules))
    conn.commit()
    conn.close()
    return jsonify({"success": True, "id": p_id})

@app.route('/api/properties/<prop_id>', methods=['PUT'])
def update_property(prop_id):
    data = request.json or {}
    conn = get_db()
    conn.execute('''UPDATE properties SET
        name = COALESCE(?, name),
        address = COALESCE(?, address),
        city = COALESCE(?, city),
        pincode = COALESCE(?, pincode),
        propertyType = COALESCE(?, propertyType),
        occupancyType = COALESCE(?, occupancyType),
        ownerName = COALESCE(?, ownerName),
        ownerContact = COALESCE(?, ownerContact),
        ownerEmail = COALESCE(?, ownerEmail),
        managerName = COALESCE(?, managerName),
        managerContact = COALESCE(?, managerContact),
        floors = COALESCE(?, floors),
        rooms = COALESCE(?, rooms),
        totalBeds = COALESCE(?, totalBeds),
        checkInTime = COALESCE(?, checkInTime),
        checkOutTime = COALESCE(?, checkOutTime),
        rentDueDay = COALESCE(?, rentDueDay),
        securityDeposit = COALESCE(?, securityDeposit),
        noticePeriodDays = COALESCE(?, noticePeriodDays),
        rentStructure = COALESCE(?, rentStructure),
        rules = COALESCE(?, rules)
        WHERE id = ?''',
        (data.get('name'), data.get('address'), data.get('city'), data.get('pincode'), data.get('propertyType'), data.get('occupancyType'), data.get('ownerName'), data.get('ownerContact'), data.get('ownerEmail'), data.get('managerName'), data.get('managerContact'), data.get('floors'), data.get('rooms'), data.get('totalBeds'), data.get('checkInTime'), data.get('checkOutTime'), data.get('rentDueDay'), data.get('securityDeposit'), data.get('noticePeriodDays'), data.get('rentStructure'), data.get('rules'), prop_id))
    conn.commit()
    conn.close()
    return jsonify({"success": True})

@app.route('/api/properties/<prop_id>', methods=['DELETE'])
def delete_property(prop_id):
    conn = get_db()
    conn.execute('UPDATE properties SET active = 0 WHERE id = ?', (prop_id,))
    conn.commit()
    conn.close()
    return jsonify({"success": True})


@app.route('/api/rooms', methods=['GET'])
def get_rooms():
    prop_id = request.args.get('propertyId')
    conn = get_db()
    query = 'SELECT * FROM rooms WHERE 1=1'
    params = []
    if prop_id and prop_id != 'all':
        query += ' AND propertyId = ?'
        params.append(prop_id)
    query += ' ORDER BY floor, roomNumber'

    raw_rooms = conn.execute(query, params).fetchall()
    rooms = []
    for r in raw_rooms:
        r_dict = dict(r)
        # Fetch beds for this room
        beds = conn.execute('SELECT * FROM beds WHERE roomId = ?', (r['id'],)).fetchall()
        enriched_beds = []
        for b in beds:
            b_dict = dict(b)
            if b_dict['status'] == 'Occupied' and b_dict['residentId']:
                res = conn.execute('SELECT id, name, phone, email, kycStatus FROM residents WHERE id = ?', (b_dict['residentId'],)).fetchone()
                b_dict['resident'] = dict(res) if res else None
            else:
                b_dict['resident'] = None
            enriched_beds.append(b_dict)
        r_dict['beds'] = enriched_beds
        r_dict['occupiedCount'] = sum(1 for b in enriched_beds if b['status'] == 'Occupied')
        r_dict['availableCount'] = sum(1 for b in enriched_beds if b['status'] == 'Available')
        rooms.append(r_dict)
    conn.close()
    return jsonify(rooms)

@app.route('/api/rooms', methods=['POST'])
def add_room():
    data = request.json or {}
    property_id = data.get('propertyId')
    room_number = data.get('roomNumber')
    floor = int(data.get('floor', 1))
    room_type = data.get('type', 'Double Sharing')
    rent_per_bed = int(data.get('rentPerBed', 8000))
    total_beds = int(data.get('totalBeds', 2))

    if not property_id or not room_number:
        return jsonify({"error": "Property and Room Number are required"}), 400

    conn = get_db()
    room_id = f"r_{property_id}_{room_number}"
    conn.execute('''INSERT INTO rooms (id, propertyId, roomNumber, floor, type, rentPerBed, totalBeds, status)
                    VALUES (?, ?, ?, ?, ?, ?, ?, 'Active')''',
                 (room_id, property_id, room_number, floor, room_type, rent_per_bed, total_beds))

    # Auto-generate beds for this room
    chars = ['A', 'B', 'C', 'D', 'E', 'F']
    for i in range(total_beds):
        char = chars[i] if i < len(chars) else str(i+1)
        bed_id = f"b_{room_id}_{char}"
        conn.execute('''INSERT INTO beds (id, roomId, propertyId, name, status, residentId)
                        VALUES (?, ?, ?, ?, 'Available', NULL)''',
                     (bed_id, room_id, property_id, f"Bed {char}"))

    # Update property room & bed counts
    conn.execute('''UPDATE properties SET 
        rooms = (SELECT COUNT(*) FROM rooms WHERE propertyId = ?),
        totalBeds = (SELECT COUNT(*) FROM beds WHERE propertyId = ?)
        WHERE id = ?''', (property_id, property_id, property_id))

    conn.commit()
    conn.close()
    return jsonify({"success": True, "roomId": room_id})

@app.route('/api/beds', methods=['GET'])
def get_beds():
    prop_id = request.args.get('propertyId')
    room_id = request.args.get('roomId')
    status = request.args.get('status')

    query = 'SELECT b.*, r.roomNumber, r.type as roomType, r.rentPerBed, p.name as propertyName FROM beds b JOIN rooms r ON b.roomId = r.id JOIN properties p ON b.propertyId = p.id WHERE 1=1'
    params = []
    if prop_id and prop_id != 'all':
        query += ' AND b.propertyId = ?'
        params.append(prop_id)
    if room_id:
        query += ' AND b.roomId = ?'
        params.append(room_id)
    if status:
        query += ' AND b.status = ?'
        params.append(status)

    conn = get_db()
    beds = conn.execute(query, params).fetchall()
    conn.close()
    return jsonify([dict(b) for b in beds])

@app.route('/api/beds/<bed_id>/status', methods=['PUT'])
def update_bed_status(bed_id):
    data = request.json or {}
    new_status = data.get('status')
    if new_status not in ['Available', 'Occupied', 'Reserved', 'Maintenance']:
        return jsonify({"error": "Invalid bed status"}), 400

    conn = get_db()
    # If setting to Available or Maintenance, clear residentId if not active
    if new_status in ['Available', 'Maintenance']:
        conn.execute('UPDATE beds SET status = ?, residentId = NULL WHERE id = ?', (new_status, bed_id))
    else:
        conn.execute('UPDATE beds SET status = ? WHERE id = ?', (new_status, bed_id))
    conn.commit()
    conn.close()
    return jsonify({"success": True})


@app.route('/api/residents', methods=['GET'])
def get_residents():
    prop_id = request.args.get('propertyId')
    status = request.args.get('status')
    kyc_status = request.args.get('kycStatus')

    query = '''
        SELECT res.*, p.name as propertyName, r.roomNumber, r.type as roomType, b.name as bedName
        FROM residents res
        JOIN properties p ON res.propertyId = p.id
        LEFT JOIN rooms r ON res.roomId = r.id
        LEFT JOIN beds b ON res.bedId = b.id
        WHERE 1=1
    '''
    params = []
    if prop_id and prop_id != 'all':
        query += ' AND res.propertyId = ?'
        params.append(prop_id)
    if status:
        query += ' AND res.status = ?'
        params.append(status)
    if kyc_status:
        query += ' AND res.kycStatus = ?'
        params.append(kyc_status)

    query += ' ORDER BY res.joiningDate DESC'

    conn = get_db()
    residents = conn.execute(query, params).fetchall()
    conn.close()
    return jsonify([dict(r) for r in residents])

@app.route('/api/residents', methods=['POST'])
def add_resident():
    data = request.json or {}
    name = data.get('name')
    phone = data.get('phone')
    email = data.get('email')
    gender = data.get('gender', 'Male')
    dob = data.get('dob')
    emergency_name = data.get('emergencyContactName')
    emergency_phone = data.get('emergencyContactPhone')
    address = data.get('currentAddress')
    property_id = data.get('propertyId')
    room_id = data.get('roomId')
    bed_id = data.get('bedId')
    joining_date = data.get('joiningDate', datetime.today().strftime('%Y-%m-%d'))
    monthly_rent = int(data.get('monthlyRent', 8000))
    security_deposit = int(data.get('securityDeposit', monthly_rent * 2))
    id_type = data.get('idProofType', 'Aadhaar')
    id_number = data.get('idProofNumber')
    kyc_status = data.get('kycStatus', 'Pending')

    if not name or not phone or not property_id or not room_id or not bed_id:
        return jsonify({"error": "Name, phone, property, room, and bed are required"}), 400

    conn = get_db()
    # Check if bed is already occupied by an active resident (Business Rule #1)
    bed = conn.execute('SELECT * FROM beds WHERE id = ?', (bed_id,)).fetchone()
    if not bed:
        conn.close()
        return jsonify({"error": "Selected bed does not exist"}), 404
    if bed['status'] == 'Occupied':
        conn.close()
        return jsonify({"error": "Selected bed is already occupied!"}), 400

    res_id = f"res_{uuid.uuid4().hex[:8]}"

    # Insert Resident
    aadhaar_number = data.get('aadhaarNumber')
    pan_number = data.get('panNumber')
    conn.execute('''INSERT INTO residents 
        (id, name, phone, email, gender, dob, emergencyContactName, emergencyContactPhone, 
         currentAddress, propertyId, roomId, bedId, joiningDate, monthlyRent, securityDeposit, 
         idProofType, idProofNumber, kycStatus, status, aadhaarNumber, panNumber)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Active', ?, ?)''',
        (res_id, name, phone, email, gender, dob, emergency_name, emergency_phone, address,
         property_id, room_id, bed_id, joining_date, monthly_rent, security_deposit,
         id_type, id_number, kyc_status, aadhaar_number, pan_number))

    # Business Rule #2: Automatically set bed to Occupied
    conn.execute('UPDATE beds SET status = "Occupied", residentId = ? WHERE id = ?', (res_id, bed_id))

    # Generate current month rent payment record
    current_month = datetime.today().strftime('%Y-%m')
    pay_id = f"pay_{res_id}_{current_month.replace('-', '')}"
    conn.execute('''INSERT OR IGNORE INTO payments 
        (id, residentId, propertyId, month, amountExpected, amountPaid, dueDate, status, notes)
        VALUES (?, ?, ?, ?, ?, 0, ?, 'Pending', 'Monthly rent invoice')''',
        (pay_id, res_id, property_id, current_month, monthly_rent, f"{current_month}-05"))

    conn.commit()
    conn.close()
    return jsonify({"success": True, "id": res_id})

@app.route('/api/residents/<res_id>', methods=['PUT'])
def update_resident(res_id):
    data = request.json or {}
    conn = get_db()
    conn.execute('''UPDATE residents SET
        name = COALESCE(?, name),
        phone = COALESCE(?, phone),
        email = COALESCE(?, email),
        gender = COALESCE(?, gender),
        dob = COALESCE(?, dob),
        emergencyContactName = COALESCE(?, emergencyContactName),
        emergencyContactPhone = COALESCE(?, emergencyContactPhone),
        currentAddress = COALESCE(?, currentAddress),
        monthlyRent = COALESCE(?, monthlyRent),
        securityDeposit = COALESCE(?, securityDeposit),
        idProofType = COALESCE(?, idProofType),
        idProofNumber = COALESCE(?, idProofNumber),
        aadhaarNumber = COALESCE(?, aadhaarNumber),
        panNumber = COALESCE(?, panNumber),
        kycStatus = COALESCE(?, kycStatus),
        status = COALESCE(?, status)
        WHERE id = ?''',
        (data.get('name'), data.get('phone'), data.get('email'), data.get('gender'),
         data.get('dob'), data.get('emergencyContactName'), data.get('emergencyContactPhone'),
         data.get('currentAddress'), data.get('monthlyRent'), data.get('securityDeposit'),
         data.get('idProofType'), data.get('idProofNumber'), data.get('aadhaarNumber'), data.get('panNumber'), data.get('kycStatus'),
         data.get('status'), res_id))
    conn.commit()
    conn.close()
    return jsonify({"success": True})

# Business Rule #4: Room transfer workflow
@app.route('/api/residents/<res_id>/transfer', methods=['POST'])
def transfer_resident(res_id):
    data = request.json or {}
    new_room_id = data.get('roomId')
    new_bed_id = data.get('bedId')

    if not new_room_id or not new_bed_id:
        return jsonify({"error": "Target room and bed are required"}), 400

    conn = get_db()
    res = conn.execute('SELECT * FROM residents WHERE id = ?', (res_id,)).fetchone()
    if not res:
        conn.close()
        return jsonify({"error": "Resident not found"}), 404

    old_bed_id = res['bedId']

    # Verify new bed is available
    new_bed = conn.execute('SELECT * FROM beds WHERE id = ?', (new_bed_id,)).fetchone()
    if not new_bed or new_bed['status'] == 'Occupied':
        conn.close()
        return jsonify({"error": "Target bed is already occupied or does not exist"}), 400

    # 1. Release old bed to Available
    if old_bed_id:
        conn.execute('UPDATE beds SET status = "Available", residentId = NULL WHERE id = ?', (old_bed_id,))

    # 2. Occupy new bed
    conn.execute('UPDATE beds SET status = "Occupied", residentId = ? WHERE id = ?', (res_id, new_bed_id))

    # 3. Update resident record
    conn.execute('UPDATE residents SET roomId = ?, bedId = ?, propertyId = ? WHERE id = ?',
                 (new_room_id, new_bed_id, new_bed['propertyId'], res_id))

    conn.commit()
    conn.close()
    return jsonify({"success": True})

# Business Rule #3 & Section 10: Resident Checkout workflow
@app.route('/api/residents/<res_id>/checkout', methods=['POST'])
def checkout_resident(res_id):
    data = request.json or {}
    checkout_date = data.get('checkoutDate', datetime.today().strftime('%Y-%m-%d'))
    notice_date = data.get('noticeDate', (datetime.today() - timedelta(days=30)).strftime('%Y-%m-%d'))
    pending_dues = int(data.get('pendingDues', 0))
    other_dues = int(data.get('otherDues', 0))
    damage_deduction = int(data.get('damageDeduction', 0))
    remarks = data.get('remarks', 'Standard checkout completed.')

    conn = get_db()
    res = conn.execute('SELECT * FROM residents WHERE id = ?', (res_id,)).fetchone()
    if not res:
        conn.close()
        return jsonify({"error": "Resident not found"}), 404

    deposit_amount = res['securityDeposit']
    total_deductions = pending_dues + other_dues + damage_deduction
    deposit_refunded = max(0, deposit_amount - total_deductions)
    final_settlement = deposit_refunded

    chk_id = f"chk_{uuid.uuid4().hex[:8]}"

    # Record checkout
    conn.execute('''INSERT INTO checkouts 
        (id, residentId, propertyId, roomId, bedId, noticeDate, checkoutDate, 
         pendingDues, otherDues, damageDeduction, depositAmount, depositRefunded, finalSettlement, status, remarks)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Completed', ?)''',
        (chk_id, res_id, res['propertyId'], res['roomId'], res['bedId'], notice_date, checkout_date,
         pending_dues, other_dues, damage_deduction, deposit_amount, deposit_refunded, final_settlement, remarks))

    # Mark resident as Checked Out
    conn.execute('UPDATE residents SET status = "Checked Out" WHERE id = ?', (res_id,))

    # Automatically revert Bed to Available
    if res['bedId']:
        conn.execute('UPDATE beds SET status = "Available", residentId = NULL WHERE id = ?', (res['bedId'],))

    conn.commit()
    conn.close()
    return jsonify({
        "success": True,
        "checkoutId": chk_id,
        "depositRefunded": deposit_refunded,
        "finalSettlement": final_settlement
    })

# ----------------------------------------------------
# 4. LEADS & ENQUIRIES API
# ----------------------------------------------------
@app.route('/api/leads', methods=['GET'])
def get_leads():
    prop_id = request.args.get('propertyId')
    status = request.args.get('status')
    query = 'SELECT l.*, p.name as propertyName FROM leads l LEFT JOIN properties p ON l.propertyId = p.id WHERE 1=1'
    params = []
    if prop_id and prop_id != 'all':
        query += ' AND l.propertyId = ?'
        params.append(prop_id)
    if status:
        query += ' AND l.status = ?'
        params.append(status)
    query += ' ORDER BY l.createdDate DESC'

    conn = get_db()
    leads = conn.execute(query, params).fetchall()
    conn.close()
    return jsonify([dict(l) for l in leads])

@app.route('/api/leads', methods=['POST'])
def add_lead():
    data = request.json or {}
    name = data.get('name')
    phone = data.get('phone')
    email = data.get('email')
    property_id = data.get('propertyId')
    room_type = data.get('preferredRoomType', 'Double Sharing')
    budget = int(data.get('budget', 8000))
    move_in_date = data.get('moveInDate')
    source = data.get('source', 'Website')
    notes = data.get('notes')
    follow_up_date = data.get('followUpDate')

    if not name or not phone:
        return jsonify({"error": "Lead name and phone are required"}), 400

    conn = get_db()
    lead_id = f"lead_{uuid.uuid4().hex[:6]}"
    created_date = datetime.today().strftime('%Y-%m-%d')
    conn.execute('''INSERT INTO leads 
        (id, name, phone, email, propertyId, preferredRoomType, budget, moveInDate, source, status, notes, followUpDate, createdDate)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'New', ?, ?, ?)''',
        (lead_id, name, phone, email, property_id, room_type, budget, move_in_date, source, notes, follow_up_date, created_date))
    conn.commit()
    conn.close()
    return jsonify({"success": True, "id": lead_id})

@app.route('/api/leads/<lead_id>', methods=['PUT'])
def update_lead(lead_id):
    data = request.json or {}
    conn = get_db()
    conn.execute('''UPDATE leads SET
        status = COALESCE(?, status),
        notes = COALESCE(?, notes),
        followUpDate = COALESCE(?, followUpDate),
        budget = COALESCE(?, budget),
        preferredRoomType = COALESCE(?, preferredRoomType)
        WHERE id = ?''',
        (data.get('status'), data.get('notes'), data.get('followUpDate'), data.get('budget'), data.get('preferredRoomType'), lead_id))
    conn.commit()
    conn.close()
    return jsonify({"success": True})

# Workflow: Convert Lead into Resident
@app.route('/api/leads/<lead_id>/convert', methods=['POST'])
def convert_lead(lead_id):
    data = request.json or {}
    room_id = data.get('roomId')
    bed_id = data.get('bedId')
    joining_date = data.get('joiningDate', datetime.today().strftime('%Y-%m-%d'))
    monthly_rent = int(data.get('monthlyRent', 8000))

    if not room_id or not bed_id:
        return jsonify({"error": "Room and Bed are required for resident conversion"}), 400

    conn = get_db()
    lead = conn.execute('SELECT * FROM leads WHERE id = ?', (lead_id,)).fetchone()
    if not lead:
        conn.close()
        return jsonify({"error": "Lead not found"}), 404

    # Verify bed is available
    bed = conn.execute('SELECT * FROM beds WHERE id = ?', (bed_id,)).fetchone()
    if not bed or bed['status'] == 'Occupied':
        conn.close()
        return jsonify({"error": "Selected bed is already occupied"}), 400

    prop_id = bed['propertyId']
    res_id = f"res_{uuid.uuid4().hex[:8]}"

    # Create Resident
    conn.execute('''INSERT INTO residents 
        (id, name, phone, email, currentAddress, propertyId, roomId, bedId, joiningDate, monthlyRent, securityDeposit, kycStatus, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending', 'Active')''',
        (res_id, lead['name'], lead['phone'], lead['email'], lead['notes'],
         prop_id, room_id, bed_id, joining_date, monthly_rent, monthly_rent * 2))

    # Mark Bed as Occupied
    conn.execute('UPDATE beds SET status = "Occupied", residentId = ? WHERE id = ?', (res_id, bed_id))

    # Mark Lead as Booked
    conn.execute('UPDATE leads SET status = "Booked" WHERE id = ?', (lead_id,))

    # Create initial rent payment
    curr_month = datetime.today().strftime('%Y-%m')
    pay_id = f"pay_{res_id}_{curr_month.replace('-', '')}"
    conn.execute('''INSERT OR IGNORE INTO payments 
        (id, residentId, propertyId, month, amountExpected, amountPaid, dueDate, status, notes)
        VALUES (?, ?, ?, ?, ?, 0, ?, 'Pending', 'Initial month rent')''',
        (pay_id, res_id, prop_id, curr_month, monthly_rent, f"{curr_month}-05"))

    conn.commit()
    conn.close()
    return jsonify({"success": True, "residentId": res_id})

# ----------------------------------------------------
# 5. RENT & PAYMENTS API
# ----------------------------------------------------
@app.route('/api/payments', methods=['GET'])
def get_payments():
    prop_id = request.args.get('propertyId')
    month = request.args.get('month')
    status = request.args.get('status')
    res_id = request.args.get('residentId')

    query = '''
        SELECT pay.*, res.name as residentName, res.phone as residentPhone, 
               p.name as propertyName, r.roomNumber, b.name as bedName
        FROM payments pay
        JOIN residents res ON pay.residentId = res.id
        JOIN properties p ON pay.propertyId = p.id
        LEFT JOIN rooms r ON res.roomId = r.id
        LEFT JOIN beds b ON res.bedId = b.id
        WHERE 1=1
    '''
    params = []
    if prop_id and prop_id != 'all':
        query += ' AND pay.propertyId = ?'
        params.append(prop_id)
    if month:
        query += ' AND pay.month = ?'
        params.append(month)
    if status:
        query += ' AND pay.status = ?'
        params.append(status)
    if res_id:
        query += ' AND pay.residentId = ?'
        params.append(res_id)

    query += ' ORDER BY pay.month DESC, pay.dueDate DESC'

    conn = get_db()
    payments = conn.execute(query, params).fetchall()
    conn.close()
    return jsonify([dict(p) for p in payments])

@app.route('/api/payments/record', methods=['POST'])
def record_payment():
    data = request.json or {}
    pay_id = data.get('paymentId')
    amount_paid = int(data.get('amountPaid', 0))
    payment_mode = data.get('paymentMode', 'UPI')
    reference_number = data.get('referenceNumber', f"TXN{uuid.uuid4().hex[:8].upper()}")
    notes = data.get('notes', 'Payment collected')

    if not pay_id or amount_paid <= 0:
        return jsonify({"error": "Valid payment ID and amount are required"}), 400

    conn = get_db()
    pay = conn.execute('SELECT * FROM payments WHERE id = ?', (pay_id,)).fetchone()
    if not pay:
        conn.close()
        return jsonify({"error": "Payment record not found"}), 404

    new_total_paid = pay['amountPaid'] + amount_paid
    expected = pay['amountExpected']

    if new_total_paid >= expected:
        new_status = 'Paid'
    elif new_total_paid > 0:
        new_status = 'Partial'
    else:
        new_status = 'Pending'

    receipt_no = pay['receiptNumber'] or f"REC-{datetime.today().strftime('%Y%m%d')}-{uuid.uuid4().hex[:4].upper()}"
    paid_date = datetime.today().strftime('%Y-%m-%d')

    conn.execute('''UPDATE payments SET
        amountPaid = ?,
        status = ?,
        paidDate = ?,
        paymentMode = ?,
        referenceNumber = ?,
        receiptNumber = ?,
        notes = ?
        WHERE id = ?''',
        (new_total_paid, new_status, paid_date, payment_mode, reference_number, receipt_no, notes, pay_id))

    conn.commit()
    conn.close()
    return jsonify({
        "success": True,
        "receiptNumber": receipt_no,
        "amountPaid": new_total_paid,
        "status": new_status
    })

@app.route('/api/payments/generate-month', methods=['POST'])
def generate_month_rent():
    data = request.json or {}
    month = data.get('month', datetime.today().strftime('%Y-%m'))
    due_date = f"{month}-05"

    conn = get_db()
    active_residents = conn.execute('SELECT * FROM residents WHERE status = "Active"').fetchall()
    created_count = 0

    for res in active_residents:
        pay_id = f"pay_{res['id']}_{month.replace('-', '')}"
        exists = conn.execute('SELECT id FROM payments WHERE id = ?', (pay_id,)).fetchone()
        if not exists:
            conn.execute('''INSERT INTO payments 
                (id, residentId, propertyId, month, amountExpected, amountPaid, dueDate, status, notes)
                VALUES (?, ?, ?, ?, ?, 0, ?, 'Pending', 'Auto-generated rent invoice')''',
                (pay_id, res['id'], res['propertyId'], month, res['monthlyRent'], due_date))
            created_count += 1

    conn.commit()
    conn.close()
    return jsonify({"success": True, "createdCount": created_count, "month": month})

# ----------------------------------------------------
# 6. COMPLAINTS & MAINTENANCE API
# ----------------------------------------------------
@app.route('/api/complaints', methods=['GET'])
def get_complaints():
    prop_id = request.args.get('propertyId')
    status = request.args.get('status')
    query = '''
        SELECT c.*, res.name as residentName, res.phone as residentPhone,
               p.name as propertyName, r.roomNumber, s.name as staffName
        FROM complaints c
        JOIN properties p ON c.propertyId = p.id
        LEFT JOIN residents res ON c.residentId = res.id
        LEFT JOIN rooms r ON c.roomId = r.id
        LEFT JOIN staff s ON c.assignedStaffId = s.id
        WHERE 1=1
    '''
    params = []
    if prop_id and prop_id != 'all':
        query += ' AND c.propertyId = ?'
        params.append(prop_id)
    if status:
        query += ' AND c.status = ?'
        params.append(status)
    query += ' ORDER BY c.createdDate DESC'

    conn = get_db()
    comps = conn.execute(query, params).fetchall()
    conn.close()
    return jsonify([dict(c) for c in comps])

@app.route('/api/complaints', methods=['POST'])
def add_complaint():
    data = request.json or {}
    title = data.get('title')
    resident_id = data.get('residentId')
    property_id = data.get('propertyId')
    room_id = data.get('roomId')
    category = data.get('category', 'Maintenance')
    description = data.get('description')
    priority = data.get('priority', 'Medium')
    assigned_staff_id = data.get('assignedStaffId')

    if not title or not property_id:
        return jsonify({"error": "Title and Property are required"}), 400

    conn = get_db()
    c_id = f"c_{uuid.uuid4().hex[:6]}"
    created_date = datetime.today().strftime('%Y-%m-%d')
    initial_status = 'Assigned' if assigned_staff_id else 'Pending'

    conn.execute('''INSERT INTO complaints 
        (id, title, residentId, propertyId, roomId, category, description, priority, assignedStaffId, status, createdDate)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)''',
        (c_id, title, resident_id, property_id, room_id, category, description, priority, assigned_staff_id, initial_status, created_date))

    conn.commit()
    conn.close()
    return jsonify({"success": True, "id": c_id})

@app.route('/api/complaints/<c_id>', methods=['PUT'])
def update_complaint(c_id):
    data = request.json or {}
    status = data.get('status')
    staff_id = data.get('assignedStaffId')
    resolution_notes = data.get('resolutionNotes')
    resolved_date = datetime.today().strftime('%Y-%m-%d') if status == 'Resolved' else None

    conn = get_db()
    conn.execute('''UPDATE complaints SET
        status = COALESCE(?, status),
        assignedStaffId = COALESCE(?, assignedStaffId),
        resolutionNotes = COALESCE(?, resolutionNotes),
        resolvedDate = COALESCE(?, resolvedDate)
        WHERE id = ?''',
        (status, staff_id, resolution_notes, resolved_date, c_id))
    conn.commit()
    conn.close()
    return jsonify({"success": True})

# ----------------------------------------------------
# 7. EXPENSES API
# ----------------------------------------------------
@app.route('/api/expenses', methods=['GET'])
def get_expenses():
    prop_id = request.args.get('propertyId')
    query = 'SELECT e.*, p.name as propertyName FROM expenses e JOIN properties p ON e.propertyId = p.id WHERE 1=1'
    params = []
    if prop_id and prop_id != 'all':
        query += ' AND e.propertyId = ?'
        params.append(prop_id)
    query += ' ORDER BY e.date DESC'

    conn = get_db()
    expenses = conn.execute(query, params).fetchall()
    conn.close()
    return jsonify([dict(e) for e in expenses])

@app.route('/api/expenses', methods=['POST'])
def add_expense():
    data = request.json or {}
    property_id = data.get('propertyId')
    date = data.get('date', datetime.today().strftime('%Y-%m-%d'))
    category = data.get('category', 'Maintenance')
    desc = data.get('description', '')
    amount = int(data.get('amount', 0))
    payment_method = data.get('paymentMethod', 'Bank Transfer')

    if not property_id or amount <= 0:
        return jsonify({"error": "Property and valid amount are required"}), 400

    conn = get_db()
    e_id = f"exp_{uuid.uuid4().hex[:6]}"
    conn.execute('''INSERT INTO expenses (id, propertyId, date, category, description, amount, paymentMethod)
                    VALUES (?, ?, ?, ?, ?, ?, ?)''',
                 (e_id, property_id, date, category, desc, amount, payment_method))
    conn.commit()
    conn.close()
    return jsonify({"success": True, "id": e_id})

# ----------------------------------------------------
# 8. STAFF & NOTICES API
# ----------------------------------------------------
@app.route('/api/staff', methods=['GET'])
def get_staff():
    prop_id = request.args.get('propertyId')
    query = 'SELECT s.*, p.name as propertyName FROM staff s LEFT JOIN properties p ON s.propertyId = p.id WHERE 1=1'
    params = []
    if prop_id and prop_id != 'all':
        query += ' AND (s.propertyId = ? OR s.propertyId IS NULL)'
        params.append(prop_id)
    conn = get_db()
    staff_members = conn.execute(query, params).fetchall()
    conn.close()
    return jsonify([dict(s) for s in staff_members])

@app.route('/api/staff', methods=['POST'])
def add_staff():
    data = request.json or {}
    name = data.get('name')
    role = data.get('role', 'Warden')
    phone = data.get('phone')
    property_id = data.get('propertyId')
    salary = int(data.get('salary', 20000))

    conn = get_db()
    s_id = f"st_{uuid.uuid4().hex[:6]}"
    conn.execute('INSERT INTO staff VALUES (?, ?, ?, ?, ?, ?, "Active")',
                 (s_id, property_id, name, role, phone, salary))
    conn.commit()
    conn.close()
    return jsonify({"success": True, "id": s_id})

@app.route('/api/notices', methods=['GET'])
def get_notices():
    prop_id = request.args.get('propertyId')
    query = 'SELECT n.*, p.name as propertyName FROM notices n LEFT JOIN properties p ON n.propertyId = p.id WHERE 1=1'
    params = []
    if prop_id and prop_id != 'all':
        query += ' AND (n.propertyId = ? OR n.propertyId IS NULL)'
        params.append(prop_id)
    query += ' ORDER BY n.date DESC'
    conn = get_db()
    notices = conn.execute(query, params).fetchall()
    conn.close()
    return jsonify([dict(n) for n in notices])

@app.route('/api/notices', methods=['POST'])
def add_notice():
    data = request.json or {}
    title = data.get('title')
    message = data.get('message')
    property_id = data.get('propertyId')
    priority = data.get('priority', 'Normal')
    target = data.get('targetResidents', 'All')

    if not title or not message:
        return jsonify({"error": "Title and message are required"}), 400

    conn = get_db()
    n_id = f"not_{uuid.uuid4().hex[:6]}"
    date = datetime.today().strftime('%Y-%m-%d')
    conn.execute('INSERT INTO notices VALUES (?, ?, ?, ?, ?, ?, ?)',
                 (n_id, property_id, title, message, target, priority, date))
    conn.commit()
    conn.close()
    return jsonify({"success": True, "id": n_id})

# ----------------------------------------------------
# 9. NOTIFICATIONS ALERT SYSTEM
# ----------------------------------------------------
@app.route('/api/notifications', methods=['GET'])
def get_notifications():
    prop_id = request.args.get('propertyId')
    conn = get_db()
    notifications = []

    # 1. Real-time Overdue Rent
    q_overdue = "SELECT COUNT(*) as count FROM payments WHERE status = 'Overdue'"
    p_params = []
    if prop_id and prop_id != 'all':
        q_overdue += " AND propertyId = ?"
        p_params.append(prop_id)
    overdue_count = conn.execute(q_overdue, p_params).fetchone()['count']
    if overdue_count > 0:
        notifications.append({
            "title": f"Rent Overdue ({overdue_count} Residents)",
            "desc": f"{overdue_count} residents have pending dues overdue.",
            "time": "Immediate Attention",
            "type": "danger",
            "icon": "alert-circle",
            "link": "collections"
        })

    # 2. Pending KYC
    q_kyc = "SELECT COUNT(*) as count FROM residents WHERE kycStatus = 'Pending' AND status = 'Active'"
    k_params = []
    if prop_id and prop_id != 'all':
        q_kyc += " AND propertyId = ?"
        k_params.append(prop_id)
    pending_kyc = conn.execute(q_kyc, k_params).fetchone()['count']
    if pending_kyc > 0:
        notifications.append({
            "title": f"KYC Pending ({pending_kyc} Residents)",
            "desc": "Resident identity documents require admin verification.",
            "time": "Action Required",
            "type": "warning",
            "icon": "shield-alert",
            "link": "residents"
        })

    # 3. High-Priority Complaints
    q_comp = "SELECT COUNT(*) as count FROM complaints WHERE status IN ('Pending', 'Assigned', 'In Progress') AND priority = 'High'"
    c_params = []
    if prop_id and prop_id != 'all':
        q_comp += " AND propertyId = ?"
        c_params.append(prop_id)
    high_comps = conn.execute(q_comp, c_params).fetchone()['count']
    if high_comps > 0:
        notifications.append({
            "title": f"Urgent Complaints ({high_comps})",
            "desc": "High priority maintenance tickets awaiting closure.",
            "time": "Today",
            "type": "danger",
            "icon": "wrench",
            "link": "complaints"
        })

    # 4. Notice Period / Upcoming Checkouts
    q_notice = "SELECT COUNT(*) as count FROM residents WHERE status = 'Notice Period'"
    n_params = []
    if prop_id and prop_id != 'all':
        q_notice += " AND propertyId = ?"
        n_params.append(prop_id)
    notice_residents = conn.execute(q_notice, n_params).fetchone()['count']
    if notice_residents > 0:
        notifications.append({
            "title": f"Notice Period Active ({notice_residents})",
            "desc": f"{notice_residents} residents have scheduled checkouts.",
            "time": "Upcoming",
            "type": "info",
            "icon": "log-out",
            "link": "residents"
        })

    # 5. New Leads Requiring Follow-up
    q_leads = "SELECT COUNT(*) as count FROM leads WHERE status = 'New'"
    l_params = []
    if prop_id and prop_id != 'all':
        q_leads += " AND propertyId = ?"
        l_params.append(prop_id)
    new_leads = conn.execute(q_leads, l_params).fetchone()['count']
    if new_leads > 0:
        notifications.append({
            "title": f"New Enquiries ({new_leads})",
            "desc": "Prospective residents awaiting initial contact.",
            "time": "New",
            "type": "info",
            "icon": "user-plus",
            "link": "leads"
        })

    conn.close()
    return jsonify(notifications)

# ----------------------------------------------------
# 10. REPORTS & BUSINESS ANALYTICS API
# ----------------------------------------------------
@app.route('/api/analytics/summary', methods=['GET'])
def get_analytics_summary():
    prop_id = request.args.get('propertyId')
    conn = get_db()

    # Filter base condition
    p_filter = " WHERE propertyId = ?" if (prop_id and prop_id != 'all') else ""
    p_params = [prop_id] if (prop_id and prop_id != 'all') else []

    # 1. Properties count
    if prop_id and prop_id != 'all':
        total_properties = 1
    else:
        total_properties = conn.execute("SELECT COUNT(*) FROM properties WHERE active = 1").fetchone()[0]

    # 2. Bed stats
    beds = conn.execute(f"SELECT status FROM beds{p_filter}", p_params).fetchall()
    total_beds = len(beds)
    occupied_beds = sum(1 for b in beds if b['status'] == 'Occupied')
    vacant_beds = sum(1 for b in beds if b['status'] == 'Available')
    reserved_beds = sum(1 for b in beds if b['status'] == 'Reserved')
    maintenance_beds = sum(1 for b in beds if b['status'] == 'Maintenance')
    occupancy_rate = round((occupied_beds / total_beds * 100)) if total_beds > 0 else 0

    # 3. Revenue & Collections (Current Month: 2026-09)
    current_month = '2026-09'
    month_filter = f" WHERE month = '{current_month}'"
    if prop_id and prop_id != 'all':
        month_filter += f" AND propertyId = '{prop_id}'"

    payments_month = conn.execute(f"SELECT amountExpected, amountPaid, status FROM payments{month_filter}").fetchall()
    rent_expected = sum(p['amountExpected'] for p in payments_month)
    rent_collected = sum(p['amountPaid'] for p in payments_month)
    rent_pending = max(0, rent_expected - rent_collected)
    rent_overdue = sum(p['amountExpected'] - p['amountPaid'] for p in payments_month if p['status'] == 'Overdue')

    # All-time Total Revenue
    all_time_rev = conn.execute(f"SELECT COALESCE(SUM(amountPaid), 0) FROM payments{p_filter}", p_params).fetchone()[0]

    # 4. Total Expenses (Current Month & All Time)
    exp_month_filter = f" WHERE date LIKE '{current_month}%'"
    if prop_id and prop_id != 'all':
        exp_month_filter += f" AND propertyId = '{prop_id}'"
    month_expenses = conn.execute(f"SELECT COALESCE(SUM(amount), 0) FROM expenses{exp_month_filter}").fetchone()[0]
    total_expenses = conn.execute(f"SELECT COALESCE(SUM(amount), 0) FROM expenses{p_filter}", p_params).fetchone()[0]

    # 5. Net Profit & Margin
    # Net Profit = Total Revenue - Total Expenses
    net_profit_month = rent_collected - month_expenses
    profit_margin = round((net_profit_month / rent_collected * 100)) if rent_collected > 0 else 0

    # 6. Monthly Trend over last 4 months
    months = ['2026-06', '2026-07', '2026-08', '2026-09']
    monthly_trends = []
    for m in months:
        m_filter = f" WHERE month = '{m}'"
        e_filter = f" WHERE date LIKE '{m}%'"
        if prop_id and prop_id != 'all':
            m_filter += f" AND propertyId = '{prop_id}'"
            e_filter += f" AND propertyId = '{prop_id}'"

        rev = conn.execute(f"SELECT COALESCE(SUM(amountPaid), 0) FROM payments{m_filter}").fetchone()[0]
        exp = conn.execute(f"SELECT COALESCE(SUM(amount), 0) FROM expenses{e_filter}").fetchone()[0]
        monthly_trends.append({
            "month": m,
            "revenue": rev,
            "expenses": exp,
            "netProfit": rev - exp
        })

    # 7. Category-wise Expenses Breakdown
    cat_query = f"SELECT category, SUM(amount) as total FROM expenses{p_filter} GROUP BY category"
    cat_expenses = conn.execute(cat_query, p_params).fetchall()
    expense_categories = [{"category": c['category'], "total": c['total']} for c in cat_expenses]

    # 8. Property-wise comparison
    props = conn.execute("SELECT id, name FROM properties WHERE active = 1").fetchall()
    property_comparison = []
    for pr in props:
        p_beds = conn.execute("SELECT status FROM beds WHERE propertyId = ?", (pr['id'],)).fetchall()
        tot = len(p_beds)
        occ = sum(1 for b in p_beds if b['status'] == 'Occupied')
        col = conn.execute("SELECT COALESCE(SUM(amountPaid), 0) FROM payments WHERE propertyId = ? AND month = ?", (pr['id'], current_month)).fetchone()[0]
        exps = conn.execute("SELECT COALESCE(SUM(amount), 0) FROM expenses WHERE propertyId = ? AND date LIKE ?", (pr['id'], f"{current_month}%")).fetchone()[0]
        property_comparison.append({
            "id": pr['id'],
            "name": pr['name'],
            "totalBeds": tot,
            "occupiedBeds": occ,
            "occupancyRate": round((occ / tot * 100)) if tot > 0 else 0,
            "collected": col,
            "expenses": exps,
            "netProfit": col - exps
        })

    # 9. Dashboard Alerts Counts
    pending_complaints = conn.execute(f"SELECT COUNT(*) FROM complaints WHERE status IN ('Pending', 'Assigned', 'In Progress') {'AND propertyId = ?' if (prop_id and prop_id != 'all') else ''}", p_params).fetchone()[0]
    kyc_pending_count = conn.execute(f"SELECT COUNT(*) FROM residents WHERE kycStatus = 'Pending' AND status = 'Active' {'AND propertyId = ?' if (prop_id and prop_id != 'all') else ''}", p_params).fetchone()[0]
    notice_count = conn.execute(f"SELECT COUNT(*) FROM residents WHERE status = 'Notice Period' {'AND propertyId = ?' if (prop_id and prop_id != 'all') else ''}", p_params).fetchone()[0]
    lead_followup_count = conn.execute(f"SELECT COUNT(*) FROM leads WHERE status IN ('New', 'Contacted', 'Visit Scheduled') {'AND propertyId = ?' if (prop_id and prop_id != 'all') else ''}", p_params).fetchone()[0]

    conn.close()

    return jsonify({
        "totalProperties": total_properties,
        "totalBeds": total_beds,
        "occupiedBeds": occupied_beds,
        "vacantBeds": vacant_beds,
        "reservedBeds": reserved_beds,
        "maintenanceBeds": maintenance_beds,
        "occupancyRate": occupancy_rate,
        "rentCollected": rent_collected,
        "rentPending": rent_pending,
        "rentOverdue": rent_overdue,
        "monthExpenses": month_expenses,
        "totalExpenses": total_expenses,
        "netProfit": net_profit_month,
        "profitMargin": profit_margin,
        "monthlyTrends": monthly_trends,
        "expenseCategories": expense_categories,
        "propertyComparison": property_comparison,
        "alerts": {
            "overdueRent": rent_overdue,
            "pendingKyc": kyc_pending_count,
            "pendingComplaints": pending_complaints,
            "upcomingCheckouts": notice_count,
            "vacantBeds": vacant_beds,
            "leadsFollowup": lead_followup_count
        }
    })

# ----------------------------------------------------
# 11. SETTINGS & SYSTEM RESET
# ----------------------------------------------------
@app.route('/api/settings', methods=['GET'])
def get_settings():
    conn = get_db()
    setting = conn.execute('SELECT * FROM settings ORDER BY id DESC LIMIT 1').fetchone()
    conn.close()
    return jsonify(dict(setting) if setting else {})

@app.route('/api/settings', methods=['PUT'])
def update_settings():
    data = request.json or {}
    conn = get_db()
    conn.execute('''UPDATE settings SET 
        companyName = COALESCE(?, companyName),
        ownerName = COALESCE(?, ownerName),
        phone = COALESCE(?, phone),
        email = COALESCE(?, email),
        address = COALESCE(?, address),
        defaultRent = COALESCE(?, defaultRent),
        rentDueDate = COALESCE(?, rentDueDate),
        currency = COALESCE(?, currency),
        upiId = COALESCE(?, upiId),
        bankName = COALESCE(?, bankName),
        accountNumber = COALESCE(?, accountNumber),
        ifscCode = COALESCE(?, ifscCode)
        WHERE id = (SELECT id FROM settings ORDER BY id DESC LIMIT 1)''',
        (data.get('companyName'), data.get('ownerName'), data.get('phone'), data.get('email'),
         data.get('address'), data.get('defaultRent'), data.get('rentDueDate'), data.get('currency'),
         data.get('upiId'), data.get('bankName'), data.get('accountNumber'), data.get('ifscCode')))
    conn.commit()
    conn.close()
    return jsonify({"success": True})

@app.route('/api/settings/reset', methods=['POST'])
def reset_database():
    if os.environ.get('FLASK_ENV') == 'production':
        return jsonify({"success": False, "error": "Database reset is disabled in production environment"}), 403

    try:
        init_db(force_reseed=True)
        return jsonify({"success": True, "message": "Database reset to initial demo state"})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

# ----------------------------------------------------
# 12. USER MANAGEMENT (Multi-Admin)
# ----------------------------------------------------
@app.route('/api/users', methods=['GET'])
def get_users():
    _, role, _ = get_current_user()
    if role != 'Owner':
        return jsonify({'error': 'Only Owner can manage users'}), 403
    conn = get_db()
    users = conn.execute('SELECT id, name, email, phone, role, avatar, status FROM users').fetchall()
    result = []
    for u in users:
        user_dict = dict(u)
        props = conn.execute('SELECT propertyId, accessLevel FROM user_properties WHERE userId = ?', (u['id'],)).fetchall()
        user_dict['properties'] = [dict(p) for p in props]
        result.append(user_dict)
    conn.close()
    return jsonify(result)

@app.route('/api/users', methods=['POST'])
def create_user():
    _, role, _ = get_current_user()
    if role != 'Owner':
        return jsonify({'error': 'Only Owner can create users'}), 403
    
    data = request.json or {}
    if not data.get('name') or not data.get('email') or not data.get('password'):
        return jsonify({'error': 'Name, email, and password are required'}), 400

    from werkzeug.security import generate_password_hash
    conn = get_db()
    
    # Check if email already exists
    existing = conn.execute('SELECT id FROM users WHERE email = ?', (data['email'],)).fetchone()
    if existing:
        conn.close()
        return jsonify({'error': 'A user with this email already exists'}), 409

    user_id = str(uuid.uuid4())[:8]
    hashed = generate_password_hash(data['password'], method='pbkdf2:sha256')
    avatar = ''.join([w[0].upper() for w in data['name'].split()[:2]])
    
    conn.execute('INSERT INTO users VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        (user_id, data['name'], data['email'], hashed, data.get('phone', ''),
         data.get('role', 'Manager'), avatar, 'Active'))

    # Assign properties
    for prop_id in data.get('propertyIds', []):
        conn.execute('INSERT OR IGNORE INTO user_properties (userId, propertyId, accessLevel) VALUES (?, ?, ?)',
            (user_id, prop_id, data.get('accessLevel', 'full')))
    
    conn.commit()
    conn.close()
    return jsonify({'success': True, 'id': user_id})

@app.route('/api/users/<user_id>', methods=['PUT'])
def update_user(user_id):
    _, role, _ = get_current_user()
    if role != 'Owner':
        return jsonify({'error': 'Only Owner can update users'}), 403
    
    data = request.json or {}
    conn = get_db()
    
    conn.execute('''UPDATE users SET
        name = COALESCE(?, name),
        phone = COALESCE(?, phone),
        role = COALESCE(?, role),
        status = COALESCE(?, status)
        WHERE id = ?''',
        (data.get('name'), data.get('phone'), data.get('role'), data.get('status'), user_id))
    
    # Update password if provided
    if data.get('password'):
        from werkzeug.security import generate_password_hash
        hashed = generate_password_hash(data['password'], method='pbkdf2:sha256')
        conn.execute('UPDATE users SET password = ? WHERE id = ?', (hashed, user_id))

    # Update property access if provided
    if 'propertyIds' in data:
        conn.execute('DELETE FROM user_properties WHERE userId = ?', (user_id,))
        for prop_id in data['propertyIds']:
            conn.execute('INSERT INTO user_properties (userId, propertyId, accessLevel) VALUES (?, ?, ?)',
                (user_id, prop_id, data.get('accessLevel', 'full')))
    
    conn.commit()
    conn.close()
    return jsonify({'success': True})

@app.route('/api/users/<user_id>', methods=['DELETE'])
def delete_user(user_id):
    current_uid, role, _ = get_current_user()
    if role != 'Owner':
        return jsonify({'error': 'Only Owner can delete users'}), 403
    if user_id == current_uid:
        return jsonify({'error': 'Cannot delete your own account'}), 400
    
    conn = get_db()
    conn.execute('DELETE FROM user_properties WHERE userId = ?', (user_id,))
    conn.execute('DELETE FROM users WHERE id = ?', (user_id,))
    conn.commit()
    conn.close()
    return jsonify({'success': True})

@app.route('/api/me', methods=['GET'])
def get_me():
    user_id, role, prop_ids = get_current_user()
    conn = get_db()
    user = conn.execute('SELECT id, name, email, phone, role, avatar FROM users WHERE id = ?', (user_id,)).fetchone()
    if not user:
        conn.close()
        return jsonify({'error': 'User not found'}), 404
    
    if role == 'Owner':
        props = conn.execute('SELECT id, name FROM properties WHERE active = 1').fetchall()
    else:
        props = conn.execute('''SELECT p.id, p.name FROM properties p
            JOIN user_properties up ON p.id = up.propertyId
            WHERE up.userId = ? AND p.active = 1''', (user_id,)).fetchall()
    conn.close()
    
    return jsonify({
        **dict(user),
        'accessibleProperties': [dict(p) for p in props]
    })

if __name__ == '__main__':
    is_dev = os.environ.get('FLASK_ENV') != 'production'
    app.run(host='0.0.0.0', port=8000, debug=is_dev)
