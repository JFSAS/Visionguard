// Intelligent Analysis Reports Page JavaScript

document.addEventListener('DOMContentLoaded', function() {
    // Generate security briefing
    generateSecurityBriefing();
    
    // Initialize case graph
    initializeCaseGraph();
    
    // Initialize confidence charts
    initializeConfidenceCharts();
    
    // Add refresh button functionality
    document.getElementById('refresh-btn').addEventListener('click', function() {
        const refreshBtn = this;
        refreshBtn.disabled = true;
        refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 刷新中...';
        
        // Simulate refresh delay
        setTimeout(() => {
            showNotification('分析报告已更新', 'success');
            refreshBtn.disabled = false;
            refreshBtn.innerHTML = '<i class="fas fa-sync-alt"></i> 刷新报告';
            
            // Regenerate data
            generateSecurityBriefing();
            initializeCaseGraph();
            initializeConfidenceCharts();
        }, 2000);
    });
});

// Generate security briefing with mock data
function generateSecurityBriefing() {
    const briefingDate = document.querySelector('.briefing-date');
    const currentDate = new Date();
    briefingDate.textContent = formatDate(currentDate);
    
    // Generate random stats
    const statValues = document.querySelectorAll('.stat-value');
    statValues.forEach(stat => {
        const min = parseInt(stat.getAttribute('data-min') || 0);
        const max = parseInt(stat.getAttribute('data-max') || 100);
        stat.textContent = Math.floor(Math.random() * (max - min + 1)) + min;
    });
    
    // Generate incident list
    generateIncidentList();
}

// Generate incident list with mock data
function generateIncidentList() {
    const incidentList = document.querySelector('.incident-list');
    if (!incidentList) return;
    
    incidentList.innerHTML = '';
    
    const incidents = [
        {
            time: '08:15',
            description: '北区商场发现可疑人员，已派遣警力核查',
            severity: 'high'
        },
        {
            time: '09:30',
            description: '东区公园监控发现异常行为，已记录备案',
            severity: 'medium'
        },
        {
            time: '10:45',
            description: '西区停车场多辆无牌照车辆聚集，已通知交警部门',
            severity: 'high'
        },
        {
            time: '12:30',
            description: '中央广场人流密度超过安全阈值，已加强现场管控',
            severity: 'medium'
        },
        {
            time: '14:10',
            description: '南区3号监控设备离线，技术人员已前往检查',
            severity: 'low'
        }
    ];
    
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

// Initialize case graph with mock data
function initializeCaseGraph() {
    const graphContainer = document.querySelector('.graph-container');
    if (!graphContainer) return;
    
    // Clear previous graph
    graphContainer.innerHTML = '';
    
    // Create nodes
    const nodes = [
        {
            id: 1,
            x: 50,
            y: 50,
            type: 'primary',
            image: '../images/suspect1.png',
            info: '主要嫌疑人，多次出现在案发现场附近'
        },
        {
            id: 2,
            x: 30,
            y: 70,
            type: 'secondary',
            image: '../images/suspect2.png',
            info: '疑似同伙，与主要嫌疑人有多次接触'
        },
        {
            id: 3,
            x: 70,
            y: 30,
            type: 'secondary',
            image: '../images/suspect3.png',
            info: '疑似同伙，负责监视周围环境'
        },
        {
            id: 4,
            x: 80,
            y: 60,
            type: 'tertiary',
            image: '../images/suspect4.png',
            info: '可能的关联人员，需进一步调查'
        },
        {
            id: 5,
            x: 20,
            y: 40,
            type: 'tertiary',
            image: '../images/suspect5.png',
            info: '可能的关联人员，需进一步调查'
        }
    ];
    
    // Create connections
    const connections = [
        { from: 1, to: 2 },
        { from: 1, to: 3 },
        { from: 2, to: 5 },
        { from: 3, to: 4 },
        { from: 1, to: 4, dashed: true }
    ];
    
    // Draw connections
    connections.forEach(conn => {
        const fromNode = nodes.find(n => n.id === conn.from);
        const toNode = nodes.find(n => n.id === conn.to);
        
        if (fromNode && toNode) {
            const line = document.createElement('div');
            line.className = `graph-line ${conn.dashed ? 'dashed' : ''}`;
            
            // Calculate line position and rotation
            const x1 = fromNode.x;
            const y1 = fromNode.y;
            const x2 = toNode.x;
            const y2 = toNode.y;
            
            const length = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
            const angle = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI;
            
            line.style.width = `${length}%`;
            line.style.left = `${x1}%`;
            line.style.top = `${y1}%`;
            line.style.transform = `rotate(${angle}deg)`;
            
            if (conn.dashed) {
                line.style.borderTop = '2px dashed rgba(255, 255, 255, 0.2)';
            }
            
            graphContainer.appendChild(line);
        }
    });
    
    // Draw nodes
    nodes.forEach(node => {
        const nodeElement = document.createElement('div');
        nodeElement.className = `graph-node ${node.type}`;
        nodeElement.style.left = `${node.x}%`;
        nodeElement.style.top = `${node.y}%`;
        nodeElement.innerHTML = `<img src="${node.image}" alt="嫌疑人">`;
        
        const tooltip = document.createElement('div');
        tooltip.className = 'graph-tooltip';
        tooltip.textContent = node.info;
        tooltip.style.left = `${node.x > 50 ? '-220px' : '70px'}`;
        tooltip.style.top = '0';
        
        nodeElement.addEventListener('mouseenter', () => {
            tooltip.style.display = 'block';
        });
        
        nodeElement.addEventListener('mouseleave', () => {
            tooltip.style.display = 'none';
        });
        
        graphContainer.appendChild(nodeElement);
        graphContainer.appendChild(tooltip);
    });
}

// Initialize confidence charts
function initializeConfidenceCharts() {
    // In a real application, you would use a charting library like Chart.js
    // For this static demo, we'll create simple visual representations
    
    // Confidence by location chart
    createBarChart('location-chart', [
        { label: '北区商场', value: 85 },
        { label: '东区公园', value: 72 },
        { label: '西区停车场', value: 91 },
        { label: '中央广场', value: 64 },
        { label: '南区', value: 53 }
    ]);
    
    // Confidence by time chart
    createLineChart('time-chart', [
        { label: '06:00', value: 45 },
        { label: '09:00', value: 65 },
        { label: '12:00', value: 78 },
        { label: '15:00', value: 82 },
        { label: '18:00', value: 70 },
        { label: '21:00', value: 55 }
    ]);
}

// Create a simple bar chart
function createBarChart(containerId, data) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    container.innerHTML = '';
    
    const chartHeight = 200;
    const barWidth = 100 / data.length;
    
    const chartContainer = document.createElement('div');
    chartContainer.className = 'bar-chart';
    chartContainer.style.height = `${chartHeight}px`;
    chartContainer.style.display = 'flex';
    chartContainer.style.alignItems = 'flex-end';
    chartContainer.style.justifyContent = 'space-around';
    
    data.forEach(item => {
        const bar = document.createElement('div');
        bar.className = 'chart-bar';
        bar.style.width = `${barWidth - 10}%`;
        bar.style.height = `${item.value * chartHeight / 100}px`;
        bar.style.backgroundColor = 'var(--primary-color)';
        bar.style.position = 'relative';
        
        const label = document.createElement('div');
        label.className = 'chart-label';
        label.textContent = item.label;
        label.style.position = 'absolute';
        label.style.bottom = '-25px';
        label.style.left = '0';
        label.style.right = '0';
        label.style.textAlign = 'center';
        label.style.fontSize = '0.8rem';
        
        const value = document.createElement('div');
        value.className = 'chart-value';
        value.textContent = `${item.value}%`;
        value.style.position = 'absolute';
        value.style.top = '-25px';
        value.style.left = '0';
        value.style.right = '0';
        value.style.textAlign = 'center';
        value.style.fontSize = '0.8rem';
        
        bar.appendChild(label);
        bar.appendChild(value);
        chartContainer.appendChild(bar);
    });
    
    container.appendChild(chartContainer);
}

// Create a simple line chart
function createLineChart(containerId, data) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    container.innerHTML = '';
    
    const chartHeight = 200;
    const chartWidth = container.clientWidth;
    const pointWidth = chartWidth / (data.length - 1);
    
    const chartContainer = document.createElement('div');
    chartContainer.className = 'line-chart';
    chartContainer.style.height = `${chartHeight}px`;
    chartContainer.style.position = 'relative';
    
    // Create line
    let pathD = '';
    data.forEach((item, index) => {
        const x = index * pointWidth;
        const y = chartHeight - (item.value * chartHeight / 100);
        
        if (index === 0) {
            pathD += `M ${x} ${y}`;
        } else {
            pathD += ` L ${x} ${y}`;
        }
        
        // Create point
        const point = document.createElement('div');
        point.className = 'chart-point';
        point.style.position = 'absolute';
        point.style.left = `${x}px`;
        point.style.top = `${y}px`;
        point.style.width = '8px';
        point.style.height = '8px';
        point.style.borderRadius = '50%';
        point.style.backgroundColor = 'var(--accent-color)';
        point.style.transform = 'translate(-50%, -50%)';
        
        // Create label
        const label = document.createElement('div');
        label.className = 'chart-label';
        label.textContent = item.label;
        label.style.position = 'absolute';
        label.style.bottom = '-25px';
        label.style.left = `${x}px`;
        label.style.transform = 'translateX(-50%)';
        label.style.fontSize = '0.8rem';
        
        // Create value
        const value = document.createElement('div');
        value.className = 'chart-value';
        value.textContent = `${item.value}%`;
        value.style.position = 'absolute';
        value.style.top = `${y - 20}px`;
        value.style.left = `${x}px`;
        value.style.transform = 'translateX(-50%)';
        value.style.fontSize = '0.8rem';
        
        chartContainer.appendChild(point);
        chartContainer.appendChild(label);
        chartContainer.appendChild(value);
    });
    
    // Create SVG for line
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '100%');
    svg.style.position = 'absolute';
    svg.style.top = '0';
    svg.style.left = '0';
    
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', pathD);
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', 'var(--accent-color)');
    path.setAttribute('stroke-width', '2');
    
    svg.appendChild(path);
    chartContainer.appendChild(svg);
    
    container.appendChild(chartContainer);
}      