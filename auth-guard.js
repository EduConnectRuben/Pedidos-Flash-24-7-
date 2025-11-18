// Archivo: auth-guard.js (Versión Corregida)

    import { auth } from './firebase-config.js';
    import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.6.7/firebase-auth.js";
    
    onAuthStateChanged(auth, (user) => {
        if (!user) {
            console.log("Usuario no autenticado. Redirigiendo a login.html...");
            window.location.href = 'login.html';
        } else {
            console.log("Usuario autenticado:", user.email);
        }
    });