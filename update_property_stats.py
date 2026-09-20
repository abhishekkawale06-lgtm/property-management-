import sys

with open('app.js', 'r', encoding='utf-8') as f:
    content = f.read()

target = '''                ${window.db.get('properties').map(prop => `
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
                `).join('')}'''

replacement = '''                ${window.db.get('properties').map(prop => {
                    const allRooms = window.db.get('rooms') || [];
                    const propRooms = allRooms.filter(r => r.propertyId === prop.id);
                    
                    const numRooms = propRooms.length;
                    const floorsSet = new Set();
                    let numBeds = 0;
                    let occupiedBedsCount = 0;
                    let occupiedRoomsCount = 0;
                    
                    propRooms.forEach(r => {
                        if (r.floor) floorsSet.add(r.floor);
                        if (r.beds) {
                            numBeds += r.beds.length;
                            const occupiedInRoom = r.beds.filter(b => b.status === 'Occupied').length;
                            occupiedBedsCount += occupiedInRoom;
                            if (occupiedInRoom > 0) occupiedRoomsCount++;
                        }
                    });
                    
                    const numFloors = floorsSet.size;
                    const occupancyPercentage = numBeds > 0 ? Math.round((occupiedBedsCount / numBeds) * 100) : 0;
                    
                    return `
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
                `;}).join('')}'''

if target in content:
    content = content.replace(target, replacement)
    with open('app.js', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Replaced successfully")
else:
    print("Target not found")
