const db = require('../db');
const whatsappController = require('./whatsappController');
const fs = require('fs');
const path = require('path');

// Configuración
const MESSAGE_DELAY = 5000; // 5 segundos entre mensajes por instancia
const PROCESS_INTERVAL = 2000; // Verificar cola cada 2 segundos

// Estado en memoria para bloquear instancias que están procesando
const processingInstances = new Set();

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

      // Si el cliente pide esperar confirmación (Dashboard)
      if (req.body.wait) {
        let attempts = 0;
        const maxAttempts = 20; // 10 segundos (20 * 500ms)

        const checkStatus = setInterval(() => {
          attempts++;
          db.query('SELECT estado, error FROM cola_mensajes WHERE id = ?', [result.insertId], (err, rows) => {
            if (err || rows.length === 0) {
              clearInterval(checkStatus);
              return res.status(500).json({ error: 'Error verificando estado' });
            }

            const estado = rows[0].estado;
            if (estado === 'enviado') {
              clearInterval(checkStatus);
              return res.json({ success: true, message: 'Enviado correctamente', from: sender });
            } else if (estado === 'fallido') {
              clearInterval(checkStatus);
              return res.status(500).json({ error: rows[0].error || 'Error desconocido al enviar' });
            } else if (attempts >= maxAttempts) {
              clearInterval(checkStatus);
              return res.json({ success: true, message: 'Mensaje en cola (tiempo de espera agotado)', from: sender, warning: 'timeout' });
            }
          });
        }, 500);

        processQueue();

      } else {
        res.json({ success: true, queue_id: result.insertId, message: 'Mensaje encolado', from: sender });
        processQueue();
      }
    });
  });
};

// Procesador principal (Loop)
function startQueueProcessor() {
  console.log('🚀 Iniciando Procesador de Colas de Mensajes Baileys...');
  setInterval(processQueue, PROCESS_INTERVAL);
}

// Función que busca instancias con trabajo pendiente
function processQueue() {
  const query = `
        SELECT DISTINCT instancia_id 
        FROM cola_mensajes 
        WHERE estado = 'pendiente' 
        AND instancia_id IS NOT NULL
    `;

  db.query(query, (err, results) => {
    if (err) return console.error('Error polling queue:', err);

    if (results.length > 0) {
      console.log(`📋 Cola detectada: ${results.length} instancia(s) con mensajes pendientes.`);
    }

    results.forEach(row => {
      const instanceId = row.instancia_id;
      if (!processingInstances.has(instanceId)) {
        processInstanceQueue(instanceId);
      }
    });
  });
}

// Procesador por Instancia (Secuencial con Delay)
async function processInstanceQueue(instancia_id) {
  if (processingInstances.has(instancia_id)) return;

  processingInstances.add(instancia_id);

  try {
    let pending = true;

    while (pending) {
      const msg = await getNextMessage(instancia_id);

      if (!msg) {
        pending = false;
        break;
      }

      console.log(`✉️ Procesando mensaje ID ${msg.id} para ${msg.numero_destino} via ${instancia_id}...`);
      await updateMessageStatus(msg.id, 'procesando');

      let success = false;
      let errorMsg = null;

      try {
        const clients = whatsappController.getClients();
        const clientData = clients[instancia_id];

        if (!clientData || !clientData.ready || !clientData.sock) {
          throw new Error(`Instancia ${instancia_id} no está conectada o lista.`);
        }

        const jid = `${msg.numero_destino.replace(/[^0-9]/g, '')}@s.whatsapp.net`;

        if (msg.tipo === 'texto') {
          await clientData.sock.sendMessage(jid, { text: msg.mensaje });
          success = true;
          console.log(`✅ Mensaje ${msg.id} enviado exitosamente.`);

        } else if (msg.tipo === 'media' || msg.tipo === 'documento') {
          let messageConfig = {};
          let filePath = msg.media_url;

          if (filePath && (fs.existsSync(filePath) || filePath.includes('/') || filePath.includes('\\'))) {
            const buffer = fs.readFileSync(filePath);
            if (msg.tipo === 'documento' || filePath.toLowerCase().endsWith('.pdf') || filePath.toLowerCase().endsWith('.xml')) {
              messageConfig.document = buffer;
              messageConfig.mimetype = filePath.toLowerCase().endsWith('.xml') ? 'application/xml' : 'application/pdf';
              messageConfig.fileName = path.basename(filePath);
            } else {
              messageConfig.image = buffer;
            }
            messageConfig.caption = msg.caption || msg.mensaje;

            await clientData.sock.sendMessage(jid, messageConfig);
            success = true;
            console.log(`✅ Media/Doc ${msg.id} enviado exitosamente.`);
          } else {
            throw new Error('Archivo media no encontrado en disco: ' + filePath);
          }
        }

      } catch (err) {
        console.error(`❌ Error enviando msg ${msg.id}:`, err.message);
        errorMsg = err.message;
      }

      await updateMessageStatus(msg.id, success ? 'enviado' : 'fallido', errorMsg);

      if (success) {
        // Pausa entre mensajes para evitar spam
        await new Promise(resolve => setTimeout(resolve, MESSAGE_DELAY));
      } else {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

  } catch (globalErr) {
    console.error(`Error crítico procesando instancia ${instancia_id}:`, globalErr);
  } finally {
    processingInstances.delete(instancia_id);
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
