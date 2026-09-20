import sys

with open('app.js', 'r', encoding='utf-8') as f:
    content = f.read()

target = '''                    return `
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
                        
                        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-top: 8px; padding-top: 12px; border-top: 1px solid var(--border-color);">
                            <div style="display: flex; flex-direction: column;">
                                <span style="font-size: 11px; color: var(--text-muted); text-transform: uppercase; font-weight: 600;">Rooms</span>
                                <strong style="font-size: 15px; color: var(--text-main);">${numRooms}</strong>
                            </div>
                            <div style="display: flex; flex-direction: column;">
                                <span style="font-size: 11px; color: var(--text-muted); text-transform: uppercase; font-weight: 600;">Floors</span>
                                <strong style="font-size: 15px; color: var(--text-main);">${numFloors}</strong>
                            </div>
                            <div style="display: flex; flex-direction: column;">
                                <span style="font-size: 11px; color: var(--text-muted); text-transform: uppercase; font-weight: 600;">Total Beds</span>
                                <strong style="font-size: 15px; color: var(--text-main);">${numBeds}</strong>
                            </div>
                            <div style="display: flex; flex-direction: column;">
                                <span style="font-size: 11px; color: var(--text-muted); text-transform: uppercase; font-weight: 600;">Occupied Rooms</span>
                                <strong style="font-size: 15px; color: var(--text-main);">${occupiedRoomsCount}</strong>
                            </div>
                            <div style="display: flex; flex-direction: column;">
                                <span style="font-size: 11px; color: var(--text-muted); text-transform: uppercase; font-weight: 600;">Occupied Beds</span>
                                <strong style="font-size: 15px; color: var(--text-main);">${occupiedBedsCount}</strong>
                            </div>
                            <div style="display: flex; flex-direction: column;">
                                <span style="font-size: 11px; color: var(--text-muted); text-transform: uppercase; font-weight: 600;">Occupancy</span>
                                <strong style="font-size: 15px; color: ${occupancyPercentage >= 85 ? '#10b981' : occupancyPercentage >= 50 ? '#f59e0b' : '#ef4444'};">${occupancyPercentage}%</strong>
                            </div>
                        </div>
                    </div>
                `;'''

replacement = '''                    const vacantBedsCount = numBeds - occupiedBedsCount;
                    
                    return `
                    <div class="card" style="padding: 24px; border-radius: 16px; background-color: #ffffff; cursor: pointer; transition: transform 0.2s, box-shadow 0.2s; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);" 
                         onmouseover="this.style.transform='translateY(-4px)'; this.style.boxShadow='0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)';" 
                         onmouseout="this.style.transform='none'; this.style.boxShadow='0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)';"
                         onclick="document.getElementById('global-property-selector').value = '${prop.id}'; document.getElementById('global-property-selector').dispatchEvent(new Event('change'));">
                        
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px;">
                            <div style="display: flex; align-items: center; gap: 16px;">
                                <div style="font-size: 32px; line-height: 1;">🏢</div>
                                <div>
                                    <h4 style="margin: 0 0 4px 0; font-size: 18px; font-weight: 700; color: #0f172a;">${prop.name}</h4>
                                    <span style="font-size: 13px; color: #64748b;">${prop.address}</span>
                                </div>
                            </div>
                            
                            <div style="background-color: #fef9c3; border: 2px solid #fde047; border-radius: 8px; padding: 12px 16px; display: flex; flex-direction: column; align-items: center; justify-content: center;">
                                <span style="font-size: 11px; font-weight: 700; color: #b45309; margin-bottom: 4px;">OCCUPANCY</span>
                                <span style="font-size: 24px; font-weight: 800; color: #d97706; line-height: 1;">${occupancyPercentage}%</span>
                            </div>
                        </div>
                        
                        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
                            
                            <!-- Floors -->
                            <div style="background-color: #f0f9ff; border: 1px solid #e0f2fe; border-radius: 8px; padding: 16px 8px; display: flex; flex-direction: column; align-items: center;">
                                <span style="font-size: 12px; font-weight: 600; color: #0369a1; margin-bottom: 8px;">Floors</span>
                                <strong style="font-size: 20px; color: #0284c7;">${numFloors}</strong>
                            </div>
                            
                            <!-- Total Rooms -->
                            <div style="background-color: #f0f9ff; border: 1px solid #e0f2fe; border-radius: 8px; padding: 16px 8px; display: flex; flex-direction: column; align-items: center;">
                                <span style="font-size: 12px; font-weight: 600; color: #0369a1; margin-bottom: 8px;">Total Rooms</span>
                                <strong style="font-size: 20px; color: #0284c7;">${numRooms}</strong>
                            </div>
                            
                            <!-- Total Beds -->
                            <div style="background-color: #f0f9ff; border: 1px solid #e0f2fe; border-radius: 8px; padding: 16px 8px; display: flex; flex-direction: column; align-items: center;">
                                <span style="font-size: 12px; font-weight: 600; color: #0369a1; margin-bottom: 8px;">Total Beds</span>
                                <strong style="font-size: 20px; color: #0284c7;">${numBeds}</strong>
                            </div>
                            
                            <!-- Occupied Rooms -->
                            <div style="background-color: #dcfce7; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px 8px; display: flex; flex-direction: column; align-items: center;">
                                <span style="font-size: 12px; font-weight: 600; color: #15803d; margin-bottom: 8px;">Occupied Rooms</span>
                                <strong style="font-size: 20px; color: #16a34a;">${occupiedRoomsCount}</strong>
                            </div>
                            
                            <!-- Occupied Beds -->
                            <div style="background-color: #dcfce7; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px 8px; display: flex; flex-direction: column; align-items: center;">
                                <span style="font-size: 12px; font-weight: 600; color: #15803d; margin-bottom: 8px;">Occupied Beds</span>
                                <strong style="font-size: 20px; color: #16a34a;">${occupiedBedsCount}</strong>
                            </div>
                            
                            <!-- Vacant Beds -->
                            <div style="background-color: #eff6ff; border: 1px solid #dbeafe; border-radius: 8px; padding: 16px 8px; display: flex; flex-direction: column; align-items: center;">
                                <span style="font-size: 12px; font-weight: 600; color: #1d4ed8; margin-bottom: 8px;">Vacant Beds</span>
                                <strong style="font-size: 20px; color: #2563eb;">${vacantBedsCount}</strong>
                            </div>
                            
                        </div>
                    </div>
                `;'''

if target in content:
    content = content.replace(target, replacement)
    with open('app.js', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Replaced successfully")
else:
    print("Target not found")
