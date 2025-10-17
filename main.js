/* global supabase, fetchProducts, displayProducts */

document.addEventListener('DOMContentLoaded', function() {
    // --- Mobile Nav Logic ---
    initializeMobileNav();

    // Check if we are on the home page before running home-page specific code
    if (document.getElementById('featured-products')) {
        loadFeaturedProducts();
    }
});

function initializeMobileNav() {
    // Hamburger menu for desktop-style nav on mobile
    const mobileMenu = document.querySelector('.mobile-menu');
    const nav = document.querySelector('header nav');
    if (mobileMenu && nav) {
        mobileMenu.addEventListener('click', function() {
            nav.classList.toggle('active');
            mobileMenu.classList.toggle('active');
            mobileMenu.setAttribute('aria-expanded', mobileMenu.getAttribute('aria-expanded') === 'true' ? 'false' : 'true');
        });
    }

    // Tab bar for primary mobile navigation
    const path = window.location.pathname.split("/").pop() || 'index.html';
    const tabItems = document.querySelectorAll('.mobile-tab-bar .tab-item');

    // Add padding to body if tab bar is visible
    if (window.innerWidth <= 768) {
        document.body.classList.add('mobile-nav-active');
        // The CSS for .mobile-tab-bar now handles its visibility
    }

    tabItems.forEach(item => {
        const itemPath = item.getAttribute('href');
        if (path === itemPath) {
            item.classList.add('active');
        }
    });
}

async function loadFeaturedProducts() {
    const productsGrid = document.getElementById('productsGrid');
    const productsLoading = document.getElementById('productsLoading');
    if (!productsGrid || !productsLoading) return;

    productsLoading.style.display = 'flex';
    const products = await fetchProducts({ featured: true, limit: 6 });
    displayProducts(products, 'productsGrid');
    productsLoading.style.display = 'none';
}