// PG Manager - Centralized API State Manager

const originalFetch = window.fetch;
window.fetch = async function() {
    let [resource, config] = arguments;
    if (typeof resource === 'string' && resource.startsWith('/api/') && resource !== '/api/login' && resource !== '/api/login/google') {
        config = config || {};
        config.headers = config.headers || {};
        const token = localStorage.getItem('pg_token');
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }
    }
    const response = await originalFetch(resource, config);
    if (response.status === 401 && resource !== '/api/login' && resource !== '/api/login/google') {
        window.dispatchEvent(new Event('auth_required'));
        throw new Error('Unauthorized');
    }
    return response;
};

/**
 * Safely parse a fetch response as JSON.
 * If the response is not JSON (e.g. HTML error page from Vercel), throws a clear error.
 */
async function safeJson(res, context = 'API call') {
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
        // The server returned non-JSON (likely HTML error page)
        const text = await res.text();
        console.error(`[${context}] Non-JSON response (${res.status}):`, text.substring(0, 200));
        throw new Error(`Server error (${res.status}): The server did not return a valid response. Please try again.`);
    }
    return res.json();
}


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

            this.state.properties = await safeJson(propRes, 'properties');
            this.state.rooms = await safeJson(roomRes, 'rooms');
            this.state.beds = await safeJson(bedRes, 'beds');
            this.state.residents = await safeJson(resRes, 'residents');
            this.state.leads = await safeJson(leadRes, 'leads');
            this.state.payments = await safeJson(payRes, 'payments');
            this.state.complaints = await safeJson(compRes, 'complaints');
            this.state.expenses = await safeJson(expRes, 'expenses');
            this.state.staff = await safeJson(staffRes, 'staff');
            this.state.notices = await safeJson(notRes, 'notices');
            this.state.notifications = await safeJson(notifRes, 'notifications');
            this.state.settings = await safeJson(setRes, 'settings');
            this.state.analytics = await safeJson(analRes, 'analytics');

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
        const result = await safeJson(res, 'login');
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
        const result = await safeJson(res, 'loginWithGoogle');
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
        return await safeJson(res, 'uploadFile');
    }

    async exportResidents() {
        const res = await fetch('/api/export/residents');
        return await safeJson(res, 'exportResidents');
    }

    async exportPayments() {
        const res = await fetch('/api/export/payments');
        return await safeJson(res, 'exportPayments');
    }

    async notifyRent(residentId, month, amount) {
        const res = await fetch('/api/notify/rent', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ residentId, month, amount })
        });
        return await safeJson(res, 'notifyRent');
    }

    // --- Property Methods ---
    async addProperty(data) {
        const res = await fetch('/api/properties', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const result = await safeJson(res, 'addProperty');
        if (!res.ok) throw new Error(result.error || 'Failed to add property');
        await this.loadState();
        return result;
    }

    async updateProperty(id, data) {
        const res = await fetch(`/api/properties/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const result = await safeJson(res, 'updateProperty');
        if (!res.ok) throw new Error(result.error || 'Failed to update property');
        await this.loadState();
        return result;
    }

    async deleteProperty(id) {
        const res = await fetch(`/api/properties/${id}`, { method: 'DELETE' });
        const result = await safeJson(res, 'deleteProperty');
        if (!res.ok) throw new Error(result.error || 'Failed to delete property');
        await this.loadState();
        return result;
    }

    // --- Room & Bed Methods ---
    async addRoom(data) {
        const res = await fetch('/api/rooms', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const result = await safeJson(res, 'addRoom');
        if (!res.ok) throw new Error(result.error || 'Failed to add room');
        await this.loadState();
        return result;
    }

    async updateBedStatus(bedId, status) {
        const res = await fetch(`/api/beds/${bedId}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status })
        });
        const result = await safeJson(res, 'updateBedStatus');
        if (!res.ok) throw new Error(result.error || 'Failed to update bed status');
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
        const result = await safeJson(res, 'addResident');
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
        const result = await safeJson(res, 'updateResident');
        if (!res.ok) throw new Error(result.error || 'Failed to update resident');
        await this.loadState();
        return result;
    }

    async transferResident(id, roomId, bedId) {
        const res = await fetch(`/api/residents/${id}/transfer`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ roomId, bedId })
        });
        const result = await safeJson(res, 'transferResident');
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
        const result = await safeJson(res, 'checkoutResident');
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
        const result = await safeJson(res, 'addLead');
        if (!res.ok) throw new Error(result.error || 'Failed to add lead');
        await this.loadState();
        return result;
    }

    async updateLead(id, data) {
        const res = await fetch(`/api/leads/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const result = await safeJson(res, 'updateLead');
        if (!res.ok) throw new Error(result.error || 'Failed to update lead');
        await this.loadState();
        return result;
    }

    async convertLead(id, data) {
        const res = await fetch(`/api/leads/${id}/convert`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const result = await safeJson(res, 'convertLead');
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
        const result = await safeJson(res, 'recordPayment');
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
        const result = await safeJson(res, 'generateMonthRent');
        if (!res.ok) throw new Error(result.error || 'Failed to generate rent');
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
        const result = await safeJson(res, 'addComplaint');
        if (!res.ok) throw new Error(result.error || 'Failed to add complaint');
        await this.loadState();
        return result;
    }

    async updateComplaint(id, data) {
        const res = await fetch(`/api/complaints/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const result = await safeJson(res, 'updateComplaint');
        if (!res.ok) throw new Error(result.error || 'Failed to update complaint');
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
        const result = await safeJson(res, 'addExpense');
        if (!res.ok) throw new Error(result.error || 'Failed to add expense');
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
        const result = await safeJson(res, 'addStaff');
        if (!res.ok) throw new Error(result.error || 'Failed to add staff');
        await this.loadState();
        return result;
    }

    async addNotice(data) {
        const res = await fetch('/api/notices', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const result = await safeJson(res, 'addNotice');
        if (!res.ok) throw new Error(result.error || 'Failed to add notice');
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
        const result = await safeJson(res, 'updateSettings');
        if (!res.ok) throw new Error(result.error || 'Failed to update settings');
        await this.loadState();
        return result;
    }

    async resetApp() {
        const res = await fetch('/api/settings/reset', { method: 'POST' });
        const result = await safeJson(res, 'resetApp');
        if (!res.ok) throw new Error(result.error || 'Failed to reset app');
        await this.loadState();
        return result;
    }
}

window.db = new StateManager();
