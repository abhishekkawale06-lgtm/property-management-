import psycopg2
import os
import uuid
import secrets
from datetime import datetime, timedelta
from werkzeug.security import generate_password_hash
from dotenv import load_dotenv

load_dotenv()

def init_pg(force_reseed=False):
    db_url = os.environ.get('SUPABASE_DB_URL')
    if not db_url:
        print("SUPABASE_DB_URL is not set!")
        return

    conn = psycopg2.connect(db_url)
    cursor = conn.cursor()

    if force_reseed:
        cursor.execute("DROP TABLE IF EXISTS notifications CASCADE;")
        cursor.execute("DROP TABLE IF EXISTS expenses CASCADE;")
        cursor.execute("DROP TABLE IF EXISTS payments CASCADE;")
        cursor.execute("DROP TABLE IF EXISTS residents CASCADE;")
        cursor.execute("DROP TABLE IF EXISTS rooms CASCADE;")
        cursor.execute("DROP TABLE IF EXISTS user_properties CASCADE;")
        cursor.execute("DROP TABLE IF EXISTS properties CASCADE;")
        cursor.execute("DROP TABLE IF EXISTS users CASCADE;")

    # 1. Users
    cursor.execute('''CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        phone TEXT,
        role TEXT DEFAULT 'Admin',
        avatar TEXT,
        status TEXT DEFAULT 'Active'
    )''')

    # 2. Properties
    cursor.execute('''CREATE TABLE IF NOT EXISTS properties (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        address TEXT NOT NULL,
        totalRooms INTEGER NOT NULL,
        occupiedRooms INTEGER DEFAULT 0,
        manager TEXT,
        active INTEGER DEFAULT 1
    )''')

    # 1b. User-Property Access Map
    cursor.execute('''CREATE TABLE IF NOT EXISTS user_properties (
        id SERIAL PRIMARY KEY,
        userid TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        propertyid TEXT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
        accesslevel TEXT DEFAULT 'full',
        UNIQUE(userid, propertyid)
    )''')

    # 3. Rooms
    cursor.execute('''CREATE TABLE IF NOT EXISTS rooms (
        id TEXT PRIMARY KEY,
        propertyId TEXT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
        roomNumber TEXT NOT NULL,
        floor INTEGER NOT NULL,
        type TEXT NOT NULL,
        capacity INTEGER NOT NULL,
        occupied INTEGER DEFAULT 0,
        price INTEGER NOT NULL,
        amenities TEXT,
        status TEXT DEFAULT 'Available'
    )''')

    # 4. Residents
    cursor.execute('''CREATE TABLE IF NOT EXISTS residents (
        id TEXT PRIMARY KEY,
        propertyId TEXT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
        roomId TEXT NOT NULL REFERENCES rooms(id),
        name TEXT NOT NULL,
        phone TEXT NOT NULL,
        email TEXT,
        joinDate TEXT NOT NULL,
        rentAmount INTEGER NOT NULL,
        securityDeposit INTEGER NOT NULL,
        status TEXT DEFAULT 'Active',
        aadhaar TEXT,
        pan TEXT,
        emergencyContact TEXT,
        documents TEXT
    )''')

    # 5. Payments
    cursor.execute('''CREATE TABLE IF NOT EXISTS payments (
        id TEXT PRIMARY KEY,
        propertyId TEXT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
        residentId TEXT NOT NULL REFERENCES residents(id),
        amount INTEGER NOT NULL,
        date TEXT NOT NULL,
        type TEXT NOT NULL,
        status TEXT NOT NULL,
        reference TEXT,
        month TEXT
    )''')

    # 6. Expenses
    cursor.execute('''CREATE TABLE IF NOT EXISTS expenses (
        id TEXT PRIMARY KEY,
        propertyId TEXT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
        category TEXT NOT NULL,
        amount INTEGER NOT NULL,
        date TEXT NOT NULL,
        description TEXT,
        recordedBy TEXT
    )''')

    # 7. Notifications
    cursor.execute('''CREATE TABLE IF NOT EXISTS notifications (
        id TEXT PRIMARY KEY,
        propertyId TEXT REFERENCES properties(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        type TEXT NOT NULL,
        icon TEXT,
        time TEXT,
        link TEXT
    )''')

    # Check if empty
    cursor.execute("SELECT COUNT(*) FROM users")
    count = cursor.fetchone()[0]

    if count == 0:
        # Seed users
        admin_pw = os.environ.get('ADMIN_PASSWORD', 'admin123')
        hashed_owner = generate_password_hash(admin_pw, method='pbkdf2:sha256')
        hashed_mgr = generate_password_hash('manager123', method='pbkdf2:sha256')

        cursor.execute("INSERT INTO users VALUES (%s, %s, %s, %s, %s, %s, %s, %s)",
            ('u1', 'Owner Manager', 'admin@pgmanager.com', hashed_owner, '9876543210', 'Owner', 'OM', 'Active'))
        cursor.execute("INSERT INTO users VALUES (%s, %s, %s, %s, %s, %s, %s, %s)",
            ('u2', 'Ramesh Gowda', 'manager@pgmanager.com', hashed_mgr, '9988776655', 'Manager', 'RG', 'Active'))

        # Seed Properties
        cursor.execute("INSERT INTO properties VALUES (%s, %s, %s, %s, %s, %s, %s)",
            ('p1', 'Sunrise PG for Men', 'Koramangala, Bangalore', 15, 12, 'Ramesh Gowda', 1))
        cursor.execute("INSERT INTO properties VALUES (%s, %s, %s, %s, %s, %s, %s)",
            ('p2', 'Elite Women Hostel', 'HSR Layout, Bangalore', 20, 18, 'Priya S', 1))

        # Seed Access
        cursor.execute("INSERT INTO user_properties (userid, propertyid, accesslevel) VALUES (%s, %s, %s)",
            ('u1', 'p1', 'full'))
        cursor.execute("INSERT INTO user_properties (userid, propertyid, accesslevel) VALUES (%s, %s, %s)",
            ('u1', 'p2', 'full'))
        cursor.execute("INSERT INTO user_properties (userid, propertyid, accesslevel) VALUES (%s, %s, %s)",
            ('u2', 'p1', 'full'))

    conn.commit()
    conn.close()
    print("Postgres Database Initialized Successfully!")

if __name__ == '__main__':
    init_pg(force_reseed=False)
