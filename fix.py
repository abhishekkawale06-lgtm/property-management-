import sys

with open('app.js', 'r', encoding='utf-8') as f:
    content = f.read()

target = """                            <div class="form-group">
                                <label class="form-label">ID Proof Type</label>
                                <select name="idProofType" class="form-select">
                        </div>"""

replacement = """                            <div class="form-group">
                                <label class="form-label">Aadhaar Number <span style="color:red;">*</span></label>
                                <input type="text" name="aadhaarNumber" class="form-input" placeholder="12-digit Aadhaar" required>
                            </div>
                            <div class="form-group">
                                <label class="form-label">PAN Number <span style="color:red;">*</span></label>
                                <input type="text" name="panNumber" class="form-input" placeholder="10-character PAN" required>
                            </div>
                        </div>

                        <div class="modal-footer" style="padding:16px 0 0 0; margin-top:24px; background:none;">
                            <button type="button" class="btn btn-secondary" onclick="openRoomInfoModal('${roomId}')">Cancel</button>
                            <button type="submit" class="btn btn-primary" ${vacantBeds.length === 0 ? 'disabled' : ''}>Add Resident</button>
                        </div>"""

if target in content:
    content = content.replace(target, replacement)
    with open('app.js', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Replaced successfully")
else:
    print("Target not found")
