# 📘 Documentación Técnica - API WhatsApp

Esta documentación detalla la arquitectura, configuración, mantenimiento y solución de problemas del sistema de API de WhatsApp.

---

## 📋 Tabla de Contenidos

1. [Arquitectura del Sistema](#arquitectura-del-sistema)
2. [Conexiones Persistentes](#conexiones-persistentes)
3. [Procedimientos de Mantenimiento](#procedimientos-de-mantenimiento)
4. [Solución de Problemas](#solución-de-problemas)
5. [Monitoreo del Sistema](#monitoreo-del-sistema)
6. [Configuración de Producción](#configuración-de-producción)

---

## 🏗️ Arquitectura del Sistema

### Componentes Principales

1. **Node.js API (Backend)**
   - Ejecuta `@whiskeysockets/baileys` (Librería sockets nativa)
   - Gestiona sesiones de WhatsApp de forma ultra-ligera sin Chrome
   - **Puerto por defecto:** 3000 (configurable en `.env`)
   - **Gestor de Procesos:** PM2 (recomendado para producción)

2. **Base de Datos MySQL**
   - Almacena usuarios, dispositivos y sesiones
   - Tablas principales:
     - `usuarios` - Credenciales y tokens
     - `dispositivos_whatsapp` - Estado de dispositivos conectados

3. **Cloudflare Tunnel** (Opcional)
   - Conecta el servidor local con el mundo exterior
   - **Protocolo:** HTTP2 (recomendado)
   - **Ruta Pública:** Configurable según tu dominio
   - **Destino Local:** `http://localhost:3000`

4. **WebSocket (Socket.IO)**
   - Actualizaciones en tiempo real
   - Notificaciones de QR, conexión, mensajes

### Estructura de Directorios

```
WHATSAPP25/
├── controllers/          # Lógica de negocio
│   ├── whatsappController.js
│   ├── authController.js
│   └── legacyController.js
├── routes/              # Definición de rutas
│   └── index.js
├── middlewares/         # Autenticación y validación
│   └── auth.js
├── public/              # Interfaz web
│   ├── dashboard.html
│   └── login.html
├── sessions/             # Sesiones de WhatsApp Baileys (auto-generado)
├── logs/                # Logs del sistema
├── db.js                # Configuración de base de datos
├── main.js              # Punto de entrada principal
├── start.js             # Script con auto-reinicio
└── package.json         # Dependencias
```

---

## 🔄 Conexiones Persistentes

### Características Implementadas

- ✅ Las conexiones de WhatsApp se mantienen activas indefinidamente
- ✅ No se cierran automáticamente por inactividad
- ✅ Basado en sockets nativos (mucho más rápido y estable que web.js)
- ✅ Al reiniciar el servidor, se cargan las sesiones guardadas automáticamente

#### 2. **Reconexión Automática**
- ✅ Si se pierde la conexión, se intenta reconectar en 5 segundos
- ✅ Logs detallados de cada intento de reconexión
- ✅ Estados claros: CONNECTED, DISCONNECTED, RECONNECTING

#### 3. **Limpieza Inteligente**
- ❌ **NO se limpian** clientes conectados (`ready: true`)
- ✅ **SÍ se limpian** clientes que nunca se conectaron después de 1 hora
- ✅ **SÍ se limpian** clientes con errores de autenticación

### Flujo de Conexión

```
1. Usuario escanea QR → Cliente se conecta a WhatsApp
2. Conexión exitosa → Estado: CONNECTED, se marca connectedAt
3. Conexión se mantiene → No se cierra por inactividad
4. Si se pierde conexión → Estado: DISCONNECTED, reconexión en 5s
5. Reconexión exitosa → Vuelve a CONNECTED
```

### Logs de Conexión

**Conexión Exitosa:**
```
✅ Cliente 51948907640 conectado exitosamente a WhatsApp
```

**Desconexión:**
```
⚠️ Cliente 51948907640 desconectado: reason
🔄 Intentando reconectar cliente 51948907640...
```

**Persistencia:**
```
💾 Estado de sesiones guardado
📂 Estado de sesiones cargado: ["51948907640", "51957369615"]
```

---

## 🔧 Procedimientos de Mantenimiento

### 1. Actualización de Código (Despliegue)

**En tu PC (Local):**
```bash
git add .
git commit -m "Descripción del cambio"
git push origin master
```

**En el Servidor:**
```bash
cd /ruta/al/proyecto
git pull
pm2 restart whatsapp-api
```

### 2. Reinicio de Servicios

**Reiniciar App Node.js:**
```bash
pm2 restart whatsapp-api
```

**Reiniciar con PM2 (si no está configurado):**
```bash
pm2 start main.js --name whatsapp-api
pm2 save
```

**Reiniciar Túnel Cloudflare (si aplica):**
```bash
sudo systemctl restart cloudflared
```

### 3. Limpieza de Sesión (Hard Reset)

Si WhatsApp se queda "pegado" o corrupto:

```bash
cd /ruta/al/proyecto
pm2 stop whatsapp-api
rm -rf sessions/
pm2 start whatsapp-api
```

⚠️ **Nota:** Esto obligará a escanear el QR nuevamente.

### 4. Verificar Estado del Sistema

```bash
# Estado de PM2
pm2 status

# Logs en tiempo real
pm2 logs whatsapp-api

# Monitorear recursos
pm2 monit

# Ver últimas 50 líneas de logs
pm2 logs whatsapp-api --lines 50
```

---

## 🚨 Solución de Problemas

### Error: "EADDRINUSE: address already in use"

**Causa:** El puerto está ocupado por otro proceso.

**Solución:**
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Linux/Mac
sudo lsof -t -i:3000 | xargs kill -9

# Reiniciar
pm2 restart whatsapp-api
```

---

### Error: "Baileys connection closed"
   - ✅ No requiere dependencias de Chrome/Puppeteer.
   - ✅ Mucho más ligero en consumo de RAM (ideal para VPS pequeños).

---

### Error: "EACCES: permission denied"

**Causa:** Permisos insuficientes en archivos/carpetas.

**Solución:**
```bash
# Linux/Mac
sudo chown -R $USER:$USER /ruta/al/proyecto
sudo chmod -R 755 /ruta/al/proyecto

# Windows (ejecutar PowerShell como administrador)
icacls "d:\xampp8.1\htdocs\WHATSAPP25" /grant Users:F /T
```

---

### Error: "Sesión de WhatsApp no lista"

**Causa:** El dispositivo no está conectado o el QR no ha sido escaneado.

**Solución:**
1. Verificar estado: `GET /api/status?numero=51948907640`
2. Si `state` es `"QR"`, escanear el código QR
3. Si `state` es `"NONE"`, agregar dispositivo con `/api/add-device`
4. Si persiste, hacer limpieza de sesión (ver arriba)

---

### QR se queda en "Iniciando..." infinito

**Causa:** Puppeteer está tardando en arrancar o problemas de red.

**Solución:**
```bash
# Verificar logs
pm2 logs whatsapp-api --lines 50

# Si no hay errores, esperar un poco más
# Si persiste, hacer limpieza de sesión
pm2 stop whatsapp-api
rm -rf .wwebjs_auth .wwebjs_cache
pm2 start whatsapp-api
```

---

### Sistema se cierra automáticamente

**Causa:** Errores no capturados o problemas de memoria.

**Solución:**

1. **Usar script de auto-reinicio:**
```bash
node start.js
```

2. **Usar PM2 con auto-reinicio:**
```bash
pm2 start main.js --name whatsapp-api --max-memory-restart 200M
pm2 save
```

3. **Verificar logs:**
```bash
pm2 logs whatsapp-api --err
```

---

### Base de datos no conecta

**Causa:** MySQL no está corriendo o credenciales incorrectas.

**Solución:**
```bash
# Verificar MySQL (Linux)
sudo systemctl status mysql
sudo systemctl start mysql

# Verificar MySQL (Windows/XAMPP)
# Iniciar MySQL desde el panel de XAMPP

# Verificar credenciales en .env
cat .env
```

---

## 📊 Monitoreo del Sistema

### Endpoints de Monitoreo

#### 1. Health Check
```bash
GET /api/health
```

**Respuesta:**
```json
{
  "ok": true,
  "db": true,
  "uptime": 3600,
  "memory": {...},
  "timestamp": "2025-12-13T16:25:51.000Z"
}
```

#### 2. Estado del Sistema
```bash
GET /api/system-status
```

**Respuesta:**
```json
{
  "uptime": 3600,
  "memory": {
    "rss": 123456789,
    "heapTotal": 98765432,
    "heapUsed": 87654321
  },
  "clients": 2,
  "nodeVersion": "v18.17.0",
  "platform": "linux",
  "timestamp": "2025-12-13T16:25:51.000Z"
}
```

#### 3. Estado de Conexión Específica
```bash
GET /api/status?numero=51948907640
```

**Respuesta:**
```json
{
  "ready": true,
  "hasQr": false,
  "state": "CONNECTED",
  "numero": "51948907640",
  "connectedAt": 1702468800000,
  "disconnectedAt": null
}
```

#### 4. Todas las Conexiones
```bash
GET /api/connections
```

**Respuesta:**
```json
{
  "totalClients": 3,
  "connectedClients": 2,
  "connections": {
    "51948907640": {
      "ready": true,
      "state": "CONNECTED",
      "hasQr": false,
      "connectedAt": 1702468800000,
      "lastSeen": 1702468900000
    }
  }
}
```

### Monitoreo Continuo

```bash
# Verificar estado cada 30 segundos
watch -n 30 'curl -s http://localhost:3000/api/health | jq'

# Ver todas las conexiones
curl http://localhost:3000/api/connections | jq

# Ver estado de una conexión específica
curl "http://localhost:3000/api/status?numero=51948907640" | jq
```

---

## ⚙️ Configuración de Producción

### Variables de Entorno (.env)

```env
# Base de Datos
DB_HOST=127.0.0.1
DB_USER=whatsapp_user
DB_PASSWORD=tu_password_segura
DB_NAME=whatsapp_api
DB_PORT=3306

# Servidor
PORT=3000
NODE_ENV=production

# IP del Servidor (para referencia)
SERVER_LOCAL_IP=192.168.1.100
SERVER_PUBLIC_IP=203.0.113.1
```

### Configuración de PM2

**ecosystem.config.js:**
```javascript
module.exports = {
  apps: [{
    name: 'whatsapp-api',
    script: './main.js',
    instances: 1,
    exec_mode: 'fork',
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
  }]
};
```

**Iniciar con PM2:**
```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### Configuración de Cloudflare Tunnel

**Crear túnel:**
```bash
cloudflared tunnel create whatsapp-api
```

**Configurar túnel (config.yml):**
```yaml
tunnel: <TUNNEL_ID>
credentials-file: /root/.cloudflared/<TUNNEL_ID>.json

ingress:
  - hostname: apienviocomprobante.tudominio.com
    service: http://localhost:3000
  - service: http_status:404
```

**Iniciar túnel:**
```bash
cloudflared tunnel run whatsapp-api
```

**Auto-inicio (systemd):**
```bash
sudo cloudflared service install
sudo systemctl enable cloudflared
sudo systemctl start cloudflared
```

---

## 🔒 Seguridad en Producción

### Recomendaciones

1. ✅ **Usar HTTPS** en producción (Cloudflare Tunnel lo hace automáticamente)
2. ✅ **Configurar CORS** apropiadamente
3. ✅ **Usar contraseñas fuertes** para la base de datos
4. ✅ **Mantener tokens seguros** (nunca en el código)
5. ✅ **Implementar rate limiting** para prevenir abuso
6. ✅ **Actualizar dependencias** regularmente
7. ✅ **Hacer backups** de `.wwebjs_auth/` periódicamente

### Firewall (Linux)

```bash
# Permitir solo puerto SSH y cerrar otros
sudo ufw allow 22/tcp
sudo ufw enable

# El puerto 3000 NO debe estar abierto si usas Cloudflare Tunnel
# Solo debe ser accesible localmente
```

---

## 📝 Logs Importantes

### Logs de Inicio
```
API escuchando en puerto 3000
Sistema iniciado correctamente
📱 Inicializando WhatsApp para 2 dispositivo(s)...
✅ WhatsApp inicializado para: 51948907640
```

### Logs de Conexión
```
🔗 Conectando WhatsApp para: 51948907640
✅ Cliente 51948907640 conectado exitosamente a WhatsApp
```

### Logs de Envío
```
📥 Recibiendo solicitud de envío de documento
📱 Usando dispositivo: 51948907640
📤 Enviando document desde 51948907640 a 51999999999
✅ Documento enviado exitosamente
```

### Logs de Error
```
❌ Error al enviar mensaje: [error details]
⚠️ Cliente desconectado: reason
🔄 Intentando reconectar cliente...
```

---

## 🎯 Comandos Útiles de Referencia

### Desarrollo
```bash
# Iniciar en modo desarrollo
node main.js

# Iniciar con auto-reinicio
node start.js

# Iniciar con PM2
pm2 start main.js --name whatsapp-api
```

### Producción
```bash
# Iniciar con PM2 (producción)
pm2 start ecosystem.config.js

# Ver estado
pm2 status

# Ver logs
pm2 logs whatsapp-api

# Reiniciar
pm2 restart whatsapp-api

# Detener
pm2 stop whatsapp-api

# Eliminar
pm2 delete whatsapp-api
```

### Mantenimiento
```bash
# Actualizar código
git pull
pm2 restart whatsapp-api

# Limpiar sesiones
rm -rf .wwebjs_auth .wwebjs_cache whatsapp-sessions.json

# Ver uso de memoria
pm2 monit

# Backup de sesiones
tar -czf backup-sessions-$(date +%Y%m%d).tar.gz .wwebjs_auth/
```

---

## 📞 Soporte y Recursos

- 📖 **Documentación de la API:** [DOCUMENTACION-API.md](./DOCUMENTACION-API.md)
- 🔌 **Guía de Integración:** [GUIA-INTEGRACION-SISTEMAS-EXTERNOS.md](./GUIA-INTEGRACION-SISTEMAS-EXTERNOS.md)
- 🚀 **Instalación en Servidor:** [GUIA-INSTALACION-SERVIDOR.md](./GUIA-INSTALACION-SERVIDOR.md)
- ☁️ **Cloudflare Tunnel:** [GUIA-CLOUDFLARE-TUNNEL.md](./GUIA-CLOUDFLARE-TUNNEL.md)
- 🐧 **Auto-inicio Ubuntu:** [GUIA-AUTOINICIO-UBUNTU.md](./GUIA-AUTOINICIO-UBUNTU.md)

---

**Última actualización:** 2025-12-13
