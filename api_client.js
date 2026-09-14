class StateManager {
    constructor() {
        this.state = {
            properties: [], rooms: [], beds: [], residents: [],
            payments: [], complaints: [], expenses: [], settings: {}
        };
        this.loaded = false;
    }

    async loadState() {
        try {
            const [propRes, roomRes, bedRes, resRes, payRes, compRes, expRes, setRes, notifRes] = await Promise.all([
                fetch('/api/properties'),
                fetch('/api/rooms'),
                fetch('/api/beds'),
                fetch('/api/residents'),
                fetch('/api/payments'),
                fetch('/api/complaints'),
                fetch('/api/expenses'),
                fetch('/api/settings'),
                fetch('/api/notifications')
            ]);
            
            this.state.properties = await propRes.json();
            this.state.rooms = await roomRes.json();
            this.state.beds = await bedRes.json();
            this.state.residents = await resRes.json();
            this.state.payments = await payRes.json();
            this.state.complaints = await compRes.json();
            this.state.expenses = await expRes.json();
            this.state.settings = await setRes.json();
            this.state.notifications = await notifRes.json();
            
            this.loaded = true;
            window.dispatchEvent(new Event('stateChanged'));
        } catch (e) {
            console.error("Failed to load state from API:", e);
            alert("Could not connect to backend server!");
        }
    }

    get(collection) {
        return this.state[collection] || [];
    }

    getRoomDetails(roomId) {
        return this.state.rooms.find(r => r.id === roomId);
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

    async addExpense(date, category, desc, amount) {
        await fetch('/api/expenses', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ date, category, description: desc, amount: parseInt(amount) })
        });
        await this.loadState();
    }
    
    async updateSettings(ownerName, email, phone) {
        await fetch('/api/settings', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ownerName, email, phone })
        });
        await this.loadState();
    }
    
    async resetApp() {
        await fetch('/api/settings/reset', { method: 'POST' });
        await this.loadState();
    }
    
    async addProperty(name, address, rooms, totalBeds) {
        await fetch('/api/properties', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, address, rooms: parseInt(rooms), totalBeds: parseInt(totalBeds) })
        });
        await this.loadState();
    }
}

window.db = new StateManager();
