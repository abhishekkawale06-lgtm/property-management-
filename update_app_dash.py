import sys
import re

with open('app.js', 'r', encoding='utf-8') as f:
    content = f.read()

pattern = re.compile(r'function renderDashboardView\(container\)\s*\{.*?function renderDashboardCharts', re.DOTALL)

replacement = '''function renderDashboardView(container) {
    const analytics = window.db.state.analytics || {};
    
    container.innerHTML = `
        <div class="kpi-grid" style="margin-top: 20px;">
            <div class="kpi-card">
                <div class="kpi-icon purple"><i data-lucide="bed"></i></div>
                <div class="kpi-info">
                    <span class="kpi-label">Total Beds</span>
                    <span class="kpi-value">${analytics.totalBeds || 0}</span>
                    <span class="kpi-sub">Capacity across PG</span>
                </div>
            </div>

            <div class="kpi-card">
                <div class="kpi-icon success"><i data-lucide="user-check"></i></div>
                <div class="kpi-info">
                    <span class="kpi-label">Occupied Beds</span>
                    <span class="kpi-value">${analytics.occupiedBeds || 0}</span>
                    <span class="kpi-sub">Active Residents</span>
                </div>
            </div>

            <div class="kpi-card">
                <div class="kpi-icon warning"><i data-lucide="bed-double"></i></div>
                <div class="kpi-info">
                    <span class="kpi-label">Vacant Beds</span>
                    <span class="kpi-value">${analytics.vacantBeds || 0}</span>
                    <span class="kpi-sub">Available for Booking</span>
                </div>
            </div>

            <div class="kpi-card">
                <div class="kpi-icon primary"><i data-lucide="pie-chart"></i></div>
                <div class="kpi-info">
                    <span class="kpi-label">Occupancy Rate</span>
                    <span class="kpi-value">${analytics.occupancyRate || 0}%</span>
                    <span class="kpi-sub">Target: >85%</span>
                </div>
            </div>
        </div>
    `;

    setTimeout(() => {
        lucide.createIcons();
    }, 50);
}

function renderDashboardCharts'''

new_content = pattern.sub(replacement, content)

if new_content != content:
    with open('app.js', 'w', encoding='utf-8') as f:
        f.write(new_content)
    print("Successfully replaced renderDashboardView")
else:
    print("Pattern not found or no changes made")
