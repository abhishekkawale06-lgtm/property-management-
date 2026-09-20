import sys

with open("app.js", "r", encoding="utf-8") as f:
    content = f.read()

# 1. Update HTML
old_html = """            <!-- New Property Comparison Chart Section -->
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

new_html = """            <!-- Charts Row -->
            <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 24px; margin-top: 32px;">
                <!-- Property Comparison Chart Section -->
                <div class="card" style="padding: 32px; border-radius: 20px; background-color: #ffffff; box-shadow: 0 4px 20px rgba(0,0,0,0.03); border: 1px solid #f1f5f9;">
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
                </div>

                <!-- Customer Feedback Chart -->
                <div class="card" style="padding: 32px; border-radius: 20px; background-color: #ffffff; box-shadow: 0 4px 20px rgba(0,0,0,0.03); border: 1px solid #f1f5f9;">
                    <div style="margin-bottom: 32px;">
                        <h3 style="margin: 0 0 6px 0; color: #334155; font-size: 22px; font-weight: 500; letter-spacing: -0.5px;">Customer feedback</h3>
                        <span style="font-size: 15px; font-weight: 400; color: #64748b;">Positive comments</span>
                    </div>
                    <div style="position: relative; height: 260px; width: 100%;">
                        <canvas id="chart-customer-feedback"></canvas>
                    </div>
                </div>
            </div>"""

if old_html in content:
    content = content.replace(old_html, new_html)
else:
    print("Warning: Could not find HTML to replace")

# 2. Add JS
js_to_find = """        });
        currentCharts.push(chart);
    }
}"""

js_replacement = """        });
        currentCharts.push(chart);
    }

    // 4. Customer Feedback Chart
    const feedbackCtx = document.getElementById('chart-customer-feedback');
    if (feedbackCtx) {
        const chart = new Chart(feedbackCtx, {
            type: 'bar',
            data: {
                labels: ['Q1', 'Q2', 'Q3', 'Q4'],
                datasets: [{
                    label: 'Positive comments',
                    data: [19, 26, 33, 39],
                    backgroundColor: '#5200ff',
                    borderRadius: { topLeft: 12, topRight: 12, bottomLeft: 0, bottomRight: 0 },
                    borderSkipped: false,
                    barPercentage: 0.45,
                    categoryPercentage: 1.0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
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
                                return context.parsed.y + '%';
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { display: false, drawBorder: false },
                        ticks: { color: '#475569', font: { size: 13, family: 'Inter' } },
                        border: { display: false }
                    },
                    y: {
                        position: 'right',
                        beginAtZero: true,
                        max: 42,
                        grid: {
                            color: '#e2e8f0',
                            drawBorder: false,
                            tickLength: 0,
                            lineWidth: 1
                        },
                        border: { display: false },
                        ticks: {
                            color: '#475569',
                            font: { size: 13, family: 'Inter' },
                            stepSize: 10,
                            callback: function(value) {
                                return value + '%';
                            }
                        }
                    }
                }
            }
        });
        currentCharts.push(chart);
    }
}"""

if js_to_find in content:
    content = content.replace(js_to_find, js_replacement)
else:
    print("Warning: Could not find JS to replace")

with open("app.js", "w", encoding="utf-8") as f:
    f.write(content)

print("Added customer feedback chart successfully.")
