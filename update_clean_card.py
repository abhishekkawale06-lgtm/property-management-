import sys

with open('app.js', 'r', encoding='utf-8') as f:
    content = f.read()

import re
start_idx = content.find('const vacantBedsCount = numBeds - occupiedBedsCount;')
end_idx = content.find('`;', start_idx) + 2

target = content[start_idx:end_idx]

replacement = '''const vacantBedsCount = numBeds - occupiedBedsCount;
                    
                    return `
                    <div class="card" style="padding: 24px; border-radius: 12px; background-color: #ffffff; cursor: pointer; transition: transform 0.2s, box-shadow 0.2s; box-shadow: 0 1px 3px rgba(0,0,0,0.1);" 
                         onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 6px rgba(0,0,0,0.1)';" 
                         onmouseout="this.style.transform='none'; this.style.boxShadow='0 1px 3px rgba(0,0,0,0.1)';"
                         onclick="document.getElementById('global-property-selector').value = '${prop.id}'; document.getElementById('global-property-selector').dispatchEvent(new Event('change'));">
                        
                        <div style="display: flex; align-items: center; gap: 16px; margin-bottom: 24px;">
                            <div style="font-size: 32px; line-height: 1;">&#x1F3E2;</div>
                            <div>
                                <h4 style="margin: 0 0 4px 0; font-size: 18px; font-weight: 700; color: #0f172a;">${prop.name}</h4>
                                <span style="font-size: 13px; color: #64748b;">${prop.address}</span>
                            </div>
                        </div>
                        
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px 16px; padding-top: 24px; border-top: 1px solid #e2e8f0;">
                            
                            <!-- Floors -->
                            <div style="display: flex; flex-direction: column;">
                                <span style="font-size: 11px; font-weight: 600; color: #64748b; text-transform: uppercase; margin-bottom: 4px;">Floors</span>
                                <strong style="font-size: 24px; color: #0f172a;">${numFloors}</strong>
                            </div>
                            
                            <!-- Rooms -->
                            <div style="display: flex; flex-direction: column;">
                                <span style="font-size: 11px; font-weight: 600; color: #64748b; text-transform: uppercase; margin-bottom: 4px;">Rooms</span>
                                <strong style="font-size: 24px; color: #0f172a;">${numRooms}</strong>
                            </div>
                            
                            <!-- Total Beds -->
                            <div style="display: flex; flex-direction: column;">
                                <span style="font-size: 11px; font-weight: 600; color: #64748b; text-transform: uppercase; margin-bottom: 4px;">Total Beds</span>
                                <strong style="font-size: 24px; color: #0f172a;">${numBeds}</strong>
                            </div>
                            
                            <!-- Occupied Rooms -->
                            <div style="display: flex; flex-direction: column;">
                                <span style="font-size: 11px; font-weight: 600; color: #64748b; text-transform: uppercase; margin-bottom: 4px;">Occupied Rooms</span>
                                <strong style="font-size: 24px; color: #10b981;">${occupiedRoomsCount}</strong>
                            </div>
                            
                            <!-- Occupied Beds -->
                            <div style="display: flex; flex-direction: column;">
                                <span style="font-size: 11px; font-weight: 600; color: #64748b; text-transform: uppercase; margin-bottom: 4px;">Occupied Beds</span>
                                <strong style="font-size: 24px; color: #10b981;">${occupiedBedsCount}</strong>
                            </div>
                            
                            <!-- Occupancy Rate -->
                            <div style="display: flex; flex-direction: column;">
                                <span style="font-size: 11px; font-weight: 600; color: #64748b; text-transform: uppercase; margin-bottom: 4px;">Occupancy Rate</span>
                                <strong style="font-size: 24px; color: #f59e0b;">${occupancyPercentage}%</strong>
                            </div>
                            
                        </div>
                    </div>
                `;'''

content = content.replace(target, replacement)
with open('app.js', 'w', encoding='utf-8') as f:
    f.write(content)
print("Replaced successfully")
