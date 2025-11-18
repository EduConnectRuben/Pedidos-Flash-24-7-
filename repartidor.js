// =================================================================
// CÓDIGO FINAL Y COMPLETO DEL PANEL DEL REPARTIDOR
// =================================================================
import { db, auth } from './firebase-config.js';
import { collection, query, where, onSnapshot, doc, updateDoc, getDoc } from "https://www.gstatic.com/firebasejs/9.6.7/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.6.7/firebase-auth.js";

// --- Referencias al DOM ---
const nombreRepartidorSpan = document.getElementById('nombre-repartidor');
const listaAsignadosDiv = document.getElementById('lista-asignados');
const listaEnCaminoDiv = document.getElementById('lista-en-camino');

onAuthStateChanged(auth, async (user) => {
    if (user) {
        const repartidorId = user.uid;
        
        // Cargar nombre del repartidor
        const userRef = doc(db, "usuarios", repartidorId);
        const docSnap = await getDoc(userRef);
        if (docSnap.exists()) {
            nombreRepartidorSpan.textContent = docSnap.data().nombre;
        }

        // --- Listener para envíos ASIGNADOS ---
        const qAsignados = query(collection(db, "envios"), where("estado", "==", "Asignado"), where("id_repartidor_fk", "==", repartidorId));
        onSnapshot(qAsignados, (snapshot) => {
            listaAsignadosDiv.innerHTML = snapshot.empty ? '<p>No tienes tareas pendientes.</p>' : '';
            // ¡CÓDIGO RESTAURADO!
            snapshot.forEach(doc => {
                const envio = doc.data();
                listaAsignadosDiv.innerHTML += `
                    <div class="envio-card">
                        <div>
                            <p><strong>Origen:</strong> ${envio.direccionOrigen}</p>
                            <p><strong>Destino:</strong> ${envio.direccionDestino}</p>
                        </div>
                        <button class="btn-actualizar" data-id="${doc.id}" data-nuevo-estado="En Camino">Recoger Paquete</button>
                    </div>
                `;
            });
        });

        // --- Listener para envíos EN CAMINO ---
        const qEnCamino = query(collection(db, "envios"), where("estado", "==", "En Camino"), where("id_repartidor_fk", "==", repartidorId));
        onSnapshot(qEnCamino, (snapshot) => {
            listaEnCaminoDiv.innerHTML = snapshot.empty ? '<p>No hay entregas en curso.</p>' : '';
            // ¡CÓDIGO RESTAURADO!
            snapshot.forEach(doc => {
                const envio = doc.data();
                listaEnCaminoDiv.innerHTML += `
                    <div class="envio-card">
                        <div>
                            <p><strong>Origen:</strong> ${envio.direccionOrigen}</p>
                            <p><strong>Destino:</strong> ${envio.direccionDestino}</p>
                        </div>
                        <button class="btn-actualizar" data-id="${doc.id}" data-nuevo-estado="Entregado">Entregar Paquete</button>
                    </div>
                `;
            });
        });
    }
});

// --- Lógica para Actualizar Estado (sin cambios) ---
async function actualizarEstadoEnvio(envioId, nuevoEstado) {
    const user = auth.currentUser;
    if (!user) return;

    const repartidorId = user.uid;
    const envioRef = doc(db, "envios", envioId);

    try {
        await updateDoc(envioRef, { estado: nuevoEstado });
        
        // Si la entrega se completó, el repartidor vuelve a estar "Disponible"
        if (nuevoEstado === 'Entregado') {
            const repartidorRef = doc(db, "usuarios", repartidorId);
            await updateDoc(repartidorRef, { estado: "Disponible" });
        }
        Swal.fire({
            toast: true,
            position: 'top-end',
            icon: 'success',
            title: `¡Estado actualizado a "${nuevoEstado}"!`,
            showConfirmButton: false,
            timer: 2000
        });
    } catch (error) {
        Swal.fire('Error', 'No se pudo actualizar el estado.', 'error');
    }
}

// --- Escuchador de clics (sin cambios) ---
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('btn-actualizar')) {
        actualizarEstadoEnvio(e.target.dataset.id, e.target.dataset.nuevoEstado);
    }
});