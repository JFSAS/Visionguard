async function handleRegister(event) {
    event.preventDefault();
    
    const username = document.getElementById('username').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirm_password').value;
    const errorMessage = document.getElementById('error-message');
    
    // 清除之前的错误信息
    errorMessage.textContent = '';
    
    // 验证两次密码是否一致
    if (password !== confirmPassword) {
        errorMessage.textContent = '两次输入的密码不一致';
        return false;
    }
    
    // 密码强度验证
    if (password.length < 6) {
        errorMessage.textContent = '密码长度至少为6个字符';
        return false;
    }
    
    try {
        const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, email, password }),
        });

        const data = await response.json();

        if (response.ok) {
            // 注册成功，跳转到登录页面
            alert('注册成功，请登录');
            window.location.href = '/login';
        } else {
            // 显示错误信息
            errorMessage.textContent = data.message || '注册失败，请重试';
        }
    } catch (error) {
        console.error('注册请求失败:', error);
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
    const form = document.getElementById('registerForm');
    const password = document.getElementById('password');
    const confirmPassword = document.getElementById('confirm_password');
    
    confirmPassword.addEventListener('input', function() {
        if (this.value !== password.value) {
            this.setCustomValidity('两次输入的密码不一致');
        } else {
            this.setCustomValidity('');
        }
    });
}); 