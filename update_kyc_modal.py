import sys

with open('app.js', 'r', encoding='utf-8') as f:
    content = f.read()

target = '''                    <h3 class="modal-title">KYC Document Verification: ${res.name}</h3>
                    <button class="modal-close-btn" onclick="closeModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <div style="background:var(--bg-main); border:1px solid var(--border-color); padding:16px; border-radius:8px; margin-bottom:18px;">
                        <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
                            <span style="color:var(--text-muted);">Document Type:</span>
                            <strong>${res.idProofType || 'Aadhaar Card'}</strong>
                        </div>
                        <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
                            <span style="color:var(--text-muted);">Document ID Number:</span>
                            <strong style="letter-spacing:1px;">${res.idProofNumber || 'Not provided'}</strong>
                        </div>
                        <div style="display:flex; justify-content:space-between;">
                            <span style="color:var(--text-muted);">Current Verification:</span>
                            <span class="badge ${res.kycStatus === 'Verified' ? 'badge-success' : 'badge-warning'}">${res.kycStatus}</span>
                        </div>
                    </div>

                    <div style="border:2px dashed var(--border-color); border-radius:8px; padding:24px; text-align:center; color:var(--text-muted); margin-bottom:18px;">
                        <i data-lucide="shield-check" style="width:36px; height:36px; color:var(--primary); margin-bottom:8px;"></i>
                        <p style="font-size:12.5px;">Ready for UIDAI / Digilocker e-KYC Integration API hook.</p>
                        <span style="font-size:11px; color:var(--text-light);">Document hash signature verified</span>
                    </div>'''

replacement = '''                    <h3 class="modal-title">View Documents: ${res.name}</h3>
                    <button class="modal-close-btn" onclick="closeModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <div style="background:var(--bg-main); border:1px solid var(--border-color); padding:16px; border-radius:8px; margin-bottom:18px;">
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                            <div>
                                <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 4px;">Aadhaar Number</div>
                                <div style="font-weight: 500; color: var(--text-main);">${res.aadhaarNumber || 'Not provided'}</div>
                                <a href="#" onclick="window.open('demo_aadhaar.webp', '_blank', 'width=700,height=500,menubar=no,toolbar=no,location=no,status=no'); return false;" style="font-size: 11px; color: var(--primary); text-decoration: none; margin-top: 6px; display: inline-flex; align-items: center; gap: 4px;"><i data-lucide="eye" style="width: 12px; height: 12px;"></i> View Image</a>
                            </div>
                            <div>
                                <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 4px;">PAN Number</div>
                                <div style="font-weight: 500; color: var(--text-main);">${res.panNumber || 'Not provided'}</div>
                                <a href="#" onclick="window.open('demo_pan.jpg', '_blank', 'width=700,height=500,menubar=no,toolbar=no,location=no,status=no'); return false;" style="font-size: 11px; color: var(--primary); text-decoration: none; margin-top: 6px; display: inline-flex; align-items: center; gap: 4px;"><i data-lucide="eye" style="width: 12px; height: 12px;"></i> View Image</a>
                            </div>
                        </div>
                    </div>'''

if target in content:
    content = content.replace(target, replacement)
    with open('app.js', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Replaced KYC Modal")
else:
    print("Target not found")
