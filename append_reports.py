import sys

code = """
// --- Excel Reports & Downloads ---

window.updateReportFloorDropdown = function(propId) {
    const floorSelect = document.getElementById('report-occ-floor');
    if (!floorSelect) return;
    
    if (propId === 'all') {
        floorSelect.innerHTML = '<option value="all">All Floors</option>';
        floorSelect.disabled = true;
        return;
    }
    
    floorSelect.disabled = false;
    const rooms = window.db.get('rooms').filter(r => r.propertyId === propId);
    const floorsSet = new Set(rooms.map(r => parseInt(r.floor)));
    const floors = Array.from(floorsSet).sort((a,b) => a-b);
    
    let html = '<option value="all">All Floors</option>';
    floors.forEach(f => {
        html += `<option value="${f}">${f === 0 ? 'Ground' : f}</option>`;
    });
    
    floorSelect.innerHTML = html;
};

window.downloadPaymentStatement = function() {
    const month = document.getElementById('report-payment-month').value;
    const propId = document.getElementById('report-payment-property').value;
    
    let payments = window.db.get('payments').filter(p => p.month === month);
    if (propId !== 'all') {
        payments = payments.filter(p => p.propertyId === propId);
    }
    
    if (payments.length === 0) {
        alert('No payment records found for the selected month and property.');
        return;
    }
    
    const residents = window.db.get('residents');
    const rooms = window.db.get('rooms');
    const properties = window.db.get('properties');
    const beds = window.db.get('beds');
    
    let totalExpected = 0;
    let totalCollected = 0;
    let totalPending = 0;
    let numPaid = 0;
    let numPending = 0;
    
    const data = payments.map(p => {
        const res = residents.find(r => r.id === p.residentId) || {};
        const room = rooms.find(r => r.id === res.roomId) || {};
        const bed = beds.find(b => b.id === res.bedId) || {};
        const prop = properties.find(pr => pr.id === p.propertyId) || {};
        
        const expected = p.amountExpected || 0;
        const paid = p.amountPaid || 0;
        
        totalExpected += expected;
        totalCollected += paid;
        
        if (p.status === 'Paid') {
            numPaid++;
        } else if (p.status === 'Pending' || p.status === 'Overdue') {
            numPending++;
            totalPending += expected;
        } else if (p.status === 'Partial') {
            numPending++;
            totalPending += (expected - paid);
        }
        
        return {
            'Property Name': prop.name || 'Unknown',
            'Floor No.': room.floor !== undefined ? (room.floor === 0 ? 'G' : room.floor) : 'N/A',
            'Room No.': room.roomNumber || 'N/A',
            'Bed No.': bed.name || 'N/A',
            'Resident Name': res.name || 'Unknown',
            'Resident Contact Number': res.phone || 'N/A',
            'Monthly Rent': expected,
            'Amount Paid': paid,
            'Payment Date': p.paymentDate || 'N/A',
            'Payment Type / Payment Method': p.paymentMethod || 'Online',
            'Transaction / Reference ID': p.transactionId || 'N/A',
            'Payment Status': p.status || 'Unknown'
        };
    });
    
    // Add summary row
    data.push({});
    data.push({
        'Property Name': 'SUMMARY',
        'Resident Name': 'Total Expected Rent',
        'Monthly Rent': totalExpected
    });
    data.push({
        'Resident Name': 'Total Rent Collected',
        'Monthly Rent': totalCollected
    });
    data.push({
        'Resident Name': 'Total Pending Rent',
        'Monthly Rent': totalPending
    });
    data.push({
        'Resident Name': 'Number of Residents Paid',
        'Monthly Rent': numPaid
    });
    data.push({
        'Resident Name': 'Number of Residents Pending',
        'Monthly Rent': numPending
    });
    
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Payment Statement");
    
    XLSX.writeFile(wb, `Payment_Statement_${month}.xlsx`);
};

window.downloadOccupancyStatement = function() {
    const propId = document.getElementById('report-occ-property').value;
    const floorSelect = document.getElementById('report-occ-floor');
    const floor = floorSelect ? floorSelect.value : 'all';
    
    let bedsList = window.db.get('beds');
    if (propId !== 'all') {
        bedsList = bedsList.filter(b => b.propertyId === propId);
    }
    
    const rooms = window.db.get('rooms');
    const residents = window.db.get('residents');
    const properties = window.db.get('properties');
    
    const data = [];
    
    bedsList.forEach(bed => {
        const room = rooms.find(r => r.id === bed.roomId) || {};
        
        // Floor filter
        if (floor !== 'all') {
            if (String(room.floor) !== String(floor)) return;
        }
        
        const prop = properties.find(p => p.id === bed.propertyId) || {};
        let res = null;
        if (bed.residentId) {
            res = residents.find(r => r.id === bed.residentId);
        }
        
        const row = {
            'Property Name': prop.name || 'Unknown',
            'Floor No.': room.floor !== undefined ? (room.floor === 0 ? 'G' : room.floor) : 'N/A',
            'Room No.': room.roomNumber || 'N/A',
            'Bed No.': bed.name || 'Unknown',
            'Bed Status': bed.status || 'Available',
            'Occupancy Status': res ? 'Occupied' : (bed.status || 'Available'),
            'Resident Name': res ? (res.name || 'N/A') : 'N/A',
            'Contact Number': res ? (res.phone || 'N/A') : 'N/A',
            'Email': res ? (res.email || 'N/A') : 'N/A',
            'Date of Birth': res ? (res.dob || 'N/A') : 'N/A',
            'Joining Date': res ? (res.joiningDate || 'N/A') : 'N/A',
            'Monthly Rent': res ? (res.monthlyRent || 'N/A') : 'N/A',
            'Security Deposit': res ? (res.deposit || 'N/A') : 'N/A',
            'KYC/ID Type': res ? (res.kycType || 'Aadhaar') : 'N/A',
            'KYC/ID Verification Status': res ? (res.kycStatus || 'Verified') : 'N/A',
            'Emergency Contact Name': res ? (res.emergencyName || 'N/A') : 'N/A',
            'Emergency Contact Number': res ? (res.emergencyPhone || 'N/A') : 'N/A',
            'Permanent Address': res ? (res.permanentAddress || 'N/A') : 'N/A'
        };
        
        data.push(row);
    });
    
    if (data.length === 0) {
        alert('No room/bed data found for the selected property and floor.');
        return;
    }
    
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Occupancy Statement");
    
    let filename = 'Occupancy_Statement';
    if (propId !== 'all') {
        const p = properties.find(p => p.id === propId);
        if (p) filename += `_${p.name.replace(/\s+/g, '')}`;
    }
    if (floor !== 'all') filename += `_Floor_${floor}`;
    filename += '.xlsx';
    
    XLSX.writeFile(wb, filename);
};
"""

with open("app.js", "a", encoding="utf-8") as f:
    f.write(code)

print("Code appended successfully!")
