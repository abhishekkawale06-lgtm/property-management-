
// --- Add Resident Modal ---
function openAddResidentModal(roomId) {
    const room = window.db.get('rooms').find(r => r.id === roomId);
    if (!room) return;
    
    const vacantBeds = window.db.get('beds').filter(b => b.roomId === roomId && b.status === 'Vacant');
    
    let bedOptionsHtml = '';
    if (vacantBeds.length > 0) {
        bedOptionsHtml = vacantBeds.map(b => `<option value="${b.id}">${b.name}</option>`).join('');
    } else {
        bedOptionsHtml = `<option value="" disabled selected>No vacant beds available</option>`;
    }

    const modal = document.getElementById('modal-container');
    modal.innerHTML = `
        <div class="modal-backdrop" onclick="closeModal(event)">
            <div class="modal-dialog">
                <div class="modal-header">
                    <h3 class="modal-title">Add Resident to Room ${room.roomNumber}</h3>
                    <button class="modal-close-btn" onclick="closeModal()">&times;</button>
                </div>
                <div class="modal-body" style="max-height: 70vh; overflow-y: auto;">
                    <form onsubmit="submitAddResident(event, '${roomId}')">
                        
                        <!-- Personal Information -->
                        <h4 style="margin: 10px 0 16px 0; font-size: 14px; font-weight: 600; color: var(--text-main); border-bottom: 1px solid var(--border-color); padding-bottom: 8px;">Personal Information</h4>
                        <div class="form-grid">
                            <div class="form-group">
                                <label class="form-label">Full Name</label>
                                <input type="text" name="name" class="form-input" required placeholder="Enter full name">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Date of Birth</label>
                                <input type="date" name="dob" class="form-input">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Gender</label>
                                <select name="gender" class="form-select">
                                    <option value="Male">Male</option>
                                    <option value="Female">Female</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Occupation</label>
                                <input type="text" name="occupation" class="form-input" placeholder="e.g. Student, Engineer">
                            </div>
                        </div>

                        <!-- Contact Information -->
                        <h4 style="margin: 24px 0 16px 0; font-size: 14px; font-weight: 600; color: var(--text-main); border-bottom: 1px solid var(--border-color); padding-bottom: 8px;">Contact Information</h4>
                        <div class="form-grid">
                            <div class="form-group">
                                <label class="form-label">Phone Number</label>
                                <input type="tel" name="phone" class="form-input" required placeholder="+91...">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Email</label>
                                <input type="email" name="email" class="form-input" placeholder="Email address">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Emergency Contact Name</label>
                                <input type="text" name="emergencyContactName" class="form-input" placeholder="Name">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Emergency Contact Phone</label>
                                <input type="tel" name="emergencyContactPhone" class="form-input" placeholder="Phone">
                            </div>
                        </div>

                        <!-- Stay Information -->
                        <h4 style="margin: 24px 0 16px 0; font-size: 14px; font-weight: 600; color: var(--text-main); border-bottom: 1px solid var(--border-color); padding-bottom: 8px;">Stay Information</h4>
                        <div class="form-grid">
                            <div class="form-group">
                                <label class="form-label">Bed Allocation</label>
                                <select name="bedId" class="form-select" required ${vacantBeds.length === 0 ? 'disabled' : ''}>
                                    ${bedOptionsHtml}
                                </select>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Joining Date</label>
                                <input type="date" name="joiningDate" class="form-input" required value="${new Date().toISOString().split('T')[0]}">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Monthly Rent (₹)</label>
                                <input type="number" name="monthlyRent" class="form-input" required value="${room.type === 'Single Sharing' ? 25000 : room.type === 'Double Sharing' ? 14000 : 8000}">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Deposit (₹)</label>
                                <input type="number" name="deposit" class="form-input" required value="0">
                            </div>
                        </div>

                        <!-- Address & Documents -->
                        <h4 style="margin: 24px 0 16px 0; font-size: 14px; font-weight: 600; color: var(--text-main); border-bottom: 1px solid var(--border-color); padding-bottom: 8px;">Address & Documents</h4>
                        <div class="form-grid">
                            <div class="form-group col-span-2">
                                <label class="form-label">Permanent Address</label>
                                <input type="text" name="currentAddress" class="form-input" placeholder="Full address">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Pincode</label>
                                <input type="text" name="pincode" class="form-input" placeholder="Pincode">
                            </div>
                            <div class="form-group">
                                <label class="form-label">ID Proof Type</label>
                                <select name="idProofType" class="form-select">
                                    <option value="Aadhaar">Aadhaar</option>
                                    <option value="PAN">PAN</option>
                                    <option value="Passport">Passport</option>
                                </select>
                            </div>
                            <div class="form-group col-span-2">
                                <label class="form-label">ID Proof Number</label>
                                <input type="text" name="idProofNumber" class="form-input" placeholder="ID Number">
                            </div>
                        </div>

                        <div class="modal-footer" style="padding:16px 0 0 0; margin-top:24px; background:none;">
                            <button type="button" class="btn btn-secondary" onclick="openRoomInfoModal('${roomId}')">Cancel</button>
                            <button type="submit" class="btn btn-primary" ${vacantBeds.length === 0 ? 'disabled' : ''}>Add Resident</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;
    lucide.createIcons();
}

async function submitAddResident(e, roomId) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target).entries());
    const bedId = data.bedId;
    delete data.bedId; // Don't save bedId directly on resident in db if it uses relations, but actually we do link bed to resident. 
    // In this mock DB, bed stores residentId, and resident doesn't necessarily store bedId, but let's check.
    
    data.id = 'res_' + Date.now();
    data.propertyId = window.state.currentPropertyId;
    data.status = 'Active';
    data.securityDeposit = data.deposit;
    
    try {
        // 1. Add resident
        const residents = window.db.get('residents');
        residents.push(data);
        window.db.set('residents', residents);
        
        // 2. Update bed
        const beds = window.db.get('beds');
        const bedIndex = beds.findIndex(b => b.id === bedId);
        if(bedIndex > -1) {
            beds[bedIndex].status = 'Occupied';
            beds[bedIndex].residentId = data.id;
            window.db.set('beds', beds);
        }
        
        showToast('Resident added successfully!');
        
        // Refresh room info modal to see changes
        openRoomInfoModal(roomId);
        
        // If we're on the dashboard, refresh the matrix
        if(window.state.currentPage === 'dashboard') {
            await renderDashboard();
        }
    } catch (err) {
        alert(err.message);
    }
}
