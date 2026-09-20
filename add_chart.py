import sys
import re

with open("app.js", "r", encoding="utf-8") as f:
    content = f.read()

# Insert HTML below property cards
html_to_find = """                `;}).join('')}
            </div>
        </div>
        ` : ''}"""

html_replacement = """                `;}).join('')}
            </div>
            
            <!-- New Property Comparison Chart Section -->
            <div class="card" style="margin-top: 32px; padding: 24px; border-radius: 12px; background-color: #ffffff; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
                    <h3 style="margin: 0; color: var(--text-main);">Property Performance Comparison</h3>
                </div>
                <div style="position: relative; height: 350px; width: 100%;">
                    <canvas id="chart-property-comparison"></canvas>
                </div>
            </div>

        </div>
        ` : ''}"""

if html_to_find not in content:
    print("Could not find HTML insertion point")
    sys.exit(1)

content = content.replace(html_to_find, html_replacement)

# Insert Chart.js logic
js_to_find = """        });
        currentCharts.push(chart);
    }
}"""

js_replacement = """        });
        currentCharts.push(chart);
    }

    // 3. Property Comparison Chart
    const compCtx = document.getElementById('chart-property-comparison');
    if (compCtx) {
        const properties = window.db.get('properties');
        const rooms = window.db.get('rooms');
        const payments = window.db.get('payments');
        const expenses = window.db.get('expenses');
        
        const currentMonth = new Date().toISOString().slice(0, 7); // e.g. "2026-09"
        
        const propLabels = [];
        const occRates = [];
        const revData = [];
        const expData = [];
        
        properties.forEach(prop => {
            propLabels.push(prop.name);
            
            // Occupancy
            let numBeds = 0;
            let occupiedBedsCount = 0;
            rooms.filter(r => r.propertyId === prop.id).forEach(r => {
                if (r.beds) {
                    numBeds += r.beds.length;
                    occupiedBedsCount += r.beds.filter(b => b.status === 'Occupied').length;
                }
            });
            occRates.push(numBeds > 0 ? Math.round((occupiedBedsCount / numBeds) * 100) : 0);
            
            // Revenue
            const rev = payments.filter(p => p.propertyId === prop.id && p.month === currentMonth && (p.status === 'Paid' || p.status === 'Partial'))
                                .reduce((sum, p) => sum + (p.amountPaid || 0), 0);
            revData.push(rev);
            
            // Expenses
            const exp = expenses.filter(e => e.propertyId === prop.id && e.date && e.date.startsWith(currentMonth))
                                .reduce((sum, e) => sum + (e.amount || 0), 0);
            expData.push(exp);
        });
        
        const chart = new Chart(compCtx, {
            type: 'bar',
            data: {
                labels: propLabels,
                datasets: [
                    { 
                        type: 'line',
                        label: 'Occupancy Rate (%)', 
                        data: occRates, 
                        borderColor: '#10b981', 
                        backgroundColor: '#10b981',
                        borderWidth: 3,
                        tension: 0.3,
                        yAxisID: 'y1'
                    },
                    { 
                        type: 'bar',
                        label: 'Revenue', 
                        data: revData, 
                        backgroundColor: '#4F46E5', 
                        borderRadius: 4, 
                        yAxisID: 'y'
                    },
                    { 
                        type: 'bar',
                        label: 'Expenses', 
                        data: expData, 
                        backgroundColor: '#F59E0B', 
                        borderRadius: 4, 
                        yAxisID: 'y'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false,
                },
                plugins: { 
                    legend: { position: 'top' },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                let label = context.dataset.label || '';
                                if (label) label += ': ';
                                if (context.dataset.yAxisID === 'y1') {
                                    label += context.parsed.y + '%';
                                } else {
                                    label += '₹' + context.parsed.y.toLocaleString();
                                }
                                return label;
                            }
                        }
                    }
                },
                scales: { 
                    y: { 
                        type: 'linear',
                        display: true,
                        position: 'left',
                        title: { display: true, text: 'Amount (₹)' },
                        beginAtZero: true 
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        title: { display: true, text: 'Occupancy (%)' },
                        beginAtZero: true,
                        max: 100,
                        grid: { drawOnChartArea: false }
                    }
                }
            }
        });
        currentCharts.push(chart);
    }
}"""

if js_to_find not in content:
    print("Could not find JS insertion point")
    # let's try a regex fallback
    index = content.rfind("currentCharts.push(chart);")
    if index != -1:
        end_idx = content.find("}", index)
        end_idx = content.find("}", end_idx+1)
        if end_idx != -1:
            content = content[:end_idx] + js_replacement[len("        });\n        currentCharts.push(chart);\n    }\n"):] + "\n"
        else:
            print("Regex fallback failed")
            sys.exit(1)
    else:
        sys.exit(1)
else:
    content = content.replace(js_to_find, js_replacement)


with open("app.js", "w", encoding="utf-8") as f:
    f.write(content)

print("Added property comparison chart successfully.")
