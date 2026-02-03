const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  delay
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const qrcode = require('qrcode');
const fs = require('fs');
const path = require('path');
const db = require('../db');
const deviceController = require('./deviceController');

let clients = {};
let baileysVersion = null;

// Helper para obtener versión una sola vez
async function getVersion() {
  if (baileysVersion) return baileysVersion;
  try {
    const { version } = await fetchLatestBaileysVersion();
    baileysVersion = version;
    return version;
  } catch (e) {
    return [2, 3000, 1017531234];
  }
}

// Helper para buscar instancia por numero o ID
async function findInstance(identifier) {
  return new Promise((resolve, reject) => {
    const query = 'SELECT * FROM dispositivos_whatsapp WHERE instancia_id = ? OR numero = ? LIMIT 1';
    db.query(query, [identifier, identifier], (err, results) => {
      if (err) reject(err);
      else resolve(results[0]);
    });
  });
}

// Función para asegurar cliente (Inicialización)
async function ensureClient(numero, instancia_id) {
  if (!instancia_id) {
    const device = await findInstance(numero);
    if (device) instancia_id = device.instancia_id;
    else {
      console.error(`❌ ensureClient: No se encontró instancia para ${numero}`);
      return;
    }
  }

  // Si ya existe y está activo/intentando, no recrear
  if (clients[instancia_id]) {
    if (clients[instancia_id].ready || clients[instancia_id].state === 'INIT' || clients[instancia_id].state === 'QR') {
      return clients[instancia_id];
    }
  }

  // Marcar como INIT inmediatamente para evitar carreras
  clients[instancia_id] = {
    numero,
    ready: false,
    state: 'INIT',
    initializedAt: Date.now(),
    qr: null
  };

  console.log(`🔧 Iniciando Instancia Baileys: ${instancia_id} (${numero})`);

  const authFolder = path.join(__dirname, `../sessions/${instancia_id}`);
  if (!fs.existsSync(authFolder)) {
    fs.mkdirSync(authFolder, { recursive: true });
  }

  // Guardar info del dispositivo en la carpeta para cumplir "guarda en una carpeta"
  try {
    fs.writeFileSync(path.join(authFolder, 'device_info.json'), JSON.stringify({ numero, instancia_id, name: 'WhatsApp Device' }, null, 2));
  } catch (e) {
    console.error('Error guardando device_info:', e.message);
  }

  const { state, saveCreds } = await useMultiFileAuthState(authFolder);

  const version = await getVersion();

  const sock = makeWASocket({
    version,
    printQRInTerminal: false,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'error' })),
    },
    logger: pino({ level: 'error' }),
    browser: ['WillayAPI', 'Chrome', '1.0.0'],
    markOnlineOnConnect: true,
    connectTimeoutMs: 60000,
    keepAliveIntervalMs: 30000,
  });

  clients[instancia_id].sock = sock;

  // Guardar credenciales cuando se actualizan
  sock.ev.on('creds.update', saveCreds);

  // Manejar eventos de conexión
  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      clients[instancia_id].qr = await qrcode.toDataURL(qr);
      clients[instancia_id].state = 'QR';

      // Emitir solo si cambió algo importante
      try {
        require('../main').io.emit('deviceStatusChanged', {
          instancia_id,
          status: 'conectando',
          qr: clients[instancia_id].qr,
          state: 'QR'
        });
      } catch (e) { }
    }

    if (connection === 'close') {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

      console.log(`⚠️ Conexión cerrada para ${instancia_id}. Razón: ${statusCode}. Reintentar: ${shouldReconnect}`);

      clients[instancia_id].ready = false;
      clients[instancia_id].state = 'DISCONNECTED';

      if (shouldReconnect) {
        // Reintentar en 5 segundos
        setTimeout(() => ensureClient(numero, instancia_id), 5000);
      } else {
        // Logged out - eliminar sesión
        console.log(`🚪 Sesión cerrada permanentemente para ${instancia_id}`);
        delete clients[instancia_id];

        // Limpiar carpeta de sesión
        try { fs.rmSync(authFolder, { recursive: true, force: true }); } catch (e) { }
      }

      try { require('../main').io.emit('deviceStatusChanged', { instancia_id, numero, status: 'desconectado', ready: false }); } catch (e) { }
    } else if (connection === 'open') {
      console.log(`✅ Ready: ${instancia_id}`);

      // Capturar el número real del dispositivo conectado
      let realNumber = sock.user.id.split(':')[0].split('@')[0];
      console.log(`📱 Número detectado para ${instancia_id}: ${realNumber}`);

      clients[instancia_id].ready = true;
      clients[instancia_id].state = 'CONNECTED';
      clients[instancia_id].numero = realNumber; // Actualizar en memoria
      clients[instancia_id].qr = null;
      clients[instancia_id].connectedAt = Date.now();

      // Actualizar información local
      try {
        const info = { numero: realNumber, instancia_id, name: clients[instancia_id].name || 'WhatsApp Device' };
        fs.writeFileSync(path.join(authFolder, 'device_info.json'), JSON.stringify(info, null, 2));
      } catch (e) { }

      // Actualizar en BD (solo número y estado)
      db.query('UPDATE dispositivos_whatsapp SET numero = ?, estado = "conectado", qr_code = NULL, fecha_conexion = NOW() WHERE instancia_id = ?', [realNumber, instancia_id]);

      try { require('../main').io.emit('deviceStatusChanged', { instancia_id, numero: realNumber, status: 'conectado', ready: true }); } catch (e) { }
    }
  });

  return clients[instancia_id];
}

module.exports.ensureClient = ensureClient;

exports.getQr = async (req, res) => {
  try {
    const { numero, instancia_id } = req.query;
    const identifier = instancia_id || numero;
    if (!identifier) return res.status(400).json({ error: 'Falta identificación' });

    const device = await findInstance(identifier);
    if (!device) return res.status(404).json({ error: 'Dispositivo no encontrado' });

    await ensureClient(device.numero, device.instancia_id);
    const state = clients[device.instancia_id];

    res.json({ qr: state?.qr, ready: state?.ready, state: state?.state || 'INIT' });
  } catch (error) {
    console.error('❌ Error en getQr:', error);
    res.status(500).json({ error: 'Error interno' });
  }
};

exports.getStatus = async (req, res) => {
  try {
    const { numero, instancia_id } = req.query;
    const identifier = instancia_id || numero;
    const device = await findInstance(identifier);
    if (!device) return res.json({ ready: false, state: 'NONE' });

    const state = clients[device.instancia_id];
    res.json({
      ready: !!state?.ready,
      state: state?.state || 'OFFLINE',
      instancia_id: device.instancia_id
    });
  } catch (error) {
    res.status(500).json({ error: 'Error interno' });
  }
};

exports.sendMessage = async (req, res) => {
  try {
    const { number, message, fromNumber } = req.body;
    const { token } = req;

    if (!number || !message) return res.status(400).json({ error: 'Faltan datos' });

    let identifier = fromNumber;
    if (!identifier) {
      const user = await new Promise((resolve) => {
        db.query('SELECT numero FROM usuarios WHERE token = ?', [token], (err, res) => resolve(res[0]));
      });
      if (!user) return res.status(401).json({ error: 'No autorizado' });
      identifier = user.numero;
    }

    const device = await findInstance(identifier);
    if (!device) return res.status(404).json({ error: 'Dispositivo no encontrado' });

    const state = clients[device.instancia_id];
    if (!state || !state.ready) return res.status(400).json({ error: 'Sesión no lista' });

    const jid = `${number.replace(/[^0-9]/g, '')}@s.whatsapp.net`;
    await state.sock.sendMessage(jid, { text: message });
    res.json({ success: true, from: device.numero });
  } catch (error) {
    console.error('Error enviando mensaje:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.sendDocument = async (req, res) => {
  try {
    const { number, mediatype, media, filename, caption, fromNumber } = req.body;
    let identifier = fromNumber;

    if (!identifier) {
      const token = req.headers.authorization?.replace('Bearer ', '');
      const user = await new Promise((resolve) => {
        db.query('SELECT numero FROM usuarios WHERE token = ?', [token], (err, res) => resolve(res?.[0]));
      });
      if (!user) return res.status(401).json({ error: 'Token requerido' });
      identifier = user.numero;
    }

    const device = await findInstance(identifier);
    if (!device) return res.status(404).json({ error: 'Dispositivo no encontrado' });

    const state = clients[device.instancia_id];
    if (!state || !state.ready) return res.status(400).json({ error: 'Sesión no lista' });

    const jid = `${number.replace(/[^0-9]/g, '')}@s.whatsapp.net`;
    const buffer = Buffer.from(media, 'base64');

    const messageConfig = {};
    if (mediatype === 'document') {
      messageConfig.document = buffer;
      messageConfig.mimetype = 'application/pdf';
      messageConfig.fileName = filename || 'documento.pdf';
      messageConfig.caption = caption;
    } else {
      messageConfig.image = buffer;
      messageConfig.caption = caption;
    }

    await state.sock.sendMessage(jid, messageConfig);
    res.json({ success: true, from: device.numero });
  } catch (error) {
    console.error('Error enviando documento:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.disconnectDevice = async (req, res) => {
  try {
    const { numero, instancia_id } = req.query;
    const identifier = instancia_id || numero;
    const device = await findInstance(identifier);
    if (!device) return res.status(404).json({ error: 'No encontrado' });

    if (clients[device.instancia_id]) {
      try {
        await clients[device.instancia_id].sock.logout();
      } catch (e) { }
      delete clients[device.instancia_id];
    }

    const authFolder = path.join(__dirname, `../sessions/${device.instancia_id}`);
    if (fs.existsSync(authFolder)) {
      try { fs.rmSync(authFolder, { recursive: true, force: true }); } catch (e) { }
    }

    db.query('UPDATE dispositivos_whatsapp SET estado = "desconectado", qr_code = NULL, fecha_desconexion = NOW() WHERE instancia_id = ?', [device.instancia_id]);

    try { require('../main').io.emit('deviceStatusChanged', { instancia_id: device.instancia_id, status: 'desconectado', ready: false }); } catch (e) { }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Error interno' });
  }
};

exports.deleteDevice = async (req, res) => {
  try {
    const { numero, instancia_id } = req.body;
    const identifier = instancia_id || numero;
    const device = await findInstance(identifier);
    if (!device) return res.status(404).json({ error: 'No encontrado' });

    if (clients[device.instancia_id]) {
      try { await clients[device.instancia_id].sock.end(); } catch (e) { }
      delete clients[device.instancia_id];
    }

    const authFolder = path.join(__dirname, `../sessions/${device.instancia_id}`);
    if (fs.existsSync(authFolder)) {
      try { fs.rmSync(authFolder, { recursive: true, force: true }); } catch (e) { }
    }

    db.query('DELETE FROM dispositivos_whatsapp WHERE id = ?', [device.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Error interno' });
  }
};

exports.getAllConnections = async (req, res) => {
  try {
    const devices = await deviceController.getAllDevices(req.user ? req.user.id : null);
    const connections = {};
    devices.forEach(device => {
      const state = clients[device.instancia_id];
      const key = device.instancia_id || device.numero;
      connections[key] = {
        number: device.numero,
        name: device.nombre,
        ready: !!state?.ready,
        state: state?.state || device.estado,
        instancia_id: device.instancia_id
      };
    });
    res.json({ totalClients: devices.length, connections });
  } catch (error) {
    res.status(500).json({ error: 'Error interno' });
  }
};

exports.updateDevice = async (req, res) => {
  try {
    const { identifier, instancia_id, nombre } = req.body;
    const targetId = identifier || instancia_id;

    if (!targetId) return res.status(400).json({ error: 'Identificador requerido' });

    if (instancia_id && instancia_id !== targetId) {
      if (clients[targetId]) {
        try { await clients[targetId].sock.end(); } catch (e) { }
        delete clients[targetId];
      }
      const oldAuthFolder = path.join(__dirname, `../sessions/${targetId}`);
      if (fs.existsSync(oldAuthFolder)) {
        try { fs.rmSync(oldAuthFolder, { recursive: true, force: true }); } catch (e) { }
      }
    }

    await deviceController.updateDevice(targetId, { nombre, instancia_id });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateInstance = async (req, res) => {
  try {
    const { numero, instancia_id } = req.body;
    if (!numero || !instancia_id) return res.status(400).json({ error: 'Faltan datos' });
    await deviceController.updateDevice(numero, { instancia_id });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.addDevice = async (req, res) => {
  try {
    const { nombre } = req.body;
    const usuario_id = req.user ? req.user.id : null;
    const instancia_id = await deviceController.generateUniqueInstance();

    // Registrar solo nombre e instancia, el número vendrá después
    await deviceController.createOrUpdateDevice(null, {
      nombre,
      estado: 'conectando',
      instancia_id,
      usuario_id
    });

    // Iniciar cliente sin número (se detectará al conectar)
    ensureClient(null, instancia_id);

    res.json({ success: true, instancia_id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.generateInstance = async (req, res) => {
  const instancia_id = await deviceController.generateUniqueInstance();
  res.json({ success: true, instancia_id });
};

exports.getClients = () => clients;