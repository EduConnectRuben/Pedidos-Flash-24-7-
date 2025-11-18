// =================================================================
// CÓDIGO DEL PORTAL PRINCIPAL (ROUTER Y PÁGINA DE ATERRIZAJE)
// ¡CORREGIDO para que el rastreo público funcione con el ID personalizado!
// =================================================================
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.6.7/firebase-auth.js";
// ¡IMPORTANTE! Añadimos 'collection', 'query' y 'where' para la nueva búsqueda
import { collection, query, where, doc, getDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/9.6.7/firebase-firestore.js";
import { db, auth } from './firebase-config.js'; 

const portalMain = document.getElementById('portal-main');
let unsubscribeRastreo = null; 

onAuthStateChanged(auth, async (user) => {
    if (user) {
        // --- CASO 1: USUARIO LOGUEADO (SIN CAMBIOS) ---
        portalMain.innerHTML = `<p style="text-align: center; font-size: 1.2em;">Sesión encontrada. Redirigiendo a tu panel...</p>`;
        
        const userDocRef = doc(db, "usuarios", user.uid);
        const docSnap = await getDoc(userDocRef);

        if (docSnap.exists()) {
            const rol = docSnap.data().rol;
            if (rol === 'cliente') window.location.href = 'cliente.html';
            else if (rol === 'operador') window.location.href = 'panel.html';
            else if (rol === 'repartidor') window.location.href = 'repartidor.html';
            else portalMain.innerHTML = `<p style="color: red;">Error: Rol desconocido.</p>`;
        } else {
             portalMain.innerHTML = `<p style="color: red;">Error: No se encontró tu registro de usuario.</p>`;
        }
    } else {
        // --- CASO 2: NO HAY SESIÓN ACTIVA (SIN CAMBIOS EN EL HTML) ---
        portalMain.innerHTML = `
            <div style="text-align: center; margin-bottom: 40px; border-bottom: 1px solid #eee; padding-bottom: 30px;">
                <h2 style="font-size: 1.5em; color: var(--color-texto-principal);">Accede a tu Cuenta</h2>
                <p style="font-size: 1.1em;">Gestiona tus envíos y revisa tu historial.</p>
                <a href="login.html" class="btn btn-secundario">Iniciar Sesión / Registrarse</a>
            </div>

            <div>
                <h2 style="font-size: 1.5em; text-align: center; color: var(--color-texto-principal);">¿Esperas un paquete?</h2>
                <form id="form-rastreo">
                    <label for="tracking-id-input">Ingresa tu Número de Seguimiento</label>
                    <input type="text" id="tracking-id-input" placeholder="Pega aquí el ID de tu envío" required>
                    <button type="submit" class="btn btn-primario">Rastrear</button>
                </form>
                <section id="resultado-rastreo" style="margin-top: 20px;"></section>
            </div>
        `;

        // --- LÓGICA DEL FORMULARIO DE RASTREO (¡COMPLETAMENTE CORREGIDA!) ---
        const formRastreo = document.getElementById('form-rastreo');
        const resultadoDiv = document.getElementById('resultado-rastreo');

        formRastreo.addEventListener('submit', (e) => {
            e.preventDefault();
            const envioId = formRastreo['tracking-id-input'].value.trim();
            if (!envioId) return;
            if (unsubscribeRastreo) unsubscribeRastreo();

            resultadoDiv.innerHTML = `<p>Buscando envío en tiempo real...</p>`;
            
            // --- ¡EL CAMBIO MÁS IMPORTANTE ESTÁ AQUÍ! ---
            // Antes usábamos doc(), ahora usamos query() para buscar por el campo 'id_pedido_personalizado'.
            const q = query(collection(db, "envios"), where("id_pedido_personalizado", "==", envioId));

            // La escucha ahora es sobre la consulta 'q'
            unsubscribeRastreo = onSnapshot(q, (snapshot) => {
                // El resultado de una consulta es un 'snapshot' que puede tener varios documentos
                if (!snapshot.empty) {
                    // Como el ID debe ser único, tomamos el primer (y único) resultado.
                    const docSnap = snapshot.docs[0]; 
                    const envio = docSnap.data();
                    const estados = ["Solicitado", "Asignado", "En Camino", "Entregado"];
                    const indiceActual = estados.indexOf(envio.estado);
                    
                    resultadoDiv.innerHTML = `
                        <p><strong>Estado Actual:</strong> <strong style="color: var(--color-primario-azul);">${envio.estado}</strong></p>
                        <div class="rastreo-progreso">
                            ${estados.map((estado, index) => `
                                <div class="rastreo-paso ${index <= indiceActual ? 'completado' : ''}">
                                    <div class="circulo"></div>
                                    ${estado}
                                </div>
                            `).join('')}
                        </div>
                    `;
                } else {
                    resultadoDiv.innerHTML = `<p style="color: var(--color-error);">No se encontró ningún envío con el ID proporcionado.</p>`;
                }
            }, (error) => {
                resultadoDiv.innerHTML = `<p style="color: var(--color-error);">Ocurrió un error al buscar tu envío.</p>`;
            });
        });
    }
});