// Realistic dummy data and state management for PG Manager

const generateId = () => Math.random().toString(36).substr(2, 9);
const months = ['2026-04', '2026-05', '2026-06', '2026-07', '2026-08', '2026-09'];

const initialData = {
    properties: [
        { id: 'p1', name: 'Urban Stay PG - Yelahanka', address: 'Yelahanka, Bengaluru', rooms: 50, totalBeds: 150, active: true },
        { id: 'p2', name: 'Green View PG - Hebbal', address: 'Hebbal, Bengaluru', rooms: 30, totalBeds: 90, active: true }
    ],
    rooms: [], 
    beds: [], 
    residents: [], 
    payments: [], 
    complaints: [
        { id: 'c1', residentId: null, roomId: 'r_p1_101', propertyId: 'p1', category: 'AC', description: 'AC not working', date: '2026-09-01', priority: 'High', status: 'Pending' },
        { id: 'c2', residentId: null, roomId: 'r_p1_204', propertyId: 'p1', category: 'Plumbing', description: 'Water leakage', date: '2026-09-03', priority: 'Medium', status: 'In Progress' },
        { id: 'c3', residentId: null, roomId: 'r_p1_305', propertyId: 'p1', category: 'Internet', description: 'Internet problem', date: '2026-09-05', priority: 'Low', status: 'Resolved' },
        { id: 'c4', residentId: null, roomId: 'r_p2_005', propertyId: 'p2', category: 'Electricity', description: 'Socket burned', date: '2026-09-02', priority: 'Medium', status: 'Pending' }
    ],
    settings: {
        companyName: 'Urban & Green PGs',
        ownerName: 'Owner Manager',
        phone: '+91 9876543210',
        email: 'admin@pgmanager.com',
        address: 'Bengaluru, Karnataka',
        defaultRent: 8000,
        rentDueDate: 5,
        currency: '₹'
    }
};

const firstNames = ['Rahul', 'Amit', 'Karan', 'Arjun', 'Vivek', 'Suresh', 'Ramesh', 'Ravi', 'Vikram', 'Prakash', 'Sunil', 'Anil', 'Rajesh', 'Manish', 'Sanjay', 'Rohit', 'Vijay', 'Deepak'];
const lastNames = ['Sharma', 'Kumar', 'Patel', 'Rao', 'Joshi', 'Singh', 'Gupta', 'Verma', 'Reddy', 'Nair', 'Menon', 'Yadav', 'Das', 'Sen', 'Bose'];

function generateRandomName() {
    return `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`;
}

// Generate Rooms and Beds
if (initialData.rooms.length === 0) {
    initialData.properties.forEach(prop => {
        const numFloors = prop.id === 'p1' ? 5 : 3; // 50 rooms vs 30 rooms
        const roomsPerFloor = 10;
        
        for (let floor = 0; floor < numFloors; floor++) {
            for (let r = 1; r <= roomsPerFloor; r++) {
                const displayFloor = floor === 0 ? 0 : floor;
                const roomNumStr = floor === 0 ? `0${r < 10 ? '0'+r : r}` : `${floor}${r < 10 ? '0'+r : r}`;
                const roomId = `r_${prop.id}_${roomNumStr}`;
                const isMaintenance = Math.random() < 0.05;

                initialData.rooms.push({
                    id: roomId,
                    propertyId: prop.id,
                    roomNumber: roomNumStr,
                    floor: displayFloor,
                    type: 'Triple Sharing',
                    status: isMaintenance ? 'Maintenance' : 'Active'
                });

                initialData.beds.push({ id: `b_${roomId}_A`, roomId: roomId, propertyId: prop.id, name: 'Bed A', status: isMaintenance ? 'Maintenance' : 'Vacant' });
                initialData.beds.push({ id: `b_${roomId}_B`, roomId: roomId, propertyId: prop.id, name: 'Bed B', status: isMaintenance ? 'Maintenance' : 'Vacant' });
                initialData.beds.push({ id: `b_${roomId}_C`, roomId: roomId, propertyId: prop.id, name: 'Bed C', status: isMaintenance ? 'Maintenance' : 'Vacant' });
            }
        }
    });
}

// Generate Residents
if (initialData.residents.length === 0) {
    initialData.properties.forEach(prop => {
        const propBeds = initialData.beds.filter(b => b.propertyId === prop.id && b.status === 'Vacant');
        // P1: 132/150 (88%), P2: 74/90 (82%)
        const targetOccupancy = prop.id === 'p1' ? 132 : 74; 
        
        const shuffledBeds = propBeds.sort(() => 0.5 - Math.random());
        const bedsToOccupy = shuffledBeds.slice(0, targetOccupancy);

        bedsToOccupy.forEach((bed, i) => {
            const resId = `res_${prop.id}_${i}`;
            const rent = 8000;
            
            initialData.residents.push({
                id: resId,
                name: generateRandomName(),
                phone: `98765${Math.floor(10000 + Math.random() * 90000)}`,
                email: `res${i}@example.com`,
                joiningDate: '2026-01-10',
                monthlyRent: rent,
                deposit: rent * 2,
                status: 'Active',
                propertyId: prop.id,
                roomId: bed.roomId,
                bedId: bed.id
            });

            bed.status = 'Occupied';
            bed.residentId = resId;
        });
    });
}

// Generate Historical Payments
if (initialData.payments.length === 0) {
    initialData.residents.forEach(res => {
        months.forEach(monthStr => {
            const isCurrentMonth = monthStr === '2026-09';
            let status = 'Paid';
            let amountPaid = res.monthlyRent;
            
            if (isCurrentMonth) {
                const rand = Math.random();
                if (rand < 0.1) {
                    status = 'Pending';
                    amountPaid = 0;
                } else if (rand < 0.15) {
                    status = 'Partial';
                    amountPaid = res.monthlyRent / 2;
                }
            } else if (Math.random() < 0.02) {
                status = 'Overdue';
                amountPaid = 0;
            }

            initialData.payments.push({
                id: `pay_${res.id}_${monthStr.replace('-', '')}`,
                residentId: res.id,
                propertyId: res.propertyId,
                month: monthStr,
                amountExpected: res.monthlyRent,
                amountPaid: amountPaid,
                dueDate: `${monthStr}-05`,
                status: status
            });
        });
    });
}

// State Management Wrapper
class StateManager {
    constructor() {
        this.loadState();
    }

    loadState() {
        // Updated version key to ensure fresh data for new structure
        const stored = localStorage.getItem('pg_state_v3');
        if (stored) {
            this.state = JSON.parse(stored);
        } else {
            this.state = JSON.parse(JSON.stringify(initialData));
            this.saveState();
        }
    }

    saveState() {
        localStorage.setItem('pg_state_v3', JSON.stringify(this.state));
        window.dispatchEvent(new Event('stateChanged'));
    }

    get(collection) {
        return this.state[collection] || [];
    }

    add(collection, item) {
        item.id = item.id || generateId();
        if (!this.state[collection]) this.state[collection] = [];
        this.state[collection].push(item);
        this.saveState();
        return item;
    }

    update(collection, id, updates) {
        const idx = this.state[collection].findIndex(i => i.id === id);
        if (idx !== -1) {
            this.state[collection][idx] = { ...this.state[collection][idx], ...updates };
            this.saveState();
            return this.state[collection][idx];
        }
        return null;
    }

    getBedDetails(bedId) {
        const bed = this.state.beds.find(b => b.id === bedId);
        if (!bed) return null;
        const room = this.state.rooms.find(r => r.id === bed.roomId);
        const prop = this.state.properties.find(p => p.id === bed.propertyId);
        return { ...bed, room, property: prop };
    }
    
    getResidentDetails(resId) {
        const res = this.state.residents.find(r => r.id === resId);
        if (!res) return null;
        const bed = res.bedId ? this.getBedDetails(res.bedId) : null;
        return { ...res, bedDetails: bed };
    }

    getRoomDetails(roomId) {
        const room = this.state.rooms.find(r => r.id === roomId);
        if (!room) return null;
        const property = this.state.properties.find(p => p.id === room.propertyId);
        const beds = this.state.beds.filter(b => b.roomId === roomId);
        
        const enrichedBeds = beds.map(b => {
            let resident = null;
            let currentPayment = null;
            if (b.status === 'Occupied' && b.residentId) {
                resident = this.state.residents.find(r => r.id === b.residentId);
                if (resident) {
                    currentPayment = this.state.payments.find(p => p.residentId === resident.id && p.month === '2026-09');
                }
            }
            return { ...b, resident, currentPayment };
        });

        const totalBeds = beds.length;
        const occupiedCount = beds.filter(b => b.status === 'Occupied').length;
        let derivedStatus = 'Vacant';
        if (room.status === 'Maintenance' || beds.some(b => b.status === 'Maintenance')) {
            derivedStatus = 'Maintenance';
        } else if (occupiedCount === totalBeds) {
            derivedStatus = 'Fully Occupied';
        } else if (occupiedCount > 0) {
            derivedStatus = 'Partially Occupied';
        }

        return { ...room, property, beds: enrichedBeds, derivedStatus, occupiedCount, totalBeds };
    }
}

window.db = new StateManager();
