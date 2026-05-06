// login.js - Robust Popup Version
document.addEventListener('DOMContentLoaded', () => {
    console.log("Login Page Ready.");

    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const email = document.querySelector('input[type="email"]').value;
            const password = document.querySelector('input[type="password"]').value;
            const btn = loginForm.querySelector('button[type="submit"]');

            btn.disabled = true;
            btn.innerHTML = '<i class="ph ph-spinner animate-spin text-2xl"></i> Signing In...';

            try {
                await firebase.auth().signInWithEmailAndPassword(email, password);
                window.location.href = 'index.html';
            } catch (error) {
                alert("Login Failed: " + error.message);
                btn.disabled = false;
                btn.innerHTML = 'Sign In <i class="ph-bold ph-arrow-right"></i>';
            }
        });
    }
});

// Google Login using Popup (More reliable for local testing)
async function loginWithGoogle() {
    console.log("Button clicked: Starting Google Popup...");
    
    try {
        const provider = new firebase.auth.GoogleAuthProvider();
        const authService = firebase.auth();
        
        // 1. Start the Popup or Redirect
        let user;
        if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
            await authService.signInWithRedirect(provider);
            return;
        } else {
            const result = await authService.signInWithPopup(provider);
            user = result.user;
        }
        console.log("GOOGLE SUCCESS:", user.email);

        // 2. Try to save to Firestore
        console.log("Saving to Firestore collection 'users'...");
        await firebase.firestore().collection('users').doc(user.uid).set({
            name: user.displayName,
            email: user.email,
            uid: user.uid,
            lastLogin: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        console.log("FIRESTORE SUCCESS! Redirecting...");
        
        // Show welcome toast before redirecting
        if (window.showToast) {
            window.showToast(`Welcome back, ${user.displayName}! 🙏`, "success");
        }
        
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1500);

    } catch (error) {
        console.error("FULL ERROR DETAILS:", error);
        alert("Login failed! Error: " + error.message);
    }
}
