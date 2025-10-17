// ===============================
//  Admin Dashboard (Supabase CRUD + Stats + UX)
// ===============================

const supabase = window.supabaseClient;
let products = []; // This will hold the products for the admin dashboard

// ========== Initialization ==========
async function initializeAdminDashboard() {
    // Ensure user is an admin before proceeding
    const isAdmin = await checkAdminAuth();
    if (!isAdmin) return setupLoginListeners(); // If not admin, just set up login form

    try {
        showLoading('Initializing Dashboard...');
        setupNavigation();
        setupEventListeners();
        // Initial view is determined by hash or default to dashboard
        handleHashChange();
        hideLoading();
        console.log("✅ Admin Dashboard Initialized");
    } catch (error) {
        console.error("Error initializing dashboard:", error);
        showNotification("Failed to initialize dashboard.", "error");
        hideLoading();
    }
}

// ========== View Navigation ==========
function setupNavigation() {
    const links = document.querySelectorAll(".nav-item a");
    const views = document.querySelectorAll(".admin-view");

    // Handle clicks on sidebar links
    links.forEach(link => {
        link.addEventListener("click", e => {
            const href = link.getAttribute('href');
            if (href && href.startsWith('#')) {
                e.preventDefault();
                window.location.hash = href;
            }
        });
    });

    // Listen for hash changes to switch views
    window.addEventListener('hashchange', handleHashChange);
}

function handleHashChange() {
    const hash = window.location.hash || '#dashboard-view';
    showView(hash.substring(1));
}

function showView(viewId) {
    document.querySelectorAll('.admin-view').forEach(view => {
        view.style.display = 'none';
    });

    const targetView = document.getElementById(viewId);
    if (targetView) {
        targetView.style.display = 'block';
    } else {
        document.getElementById('dashboard-view').style.display = 'block'; // Fallback
    }

    // Update active nav item
    document.querySelectorAll('.sidebar-nav .nav-item').forEach(item => {
        const link = item.querySelector('a');
        if (link && link.getAttribute('href') === `#${viewId}`) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });

    // Load data for the specific view
    switch (viewId) {
        case 'dashboard-view':
            loadDashboardStats();
            loadRecentProducts();
            break;
        case 'products-view':
            loadProducts();
            break;
        case 'product-form-view':
            // This view is typically opened by a function, but handle direct access
            break;
        case 'analytics-view':
            // Load analytics data if any
            break;
    }
}

// ========== Fetch Products ==========
async function loadProducts() {
    const loading = document.getElementById("productsLoading");
    if (loading) loading.style.display = "block";

    try {
        const { data, error } = await supabase.from("products").select("*").order("created_at", { ascending: false });
        if (error) throw error;
        products = data || [];

        renderProductsTable(products);

    } catch (error) {
        console.error("❌ Error loading products:", error);
        showNotification("Failed to load products.", "error");
    } finally {
        if (loading) loading.style.display = "none";
    }
}

// ========== Render Products Table ==========
function renderProductsTable(data) {
    const table = document.getElementById("productsTable");
    if (!table) return;

    if (data.length === 0) {
        table.innerHTML = `<p class="no-data">No products found.</p>`;
        return;
    }

    table.innerHTML = `
        <table class="products-table">
            <thead>
                <tr>
                    <th>Image</th>
                    <th>Title</th>
                    <th>Category</th>
                    <th>Price</th>
                    <th>Stock</th>
                    <th>Featured</th>
                    <th>Status</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${data.map(p => `
                    <tr>
                        <td><img src="${p.image || ""}" alt="${p.title}"></td>
                        <td>${p.title}</td>
                        <td>${p.category}</td>
                        <td>${formatCurrency(p.price)}</td>
                        <td>${p.stock ?? 0}</td>
                        <td>${p.featured ? "⭐" : "-"}</td>
                        <td>
                            <span class="status-badge ${p.active ? "status-active" : "status-inactive"}">
                                ${p.active ? "Active" : "Inactive"}
                            </span>
                        </td>
                        <td class="table-actions">
                            <button class="btn-sm btn-outline edit-product-btn" data-id="${p.id}">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn-sm btn-outline btn-danger delete-product-btn" data-id="${p.id}">
                                <i class="fas fa-trash"></i>
                            </button>
                        </td>
                    </tr>
                `).join("")}
            </tbody>
        </table>
    `;
}

// ========== Stats ==========
async function loadDashboardStats() {
    showLoading('Loading store stats...');
    try {
        const { data, error } = await supabase.from("products").select("*");
        if (error) throw error;

        const totalProducts = data.length;
        const featuredProducts = data.filter(p => p.featured).length;
        const totalStock = data.reduce((sum, p) => sum + (p.stock || 0), 0);
        const totalValue = data.reduce((sum, p) => sum + (p.price || 0) * (p.stock || 0), 0);

        document.getElementById("totalProducts").textContent = totalProducts;
        document.getElementById("featuredProducts").textContent = featuredProducts;
        document.getElementById("totalStock").textContent = totalStock;
        document.getElementById("totalValue").textContent = formatCurrency(totalValue);

    } catch (err) {
        console.error("Error loading stats:", err);
        showNotification("Could not load store statistics.", "error");
    } finally {
        hideLoading();
    }
}

// ========== CRUD: Add / Edit / Delete ==========
function openProductForm(existing = null) {
    window.location.hash = '#product-form-view';

    const form = document.getElementById("productForm");
    form.reset();

    // Reset image preview
    const previewImage = document.querySelector('#imagePreview .image-preview-image');
    const previewText = document.querySelector('#imagePreview .image-preview-text');
    previewImage.src = '';
    previewImage.style.display = 'none';
    previewText.style.display = 'flex';

    if (existing) {
        document.getElementById("form-title").textContent = "Edit Product";
        document.getElementById("productId").value = existing.id;
        document.getElementById("title").value = existing.title;
        document.getElementById("description").value = existing.description;
        document.getElementById("price").value = existing.price;
        document.getElementById("stock").value = existing.stock;
        document.getElementById("category").value = existing.category;
        document.getElementById("featured").checked = existing.featured;
        document.getElementById("active").checked = existing.active;
        document.getElementById("imageUrl").value = existing.image;
        if (existing.image) {
            previewImage.src = existing.image;
            previewImage.style.display = 'block';
            previewText.style.display = 'none';
        }
    } else {
        document.getElementById("form-title").textContent = "Add New Product";
    }
}

async function editProduct(id) {
    const product = products.find(p => p.id === id);
    if (!product) return;
    openProductForm(product);
}

async function deleteProduct(id) {
    if (!confirm("Are you sure you want to delete this product?")) return;
    showLoading('Deleting product...');
    const { error } = await supabase.from("products").delete().eq("id", id);
    hideLoading();
    if (error) {
        showNotification("Failed to delete product", "error");
        console.error(error);
    } else {
        showNotification("Product deleted successfully", "success");
        await loadProducts();
        await loadDashboardStats();
    }
}

// ========== Form Submission ==========
function setupEventListeners() {
    const form = document.getElementById("productForm");
    const fileInput = document.getElementById("imageFile");
    const preview = document.getElementById("imagePreview");

    // Image preview handler
    preview.addEventListener("click", () => fileInput.click());
    fileInput.addEventListener("change", e => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            preview.querySelector(".image-preview-image").src = reader.result;
            preview.querySelector(".image-preview-image").style.display = "block";
            preview.querySelector(".image-preview-text").style.display = "none";
        };
        reader.readAsDataURL(file);
    });

    // Form submission handler
    form.addEventListener("submit", async e => {
        e.preventDefault();
        const submitButton = form.querySelector('button[type="submit"]');
        submitButton.disabled = true;
        showLoading('Saving product...');

        const id = document.getElementById("productId").value;
        const file = fileInput.files[0];
        let imageUrl = document.getElementById("imageUrl").value;

        // Title and Price are required
        const title = document.getElementById("title").value;
        const price = document.getElementById("price").value;
        const category = document.getElementById("category").value;

        if (!title || !price || !category) {
            hideLoading();
            showNotification("Please fill in all required fields: Title, Price, and Category.", "error");
            submitButton.disabled = false;
            return;
        }

        // A new product requires an image
        if (!id && !file) {
            hideLoading();
            showNotification("Please select an image for the new product.", "error");
            submitButton.disabled = false;
            return;
        }

        // Upload image if new file selected
        if (file) {
            const fileName = `${Date.now()}_${file.name}`;
            const { data: imgData, error: imgError } = await supabase.storage
                .from("products")
                .upload(fileName, file);

            if (imgError) {
                hideLoading();
                showNotification("Image upload failed.", "error");
                console.error(imgError);
                return;
            }

            const { data: publicUrl } = supabase.storage.from("products").getPublicUrl(fileName);
            imageUrl = publicUrl.publicUrl;
        }

        const newProduct = {
            title: title,
            description: document.getElementById("description").value,
            price: parseFloat(price),
            stock: parseInt(document.getElementById("stock").value) || 0,
            category: category,
            featured: document.getElementById("featured").checked,
            active: document.getElementById("active").checked,
            image: imageUrl
        };

        try {
            if (id) {
                // Update
                const { error } = await supabase.from("products").update(newProduct).eq("id", id);
                if (error) throw error;
                showNotification("Product updated successfully", "success");
            } else {
                // Insert
                const { error } = await supabase.from("products").insert([newProduct]);
                if (error) throw error;
                showNotification("Product added successfully", "success");
            }
            window.location.hash = "#products-view";
            await loadProducts();
            await loadDashboardStats();
        } catch (error) {
            console.error(error);
            showNotification("Error saving product", "error");
        } finally {
            hideLoading();
            submitButton.disabled = false;
            form.reset();
        }
    });

    // Event delegation for table buttons
    const productsTableContainer = document.getElementById('productsTable');
    if (productsTableContainer) {
        productsTableContainer.addEventListener('click', (e) => {
            const editButton = e.target.closest('.edit-product-btn');
            if (editButton) {
                editProduct(editButton.dataset.id);
            }

            const deleteButton = e.target.closest('.delete-product-btn');
            if (deleteButton) {
                deleteProduct(deleteButton.dataset.id);
            }
        });
    }

    // Event delegation for "Add New Product" buttons
    document.body.addEventListener('click', (e) => {
        if (e.target.closest('.add-product-btn')) {
            openProductForm();
        }
    });

    // Cancel button on form
    const cancelButton = document.querySelector('#product-form-view .btn-outline');
    if (cancelButton) {
        cancelButton.addEventListener('click', () => {
            window.location.hash = '#products-view';
        });
    }
}

function setupLoginListeners() {
    const loginForm = document.getElementById('loginForm');
    if (!loginForm) return;

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const loginButton = document.getElementById('loginButton');
        loginButton.disabled = true;

        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        try {
            await login(email, password);
            // The login function in auth.js handles redirection on success
            // We can re-initialize the dashboard view here
            const adminLoginSection = document.getElementById('adminLoginSection');
            const adminDashboard = document.getElementById('adminDashboard');
            adminLoginSection.style.display = 'none';
            adminDashboard.style.display = 'block';
            await initializeAdminDashboard();

        } catch (error) {
            showNotification(error.message, 'error');
            loginButton.disabled = false;
        }
    });

    const passwordToggle = document.getElementById('passwordToggle');
    if (passwordToggle) {
        passwordToggle.addEventListener('click', function() {
            const passwordInput = document.getElementById('password');
            const icon = this.querySelector('i');
            if (passwordInput.type === 'password') {
                passwordInput.type = 'text';
                icon.className = 'fas fa-eye-slash';
            } else {
                passwordInput.type = 'password';
                icon.className = 'fas fa-eye';
            }
        });
    }
}

document.addEventListener('DOMContentLoaded', initializeAdminDashboard);
