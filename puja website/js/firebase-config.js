// Firebase Configuration
// Check if user has saved config in localStorage, otherwise use hardcoded
const savedConfig = localStorage.getItem('firebaseConfig');
const firebaseConfig = savedConfig ? JSON.parse(savedConfig) : {
    apiKey: "AIzaSyC2eUeQjDBXqSnOq9l1SSTuCC4unT7WPp4",
    authDomain: "puja-store-34e07.firebaseapp.com",
    projectId: "puja-store-34e07",
    storageBucket: "puja-store-34e07.firebasestorage.app",
    messagingSenderId: "937760145919",
    appId: "1:937760145919:web:ce517b8c098d05d40fa7ca",
    measurementId: "G-C3JRBCE0MG"
};

// Initialize Firebase only if the API key has been replaced
let db = null;
    let auth = null;
    let storage = null;

    if(firebaseConfig.apiKey !== "YOUR_API_KEY_HERE") {
        try {
            if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
db = firebase.firestore();
auth = firebase.auth();

// Safety check for storage as it might not be loaded
if (typeof firebase.storage === 'function') {
    storage = firebase.storage();
} else {
    console.warn("Firebase Storage script not loaded. Storage features will be disabled.");
}

console.log("Firebase initialized successfully.");
    } catch (error) {
    console.error("Firebase initialization error:", error);
}
} else {
    console.warn("⚠️ Firebase is not configured. Using local mock data. Please update js/firebase-config.js with your real credentials.");
}

// Helper to check if services are ready
function isFirebaseReady() {
    return !!(db);
}

window.isFirebaseReady = isFirebaseReady;
window.db = db;
window.storage = storage;
window.auth = auth;
