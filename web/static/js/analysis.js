// Intelligent Analysis Reports Page JavaScript

document.addEventListener('DOMContentLoaded', function() {
    // Fetch and generate security briefing
    fetchSecurityBriefing();
    
    // Fetch and initialize case graph
    fetchCaseGraph();
    
    // Fetch and initialize confidence charts
    fetchConfidenceCharts();
    
    // Add refresh button functionality
    document.getElementById('refresh-btn').addEventListener('click', function() {
        const refreshBtn = this;
        refreshBtn.disabled = true;
        refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 刷新中...';
        
        // Call all API endpoints to refresh data
        Promise.all([
            fetchSecurityBriefing(),
            fetchCaseGraph(),
            fetchConfidenceCharts()
        ]).then(() => {
            showNotification('分析报告已更新', 'success');
            refreshBtn.disabled = false;
            refreshBtn.innerHTML = '<i class="fas fa-sync-alt"></i> 刷新报告';
        }).catch(error => {
            console.error('Error refreshing data:', error);
            showNotification('更新报告失败', 'error');
            refreshBtn.disabled = false;
            refreshBtn.innerHTML = '<i class="fas fa-sync-alt"></i> 刷新报告';
        });
    });
});

// Fetch security briefing data from API
function fetchSecurityBriefing() {
    return fetch('/api/analysis/security-briefing')
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            // Update the briefing date
            const briefingDate = document.querySelector('.briefing-date');
            if (briefingDate) {
                briefingDate.textContent = formatDate(new Date(data.date));
            }
            
            // Update stats
            const statValues = document.querySelectorAll('.stat-value');
            statValues.forEach(stat => {
                const statKey = stat.getAttribute('data-stat-key');
                if (statKey && data.stats[statKey] !== undefined) {
                    stat.textContent = data.stats[statKey];
                }
            });
            
            // Update incident list
            updateIncidentList(data.incidents);
        })
        .catch(error => {
            console.error('Error fetching security briefing:', error);
            showNotification('获取安全简报失败', 'error');
        });
}

// Update the incident list with data from API
function updateIncidentList(incidents) {
    const incidentList = document.querySelector('.incident-list');
    if (!incidentList) return;
    
    incidentList.innerHTML = '';
    
    incidents.forEach(incident => {
        const incidentItem = document.createElement('li');
        incidentItem.className = 'incident-item';
        incidentItem.innerHTML = `
            <div class="incident-time">${incident.time}</div>
            <div class="incident-description">${incident.description}</div>
            <div class="incident-severity">
                <span class="status status-${incident.severity}"></span>
            </div>
        `;
        
        incidentList.appendChild(incidentItem);
    });
}

// Fetch case graph data from API
function fetchCaseGraph() {
    return fetch('/api/analysis/case-graph')
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            initializeCaseGraph(data);
        })
        .catch(error => {
            console.error('Error fetching case graph data:', error);
            showNotification('获取案例图表数据失败', 'error');
        });
}

// Initialize case graph with data from API
function initializeCaseGraph(caseData) {
    const caseGraphContainer = document.getElementById('case-graph');
    if (!caseGraphContainer) return;
    
    // Clear previous chart if it exists
    caseGraphContainer.innerHTML = '';
    
    // Prepare data for chart
    const labels = caseData.map(item => item.type);
    const totalCounts = caseData.map(item => item.count);
    const resolvedCounts = caseData.map(item => item.resolved);
    
    // Create chart
    const ctx = document.createElement('canvas');
    caseGraphContainer.appendChild(ctx);
    
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: '总数',
                    data: totalCounts,
                    backgroundColor: 'rgba(54, 162, 235, 0.8)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 1
                },
                {
                    label: '已解决',
                    data: resolvedCounts,
                    backgroundColor: 'rgba(75, 192, 192, 0.8)',
                    borderColor: 'rgba(75, 192, 192, 1)',
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true
                }
            },
            plugins: {
                title: {
                    display: true,
                    text: '案例类型统计',
                    font: {
                        size: 16
                    }
                },
                legend: {
                    position: 'top'
                }
            }
        }
    });
}

// Fetch confidence charts data from API
function fetchConfidenceCharts() {
    return fetch('/api/analysis/confidence-charts')
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            initializeConfidenceCharts(data);
        })
        .catch(error => {
            console.error('Error fetching confidence charts data:', error);
            showNotification('获取置信度图表数据失败', 'error');
        });
}

// Initialize confidence charts with data from API
function initializeConfidenceCharts(data) {
    // Create person detection confidence chart
    createLineChart('person-confidence-chart', data.person_confidence);
    
    // Create vehicle detection confidence chart
    createLineChart('vehicle-confidence-chart', data.vehicle_confidence);
    
    // Create anomaly detection confidence chart
    createLineChart('anomaly-confidence-chart', data.anomaly_confidence);
}

// Create a line chart
function createLineChart(containerId, data) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    // Clear previous chart if it exists
    container.innerHTML = '';
    
    // Create canvas for the chart
    const canvas = document.createElement('canvas');
    container.appendChild(canvas);
    
    // Create the chart
    new Chart(canvas, {
        type: 'line',
        data: {
            labels: data.labels,
            datasets: [{
                label: data.title,
                data: data.data,
                backgroundColor: 'rgba(75, 192, 192, 0.2)',
                borderColor: 'rgba(75, 192, 192, 1)',
                borderWidth: 2,
                tension: 0.3,
                fill: true
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: false,
                    min: 50,
                    max: 100,
                    title: {
                        display: true,
                        text: '置信度 (%)'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: '月份'
                    }
                }
            },
            plugins: {
                title: {
                    display: true,
                    text: data.title,
                    font: {
                        size: 16
                    }
                }
            }
        }
    });
}

// Format date for display
function formatDate(date) {
    return date.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

// Show notification
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Trigger animation
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 3000);
} 