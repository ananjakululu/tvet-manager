document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    const themeToggle = document.getElementById('themeToggle');

    // --- Theme Toggle Logic ---
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);

    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            const currentTheme = document.documentElement.getAttribute('data-theme');
            const newTheme = currentTheme === 'light' ? 'dark' : 'light';
            document.documentElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
            updateThemeIcon(newTheme);
        });
    }

    function updateThemeIcon(theme) {
        if(themeToggle) {
            themeToggle.innerHTML = theme === 'light' ? '<i class="fa-solid fa-moon"></i>' : '<i class="fa-solid fa-sun"></i>';
        }
    }

    // --- Login Logic ---
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('loginBtn');
            const originalText = btn.innerHTML;
            
            // Show loading state
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Signing In...';
            btn.disabled = true;

            const email = document.getElementById('loginEmail').value;
            const password = document.getElementById('loginPass').value;

            try {
                // ✅ FIX: Using RELATIVE PATH (/api/login)
                // This ensures it works on both PC (localhost) and Phone (IP Address)
                const response = await fetch('/api/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ email, password })
                });

                const data = await response.json();

                if (data.success) {
                    // Save credentials for future requests
                    localStorage.setItem('token', data.token);
                    localStorage.setItem('user', JSON.stringify(data.user));

                    showToast('Login Successful! Redirecting...', 'success');

                    // Redirect to Dashboard
                    setTimeout(() => {
                        window.location.href = 'dashboard.html'; 
                    }, 1500);
                } else {
                    showToast(data.message || 'Invalid credentials', 'error');
                    btn.disabled = false;
                    btn.innerHTML = originalText;
                }
            } catch (error) {
                console.error('Login Error:', error);
                showToast('Network Error. Ensure you are on the same network.', 'error');
                btn.disabled = false;
                btn.innerHTML = originalText;
            }
        });
    }

    // --- Signup Logic (Placeholder) ---
    if (signupForm) {
        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            showToast('Signup is currently disabled for demo.', 'error');
        });
    }
});

// --- Helper Functions ---

// Toast Notification System
function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icon = type === 'success' ? '<i class="fa-solid fa-check-circle"></i>' : '<i class="fa-solid fa-exclamation-circle"></i>';
    
    toast.innerHTML = `
        ${icon}
        <span>${message}</span>
    `;

    container.appendChild(toast);

    // Remove toast after 3 seconds
    setTimeout(() => {
        toast.style.animation = 'slideIn 0.3s ease-in reverse';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Toggle Password Visibility
function togglePasswordVisibility() {
    const input = document.getElementById('loginPass');
    const icon = document.querySelector('.toggle-password i');
    
    if (input.type === 'password') {
        input.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
    } else {
        input.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
    }
}

// Switch between Login and Signup modes
function switchMode(mode) {
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    const slider = document.getElementById('slider');
    const btns = document.querySelectorAll('.toggle-btn');

    if (mode === 'login') {
        loginForm.classList.remove('hidden');
        signupForm.classList.add('hidden');
        slider.style.transform = 'translateX(0)';
        btns[0].classList.add('active');
        btns[1].classList.remove('active');
    } else {
        loginForm.classList.add('hidden');
        signupForm.classList.remove('hidden');
        slider.style.transform = 'translateX(100%)';
        btns[0].classList.remove('active');
        btns[1].classList.add('active');
    }
}