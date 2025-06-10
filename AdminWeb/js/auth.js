// Constants
const TOKEN_EXPIRY_DAYS = 3;
const TOKEN_EXPIRY_KEY = 'tokenExpiry';

// Set localStorage item with expiration
function setLocalStorageWithExpiry(key, value) {
    const now = new Date();
    const expiryDate = new Date(now.getTime() + (TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000));
    
    const item = {
        value: value,
        expiry: expiryDate.getTime()
    };
    
    localStorage.setItem(key, JSON.stringify(item));
}

// Get localStorage item and check expiration
function getLocalStorageWithExpiry(key) {
    const itemStr = localStorage.getItem(key);
    
    if (!itemStr) {
        return null;
    }
    
    const item = JSON.parse(itemStr);
    const now = new Date().getTime();
    
    if (now > item.expiry) {
        localStorage.removeItem(key);
        return null;
    }
    
    return item.value;
}

// Check if user is authenticated
function isAuthenticated() {
    const token = getLocalStorageWithExpiry('token');
    return !!token;
}

// Logout function
function logout() {
    // Clear all localStorage items
    localStorage.clear();
    // Redirect to login page
    window.location.href = 'login.html';
}

// Check authentication on page load
function checkAuth() {
    if (!isAuthenticated()) {
        logout();
    }
}

// Export functions
window.auth = {
    setLocalStorageWithExpiry,
    getLocalStorageWithExpiry,
    isAuthenticated,
    logout,
    checkAuth
}; 