async function handleLogin(event) {
    event.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const errorMessage = document.getElementById('error-message');
    
    // 清除之前的错误信息
    errorMessage.textContent = '';
    
    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, password }),
            credentials: 'include'  // 包含cookie，用于session
        });

        const data = await response.json();

        if (response.ok) {
            // 登录成功，存储token
            if (data.token) {
                localStorage.setItem('token', data.token);
            }
            // 跳转到仪表盘
            window.location.href = '/dashboard';
        } else {
            // 显示错误信息
            errorMessage.textContent = data.message || '登录失败，请检查用户名和密码';
        }
    } catch (error) {
        console.error('登录请求失败:', error);
        errorMessage.textContent = '网络错误，请稍后重试';
    }
    
    return false;
}

// 添加输入框焦点事件处理
document.addEventListener('DOMContentLoaded', () => {
    const inputs = document.querySelectorAll('input');
    inputs.forEach(input => {
        input.setAttribute('placeholder', ' '); // 添加空白占位符以触发label动画
    });
    
    // 添加表单验证
    const form = document.getElementById('loginForm');
    
    // 如果URL中有错误消息参数，显示错误信息
    const urlParams = new URLSearchParams(window.location.search);
    const errorMsg = urlParams.get('error');
    if (errorMsg) {
        document.getElementById('error-message').textContent = decodeURIComponent(errorMsg);
    }
}); 