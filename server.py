from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from database import get_db
import os
import uuid

app = Flask(__name__, static_folder='.')
CORS(app)

@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

@app.route('/<path:path>')
def static_files(path):
    if os.path.exists(path):
        return send_from_directory('.', path)
    return "Not Found", 404

@app.route('/api/properties', methods=['GET'])
def get_properties():
    conn = get_db()
    props = conn.execute('SELECT * FROM properties').fetchall()
    return jsonify([dict(p) for p in props])

# Helper function to get full room details exactly as the frontend expects
def get_room_details(conn, room_id):
    room = conn.execute('SELECT * FROM rooms WHERE id = ?', (room_id,)).fetchone()
    if not room: return None
    room_dict = dict(room)
    
    prop = conn.execute('SELECT * FROM properties WHERE id = ?', (room_dict['propertyId'],)).fetchone()
    room_dict['property'] = dict(prop) if prop else None
    
    beds = conn.execute('SELECT * FROM beds WHERE roomId = ?', (room_id,)).fetchall()
    enriched_beds = []
    
    for b in beds:
        bed_dict = dict(b)
        resident = None
        current_payment = None
        
        if bed_dict['status'] == 'Occupied' and bed_dict['residentId']:
            res = conn.execute('SELECT * FROM residents WHERE id = ?', (bed_dict['residentId'],)).fetchone()
            if res:
                resident = dict(res)
                pay = conn.execute('SELECT * FROM payments WHERE residentId = ? AND month = ?', (resident['id'], '2026-09')).fetchone()
                if pay: current_payment = dict(pay)
        
        bed_dict['resident'] = resident
        bed_dict['currentPayment'] = current_payment
        enriched_beds.append(bed_dict)
        
    room_dict['beds'] = enriched_beds
    
    total_beds = len(enriched_beds)
    occupied_count = sum(1 for b in enriched_beds if b['status'] == 'Occupied')
    
    derived_status = 'Vacant'
    if room_dict['status'] == 'Maintenance' or any(b['status'] == 'Maintenance' for b in enriched_beds):
        derived_status = 'Maintenance'
    elif occupied_count == total_beds:
        derived_status = 'Fully Occupied'
    elif occupied_count > 0:
        derived_status = 'Partially Occupied'
        
    room_dict['derivedStatus'] = derived_status
    room_dict['occupiedCount'] = occupied_count
    room_dict['totalBeds'] = total_beds
    
    return room_dict

@app.route('/api/rooms', methods=['GET'])
def get_rooms():
    conn = get_db()
    raw_rooms = conn.execute('SELECT * FROM rooms').fetchall()
    rooms = [get_room_details(conn, r['id']) for r in raw_rooms]
    return jsonify(rooms)

@app.route('/api/beds', methods=['GET'])
def get_beds():
    conn = get_db()
    beds = conn.execute('SELECT * FROM beds').fetchall()
    return jsonify([dict(b) for b in beds])

@app.route('/api/residents', methods=['GET'])
def get_residents():
    conn = get_db()
    res = conn.execute('SELECT * FROM residents').fetchall()
    return jsonify([dict(r) for r in res])

@app.route('/api/payments', methods=['GET'])
def get_payments():
    conn = get_db()
    pays = conn.execute('SELECT * FROM payments').fetchall()
    return jsonify([dict(p) for p in pays])

@app.route('/api/complaints', methods=['GET'])
def get_complaints():
    conn = get_db()
    comps = conn.execute('SELECT * FROM complaints').fetchall()
    return jsonify([dict(c) for c in comps])

@app.route('/api/expenses', methods=['GET'])
def get_expenses():
    conn = get_db()
    exps = conn.execute('SELECT * FROM expenses ORDER BY date DESC').fetchall()
    return jsonify([dict(e) for e in exps])

@app.route('/api/expenses', methods=['POST'])
def add_expense():
    data = request.json
    conn = get_db()
    e_id = f"e_{uuid.uuid4().hex[:8]}"
    conn.execute('INSERT INTO expenses (id, date, category, description, amount) VALUES (?, ?, ?, ?, ?)',
                 (e_id, data['date'], data['category'], data['description'], data['amount']))
    conn.commit()
    return jsonify({"success": True, "id": e_id})

@app.route('/api/settings', methods=['GET'])
def get_settings():
    conn = get_db()
    setting = conn.execute('SELECT * FROM settings ORDER BY id DESC LIMIT 1').fetchone()
    if setting:
        return jsonify(dict(setting))
    return jsonify({})

@app.route('/api/settings', methods=['PUT'])
def update_settings():
    data = request.json
    conn = get_db()
    conn.execute('''
        UPDATE settings SET 
        ownerName = ?, email = ?, phone = ?
        WHERE id = (SELECT id FROM settings ORDER BY id DESC LIMIT 1)
    ''', (data.get('ownerName'), data.get('email'), data.get('phone')))
    conn.commit()
    return jsonify({"success": True})

@app.route('/api/settings/reset', methods=['POST'])
def reset_app():
    import database
    import os
    conn = get_db()
    conn.close()
    
    # We must properly close the DB connection before trying to delete the file
    # This might require making sure no other threads have the DB open, 
    # but for local dev this is fine.
    try:
        if os.path.exists('pg_manager.db'):
            os.remove('pg_manager.db')
        database.init_db()
    except Exception as e:
        print("Reset error:", e)
        return jsonify({"success": False, "error": str(e)}), 500
        
    return jsonify({"success": True})

@app.route('/api/notifications', methods=['GET'])
def get_notifications():
    conn = get_db()
    notifications = []
    
    # Check for overdue payments
    overdue = conn.execute("SELECT p.*, r.name as residentName, r.roomId FROM payments p JOIN residents r ON p.residentId = r.id WHERE p.status = 'Overdue'").fetchall()
    for o in overdue:
        notifications.append({
            "title": "Rent Overdue",
            "desc": f"Rent for {o['residentName']} (Room {o['roomId']}) is overdue.",
            "time": "Recent",
            "type": "danger",
            "icon": "alert-circle"
        })
        
    # Check for vacant beds
    vacant = conn.execute("SELECT * FROM beds WHERE status = 'Vacant'").fetchall()
    for v in vacant:
        notifications.append({
            "title": "Bed Vacant",
            "desc": f"{v['name']} in Room {v['roomId']} is now vacant.",
            "time": "Recent",
            "type": "info",
            "icon": "bed"
        })
        
    return jsonify(notifications)

@app.route('/api/properties', methods=['POST'])
def add_property():
    data = request.json
    conn = get_db()
    p_id = f"p_{uuid.uuid4().hex[:6]}"
    conn.execute('INSERT INTO properties (id, name, address, rooms, totalBeds, active) VALUES (?, ?, ?, ?, ?, ?)',
                 (p_id, data['name'], data['address'], data['rooms'], data['totalBeds'], True))
    conn.commit()
    return jsonify({"success": True, "id": p_id})

if __name__ == '__main__':
    import database
    database.init_db()
    app.run(host='0.0.0.0', port=8000, debug=True)
