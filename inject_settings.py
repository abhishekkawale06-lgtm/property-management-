import re

# ==========================================
# 1. Update styles.css for Themes and OTP
# ==========================================
with open('styles.css', 'r', encoding='utf-8') as f:
    css_content = f.read()

dark_theme_css = """
/* Dark Theme Overrides */
:root[data-theme="dark"] {
    --bg-main: #0f172a;
    --sidebar-bg: #1e293b;
    --sidebar-text: #cbd5e1;
    --card-bg: #1e293b;
    --text-main: #f8fafc;
    --text-muted: #94a3b8;
    --border-color: #334155;
    --input-bg: #0f172a;
}
:root[data-theme="dark"] body {
    background-color: var(--bg-main);
    color: var(--text-main);
}
:root[data-theme="dark"] .card {
    background-color: var(--card-bg);
    border-color: var(--border-color);
}
:root[data-theme="dark"] .form-control, 
:root[data-theme="dark"] .form-control:focus {
    background-color: var(--input-bg);
    color: var(--text-main);
    border-color: var(--border-color);
}
:root[data-theme="dark"] .modal-dialog {
    background-color: var(--card-bg);
}
:root[data-theme="dark"] .data-table th {
    background-color: #334155;
    color: #e2e8f0;
}
:root[data-theme="dark"] .data-table td {
    border-color: var(--border-color);
}
:root[data-theme="dark"] .sidebar {
    background-color: var(--sidebar-bg);
    border-color: var(--border-color);
}

/* Settings & OTP Styles */
.settings-section-card {
    margin-bottom: 24px;
    border-radius: 12px;
    background-color: var(--card-bg);
    border: 1px solid var(--border-color);
    box-shadow: 0 1px 3px rgba(0,0,0,0.05);
}
.settings-section-header {
    padding: 20px 24px;
    border-bottom: 1px solid var(--border-color);
}
.settings-section-title {
    font-size: 16px;
    font-weight: 700;
    color: var(--text-main);
    margin: 0;
}
.settings-section-desc {
    font-size: 13px;
    color: var(--text-muted);
    margin: 4px 0 0 0;
}
.settings-section-body {
    padding: 24px;
}
.settings-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 0;
    border-bottom: 1px solid var(--border-color);
}
.settings-row:last-child {
    border-bottom: none;
    padding-bottom: 0;
}
.settings-row-info h4 {
    margin: 0 0 4px 0;
    font-size: 14px;
    color: var(--text-main);
}
.settings-row-info p {
    margin: 0;
    font-size: 13px;
    color: var(--text-muted);
}
.otp-input-container {
    display: flex;
    gap: 12px;
    justify-content: center;
    margin: 24px 0;
}
.otp-input {
    width: 48px;
    height: 56px;
    font-size: 24px;
    font-weight: 700;
    text-align: center;
    border: 1px solid var(--border-color);
    border-radius: 8px;
    background-color: var(--card-bg);
    color: var(--text-main);
}
.otp-input:focus {
    border-color: var(--primary);
    outline: none;
    box-shadow: 0 0 0 3px rgba(67, 56, 202, 0.2);
}
.pwd-req-list {
    margin: 12px 0 0 0;
    padding-left: 20px;
    font-size: 12px;
    color: var(--text-muted);
}
"""
if "/* Dark Theme Overrides */" not in css_content:
    with open('styles.css', 'a', encoding='utf-8') as f:
        f.write("\n" + dark_theme_css)
    print("Added CSS for Settings & Themes")


# ==========================================
# 2. Update app.js 
# ==========================================
with open('app.js', 'r', encoding='utf-8') as f:
    app_js = f.read()

# Route update
if "case 'settings':" not in app_js:
    app_js = app_js.replace("case 'reports':\n            renderReportsView(container);\n            break;", "case 'reports':\n            renderReportsView(container);\n            break;\n        case 'settings':\n            renderSettingsView(container);\n            break;")
    print("Updated renderActiveView routing")

settings_js = """
// =========================================================================
// SETTINGS VIEW & LOGIC
// =========================================================================

function renderSettingsView(container) {
    const settings = window.db.get('settings') || {};
    const ownerName = settings.ownerName || 'Admin User';
    const companyName = settings.companyName || 'PG Management Co.';
    const email = settings.email || 'admin@example.com';
    const phone = settings.phone || '+91 9876543210';
    
    // Check saved theme
    const currentTheme = localStorage.getItem('pg_theme') || 'system';

    container.innerHTML = `
        <div class="filter-bar">
            <div class="filter-bar-left">
                <span style="font-weight:700; font-size:18px;">Application Settings</span>
            </div>
        </div>

        <div style="max-width: 800px; margin: 0 auto 40px auto;">
            
            <!-- 1. Account & Profile -->
            <div class="settings-section-card">
                <div class="settings-section-header" style="display:flex; justify-content:space-between; align-items:center;">
                    <div>
                        <h3 class="settings-section-title">Account & Profile</h3>
                        <p class="settings-section-desc">Manage your personal and business contact details.</p>
                    </div>
                    <button class="btn btn-secondary btn-sm" onclick="openEditProfileModal()">Edit Profile</button>
                </div>
                <div class="settings-section-body">
                    <div class="settings-row" style="padding-top:0;">
                        <div class="settings-row-info">
                            <h4>Owner Name</h4>
                            <p>${ownerName}</p>
                        </div>
                    </div>
                    <div class="settings-row">
                        <div class="settings-row-info">
                            <h4>Business / Company Name</h4>
                            <p>${companyName}</p>
                        </div>
                    </div>
                    <div class="settings-row">
                        <div class="settings-row-info">
                            <h4>Email Address</h4>
                            <p>${email}</p>
                        </div>
                    </div>
                    <div class="settings-row">
                        <div class="settings-row-info">
                            <h4>Phone Number</h4>
                            <p>${phone}</p>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 2. Security -->
            <div class="settings-section-card">
                <div class="settings-section-header" style="display:flex; justify-content:space-between; align-items:center;">
                    <div>
                        <h3 class="settings-section-title">Security</h3>
                        <p class="settings-section-desc">Manage your password and account security.</p>
                    </div>
                    <button class="btn btn-secondary btn-sm" onclick="openChangePasswordModal()">Change Password</button>
                </div>
                <div class="settings-section-body">
                    <div class="settings-row" style="padding-top:0; border-bottom:none;">
                        <div class="settings-row-info">
                            <h4>Account Password</h4>
                            <p>Last changed: Never</p>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 3. General & Appearance -->
            <div class="settings-section-card">
                <div class="settings-section-header">
                    <h3 class="settings-section-title">General & Appearance</h3>
                    <p class="settings-section-desc">Customize how the application looks and formats data.</p>
                </div>
                <div class="settings-section-body">
                    <div class="settings-row" style="padding-top:0;">
                        <div class="settings-row-info">
                            <h4>Theme</h4>
                            <p>Select your preferred color scheme</p>
                        </div>
                        <div>
                            <select class="form-control" style="width: 200px;" onchange="applyTheme(this.value)">
                                <option value="light" ${currentTheme === 'light' ? 'selected' : ''}>Light Mode</option>
                                <option value="dark" ${currentTheme === 'dark' ? 'selected' : ''}>Dark Mode</option>
                                <option value="system" ${currentTheme === 'system' ? 'selected' : ''}>System Default</option>
                            </select>
                        </div>
                    </div>
                    <div class="settings-row">
                        <div class="settings-row-info">
                            <h4>Currency</h4>
                            <p>Base currency for all financial data</p>
                        </div>
                        <div>
                            <select class="form-control" style="width: 200px;" disabled>
                                <option value="INR">₹ INR (Indian Rupee)</option>
                            </select>
                        </div>
                    </div>
                    <div class="settings-row" style="border-bottom:none;">
                        <div class="settings-row-info">
                            <h4>Date Format</h4>
                            <p>Display format for dates</p>
                        </div>
                        <div>
                            <select class="form-control" style="width: 200px;" disabled>
                                <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 4. Subscription Plan -->
            <div class="settings-section-card">
                <div class="settings-section-header" style="display:flex; justify-content:space-between; align-items:center;">
                    <div>
                        <h3 class="settings-section-title">Subscription Plan</h3>
                        <p class="settings-section-desc">Manage your PG Manager SaaS subscription.</p>
                    </div>
                    <button class="btn btn-primary btn-sm">Upgrade Plan</button>
                </div>
                <div class="settings-section-body">
                    <div style="background-color: var(--bg-main); padding: 16px; border-radius: 8px; border: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <span style="display:inline-block; padding:4px 8px; background-color:#dbeafe; color:#1e40af; border-radius:4px; font-size:11px; font-weight:700; text-transform:uppercase; margin-bottom:8px;">Active</span>
                            <h4 style="margin:0 0 4px 0; font-size:16px;">Professional Plan</h4>
                            <p style="margin:0; font-size:13px; color:var(--text-muted);">Renews on October 15, 2026</p>
                        </div>
                        <div style="text-align: right;">
                            <p style="margin:0 0 4px 0; font-size:13px; color:var(--text-muted);">Properties Usage</p>
                            <h4 style="margin:0; font-size:16px;">3 / 5 Included</h4>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 5. Logout -->
            <div style="text-align: center; margin-top: 40px;">
                <button class="btn" style="background-color: #fef2f2; color: #ef4444; border: 1px solid #fecaca; padding: 12px 32px; font-weight: 600; border-radius: 8px;" onclick="openLogoutModal()">
                    <i data-lucide="log-out" style="width:16px; height:16px; display:inline-block; vertical-align:middle; margin-right:8px;"></i>
                    Log Out of PG Manager
                </button>
            </div>
            
        </div>
    `;
}

// --- Settings Modals & Logic ---

function applyTheme(themeName) {
    localStorage.setItem('pg_theme', themeName);
    if (themeName === 'dark' || (themeName === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.documentElement.setAttribute('data-theme', 'dark');
    } else {
        document.documentElement.removeAttribute('data-theme');
    }
    showToast('Theme updated successfully', 'success');
}

// Apply theme on load
(function() {
    const savedTheme = localStorage.getItem('pg_theme') || 'system';
    if (savedTheme === 'dark' || (savedTheme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.documentElement.setAttribute('data-theme', 'dark');
    }
})();

function openEditProfileModal() {
    const settings = window.db.get('settings') || {};
    const modal = document.getElementById('modal-container');
    modal.innerHTML = `
        <div class="modal-backdrop" onclick="closeModal(event)">
            <div class="modal-dialog">
                <div class="modal-header">
                    <h3 class="modal-title">Edit Account Profile</h3>
                    <button class="modal-close-btn" onclick="closeModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <form id="form-edit-profile" onsubmit="submitEditProfile(event)">
                        <div class="form-group">
                            <label class="form-label">Owner Name</label>
                            <input type="text" id="prof_owner" class="form-control" required value="${settings.ownerName || ''}">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Business / Company Name</label>
                            <input type="text" id="prof_company" class="form-control" required value="${settings.companyName || ''}">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Email Address</label>
                            <input type="email" id="prof_email" class="form-control" required value="${settings.email || ''}">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Phone Number</label>
                            <input type="tel" id="prof_phone" class="form-control" required value="${settings.phone || ''}">
                        </div>
                        <div class="modal-actions">
                            <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
                            <button type="submit" class="btn btn-primary">Save Changes</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;
}

async function submitEditProfile(e) {
    e.preventDefault();
    const payload = {
        ownerName: document.getElementById('prof_owner').value,
        companyName: document.getElementById('prof_company').value,
        email: document.getElementById('prof_email').value,
        phone: document.getElementById('prof_phone').value
    };
    
    // Simulate API call since settings update isn't fully implemented
    await new Promise(r => setTimeout(r, 600));
    
    let settings = window.db.get('settings') || {};
    Object.assign(settings, payload);
    window.db.state.settings = settings; // Mock update
    
    showToast('Profile updated successfully', 'success');
    closeModal();
    renderSettingsView(document.getElementById('view-container'));
}

// --- Security / OTP Flow ---

function openChangePasswordModal() {
    const modal = document.getElementById('modal-container');
    modal.innerHTML = `
        <div class="modal-backdrop" onclick="closeModal(event)">
            <div class="modal-dialog">
                <div class="modal-header">
                    <h3 class="modal-title">Change Password</h3>
                    <button class="modal-close-btn" onclick="closeModal()">&times;</button>
                </div>
                <div class="modal-body" id="pwd-step-1">
                    <form onsubmit="submitChangePasswordStep1(event)">
                        <div class="form-group">
                            <label class="form-label">Current Password</label>
                            <input type="password" id="pwd_current" class="form-control" required>
                        </div>
                        <div class="form-group">
                            <label class="form-label">New Password</label>
                            <input type="password" id="pwd_new" class="form-control" required oninput="checkPasswordRequirements()">
                            <ul class="pwd-req-list" id="pwd-req-list">
                                <li id="req-length">Minimum 8 characters</li>
                                <li id="req-upper">At least one uppercase letter</li>
                                <li id="req-lower">At least one lowercase letter</li>
                                <li id="req-number">At least one number</li>
                                <li id="req-special">At least one special character</li>
                            </ul>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Confirm New Password</label>
                            <input type="password" id="pwd_confirm" class="form-control" required>
                        </div>
                        <div id="pwd-error" style="color: #ef4444; font-size: 13px; margin-bottom: 16px; display: none;"></div>
                        <div class="modal-actions">
                            <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
                            <button type="submit" class="btn btn-primary" id="btn-pwd-next" disabled>Next: Verify OTP</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;
}

function checkPasswordRequirements() {
    const val = document.getElementById('pwd_new').value;
    const btn = document.getElementById('btn-pwd-next');
    
    const reqs = {
        length: val.length >= 8,
        upper: /[A-Z]/.test(val),
        lower: /[a-z]/.test(val),
        number: /[0-9]/.test(val),
        special: /[^A-Za-z0-9]/.test(val)
    };
    
    let allValid = true;
    for (const [key, isValid] of Object.entries(reqs)) {
        const el = document.getElementById(`req-${key}`);
        if (isValid) {
            el.style.color = '#10b981'; // Green
        } else {
            el.style.color = 'var(--text-muted)';
            allValid = false;
        }
    }
    
    btn.disabled = !allValid;
    return allValid;
}

async function submitChangePasswordStep1(e) {
    e.preventDefault();
    const curr = document.getElementById('pwd_current').value;
    const newP = document.getElementById('pwd_new').value;
    const conf = document.getElementById('pwd_confirm').value;
    const err = document.getElementById('pwd-error');
    
    if (newP !== conf) {
        err.textContent = "New passwords do not match.";
        err.style.display = 'block';
        return;
    }
    
    // Simulate checking current password (accepting any for prototype)
    err.style.display = 'none';
    const btn = document.getElementById('btn-pwd-next');
    btn.textContent = 'Sending OTP...';
    btn.disabled = true;
    
    await new Promise(r => setTimeout(r, 1000));
    
    const settings = window.db.get('settings') || {};
    const phone = settings.phone || '+91 *******210';
    showOTPVerification(phone);
}

let otpTimerInterval;
let otpAttemptCount = 0;

function showOTPVerification(phoneMasked) {
    const body = document.querySelector('.modal-dialog .modal-body');
    body.innerHTML = `
        <div style="text-align: center; padding: 10px 0;">
            <div style="width: 48px; height: 48px; background-color: #e0e7ff; color: #4338ca; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px auto;">
                <i data-lucide="smartphone" style="width:24px; height:24px;"></i>
            </div>
            <h4 style="font-size: 18px; margin: 0 0 8px 0;">Verify OTP</h4>
            <p style="font-size: 14px; color: var(--text-muted); margin: 0;">Enter the 4-digit code sent to<br><strong>${phoneMasked}</strong></p>
            
            <form onsubmit="verifyOTP(event)">
                <div class="otp-input-container">
                    <input type="text" class="otp-input" maxlength="1" onkeyup="focusNextOTP(this, 'otp2')" id="otp1" required autocomplete="off">
                    <input type="text" class="otp-input" maxlength="1" onkeyup="focusNextOTP(this, 'otp3')" id="otp2" required autocomplete="off">
                    <input type="text" class="otp-input" maxlength="1" onkeyup="focusNextOTP(this, 'otp4')" id="otp3" required autocomplete="off">
                    <input type="text" class="otp-input" maxlength="1" onkeyup="focusNextOTP(this, '')" id="otp4" required autocomplete="off">
                </div>
                
                <div id="otp-error" style="color: #ef4444; font-size: 13px; margin-bottom: 16px; display: none;"></div>
                
                <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 24px;">
                    Code expires in <span id="otp-timer" style="font-weight:700; color:var(--primary);">02:00</span>
                </p>
                
                <button type="submit" class="btn btn-primary" style="width:100%; margin-bottom: 16px;" id="btn-verify-otp">Verify & Change Password</button>
                
                <p style="font-size: 13px; color: var(--text-muted); margin: 0;">
                    Didn't receive code? <a href="#" onclick="resendOTP()" style="color: var(--primary); font-weight: 600; text-decoration: none;" id="btn-resend-otp" disabled>Resend Code</a>
                </p>
            </form>
        </div>
    `;
    lucide.createIcons();
    setTimeout(() => document.getElementById('otp1').focus(), 100);
    startOTPTimer();
}

function focusNextOTP(current, nextId) {
    if (current.value.length === 1 && nextId) {
        document.getElementById(nextId).focus();
    }
}

function startOTPTimer() {
    clearInterval(otpTimerInterval);
    let timeLeft = 120; // 2 minutes
    const timerDisplay = document.getElementById('otp-timer');
    const resendBtn = document.getElementById('btn-resend-otp');
    
    if(resendBtn) {
        resendBtn.style.opacity = '0.5';
        resendBtn.style.pointerEvents = 'none';
    }

    otpTimerInterval = setInterval(() => {
        timeLeft--;
        if(timerDisplay) {
            const m = Math.floor(timeLeft / 60).toString().padStart(2, '0');
            const s = (timeLeft % 60).toString().padStart(2, '0');
            timerDisplay.textContent = `${m}:${s}`;
        }
        
        if (timeLeft <= 0) {
            clearInterval(otpTimerInterval);
            if(timerDisplay) {
                timerDisplay.textContent = 'Expired';
                timerDisplay.style.color = '#ef4444';
            }
            if(resendBtn) {
                resendBtn.style.opacity = '1';
                resendBtn.style.pointerEvents = 'auto';
            }
            const err = document.getElementById('otp-error');
            if(err) {
                err.textContent = "OTP has expired. Please resend.";
                err.style.display = 'block';
            }
        }
    }, 1000);
}

function resendOTP() {
    startOTPTimer();
    document.getElementById('otp1').value = '';
    document.getElementById('otp2').value = '';
    document.getElementById('otp3').value = '';
    document.getElementById('otp4').value = '';
    document.getElementById('otp-error').style.display = 'none';
    showToast('A new OTP has been sent.', 'info');
    document.getElementById('otp1').focus();
}

async function verifyOTP(e) {
    e.preventDefault();
    const btn = document.getElementById('btn-verify-otp');
    const err = document.getElementById('otp-error');
    
    const o1 = document.getElementById('otp1').value;
    const o2 = document.getElementById('otp2').value;
    const o3 = document.getElementById('otp3').value;
    const o4 = document.getElementById('otp4').value;
    const otp = o1+o2+o3+o4;
    
    if(otp.length !== 4) return;
    
    btn.textContent = 'Verifying...';
    btn.disabled = true;
    err.style.display = 'none';
    
    await new Promise(r => setTimeout(r, 1000));
    
    // Simulate failure on "0000" or too many attempts
    otpAttemptCount++;
    if (otpAttemptCount > 3) {
        err.textContent = "Too many failed attempts. Please restart the process.";
        err.style.display = 'block';
        btn.textContent = 'Verify & Change Password';
        btn.disabled = true;
        clearInterval(otpTimerInterval);
        return;
    }
    
    if (otp === '0000') {
        err.textContent = "Incorrect OTP. Please try again.";
        err.style.display = 'block';
        btn.textContent = 'Verify & Change Password';
        btn.disabled = false;
        return;
    }
    
    // Success flow
    clearInterval(otpTimerInterval);
    const body = document.querySelector('.modal-dialog .modal-body');
    body.innerHTML = `
        <div style="text-align: center; padding: 20px 0;">
            <div style="width: 64px; height: 64px; background-color: #d1fae5; color: #10b981; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px auto;">
                <i data-lucide="check-circle" style="width:32px; height:32px;"></i>
            </div>
            <h4 style="font-size: 20px; margin: 0 0 8px 0; color: #10b981;">Password Updated</h4>
            <p style="font-size: 14px; color: var(--text-muted); margin: 0 0 24px 0;">Your account password has been changed successfully.</p>
            <button class="btn btn-primary" onclick="closeModal()">Done</button>
        </div>
    `;
    lucide.createIcons();
    otpAttemptCount = 0;
}

// --- Logout Flow ---
function openLogoutModal() {
    const modal = document.getElementById('modal-container');
    modal.innerHTML = `
        <div class="modal-backdrop" onclick="closeModal(event)">
            <div class="modal-dialog" style="max-width: 400px; text-align: center;">
                <div class="modal-body" style="padding: 32px 24px;">
                    <div style="width: 56px; height: 56px; background-color: #fef2f2; color: #ef4444; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px auto;">
                        <i data-lucide="log-out" style="width:28px; height:28px;"></i>
                    </div>
                    <h3 style="font-size: 20px; margin: 0 0 8px 0;">Log Out</h3>
                    <p style="font-size: 14px; color: var(--text-muted); margin: 0 0 24px 0;">Are you sure you want to log out of your account?</p>
                    <div style="display: flex; gap: 12px; justify-content: center;">
                        <button class="btn btn-secondary" style="flex:1;" onclick="closeModal()">Cancel</button>
                        <button class="btn" style="flex:1; background-color: #ef4444; color: white; border:none;" onclick="confirmLogout()">Log Out</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    lucide.createIcons();
}

function confirmLogout() {
    closeModal();
    // Simulate secure session end
    document.body.innerHTML = `
        <div style="height: 100vh; width: 100vw; display: flex; flex-direction: column; align-items: center; justify-content: center; background-color: #f8fafc; font-family: 'Inter', sans-serif;">
            <div style="width: 64px; height: 64px; background-color: #3b3486; color: white; border-radius: 16px; display: flex; align-items: center; justify-content: center; margin-bottom: 24px;">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
            </div>
            <h2 style="margin: 0 0 8px 0; color: #0f172a;">You have been logged out</h2>
            <p style="color: #64748b; margin: 0 0 24px 0;">Thank you for using PG Manager SaaS.</p>
            <button onclick="window.location.reload()" style="background-color: #3b3486; color: white; border: none; padding: 10px 24px; border-radius: 6px; cursor: pointer; font-weight: 600;">Return to Login</button>
        </div>
    `;
}
"""

if "function renderSettingsView(" not in app_js:
    app_js = app_js + "\n" + settings_js
    with open('app.js', 'w', encoding='utf-8') as f:
        f.write(app_js)
    print("Added Settings logic to app.js")

