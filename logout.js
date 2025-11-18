// =================================================================
// SCRIPT PARA MANEJAR EL CIERRE DE SESIÓN (VERSIÓN COMPLETA Y CORRECTA)
// =================================================================

// 1. Importamos 'auth' desde nuestro archivo central.
import { auth } from './firebase-config.js'; 

// 2. Importamos la función 'signOut'.
import { signOut } from "https://www.gstatic.com/firebasejs/9.6.7/firebase-auth.js";

// --- El resto del código ---
const btnLogout = document.getElementById('btn-logout');

// Verificamos si el botón existe en la página actual
if (btnLogout) {
    // Si existe, le añadimos el evento 'click'
    btnLogout.addEventListener('click', async () => {
        try {
            // Llamamos a la función signOut con el servicio de autenticación
            await signOut(auth);
            console.log("Sesión cerrada con éxito.");
            
            // Redirigimos al usuario a la página de login
            window.location.href = 'login.html';
        } catch (error) {
            console.error("Error al cerrar sesión:", error);
            alert("Error al cerrar sesión.");
        }
    }); // <--- Probablemente faltaba este ');'
} // <--- O esta '}'