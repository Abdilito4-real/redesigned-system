// Admin configuration
const ADMIN_EMAIL = 'abdallahabubakar269@gmail.com';
const SESSION_TIMEOUT = 60 * 60 * 1000; // 1 hour

// Authentication state management
let currentUser = null;
let sessionTimer = null;

/**
 * Enhanced authentication state checker
 */
async function checkAuthState() {
    try {
        showLoading('Checking authentication...');

        const { data: { session }, error } = await window.supabaseClient.auth.getSession();
        
        if (error) throw error;
        
        const user = session?.user;
        currentUser = user;
        
        if (user) {
            // Validate session timeout
            const sessionAge = Date.now() - new Date(session.created_at).getTime();
            if (sessionAge > SESSION_TIMEOUT) {
                await logout();
                showNotification('Session expired. Please login again.', 'warning');
                return null;
            }
            
            // Start session timer
            startSessionTimer();
        }
        
        updateAuthUI(user);
        hideLoading();
        return user;
    } catch (error) {
        console.error('Error checking auth state:', error);
        hideLoading();
        showNotification('Authentication error occurred', 'error');
        return null;
    }
}

/**
 * Start session timeout timer
 */
function startSessionTimer() {
    if (sessionTimer) clearTimeout(sessionTimer);
    
    sessionTimer = setTimeout(async () => {
        await logout();
        showNotification('Your session has expired for security reasons.', 'warning');
    }, SESSION_TIMEOUT);
}

/**
 * Enhanced login function
 */
async function login(email, password) {
    showLoading('Signing you in...');
    try {
        // Basic validation
        if (!email || !password) {
            throw new Error('Please enter both email and password.');
        }
        
        const { data, error } = await window.supabaseClient.auth.signInWithPassword({
            email: email.trim().toLowerCase(),
            password: password
        });
        
        if (error) throw error;
        
        // Verify admin privileges
        if (data.user.email !== ADMIN_EMAIL) {
            await logout();
            throw new Error('Access denied. Admin privileges required.');
        }
        
        // Start session timer
        startSessionTimer();
        
        hideLoading();
        showNotification('Welcome back! Login successful.', 'success');

        // Redirect to intended page or dashboard
        const redirectUrl = sessionStorage.getItem('authRedirect');
        sessionStorage.removeItem('authRedirect');
        window.location.href = redirectUrl || 'admin-dashboard.html';

        return data;
    } catch (error) {
        hideLoading();
        console.error('Login error:', error);
        
        let errorMessage = 'Login failed. Please try again.';
        if (error.message.includes('Invalid login credentials')) {
            errorMessage = 'Invalid email or password. Please try again.';
        } else if (error.message.includes('Email not confirmed')) {
            errorMessage = 'Please verify your email address before logging in.';
        } else if (error.message) {
            errorMessage = error.message;
        }
        
        throw new Error(errorMessage);
    }
}

/**
 * Enhanced logout function
 */
async function logout() {
    try {
        showLoading('Logging out...');
        
        if (sessionTimer) {
            clearTimeout(sessionTimer);
            sessionTimer = null;
        }
        
        const { error } = await window.supabaseClient.auth.signOut();
        if (error) throw error;
        
        currentUser = null;
        showNotification('You have been logged out successfully.', 'success');
        
        setTimeout(() => {
            hideLoading();
            window.location.href = 'index.html';
        }, 1000);
        
    } catch (error) {
        console.error('Logout error:', error);
        hideLoading();
        // Force redirect even if there's an error
        window.location.href = 'index.html';
    }
}

/**
 * Enhanced admin authentication check
 */
async function checkAdminAuth() {
    try {
        const { data: { session }, error } = await window.supabaseClient.auth.getSession();
        
        if (error) throw error;
        
        if (!session) {
            sessionStorage.setItem('authRedirect', window.location.href);
            window.location.href = 'login.html?message=Access denied. Admin login required.';
            return false;
        }

        if (session.user.email !== ADMIN_EMAIL) {
            await logout(); // Log out the non-admin user
            sessionStorage.setItem('authRedirect', window.location.href);
            window.location.href = 'login.html?message=Access denied. Admin privileges required.';
            return false;
        }
        return true;
    } catch (error) {
        console.error('Admin auth check error:', error);
        window.location.href = 'login.html?message=Authentication error. Please login again.';
        return false;
    }
}

/**
 * Updates the entire UI based on authentication state using data attributes.
 * This is more efficient as it minimizes direct DOM manipulation and leverages CSS.
 *
 * It controls elements with the following data attributes:
 * - `data-auth="guest-only"`: Visible only to logged-out users.
 * - `data-auth="authed-only"`: Visible only to logged-in users.
 * - `data-auth="admin-only"`: Visible only to logged-in admin users.
 */
function updateAuthUI(user) {
    const body = document.body;

    if (user) {
        body.dataset.authState = 'loggedIn';
        if (user.email === ADMIN_EMAIL) {
            body.dataset.userRole = 'admin';
        } else {
            body.dataset.userRole = 'user';
        }
    } else {
        body.dataset.authState = 'loggedOut';
        body.dataset.userRole = 'guest';
    }
}

/**
 * Injects CSS rules for auth-based UI visibility.
 * This avoids having to add a new stylesheet.
 */
function injectAuthStyles() {
    const style = document.createElement('style');
    style.textContent = `
        body[data-auth-state="loggedOut"] [data-auth="authed-only"],
        body[data-auth-state="loggedOut"] [data-auth="admin-only"] { display: none !important; }

        body[data-auth-state="loggedIn"] [data-auth="guest-only"] { display: none !important; }

        body[data-auth-state="loggedIn"][data-user-role="user"] [data-auth="admin-only"] { display: none !important; }
    `;
    document.head.appendChild(style);
}

/**
 * Enhanced loading state management
 */
function showLoading(message = 'Loading...') {
    // Remove existing loading overlay
    hideLoading();
    
    const loadingOverlay = document.createElement('div');
    loadingOverlay.className = 'loading-overlay';
    loadingOverlay.id = 'globalLoading';
    
    loadingOverlay.innerHTML = `
        <div class="loading-spinner"></div>
        <div class="loading-text">${message}</div>
    `;
    
    document.body.appendChild(loadingOverlay);
    document.body.style.overflow = 'hidden';
}

function hideLoading() {
    const existingLoading = document.getElementById('globalLoading');
    if (existingLoading) {
        existingLoading.remove();
    }
    document.body.style.overflow = '';
}

/**
 * Enhanced notification system
 */
function showNotification(message, type = 'info', duration = 5000) {
    const container = document.getElementById('notificationContainer') || createNotificationContainer();
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    
    const icons = {
        success: '<i class="fas fa-check-circle"></i>',
        error: '<i class="fas fa-times-circle"></i>',
        warning: '<i class="fas fa-exclamation-triangle"></i>',
        info: '<i class="fas fa-info-circle"></i>'
    };
    
    notification.innerHTML = `
        <div class="notification-icon">${icons[type] || icons.info}</div>
        <div class="notification-content">${message}</div>
        <button class="notification-close" onclick="this.parentElement.remove()">×</button>
    `;
    
    container.appendChild(notification);
    
    // Auto-remove after duration
    setTimeout(() => {
        if (notification.parentElement) {
            notification.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => {
                if (notification.parentElement) {
                    notification.remove();
                }
            }, 300);
        }
    }, duration);
}

function createNotificationContainer() {
    const container = document.createElement('div');
    container.id = 'notificationContainer';
    container.className = 'notification-container';
    document.body.appendChild(container);
    return container;
}

// Global event listeners
document.addEventListener('DOMContentLoaded', function() {
    // Create notification container
    injectAuthStyles();
    createNotificationContainer();
    
    // Logout buttons
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }
    
    const mobileLogoutBtn = document.getElementById('mobileLogoutBtn');
    if (mobileLogoutBtn) {
        mobileLogoutBtn.addEventListener('click', logout);
    }
    
    // Check for redirect messages
    const urlParams = new URLSearchParams(window.location.search);
    const message = urlParams.get('message');
    if (message) {
        showNotification(decodeURIComponent(message), 'error');
        // Clean URL
        window.history.replaceState({}, document.title, window.location.pathname);
    }
    
    // Initialize auth state
    checkAuthState();
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        supabase,
        checkAuthState,
        login,
        logout,
        checkAdminAuth,
        showNotification,
        showLoading,
        hideLoading
    };
}