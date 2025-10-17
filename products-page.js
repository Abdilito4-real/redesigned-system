let currentPage = 1;
const productsPerPage = 12;
let allProducts = [];

document.addEventListener('DOMContentLoaded', function() {
    // Only run this script on the products page
    if (document.getElementById('productsGrid')) {
        initializeProductsPage();
    }
});

function initializeProductsPage() {
    // Event listeners
    document.getElementById('filterSearch').addEventListener('input', handleSearch);
    document.getElementById('sortBy').addEventListener('change', loadAllProducts);
    document.getElementById('filterCategory').addEventListener('change', loadAllProducts);
    document.getElementById('clearSearch').addEventListener('click', clearSearch);
    document.getElementById('loadMoreBtn').addEventListener('click', loadMoreProducts);
    document.getElementById('mobileFilterToggle').addEventListener('click', toggleMobileFilters);

    // Event delegation for dynamically created buttons
    document.getElementById('productsGrid').addEventListener('click', function(e) {
        if (e.target.closest('.whatsapp-btn')) {
            const card = e.target.closest('.product-card');
            const title = card.querySelector('h3').textContent;
            contactAboutProduct(title);
        }
        if (e.target.closest('.clear-filters-btn')) {
            clearAllFilters();
        }
    });

    // Initialize products
    loadAllProducts();
}

function handleSearch() {
    const searchInput = document.getElementById('filterSearch');
    const clearButton = document.getElementById('clearSearch');
    
    clearButton.style.display = searchInput.value.length > 0 ? 'flex' : 'none';
    
    // Debounce search
    setTimeout(() => {
        loadAllProducts();
    }, 300);
}

function clearSearch() {
    document.getElementById('filterSearch').value = '';
    document.getElementById('clearSearch').style.display = 'none';
    loadAllProducts();
}

async function loadAllProducts() {
    currentPage = 1;
    const productsLoading = document.getElementById('productsLoading');
    const loadMoreContainer = document.getElementById('loadMoreContainer');

    if(productsLoading) productsLoading.style.display = 'flex';
    if(loadMoreContainer) loadMoreContainer.style.display = 'none';

    const filters = {
        search: document.getElementById('filterSearch').value,
        category: document.getElementById('filterCategory').value,
        sort: document.getElementById('sortBy').value
    };

    allProducts = await fetchProducts(filters);
    displayProductsPage(allProducts.slice(0, productsPerPage), 'productsGrid');
    updateProductsCount(allProducts.length);
    
    if(productsLoading) productsLoading.style.display = 'none';

    // Show load more button if there are more products
    if (allProducts.length > productsPerPage) {
        if(loadMoreContainer) loadMoreContainer.style.display = 'block';
    }
}

function loadMoreProducts() {
    currentPage++;
    const startIndex = (currentPage - 1) * productsPerPage;
    const endIndex = startIndex + productsPerPage;
    const nextProducts = allProducts.slice(startIndex, endIndex);
    
    displayProductsPage(nextProducts, 'productsGrid', true);
    
    // Hide load more button if no more products
    if (endIndex >= allProducts.length) {
        document.getElementById('loadMoreContainer').style.display = 'none';
    }
}

function displayProductsPage(products, containerId, append = false) {
    const container = document.getElementById(containerId);
    
    if (!append) {
        container.innerHTML = '';
    }

    if (!products || products.length === 0) {
        if (!append) {
            container.innerHTML = `
                <div class="no-products">
                    <i class="fas fa-search no-products-icon"></i>
                    <h3>No Products Found</h3>
                    <p>Try adjusting your search criteria or browse different categories</p>
                    <button class="btn clear-filters-btn">
                        <i class="fas fa-times"></i>
                        Clear All Filters
                    </button>
                </div>
            `;
        }
        return;
    }

    const productsHTML = products.map(product => `
        <div class="product-card" data-product-id="${product.id}">
            ${product.featured ? '<div class="product-badge">Featured</div>' : ''}
            <img src="${product.image}" alt="${product.title}" class="product-img" 
                 loading="lazy"
                 onerror="this.src='https://images.unsplash.com/photo-1567401893414-76b7b1e5a7a5?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80'">
            <div class="product-details">
                <div class="product-price">${formatCurrency(product.price)}</div>
                <h3>${product.title}</h3>
                <p class="product-description">${product.description || 'Premium quality wears designed for style and comfort.'}</p>
                <div class="product-features">
                    <span class="product-category">${product.category || 'Fashion'}</span>
                    <span class="product-stock">
                        <i class="fas fa-box"></i>
                        ${product.stock || 0} in stock
                    </span>
                </div>
                <button class="btn whatsapp-btn">
                    <i class="fab fa-whatsapp"></i>
                    Inquire on WhatsApp
                </button>
            </div>
        </div>
    `).join('');

    if (append) {
        container.innerHTML += productsHTML;
    } else {
        container.innerHTML = productsHTML;
    }
}

function updateProductsCount(count) {
    const countElement = document.getElementById('productsCount');
    if (countElement) {
        countElement.textContent = `${count} product${count !== 1 ? 's' : ''} found`;
    }
}

function clearAllFilters() {
    document.getElementById('filterSearch').value = '';
    document.getElementById('filterCategory').value = '';
    document.getElementById('sortBy').value = 'created_at';
    document.getElementById('clearSearch').style.display = 'none';
    loadAllProducts();
}

function toggleMobileFilters() {
    const filterGrid = document.querySelector('.filter-grid');
    filterGrid.classList.toggle('mobile-active');
}