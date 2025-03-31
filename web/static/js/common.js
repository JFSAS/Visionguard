/**
 * 公共JavaScript文件 - 处理所有页面共享的功能
 * 包括侧边栏、通知系统和其他公共功能
 */

document.addEventListener('DOMContentLoaded', function() {
    // 初始化侧边栏交互
    initializeSidebar();
    
    // 初始化顶部栏功能
    initializeTopBar();
    
    // 初始化通知系统
    initializeNotifications();
});

/**
 * 初始化侧边栏交互功能
 */
function initializeSidebar() {
    // 处理侧边栏切换按钮
    const sidebarToggle = document.getElementById('sidebar-toggle');
    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', function() {
            document.querySelector('.app-container').classList.toggle('sidebar-collapsed');
        });
    }
    
    // 处理下拉菜单
    const dropdownHeaders = document.querySelectorAll('.nav-item-header');
    dropdownHeaders.forEach(header => {
        header.addEventListener('click', function() {
            const dropdown = this.closest('.dropdown');
            const menu = dropdown.querySelector('.dropdown-menu');
            const icon = this.querySelector('.dropdown-icon');
            
            // 切换图标方向
            icon.classList.toggle('fa-chevron-down');
            icon.classList.toggle('fa-chevron-up');
            
            // 切换菜单显示状态
            dropdown.classList.toggle('active');
            if (dropdown.classList.contains('active')) {
                menu.style.maxHeight = menu.scrollHeight + 'px';
            } else {
                menu.style.maxHeight = '0';
            }
        });
    });
    
    // 如果有active类的dropdown，自动展开
    const activeDropdowns = document.querySelectorAll('.dropdown.active');
    activeDropdowns.forEach(dropdown => {
        const menu = dropdown.querySelector('.dropdown-menu');
        if (menu) {
            menu.style.maxHeight = menu.scrollHeight + 'px';
        }
    });
}

/**
 * 初始化顶部栏功能
 */
function initializeTopBar() {
    // 处理主题切换
    const themeToggle = document.querySelector('.theme-toggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', function() {
            document.body.classList.toggle('light-theme');
            
            const icon = this.querySelector('i');
            if (icon.classList.contains('fa-moon')) {
                icon.classList.remove('fa-moon');
                icon.classList.add('fa-sun');
            } else {
                icon.classList.remove('fa-sun');
                icon.classList.add('fa-moon');
            }
            
            // 保存主题偏好到本地存储
            const currentTheme = document.body.classList.contains('light-theme') ? 'light' : 'dark';
            localStorage.setItem('theme', currentTheme);
        });
        
        // 从本地存储加载主题设置
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'light') {
            document.body.classList.add('light-theme');
            const icon = themeToggle.querySelector('i');
            icon.classList.remove('fa-moon');
            icon.classList.add('fa-sun');
        }
    }
    
    // 处理通知按钮
    const notificationBtn = document.querySelector('.notification-btn');
    if (notificationBtn) {
        notificationBtn.addEventListener('click', function() {
            // 显示通知面板的逻辑将在未来实现
            console.log('通知按钮被点击');
        });
    }
    
    // 处理顶部搜索功能
    const topSearchInput = document.querySelector('.search-bar input');
    if (topSearchInput) {
        topSearchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                // 搜索功能将在未来实现
                console.log('执行搜索:', this.value);
            }
        });
    }
}

/**
 * 初始化通知系统
 */
function initializeNotifications() {
    // 检查是否存在通知容器，如果不存在则创建
    if (!document.getElementById('notification-container')) {
        const notificationContainer = document.createElement('div');
        notificationContainer.id = 'notification-container';
        notificationContainer.className = 'notification-container';
        document.body.appendChild(notificationContainer);
        
        // 添加样式
        const style = document.createElement('style');
        style.textContent = `
            .notification-container {
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 9999;
                display: flex;
                flex-direction: column;
                gap: 10px;
            }
            
            .notification {
                background-color: var(--card-bg);
                border-left: 4px solid;
                border-radius: 4px;
                padding: 15px 20px;
                min-width: 280px;
                max-width: 350px;
                box-shadow: 0 3px 10px rgba(0, 0, 0, 0.3);
                transform: translateX(120%);
                transition: transform 0.3s ease;
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
            }
            
            .notification.show {
                transform: translateX(0);
            }
            
            .notification-success {
                border-color: #4CAF50;
            }
            
            .notification-error {
                border-color: #F44336;
            }
            
            .notification-warning {
                border-color: #FF9800;
            }
            
            .notification-info {
                border-color: var(--primary-color);
            }
            
            .notification-content {
                flex: 1;
            }
            
            .notification-title {
                font-weight: 600;
                margin-bottom: 5px;
                color: var(--text-light);
            }
            
            .notification-message {
                color: var(--text-secondary);
                font-size: 14px;
            }
            
            .notification-close {
                color: var(--text-secondary);
                background: none;
                border: none;
                cursor: pointer;
                font-size: 16px;
                padding: 0;
                margin-left: 10px;
            }
            
            .notification-close:hover {
                color: var(--text-light);
            }
        `;
        document.head.appendChild(style);
    }
}

/**
 * 显示通知
 * @param {string} message - 通知内容
 * @param {string} type - 通知类型: success, error, warning, info
 * @param {string} title - 通知标题 (可选)
 * @param {number} duration - 显示时长 (毫秒) (可选, 默认 3000ms)
 */
function showNotification(message, type = 'info', title = '', duration = 3000) {
    const container = document.getElementById('notification-container');
    
    // 创建通知元素
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    
    // 设置通知内容
    let titleText = title;
    if (!title) {
        switch(type) {
            case 'success':
                titleText = '成功';
                break;
            case 'error':
                titleText = '错误';
                break;
            case 'warning':
                titleText = '警告';
                break;
            case 'info':
                titleText = '提示';
                break;
        }
    }
    
    notification.innerHTML = `
        <div class="notification-content">
            <div class="notification-title">${titleText}</div>
            <div class="notification-message">${message}</div>
        </div>
        <button class="notification-close" aria-label="关闭通知">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    // 添加到容器
    container.appendChild(notification);
    
    // 显示通知动画
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);
    
    // 设置自动关闭
    const timeout = setTimeout(() => {
        closeNotification(notification);
    }, duration);
    
    // 点击关闭按钮
    const closeBtn = notification.querySelector('.notification-close');
    closeBtn.addEventListener('click', () => {
        clearTimeout(timeout);
        closeNotification(notification);
    });
}

/**
 * 关闭通知
 * @param {Element} notification - 通知元素
 */
function closeNotification(notification) {
    notification.classList.remove('show');
    
    // 动画结束后移除元素
    setTimeout(() => {
        notification.remove();
    }, 300);
}

/**
 * 处理用户退出登录
 */
document.addEventListener('DOMContentLoaded', function() {
    const logoutBtn = document.querySelector('.logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            // 显示确认对话框
            if (confirm('确定要退出登录吗？')) {
                // 实际应用中应该调用退出登录的API
                window.location.href = '/logout';
            }
        });
    }
});

// Set active navigation link based on current page
document.addEventListener('DOMContentLoaded', function() {
    const currentPage = window.location.pathname.split('/').pop();
    const navLinks = document.querySelectorAll('.nav-links a');
    
    navLinks.forEach(link => {
        const linkHref = link.getAttribute('href');
        if (linkHref === currentPage || 
            (currentPage === '' && linkHref === 'index.html') || 
            (currentPage === 'situation.html' && linkHref === 'index.html')) {
            link.classList.add('active');
        }
    });
});

// Format date to readable string
function formatDate(date) {
    const options = { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit' 
    };
    return new Date(date).toLocaleDateString('zh-CN', options);
}

// Format time to readable string
function formatTime(date) {
    const options = { 
        hour: '2-digit', 
        minute: '2-digit',
        second: '2-digit'
    };
    return new Date(date).toLocaleTimeString('zh-CN', options);
}

// Toggle fullscreen
function toggleFullscreen(element) {
    if (!document.fullscreenElement) {
        if (element.requestFullscreen) {
            element.requestFullscreen();
        } else if (element.webkitRequestFullscreen) {
            element.webkitRequestFullscreen();
        } else if (element.msRequestFullscreen) {
            element.msRequestFullscreen();
        }
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        } else if (document.msExitFullscreen) {
            document.msExitFullscreen();
        }
    }
}

// Toggle sidebar dropdown menu
document.addEventListener('DOMContentLoaded', function() {
    // Initialize sidebar toggle
    const sidebarToggle = document.getElementById('sidebar-toggle');
    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', function() {
            document.body.classList.toggle('sidebar-collapsed');
        });
    }
    
    // Initialize dropdown menus
    const dropdownHeaders = document.querySelectorAll('.dropdown-header');
    dropdownHeaders.forEach(header => {
        header.addEventListener('click', function() {
            const parent = this.parentElement;
            const menu = parent.querySelector('.dropdown-menu');
            
            // Toggle show class
            if (menu) {
                menu.classList.toggle('show');
            }
            
            // Toggle active class on parent
            parent.classList.toggle('active');
        });
    });
    
    // Handle dropdown in the main navigation
    const navDropdowns = document.querySelectorAll('.nav-item.dropdown');
    navDropdowns.forEach(dropdown => {
        const header = dropdown.querySelector('.nav-item-header');
        if (header) {
            header.addEventListener('click', function() {
                dropdown.classList.toggle('active');
            });
        }
    });
}); 