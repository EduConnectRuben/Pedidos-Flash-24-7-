// =================================================================
// CÓDIGO DEL PANEL DE ADMINISTRACIÓN (VERSIÓN COMPLETA)
// Responsabilidades: Gestionar roles Y estado de los repartidores.
// =================================================================
import { db, auth } from './firebase-config.js';
import { collection, query, onSnapshot, doc, updateDoc, getDoc, orderBy } from "https://www.gstatic.com/firebasejs/9.6.7/firebase-firestore.js";
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/9.6.7/firebase-auth.js';

// --- Referencias a los elementos del DOM ---
const nombreAdminSpan = document.getElementById('nombre-admin');
const listaUsuariosDiv = document.getElementById('lista-usuarios');
const listaEnviosDiv = document.getElementById('lista-envios');

onAuthStateChanged(auth, async (user) => {
    if (user) {
        // 1. Cargar el nombre del administrador
        const userRef = doc(db, "usuarios", user.uid);
        const docSnap = await getDoc(userRef);
        if (docSnap.exists()) {
            nombreAdminSpan.textContent = docSnap.data().nombre;
        }

        // 2. Listener para la lista de TODOS los usuarios
        const qUsuarios = query(collection(db, "usuarios"), orderBy("nombre"));
        onSnapshot(qUsuarios, (snapshot) => {
            listaUsuariosDiv.innerHTML = snapshot.empty ? '<p>No se encontraron usuarios.</p>' : '';
            snapshot.forEach(doc => {
                const usuario = doc.data();
                const esUsuarioActual = doc.id === user.uid;

                // Botón para cambiar rol
                const botonRolHTML = esUsuarioActual
                    ? `<button class="btn-cambiar-rol" disabled>Cambiar Rol (Tú)</button>`
                    : `<button class="btn-cambiar-rol" data-id="${doc.id}" data-rol="${usuario.rol}">Cambiar Rol</button>`;

                // ¡NUEVO! Botón para cambiar estado (solo para repartidores)
                let botonEstadoHTML = '';
                if (usuario.rol === 'repartidor') {
                    const estadoActual = usuario.estado || 'No definido';
                    const esDisponible = estadoActual === 'Disponible';
                    botonEstadoHTML = `<button class="btn-cambiar-estado" data-id="${doc.id}" data-estado="${estadoActual}">
                        ${esDisponible ? 'Marcar como Ocupado' : 'Marcar como Disponible'}
                    </button>`;
                }
                
                listaUsuariosDiv.innerHTML += `
                    <div class="user-card">
                        <div class="user-card-info">
                            <p><strong>Nombre:</strong> ${usuario.nombre}</p>
                            <p><strong>Rol:</strong> ${usuario.rol}</p>
                            ${usuario.rol === 'repartidor' ? `<p><strong>Estado:</strong> ${usuario.estado || 'No definido'}</p>` : ''}
                        </div>
                        <div class="user-card-actions">
                            ${botonRolHTML}
                            ${botonEstadoHTML}
                        </div>
                    </div>`;
            });
        });

        // 3. Listener para el historial GLOBAL de envíos (sin cambios)
        const qEnvios = query(collection(db, "envios"), orderBy("fechaSolicitud", "desc"));
        onSnapshot(qEnvios, (snapshot) => {
            listaEnviosDiv.innerHTML = snapshot.empty ? '<p>Aún no se ha realizado ningún envío.</p>' : '';
            snapshot.forEach(doc => {
                const envio = doc.data();
                const fecha = envio.fechaSolicitud ? envio.fechaSolicitud.toDate().toLocaleDateString('es-ES') : 'N/A';
                listaEnviosDiv.innerHTML += `
                    <div class="envio-card">
                        <div>
                            <p><strong>Pedido:</strong> ${envio.id_pedido_personalizado || doc.id}</p>
                            <p><strong>Destino:</strong> ${envio.direccionDestino}</p>
                            <p><strong>Fecha:</strong> ${fecha}</p>
                        </div>
                        <div>
                            <p><strong>Estado: ${envio.estado}</strong></p>
                        </div>
                    </div>`;
            });
        });
    }
});

// --- Listener de clics para TODOS los botones dinámicos ---
document.addEventListener('click', async (e) => {
    const target = e.target;

    // --- Lógica para Cambiar Rol ---
    if (target.classList.contains('btn-cambiar-rol')) {
        const userId = target.dataset.id;
        const currentRole = target.dataset.rol;

        const { value: newRole } = await Swal.fire({
            title: 'Selecciona el nuevo rol',
            input: 'select',
            inputOptions: { cliente: 'Cliente', repartidor: 'Repartidor', operador: 'Operador', admin: 'Administrador' },
            inputValue: currentRole,
            showCancelButton: true,
            cancelButtonText: 'Cancelar'
        });

        if (newRole && newRole !== currentRole) {
            await updateDoc(doc(db, "usuarios", userId), { rol: newRole });
            Swal.fire('¡Éxito!', 'El rol del usuario ha sido actualizado.', 'success');
        }
    }

    // --- ¡NUEVO! Lógica para Cambiar Estado del Repartidor ---
    if (target.classList.contains('btn-cambiar-estado')) {
        const userId = target.dataset.id;
        const currentState = target.dataset.estado;
        const newState = currentState === 'Disponible' ? 'Ocupado' : 'Disponible';
        
        const result = await Swal.fire({
            title: '¿Confirmar cambio de estado?',
            text: `Se cambiará el estado del repartidor a "${newState}".`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sí, cambiar',
            cancelButtonText: 'Cancelar'
        });

        if (result.isConfirmed) {
            await updateDoc(doc(db, "usuarios", userId), { estado: newState });
            Swal.fire('¡Actualizado!', `El estado del repartidor es ahora "${newState}".`, 'success');
        }
    }
});