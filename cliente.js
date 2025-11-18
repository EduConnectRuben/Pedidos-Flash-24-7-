// =================================================================
// CÓDIGO FINAL PARA EL PANEL DEL CLIENTE
// Implementa la generación de IDs de pedido personalizados (ej: 001-181125)
// USANDO UNA TRANSACCIÓN DE FIRESTORE directamente desde el cliente.
// =================================================================
import { db, auth } from './firebase-config.js';
// ¡IMPORTANTE! Añadimos 'runTransaction', 'Timestamp', y 'serverTimestamp'
import { collection, query, where, onSnapshot, orderBy, doc, getDoc, runTransaction, Timestamp, serverTimestamp, setDoc, addDoc } from "https://www.gstatic.com/firebasejs/9.6.7/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.6.7/firebase-auth.js";

// --- Referencias al DOM ---
const nombreClienteSpan = document.getElementById('nombre-cliente');
const formEnvio = document.getElementById('form-envio');
const historialEnviosDiv = document.getElementById('historial-envios');
const modalRastreo = document.getElementById('modal-rastreo');
const rastreoContenido = document.getElementById('rastreo-contenido');
const btnCerrarRastreo = document.getElementById('btn-cerrar-rastreo');

onAuthStateChanged(auth, async (user) => {
    if (user) {
        const clienteId = user.uid;

        // 1. Mostrar nombre del cliente
        const userRef = doc(db, "usuarios", clienteId);
        const docSnap = await getDoc(userRef);
        if (docSnap.exists()) {
            nombreClienteSpan.textContent = docSnap.data().nombre;
        }

        // 2. Lógica para solicitar un nuevo envío (¡COMPLETAMENTE NUEVA!)
        // Ahora usamos una transacción para generar el ID y crear el envío de forma segura.
        formEnvio.addEventListener('submit', async (e) => {
            e.preventDefault();
            const origen = formEnvio['origen'].value;
            const destino = formEnvio['destino'].value;
            const paquete = formEnvio['paquete'].value;

            if (!auth.currentUser) {
                Swal.fire('Error', 'Tu sesión ha expirado.', 'error');
                return;
            }

            try {
                // Ejecutamos la transacción
                const nuevoIdPedido = await runTransaction(db, async (transaction) => {
                    // Referencia al documento del contador
                    const contadorRef = doc(db, "contadores", "pedidoDiario");
                    const contadorDoc = await transaction.get(contadorRef);

                    // Formatear la fecha actual a DDMMYY y DDMMAAAA
                    const ahora = new Date();
                    const dia = String(ahora.getDate()).padStart(2, '0');
                    const mes = String(ahora.getMonth() + 1).padStart(2, '0');
                    const anioCorto = String(ahora.getFullYear()).slice(-2);
                    const anioLargo = String(ahora.getFullYear());
                    const fechaHoyParaId = `${dia}${mes}${anioCorto}`;
                    const fechaHoyParaComparar = `${dia}${mes}${anioLargo}`;

                    let nuevoValor = 1;

                    if (contadorDoc.exists()) {
                        const datosContador = contadorDoc.data();
                        // Comparamos si la fecha guardada es la de hoy
                        if (datosContador.fecha === fechaHoyParaComparar) {
                            nuevoValor = datosContador.valor + 1; // Mismo día, incrementamos
                        }
                        // Si no, nuevoValor ya es 1 (reinicio diario)
                    }

                    // Actualizamos el contador DENTRO de la transacción
                    transaction.update(contadorRef, {
                        valor: nuevoValor,
                        fecha: fechaHoyParaComparar
                    });

                    // Formateamos el ID final (ej: 007-181125)
                    const numeroSecuencial = String(nuevoValor).padStart(3, '0');
                    const idGenerado = `${numeroSecuencial}-${fechaHoyParaId}`;

                    // Creamos el nuevo documento de envío TAMBIÉN DENTRO de la transacción
                    const nuevoEnvioRef = doc(collection(db, "envios")); // Genera una referencia con ID automático
                    transaction.set(nuevoEnvioRef, {
                        id_pedido_personalizado: idGenerado,
                        direccionOrigen: origen,
                        direccionDestino: destino,
                        descripcionPaquete: paquete,
                        id_cliente_fk: clienteId,
                        estado: "Solicitado",
                        fechaSolicitud: serverTimestamp() // Usa la fecha del servidor para consistencia
                    });
                    
                    return idGenerado; // La transacción devuelve el ID generado
                });

                // Si la transacción fue exitosa, mostramos la confirmación
                Swal.fire(
                    '¡Envío Solicitado!',
                    `Tu envío ha sido registrado con el número de pedido: <strong>${nuevoIdPedido}</strong>`,
                    'success'
                );
                formEnvio.reset();

            } catch (error) {
                Swal.fire('Error', 'No se pudo generar el pedido. Inténtalo de nuevo.', 'error');
                console.error("Error en la transacción del envío: ", error);
            }
        });

        // --- 3. Mostrar historial con botón de rastreo inteligente (SIN CAMBIOS) ---
        // Este código ya está preparado para mostrar 'id_pedido_personalizado'
        const qHistorial = query(collection(db, "envios"), where("id_cliente_fk", "==", clienteId), orderBy("fechaSolicitud", "desc"));
        onSnapshot(qHistorial, (snapshot) => {
            historialEnviosDiv.innerHTML = snapshot.empty ? '<p>Aún no has realizado ningún envío.</p>' : '';
            snapshot.forEach(doc => {
                const envio = doc.data();
                const idMostrado = envio.id_pedido_personalizado || doc.id;
                const botonRastreoHTML = envio.estado === 'Entregado'
                    ? `<button class="btn-entregado" disabled>Entregado</button>`
                    : `<button class="btn-rastrear" data-id="${doc.id}">Rastrear</button>`;

                historialEnviosDiv.innerHTML += `
                    <div class="envio-card">
                        <div>
                            <p><strong>Pedido:</strong> ${idMostrado}</p>
                            <p><strong>Destino:</strong> ${envio.direccionDestino}</p>
                        </div>
                        <div>
                            <p><strong>Estado: ${envio.estado}</strong></p>
                            ${botonRastreoHTML}
                        </div>
                    </div>`;
            });
        });

        // --- 4. Lógica para el Modal de Rastreo (SIN CAMBIOS) ---
        let unsubscribeRastreo = null;
        document.addEventListener('click', async (e) => {
            if (e.target && e.target.classList.contains('btn-rastrear')) {
                const envioId = e.target.dataset.id;
                modalRastreo.classList.remove('hidden');
                
                const envioRef = doc(db, "envios", envioId);
                unsubscribeRastreo = onSnapshot(envioRef, (docSnap) => {
                    if (docSnap.exists()) {
                        const envio = docSnap.data();
                        const estados = ["Solicitado", "Asignado", "En Camino", "Entregado"];
                        const indiceActual = estados.indexOf(envio.estado);
                        
                        rastreoContenido.innerHTML = `
                            <p><strong>ID:</strong> ${docSnap.id}</p>
                            <p><strong>Estado Actual:</strong> <strong style="color: #0056b3;">${envio.estado}</strong></p>
                            <div class="rastreo-progreso">
                                ${estados.map((estado, index) => `
                                    <div class="rastreo-paso ${index <= indiceActual ? 'completado' : ''}">
                                        <div class="circulo"></div>
                                        ${estado}
                                    </div>
                                `).join('')}
                            </div>
                        `;
                    }
                });
            }
        });

        btnCerrarRastreo.addEventListener('click', () => {
            modalRastreo.classList.add('hidden');
            if (unsubscribeRastreo) {
                unsubscribeRastreo();
            }
        });
    }
});