import sys

with open('app.js', 'r', encoding='utf-8') as f:
    content = f.read()

target = '''            <div class="kpi-card">
                <div class="kpi-icon primary"><i data-lucide="pie-chart"></i></div>
                <div class="kpi-info">
                    <span class="kpi-label">Occupancy Rate</span>
                    <span class="kpi-value">${analytics.occupancyRate || 0}%</span>
                    <span class="kpi-sub">Target: >85%</span>
                </div>
            </div>
        </div>
    `;'''

replacement = '''            <div class="kpi-card">
                <div class="kpi-icon primary"><i data-lucide="pie-chart"></i></div>
                <div class="kpi-info">
                    <span class="kpi-label">Occupancy Rate</span>
                    <span class="kpi-value">${analytics.occupancyRate || 0}%</span>
                    <span class="kpi-sub">Target: >85%</span>
                </div>
            </div>
        </div>
        
        ${window.db.state.currentPropertyId === 'all' ? `
        <div style="margin-top: 32px;">
            <h3 style="margin-bottom: 16px; color: var(--text-main);">Property Overview</h3>
            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px;">
                ${window.db.state.properties.map(prop => `
                    <div class="card" style="padding: 20px; border-radius: 12px; display: flex; flex-direction: column; gap: 12px; cursor: pointer; transition: transform 0.2s, box-shadow 0.2s;" 
                         onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='var(--shadow-md)';" 
                         onmouseout="this.style.transform='none'; this.style.boxShadow='var(--shadow-sm)';"
                         onclick="document.getElementById('global-property-selector').value = '${prop.id}'; document.getElementById('global-property-selector').dispatchEvent(new Event('change'));">
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <div style="width: 40px; height: 40px; border-radius: 8px; background-color: #f1f5f9; display: flex; align-items: center; justify-content: center; color: var(--primary);">
                                <i data-lucide="building-2"></i>
                            </div>
                            <div>
                                <h4 style="margin: 0; font-size: 16px; color: var(--text-main);">${prop.name}</h4>
                                <span style="font-size: 13px; color: var(--text-muted);">${prop.address}</span>
                            </div>
                        </div>
                        <div style="display: flex; gap: 16px; margin-top: 8px; padding-top: 12px; border-top: 1px solid var(--border-color);">
                            <div style="display: flex; flex-direction: column;">
                                <span style="font-size: 12px; color: var(--text-muted);">Rooms</span>
                                <strong style="font-size: 15px; color: var(--text-main);">${prop.rooms}</strong>
                            </div>
                            <div style="display: flex; flex-direction: column;">
                                <span style="font-size: 12px; color: var(--text-muted);">Beds</span>
                                <strong style="font-size: 15px; color: var(--text-main);">${prop.totalBeds}</strong>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
        ` : ''}
    `;'''

if target in content:
    content = content.replace(target, replacement)
    with open('app.js', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Replaced successfully")
else:
    print("Target not found")
