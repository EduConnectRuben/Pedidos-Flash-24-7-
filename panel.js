// =================================================================
// CÓDIGO FINAL Y CORREGIDO PARA EL PANEL DEL OPERADOR
// Muestra el ID de pedido personalizado y asegura la actualización en tiempo real.
// =================================================================
import { db, auth } from './firebase-config.js';
import { collection, query, where, onSnapshot, doc, updateDoc, getDoc } from "https://www.gstatic.com/firebasejs/9.6.7/firebase-firestore.js";
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

let repartidoresDisponibles = [];

// --- Lógica de Autenticación (Solo para mostrar el nombre) ---
onAuthStateChanged(auth, async (user) => {
    if (user) {
        const userRef = doc(db, "usuarios", user.uid);
        const docSnap = await getDoc(userRef);
        if (docSnap.exists() && nombreOperadorSpan) {
            nombreOperadorSpan.textContent = docSnap.data().nombre;
        }
    }
});

// --- 1. Listener de Envíos Solicitados (¡ACTUALIZADO!) ---
const qSolicitados = query(collection(db, "envios"), where("estado", "==", "Solicitado"));
onSnapshot(qSolicitados, (snapshot) => {
    listaSolicitadosDiv.innerHTML = snapshot.empty ? '<p>No hay envíos pendientes.</p>' : '';
    snapshot.forEach(doc => {
        const envio = doc.data();
        
        // ¡MEJORA CLAVE! Mostramos el ID personalizado para el operador.
        // Si no existe (para envíos antiguos), muestra el ID de Firebase.
        const idMostrado = envio.id_pedido_personalizado || doc.id;

        listaSolicitadosDiv.innerHTML += `
            <div class="envio-card">
                <div>
                    <p><strong>Pedido:</strong> ${idMostrado}</p>
                    <p><strong>Origen:</strong> ${envio.direccionOrigen}</p>
                    <p><strong>Destino:</strong> ${envio.direccionDestino}</p>
                </div>
                <!-- El botón de asignar sigue usando el ID real del documento (doc.id) -->
                <button class="btn-asignar" data-id="${doc.id}">Asignar</button>
            </div>
        `;
    });
}, (error) => {
    console.error("Error al obtener envíos:", error);
    listaSolicitadosDiv.innerHTML = `<p style="color: red;">Error al cargar los envíos.</p>`;
});


// --- 2. Listener de Repartidores Disponibles (Sin cambios) ---
const qRepartidores = query(collection(db, "usuarios"), where("rol", "==", "repartidor"), where("estado", "==", "Disponible"));
onSnapshot(qRepartidores, (snapshot) => {
    repartidoresDisponibles = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    listaRepartidoresDiv.innerHTML = '';
    if (repartidoresDisponibles.length > 0) {
        repartidoresDisponibles.forEach(rep => {
            listaRepartidoresDiv.innerHTML += `<div class="repartidor-card"><p><strong>${rep.nombre}</strong></p></div>`;
        });
    } else {
        listaRepartidoresDiv.innerHTML = '<p>No hay repartidores disponibles.</p>';
    }
}, (error) => {
    console.error("Error al obtener repartidores:", error);
    listaRepartidoresDiv.innerHTML = `<p style="color: red;">Error al cargar repartidores.</p>`;
});


// --- Lógica del Modal (Sin cambios) ---
let envioIdParaAsignar = null;

document.addEventListener('click', (e) => {
    if (e.target.classList.contains('btn-asignar')) {
        envioIdParaAsignar = e.target.dataset.id;
        
        // ¡MEJORA! Buscamos el ID personalizado para mostrarlo en el modal
        const cardDiv = e.target.closest('.envio-card');
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
});

btnCancelarAsignacion.addEventListener('click', () => modalAsignacion.classList.add('hidden'));

btnConfirmarAsignacion.addEventListener('click', async () => {
    const repartidorId = modalSelectRepartidor.value;
    if (!repartidorId) {
        Swal.fire('Atención', 'Por favor, selecciona un repartidor.', 'warning');
        return;
    }
    try {
        const envioRef = doc(db, "envios", envioIdParaAsignar);
        const repartidorRef = doc(db, "usuarios", repartidorId);
        await updateDoc(envioRef, { estado: "Asignado", id_repartidor_fk: repartidorId });
        await updateDoc(repartidorRef, { estado: "Ocupado" });
        Swal.fire('¡Éxito!', 'El envío ha sido asignado.', 'success');
        modalAsignacion.classList.add('hidden');
    } catch (error) {
        Swal.fire('Error', 'Hubo un problema al asignar el envío.', 'error');
    }
});