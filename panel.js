// =================================================================
// CÓDIGO DEL PANEL DEL OPERADOR CON ADMINISTRACIÓN DE USUARIOS
// =================================================================
import { db, auth } from './firebase-config.js';
import { collection, query, where, onSnapshot, doc, updateDoc, getDoc, orderBy } from "https://www.gstatic.com/firebasejs/9.6.7/firebase-firestore.js";
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/9.6.7/firebase-auth.js';

// --- Referencias a los elementos del DOM ---
const nombreOperadorSpan = document.getElementById('nombre-operador');
const listaSolicitadosDiv = document.getElementById('lista-solicitados');
const listaRepartidoresDiv = document.getElementById('lista-repartidores');
const modalAsignacion = document.getElementById('modal-asignacion');
const modalEnvioIdSpan = document.getElementById('modal-envio-id');
const modalSelectRepartidor = document.getElementById('modal-select-repartidor');
const btnConfirmarAsignacion = document.getElementById('btn-confirmar-asignacion');
const btnCancelarAsignacion = document.getElementById('btn-cancelar-asignacion');

// ¡NUEVA REFERENCIA AL DOM!
const listaUsuariosDiv = document.getElementById('lista-usuarios');

let repartidoresDisponibles = [];

// --- Lógica de Autenticación ---
onAuthStateChanged(auth, async (user) => {
    if (user) {
        const userRef = doc(db, "usuarios", user.uid);
        const docSnap = await getDoc(userRef);
        if (docSnap.exists() && nombreOperadorSpan) {
            nombreOperadorSpan.textContent = docSnap.data().nombre;
        }
    }
});

// --- 1. Listener de Envíos Solicitados ---
const qSolicitados = query(collection(db, "envios"), where("estado", "==", "Solicitado"));
onSnapshot(qSolicitados, (snapshot) => {
    listaSolicitadosDiv.innerHTML = snapshot.empty ? '<p>No hay envíos pendientes.</p>' : '';
    snapshot.forEach(doc => {
        const envio = doc.data();
        const idMostrado = envio.id_pedido_personalizado || doc.id;
        listaSolicitadosDiv.innerHTML += `
            <div class="envio-card">
                <div>
                    <p><strong>Pedido:</strong> ${idMostrado}</p>
                    <p><strong>Origen:</strong> ${envio.direccionOrigen}</p>
                    <p><strong>Destino:</strong> ${envio.direccionDestino}</p>
                </div>
                <button class="btn-asignar" data-id="${doc.id}">Asignar</button>
            </div>`;
    });
});

// --- 2. Listener de Repartidores Disponibles ---
const qRepartidores = query(collection(db, "usuarios"), where("rol", "==", "repartidor"), where("estado", "==", "Disponible"));
onSnapshot(qRepartidores, (snapshot) => {
    repartidoresDisponibles = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    listaRepartidoresDiv.innerHTML = repartidoresDisponibles.length > 0 ? '' : '<p>No hay repartidores disponibles.</p>';
    repartidoresDisponibles.forEach(rep => {
        listaRepartidoresDiv.innerHTML += `<div class="repartidor-card"><p><strong>${rep.nombre}</strong></p></div>`;
    });
});

// ===============================================================
// ¡NUEVO! 3. Listener para la Lista de Todos los Usuarios
// ===============================================================
const qUsuarios = query(collection(db, "usuarios"), orderBy("nombre"));
onSnapshot(qUsuarios, (snapshot) => {
    if (!listaUsuariosDiv) return; // Si el div no existe, no hace nada
    listaUsuariosDiv.innerHTML = snapshot.empty ? '<p>No se encontraron usuarios.</p>' : '';
    
    snapshot.forEach(doc => {
        const user = doc.data();
        const userId = doc.id;

        // Botón para cambiar estado (solo para repartidores)
        let botonEstadoHTML = '';
        if (user.rol === 'repartidor') {
            const estadoActual = user.estado || 'No definido';
            const esDisponible = estadoActual === 'Disponible';
            botonEstadoHTML = `<button class="btn-cambiar-estado" data-id="${userId}" data-estado="${estadoActual}">
                ${esDisponible ? 'Marcar como Ocupado' : 'Marcar como Disponible'}
            </button>`;
        }

        listaUsuariosDiv.innerHTML += `
            <div class="user-card">
                <div class="user-card-info">
                    <p><strong>Nombre:</strong> ${user.nombre}</p>
                    <p><strong>Email:</strong> ${user.email}</p>
                    <p><strong>Rol actual:</strong> ${user.rol}</p>
                </div>
                <div class="user-card-actions">
                    <button class="btn-cambiar-rol" data-id="${userId}" data-rol="${user.rol}">Cambiar Rol</button>
                    ${botonEstadoHTML}
                </div>
            </div>
        `;
    });
});


// ===============================================================
// ¡ACTUALIZADO! Lógica de Clics para manejar los nuevos botones
// ===============================================================
document.addEventListener('click', async (e) => {
    const target = e.target;

    // --- Lógica para Asignar Envío (sin cambios) ---
    if (target.classList.contains('btn-asignar')) {
        // ... (código existente para asignar) ...
    }

    // --- ¡NUEVO! Lógica para Cambiar Rol ---
    if (target.classList.contains('btn-cambiar-rol')) {
        const userId = target.dataset.id;
        const currentRole = target.dataset.rol;

        const { value: newRole } = await Swal.fire({
            title: 'Selecciona el nuevo rol',
            input: 'select',
            inputOptions: {
                cliente: 'Cliente',
                repartidor: 'Repartidor',
                operador: 'Operador'
            },
            inputValue: currentRole,
            showCancelButton: true,
            confirmButtonText: 'Confirmar Cambio'
        });

        if (newRole && newRole !== currentRole) {
            try {
                const userRef = doc(db, "usuarios", userId);
                await updateDoc(userRef, { rol: newRole });
                Swal.fire('¡Éxito!', 'El rol del usuario ha sido actualizado.', 'success');
            } catch (error) {
                Swal.fire('Error', 'No se pudo actualizar el rol.', 'error');
            }
        }
    }

    // --- ¡NUEVO! Lógica para Cambiar Estado (Activar/Desactivar) ---
    if (target.classList.contains('btn-cambiar-estado')) {
        const userId = target.dataset.id;
        const currentState = target.dataset.estado;
        const newState = currentState === 'Disponible' ? 'Ocupado' : 'Disponible';

        const result = await Swal.fire({
            title: '¿Estás seguro?',
            text: `Vas a cambiar el estado del repartidor a "${newState}".`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Sí, cambiar estado'
        });

        if (result.isConfirmed) {
            try {
                const userRef = doc(db, "usuarios", userId);
                await updateDoc(userRef, { estado: newState });
                Swal.fire('¡Actualizado!', `El estado del repartidor es ahora "${newState}".`, 'success');
            } catch (error) {
                Swal.fire('Error', 'No se pudo actualizar el estado.', 'error');
            }
        }
    }
});


// --- Lógica del Modal de Asignación (Movida dentro del listener de arriba por limpieza, pero sin cambios funcionales) ---
// El código original para abrir el modal, cancelar y confirmar la asignación sigue siendo el mismo.
// ... (Aquí iría el resto de tu código de `panel.js` para la lógica del modal de asignación) ...
// (Para mantener la respuesta clara, he omitido repetir ese bloque, pero asegúrate de que siga en tu archivo)