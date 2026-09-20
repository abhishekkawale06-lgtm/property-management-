import sys

with open('app.js', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update Resident Profile
profile_target = """                                <div>
                                    <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 4px;">Aadhaar Number</div>
                                    <div style="font-weight: 500; color: var(--text-main);">${resident.aadhaarNumber || 'Not provided'}</div>
                                </div>
                                <div>
                                    <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 4px;">PAN Number</div>
                                    <div style="font-weight: 500; color: var(--text-main);">${resident.panNumber || 'Not provided'}</div>
                                </div>"""
profile_replacement = """                                <div>
                                    <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 4px;">Aadhaar Number</div>
                                    <div style="font-weight: 500; color: var(--text-main);">${resident.aadhaarNumber || 'Not provided'}</div>
                                    <a href="#" onclick="showToast('Viewing Aadhaar Document...'); return false;" style="font-size: 11px; color: var(--primary); text-decoration: none; margin-top: 6px; display: inline-flex; align-items: center; gap: 4px;"><i data-lucide="eye" style="width: 12px; height: 12px;"></i> View Image</a>
                                </div>
                                <div>
                                    <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 4px;">PAN Number</div>
                                    <div style="font-weight: 500; color: var(--text-main);">${resident.panNumber || 'Not provided'}</div>
                                    <a href="#" onclick="showToast('Viewing PAN Document...'); return false;" style="font-size: 11px; color: var(--primary); text-decoration: none; margin-top: 6px; display: inline-flex; align-items: center; gap: 4px;"><i data-lucide="eye" style="width: 12px; height: 12px;"></i> View Image</a>
                                </div>"""

# 2. Update Edit Resident
edit_target = """                            <div class="form-group">
                                <label class="form-label">Aadhaar Number <span style="color:red;">*</span></label>
                                <input type="text" name="aadhaarNumber" class="form-input" value="${res.aadhaarNumber || ''}" required>
                            </div>
                            <div class="form-group">
                                <label class="form-label">PAN Number <span style="color:red;">*</span></label>
                                <input type="text" name="panNumber" class="form-input" value="${res.panNumber || ''}" required>
                            </div>"""
edit_replacement = """                            <div class="form-group">
                                <label class="form-label">Aadhaar Number <span style="color:red;">*</span></label>
                                <input type="text" name="aadhaarNumber" class="form-input" value="${res.aadhaarNumber || ''}" required>
                                <div style="margin-top: 8px; display: flex; align-items: center; justify-content: space-between;">
                                    <input type="file" name="aadhaarDoc" class="form-input" accept="image/*,.pdf" style="padding: 4px; font-size: 11px; width: calc(100% - 80px);">
                                    <button type="button" class="btn btn-secondary btn-sm" onclick="showToast('Viewing Document...')" style="padding: 4px 8px; font-size: 11px;">View</button>
                                </div>
                            </div>
                            <div class="form-group">
                                <label class="form-label">PAN Number <span style="color:red;">*</span></label>
                                <input type="text" name="panNumber" class="form-input" value="${res.panNumber || ''}" required>
                                <div style="margin-top: 8px; display: flex; align-items: center; justify-content: space-between;">
                                    <input type="file" name="panDoc" class="form-input" accept="image/*,.pdf" style="padding: 4px; font-size: 11px; width: calc(100% - 80px);">
                                    <button type="button" class="btn btn-secondary btn-sm" onclick="showToast('Viewing Document...')" style="padding: 4px 8px; font-size: 11px;">View</button>
                                </div>
                            </div>"""

# 3. Update Add Resident
add_target = """                            <div class="form-group">
                                <label class="form-label">Aadhaar Number <span style="color:red;">*</span></label>
                                <input type="text" name="aadhaarNumber" class="form-input" placeholder="12-digit Aadhaar" required>
                            </div>
                            <div class="form-group">
                                <label class="form-label">PAN Number <span style="color:red;">*</span></label>
                                <input type="text" name="panNumber" class="form-input" placeholder="10-character PAN" required>
                            </div>"""
add_replacement = """                            <div class="form-group">
                                <label class="form-label">Aadhaar Number <span style="color:red;">*</span></label>
                                <input type="text" name="aadhaarNumber" class="form-input" placeholder="12-digit Aadhaar" required>
                                <div style="margin-top: 8px;">
                                    <label style="font-size: 11px; color: var(--text-muted); display: block; margin-bottom: 4px;">Upload Document (Image/PDF)</label>
                                    <input type="file" name="aadhaarDoc" class="form-input" accept="image/*,.pdf" style="padding: 4px; font-size: 11px;">
                                </div>
                            </div>
                            <div class="form-group">
                                <label class="form-label">PAN Number <span style="color:red;">*</span></label>
                                <input type="text" name="panNumber" class="form-input" placeholder="10-character PAN" required>
                                <div style="margin-top: 8px;">
                                    <label style="font-size: 11px; color: var(--text-muted); display: block; margin-bottom: 4px;">Upload Document (Image/PDF)</label>
                                    <input type="file" name="panDoc" class="form-input" accept="image/*,.pdf" style="padding: 4px; font-size: 11px;">
                                </div>
                            </div>"""

content = content.replace(profile_target, profile_replacement)
content = content.replace(edit_target, edit_replacement)
content = content.replace(add_target, add_replacement)

with open('app.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("Updated ID proofs successfully")
