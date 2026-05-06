// admin.js - Protected Stock Room Logic (Cloudinary Edition)
document.addEventListener('DOMContentLoaded', () => {
    
    let editingProductId = null;
    let currentImages = []; // Array to hold images being edited (URLs or {file, url, isNew})

    const imageInput = document.getElementById('p-image');
    const previewContainer = document.getElementById('image-previews');

    // --- 1. IMAGE PREVIEWS ---
    if (imageInput) {
        imageInput.addEventListener('change', () => {
            Array.from(imageInput.files).forEach(file => {
                const reader = new FileReader();
                reader.onload = (e) => {
                    currentImages.push({
                        file: file,
                        url: e.target.result,
                        isNew: true
                    });
                    renderPreviews();
                };
                reader.readAsDataURL(file);
            });
            imageInput.value = ""; // Reset input so same file can be picked again
        });
    }

    function renderPreviews() {
        if (!previewContainer) return;
        previewContainer.innerHTML = currentImages.map((img, idx) => {
            const url = typeof img === 'string' ? img : img.url;
            return `
            <div class="relative w-20 h-20 flex-shrink-0 group">
                <img src="${url}" class="w-full h-full rounded-xl object-cover border-2 ${img.isNew ? 'border-dashed border-gray-300 opacity-70' : 'border-saffron'} shadow-sm">
                <button type="button" onclick="removeImage(${idx})" class="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-[10px] shadow-lg opacity-0 group-hover:opacity-100 transition-all">
                    <i class="ph-bold ph-x"></i>
                </button>
            </div>`;
        }).join('');
    }

    window.removeImage = (idx) => {
        currentImages.splice(idx, 1);
        renderPreviews();
    };

    // --- 2. THE GATEKEEPER ---
    window.checkAdminLogin = () => {
        const user = document.getElementById('admin-user').value;
        const pass = document.getElementById('admin-pass').value;
        
        // Simple secure credentials
        if (user === 'admin' && pass === 'puja123') {
            sessionStorage.setItem('isAdminUnlocked', 'true');
            document.getElementById('admin-login').classList.add('hidden');
            document.getElementById('admin-content').classList.remove('hidden');
            loadAdminProducts();
        } else {
            alert('Incorrect username or password! Access Denied.');
        }
    };

    if (sessionStorage.getItem('isAdminUnlocked') === 'true') {
        const loginScreen = document.getElementById('admin-login');
        const contentScreen = document.getElementById('admin-content');
        if(loginScreen) loginScreen.classList.add('hidden');
        if(contentScreen) contentScreen.classList.remove('hidden');
    }

    // --- 3. PRODUCT MANAGEMENT ---
    async function loadAdminProducts() {
        const list = document.getElementById('admin-product-list');
        if (!list || !window.db) return;
        try {
            const snapshot = await db.collection('products').orderBy('createdAt', 'desc').get();
            list.innerHTML = snapshot.docs.map(doc => {
                const p = doc.data();
                return `
                <div class="flex items-center gap-4 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                    <img src="${p.image}" class="w-12 h-12 rounded-lg object-cover">
                    <div class="flex-grow">
                        <h4 class="font-bold text-gray-900 text-sm">${p.name}</h4>
                        <p class="text-[10px] font-bold text-gray-400">₹${p.price} • ${p.category}</p>
                    </div>
                    <div class="flex gap-2">
                        <button onclick="editProduct('${doc.id}')" class="text-gray-400 hover:text-saffron"><i class="ph ph-pencil-simple text-xl"></i></button>
                        <button onclick="deleteProduct('${doc.id}')" class="text-gray-300 hover:text-red-500"><i class="ph ph-trash text-xl"></i></button>
                    </div>
                </div>`;
            }).join('');
        } catch (e) {}
    }

    window.editProduct = async (id) => {
        try {
            const doc = await db.collection('products').doc(id).get();
            if (!doc.exists) return;
            const p = doc.data();
            editingProductId = id;
            currentImages = p.images || [p.image];
            document.getElementById('item-name').value = p.name;
            document.getElementById('item-price').value = p.price;
            document.getElementById('item-category').value = p.category;
            document.getElementById('item-desc').value = p.description;
            renderPreviews();
            document.getElementById('btn-text').innerText = "Update Product";
            document.getElementById('p-image').required = false; 
            document.querySelector('h2').innerText = "Edit: " + p.name;
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (e) {}
    };

    const stockForm = document.getElementById('stock-form');
    if (stockForm) {
        stockForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitBtn = document.getElementById('submit-btn');
            const btnText = document.getElementById('btn-text');
            submitBtn.disabled = true;
            btnText.innerText = "Processing...";

            try {
                const CLOUDINARY_URL = 'https://api.cloudinary.com/v1_1/da5c0vldx/image/upload';
                const CLOUDINARY_UPLOAD_PRESET = 'ml_default';
                const finalURLs = [];

                for (let img of currentImages) {
                    if (typeof img === 'object' && img.isNew) {
                        const formData = new FormData();
                        formData.append('file', img.file);
                        formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
                        const res = await fetch(CLOUDINARY_URL, { method: 'POST', body: formData });
                        const data = await res.json();
                        finalURLs.push(data.secure_url);
                    } else {
                        finalURLs.push(img);
                    }
                }

                if (finalURLs.length === 0) throw new Error("Add at least one photo!");

                const productData = {
                    name: document.getElementById('item-name').value,
                    price: parseFloat(document.getElementById('item-price').value),
                    category: document.getElementById('item-category').value,
                    description: document.getElementById('item-desc').value,
                    images: finalURLs,
                    image: finalURLs[0],
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                };

                if (editingProductId) {
                    await db.collection('products').doc(editingProductId).update(productData);
                    alert("Updated! 🙏");
                } else {
                    productData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
                    productData.inStock = true;
                    await db.collection('products').add(productData);
                    alert("Added! 🙏");
                }

                editingProductId = null;
                currentImages = [];
                stockForm.reset();
                renderPreviews();
                btnText.innerText = "Upload to Store";
                loadAdminProducts();
            } catch (err) { alert(err.message); }
            finally { submitBtn.disabled = false; }
        });
    }

    window.deleteProduct = async (id) => {
        if (confirm("Delete this item?")) {
            await db.collection('products').doc(id).delete();
            loadAdminProducts();
        }
    };

    if (sessionStorage.getItem('isAdminUnlocked') === 'true') {
        loadAdminProducts();
    }
});
