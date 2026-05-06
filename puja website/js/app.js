// Global State
let currentUser = null;
let cart = JSON.parse(localStorage.getItem('pujaCart')) || [];
window.loadedProducts = window.loadedProducts || [];

// --- Authentication & Header Logic ---
if (window.auth) {
    // Handle redirect result for mobile logins
    auth.getRedirectResult().then(async (result) => {
        if (result.user && window.db) {
            await db.collection('users').doc(result.user.uid).set({
                name: result.user.displayName,
                email: result.user.email,
                uid: result.user.uid,
                lastLogin: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
        }
    }).catch(error => console.error("Redirect login error:", error));

    window.makeMeAdmin = async () => {
        if (currentUser && window.db) {
            await db.collection('users').doc(currentUser.uid).set({ role: 'Admin' }, { merge: true });
            alert('Success! You are now an Admin. You can now open admin.html');
        } else {
            alert('Please login first!');
        }
    };

    auth.onAuthStateChanged(async (user) => {
        currentUser = user;
        const accountSpan = document.getElementById('user-name-desktop');
        const userNavSpan = document.getElementById('user-name-mobile');

        if (user) {
            const userName = user.displayName || user.email.split('@')[0];
            if (accountSpan) accountSpan.textContent = userName;
            if (userNavSpan) userNavSpan.textContent = userName;

            // Show logout button if it exists
            const logoutBtn = document.getElementById('logout-btn-desktop');
            if (logoutBtn) logoutBtn.classList.remove('hidden');

            syncCartCount();
        } else {
            if (accountSpan) accountSpan.textContent = "Account";
            if (userNavSpan) userNavSpan.textContent = "User";

            const logoutBtn = document.getElementById('logout-btn-desktop');
            if (logoutBtn) logoutBtn.classList.add('hidden');

            updateCartCount();
        }
    });
}

// --- Cart Logic (Local & Firestore) ---

function saveCart() {
    localStorage.setItem('pujaCart', JSON.stringify(cart));
    updateCartCount();
}

async function syncCartCount() {
    if (!currentUser || !window.db) return;
    try {
        const snapshot = await db.collection('carts').where('userId', '==', currentUser.uid).get();
        const totalCount = snapshot.docs.reduce((sum, doc) => sum + (doc.data().quantity || 1), 0);
        updateUIWithCartCount(totalCount);
    } catch (error) { console.error("Sync error:", error); }
}

function updateCartCount() {
    const totalCount = cart.reduce((sum, item) => sum + item.quantity, 0);
    updateUIWithCartCount(totalCount);
}

function updateUIWithCartCount(count) {
    const countElements = document.querySelectorAll('.cart-count');
    countElements.forEach(el => {
        el.textContent = count;
        el.style.display = count > 0 ? 'flex' : 'none';
    });
}

async function addToCart(productId, qty = 1) {
    const product = window.loadedProducts.find(p => p.id == productId) || (typeof mockProducts !== 'undefined' ? mockProducts.find(p => p.id == productId) : null);
    if (!product) return;

    if (currentUser && window.db) {
        try {
            const cartRef = db.collection('carts');
            const snapshot = await cartRef.where('userId', '==', currentUser.uid).where('productId', '==', productId).get();
            if (!snapshot.empty) {
                await cartRef.doc(snapshot.docs[0].id).update({
                    quantity: firebase.firestore.FieldValue.increment(qty)
                });
            } else {
                await cartRef.add({
                    userId: currentUser.uid, productId, quantity: qty,
                    name: product.name, price: product.price, image: product.image,
                    addedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            }
            showToast(`Added ${product.name} to your account!`, "success");
            syncCartCount();
        } catch (e) { showToast("Failed to sync cart.", "error"); }
    } else {
        const existing = cart.find(item => item.id == productId);
        if (existing) existing.quantity += qty;
        else cart.push({ ...product, quantity: qty });
        saveCart();
        showToast(`Added ${product.name} to local cart!`, "success");
    }
}

async function removeFromCart(productId) {
    if (currentUser && window.db) {
        try {
            const cartRef = db.collection('carts');
            const snapshot = await cartRef.where('userId', '==', currentUser.uid).where('productId', '==', productId).get();
            if (!snapshot.empty) {
                await cartRef.doc(snapshot.docs[0].id).delete();
                syncCartCount();
                if (typeof renderCart === 'function') renderCart();
            }
        } catch (e) { console.error("Remove error:", e); }
    } else {
        cart = cart.filter(item => item.id != productId);
        saveCart();
        if (typeof renderCart === 'function') renderCart();
    }
}

// --- UI Rendering Functions ---

function showToast(message, type = "success") {
    const existing = document.querySelector('.toast-notification');
    if (existing) existing.remove();
    const toast = document.createElement('div');
    const bgColor = type === "success" ? "bg-gray-900/90" : "bg-red-600/90";
    toast.className = `toast-notification fixed bottom-28 left-1/2 transform -translate-x-1/2 ${bgColor} text-white px-8 py-4 rounded-[2rem] shadow-2xl z-[100] text-sm fade-in flex items-center gap-4 backdrop-blur-md border border-white/10`;
    toast.innerHTML = `<i class="ph-fill ${type === "success" ? 'ph-check-circle text-green-400' : 'ph-warning-circle text-white'} text-xl"></i><span class="font-bold">${message}</span>`;
    document.body.appendChild(toast);
    setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 500); }, 3000);
}

async function renderProducts(containerId, productsToRender = null, query = '') {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (!productsToRender && window.db) {
        try {
            renderSkeleton(containerId);
            const snapshot = await db.collection('products').get();
            productsToRender = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            window.allProducts = productsToRender;
        } catch (e) { console.error(e); }
    }

    let filtered = productsToRender || [];
    if (query) {
        filtered = filtered.filter(p =>
            p.name.toLowerCase().includes(query.toLowerCase()) ||
            p.category.toLowerCase().includes(query.toLowerCase()) ||
            (p.description && p.description.toLowerCase().includes(query.toLowerCase()))
        );
    }

    const isSearch = !!query;
    container.className = isSearch ? 'space-y-3 px-4' : 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3';

    container.innerHTML = filtered.map((product, idx) => {
        if (!window.loadedProducts.find(lp => lp.id == product.id)) window.loadedProducts.push(product);

        if (isSearch) {
            // Amazon-style list layout
            return `
            <div class="bg-white rounded-2xl border border-gray-100 p-4 flex gap-4 hover:shadow-xl transition-all group fade-in" style="animation-delay: ${idx * 50}ms">
                <a href="product.html?id=${product.id}" class="w-32 h-32 flex-shrink-0 bg-gray-50 rounded-xl overflow-hidden">
                    <img src="${product.image}" class="w-full h-full object-cover group-hover:scale-110 transition-all">
                </a>
                <div class="flex-grow flex flex-col justify-between">
                    <div>
                        <div class="flex justify-between items-start">
                            <span class="text-[10px] font-black text-saffron uppercase tracking-widest">${product.category}</span>
                            <button onclick="toggleWishlist('${product.id}')" id="wish-${product.id}" class="text-gray-300 hover:text-red-500 transition-all">
                                <i class="ph ph-heart text-xl"></i>
                            </button>
                        </div>
                        <h3 class="font-bold text-gray-900 text-sm mb-1">${product.name}</h3>
                        <p class="text-xs text-gray-400 line-clamp-1">${product.description}</p>
                    </div>
                    <div class="flex items-center justify-between mt-2">
                        <span class="font-black text-gray-900 text-lg">₹${product.price}</span>
                        <div class="flex gap-2">
                            <button onclick="addToCart('${product.id}')" class="bg-gray-100 text-gray-900 px-4 py-2 rounded-xl text-xs font-bold hover:bg-gray-200 transition-all">Add</button>
                            <button onclick="buyNow('${product.id}')" class="bg-saffron text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-saffron-dark transition-all">Buy Now</button>
                        </div>
                    </div>
                </div>
            </div>`;
        }

        // Standard grid layout — compact card on all screen sizes
        return `
        <div class="bg-white rounded-2xl border border-gray-100 overflow-hidden hover-lift flex flex-col relative group fade-in" style="animation-delay: ${idx * 50}ms">
            <button onclick="toggleWishlist('${product.id}')" id="wish-grid-${product.id}" class="absolute top-2 right-2 z-10 w-7 h-7 bg-white/80 backdrop-blur-md rounded-full flex items-center justify-center text-gray-400 hover:text-red-500 transition-all shadow-sm">
                <i class="ph ph-heart text-sm"></i>
            </button>
            <a href="product.html?id=${product.id}" class="block relative pt-[80%] bg-[#F9F7F2]">
                <img src="${product.image}" class="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" loading="lazy">
            </a>
            <div class="p-3 flex flex-col flex-grow">
                <span class="text-[9px] font-black text-saffron uppercase tracking-widest mb-1">${product.category}</span>
                <h3 class="font-premium font-bold text-gray-900 text-xs mb-2 line-clamp-2 leading-snug">${product.name}</h3>
                <div class="flex items-center justify-between mt-auto">
                    <span class="font-black text-gray-900 text-sm">₹${product.price}</span>
                    <button onclick="addToCart('${product.id}')" class="w-8 h-8 bg-gray-900 text-white hover:bg-saffron rounded-xl shadow-md transition-all flex items-center justify-center active:scale-90">
                        <i class="ph-bold ph-plus text-xs"></i>
                    </button>
                </div>
            </div>
        </div>`;
    }).join('');
}

async function toggleWishlist(productId) {
    if (!currentUser) { showToast("Please login to save items!", "error"); return; }
    if (!window.db) return;

    try {
        const ref = db.collection('wishlist');
        const snap = await ref.where('userId', '==', currentUser.uid).where('productId', '==', productId).get();

        if (!snap.empty) {
            await ref.doc(snap.docs[0].id).delete();
            showToast("Removed from wishlist.", "success");
        } else {
            const p = window.loadedProducts.find(item => item.id == productId);
            await ref.add({
                userId: currentUser.uid, productId,
                name: p.name, price: p.price, image: p.image,
                addedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            showToast("Saved to wishlist! 💖", "success");
        }
        updateWishlistUI();
    } catch (e) { console.error(e); }
}

async function updateWishlistUI() {
    if (!currentUser || !window.db) return;
    const snap = await db.collection('wishlist').where('userId', '==', currentUser.uid).get();
    const savedIds = snap.docs.map(doc => doc.data().productId);

    document.querySelectorAll('[id^="wish-"]').forEach(el => {
        const id = el.id.replace('wish-', '').replace('grid-', '');
        const icon = el.querySelector('i');
        if (savedIds.includes(id)) {
            icon.classList.remove('ph');
            icon.classList.add('ph-fill', 'text-red-500');
        } else {
            icon.classList.remove('ph-fill', 'text-red-500');
            icon.classList.add('ph');
        }
    });
}

async function buyNow(productId, qty = 1) {
    await addToCart(productId, qty);
    window.location.href = 'cart.html';
}

function renderSkeleton(containerId, count = 4) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = Array(count).fill(0).map(() => `
        <div class="bg-white rounded-[2rem] border border-gray-100 overflow-hidden flex flex-col">
            <div class="pt-[100%] product-card-shimmer"></div>
            <div class="p-6 space-y-4">
                <div class="h-3 w-1/3 product-card-shimmer rounded-full"></div>
                <div class="h-5 w-full product-card-shimmer rounded-lg"></div>
                <div class="flex justify-between items-center pt-4">
                    <div class="h-8 w-1/3 product-card-shimmer rounded-lg"></div>
                    <div class="h-12 w-12 product-card-shimmer rounded-2xl"></div>
                </div>
            </div>
        </div>`).join('');
}

function renderCategories(containerId) {
    const container = document.getElementById(containerId);
    if (!container || typeof categories === 'undefined') return;
    container.innerHTML = categories.map((cat, idx) => `
        <div class="flex flex-col items-center cursor-pointer group flex-shrink-0 fade-in" style="animation-delay: ${idx * 100}ms">
            <div class="w-20 h-20 md:w-24 md:h-24 rounded-[2rem] bg-white border border-gray-100 flex items-center justify-center text-3xl mb-3 shadow-sm group-hover:shadow-xl group-hover:border-saffron/20 transition-all duration-500">
                <span>${cat.icon}</span>
            </div>
            <span class="text-xs font-bold text-gray-700 w-24 text-center">${cat.name}</span>
        </div>`).join('');
}

function initSearch() {
    const searchInput = document.getElementById('search-input');
    if (!searchInput) return;

    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();
        const hero = document.getElementById('hero-section');
        const trust = document.getElementById('trust-features');
        const categories = document.getElementById('categories-section');
        const gridTitle = document.querySelector('#bestsellers-grid')?.previousElementSibling;

        if (query) {
            if (hero) hero.style.display = 'none';
            if (trust) trust.style.display = 'none';
            if (categories) categories.style.display = 'none';
            if (gridTitle) gridTitle.innerText = `Search: "${query}"`;
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
            if (hero) hero.style.display = 'block';
            if (trust) trust.style.display = 'block';
            if (categories) categories.style.display = 'block';
            if (gridTitle) gridTitle.innerText = "Featured Products";
        }

        renderProducts('bestsellers-grid', null, query);
    });
}

window.startVoiceSearch = () => {
    const searchInput = document.getElementById('search-input');
    if (!('webkitSpeechRecognition' in window)) {
        showToast("Voice search not supported in this browser.", "error");
        return;
    }

    const recognition = new webkitSpeechRecognition();
    recognition.lang = 'en-IN';
    recognition.start();

    recognition.onresult = (event) => {
        const speechToText = event.results[0][0].transcript;
        searchInput.value = speechToText;
        renderProducts('bestsellers-grid', null, speechToText);
    };
};

// Global Exports
window.removeFromCart = removeFromCart;
window.addToCart = addToCart;
window.buyNow = buyNow;
window.toggleWishlist = toggleWishlist;
window.renderProducts = renderProducts;
window.renderSkeleton = renderSkeleton;
window.renderCategories = renderCategories;
window.initSearch = initSearch;
window.showToast = showToast;
window.handleLogout = () => {
    if (window.auth) {
        auth.signOut().then(() => {
            window.location.reload();
        });
    }
};

document.addEventListener('DOMContentLoaded', async () => {
    console.log("App JS Initialized");
    updateCartCount();
    initSearch();

    // Fetch and render initial products
    renderProducts('bestsellers-grid');

    // Attach click events for category cards
    document.querySelectorAll('[data-category]').forEach(el => {
        el.onclick = () => {
            const cat = el.getAttribute('data-category');

            // Highlight active button
            document.querySelectorAll('[data-category]').forEach(btn => {
                btn.classList.remove('bg-saffron', 'text-white', 'shadow-lg', 'shadow-saffron/20');
                btn.classList.add('bg-white', 'text-gray-500', 'border-gray-100');
            });
            el.classList.add('bg-saffron', 'text-white', 'shadow-lg', 'shadow-saffron/20');
            el.classList.remove('bg-white', 'text-gray-500', 'border-gray-100');

            const filtered = window.allProducts.filter(p => cat === 'All' || p.category === cat);
            renderProducts('bestsellers-grid', filtered);

            // Scroll to grid
            document.getElementById('bestsellers-grid').scrollIntoView({ behavior: 'smooth' });
        };
    });

    // View All / Shop Collection links
    const viewAllBtn = document.querySelector('a[href="#"], button');
    // We should give these real IDs in HTML for better accuracy.

    renderCategories('categories-container');

    // --- 3. Header Animation ---
    const header = document.querySelector('header');
    if (header) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 20) {
                header.classList.add('py-2', 'shadow-xl');
                header.classList.remove('py-4');
            } else {
                header.classList.add('py-4');
                header.classList.remove('py-2', 'shadow-xl');
            }
        });
    }
});
