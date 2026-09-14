import sqlite3

def make_rooms_vacant():
    conn = sqlite3.connect('pg_manager.db')
    cursor = conn.cursor()
    
    # Pick 4 random rooms that are currently occupied
    cursor.execute('''
        SELECT id FROM rooms 
        WHERE id IN (
            SELECT roomId FROM beds WHERE status = 'Occupied' GROUP BY roomId
        )
        LIMIT 4
    ''')
    rooms = cursor.fetchall()
    
    for room in rooms:
        room_id = room[0]
        # Get residents in this room
        cursor.execute("SELECT residentId FROM beds WHERE roomId = ? AND residentId IS NOT NULL", (room_id,))
        residents = cursor.fetchall()
        
        for res in residents:
            res_id = res[0]
            # Delete payments and complaints for this resident
            cursor.execute("DELETE FROM payments WHERE residentId = ?", (res_id,))
            cursor.execute("DELETE FROM complaints WHERE residentId = ?", (res_id,))
            # Delete resident
            cursor.execute("DELETE FROM residents WHERE id = ?", (res_id,))
            
        # Update beds to Vacant
        cursor.execute("UPDATE beds SET status = 'Vacant', residentId = NULL WHERE roomId = ?", (room_id,))
        print(f"Made room {room_id} fully vacant.")
        
    conn.commit()
    conn.close()
    print(f"Successfully made {len(rooms)} rooms vacant.")

if __name__ == '__main__':
    make_rooms_vacant()
