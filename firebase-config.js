// Archivo: firebase-config.js

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.7/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.6.7/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.6.7/firebase-firestore.js";

// Tu configuración (¡solo vive aquí!)
const firebaseConfig = {
    apiKey: "AIzaSyChhgrnzRntdJ7_Mwq6N5eeQzwo4HXgWlQ",
    authDomain: "envios-flash-f683a.firebaseapp.com",
    projectId: "envios-flash-f683a",
    storageBucket: "envios-flash-f683a.appspot.com",
    messagingSenderId: "885037766740",
    appId: "1:885037766740:web:d71bd052fc642a38f635c1"
};

// Inicializamos Firebase UNA SOLA VEZ
const app = initializeApp(firebaseConfig);

// Exportamos los servicios que los demás archivos necesitarán
export const auth = getAuth(app);
export const db = getFirestore(app);