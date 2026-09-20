import sys

with open("app.js", "r", encoding="utf-8") as f:
    content = f.read()

# 1. Update the HTML Wrapper for the chart to match the image's card style
old_html = """            <!-- New Property Comparison Chart Section -->
            <div class="card" style="margin-top: 32px; padding: 24px; border-radius: 12px; background-color: #ffffff; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
                    <h3 style="margin: 0; color: var(--text-main);">Property Performance Comparison</h3>
                </div>
                <div style="position: relative; height: 350px; width: 100%;">
                    <canvas id="chart-property-comparison"></canvas>
                </div>
            </div>"""

new_html = """            <!-- New Property Comparison Chart Section -->
            <div class="card" style="margin-top: 32px; padding: 32px; border-radius: 20px; background-color: #ffffff; box-shadow: 0 4px 20px rgba(0,0,0,0.03); border: 1px solid #f1f5f9;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px;">
                    <div>
                        <span style="font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px;">Property Comparison</span>
                        <h3 style="margin: 6px 0 0 0; color: #0f172a; font-size: 20px; font-weight: 700;">Revenue vs Expenses</h3>
                    </div>
                    <a href="#" style="font-size: 13px; font-weight: 600; color: #64748b; text-decoration: none;">View All</a>
                </div>
                <div style="position: relative; height: 260px; width: 100%;">
                    <canvas id="chart-property-comparison"></canvas>
                </div>
            </div>"""

if old_html in content:
    content = content.replace(old_html, new_html)
else:
    print("Warning: Could not find exact HTML wrapper to replace.")

# 2. Update the Chart.js logic
old_js = """        const chart = new Chart(compCtx, {
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
        });"""

new_js = """        const chart = new Chart(compCtx, {
            type: 'bar',
            data: {
                labels: propLabels.map(l => {
                    const parts = l.split('-');
                    return parts.length > 1 ? parts[1].trim().substring(0, 5).toUpperCase() : l.substring(0, 5).toUpperCase();
                }),
                datasets: [
                    { 
                        type: 'bar',
                        label: 'Revenue', 
                        data: revData, 
                        backgroundColor: '#6d28d9', // Dark Purple
                        borderRadius: 6,
                        borderSkipped: false,
                        barPercentage: 0.8,
                        categoryPercentage: 0.5
                    },
                    { 
                        type: 'bar',
                        label: 'Expenses', 
                        data: expData, 
                        backgroundColor: '#c4b5fd', // Light Purple
                        borderRadius: 6,
                        borderSkipped: false,
                        barPercentage: 0.8,
                        categoryPercentage: 0.5
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
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: '#0f172a',
                        titleFont: { size: 13, family: 'Inter' },
                        bodyFont: { size: 13, family: 'Inter' },
                        padding: 12,
                        cornerRadius: 8,
                        callbacks: {
                            label: function(context) {
                                let label = context.dataset.label || '';
                                if (label) label += ': ';
                                label += '₹' + context.parsed.y.toLocaleString();
                                return label;
                            }
                        }
                    }
                },
                scales: { 
                    x: {
                        grid: { display: false, drawBorder: false },
                        ticks: { color: '#94a3b8', font: { size: 10, family: 'Inter', weight: '600' } }
                    },
                    y: { 
                        display: true,
                        position: 'left',
                        beginAtZero: true,
                        grid: {
                            color: '#f1f5f9',
                            drawBorder: false,
                            tickLength: 0
                        },
                        border: { display: false },
                        ticks: {
                            color: '#94a3b8',
                            font: { size: 11, family: 'Inter', weight: '500' },
                            padding: 10,
                            maxTicksLimit: 5,
                            callback: function(value) {
                                return '₹' + (value / 1000) + 'k';
                            }
                        }
                    }
                }
            }
        });"""

if old_js in content:
    content = content.replace(old_js, new_js)
else:
    print("Warning: Could not find exact JS to replace.")

with open("app.js", "w", encoding="utf-8") as f:
    f.write(content)

print("Applied new chart styling.")
