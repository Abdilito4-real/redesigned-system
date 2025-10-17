document.addEventListener('DOMContentLoaded', function() {
    const path = window.location.pathname.split("/").pop();
    const tabItems = document.querySelectorAll('.mobile-tab-bar .tab-item');

    // Add padding to body if tab bar is visible
    if (window.innerWidth <= 768) {
        document.body.classList.add('mobile-nav-active');
    }

    tabItems.forEach(item => {
        const itemPath = item.getAttribute('href');
        // Handle index.html case and direct matches
        if ((path === '' || path === 'index.html') && itemPath === 'index.html') {
            item.classList.add('active');
        } else if (path === itemPath) {
            item.classList.add('active');
        }
    });
});