const { MessageMedia, Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const fs = require('fs');
const db = require('../db');
const deviceController = require('./deviceController');

let clients = {};

// Exportar clients para monitoreo
module.exports.clients = clients;

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

// Función para guardar estado de conexiones
function saveConnectionsState() {
  const state = {};
  for (const [id, clientData] of Object.entries(clients)) {
    if (clientData.ready) {
      state[id] = {
        numero: clientData.numero,
        ready: clientData.ready,
        connectedAt: clientData.connectedAt,
        lastSeen: Date.now()
      };
    }
  }

  try {
    fs.writeFileSync('./whatsapp-sessions.json', JSON.stringify(state, null, 2));
  } catch (error) {
    console.error('Error al guardar estado de sesiones:', error);
  }
}

// Función para cargar estado de conexiones
function loadConnectionsState() {
  try {
    if (fs.existsSync('./whatsapp-sessions.json')) {
      const data = fs.readFileSync('./whatsapp-sessions.json', 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error al cargar estado de sesiones:', error);
  }
  return {};
}

// Guardar estado cada 5 minutos
setInterval(saveConnectionsState, 5 * 60 * 1000);

// Cargar estado al iniciar
const savedState = loadConnectionsState();

// Función para limpiar SOLO clientes que nunca se conectaron
function cleanupUnconnectedClients() {
  const now = Date.now();
  const maxUnconnectedTime = 60 * 60 * 1000;

  for (const [id, clientData] of Object.entries(clients)) {
    if (!clientData.ready && !clientData.qr) {
      const timeSinceInit = now - clientData.initializedAt;
      if (timeSinceInit > maxUnconnectedTime) {
        console.log(`Limpiando instancia inactiva: ${id}`);
        try { clientData.client.destroy(); } catch (e) { }
        delete clients[id];
      }
    }
  }
}
setInterval(cleanupUnconnectedClients, 30 * 60 * 1000);

function getChromePath() {
  if (process.env.CHROME_PATH && fs.existsSync(process.env.CHROME_PATH)) return process.env.CHROME_PATH;
  const candidates = [
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    'C:/Program Files/Microsoft/Edge/Application/msedge.exe'
  ];
  for (const p of candidates) {
    try { if (fs.existsSync(p)) return p; } catch (_) { }
  }
  return undefined;
}

async function ensureClient(numero, instancia_id) {
  if (!instancia_id) {
    const device = await findInstance(numero);
    if (device) instancia_id = device.instancia_id;
    else {
      console.error(`❌ ensureClient: No se encontró instancia para ${numero}`);
      return;
    }
  }

  if (!clients[instancia_id]) {
    console.log(`🔧 Iniciando Instancia: ${instancia_id} (${numero})`);
    const executablePath = getChromePath();
    const client = new Client({
      authStrategy: new LocalAuth({ clientId: instancia_id, dataPath: './.wwebjs_auth' }),
      restartOnAuthFail: true,
      takeoverOnConflict: true,
      takeoverTimeoutMs: 0,
      webVersionCache: { type: 'remote', remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html' },
      puppeteer: { executablePath, headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] }
    });

    clients[instancia_id] = { client, numero, ready: false, state: 'INIT', initializedAt: Date.now() };

    client.on('qr', async qr => {
      if (clients[instancia_id]) {
        clients[instancia_id].qr = await qrcode.toDataURL(qr);
        clients[instancia_id].state = 'QR';
        db.query('UPDATE dispositivos_whatsapp SET qr_code = ?, ultima_actividad = NOW() WHERE instancia_id = ?', [clients[instancia_id].qr, instancia_id]);
      }
    });

    client.on('ready', async () => {
      if (clients[instancia_id]) {
        console.log(`✅ Ready: ${instancia_id}`);
        clients[instancia_id].ready = true;
        clients[instancia_id].state = 'CONNECTED';
        clients[instancia_id].qr = null;
        clients[instancia_id].connectedAt = Date.now();
        db.query('UPDATE dispositivos_whatsapp SET estado = "conectado", fecha_conexion = NOW() WHERE instancia_id = ?', [instancia_id]);
        try { require('../main').io.emit('deviceStatusChanged', { instancia_id, numero, status: 'conectado', ready: true }); } catch (e) { }
      }
    });

    client.on('disconnected', async (reason) => {
      if (clients[instancia_id]) {
        console.log(`⚠️ Disconnected: ${instancia_id}`, reason);
        clients[instancia_id].ready = false;
        clients[instancia_id].state = 'DISCONNECTED';
        db.query('UPDATE dispositivos_whatsapp SET estado = "desconectado", fecha_desconexion = NOW() WHERE instancia_id = ?', [instancia_id]);

        try { require('../main').io.emit('deviceStatusChanged', { instancia_id, numero, status: 'desconectado', ready: false }); } catch (e) { }

        if (!['LOGOUT', 'CLIENT_LOGOUT'].includes(reason)) {
          setTimeout(() => { if (clients[instancia_id]) clients[instancia_id].client.initialize().catch(() => { }); }, 5000);
        } else {
          delete clients[instancia_id];
        }
      }
    });

    client.on('authenticated', () => {
      console.log(`🔑 Authenticated: ${instancia_id}`);
      clients[instancia_id].state = 'AUTHENTICATED';
    });

    client.on('auth_failure', async (msg) => {
      console.error(`❌ Auth Failure: ${instancia_id}`, msg);
      if (clients[instancia_id]) {
        clients[instancia_id].ready = false;
        clients[instancia_id].state = 'AUTH_FAILURE';
        db.query('UPDATE dispositivos_whatsapp SET estado = "desconectado" WHERE instancia_id = ?', [instancia_id]);

        // Emitir evento para quitar spinner de "Conectando"
        try { require('../main').io.emit('deviceStatusChanged', { instancia_id, status: 'desconectado', ready: false }); } catch (e) { }
      }
    });

    // Inicializar cliente y agregar un retardo artificial para evitar sobrecarga secuencial
    // Actualizar estado en BD a 'conectando' para feedback visual inmediato
    db.query('UPDATE dispositivos_whatsapp SET estado = "conectando" WHERE instancia_id = ?', [instancia_id]);

    // Emitir evento de 'conectando'
    try { require('../main').io.emit('deviceStatusChanged', { instancia_id, status: 'conectando' }); } catch (e) { }

    try {
      await client.initialize();
      // Retardo reducido a 1s para balancear carga y velocidad
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (e) {
      console.error(`❌ Init Error (${instancia_id}):`, e.message);
      // Emitir fallo de inicialización
      try { require('../main').io.emit('deviceStatusChanged', { instancia_id, status: 'error' }); } catch (e) { }
    }
  }
}

module.exports.ensureClient = ensureClient;

exports.getQr = async (req, res) => {
  try {
    const { numero, instancia_id } = req.query;
    const identifier = instancia_id || numero;
    console.log(`📡 Solicitud de QR para: ${identifier}`);

    if (!identifier) return res.status(400).json({ error: 'Falta identificación' });

    const device = await findInstance(identifier);
    if (!device) {
      console.error(`❌ Dispositivo no encontrado: ${identifier}`);
      return res.status(404).json({ error: 'Dispositivo no encontrado' });
    }

    ensureClient(device.numero, device.instancia_id);
    const state = clients[device.instancia_id];

    console.log(`📊 Estado QR para ${device.instancia_id}:`, state?.state);

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

    // Buscar el número de origen por token si no se provee fromNumber
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

    state.client.sendMessage(`${number}@c.us`, message)
      .then(() => res.json({ success: true, from: device.numero }))
      .catch(err => res.status(500).json({ error: err.message }));
  } catch (error) {
    res.status(500).json({ error: 'Error interno' });
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

    const messageMedia = new MessageMedia(mediatype === 'document' ? 'application/pdf' : mediatype, media, filename);
    state.client.sendMessage(`${number}@c.us`, messageMedia, { caption })
      .then(() => res.json({ success: true, from: device.numero }))
      .catch(err => res.status(500).json({ error: err.message }));
  } catch (error) {
    res.status(500).json({ error: 'Error interno' });
  }
};

exports.disconnectDevice = async (req, res) => {
  try {
    const { numero, instancia_id } = req.query;
    const identifier = instancia_id || numero;
    const device = await findInstance(identifier);
    if (!device) return res.status(404).json({ error: 'No encontrado' });

    const state = clients[device.instancia_id];
    if (state?.client) {
      await state.client.logout().catch(() => { });
      await state.client.destroy().catch(() => { });
      // Esperar a que Chrome libere los archivos (evitar EBUSY)
      await new Promise(resolve => setTimeout(resolve, 3000));
    }

    // Forzar eliminación de la carpeta de sesión para evitar estados corruptos
    const sessionPath = `./.wwebjs_auth/session-${device.instancia_id}`;
    if (fs.existsSync(sessionPath)) {
      console.log(`🧹 Eliminando datos de sesión residuales para: ${device.instancia_id}`);
      try {
        fs.rmSync(sessionPath, { recursive: true, force: true });
      } catch (err) {
        console.error('⚠️ Advertencia al eliminar carpeta (posible bloqueo):', err.message);
      }
    }

    if (clients[device.instancia_id]) {
      delete clients[device.instancia_id];
    }

    // Actualizar BD
    db.query('UPDATE dispositivos_whatsapp SET estado = "desconectado", qr_code = NULL, fecha_desconexion = NOW() WHERE instancia_id = ?', [device.instancia_id]);

    // Emitir evento de desconexión a la UI
    try {
      require('../main').io.emit('deviceStatusChanged', {
        instancia_id: device.instancia_id,
        status: 'desconectado',
        ready: false
      });
    } catch (e) { console.error('Error emitiendo socket en disconnect:', e); }

    res.json({ success: true });
  } catch (error) {
    console.error('Error en disconnectDevice:', error);
    res.status(500).json({ error: 'Error interno' });
  }
};

exports.deleteDevice = async (req, res) => {
  try {
    const { numero, instancia_id } = req.body;
    const identifier = instancia_id || numero;
    const device = await findInstance(identifier);
    if (!device) return res.status(404).json({ error: 'No encontrado' });

    const state = clients[device.instancia_id];
    if (state?.client) await state.client.destroy().catch(() => { });
    delete clients[device.instancia_id];

    // Eliminar por ID único de BD
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
    console.log('📡 getAllConnections Keys:', Object.keys(connections));
    res.json({ totalClients: devices.length, connections });
  } catch (error) {
    console.error('Error en getAllConnections:', error);
    res.status(500).json({ error: 'Error interno' });
  }
};

exports.updateDevice = async (req, res) => {
  try {
    const { numero, nombre, instancia_id } = req.body;
    const identifier = instancia_id || numero;
    if (!identifier) return res.status(400).json({ error: 'Identificador requerido' });

    await deviceController.updateDevice(identifier, { nombre });
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
    const { numero, nombre } = req.body;
    const usuario_id = req.user ? req.user.id : null;
    const instancia_id = await deviceController.generateUniqueInstance();
    await deviceController.createOrUpdateDevice(numero, { nombre, estado: 'conectando', instancia_id, usuario_id });
    ensureClient(numero, instancia_id);
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