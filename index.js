const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();

const db = admin.firestore();

// Esta función se activa cada vez que se crea un nuevo documento en la colección 'solicitudes_envio'
exports.generarIdDePedido = functions.firestore
    .document("solicitudes_envio/{solicitudId}")
    .onCreate(async (snap, context) => {
        const datosSolicitud = snap.data();

        // Referencia al documento del contador
        const contadorRef = db.collection("contadores").doc("pedidoDiario");

        try {
            // Usamos una transacción para garantizar que nadie más pueda modificar el contador al mismo tiempo.
            const nuevoIdPedido = await db.runTransaction(async (transaction) => {
                const contadorDoc = await transaction.get(contadorRef);

                // Formatear la fecha actual a DDMMYY
                const ahora = new Date();
                const dia = String(ahora.getDate()).padStart(2, '0');
                const mes = String(ahora.getMonth() + 1).padStart(2, '0');
                const anio = String(ahora.getFullYear()).slice(-2);
                const fechaHoy = `${dia}${mes}${anio}`;
                const fechaHoyStringParaComparar = `${dia}${mes}${String(ahora.getFullYear())}`; // Formato DDMMAAAA

                let nuevoValor = 1;

                if (contadorDoc.exists) {
                    const datosContador = contadorDoc.data();
                    // Comparamos si la fecha guardada es la de hoy
                    if (datosContador.fecha === fechaHoyStringParaComparar) {
                        // Si es el mismo día, incrementamos
                        nuevoValor = datosContador.valor + 1;
                    }
                    // Si no, nuevoValor ya es 1 (reinicio diario)
                }

                // Actualizamos el contador con el nuevo valor y la fecha de hoy dentro de la transacción
                transaction.update(contadorRef, {
                    valor: nuevoValor,
                    fecha: fechaHoyStringParaComparar
                });

                // Formateamos el ID final (ej: 007-181125)
                const numeroSecuencial = String(nuevoValor).padStart(3, '0');
                return `${numeroSecuencial}-${fechaHoy}`;
            });

            // Una vez que tenemos el nuevo ID, creamos el documento final en la colección 'envios'
            await db.collection("envios").add({
                ...datosSolicitud, // Todos los datos originales (origen, destino, etc.)
                id_pedido_personalizado: nuevoIdPedido, // ¡Añadimos nuestro nuevo ID!
                estado: "Solicitado", // Estado inicial
                fechaSolicitud: admin.firestore.FieldValue.serverTimestamp() // Fecha del servidor
            });

            // Finalmente, borramos la solicitud temporal
            return snap.ref.delete();

        } catch (error) {
            console.error("Error en la transacción del contador de pedidos:", error);
            // Opcional: mover la solicitud fallida a una colección de 'errores' para revisarla
            return null;
        }
    });