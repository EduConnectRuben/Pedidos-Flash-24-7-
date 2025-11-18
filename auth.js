// =================================================================
// CÓDIGO DE AUTENTICACIÓN - VERSIÓN FINAL CON SWEETALERT2
// =================================================================

// Importamos los servicios YA INICIALIZADOS desde nuestro archivo central
import { auth, db } from './firebase-config.js';

// Importamos las funciones específicas que necesitamos
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/9.6.7/firebase-auth.js";
import { doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/9.6.7/firebase-firestore.js";

const formLogin = document.getElementById('form-login');
const formRegistro = document.getElementById('form-registro');
const linkARegistro = document.getElementById('link-a-registro');
const linkALogin = document.getElementById('link-a-login');

// Lógica para alternar entre formularios
linkARegistro.addEventListener('click', (e) => { e.preventDefault(); formLogin.classList.add('hidden'); formRegistro.classList.remove('hidden'); });
linkALogin.addEventListener('click', (e) => { e.preventDefault(); formRegistro.classList.add('hidden'); formLogin.classList.remove('hidden'); });

// --- Lógica de Registro ---
formRegistro.addEventListener('submit', async (e) => {
    e.preventDefault();
    const nombre = formRegistro['registro-nombre'].value;
    const email = formRegistro['registro-email'].value;
    const password = formRegistro['registro-password'].value;

    if (!nombre) {
        Swal.fire('Atención', 'El campo de nombre es obligatorio.', 'warning');
        return;
    }

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Creamos el documento del usuario en la colección "usuarios"
        await setDoc(doc(db, "usuarios", user.uid), {
            nombre: nombre,
            email: user.email,
            rol: "cliente" // Todo nuevo registro es un cliente por defecto
        });
        
        // Notificación de éxito
        Swal.fire('¡Cuenta Creada!', 'Tu cuenta ha sido creada con éxito. Por favor, inicia sesión.', 'success');
        
        formRegistro.reset();
        linkALogin.click(); // Regresamos al formulario de login
    } catch (error) {
        Swal.fire('Error', 'Hubo un problema al crear tu cuenta: ' + error.message, 'error');
    }
});

// --- Lógica de Inicio de Sesión ---
formLogin.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = formLogin['login-email'].value;
    const password = formLogin['login-password'].value;

    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Buscamos el rol del usuario para redirigirlo
        const userDocRef = doc(db, "usuarios", user.uid);
        const docSnap = await getDoc(userDocRef);

        if (docSnap.exists()) {
            const rol = docSnap.data().rol;
            console.log("Rol de usuario encontrado:", rol);

            // Redirección según el rol
            if (rol === 'cliente') window.location.href = 'cliente.html';
            else if (rol === 'operador') window.location.href = 'panel.html';
            else if (rol === 'repartidor') window.location.href = 'repartidor.html';
            else throw new Error("Tu usuario tiene un rol desconocido.");
            
        } else {
            throw new Error("No se encontró un registro de rol para este usuario. Contacta al administrador.");
        }
    } catch (error) {
        let errorMessage = "Ocurrió un error al iniciar sesión.";
        if (error.code === 'auth/invalid-credential') {
            errorMessage = "Correo electrónico o contraseña incorrectos.";
        } else {
            errorMessage = error.message;
        }
        Swal.fire('Error de Acceso', errorMessage, 'error');
    }
});