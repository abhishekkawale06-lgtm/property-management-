import sys
import re

with open("app.js", "r", encoding="utf-8") as f:
    content = f.read()

# Find the start of window.downloadPaymentStatement = function() {
index = content.find("window.downloadPaymentStatement = function() {")

if index == -1:
    print("Error: Could not find downloadPaymentStatement")
    sys.exit(1)

# Keep everything before this point
new_content = content[:index]

# New functions
new_code = """window.downloadPaymentStatement = function() {
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
    
    // Convert JSON to raw sheet
    const ws = XLSX.utils.json_to_sheet(data);
    
    // Append summary rows manually
    const range = XLSX.utils.decode_range(ws['!ref']);
    let rowIdx = range.e.r + 2; // skip one row
    
    const summaryRows = [
        ['SUMMARY', 'Total Expected Rent', totalExpected],
        ['', 'Total Rent Collected', totalCollected],
        ['', 'Total Pending Rent', totalPending],
        ['', 'Number of Residents Paid', numPaid],
        ['', 'Number of Residents Pending', numPending],
    ];
    
    summaryRows.forEach(row => {
        XLSX.utils.sheet_add_aoa(ws, [row], { origin: `A${rowIdx + 1}` });
        rowIdx++;
    });
    
    // Apply Formatting and Autowidth
    applyExcelStyles(ws, data, ['Monthly Rent', 'Amount Paid']);
    
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
            'Monthly Rent': res ? (res.monthlyRent || '') : '',
            'Security Deposit': res ? (res.deposit || '') : '',
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
    
    // Apply Formatting and Autowidth
    applyExcelStyles(ws, data, ['Monthly Rent', 'Security Deposit']);
    
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

function applyExcelStyles(ws, dataList, moneyColumns) {
    if (!dataList || dataList.length === 0) return;
    
    const range = XLSX.utils.decode_range(ws['!ref']);
    const C = range.e.c;
    const R = range.e.r;
    
    const colWidths = [];
    const headers = Object.keys(dataList[0]);
    
    // 1. Calculate column widths
    headers.forEach((header, cIdx) => {
        let maxLen = header.length;
        
        dataList.forEach(row => {
            const val = row[header] !== undefined && row[header] !== null ? String(row[header]) : '';
            if (val.length > maxLen) {
                maxLen = val.length;
            }
        });
        
        // Cap max width at 60 characters to wrap long text (Address, etc)
        const width = Math.min(Math.max(maxLen + 4, 10), 60); 
        colWidths[cIdx] = { wch: width };
    });
    ws['!cols'] = colWidths;
    
    // 2. Enable AutoFilters on header
    ws['!autofilter'] = { ref: XLSX.utils.encode_range({s: {r:0, c:0}, e: {r:0, c:C}}) };
    
    // 3. Freeze Header Row
    ws['!freeze'] = { xSplit: 0, ySplit: 1, topLeftCell: "A2", activePane: "bottomRight", state: "frozen" };
    
    // 4. Style Cells
    for (let row = 0; row <= R; row++) {
        for (let col = 0; col <= C; col++) {
            const cellRef = XLSX.utils.encode_cell({c: col, r: row});
            if (!ws[cellRef]) continue;
            
            const cell = ws[cellRef];
            const headerName = headers[col] || '';
            const val = cell.v;
            
            // Base style object
            if (!cell.s) cell.s = {};
            if (!cell.s.font) cell.s.font = {};
            if (!cell.s.alignment) cell.s.alignment = { vertical: "center" };
            
            // Header Row Styling
            if (row === 0) {
                cell.s.font.bold = true;
                cell.s.fill = { fgColor: { rgb: "F3F4F6" } };
                cell.s.alignment.horizontal = "center";
                continue;
            }
            
            // Handle Long Text Wrapping
            if (colWidths[col] && colWidths[col].wch >= 60 && typeof val === 'string' && val.length > 55) {
                cell.s.alignment.wrapText = true;
            }
            
            // Content Alignment based on Header
            if (['Floor No.', 'Room No.', 'Bed No.', 'Bed Status', 'Occupancy Status', 'Payment Status'].includes(headerName)) {
                cell.s.alignment.horizontal = "center";
            } else if (['Resident Name', 'Property Name', 'Email', 'Resident Contact Number', 'Contact Number', 'Emergency Contact Number'].includes(headerName)) {
                cell.s.alignment.horizontal = "left";
            }
            
            // Number formatting for Money
            if (moneyColumns.includes(headerName) && typeof val === 'number') {
                cell.s.alignment.horizontal = "right";
                cell.z = '₹#,##0.00';
            }
            
            // Summary row bolding
            if (typeof val === 'string' && val === 'SUMMARY') {
                cell.s.font.bold = true;
            }
        }
    }
}
"""

with open("app.js", "w", encoding="utf-8") as f:
    f.write(new_content + new_code)

print("Formatting improvements applied successfully.")
