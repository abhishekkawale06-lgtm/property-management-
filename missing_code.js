
> function openSettingsModal() {
      const settings = window.db.get('settings') || {};
      const staff = window.db.get('staff') || [];
      const notices = window.db.get('notices') || [];
  
      const modal = document.getElementById('modal-container');
      modal.innerHTML = `
          <div class="modal-backdrop" onclick="closeModal(event)">
              <div class="modal-dialog modal-lg">
                  <div class="modal-header">
                      <h3 class="modal-title">System Settings & Operations</h3>
                      <button class="modal-close-btn" onclick="closeModal()">&times;</button>
                  </div>
                  <div class="modal-body" style="padding-top:10px;">
                      <!-- Settings Tabs -->
                      <div style="display:flex; border-bottom:1px solid var(--border-color); gap:16px; margin-bottom:20px;">
                          <button class="btn btn-secondary btn-sm" id="tab-btn-business" style="border:none; border-bottom:2px solid var(--primary); border-radius:0;" onclick="switchSettingsTab('business')">Business & Profile</button>
                          <button class="btn btn-secondary btn-sm" id="tab-btn-payment" style="border:none; border-radius:0;" onclick="switchSettingsTab('payment')">Payment & Bank</button>
                          <button class="btn btn-secondary btn-sm" id="tab-btn-staff" style="border:none; border-radius:0;" onclick="switchSettingsTab('staff')">Staff Directory</button>
                          <button class="btn btn-secondary btn-sm" id="tab-btn-notices" style="border:none; border-radius:0;" onclick="switchSettingsTab('notices')">Property Notices</button>
                          <button class="btn btn-secondary btn-sm" id="tab-btn-reset" style="border:none; border-radius:0; color:var(--danger);" onclick="switchSettingsTab('reset')">Reset Database</button>
                      </div>
  
                      <!-- Tab 1: Business Settings -->
                      <div id="settings-tab-business">
                          <form onsubmit="submitUpdateSettings(event)">
                              <div class="form-grid">
                                  <div class="form-group">
                                      <label class="form-label">Business / Brand Name</label>
                                      <input type="text" name="companyName" class="form-input" value="${settings.companyName || 'Urban Stays & Co.'}">
                                  </div>
                                  <div class="form-group">
                                      <label class="form-label">Owner / Manager Name</label>
                                      <input type="text" name="ownerName" class="form-input" value="${settings.ownerName || 'Owner Manager'}">
                                  </div>
                                  <div class="form-group">
                                      <label class="form-label">Contact Phone</label>
                                      <input type="tel" name="phone" class="form-input" value="${settings.phone || '+91 9876543210'}">
                                  </div>
                                  <div class="form-group">
                                      <label class="form-label">Contact Email</label>
                                      <input type="email" name="email" class="form-input" value="${settings.email || 'admin@pgmanager.com'}">
                                  </div>
                                  <div class="form-group col-span-2">
                                      <label class="form-label">Headquarters / Reg. Address</label>
                                      <input type="text" name="address" class="form-input" value="${settings.address || 'Koramangala, Bengaluru, Karnataka'}">
                                  </div>
                                  <div class="form-group">
                                      <label class="form-label">Monthly Rent Due Day</label>
                                      <input type="number" name="rentDueDate" class="form-input" value="${settings.rentDueDate || 5}" min="1" max="28">
                                  </div>
                                  <div class="form-group">
                                      <label class="form-label">Currency Symbol</label>
                                      <input type="text" name="currency" class="form-input" value="${settings.currency || 'Γé╣'}">
                                  </div>
                              </div>
                              <div class="modal-footer" style="padding:16px 0 0 0; margin-top:20px; background:none;">
                                  <button type="submit" class="btn btn-primary">Save Business Settings</button>
                              </div>
                          </form>
                      </div>
  
                      <!-- Tab 2: Payment & Bank -->
                      <div id="settings-tab-payment" style="display:none;">
                          <form onsubmit="submitUpdateSettings(event)">
                              <div class="form-grid">
                                  <div class="form-group col-span-2">
                                      <label class="form-label">Primary Business UPI VPA / ID</label>
                                      <input type="text" name="upiId" class="form-input" value="${settings.upiId || 'urbanstays@upi'}">
                                  </div>
                                  <div class="form-group">
                                      <label class="form-label">Bank Name</label>
                                      <input type="text" name="bankName" class="form-input" value="${settings.bankName || 'HDFC Bank'}">
                                  </div>
                                  <div class="form-group">
                                      <label class="form-label">Account Number</label>
                                      <input type="text" name="accountNumber" class="form-input" value="${settings.accountNumber || '50100234567890'}">
                                  </div>
                                  <div class="form-group">
                                      <label class="form-label">IFSC Code</label>
                                      <input type="text" name="ifscCode" class="form-input" value="${settings.ifscCode || 'HDFC0001234'}">
                                  </div>
                              </div>
                              <div class="modal-footer" style="padding:16px 0 0 0; margin-top:20px; background:none;">
                                  <button type="submit" class="btn btn-primary">Save Payment Settings</button>
                              </div>
                          </form>
                      </div>
  
                      <!-- Tab 3: Staff Management -->
                      <div id="settings-tab-staff" style="display:none;">
                          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px;">
                              <span style="font-weight:600;">PG Staff & Wardens (${staff.length})</span>
                              <button class="btn btn-secondary btn-sm" onclick="openAddStaffModal()">+ Add Staff</button>
                          </div>
                          <div class="table-container">
                              <table class="data-table">
                                  <thead>
                                      <tr>
                                          <th>Name</th>
                                          <th>Role</th>
                                          <th>Phone</th>
                                          <th>Property</th>
                                          <th>Salary</th>
                                      </tr>
                                  </thead>
                                  <tbody>
                                      ${staff.map(s => `
                                          <tr>
                                              <td><strong>${s.name}</strong></td>
                                              <td><span class="badge badge-purple">${s.role}</span></td>
                                              <td>${s.phone}</td>
                                              <td>${s.propertyName || 'All Properties'}</td>
                                              <td>Γé╣${(s.salary || 0).toLocaleString()}</td>
                                          </tr>
                                      `).join('')}
                                  </tbody>
                              </table>
                          </div>
                      </div>
  
                      <!-- Tab 4: Notices -->
                      <div id="settings-tab-notices" style="display:none;">
                          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px;">
                              <span style="font-weight:600;">Published Notices</span>
                              <button class="btn btn-secondary btn-sm" onclick="openNoticeModal()">+ Post Notice</button>
                          </div>
                          <div style="display:flex; flex-direction:column; gap:12px;">
                              ${notices.map(n => `
                                  <div style="background:var(--bg-main); padding:12px; border-radius:8px; border-left:4px solid var(--primary);">
                                      <div style="display:flex; justify-content:space-between;">
                                          <strong>${n.title}</strong>
                                          <span class="badge ${n.priority === 'High' ? 'badge-danger' : 'badge-neutral'}">${n.priority}</span>
                                      </div>
                                      <p style="font-size:12px; color:var(--text-muted); margin-top:4px;">${n.message}</p>
                                      <div style="font-size:10.5px; color:var(--text-light); margin-top:6px;">${n.propertyName || 'All Properties'} ΓÇó ${n.date}</div>
                                  </div>
                              `).join('')}
                          </div>
                      </div>
  
                      <!-- Tab 5: Reset Database -->
                      <div id="settings-tab-reset" style="display:none;">
                          <div style="background:var(--danger-bg); border:1px solid var(--danger-border); padding:16px; border-radius:8px; color:var(--danger-text);">
                              <h4 style="font-weight:700; margin-bottom:6px;">Reset Demo Database</h4>
                              <p style="font-size:12.5px;">This will re-initialize the SQLite database with clean seed properties, rooms, beds, sample residents, and payments.</p>
                              <button class="btn btn-danger btn-sm" style="margin-top:12px;" onclick="confirmResetDatabase()">Reset Database Now</button>
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      `;
      lucide.createIcons();
  }
  
  function switchSettingsTab(tabName) {
      ['business', 'payment', 'staff', 'notices', 'reset'].forEach(t => {
          const pane = document.getElementById(`settings-tab-${t}`);
          const btn = document.getElementById(`tab-btn-${t}`);
          if (pane) pane.style.display = (t === tabName) ? 'block' : 'none';
          if (btn) {
              btn.style.borderBottom = (t === tabName) ? '2px solid var(--primary)' : 'none';
              btn.style.fontWeight = (t === tabName) ? '700' : '500';
          }
      });
  }
  
  async function submitUpdateSettings(e) {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(e.target).entries());
      try {
          await window.db.updateSettings(data);
          showToast('Settings saved successfully!');
      } catch (err) {
          alert(err.message);
      }
  }
  
  async function confirmResetDatabase() {
      if (!confirm("Are you sure you want to reset the database? All demo data will be re-seeded.")) return;
      try {
          await window.db.resetApp();
          closeModal();
          showToast('Database reset successfully!');
      } catch (err) {
          alert(err.message);
      }
  }
  
  function openAddStaffModal() {
      const properties = window.db.get('properties');
      const modal = document.getElementById('modal-container');
      modal.innerHTML = `
          <div class="modal-backdrop" onclick="closeModal(event)">
              <div class="modal-dialog">
                  <div class="modal-header">
                      <h3 class="modal-title">Add Staff Member</h3>
                      <button class="modal-close-btn" onclick="closeModal()">&times;</button>
                  </div>
                  <div class="modal-body">
                      <form onsubmit="submitAddStaff(event)">
                          <div class="form-grid">
                              <div class="form-group">
                                  <label class="form-label">Full Name *</label>
                                  <input type="text" name="name" class="form-input" placeholder="e.g. Ramesh Gowda" required>
                              </div>
                              <div class="form-group">
                                  <label class="form-label">Role</label>
                                  <select name="role" class="form-select">
                                      <option value="Warden">Warden</option>
                                      <option value="Electrician">Electrician</option>
                                      <option value="Plumbing">Plumber</option>
                                      <option value="Cleaning">Cleaning Staff</option>
                                      <option value="Security">Security Guard</option>
                                      <option value="Cook">Cook</option>
                                  </select>
                              </div>
                              <div class="form-group">
                                  <label class="form-label">Phone Number *</label>
                                  <input type="tel" name="phone" class="form-input" placeholder="+91 9845112233" required>
                              </div>
                              <div class="form-group">
                                  <label class="form-label">Assigned Property</label>
                                  <select name="propertyId" class="form-select">
                                      <option value="">All Properties</option>
                                      ${properties.map(p => `<option value="${p.id}">${p.name}</option>`).join('')}
                                  </select>
                              </div>
                              <div class="form-group col-span-2">
                                  <label class="form-label">Monthly Salary (Γé╣)</label>
                                  <input type="number" name="salary" class="form-input" value="20000">
                              </div>
                          </div>
                          <div class="modal-footer" style="padding:16px 0 0 0; margin-top:20px; background:none;">
                              <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
                              <button type="submit" class="btn btn-primary">Add Staff</button>
                          </div>
                      </form>
                  </div>
              </div>
          </div>
      `;
      lucide.createIcons();
  }
  
  async function submitAddStaff(e) {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(e.target).entries());
      try {
          await window.db.addStaff(data);
          closeModal();
          showToast('Staff member added!');
      } catch (err) {
          alert(err.message);
      }
  }
  
  // Modal helper: close modal
  function closeModal(e) {
      if (!e || e.target.classList.contains('modal-backdrop') || e.target.classList.contains('modal-close-btn') || e.target.closest('.modal-close-btn') || e.target.textContent === 'Cancel' || e.target.textContent === 'Close') {
          const modal = document.getElementById('modal-container');
          if (modal) modal.innerHTML = '';
      }
  }

