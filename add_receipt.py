import sys
import re

# 1. Update index.html
with open('index.html', 'r', encoding='utf-8') as f:
    html_content = f.read()

html2pdf_script = '<script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js" integrity="sha512-GsLlZN/3F2ErC5ifS5QtgpiJtWd43JWSuIgh7mbzZ8zBps+dvLusV+eNQATqgA/HdeKFVgA5v3S/cIrLF7QnIg==" crossorigin="anonymous" referrerpolicy="no-referrer"></script>'

if 'html2pdf.bundle.min.js' not in html_content:
    html_content = html_content.replace('</head>', f'    {html2pdf_script}\n</head>')

receipt_template_html = """
    <!-- Hidden Receipt Template -->
    <div id="receipt-container" style="display: none; position: absolute; left: -9999px;">
        <div id="receipt-template" style="width: 794px; min-height: 1123px; padding: 60px; background-color: white; color: #1e293b; font-family: 'Inter', sans-serif; box-sizing: border-box;">
            
            <!-- Header -->
            <div style="text-align: center; margin-bottom: 50px;">
                <h1 style="font-size: 38px; font-weight: 800; color: #1e293b; margin: 0 0 10px 0; letter-spacing: -1px; text-transform: uppercase;">RENT PAYMENT RECEIPT</h1>
                <p id="receipt-property-name" style="font-size: 16px; color: #64748b; margin: 0; font-weight: 500;">Property Name</p>
            </div>

            <!-- Details Section -->
            <div style="display: flex; justify-content: space-between; margin-bottom: 50px;">
                <div style="width: 45%;">
                    <h4 style="font-size: 11px; font-weight: 700; color: #1e293b; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 12px 0;">Resident Details</h4>
                    <p id="receipt-resident-name" style="margin: 0 0 6px 0; font-size: 16px; color: #334155; font-weight: 600;">Name</p>
                    <p id="receipt-resident-phone" style="margin: 0 0 6px 0; font-size: 14px; color: #64748b;">Phone</p>
                    <p id="receipt-resident-room" style="margin: 0; font-size: 14px; color: #64748b;">Room</p>
                </div>
                <div style="width: 45%; text-align: right;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                        <span style="font-size: 12px; font-weight: 600; color: #1e293b; text-transform: uppercase;">Receipt No:</span>
                        <span id="receipt-no" style="font-size: 14px; color: #334155; font-weight: 600;">#000000</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                        <span style="font-size: 12px; font-weight: 600; color: #1e293b; text-transform: uppercase;">Payment Date:</span>
                        <span id="receipt-payment-date" style="font-size: 14px; color: #475569;">Date</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                        <span style="font-size: 12px; font-weight: 600; color: #1e293b; text-transform: uppercase;">Rent Month:</span>
                        <span id="receipt-rent-month" style="font-size: 14px; color: #475569;">Month</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                        <span style="font-size: 12px; font-weight: 600; color: #1e293b; text-transform: uppercase;">Due Date:</span>
                        <span id="receipt-due-date" style="font-size: 14px; color: #475569;">Date</span>
                    </div>
                    <div style="display: flex; justify-content: space-between;">
                        <span style="font-size: 12px; font-weight: 600; color: #1e293b; text-transform: uppercase;">Status:</span>
                        <span id="receipt-status-top" style="font-size: 14px; color: #475569; font-weight: 700;">Status</span>
                    </div>
                </div>
            </div>

            <!-- Table -->
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 40px;">
                <thead>
                    <tr>
                        <th style="text-align: left; padding: 14px 4px; border-top: 1px solid #cbd5e1; border-bottom: 1px solid #cbd5e1; font-size: 11px; font-weight: 700; color: #1e293b; text-transform: uppercase; letter-spacing: 1px;">Description</th>
                        <th style="text-align: left; padding: 14px 4px; border-top: 1px solid #cbd5e1; border-bottom: 1px solid #cbd5e1; font-size: 11px; font-weight: 700; color: #1e293b; text-transform: uppercase; letter-spacing: 1px;">Rent Month</th>
                        <th style="text-align: right; padding: 14px 4px; border-top: 1px solid #cbd5e1; border-bottom: 1px solid #cbd5e1; font-size: 11px; font-weight: 700; color: #1e293b; text-transform: uppercase; letter-spacing: 1px;">Amount Due</th>
                        <th style="text-align: right; padding: 14px 4px; border-top: 1px solid #cbd5e1; border-bottom: 1px solid #cbd5e1; font-size: 11px; font-weight: 700; color: #1e293b; text-transform: uppercase; letter-spacing: 1px;">Amount Paid</th>
                        <th style="text-align: right; padding: 14px 4px; border-top: 1px solid #cbd5e1; border-bottom: 1px solid #cbd5e1; font-size: 11px; font-weight: 700; color: #1e293b; text-transform: uppercase; letter-spacing: 1px;">Balance</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td style="padding: 18px 4px; font-size: 14px; color: #334155; border-bottom: 1px solid #f1f5f9;">Monthly Rent</td>
                        <td id="receipt-table-month" style="padding: 18px 4px; font-size: 14px; color: #334155; border-bottom: 1px solid #f1f5f9;">Month</td>
                        <td id="receipt-table-due" style="text-align: right; padding: 18px 4px; font-size: 14px; color: #334155; border-bottom: 1px solid #f1f5f9;">Amount</td>
                        <td id="receipt-table-paid" style="text-align: right; padding: 18px 4px; font-size: 14px; color: #334155; border-bottom: 1px solid #f1f5f9;">Amount</td>
                        <td id="receipt-table-balance" style="text-align: right; padding: 18px 4px; font-size: 14px; color: #334155; border-bottom: 1px solid #f1f5f9;">Amount</td>
                    </tr>
                </tbody>
            </table>

            <!-- Payment Details & Summary -->
            <div style="display: flex; justify-content: space-between; margin-bottom: 80px;">
                <div style="width: 45%;">
                    <h4 style="font-size: 11px; font-weight: 700; color: #1e293b; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 16px 0;">Payment Details</h4>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                        <span style="font-size: 13px; color: #64748b;">Payment Mode:</span>
                        <span id="receipt-mode" style="font-size: 13px; color: #334155; font-weight: 500;">Mode</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                        <span style="font-size: 13px; color: #64748b;">Transaction ID:</span>
                        <span id="receipt-tx-id" style="font-size: 13px; color: #334155; font-weight: 500;">ID</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                        <span style="font-size: 13px; color: #64748b;">Date & Time:</span>
                        <span id="receipt-datetime" style="font-size: 13px; color: #334155; font-weight: 500;">Time</span>
                    </div>
                </div>
                <div style="width: 45%;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                        <span style="font-size: 14px; color: #64748b;">Monthly Rent</span>
                        <span id="receipt-summary-rent" style="font-size: 14px; color: #334155; font-weight: 500;">Amount</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                        <span style="font-size: 14px; color: #64748b;">Amount Paid</span>
                        <span id="receipt-summary-paid" style="font-size: 14px; color: #334155; font-weight: 500;">Amount</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 20px;">
                        <span style="font-size: 14px; color: #64748b; font-weight: 600;">Balance Due</span>
                        <span id="receipt-summary-balance" style="font-size: 14px; color: #1e293b; font-weight: 700;">Amount</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; border-top: 1px solid #cbd5e1; padding-top: 20px;">
                        <span style="font-size: 14px; font-weight: 700; color: #1e293b; text-transform: uppercase;">Payment Status</span>
                        <span id="receipt-status-bottom" style="font-size: 18px; font-weight: 800; color: #1e293b; text-transform: uppercase;">STATUS</span>
                    </div>
                </div>
            </div>

            <!-- Footer -->
            <div style="margin-top: 100px; padding-top: 40px;">
                <h4 style="font-size: 11px; font-weight: 700; color: #1e293b; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 12px 0;">Property Details</h4>
                <p id="receipt-footer-prop-name" style="margin: 0 0 6px 0; font-size: 14px; color: #334155; font-weight: 600;">Property Name</p>
                <p id="receipt-footer-prop-address" style="margin: 0 0 16px 0; font-size: 13px; color: #64748b;">Property Address</p>
                
                <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-top: 40px;">
                    <div>
                        <p style="margin: 0; font-family: 'Mrs Saint Delafield', cursive, sans-serif; font-size: 42px; color: #1e293b; transform: rotate(-3deg);">Thank You</p>
                    </div>
                    <div style="text-align: right;">
                        <p style="margin: 0; font-size: 11px; color: #94a3b8;">This is a computer-generated payment receipt.</p>
                    </div>
                </div>
            </div>

        </div>
    </div>
"""

if 'id="receipt-container"' not in html_content:
    html_content = html_content.replace('</body>', f'{receipt_template_html}\n</body>')

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(html_content)


# 2. Update app.js
with open('app.js', 'r', encoding='utf-8') as f:
    app_content = f.read()

# Update renderPaymentsRows buttons
original_buttons = """                ${p.status !== 'Paid' ? `
                    <button class="btn btn-primary btn-sm" onclick="openRecordPaymentModal('${p.id}', ${p.amountExpected - p.amountPaid})">Collect</button>
                ` : `
                    <span class="badge badge-success"><i data-lucide="check" style="width:12px; height:12px; margin-right:4px;"></i> Done</span>
                `}
            </td>"""

new_buttons = """                <div style="display: flex; gap: 8px; justify-content: flex-end;">
                    ${p.status !== 'Paid' ? `
                        <button class="btn btn-primary btn-sm" onclick="openRecordPaymentModal('${p.id}', ${p.amountExpected - p.amountPaid})">Collect</button>
                    ` : ``}
                    ${p.status === 'Paid' || p.status === 'Partial' ? `
                        <button class="btn btn-outline btn-sm" onclick="generateReceipt('${p.id}')" style="padding: 4px 10px; font-size: 12px; display: inline-flex; align-items: center; gap: 4px;" title="Download Receipt">
                            <i data-lucide="receipt" style="width:14px; height:14px;"></i> Receipt
                        </button>
                    ` : ''}
                </div>
            </td>"""

app_content = app_content.replace(original_buttons, new_buttons)

generate_receipt_fn = """
// --- Receipt Generation ---
async function generateReceipt(paymentId) {
    const payment = window.db.get('payments').find(p => p.id === paymentId);
    if (!payment) return;
    
    // Get related data
    const resident = window.db.get('residents').find(r => r.id === payment.residentId) || { name: payment.residentName, phone: payment.residentPhone, roomId: null };
    
    // Find room via resident, then fallback to looking it up
    let room;
    if (resident.roomId) {
        room = window.db.get('rooms').find(r => r.id === resident.roomId);
    }
    
    // Get property
    let property;
    if (payment.propertyId) {
        property = window.db.get('properties').find(p => p.id === payment.propertyId);
    } else if (room) {
        property = window.db.get('properties').find(p => p.id === room.propertyId);
    }
    
    if (!property) {
        property = { name: payment.propertyName || 'Property', address: 'Address not found' };
    }
    if (!room) {
        room = { floor: 'N/A', roomNumber: payment.roomNumber || 'N/A' };
    }
    
    // Get bed info if available
    let bedStr = '';
    if (resident.roomId) {
        const bed = window.db.get('beds').find(b => b.roomId === resident.roomId && b.status === 'Occupied');
        if (bed) bedStr = ` · Bed ${bed.bedName}`;
    }

    const currency = window.db.get('settings')?.currency || '₹';
    const amountExpected = payment.amountExpected || 0;
    const amountPaid = payment.amountPaid || 0;
    const balance = Math.max(0, amountExpected - amountPaid);
    
    // Populate Template
    document.getElementById('receipt-property-name').textContent = property.name;
    document.getElementById('receipt-footer-prop-name').textContent = property.name;
    document.getElementById('receipt-footer-prop-address').textContent = property.address || '';
    
    document.getElementById('receipt-resident-name').textContent = resident.name || payment.residentName;
    document.getElementById('receipt-resident-phone').textContent = resident.phone || payment.residentPhone || 'N/A';
    document.getElementById('receipt-resident-room').textContent = `Floor ${room.floor || '0'} · Room ${room.roomNumber}${bedStr}`;
    
    // Receipt No (Mock if not present)
    const recNo = `REC-${payment.id.replace('pay_', '').substring(0, 6).toUpperCase()}`;
    document.getElementById('receipt-no').textContent = recNo;
    
    document.getElementById('receipt-payment-date').textContent = payment.paymentDate || 'N/A';
    document.getElementById('receipt-datetime').textContent = payment.paymentDate ? `${payment.paymentDate} 10:00 AM` : 'N/A';
    
    // Format Month (e.g. 2026-09 to September 2026)
    let displayMonth = payment.month;
    if (displayMonth && displayMonth.includes('-')) {
        const [yyyy, mm] = displayMonth.split('-');
        const date = new Date(parseInt(yyyy), parseInt(mm) - 1, 1);
        displayMonth = date.toLocaleString('default', { month: 'long', year: 'numeric' });
    }
    document.getElementById('receipt-rent-month').textContent = displayMonth;
    document.getElementById('receipt-table-month').textContent = displayMonth;
    
    const dueDate = `${window.db.get('settings')?.rentDueDate || 5} ${displayMonth}`;
    document.getElementById('receipt-due-date').textContent = dueDate;
    
    document.getElementById('receipt-status-top').textContent = payment.status;
    document.getElementById('receipt-status-bottom').textContent = payment.status;
    
    document.getElementById('receipt-table-due').textContent = `${currency}${amountExpected.toLocaleString()}`;
    document.getElementById('receipt-table-paid').textContent = `${currency}${amountPaid.toLocaleString()}`;
    document.getElementById('receipt-table-balance').textContent = `${currency}${balance.toLocaleString()}`;
    
    document.getElementById('receipt-summary-rent').textContent = `${currency}${amountExpected.toLocaleString()}`;
    document.getElementById('receipt-summary-paid').textContent = `${currency}${amountPaid.toLocaleString()}`;
    document.getElementById('receipt-summary-balance').textContent = `${currency}${balance.toLocaleString()}`;
    
    document.getElementById('receipt-mode').textContent = payment.paymentMode || 'N/A';
    document.getElementById('receipt-tx-id').textContent = payment.referenceNumber || 'N/A';

    // Show temporary, generate, hide
    const element = document.getElementById('receipt-template');
    const container = document.getElementById('receipt-container');
    container.style.display = 'block';
    
    showToast('Generating Receipt...', 'info');
    
    const opt = {
      margin:       0,
      filename:     `Receipt_${recNo}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true },
      jsPDF:        { unit: 'in', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().set(opt).from(element).save().then(() => {
        container.style.display = 'none';
        showToast('Receipt downloaded successfully!');
    });
}
"""

if 'async function generateReceipt' not in app_content:
    app_content += '\n' + generate_receipt_fn

with open('app.js', 'w', encoding='utf-8') as f:
    f.write(app_content)

print("Receipt logic added.")
