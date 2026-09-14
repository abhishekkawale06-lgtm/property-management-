import sqlite3
import random
import os

DB_FILE = 'pg_manager.db'

def init_db():
    # If the database already exists, don't re-seed
    is_new = not os.path.exists(DB_FILE)
    
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    
    # Create tables
    cursor.execute('''CREATE TABLE IF NOT EXISTS properties (
        id TEXT PRIMARY KEY, name TEXT, address TEXT, rooms INTEGER, totalBeds INTEGER, active BOOLEAN
    )''')
    
    cursor.execute('''CREATE TABLE IF NOT EXISTS rooms (
        id TEXT PRIMARY KEY, propertyId TEXT, roomNumber TEXT, floor INTEGER, type TEXT, status TEXT
    )''')
    
    cursor.execute('''CREATE TABLE IF NOT EXISTS beds (
        id TEXT PRIMARY KEY, roomId TEXT, propertyId TEXT, name TEXT, status TEXT, residentId TEXT
    )''')
    
    cursor.execute('''CREATE TABLE IF NOT EXISTS residents (
        id TEXT PRIMARY KEY, name TEXT, phone TEXT, email TEXT, joiningDate TEXT, 
        monthlyRent INTEGER, deposit INTEGER, status TEXT, propertyId TEXT, roomId TEXT, bedId TEXT
    )''')
    
    cursor.execute('''CREATE TABLE IF NOT EXISTS payments (
        id TEXT PRIMARY KEY, residentId TEXT, propertyId TEXT, month TEXT, 
        amountExpected INTEGER, amountPaid INTEGER, dueDate TEXT, status TEXT
    )''')
    
    cursor.execute('''CREATE TABLE IF NOT EXISTS complaints (
        id TEXT PRIMARY KEY, residentId TEXT, roomId TEXT, propertyId TEXT, 
        category TEXT, description TEXT, date TEXT, priority TEXT, status TEXT
    )''')
    
    cursor.execute('''CREATE TABLE IF NOT EXISTS expenses (
        id TEXT PRIMARY KEY, date TEXT, category TEXT, description TEXT, amount INTEGER
    )''')
    
    cursor.execute('''CREATE TABLE IF NOT EXISTS settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT, companyName TEXT, ownerName TEXT, phone TEXT, 
        email TEXT, address TEXT, defaultRent INTEGER, rentDueDate INTEGER, currency TEXT
    )''')

    if is_new:
        print("Seeding database with mock data...")
        seed_data(cursor)
        conn.commit()
    
    conn.close()

def seed_data(cursor):
    # Seed Properties
    properties = [
        ('p1', 'Urban Stay PG - Yelahanka', 'Yelahanka, Bengaluru', 50, 150, True),
        ('p2', 'Green View PG - Hebbal', 'Hebbal, Bengaluru', 30, 90, True)
    ]
    cursor.executemany("INSERT INTO properties VALUES (?, ?, ?, ?, ?, ?)", properties)
    
    # Seed Complaints
    complaints = [
        ('c1', None, 'r_p1_101', 'p1', 'AC', 'AC not working', '2026-09-01', 'High', 'Pending'),
        ('c2', None, 'r_p1_204', 'p1', 'Plumbing', 'Water leakage', '2026-09-03', 'Medium', 'In Progress'),
        ('c3', None, 'r_p1_305', 'p1', 'Internet', 'Internet problem', '2026-09-05', 'Low', 'Resolved'),
        ('c4', None, 'r_p2_005', 'p2', 'Electricity', 'Socket burned', '2026-09-02', 'Medium', 'Pending')
    ]
    cursor.executemany("INSERT INTO complaints VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", complaints)
    
    # Seed Settings
    cursor.execute("INSERT INTO settings (companyName, ownerName, phone, email, address, defaultRent, rentDueDate, currency) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", 
                   ('Urban & Green PGs', 'Owner Manager', '+91 9876543210', 'admin@pgmanager.com', 'Bengaluru, Karnataka', 8000, 5, '₹'))
    
    # Names for random residents
    firstNames = ['Rahul', 'Amit', 'Karan', 'Arjun', 'Vivek', 'Suresh', 'Ramesh', 'Ravi', 'Vikram', 'Prakash', 'Sunil', 'Anil', 'Rajesh', 'Manish', 'Sanjay', 'Rohit', 'Vijay', 'Deepak']
    lastNames = ['Sharma', 'Kumar', 'Patel', 'Rao', 'Joshi', 'Singh', 'Gupta', 'Verma', 'Reddy', 'Nair', 'Menon', 'Yadav', 'Das', 'Sen', 'Bose']
    
    def generate_name():
        return f"{random.choice(firstNames)} {random.choice(lastNames)}"
    
    # Generate Rooms and Beds
    vacant_beds = []
    
    for prop in properties:
        p_id = prop[0]
        num_floors = 5 if p_id == 'p1' else 3
        rooms_per_floor = 10
        
        for floor in range(num_floors):
            for r in range(1, rooms_per_floor + 1):
                display_floor = 0 if floor == 0 else floor
                room_num_str = f"0{r:02d}" if floor == 0 else f"{floor}{r:02d}"
                room_id = f"r_{p_id}_{room_num_str}"
                is_maintenance = random.random() < 0.05
                
                status = 'Maintenance' if is_maintenance else 'Active'
                cursor.execute("INSERT INTO rooms VALUES (?, ?, ?, ?, ?, ?)", 
                               (room_id, p_id, room_num_str, display_floor, 'Triple Sharing', status))
                
                for bed_char in ['A', 'B', 'C']:
                    bed_id = f"b_{room_id}_{bed_char}"
                    b_status = 'Maintenance' if is_maintenance else 'Vacant'
                    cursor.execute("INSERT INTO beds VALUES (?, ?, ?, ?, ?, ?)", 
                                   (bed_id, room_id, p_id, f"Bed {bed_char}", b_status, None))
                    
                    if b_status == 'Vacant':
                        vacant_beds.append({'id': bed_id, 'roomId': room_id, 'propertyId': p_id})
                        
    # Generate Residents
    months = ['2026-04', '2026-05', '2026-06', '2026-07', '2026-08', '2026-09']
    
    for prop in properties:
        p_id = prop[0]
        p_vacant_beds = [b for b in vacant_beds if b['propertyId'] == p_id]
        target_occupancy = 132 if p_id == 'p1' else 74
        
        random.shuffle(p_vacant_beds)
        beds_to_occupy = p_vacant_beds[:target_occupancy]
        
        for i, bed in enumerate(beds_to_occupy):
            res_id = f"res_{p_id}_{i}"
            rent = 8000
            
            cursor.execute("INSERT INTO residents VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                           (res_id, generate_name(), f"98765{random.randint(10000, 99999)}", 
                            f"res{i}@example.com", '2026-01-10', rent, rent * 2, 'Active', p_id, bed['roomId'], bed['id']))
                            
            cursor.execute("UPDATE beds SET status = 'Occupied', residentId = ? WHERE id = ?", (res_id, bed['id']))
            
            # Generate Payments
            for month_str in months:
                is_current = month_str == '2026-09'
                status = 'Paid'
                amount_paid = rent
                
                if is_current:
                    rand = random.random()
                    if rand < 0.1:
                        status = 'Pending'
                        amount_paid = 0
                    elif rand < 0.15:
                        status = 'Partial'
                        amount_paid = int(rent / 2)
                elif random.random() < 0.02:
                    status = 'Overdue'
                    amount_paid = 0
                    
                pay_id = f"pay_{res_id}_{month_str.replace('-', '')}"
                cursor.execute("INSERT INTO payments VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                               (pay_id, res_id, p_id, month_str, rent, amount_paid, f"{month_str}-05", status))

    # Seed initial expenses
    expenses = [
        ('e1', '2026-09-10', 'Maintenance', 'Plumbing repair in Room 101', 1500),
        ('e2', '2026-09-08', 'Utilities', 'Electricity Bill - Aug', 12400),
        ('e3', '2026-09-05', 'Supplies', 'Cleaning supplies bulk order', 3200),
        ('e4', '2026-09-01', 'Internet', 'Broadband monthly renewal', 2999)
    ]
    cursor.executemany("INSERT INTO expenses VALUES (?, ?, ?, ?, ?)", expenses)

def get_db():
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    return conn

if __name__ == "__main__":
    init_db()
    print("Database initialized successfully.")
