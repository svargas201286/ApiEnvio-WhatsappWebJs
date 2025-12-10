# 📱 API de Envío de WhatsApp

API REST robusta para enviar mensajes y archivos a través de WhatsApp Web usando Node.js, Express y whatsapp-web.js.

![Node.js](https://img.shields.io/badge/Node.js-18.x-green)
![Express](https://img.shields.io/badge/Express-4.x-blue)
![WhatsApp](https://img.shields.io/badge/WhatsApp-Web.js-25D366)
![MySQL](https://img.shields.io/badge/MySQL-8.x-orange)

---

## 🚀 Características

- ✅ **Envío de mensajes de texto** a números individuales
- ✅ **Envío de archivos** (PDF, imágenes, documentos)
- ✅ **Múltiples dispositivos WhatsApp** con gestión independiente
- ✅ **Autenticación QR** en tiempo real vía WebSocket
- ✅ **API RESTful** fácil de integrar
- ✅ **Gestión de sesiones** persistentes
- ✅ **Monitoreo de estado** de dispositivos
- ✅ **Logs detallados** para debugging
- ✅ **Compatible con PM2** para producción
- ✅ **Base de datos MySQL** para almacenamiento

---

## 📋 Requisitos Previos

- **Node.js** 18.x o superior
- **MySQL** 8.x o superior
- **npm** o **yarn**
- **PM2** (opcional, para producción)
- **Chromium/Chrome** (instalado automáticamente por Puppeteer)

---

## 🔧 Instalación

### 1. Clonar el repositorio

```bash
git clone https://github.com/svargas201286/ApiEnvio-WhatsappWebJs.git
cd ApiEnvio-WhatsappWebJs
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar variables de entorno

Crea un archivo `.env` en la raíz del proyecto:

```bash
cp .env.example .env
```

Edita el archivo `.env` con tus credenciales:

```env
# Base de Datos
DB_HOST=127.0.0.1
DB_USER=root
DB_PASSWORD=tu_password
DB_NAME=whatsapp_api
DB_PORT=3306

# Servidor
PORT=3000
NODE_ENV=development
```

### 4. Crear la base de datos

```sql
CREATE DATABASE whatsapp_api;
```

Las tablas se crearán automáticamente al iniciar la aplicación.

### 5. Iniciar la aplicación

**Modo desarrollo:**
```bash
node main.js
```

**Modo producción con PM2:**
```bash
pm2 start main.js --name whatsapp-api
pm2 save
```

---

## 📚 Documentación de la API

### Base URL

```
http://localhost:3000/api
```

### Endpoints Principales

#### 1. Health Check

Verifica el estado del servidor y la conexión a la base de datos.

```http
GET /api/health
```

**Respuesta:**
```json
{
  "ok": true,
  "db": true,
  "uptime": 123.45,
  "memory": {...},
  "timestamp": "2025-12-10T11:56:23.000Z"
}
```

---

#### 2. Registrar Dispositivo

Registra un nuevo número de WhatsApp en el sistema.

```http
POST /api/registro
```

**Body:**
```json
{
  "numero": "51957369615",
  "password": "mi_password_segura"
}
```

**Respuesta:**
```json
{
  "success": true,
  "message": "Usuario registrado exitosamente",
  "token": "abc123...",
  "numero": "51957369615"
}
```

---

#### 3. Obtener Código QR

Obtiene el código QR para autenticar WhatsApp Web.

```http
GET /api/qr/:numero
```

**Ejemplo:**
```
http://localhost:3000/api/qr/51957369615
```

Abre esta URL en el navegador y escanea el código QR con WhatsApp.

---

#### 4. Verificar Estado de Conexión

Verifica si un dispositivo está conectado a WhatsApp.

```http
GET /api/status/:numero
```

**Respuesta:**
```json
{
  "numero": "51957369615",
  "estado": "conectado",
  "nombre": "Mi Dispositivo",
  "ultima_actividad": "2025-12-10T11:56:23.000Z"
}
```

---

#### 5. Enviar Mensaje de Texto

Envía un mensaje de texto a un número de WhatsApp.

```http
POST /api/send
```

**Body:**
```json
{
  "fromNumber": "51957369615",
  "toNumber": "51999999999",
  "message": "¡Hola! Este es un mensaje de prueba."
}
```

**Respuesta:**
```json
{
  "success": true,
  "message": "Mensaje enviado exitosamente",
  "messageId": "3EB0...",
  "timestamp": "2025-12-10T11:56:23.000Z"
}
```

---

#### 6. Enviar Archivo

Envía un archivo (PDF, imagen, documento) a través de WhatsApp.

```http
POST /api/send-file
```

**Body:**
```json
{
  "fromNumber": "51957369615",
  "toNumber": "51999999999",
  "fileUrl": "https://ejemplo.com/archivo.pdf",
  "caption": "Aquí está el documento solicitado",
  "mediatype": "document"
}
```

**Tipos de archivo soportados:**
- `document` - PDF, DOCX, XLSX, etc.
- `image` - JPG, PNG, GIF
- `video` - MP4, AVI
- `audio` - MP3, OGG

**Respuesta:**
```json
{
  "success": true,
  "message": "Archivo enviado exitosamente",
  "messageId": "3EB0...",
  "timestamp": "2025-12-10T11:56:23.000Z"
}
```

---

#### 7. Listar Dispositivos

Obtiene la lista de todos los dispositivos registrados.

```http
GET /api/dispositivos
```

**Respuesta:**
```json
{
  "success": true,
  "dispositivos": [
    {
      "numero": "51957369615",
      "nombre": "Dispositivo Principal",
      "estado": "conectado",
      "fecha_conexion": "2025-12-10T10:00:00.000Z",
      "ultima_actividad": "2025-12-10T11:56:23.000Z"
    }
  ]
}
```

---

#### 8. Estado del Sistema

Obtiene información detallada del sistema.

```http
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
  "clients": 1,
  "nodeVersion": "v18.17.0",
  "platform": "linux",
  "timestamp": "2025-12-10T11:56:23.000Z"
}
```

---

## 🔌 WebSocket (Socket.IO)

La API incluye soporte para WebSocket para recibir actualizaciones en tiempo real.

### Conectarse al WebSocket

```javascript
const socket = io('http://localhost:3000');

// Escuchar código QR
socket.on('qr', (data) => {
  console.log('Código QR recibido:', data.qr);
  console.log('Para el número:', data.numero);
});

// Escuchar cuando se conecta WhatsApp
socket.on('ready', (data) => {
  console.log('WhatsApp conectado:', data.numero);
});

// Escuchar mensajes recibidos
socket.on('message', (data) => {
  console.log('Mensaje recibido:', data);
});
```

---

## 🐳 Despliegue con Docker (Próximamente)

```bash
docker-compose up -d
```

---

## 🖥️ Instalación en Servidor (aaPanel)

Para instrucciones detalladas de instalación en un servidor con aaPanel, consulta:

📖 **[GUIA-INSTALACION-SERVIDOR.md](./GUIA-INSTALACION-SERVIDOR.md)**

---

## 📖 Documentación Completa de la API

Para ver todos los endpoints disponibles con ejemplos detallados, consulta:

📖 **[DOCUMENTACION-API.md](./DOCUMENTACION-API.md)**

---

## 🔐 Seguridad

- ✅ Usa **tokens de autenticación** para proteger endpoints sensibles
- ✅ Configura **CORS** apropiadamente para tu dominio
- ✅ Usa **HTTPS** en producción
- ✅ Mantén las **credenciales** en variables de entorno
- ✅ Implementa **rate limiting** para prevenir abuso
- ✅ Valida y sanitiza todas las **entradas de usuario**

---

## 🛠️ Tecnologías Utilizadas

- **[Node.js](https://nodejs.org/)** - Runtime de JavaScript
- **[Express](https://expressjs.com/)** - Framework web
- **[whatsapp-web.js](https://wwebjs.dev/)** - Cliente de WhatsApp Web
- **[MySQL2](https://github.com/sidorares/node-mysql2)** - Driver de MySQL
- **[Socket.IO](https://socket.io/)** - WebSocket en tiempo real
- **[Puppeteer](https://pptr.dev/)** - Automatización de navegador
- **[PM2](https://pm2.keymetrics.io/)** - Gestor de procesos
- **[dotenv](https://github.com/motdotla/dotenv)** - Variables de entorno

---

## 📁 Estructura del Proyecto

```
ApiEnvio-WhatsappWebJs/
├── controllers/
│   └── whatsappController.js    # Lógica de WhatsApp
├── routes/
│   └── index.js                 # Definición de rutas
├── public/
│   └── index.html              # Interfaz web (opcional)
├── .wwebjs_auth/               # Sesiones de WhatsApp (auto-generado)
├── .wwebjs_cache/              # Cache de WhatsApp (auto-generado)
├── db.js                       # Configuración de base de datos
├── main.js                     # Punto de entrada principal
├── package.json                # Dependencias del proyecto
├── .env.example                # Ejemplo de variables de entorno
├── README.md                   # Este archivo
├── DOCUMENTACION-API.md        # Documentación completa de la API
└── GUIA-INSTALACION-SERVIDOR.md # Guía de instalación en servidor
```

---

## 🐛 Solución de Problemas

### Error: Puerto 3000 en uso

```bash
# Ver qué proceso usa el puerto
netstat -ano | findstr :3000

# En Linux/Mac
lsof -i :3000

# Cambiar el puerto en .env
PORT=3001
```

### Error de conexión a MySQL

```bash
# Verificar que MySQL esté corriendo
# Windows (XAMPP)
Inicia MySQL desde el panel de XAMPP

# Linux
sudo systemctl status mysql
sudo systemctl start mysql
```

### WhatsApp no se conecta

1. Elimina la carpeta `.wwebjs_auth/`
2. Reinicia la aplicación
3. Genera un nuevo código QR
4. Escanea con WhatsApp

### Problemas con Puppeteer

```bash
# Instalar dependencias de Chromium (Linux)
sudo apt-get install -y \
  gconf-service libasound2 libatk1.0-0 libcups2 \
  libdbus-1-3 libgconf-2-4 libgtk-3-0 libnspr4 \
  libnss3 libx11-xcb1 libxss1 libxtst6 fonts-liberation \
  libappindicator1 xdg-utils
```

---

## 📊 Monitoreo con PM2

```bash
# Ver estado de procesos
pm2 status

# Ver logs en tiempo real
pm2 logs whatsapp-api

# Monitorear recursos
pm2 monit

# Reiniciar aplicación
pm2 restart whatsapp-api

# Detener aplicación
pm2 stop whatsapp-api
```

---

## 🤝 Contribuciones

Las contribuciones son bienvenidas. Por favor:

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

---

## 📝 Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo `LICENSE` para más detalles.

---

## 👨‍💻 Autor

**Samuel Vargas**
- GitHub: [@svargas201286](https://github.com/svargas201286)
- Repositorio: [ApiEnvio-WhatsappWebJs](https://github.com/svargas201286/ApiEnvio-WhatsappWebJs)

---

## 🙏 Agradecimientos

- [whatsapp-web.js](https://github.com/pedroslopez/whatsapp-web.js) - Por la increíble librería
- [Puppeteer](https://github.com/puppeteer/puppeteer) - Por la automatización del navegador
- Comunidad de Node.js

---

## 📞 Soporte

Si tienes problemas o preguntas:

1. Revisa la [documentación completa](./DOCUMENTACION-API.md)
2. Consulta la [guía de instalación en servidor](./GUIA-INSTALACION-SERVIDOR.md)
3. Abre un [issue en GitHub](https://github.com/svargas201286/ApiEnvio-WhatsappWebJs/issues)

---

## 🔄 Changelog

### v1.0.0 (2025-12-10)
- ✨ Lanzamiento inicial
- ✅ Envío de mensajes de texto
- ✅ Envío de archivos
- ✅ Múltiples dispositivos
- ✅ WebSocket en tiempo real
- ✅ Gestión de sesiones
- ✅ Documentación completa

---

**¡Gracias por usar nuestra API de WhatsApp!** 🎉

Si te resulta útil, no olvides darle una ⭐ al repositorio.
