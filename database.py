import sqlite3
import random
import os
import uuid
from datetime import datetime, timedelta

DB_FILE = 'pg_manager.db'

def init_db(force_reseed=False):
    is_new = not os.path.exists(DB_FILE) or force_reseed
    if force_reseed and os.path.exists(DB_FILE):
        try:
            os.remove(DB_FILE)
        except Exception:
            pass

    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute("PRAGMA foreign_keys = ON;")

    # 1. Users / Owner
    cursor.execute('''CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        phone TEXT,
        role TEXT DEFAULT 'Admin',
        avatar TEXT
    )''')

    # 2. Properties
    cursor.execute('''CREATE TABLE IF NOT EXISTS properties (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        address TEXT NOT NULL,
        city TEXT NOT NULL,
        pincode TEXT,
        propertyType TEXT,
        occupancyType TEXT,
        ownerName TEXT,
        ownerContact TEXT,
        ownerEmail TEXT,
        managerName TEXT,
        managerContact TEXT,
        floors INTEGER DEFAULT 1,
        rooms INTEGER DEFAULT 0,
        totalBeds INTEGER DEFAULT 0,
        checkInTime TEXT,
        checkOutTime TEXT,
        rentDueDay INTEGER,
        securityDeposit INTEGER DEFAULT 10000,
        noticePeriodDays INTEGER DEFAULT 30,
        rentStructure TEXT DEFAULT 'Monthly advance',
        rules TEXT,
        active BOOLEAN DEFAULT 1
    )''')

    # 3. Rooms
    cursor.execute('''CREATE TABLE IF NOT EXISTS rooms (
        id TEXT PRIMARY KEY,
        propertyId TEXT NOT NULL,
        roomNumber TEXT NOT NULL,
        floor INTEGER NOT NULL,
        type TEXT NOT NULL,
        rentPerBed INTEGER NOT NULL,
        totalBeds INTEGER NOT NULL,
        status TEXT DEFAULT 'Active',
        FOREIGN KEY (propertyId) REFERENCES properties(id) ON DELETE CASCADE
    )''')

    # 4. Beds
    cursor.execute('''CREATE TABLE IF NOT EXISTS beds (
        id TEXT PRIMARY KEY,
        roomId TEXT NOT NULL,
        propertyId TEXT NOT NULL,
        name TEXT NOT NULL,
        status TEXT DEFAULT 'Available', -- Available, Occupied, Reserved, Maintenance
        residentId TEXT,
        FOREIGN KEY (roomId) REFERENCES rooms(id) ON DELETE CASCADE,
        FOREIGN KEY (propertyId) REFERENCES properties(id) ON DELETE CASCADE
    )''')

    # 5. Residents
    cursor.execute('''CREATE TABLE IF NOT EXISTS residents (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        phone TEXT NOT NULL,
        email TEXT,
        gender TEXT,
        dob TEXT,
        emergencyContactName TEXT,
        emergencyContactPhone TEXT,
        currentAddress TEXT,
        propertyId TEXT NOT NULL,
        roomId TEXT NOT NULL,
        bedId TEXT NOT NULL,
        joiningDate TEXT NOT NULL,
        monthlyRent INTEGER NOT NULL,
        securityDeposit INTEGER NOT NULL,
        idProofType TEXT DEFAULT 'Aadhaar',
        idProofNumber TEXT,
        kycStatus TEXT DEFAULT 'Pending', -- Verified, Pending, Rejected
        status TEXT DEFAULT 'Active', -- Active, Notice Period, Checked Out
        FOREIGN KEY (propertyId) REFERENCES properties(id),
        FOREIGN KEY (roomId) REFERENCES rooms(id),
        FOREIGN KEY (bedId) REFERENCES beds(id)
    )''')

    # 6. Leads / Enquiries
    cursor.execute('''CREATE TABLE IF NOT EXISTS leads (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        phone TEXT NOT NULL,
        email TEXT,
        propertyId TEXT,
        preferredRoomType TEXT,
        budget INTEGER,
        moveInDate TEXT,
        source TEXT, -- Website, Referral, Walk-in, Social Media
        status TEXT DEFAULT 'New', -- New, Contacted, Visit Scheduled, Booked, Lost
        notes TEXT,
        followUpDate TEXT,
        createdDate TEXT NOT NULL,
        FOREIGN KEY (propertyId) REFERENCES properties(id)
    )''')

    # 7. Payments & Rent Records
    cursor.execute('''CREATE TABLE IF NOT EXISTS payments (
        id TEXT PRIMARY KEY,
        residentId TEXT NOT NULL,
        propertyId TEXT NOT NULL,
        month TEXT NOT NULL, -- e.g. 2026-09
        amountExpected INTEGER NOT NULL,
        amountPaid INTEGER NOT NULL,
        dueDate TEXT NOT NULL,
        paidDate TEXT,
        paymentMode TEXT, -- UPI, Cash, Bank Transfer, Card
        referenceNumber TEXT,
        receiptNumber TEXT,
        status TEXT DEFAULT 'Pending', -- Paid, Pending, Partial, Overdue
        notes TEXT,
        FOREIGN KEY (residentId) REFERENCES residents(id) ON DELETE CASCADE,
        FOREIGN KEY (propertyId) REFERENCES properties(id)
    )''')

    # 8. Complaints & Maintenance
    cursor.execute('''CREATE TABLE IF NOT EXISTS complaints (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        residentId TEXT,
        propertyId TEXT NOT NULL,
        roomId TEXT,
        bedId TEXT,
        category TEXT NOT NULL, -- Electricity, Water, Wi-Fi, Cleaning, Plumbing, Maintenance, Food, Other
        description TEXT,
        priority TEXT DEFAULT 'Medium', -- Low, Medium, High
        assignedStaffId TEXT,
        status TEXT DEFAULT 'Pending', -- Pending, Assigned, In Progress, Resolved
        createdDate TEXT NOT NULL,
        resolutionNotes TEXT,
        resolvedDate TEXT,
        FOREIGN KEY (residentId) REFERENCES residents(id),
        FOREIGN KEY (propertyId) REFERENCES properties(id)
    )''')

    # 9. Expenses
    cursor.execute('''CREATE TABLE IF NOT EXISTS expenses (
        id TEXT PRIMARY KEY,
        propertyId TEXT NOT NULL,
        date TEXT NOT NULL,
        category TEXT NOT NULL, -- Maintenance, Utilities, Supplies, Internet, Staff Salary, Rent/Lease, Food, Misc
        description TEXT,
        amount INTEGER NOT NULL,
        paymentMethod TEXT DEFAULT 'Bank Transfer',
        FOREIGN KEY (propertyId) REFERENCES properties(id)
    )''')

    # 10. Staff
    cursor.execute('''CREATE TABLE IF NOT EXISTS staff (
        id TEXT PRIMARY KEY,
        propertyId TEXT,
        name TEXT NOT NULL,
        role TEXT NOT NULL, -- Warden, Cleaning, Electrician, Plumber, Security, Cook
        phone TEXT NOT NULL,
        salary INTEGER,
        status TEXT DEFAULT 'Active'
    )''')

    # 11. Notices
    cursor.execute('''CREATE TABLE IF NOT EXISTS notices (
        id TEXT PRIMARY KEY,
        propertyId TEXT, -- NULL for All Properties
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        targetResidents TEXT DEFAULT 'All', -- All, Floor 1, etc.
        priority TEXT DEFAULT 'Normal', -- Low, Normal, High, Urgent
        date TEXT NOT NULL
    )''')

    # 12. Checkouts
    cursor.execute('''CREATE TABLE IF NOT EXISTS checkouts (
        id TEXT PRIMARY KEY,
        residentId TEXT NOT NULL,
        propertyId TEXT NOT NULL,
        roomId TEXT NOT NULL,
        bedId TEXT NOT NULL,
        noticeDate TEXT NOT NULL,
        checkoutDate TEXT NOT NULL,
        pendingDues INTEGER DEFAULT 0,
        otherDues INTEGER DEFAULT 0,
        damageDeduction INTEGER DEFAULT 0,
        depositAmount INTEGER NOT NULL,
        depositRefunded INTEGER NOT NULL,
        finalSettlement INTEGER NOT NULL,
        status TEXT DEFAULT 'Completed',
        remarks TEXT,
        FOREIGN KEY (residentId) REFERENCES residents(id),
        FOREIGN KEY (propertyId) REFERENCES properties(id)
    )''')

    # 13. Notifications
    cursor.execute('''CREATE TABLE IF NOT EXISTS notifications (
        id TEXT PRIMARY KEY,
        propertyId TEXT,
        title TEXT NOT NULL,
        desc TEXT NOT NULL,
        type TEXT DEFAULT 'info', -- info, success, warning, danger
        icon TEXT DEFAULT 'bell',
        time TEXT NOT NULL,
        link TEXT
    )''')

    # 14. Settings / Business Configuration
    cursor.execute('''CREATE TABLE IF NOT EXISTS settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        companyName TEXT,
        ownerName TEXT,
        phone TEXT,
        email TEXT,
        address TEXT,
        defaultRent INTEGER,
        rentDueDate INTEGER,
        currency TEXT,
        upiId TEXT,
        bankName TEXT,
        accountNumber TEXT,
        ifscCode TEXT
    )''')

    # Check if empty, then seed
    cursor.execute("SELECT COUNT(*) FROM properties")
    count = cursor.fetchone()[0]
    if count == 0:
        seed_complete_data(cursor)
        conn.commit()

    conn.close()

def seed_complete_data(cursor):
    # 1. Admin User & Settings
    cursor.execute("INSERT INTO users VALUES (?, ?, ?, ?, ?, ?)",
                   ('u1', 'Owner Manager', 'admin@pgmanager.com', '+91 9876543210', 'Admin', 'OM'))
    
    cursor.execute('''INSERT INTO settings 
        (companyName, ownerName, phone, email, address, defaultRent, rentDueDate, currency, upiId, bankName, accountNumber, ifscCode)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)''',
        ('Urban Stays & Co.', 'Owner Manager', '+91 9876543210', 'admin@pgmanager.com', 
         'Koramangala, Bengaluru, Karnataka', 8500, 5, '₹', 'urbanstays@upi', 'HDFC Bank', '50100234567890', 'HDFC0001234'))

    # 2. Properties
    properties = [
        ('p1', 'Urban Stay PG - Yelahanka', 'No. 42, 4th Cross, Judicial Layout, Yelahanka', 'Bengaluru', 4, 16, 44, 16000, 30, 'Monthly Advance', 'No smoking, Gates close at 11 PM', 1),
        ('p2', 'Green View PG - Hebbal', 'Plot 18, Kempapura Main Rd, Hebbal', 'Bengaluru', 3, 12, 30, 15000, 30, 'Monthly Advance', 'Visitors allowed till 8 PM', 1),
        ('p3', 'Silicon Oasis PG - HSR Layout', 'Sector 2, 27th Main Rd, HSR Layout', 'Bengaluru', 3, 10, 24, 18000, 30, 'Monthly Advance', 'High-speed fiber included', 1)
    ]
    cursor.executemany("INSERT INTO properties VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", properties)

    # 3. Staff members
    staff_data = [
        ('st1', 'p1', 'Ramesh Gowda', 'Warden', '+91 9845112233', 25000, 'Active'),
        ('st2', 'p1', 'Manjunath K', 'Electrician', '+91 9845223344', 18000, 'Active'),
        ('st3', 'p1', 'Lakshmi Bai', 'Cleaning', '+91 9845334455', 14000, 'Active'),
        ('st4', 'p2', 'Anil Deshmukh', 'Warden', '+91 9731112233', 24000, 'Active'),
        ('st5', 'p2', 'Sunita Devi', 'Cleaning', '+91 9731223344', 14000, 'Active'),
        ('st6', 'p3', 'Venkatesh R', 'Warden', '+91 9620112233', 26000, 'Active')
    ]
    cursor.executemany("INSERT INTO staff VALUES (?, ?, ?, ?, ?, ?, ?)", staff_data)

    # 4. Generate Rooms & Beds
    # Structure:
    # p1: 4 floors, 4 rooms per floor = 16 rooms
    # p2: 3 floors, 4 rooms per floor = 12 rooms
    # p3: 3 floors, 3-4 rooms per floor = 10 rooms
    vacant_bed_pool = []
    
    for prop in properties:
        p_id = prop[0]
        floors = prop[4]
        rooms_count = prop[5]
        rooms_per_floor = max(1, rooms_count // floors)

        room_idx = 1
        for floor in range(1, floors + 1):
            for r in range(1, rooms_per_floor + 1):
                if room_idx > rooms_count:
                    break
                room_num = f"{floor}{r:02d}"
                room_id = f"r_{p_id}_{room_num}"

                # Room types distribution
                if r == 1:
                    room_type = 'Single Sharing'
                    bed_chars = ['A']
                    rent_per_bed = 14000
                elif r == 2:
                    room_type = 'Double Sharing'
                    bed_chars = ['A', 'B']
                    rent_per_bed = 9500
                else:
                    room_type = 'Triple Sharing'
                    bed_chars = ['A', 'B', 'C']
                    rent_per_bed = 7500

                total_beds_room = len(bed_chars)
                room_status = 'Active'

                cursor.execute("INSERT INTO rooms VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                               (room_id, p_id, room_num, floor, room_type, rent_per_bed, total_beds_room, room_status))

                for char in bed_chars:
                    bed_id = f"b_{room_id}_{char}"
                    # 1 out of 30 beds in maintenance
                    is_maint = (room_idx == 3 and char == 'B')
                    bed_status = 'Maintenance' if is_maint else 'Available'
                    
                    cursor.execute("INSERT INTO beds VALUES (?, ?, ?, ?, ?, ?)",
                                   (bed_id, room_id, p_id, f"Bed {char}", bed_status, None))
                    
                    if bed_status == 'Available':
                        vacant_bed_pool.append({
                            'id': bed_id, 'roomId': room_id, 'propertyId': p_id, 
                            'roomNumber': room_num, 'rent': rent_per_bed
                        })
                room_idx += 1

    # 5. Populate Residents (~75% Occupancy)
    firstNames = ['Aarav', 'Vivaan', 'Aditya', 'Vihaan', 'Arjun', 'Sai', 'Reyansh', 'Ayaan', 'Krishna', 'Ishaan', 
                  'Ananya', 'Diya', 'Isha', 'Aadhya', 'Saanvi', 'Myra', 'Kavya', 'Priya', 'Tanvi', 'Anushka',
                  'Rahul', 'Rohit', 'Karthik', 'Siddharth', 'Nikhil', 'Manish', 'Harish', 'Gaurav', 'Deepak', 'Sanjay']
    lastNames = ['Sharma', 'Verma', 'Gupta', 'Patel', 'Reddy', 'Kumar', 'Singh', 'Nair', 'Rao', 'Joshi',
                 'Iyer', 'Menon', 'Kulkarni', 'Deshmukh', 'Chatterjee', 'Bose', 'Pillai', 'Hegde', 'Shetty', 'Bhat']

    months = ['2026-06', '2026-07', '2026-08', '2026-09']
    
    random.seed(42)
    random.shuffle(vacant_bed_pool)

    # Let's occupy ~70 beds
    beds_to_occupy = vacant_bed_pool[:68]

    for idx, bed_info in enumerate(beds_to_occupy):
        res_id = f"res_{idx+1:03d}"
        fname = random.choice(firstNames)
        lname = random.choice(lastNames)
        name = f"{fname} {lname}"
        phone = f"+91 98{random.randint(10000000, 99999999)}"
        email = f"{fname.lower()}.{lname.lower()}{random.randint(10,99)}@gmail.com"
        gender = 'Male' if fname in firstNames[:10] + firstNames[20:] else 'Female'
        dob = f"199{random.randint(4,9)}-{random.randint(1,12):02d}-{random.randint(1,28):02d}"
        emergency_name = f"{random.choice(firstNames)} {lname}"
        emergency_phone = f"+91 97{random.randint(10000000, 99999999)}"
        address = f"H.No {random.randint(10, 400)}, Sector {random.randint(1, 15)}, Pune, Maharashtra"
        
        joining_date = f"2026-0{random.randint(1, 6):01d}-{random.randint(1, 28):02d}"
        monthly_rent = bed_info['rent']
        security_deposit = monthly_rent * 2

        # KYC Status: mostly Verified, some Pending, 1-2 Rejected
        rand_kyc = random.random()
        kyc_status = 'Verified' if rand_kyc > 0.15 else ('Pending' if rand_kyc > 0.05 else 'Rejected')
        id_number = f"{random.randint(2000, 9999)} {random.randint(1000, 9999)} {random.randint(1000, 9999)}"

        # Status: mostly Active, a couple on Notice Period
        status = 'Notice Period' if idx in [4, 18, 32] else 'Active'

        cursor.execute('''INSERT INTO residents VALUES 
            (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)''',
            (res_id, name, phone, email, gender, dob, emergency_name, emergency_phone, address,
             bed_info['propertyId'], bed_info['roomId'], bed_info['id'], joining_date,
             monthly_rent, security_deposit, 'Aadhaar', id_number, kyc_status, status))

        cursor.execute("UPDATE beds SET status = 'Occupied', residentId = ? WHERE id = ?", (res_id, bed_info['id']))

        # Generate Payments for months
        for m_idx, m_str in enumerate(months):
            is_current = (m_str == '2026-09')
            pay_id = f"pay_{res_id}_{m_str.replace('-', '')}"
            due_date = f"{m_str}-05"
            receipt_no = f"REC-{m_str.replace('-', '')}-{idx+1:03d}"

            if not is_current:
                # Past months are Paid
                cursor.execute('''INSERT INTO payments VALUES 
                    (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)''',
                    (pay_id, res_id, bed_info['propertyId'], m_str, monthly_rent, monthly_rent,
                     due_date, f"{m_str}-03", random.choice(['UPI', 'UPI', 'Bank Transfer', 'Cash']),
                     f"UPI{random.randint(1000000000, 9999999999)}", receipt_no, 'Paid', 'Rent paid in full'))
            else:
                # Current month: Some Paid, Some Pending, Some Partial, Some Overdue
                r_val = random.random()
                if r_val < 0.65:
                    p_status = 'Paid'
                    p_paid = monthly_rent
                    p_date = '2026-09-04'
                    p_mode = random.choice(['UPI', 'UPI', 'Bank Transfer', 'Cash'])
                    p_ref = f"UPI{random.randint(1000000000, 9999999999)}"
                elif r_val < 0.80:
                    p_status = 'Partial'
                    p_paid = monthly_rent // 2
                    p_date = '2026-09-06'
                    p_mode = 'UPI'
                    p_ref = f"UPI{random.randint(1000000000, 9999999999)}"
                elif r_val < 0.92:
                    p_status = 'Pending'
                    p_paid = 0
                    p_date = None
                    p_mode = None
                    p_ref = None
                else:
                    p_status = 'Overdue'
                    p_paid = 0
                    p_date = None
                    p_mode = None
                    p_ref = None

                cursor.execute('''INSERT INTO payments VALUES 
                    (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)''',
                    (pay_id, res_id, bed_info['propertyId'], m_str, monthly_rent, p_paid,
                     due_date, p_date, p_mode, p_ref, receipt_no if p_paid > 0 else None, p_status, 'Monthly rent'))

    # Mark a couple of remaining beds as Reserved
    remaining_beds = [b for b in vacant_bed_pool[68:]]
    if len(remaining_beds) >= 2:
        cursor.execute("UPDATE beds SET status = 'Reserved' WHERE id IN (?, ?)", (remaining_beds[0]['id'], remaining_beds[1]['id']))

    # 6. Leads / Enquiries (Diverse statuses & sources)
    leads_data = [
        ('lead_001', 'Abhinav Saxena', '+91 9819234567', 'abhinav.s@gmail.com', 'p1', 'Double Sharing', 9500, '2026-09-20', 'Website', 'New', 'Looking for AC room near Manyata tech park', '2026-09-15', '2026-09-12'),
        ('lead_002', 'Prateek Jain', '+91 9723456789', 'prateek.j@outlook.com', 'p1', 'Single Sharing', 14000, '2026-09-25', 'Walk-in', 'Visit Scheduled', 'Physical room visit booked for Saturday 11 AM', '2026-09-16', '2026-09-11'),
        ('lead_003', 'Meghna Roy', '+91 9934567890', 'meghna.roy@yahoo.com', 'p2', 'Double Sharing', 9000, '2026-10-01', 'Referral', 'Contacted', 'Friend of resident Karan Sharma. Followed up on WhatsApp', '2026-09-17', '2026-09-10'),
        ('lead_004', 'Tanmay Joshi', '+91 9845678901', 'tanmay.j@gmail.com', 'p3', 'Triple Sharing', 7500, '2026-09-18', 'Social Media', 'Booked', 'Token advance paid ₹2,000. Ready to onboard.', '2026-09-14', '2026-09-08'),
        ('lead_005', 'Nandini Das', '+91 9656789012', 'nandini.d@gmail.com', 'p2', 'Single Sharing', 12000, '2026-09-15', 'Website', 'Lost', 'Found accommodation closer to Bellandur office', None, '2026-09-05'),
        ('lead_006', 'Devendra Murthy', '+91 9878901234', 'dev.m@gmail.com', 'p1', 'Double Sharing', 9500, '2026-10-05', 'Walk-in', 'New', 'Needs parking space for 2-wheeler', '2026-09-18', '2026-09-14')
    ]
    cursor.executemany("INSERT INTO leads VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", leads_data)

    # 7. Complaints
    complaints_data = [
        ('c_001', 'Water geyser trip in bathroom', 'res_001', 'p1', 'r_p1_101', 'b_r_p1_101_A', 'Electricity', 'Geyser trips the MCB whenever switched on.', 'High', 'st2', 'In Progress', '2026-09-12', 'Electrician inspected MCB, replacing heating element today.', None),
        ('c_002', 'High-speed Wi-Fi router rebooting', 'res_005', 'p1', 'r_p1_103', 'b_r_p1_103_A', 'Wi-Fi', 'Internet disconnects every 15 minutes on 2nd floor.', 'Medium', 'st1', 'Pending', '2026-09-13', None, None),
        ('c_003', 'Washroom tap leakage', 'res_012', 'p2', 'r_p2_102', 'b_r_p2_102_B', 'Plumbing', 'Continuous drip from washbasin tap creating noise.', 'Low', 'st4', 'Resolved', '2026-09-08', 'Washer replaced by plumber Ramesh on 9th Sep.', '2026-09-09'),
        ('c_004', 'Daily room deep cleaning needed', 'res_022', 'p2', 'r_p2_201', 'b_r_p2_201_A', 'Cleaning', 'Need dusting and mop under the study desks.', 'Low', 'st5', 'Assigned', '2026-09-14', 'Assigned to Sunita for afternoon cleaning slot.', None),
        ('c_005', 'Dinner quality and timing feedback', 'res_034', 'p3', 'r_p3_101', 'b_r_p3_101_A', 'Food', 'Dinner was served cold last night after 9:30 PM.', 'Medium', 'st6', 'Resolved', '2026-09-10', 'Cook briefed to keep warmer trays active till 10:30 PM.', '2026-09-11'),
        ('c_006', 'Main door latch loose', 'res_018', 'p1', 'r_p1_202', 'b_r_p1_202_B', 'Maintenance', 'Door lock cylinder feels loose when locking.', 'High', 'st1', 'Pending', '2026-09-14', None, None)
    ]
    cursor.executemany("INSERT INTO complaints VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", complaints_data)

    # 8. Operational Expenses
    expenses_data = [
        ('exp_001', 'p1', '2026-09-11', 'Utilities', 'BESCOM Electricity Bill for August', 18450, 'Bank Transfer'),
        ('exp_002', 'p1', '2026-09-09', 'Internet', 'Airtel Enterprise Fiber 300Mbps renewal', 3499, 'UPI'),
        ('exp_003', 'p1', '2026-09-05', 'Staff Salary', 'Monthly salary for Warden Ramesh & Cleaner Lakshmi', 39000, 'Bank Transfer'),
        ('exp_004', 'p1', '2026-09-03', 'Supplies', 'Bulk cleaning chemicals, mop refills, garbage bags', 4200, 'UPI'),
        ('exp_005', 'p2', '2026-09-10', 'Utilities', 'BWSSB Water tankers (3 loads)', 4800, 'UPI'),
        ('exp_006', 'p2', '2026-09-06', 'Maintenance', 'Submersible pump motor servicing and capacitor change', 3800, 'Cash'),
        ('exp_007', 'p2', '2026-09-05', 'Staff Salary', 'Warden Anil & Cleaner Sunita salary', 38000, 'Bank Transfer'),
        ('exp_008', 'p3', '2026-09-12', 'Food', 'Groceries & provisions weekly supply', 14200, 'UPI'),
        ('exp_009', 'p3', '2026-09-04', 'Utilities', 'Electricity bill Sept advance', 11500, 'Bank Transfer')
    ]
    cursor.executemany("INSERT INTO expenses VALUES (?, ?, ?, ?, ?, ?, ?)", expenses_data)

    # 9. Property Notices
    notices_data = [
        ('not_001', None, 'Pest Control Drive Scheduled', 'Bi-monthly pest control will be carried out this Sunday (Sept 20) between 10 AM and 2 PM across all rooms. Please keep belongings packed.', 'All', 'High', '2026-09-13'),
        ('not_002', 'p1', 'Lift Maintenance Notice', 'Passenger lift in Block A will undergo routine overhaul on Wednesday from 2 PM to 5 PM. Please use stairs.', 'All', 'Normal', '2026-09-12'),
        ('not_003', 'p2', 'DG Backup Testing', 'Diesel Generator routine load test on Saturday 11 AM for 15 minutes. Wi-Fi has UPS backup.', 'All', 'Low', '2026-09-10')
    ]
    cursor.executemany("INSERT INTO notices VALUES (?, ?, ?, ?, ?, ?, ?)", notices_data)

    # 10. Sample Past Checkout
    past_checkout = [
        ('chk_001', 'res_048', 'p1', 'r_p1_204', 'b_r_p1_204_C', '2026-08-01', '2026-08-31', 0, 0, 1000, 15000, 14000, 14000, 'Completed', 'Keys returned in good order, ₹1,000 deducted for lost key & touchup.')
    ]
    cursor.executemany("INSERT INTO checkouts VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", past_checkout)

    # 11. Initial Notifications
    notifications_data = [
        ('nt_001', 'p1', 'Rent Overdue (4 Residents)', '4 residents have unpaid September rent overdue past the 5th.', 'danger', 'alert-circle', '1 hour ago', 'collections'),
        ('nt_002', 'p1', 'Pending KYC Verification', '6 newly onboarded residents have pending ID verification.', 'warning', 'shield-alert', '3 hours ago', 'residents'),
        ('nt_003', 'p1', 'High Priority Complaint', 'Water geyser trip in Room 101 needs immediate electrician closure.', 'danger', 'wrench', '5 hours ago', 'complaints'),
        ('nt_004', 'p3', 'New Lead Requires Follow-up', 'Lead Abhinav Saxena scheduled for visit review.', 'info', 'user-plus', 'Yesterday', 'leads'),
        ('nt_005', 'p1', 'Upcoming Checkout Notice', 'Resident Karthik Sharma on notice period till Sept 30.', 'warning', 'log-out', '2 days ago', 'residents')
    ]
    cursor.executemany("INSERT INTO notifications VALUES (?, ?, ?, ?, ?, ?, ?, ?)", notifications_data)

def get_db():
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn

if __name__ == "__main__":
    init_db(force_reseed=True)
    print("PG Manager database initialized and seeded successfully!")
