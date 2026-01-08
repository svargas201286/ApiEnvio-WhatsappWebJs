const db = require('../db');
const whatsappController = require('./whatsappController');
const { MessageMedia } = require('whatsapp-web.js');

// Configuración
const MESSAGE_DELAY = 15000; // 15 segundos entre mensajes por instancia
const PROCESS_INTERVAL = 2000; // Verificar cola cada 2 segundos

// Estado en memoria para bloquear instancias que están procesando
const processingInstances = new Set();

const fs = require('fs');
const path = require('path');

// Añadir mensaje a la cola
exports.addToQueue = (req, res) => {
  const { number, message, mediatype, media, filename, fromNumber, mimetype } = req.body;
  let { caption } = req.body;

  // Si no viene caption pero sí message (mapeo del frontend), usar message
  if (!caption && message) {
    caption = message;
  }

  // Auth middleware ya validó el token y adjuntó req.user
  let sender = fromNumber || (req.user ? req.user.numero : null);

  // Validación básica
  if (!number) return res.status(400).json({ error: 'Número de destino requerido' });

  // Determinar tipo y manejar media
  let tipo = 'texto';
  let mediaUrl = null;
  let msgContent = message;

  // Asegurar directorio de uploads
  const uploadDir = path.join(__dirname, '../public/uploads');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  if (req.file) {
    // Caso Multipart (Formulario web)
    tipo = req.file.mimetype.includes('pdf') || req.file.mimetype.includes('xml') ? 'documento' : 'media';
    mediaUrl = req.file.path.replace(/\\\\/g, '/'); // Normalizar path
  } else if (media) {
    // Caso JSON Base64 (API externa PHP)
    tipo = mediatype === 'document' ? 'documento' : 'media';

    // Guardar Base64 en disco para evitar truncamiento en DB y preservar filename
    try {
      const buffer = Buffer.from(media, 'base64');
      // Usar nombre original o generar uno seguro
      const safeFilename = filename ? filename.replace(/[^a-zA-Z0-9.-]/g, '_') : `file_${Date.now()}.${mimetype === 'application/pdf' ? 'pdf' : 'jpg'}`;
      const filePath = path.join(uploadDir, safeFilename);

      fs.writeFileSync(filePath, buffer);
      mediaUrl = filePath.replace(/\\\\/g, '/'); // Guardar ruta absoluta/relativa

    } catch (e) {
      console.error('Error guardando archivo base64:', e);
      return res.status(500).json({ error: 'Error procesando archivo media' });
    }
  }

  const findInstanceQuery = 'SELECT instancia_id FROM dispositivos_whatsapp WHERE numero = ? OR instancia_id = ? LIMIT 1';
  db.query(findInstanceQuery, [sender, sender], (err, results) => {
    if (err) return res.status(500).json({ error: 'Error BD' });
    if (results.length === 0) return res.status(404).json({ error: 'Dispositivo no encontrado para envío' });

    const instancia_id = results[0].instancia_id;

    // Volvemos al INSERT original (sin filename/mimetype) porque no se pudo alterar la DB
    const insertQuery = `
            INSERT INTO cola_mensajes 
            (instancia_id, numero_destino, mensaje, tipo, media_url, caption, from_number, estado)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'pendiente')
        `;

    db.query(insertQuery, [instancia_id, number, msgContent, tipo, mediaUrl, caption, sender], (err, result) => {
      if (err) {
        console.error('Error al encolar:', err);
        return res.status(500).json({ error: 'Error al guardar mensaje en cola', details: err.sqlMessage || err.message });
      }
      res.json({ success: true, queue_id: result.insertId, message: 'Mensaje encolado', from: sender });

      processQueue();
    });
  });
};

// Procesador principal (Loop)
function startQueueProcessor() {
  console.log('🚀 Iniciando Procesador de Colas de Mensajes...');
  setInterval(processQueue, PROCESS_INTERVAL);
}

// Función que busca instancias con trabajo pendiente
function processQueue() {
  // Buscar instancias distintas que tengan mensajes pendientes Y no estén procesando actualmente
  const query = `
        SELECT DISTINCT instancia_id 
        FROM cola_mensajes 
        WHERE estado = 'pendiente' 
        AND instancia_id IS NOT NULL
    `;

  db.query(query, (err, results) => {
    if (err) return console.error('Error polling queue:', err);

    results.forEach(row => {
      const instanceId = row.instancia_id;

      // Si no está bloqueada, iniciamos procesador para esa instancia
      if (!processingInstances.has(instanceId)) {
        processInstanceQueue(instanceId);
      }
    });
  });
}

// Procesador por Instancia (Secuencial con Delay)
async function processInstanceQueue(instancia_id) {
  if (processingInstances.has(instancia_id)) return;

  // Bloquear instancia
  processingInstances.add(instancia_id);

  console.log(`🔄 Procesando cola para instancia: ${instancia_id}`);

  try {
    // Loop while there are pending messages
    let pending = true;

    while (pending) {
      // Obtener el mensaje más antiguo
      const msg = await getNextMessage(instancia_id);

      if (!msg) {
        pending = false;
        break;
      }

      // Marcar como procesando
      await updateMessageStatus(msg.id, 'procesando');

      // Enviar
      let success = false;
      let errorMsg = null;

      try {
        // Verificar cliente
        const clientReady = await isClientReady(instancia_id);
        if (!clientReady) {
          throw new Error('Cliente WhatsApp no está listo/conectado');
        }

        if (msg.tipo === 'texto') {
          // Simulamos req, res para reutilizar metodo o llamamos logica directa
          // Mejor llamar logica directa. Accedemos a clients[instancia_id]
          const clients = whatsappController.getClients();
          const clientData = clients[instancia_id];
          await clientData.client.sendMessage(`${msg.numero_destino}@c.us`, msg.mensaje);
          success = true;

        } else if (msg.tipo === 'media' || msg.tipo === 'documento') {
          const clients = whatsappController.getClients();
          const clientData = clients[instancia_id];

          // Reconstruir media
          let mediaObj = null;

          if (msg.media_url.startsWith('uploads') || msg.media_url.includes('/') || msg.media_url.includes('\\')) {
            // Es un archivo local (ruta)
            mediaObj = MessageMedia.fromFilePath(msg.media_url);
          } else if (msg.media_url.startsWith('data:')) {
            // Base64 Data URI
            const parts = msg.media_url.split(',');
            const mime = parts[0].match(/:(.*?);/)[1];
            const data = parts[1];
            mediaObj = new MessageMedia(mime, data, msg.filename || msg.caption || 'file');
          } else {
            // Fallback: Usar mimetype/filename guardado en BD, o inferir
            let mime = msg.mimetype;
            if (!mime) {
              mime = msg.tipo === 'documento' ? 'application/pdf' : 'image/jpeg';
            }
            mediaObj = new MessageMedia(mime, msg.media_url, msg.filename || msg.caption || 'file');
          }

          await clientData.client.sendMessage(`${msg.numero_destino}@c.us`, mediaObj, { caption: msg.caption });

          // Opcional: Borrar archivo temporal después de envío exitoso?
          // Por ahora lo dejamos para historial o debug audit
          success = true;
        }

      } catch (err) {
        console.error(`❌ Error enviando msg ${msg.id}:`, err.message);
        errorMsg = err.message;
      }

      // Actualizar estado final
      await updateMessageStatus(msg.id, success ? 'enviado' : 'fallido', errorMsg);

      // Esperar Delay (Rate Limiting)
      if (success) {
        await new Promise(resolve => setTimeout(resolve, MESSAGE_DELAY));
      } else {
        // Si falló, quizás esperar menos o igual para no atascar
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

  } catch (globalErr) {
    console.error(`Error crítico procesando instancia ${instancia_id}:`, globalErr);
  } finally {
    // Desbloquear instancia
    processingInstances.delete(instancia_id);
    console.log(`✅ Fin procesamiento cola instancia: ${instancia_id}`);
  }
}

// Helpers Promisified
function getNextMessage(instancia_id) {
  return new Promise((resolve, reject) => {
    db.query(
      'SELECT * FROM cola_mensajes WHERE instancia_id = ? AND estado = "pendiente" ORDER BY created_at ASC LIMIT 1',
      [instancia_id],
      (err, results) => {
        if (err) reject(err);
        else resolve(results[0]);
      }
    );
  });
}

function updateMessageStatus(id, estado, error = null) {
  return new Promise((resolve, reject) => {
    let query = 'UPDATE cola_mensajes SET estado = ?, updated_at = NOW()';
    const params = [estado];
    if (error) {
      query += ', error = ?';
      params.push(error);
    }
    query += ' WHERE id = ?';
    params.push(id);

    db.query(query, params, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

async function isClientReady(instancia_id) {
  const clients = whatsappController.getClients();
  const clientData = clients[instancia_id];
  return clientData && clientData.ready;
}

exports.init = startQueueProcessor;
