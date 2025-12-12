const express = require('express');
const app = express();
const http = require('http');
const { Server } = require('socket.io');
const db = require('./db');
const routes = require('./routes/index');
const whatsappController = require('./controllers/whatsappController');

// Crear servidor HTTP y Socket.IO
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Exportar io para usarlo en otros módulos
module.exports.io = io;

// Manejo global de errores no capturados
process.on('uncaughtException', (error) => {
  console.error('Error no capturado:', error);
  // No cerrar el proceso, solo logear
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Promesa rechazada no manejada:', reason);
  // No cerrar el proceso, solo logear
});

// Manejo de señales del sistema
process.on('SIGTERM', () => {
  console.log('Recibida señal SIGTERM, cerrando servidor...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('Recibida señal SIGINT, cerrando servidor...');
  process.exit(0);
});

app.use(express.json({ limit: '25mb' }));
app.use(express.static('public'));

// Middleware de logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Responder vacío al favicon para evitar 404 en navegadores
app.get('/favicon.ico', (req, res) => res.status(204).end());

// Crear tabla de usuarios si no existe
db.query(`CREATE TABLE IF NOT EXISTS usuarios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  numero VARCHAR(20) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  token VARCHAR(64) NOT NULL
)`, (err) => {
  if (err) console.error('Error creando tabla usuarios:', err);
});

// Crear tabla de dispositivos WhatsApp
db.query(`CREATE TABLE IF NOT EXISTS dispositivos_whatsapp (
  id INT AUTO_INCREMENT PRIMARY KEY,
  numero VARCHAR(20) UNIQUE NOT NULL,
  nombre VARCHAR(100) DEFAULT 'Dispositivo',
  estado ENUM('conectado', 'desconectado', 'conectando') DEFAULT 'desconectado',
  fecha_conexion TIMESTAMP NULL,
  fecha_desconexion TIMESTAMP NULL,
  ultima_actividad TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  instancia_id VARCHAR(255),
  qr_code TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
)`, (err) => {
  if (err) console.error('Error creando tabla dispositivos_whatsapp:', err);
});

// Inicializar WhatsApp para el usuario existente
async function initializeWhatsApp() {
  try {
    // Buscar dispositivos existentes en la base de datos
    db.query('SELECT numero FROM dispositivos_whatsapp', async (err, results) => {
      if (err) {
        console.error('Error al obtener dispositivos:', err);
        return;
      }

      if (results.length > 0) {
        console.log(`📱 Inicializando WhatsApp para ${results.length} dispositivo(s)...`);

        for (const device of results) {
          const numero = device.numero;
          console.log(`🔗 Conectando WhatsApp para: ${numero}`);

          try {
            await whatsappController.ensureClient(numero);
            console.log(`✅ WhatsApp inicializado para: ${numero}`);
          } catch (error) {
            console.error(`❌ Error al inicializar WhatsApp para ${numero}:`, error.message);
          }
        }
      } else {
        console.log('📱 No hay dispositivos registrados para inicializar WhatsApp');
      }
    });
  } catch (error) {
    console.error('Error en initializeWhatsApp:', error);
  }
}

// Endpoint de verificación rápida
app.get('/api/health', (req, res) => {
  let responded = false;
  const timer = setTimeout(() => {
    if (!responded) {
      responded = true;
      res.status(200).json({
        ok: true,
        db: false,
        timeout: true,
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        timestamp: new Date().toISOString()
      });
    }
  }, 2000);

  db.query('SELECT 1', [], (err) => {
    if (responded) return;
    clearTimeout(timer);
    responded = true;
    if (err) {
      console.error('Error de conexión a base de datos:', err);
      return res.status(200).json({
        ok: true,
        db: false,
        error: err.message,
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        timestamp: new Date().toISOString()
      });
    }
    res.json({
      ok: true,
      db: true,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      timestamp: new Date().toISOString()
    });
  });
});

// Endpoint de estado del sistema
app.get('/api/system-status', (req, res) => {
  const whatsappController = require('./controllers/whatsappController');
  const clientCount = Object.keys(whatsappController.clients || {}).length;

  res.json({
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    clients: clientCount,
    nodeVersion: process.version,
    platform: process.platform,
    timestamp: new Date().toISOString()
  });
});

// Aquí van tus rutas
// La ruta /api/registro se maneja dentro de routes/index.js


app.use('/api', routes);

// Middleware de manejo de errores global
app.use((error, req, res, next) => {
  console.error('Error no manejado en Express:', error);
  res.status(500).json({
    error: 'Error interno del servidor',
    message: error.message,
    timestamp: new Date().toISOString()
  });
});

// Middleware para rutas no encontradas
app.use((req, res) => {
  res.status(404).json({
    error: 'Ruta no encontrada',
    path: req.originalUrl,
    timestamp: new Date().toISOString()
  });
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('🔌 Cliente conectado via WebSocket:', socket.id);

  socket.on('disconnect', () => {
    console.log('🔌 Cliente desconectado:', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`API escuchando en puerto ${PORT}`);
  console.log('Sistema iniciado correctamente');
  console.log(`Accesible desde la red en: http://TU_IP_ESTATICA:${PORT}`);
  console.log('WebSocket disponible para actualizaciones en tiempo real');

  // Inicializar WhatsApp después de que el servidor esté listo
  setTimeout(() => {
    initializeWhatsApp();
  }, 2000); // Esperar 2 segundos para que todo esté listo
});

// Manejo de errores del servidor
server.on('error', (error) => {
  console.error('Error del servidor:', error);
});

// Cierre graceful del servidor
process.on('SIGTERM', () => {
  console.log('Cerrando servidor...');
  server.close(() => {
    console.log('Servidor cerrado');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('Cerrando servidor...');
  server.close(() => {
    console.log('Servidor cerrado');
    process.exit(0);
  });
});
