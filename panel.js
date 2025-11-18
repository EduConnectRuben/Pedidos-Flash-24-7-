// =================================================================
// CÓDIGO FINAL, COMPLETO Y VERIFICADO DEL PANEL DEL OPERADOR
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
const listaUsuariosDiv = document.getElementById('lista-usuarios');

let repartidoresDisponibles = [];
let envioIdParaAsignar = null;

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

// --- 3. Listener para la Lista de Todos los Usuarios ---
const qUsuarios = query(collection(db, "usuarios"), orderBy("nombre"));
onSnapshot(qUsuarios, (snapshot) => {
    if (!listaUsuariosDiv) return;
    listaUsuariosDiv.innerHTML = snapshot.empty ? '<p>No se encontraron usuarios.</p>' : '';
    snapshot.forEach(doc => {
        const user = doc.data();
        let botonEstadoHTML = '';
        if (user.rol === 'repartidor') {
            const estadoActual = user.estado || 'No definido';
            const esDisponible = estadoActual === 'Disponible';
            botonEstadoHTML = `<button class="btn-cambiar-estado" data-id="${doc.id}" data-estado="${estadoActual}">
                ${esDisponible ? 'Marcar Ocupado' : 'Marcar Disponible'}
            </button>`;
        }
        listaUsuariosDiv.innerHTML += `
            <div class="user-card">
                <div class="user-card-info">
                    <p><strong>Nombre:</strong> ${user.nombre}</p>
                    <p><strong>Rol:</strong> ${user.rol}</p>
                </div>
                <div class="user-card-actions">
                    <button class="btn-cambiar-rol" data-id="${doc.id}" data-rol="${user.rol}">Cambiar Rol</button>
                    ${botonEstadoHTML}
                </div>
            </div>`;
    });
});

// ===============================================================
// LISTENER DE CLICS PARA BOTONES DINÁMICOS
// ===============================================================
document.addEventListener('click', async (e) => {
    const target = e.target;

    // Abrir el modal de asignación
    if (target.classList.contains('btn-asignar')) {
        envioIdParaAsignar = target.dataset.id;
        const cardDiv = target.closest('.envio-card');
        const pPedido = cardDiv.querySelector('p:first-child');
        modalEnvioIdSpan.textContent = pPedido.textContent.replace('Pedido: ', '');

        modalSelectRepartidor.innerHTML = '';
        if (repartidoresDisponibles.length > 0) {
            modalSelectRepartidor.innerHTML = '<option value="">-- Selecciona un repartidor --</option>';
            repartidoresDisponibles.forEach(r => modalSelectRepartidor.innerHTML += `<option value="${r.id}">${r.nombre}</option>`);
        } else {
            modalSelectRepartidor.innerHTML = '<option value="">No hay repartidores disponibles</option>';
        }
        modalAsignacion.classList.remove('hidden');
    }

    // Lógica para Cambiar Rol
    if (target.classList.contains('btn-cambiar-rol')) {
        const userId = target.dataset.id;
        const currentRole = target.dataset.rol;
        const { value: newRole } = await Swal.fire({
            title: 'Selecciona el nuevo rol',
            input: 'select',
            inputOptions: { cliente: 'Cliente', repartidor: 'Repartidor', operador: 'Operador' },
            inputValue: currentRole,
            showCancelButton: true
        });
        if (newRole && newRole !== currentRole) {
            await updateDoc(doc(db, "usuarios", userId), { rol: newRole });
            Swal.fire('¡Éxito!', 'El rol ha sido actualizado.', 'success');
        }
    }

    // Lógica para Cambiar Estado
    if (target.classList.contains('btn-cambiar-estado')) {
        const userId = target.dataset.id;
        const currentState = target.dataset.estado;
        const newState = currentState === 'Disponible' ? 'Ocupado' : 'Disponible';
        const result = await Swal.fire({
            title: '¿Confirmar cambio?',
            text: `Cambiar estado a "${newState}".`,
            icon: 'warning',
            showCancelButton: true
        });
        if (result.isConfirmed) {
            await updateDoc(doc(db, "usuarios", userId), { estado: newState });
            Swal.fire('¡Actualizado!', `El estado es ahora "${newState}".`, 'success');
        }
    }
});

// ===============================================================
// ¡CORRECCIÓN FINAL! LISTENERS PARA LOS BOTONES ESTÁTICOS DEL MODAL
// ===============================================================
btnCancelarAsignacion.addEventListener('click', () => {
    modalAsignacion.classList.add('hidden');
});

btnConfirmarAsignacion.addEventListener('click', async () => {
    const repartidorId = modalSelectRepartidor.value;
    
    if (!repartidorId) { // Solo necesitamos verificar que se haya seleccionado un repartidor
        Swal.fire('Atención', 'Por favor, selecciona un repartidor.', 'warning');
        return;
    }
    
    // Deshabilitamos el botón para evitar dobles clics
    btnConfirmarAsignacion.disabled = true;

    try {
        const envioRef = doc(db, "envios", envioIdParaAsignar);
        const repartidorRef = doc(db, "usuarios", repartidorId);
        
        // Actualizamos ambos documentos en la base de datos
        await updateDoc(envioRef, { estado: "Asignado", id_repartidor_fk: repartidorId });
        await updateDoc(repartidorRef, { estado: "Ocupado" });
        
        Swal.fire('¡Éxito!', 'El envío ha sido asignado correctamente.', 'success');
        
        // Cerramos el modal y reseteamos el estado
        modalAsignacion.classList.add('hidden');
        envioIdParaAsignar = null;
    } catch (error) {
        console.error("Error al confirmar la asignación:", error);
        Swal.fire('Error', 'Hubo un problema al asignar el envío. Revisa la consola para más detalles.', 'error');
    } finally {
        // Volvemos a habilitar el botón, tanto si tuvo éxito como si falló
        btnConfirmarAsignacion.disabled = false;
    }
});