import sys
import re

with open('index.html', 'r', encoding='utf-8') as f:
    html_content = f.read()

topbar_pattern = re.compile(r'<header class="topbar">.*?</header>', re.DOTALL)

new_topbar = '''<header class="topbar" style="background-color: #3b3486; border-radius: 12px; margin: 16px; padding: 12px 24px; display: flex; justify-content: space-between; align-items: center; color: white; border: none; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
                <div class="topbar-left" style="display: flex; flex-direction: column; gap: 4px; position: relative;">
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <span style="font-size: 13px; font-weight: 500; opacity: 0.9;">Good morning</span>
                        <div style="background-color: rgba(255,255,255,0.15); padding: 4px 10px; border-radius: 12px; display: flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 600;">
                            <i data-lucide="calendar" style="width: 12px; height: 12px;"></i>
                            <span id="current-date-display">Friday, 18 September</span>
                        </div>
                    </div>
                    
                    <div style="display: flex; align-items: center; gap: 12px; margin-top: 4px; position: relative;">
                        <div class="property-selector-wrapper" style="position: absolute; left: 0; top: 0; width: 100%; height: 100%; opacity: 0; cursor: pointer; z-index: 10;">
                            <select id="global-property-selector" class="property-select" style="width: 100%; height: 100%; cursor: pointer;">
                                <option value="all">🏢 All Properties</option>
                                <!-- Dynamically populated -->
                            </select>
                        </div>
                        
                        <div style="background-color: rgba(255,255,255,0.15); width: 28px; height: 28px; border-radius: 6px; display: flex; justify-content: center; align-items: center;">
                            <i data-lucide="chevrons-up-down" style="width: 16px; height: 16px;"></i>
                        </div>
                        <h1 id="page-title" style="font-size: 26px; font-weight: 700; margin: 0; letter-spacing: 0.2px; color: white;">All Properties</h1>
                    </div>
                </div>

                <div class="topbar-right" style="display: flex; align-items: center; gap: 16px;">
                    <!-- Global Notification Bell -->
                    <div class="notification-wrapper">
                        <button class="icon-btn" id="btn-notifications" style="border: 1px solid rgba(255,255,255,0.4); background: transparent; color: white; width: 40px; height: 40px; border-radius: 8px; position: relative; display: flex; justify-content: center; align-items: center;">
                            <i data-lucide="bell" style="width: 18px; height: 18px;"></i>
                            <span class="badge-dot" id="notif-badge-dot" style="background-color: #ff8fa3; border-color: #3b3486; width: 10px; height: 10px; right: 8px; top: 8px;"></span>
                        </button>
                        <div class="notification-dropdown" id="notification-dropdown">
                            <div class="notif-header">
                                <h3>Alerts & Notifications</h3>
                                <span class="notif-count-tag" id="notif-count-badge">0 Alerts</span>
                            </div>
                            <div class="notif-list" id="notif-list">
                                <!-- Populated dynamically -->
                            </div>
                        </div>
                    </div>

                    <!-- Quick Add Action -->
                    <div class="quick-action-dropdown">
                        <button class="btn btn-sm" id="btn-quick-action" style="background-color: white; color: #3b3486; border: none; border-radius: 8px; padding: 10px 16px; font-weight: 600; font-size: 14px; display: flex; align-items: center; gap: 6px; cursor: pointer; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                            <i data-lucide="plus" style="width: 16px; height: 16px;"></i> <span>Quick action</span>
                        </button>
                        <div class="quick-menu" id="quick-action-menu">
                            <a href="#" data-action="new-lead"><i data-lucide="user-plus"></i> New Lead / Enquiry</a>
                            <a href="#" data-action="new-resident"><i data-lucide="user-check"></i> Onboard Resident</a>
                            <a href="#" data-action="record-payment"><i data-lucide="credit-card"></i> Record Payment</a>
                            <a href="#" data-action="new-complaint"><i data-lucide="alert-triangle"></i> Raise Complaint</a>
                            <a href="#" data-action="add-expense"><i data-lucide="receipt"></i> Add Expense</a>
                            <a href="#" data-action="post-notice"><i data-lucide="megaphone"></i> Post Notice</a>
                        </div>
                    </div>
                </div>
            </header>'''

new_html = topbar_pattern.sub(new_topbar, html_content)
with open('index.html', 'w', encoding='utf-8') as f:
    f.write(new_html)

with open('app.js', 'r', encoding='utf-8') as f:
    js_content = f.read()

# Replace pageTitle update in renderActiveView
js_pattern = re.compile(r'pageTitle\.innerHTML = `.*?`;', re.DOTALL)
js_replacement = "pageTitle.textContent = selectedProp ? selectedProp.name : 'All Properties';"
js_content = js_pattern.sub(js_replacement, js_content)

# Add logic to update the date on init
init_pattern = re.compile(r'function initTopBarControls\(\) \{')
init_replacement = '''function initTopBarControls() {
    const dateDisplay = document.getElementById('current-date-display');
    if (dateDisplay) {
        const options = { weekday: 'long', day: 'numeric', month: 'long' };
        dateDisplay.textContent = new Date().toLocaleDateString('en-US', options);
    }
'''
js_content = js_content.replace('function initTopBarControls() {', init_replacement)

with open('styles.css', 'r', encoding='utf-8') as f:
    css_content = f.read()

# Remove the default topbar styles so they don't clash
css_replace = '''
.topbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0 24px;
    height: 64px;
    background-color: var(--bg-card);
    border-bottom: 1px solid var(--border-color);
    position: sticky;
    top: 0;
    z-index: 100;
}
'''
css_replacement = '''
.topbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    position: sticky;
    top: 0;
    z-index: 100;
}
'''
css_content = css_content.replace(css_replace, css_replacement)

with open('styles.css', 'w', encoding='utf-8') as f:
    f.write(css_content)

with open('app.js', 'w', encoding='utf-8') as f:
    f.write(js_content)

print("Topbar replaced successfully!")
