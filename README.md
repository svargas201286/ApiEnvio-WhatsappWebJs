# 📱 API de Envío de WhatsApp (Motor Baileys)

API REST robusta y ligera para enviar mensajes y archivos a través de WhatsApp utilizando **Baileys** (`@whiskeysockets/baileys`).

![Node.js](https://img.shields.io/badge/Node.js-18.x-green)
![Express](https://img.shields.io/badge/Express-5.x-blue)
![WhatsApp](https://img.shields.io/badge/WhatsApp-Baileys-25D366)
![MySQL](https://img.shields.io/badge/MySQL-8.x-orange)

---

## 🚀 Características

- ✅ **Envío de mensajes de texto** a números individuales.
- ✅ **Envío de archivos** (PDF, imágenes, documentos) mediante Buffers (más rápido).
- ✅ **Múltiples dispositivos WhatsApp** con gestión independiente.
- ✅ **Autenticación QR** en tiempo real vía WebSocket.
- ✅ **Ultra-ligera**: No requiere Chrome ni Puppeteer (ahorra hasta un 80% de RAM).
- ✅ **Gestión de sesiones** persistentes en la carpeta `sessions/`.
- ✅ **Monitoreo de estado** de dispositivos en tiempo real.
- ✅ **Compatible con PM2** para producción.
- ✅ **Base de Datos MySQL** para persistencia de usuarios y dispositivos.

---

## 📋 Requisitos Previos

- **Node.js** 18.x o superior.
- **MySQL** 8.x o superior.
- **npm** o **yarn**.
- **PM2** (recomendado para producción).
- **No requiere Chrome** (Baileys usa sockets nativos).

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
Crea un archivo `.env` en la raíz del proyecto. Puedes basarte en `.env.example`.

### 4. Crear la base de datos
```sql
CREATE DATABASE whatsapp_api;
```
Las tablas se crearán automáticamente al iniciar la aplicación.

### 5. Iniciar la aplicación

**Modo producción con PM2:**
```bash
pm2 start ecosystem.config.js
pm2 save
```

---

## 📚 Documentación de la API

### Endpoints Principales

1. **Health Check**: `GET /api/health`
2. **Enviar Mensaje**: `POST /api/send-message`
3. **Enviar Media**: `POST /api/send-media`
4. **Enviar Legacy (Facturación)**: `POST /api/send-whatsap-legacy`

Para una documentación exhaustiva, consulta:
- 📖 **[DOCUMENTACION-API.md](./DOCUMENTACION-API.md)**
- 📖 **[DOCUMENTACION-TECNICA.md](./DOCUMENTACION-TECNICA.md)**

---

## 🛠️ Tecnologías Utilizadas

- **[Node.js](https://nodejs.org/)** - Runtime de JavaScript.
- **[Baileys](https://github.com/WhiskeySockets/Baileys)** - Motor de WhatsApp nativo.
- **[Express](https://expressjs.com/)** - Framework web.
- **[MySQL2](https://github.com/sidorares/node-mysql2)** - Driver de MySQL.
- **[Socket.IO](https://socket.io/)** - WebSocket en tiempo real.

---

## 👨‍💻 Autor

**Samuel Vargas**
- GitHub: [@svargas201286](https://github.com/svargas201286)

---

**¡Gracias por usar nuestra API de WhatsApp con Baileys!** 🎉
