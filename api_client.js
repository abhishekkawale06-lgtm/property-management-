// PG Manager - Centralized API State Manager

const originalFetch = window.fetch;
window.fetch = async function() {
    let [resource, config] = arguments;
    if (typeof resource === 'string' && resource.startsWith('/api/') && resource !== '/api/login') {
        config = config || {};
        config.headers = config.headers || {};
        const token = localStorage.getItem('pg_token');
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }
    }
    const response = await originalFetch(resource, config);
    if (response.status === 401 && resource !== '/api/login') {
        window.dispatchEvent(new Event('auth_required'));
        throw new Error('Unauthorized');
    }
    return response;
};


class StateManager {
    constructor() {
        this.selectedPropertyId = 'all'; // 'all' or propertyId
        this.state = {
            properties: [],
            rooms: [],
            beds: [],
            residents: [],
            leads: [],
            payments: [],
            complaints: [],
            expenses: [],
            staff: [],
            notices: [],
            notifications: [],
            settings: {},
            analytics: null
        };
        this.loaded = false;
    }

    async loadState(propertyId = this.selectedPropertyId) {
        this.selectedPropertyId = propertyId || 'all';
        const pParam = this.selectedPropertyId !== 'all' ? `?propertyId=${this.selectedPropertyId}` : '';

        try {
            const [
                propRes, roomRes, bedRes, resRes, leadRes,
                payRes, compRes, expRes, staffRes, notRes, notifRes, setRes, analRes
            ] = await Promise.all([
                fetch('/api/properties'),
                fetch(`/api/rooms${pParam}`),
                fetch(`/api/beds${pParam}`),
                fetch(`/api/residents${pParam}`),
                fetch(`/api/leads${pParam}`),
                fetch(`/api/payments${pParam}`),
                fetch(`/api/complaints${pParam}`),
                fetch(`/api/expenses${pParam}`),
                fetch(`/api/staff${pParam}`),
                fetch(`/api/notices${pParam}`),
                fetch(`/api/notifications${pParam}`),
                fetch('/api/settings'),
                fetch(`/api/analytics/summary${pParam}`)
            ]);

            this.state.properties = await propRes.json();
            this.state.rooms = await roomRes.json();
            this.state.beds = await bedRes.json();
            this.state.residents = await resRes.json();
            this.state.leads = await leadRes.json();
            this.state.payments = await payRes.json();
            this.state.complaints = await compRes.json();
            this.state.expenses = await expRes.json();
            this.state.staff = await staffRes.json();
            this.state.notices = await notRes.json();
            this.state.notifications = await notifRes.json();
            this.state.settings = await setRes.json();
            this.state.analytics = await analRes.json();

            this.loaded = true;
            window.dispatchEvent(new CustomEvent('stateChanged', { detail: { propertyId: this.selectedPropertyId } }));
            return this.state;
        } catch (e) {
            console.error("Failed to load state from API:", e);
        }
    }

    get(collection) {
        return this.state[collection] || [];
    }


    async login(email, password) {
        const res = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const result = await res.json();
        if (res.ok && result.token) {
            localStorage.setItem('pg_token', result.token);
            localStorage.setItem('pg_user', JSON.stringify(result.user));
            return true;
        }
        throw new Error(result.error || 'Login failed');
    }

    async loginWithGoogle(credential) {
        const res = await fetch('/api/login/google', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ credential })
        });
        const result = await res.json();
        if (res.ok && result.token) {
            localStorage.setItem('pg_token', result.token);
            localStorage.setItem('pg_user', JSON.stringify(result.user));
            return true;
        }
        throw new Error(result.error || 'Google login failed');
    }

    logout() {
        localStorage.removeItem('pg_token');
        localStorage.removeItem('pg_user');
        window.dispatchEvent(new Event('auth_required'));
    }

    async uploadFile(file, isSecure = false) {
        const formData = new FormData();
        formData.append('file', file);
        if (isSecure) {
            formData.append('secure', 'true');
        }
        const res = await fetch('/api/upload', {
            method: 'POST',
            body: formData
        });
        return await res.json();
    }

    async exportResidents() {
        const res = await fetch('/api/export/residents');
        return await res.json();
    }

    async exportPayments() {
        const res = await fetch('/api/export/payments');
        return await res.json();
    }

    async notifyRent(residentId, month, amount) {
        const res = await fetch('/api/notify/rent', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ residentId, month, amount })
        });
        return await res.json();
    }

    // --- Property Methods ---
    async addProperty(data) {
        const res = await fetch('/api/properties', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const result = await res.json();
        await this.loadState();
        return result;
    }

    async updateProperty(id, data) {
        const res = await fetch(`/api/properties/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        await this.loadState();
        return await res.json();
    }

    async deleteProperty(id) {
        const res = await fetch(`/api/properties/${id}`, { method: 'DELETE' });
        await this.loadState();
        return await res.json();
    }

    // --- Room & Bed Methods ---
    async addRoom(data) {
        const res = await fetch('/api/rooms', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const result = await res.json();
        await this.loadState();
        return result;
    }

    async updateBedStatus(bedId, status) {
        const res = await fetch(`/api/beds/${bedId}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status })
        });
        const result = await res.json();
        await this.loadState();
        return result;
    }

    // --- Resident & KYC Methods ---
    async addResident(data) {
        const res = await fetch('/api/residents', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const result = await res.json();
        if (!res.ok) throw new Error(result.error || 'Failed to onboard resident');
        await this.loadState();
        return result;
    }

    async updateResident(id, data) {
        const res = await fetch(`/api/residents/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const result = await res.json();
        await this.loadState();
        return result;
    }

    async transferResident(id, roomId, bedId) {
        const res = await fetch(`/api/residents/${id}/transfer`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ roomId, bedId })
        });
        const result = await res.json();
        if (!res.ok) throw new Error(result.error || 'Failed to transfer room/bed');
        await this.loadState();
        return result;
    }

    async checkoutResident(id, checkoutData) {
        const res = await fetch(`/api/residents/${id}/checkout`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(checkoutData)
        });
        const result = await res.json();
        if (!res.ok) throw new Error(result.error || 'Failed to complete checkout');
        await this.loadState();
        return result;
    }

    // --- Lead Methods ---
    async addLead(data) {
        const res = await fetch('/api/leads', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const result = await res.json();
        await this.loadState();
        return result;
    }

    async updateLead(id, data) {
        const res = await fetch(`/api/leads/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const result = await res.json();
        await this.loadState();
        return result;
    }

    async convertLead(id, data) {
        const res = await fetch(`/api/leads/${id}/convert`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const result = await res.json();
        if (!res.ok) throw new Error(result.error || 'Failed to convert lead to resident');
        await this.loadState();
        return result;
    }

    // --- Payment Methods ---
    async recordPayment(paymentId, amountPaid, paymentMode, referenceNumber, notes) {
        const res = await fetch('/api/payments/record', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ paymentId, amountPaid: parseInt(amountPaid), paymentMode, referenceNumber, notes })
        });
        const result = await res.json();
        if (!res.ok) throw new Error(result.error || 'Failed to record payment');
        await this.loadState();
        return result;
    }

    async generateMonthRent(month) {
        const res = await fetch('/api/payments/generate-month', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ month })
        });
        const result = await res.json();
        await this.loadState();
        return result;
    }

    // --- Complaints Methods ---
    async addComplaint(data) {
        const res = await fetch('/api/complaints', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const result = await res.json();
        await this.loadState();
        return result;
    }

    async updateComplaint(id, data) {
        const res = await fetch(`/api/complaints/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const result = await res.json();
        await this.loadState();
        return result;
    }

    // --- Expenses Methods ---
    async addExpense(data) {
        const res = await fetch('/api/expenses', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const result = await res.json();
        await this.loadState();
        return result;
    }

    // --- Staff & Notices ---
    async addStaff(data) {
        const res = await fetch('/api/staff', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const result = await res.json();
        await this.loadState();
        return result;
    }

    async addNotice(data) {
        const res = await fetch('/api/notices', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const result = await res.json();
        await this.loadState();
        return result;
    }

    // --- Settings & Reset ---
    async updateSettings(data) {
        const res = await fetch('/api/settings', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const result = await res.json();
        await this.loadState();
        return result;
    }

    async resetApp() {
        const res = await fetch('/api/settings/reset', { method: 'POST' });
        const result = await res.json();
        await this.loadState();
        return result;
    }
}

window.db = new StateManager();
