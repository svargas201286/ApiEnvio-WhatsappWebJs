const { MessageMedia, Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const fs = require('fs');
const db = require('../db');

let clients = {};

// Exportar clients para monitoreo
module.exports.clients = clients;

// Función para guardar estado de conexiones
function saveConnectionsState() {
  const state = {};
  for (const [numero, clientData] of Object.entries(clients)) {
    if (clientData.ready) {
      state[numero] = {
        ready: clientData.ready,
        connectedAt: clientData.connectedAt,
        lastSeen: Date.now()
      };
    }
  }
  
  try {
    fs.writeFileSync('./whatsapp-sessions.json', JSON.stringify(state, null, 2));
    console.log('💾 Estado de sesiones guardado');
  } catch (error) {
    console.error('Error al guardar estado de sesiones:', error);
  }
}

// Función para cargar estado de conexiones
function loadConnectionsState() {
  try {
    if (fs.existsSync('./whatsapp-sessions.json')) {
      const data = fs.readFileSync('./whatsapp-sessions.json', 'utf8');
      const state = JSON.parse(data);
      console.log('📂 Estado de sesiones cargado:', Object.keys(state));
      return state;
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
  const maxUnconnectedTime = 60 * 60 * 1000; // 1 hora para clientes que nunca se conectaron
  
  for (const [numero, clientData] of Object.entries(clients)) {
    // Solo limpiar si nunca se conectó y lleva mucho tiempo
    if (!clientData.ready && !clientData.qr) {
      const timeSinceInit = now - clientData.initializedAt;
      if (timeSinceInit > maxUnconnectedTime) {
        console.log(`Limpiando cliente que nunca se conectó: ${numero}`);
        try {
          clientData.client.destroy();
        } catch (error) {
          console.error(`Error al destruir cliente ${numero}:`, error);
        }
        delete clients[numero];
      }
    }
  }
}

// Ejecutar limpieza cada 30 minutos (solo para clientes no conectados)
setInterval(cleanupUnconnectedClients, 30 * 60 * 1000);

function getChromePath() {
  if (process.env.CHROME_PATH && fs.existsSync(process.env.CHROME_PATH)) {
    return process.env.CHROME_PATH;
  }
  const candidates = [
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
  ];
  for (const p of candidates) {
    try { if (fs.existsSync(p)) return p; } catch (_) {}
  }
  return undefined;
}

function ensureClient(numero) {
  if (!clients[numero]) {
    console.log(`🔧 Creando cliente para número: ${numero}`);
    const executablePath = getChromePath();
    const client = new Client({
      authStrategy: new LocalAuth({ clientId: numero }),
      puppeteer: {
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-gpu',
          '--disable-dev-shm-usage',
          '--disable-extensions',
          '--remote-allow-origins=*',
          '--disable-background-timer-throttling',
          '--disable-backgrounding-occluded-windows',
          '--disable-renderer-backgrounding',
          '--disable-features=TranslateUI',
          '--disable-ipc-flooding-protection',
          '--no-first-run',
          '--no-default-browser-check',
          '--disable-default-apps',
          '--disable-popup-blocking',
          '--disable-prompt-on-repost',
          '--disable-hang-monitor',
          '--disable-client-side-phishing-detection',
          '--disable-sync',
          '--disable-web-resources',
          '--disable-features=VizDisplayCompositor'
        ],
        headless: true,
        executablePath,
        timeout: 60000,
        protocolTimeout: 60000
      }
    });
    clients[numero] = { 
      client, 
      qr: null, 
      ready: false, 
      state: 'INIT', 
      initializedAt: Date.now(), 
      lastQrAt: 0,
      connectedAt: null,
      disconnectedAt: null
    };

    client.on('qr', async qr => {
      try {
        clients[numero].qr = await qrcode.toDataURL(qr);
        clients[numero].state = 'QR';
        clients[numero].lastQrAt = Date.now();
      } catch (_) {
        clients[numero].qr = null;
      }
    });

    client.on('ready', () => {
      console.log(`✅ Cliente ${numero} conectado exitosamente a WhatsApp`);
      clients[numero].ready = true;
      clients[numero].state = 'CONNECTED';
      clients[numero].qr = null; // limpiar QR cuando ya está lista
      clients[numero].connectedAt = Date.now(); // Marcar tiempo de conexión
    });

    client.on('disconnected', (reason) => {
      console.log(`⚠️ Cliente ${numero} desconectado:`, reason);
      // si se cierra sesión en el móvil o se desvincula, marcamos no listo
      clients[numero].ready = false;
      clients[numero].state = 'DISCONNECTED';
      clients[numero].qr = null;
      clients[numero].disconnectedAt = Date.now();
      
      // Intentar reconectar automáticamente después de 5 segundos
      setTimeout(() => {
        if (clients[numero] && !clients[numero].ready) {
          console.log(`🔄 Intentando reconectar cliente ${numero}...`);
          try {
            clients[numero].state = 'RECONNECTING';
            clients[numero].client.initialize().catch((error) => {
              console.error(`Error al reconectar cliente ${numero}:`, error);
            });
          } catch (error) {
            console.error(`Error en reconexión de cliente ${numero}:`, error);
          }
        }
      }, 5000);
    });

    client.on('auth_failure', (msg) => {
      console.log(`Error de autenticación para ${numero}:`, msg);
      clients[numero].ready = false;
      clients[numero].state = 'AUTH_FAILURE';
      clients[numero].qr = null;
    });

    client.on('loading_screen', (percent, message) => {
      clients[numero].state = `LOADING_${percent}`;
    });

    client.on('change_state', (state) => {
      console.log(`Cliente ${numero} cambió estado a:`, state);
      clients[numero].state = String(state || 'UNKNOWN');
    });

    // Agregar manejo de errores durante la inicialización
    client.initialize().catch((error) => {
      console.error(`Error al inicializar cliente ${numero}:`, error);
      clients[numero].state = 'ERROR';
      clients[numero].ready = false;
    });
  }
}

exports.getQr = async (req, res) => {
  try {
    const numero = req.query.numero;
    if (!numero) return res.status(400).json({ error: 'Falta el número' });
    
    console.log(`Solicitando QR para número: ${numero}`);
    ensureClient(numero);
    
    // Si existe pero está desconectado y no hay QR, intenta re-inicializar una sola vez
    const state = clients[numero];
    if (state && !state.ready && !state.qr && state.state !== 'INIT') {
      try {
        console.log(`Reinicializando cliente ${numero}`);
        state.state = 'INIT';
        state.client.initialize().catch((error) => {
          console.error(`Error al reinicializar cliente ${numero}:`, error);
        });
        state.initializedAt = Date.now();
      } catch (error) {
        console.error(`Error en reinicialización de cliente ${numero}:`, error);
      }
    }
    
    // Solo reiniciar si nunca se conectó y lleva mucho tiempo
    if (state && !state.ready && !state.qr && !state.connectedAt) {
      const now = Date.now();
      const elapsed = now - (state.initializedAt || now);
      if (elapsed > 60000) { // Aumentado a 60 segundos
        console.log(`Forzando reinicio del cliente ${numero} después de ${elapsed}ms (nunca se conectó)`);
        try {
          await state.client.destroy();
        } catch (error) {
          console.error(`Error al destruir cliente ${numero}:`, error);
        }
        delete clients[numero];
        ensureClient(numero);
      }
    }
    
    // Responder siempre estado actual; el frontend puede hacer polling
    res.json({ qr: state.qr, ready: state.ready, state: state.state });
  } catch (error) {
    console.error('Error en getQr:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

exports.sendDocument = (req, res) => {
  try {
    const { token } = req;
    const { number, mediatype, media, filename, caption } = req.body;
    
    console.log(`Intentando enviar documento a ${number} desde token ${token?.substring(0, 8)}...`);
    
    if (!number || !mediatype || !media || !filename) {
      return res.status(400).json({ error: 'Faltan datos' });
    }
    
    db.query('SELECT numero FROM usuarios WHERE token = ?', [token], (err, results) => {
      if (err) {
        console.error('Error en consulta de base de datos:', err);
        return res.status(500).json({ error: 'Error de base de datos' });
      }
      
      if (results.length === 0) {
        console.log('Token inválido:', token?.substring(0, 8));
        return res.status(401).json({ error: 'Token inválido' });
      }
      
      const numeroUsuario = results[0].numero;
      console.log(`Usuario encontrado: ${numeroUsuario}`);
      
      if (!clients[numeroUsuario] || !clients[numeroUsuario].ready) {
        console.log(`Cliente ${numeroUsuario} no está listo. Estado:`, clients[numeroUsuario]?.state);
        return res.status(400).json({ error: 'Sesión de WhatsApp no lista' });
      }
      
      try {
        const messageMedia = new MessageMedia(
          mediatype === 'document' ? 'application/pdf' : mediatype,
          media,
          filename
        );
        
        console.log(`Enviando mensaje a ${number}@c.us`);
        clients[numeroUsuario].client.sendMessage(`${number}@c.us`, messageMedia, { caption })
          .then(() => {
            console.log(`Mensaje enviado exitosamente a ${number}`);
            res.json({ success: true });
          })
          .catch(err => {
            console.error(`Error al enviar mensaje a ${number}:`, err);
            res.status(500).json({ error: err.message });
          });
      } catch (err) {
        console.error('Error al crear MessageMedia:', err);
        res.status(500).json({ error: err.message });
      }
    });
  } catch (error) {
    console.error('Error en sendDocument:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

exports.getStatus = (req, res) => {
  try {
    const numero = req.query.numero;
    if (!numero) return res.status(400).json({ error: 'Falta el número' });
    
    const state = clients[numero];
    if (!state) {
      console.log(`Estado solicitado para número ${numero}: NONE`);
      return res.json({ ready: false, hasQr: false, state: 'NONE' });
    }
    
    console.log(`Estado de ${numero}: ready=${state.ready}, hasQr=${!!state.qr}, state=${state.state}`);
    res.json({ 
      ready: !!state.ready, 
      hasQr: !!state.qr, 
      state: state.state || 'UNKNOWN',
      connectedAt: state.connectedAt,
      disconnectedAt: state.disconnectedAt
    });
  } catch (error) {
    console.error('Error en getStatus:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Nuevo endpoint para obtener estado de todas las conexiones
exports.getAllConnections = (req, res) => {
  try {
    const connections = {};
    for (const [numero, clientData] of Object.entries(clients)) {
      connections[numero] = {
        ready: clientData.ready,
        state: clientData.state,
        hasQr: !!clientData.qr,
        connectedAt: clientData.connectedAt,
        disconnectedAt: clientData.disconnectedAt,
        lastSeen: Date.now()
      };
    }
    
    res.json({
      totalClients: Object.keys(clients).length,
      connectedClients: Object.values(clients).filter(c => c.ready).length,
      connections
    });
  } catch (error) {
    console.error('Error en getAllConnections:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};