const { MessageMedia, Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const fs = require('fs');
const db = require('../db');
const deviceController = require('./deviceController');

let clients = {};

// Exportar clients para monitoreo
module.exports.clients = clients;

// Exportar ensureClient para uso externo
module.exports.ensureClient = ensureClient;

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
    try { if (fs.existsSync(p)) return p; } catch (_) { }
  }
  return undefined;
}

async function ensureClient(numero) {
  if (!clients[numero]) {
    console.log(`🔧 Creando cliente para número: ${numero}`);

    // Crear dispositivo en la base de datos
    try {
      await deviceController.createOrUpdateDevice(numero, {
        nombre: 'Dispositivo',
        estado: 'conectando',
        instancia_id: btoa(numero)
      });
    } catch (error) {
      console.error('Error al crear dispositivo en BD:', error);
    }

    const executablePath = getChromePath();
    const client = new Client({
      authStrategy: new LocalAuth({
        clientId: numero,
        dataPath: './.wwebjs_auth'
      }),
      restartOnAuthFail: true,
      takeoverOnConflict: true,
      takeoverTimeoutMs: 0,
      webVersionCache: {
        type: 'remote',
        remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html',
      },
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
        timeout: 0, // Disable timeout
        protocolTimeout: 0 // Disable protocol timeout
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

        // Actualizar QR en la base de datos
        await deviceController.updateQRCode(numero, clients[numero].qr);
      } catch (_) {
        clients[numero].qr = null;
      }
    });

    client.on('ready', async () => {
      // Evitar múltiples eventos ready consecutivos (debouncing)
      if (clients[numero].readyDebounce) {
        clearTimeout(clients[numero].readyDebounce);
      }

      clients[numero].readyDebounce = setTimeout(async () => {
        console.log(`✅ Cliente ${numero} conectado exitosamente a WhatsApp`);
        clients[numero].ready = true;
        clients[numero].state = 'CONNECTED';
        clients[numero].qr = null;
        clients[numero].connectedAt = Date.now();
        clients[numero].readyCount = (clients[numero].readyCount || 0) + 1;

        // Actualizar estado en la base de datos
        try {
          await deviceController.updateDeviceStatus(numero, 'conectado');
        } catch (error) {
          console.error('Error al actualizar estado en BD:', error);
        }

        // Emitir evento de Socket.IO para actualización en tiempo real
        try {
          const mainModule = require('../main');
          if (mainModule.io) {
            mainModule.io.emit('deviceStatusChanged', {
              numero,
              status: 'conectado',
              ready: true,
              timestamp: new Date().toISOString()
            });
          }
        } catch (error) {
          console.error('Error al emitir evento Socket.IO:', error);
        }
      }, 1000); // Esperar 1 segundo antes de procesar el evento ready
    });

    client.on('disconnected', async (reason) => {
      console.log(`⚠️ Cliente ${numero} desconectado: `, reason);

      // Update local state
      const wasReady = clients[numero].ready;
      clients[numero].ready = false;
      clients[numero].state = 'DISCONNECTED';
      clients[numero].qr = null;
      clients[numero].disconnectedAt = Date.now();

      // Update database status
      try {
        await deviceController.updateDeviceStatus(numero, 'desconectado');
      } catch (error) {
        console.error('Error al actualizar estado en BD:', error);
      }

      // Emitir evento de Socket.IO
      try {
        const mainModule = require('../main');
        if (mainModule.io) {
          mainModule.io.emit('deviceStatusChanged', {
            numero,
            status: 'desconectado',
            ready: false,
            reason,
            timestamp: new Date().toISOString()
          });
        }
      } catch (error) {
        console.error('Error al emitir evento Socket.IO:', error);
      }

      // Check if disconnection was intentional (Logout) or if we should reconnect
      const intentionalDisconnects = ['LOGOUT', 'USER_LOGOUT', 'CLIENT_LOGOUT'];

      // Calcular tiempo desde la última conexión
      const timeSinceConnection = clients[numero].connectedAt
        ? Date.now() - clients[numero].connectedAt
        : 0;

      // Si el LOGOUT ocurre menos de 30 segundos después de conectarse, probablemente es un falso LOGOUT
      const isFalseLogout = reason === 'LOGOUT' && timeSinceConnection < 30000;

      const isIntentional = !isFalseLogout && (
        intentionalDisconnects.includes(reason) ||
        (typeof reason === 'string' && reason.includes('LOGOUT'))
      );

      if (isIntentional) {
        console.log(`🔌 Desconexión intencional o cierre de sesión para ${numero}. No se intentará reconectar.`);
        // Solo destruir el cliente si fue una desconexión intencional
        try {
          if (clients[numero].client) {
            await clients[numero].client.destroy();
          }
        } catch (e) {
          console.error('Error destroying client:', e);
        }

      } else {
        // Attempt to reconnect automatically for network errors or temporary issues
        const reconnectReason = isFalseLogout ? 'Falso LOGOUT detectado' : reason;
        console.log(`🔄 Desconexión no intencional(${reconnectReason}).Intentando reconectar en 5s...`);

        // NO destruir el cliente, solo reinicializar
        setTimeout(() => {
          if (clients[numero] && !clients[numero].ready) {
            console.log(`🔄 Intentando reconectar cliente ${numero}...`);
            try {
              clients[numero].state = 'RECONNECTING';
              // Reinicializar sin destruir primero
              clients[numero].client.initialize().catch((error) => {
                console.error(`Error al reconectar cliente ${numero}: `, error);
              });
            } catch (error) {
              console.error(`Error en reconexión de cliente ${numero}: `, error);
            }
          }
        }, 5000);
      }
    });

    client.on('auth_failure', async (msg) => {
      console.log(`Error de autenticación para ${numero}: `, msg);
      clients[numero].ready = false;
      clients[numero].state = 'AUTH_FAILURE';
      clients[numero].qr = null;

      try {
        await deviceController.updateDeviceStatus(numero, 'desconectado');
        // If auth fails, we should probably destroy the client so it can be re-initialized properly with a new QR later
        if (clients[numero].client) {
          await clients[numero].client.destroy();
        }
      } catch (error) {
        console.error('Error al actualizar estado tras fallo de auth:', error);
      }
    });

    client.on('loading_screen', (percent, message) => {
      clients[numero].state = `LOADING_${percent}`;
    });

    client.on('change_state', (state) => {
      console.log(`Cliente ${numero} cambió estado a: `, state);
      clients[numero].state = String(state || 'UNKNOWN');
    });

    // Agregar manejo de errores durante la inicialización
    client.initialize().catch((error) => {
      console.error(`Error al inicializar cliente ${numero}: `, error);
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
          console.error(`Error al reinicializar cliente ${numero}: `, error);
        });
        state.initializedAt = Date.now();
      } catch (error) {
        console.error(`Error en reinicialización de cliente ${numero}: `, error);
      }
    }

    // Solo reiniciar si nunca se conectó y lleva mucho tiempo
    if (state && !state.ready && !state.qr && !state.connectedAt) {
      const now = Date.now();
      const elapsed = now - (state.initializedAt || now);
      if (elapsed > 60000) { // Aumentado a 60 segundos
        console.log(`Forzando reinicio del cliente ${numero} después de ${elapsed}ms(nunca se conectó)`);
        try {
          await state.client.destroy();
        } catch (error) {
          console.error(`Error al destruir cliente ${numero}: `, error);
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
        console.log(`Cliente ${numeroUsuario} no está listo.Estado: `, clients[numeroUsuario]?.state);
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
            console.error(`Error al enviar mensaje a ${number}: `, err);
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

    console.log(`Estado de ${numero}: ready = ${state.ready}, hasQr = ${!!state.qr}, state = ${state.state}`);
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
exports.getAllConnections = async (req, res) => {
  try {
    // Obtener dispositivos de la base de datos
    const devices = await deviceController.getAllDevices();

    const connections = {};
    devices.forEach(device => {
      const clientData = clients[device.numero] || {};
      connections[device.numero] = {
        number: device.numero,
        name: device.nombre,
        ready: device.estado === 'conectado',
        state: device.estado,
        hasQr: !!device.qr_code,
        connectedAt: device.fecha_conexion,
        disconnectedAt: device.fecha_desconexion,
        lastSeen: device.ultima_actividad,
        instancia_id: device.instancia_id,
        createdAt: device.created_at
      };
    });

    res.json({
      totalClients: devices.length,
      connectedClients: devices.filter(d => d.estado === 'conectado').length,
      connections
    });
  } catch (error) {
    console.error('Error en getAllConnections:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Agregar nuevo dispositivo
exports.addDevice = async (req, res) => {
  try {
    const { numero, nombre, password } = req.body;

    if (!numero || !password) {
      return res.status(400).json({ error: 'Número y contraseña son requeridos' });
    }

    // Crear dispositivo en la base de datos
    await deviceController.createOrUpdateDevice(numero, {
      nombre: nombre || 'Dispositivo',
      estado: 'conectando',
      instancia_id: btoa(numero)
    });

    // Inicializar cliente de WhatsApp
    await ensureClient(numero);

    res.json({
      success: true,
      message: `Dispositivo ${numero} agregado correctamente`,
      numero: numero,
      nombre: nombre || 'Dispositivo'
    });
  } catch (error) {
    console.error('Error en addDevice:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Enviar mensaje de texto
exports.sendMessage = (req, res) => {
  try {
    const { token } = req;
    const { number, message, fromNumber } = req.body;

    console.log(`Intentando enviar mensaje a ${number} desde token ${token?.substring(0, 8)}...`);

    if (!number || !message) {
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

      // Usar el número especificado o el del usuario por defecto
      const numeroOrigen = fromNumber || results[0].numero;
      console.log(`Enviando desde: ${numeroOrigen}`);

      if (!clients[numeroOrigen] || !clients[numeroOrigen].ready) {
        console.log(`Cliente ${numeroOrigen} no está listo.Estado: `, clients[numeroOrigen]?.state);
        return res.status(400).json({ error: `Sesión de WhatsApp ${numeroOrigen} no lista` });
      }

      console.log(`Enviando mensaje a ${number}@c.us desde ${numeroOrigen}`);
      clients[numeroOrigen].client.sendMessage(`${number}@c.us`, message)
        .then(() => {
          console.log(`Mensaje enviado exitosamente a ${number} desde ${numeroOrigen}`);
          res.json({ success: true, from: numeroOrigen });
        })
        .catch(err => {
          console.error(`Error al enviar mensaje a ${number}: `, err);
          res.status(500).json({ error: err.message });
        });
    });
  } catch (error) {
    console.error('Error en sendMessage:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Desconectar dispositivo
exports.disconnectDevice = async (req, res) => {
  try {
    const { numero } = req.query;

    if (!numero) {
      return res.status(400).json({ error: 'Número de dispositivo requerido' });
    }

    const client = clients[numero];
    if (!client) {
      return res.status(404).json({ error: 'Dispositivo no encontrado' });
    }

    if (client.ready) {
      // Desconectar el cliente de WhatsApp
      await client.destroy();
      delete clients[numero];

      // Actualizar estado en la base de datos
      await deviceController.updateDeviceStatus(numero, 'desconectado');

      console.log(`Dispositivo ${numero} desconectado correctamente`);
      res.json({
        success: true,
        message: `Dispositivo ${numero} desconectado correctamente`
      });
    } else {
      res.status(400).json({ error: 'El dispositivo no está conectado' });
    }
  } catch (error) {
    console.error('Error en disconnectDevice:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};