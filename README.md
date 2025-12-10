# WhatsApp API - Sistema de Gestión Multi-Dispositivo

API de WhatsApp con panel de administración web para gestionar múltiples dispositivos y empresas desde una sola plataforma.

## 🚀 Características

- ✅ Gestión de múltiples dispositivos WhatsApp
- ✅ Panel de administración web en tiempo real (WebSockets)
- ✅ Envío de mensajes de texto, imágenes y documentos
- ✅ Autenticación con tokens
- ✅ Persistencia de sesiones (no requiere escanear QR cada vez)
- ✅ Actualizaciones en tiempo real del estado de dispositivos
- ✅ Base de datos MySQL para almacenamiento

## 📋 Requisitos Previos

- Node.js >= 18.0.0
- npm >= 9.0.0
- MySQL/MariaDB
- Google Chrome o Microsoft Edge (para Puppeteer)

## 🔧 Instalación

### 1. Clonar el repositorio

```bash
git clone <tu-repositorio>
cd WHATSAPP25
```

### 2. Instalar dependencias

```bash
npm install
```

Esto instalará automáticamente todas las dependencias necesarias:
- express
- socket.io
- whatsapp-web.js
- mysql2
- puppeteer
- qrcode
- dotenv
- axios
- multer

### 3. Configurar la base de datos

Crea un archivo `.env` en la raíz del proyecto:

```env
DB_HOST=127.0.0.1
DB_USER=root
DB_PASSWORD=
DB_NAME=whatsapp
DB_PORT=3306
```

### 4. Iniciar MySQL

Asegúrate de que tu servidor MySQL esté corriendo (por ejemplo, desde XAMPP).

### 5. Iniciar la aplicación

```bash
npm start
```

O para desarrollo:

```bash
npm run dev
```

La aplicación estará disponible en:
- Panel Web: `http://localhost:3000/login.html`
- API: `http://localhost:3000/api`

## 📱 Uso

### Primer Login

1. Accede a `http://localhost:3000/login.html`
2. Ingresa tu número de celular (con código de país, sin +)
3. Ingresa una contraseña
4. El sistema creará automáticamente tu cuenta

### Agregar Dispositivos

1. Ve a la sección "Dispositivos" en el dashboard
2. Haz clic en "Agregar Dispositivo"
3. Ingresa el nombre del dispositivo y el número de WhatsApp
4. Escanea el código QR que aparece
5. El dispositivo quedará vinculado permanentemente

### Enviar Mensajes

Usa la sección "Enviar Mensajes" del dashboard o la API REST:

```bash
POST /api/send-message
Headers: Authorization: Bearer <tu-token>
Body: {
  "number": "51988888888",
  "message": "Hola desde la API",
  "fromNumber": "51948907640"
}
```

## 🔌 API Endpoints

### Autenticación

- `POST /api/registro` - Registrar nuevo usuario
- `POST /api/login` - Iniciar sesión

### Dispositivos

- `GET /api/connections` - Listar todos los dispositivos
- `POST /api/add-device` - Agregar nuevo dispositivo
- `POST /api/disconnect` - Desconectar dispositivo
- `GET /api/qr?numero=<numero>` - Obtener código QR
- `GET /api/status?numero=<numero>` - Estado del dispositivo

### Mensajes

- `POST /api/send-message` - Enviar mensaje de texto
- `POST /api/send-whatsap` - Enviar documento PDF

## 🛠️ Scripts Disponibles

```bash
npm start          # Iniciar servidor
npm run dev        # Iniciar en modo desarrollo
npm run pm2:start  # Iniciar con PM2 (producción)
npm run pm2:stop   # Detener PM2
npm run pm2:restart # Reiniciar PM2
npm run pm2:logs   # Ver logs de PM2
```

## 📂 Estructura del Proyecto

```
WHATSAPP25/
├── controllers/          # Lógica de negocio
│   ├── userController.js
│   ├── whatsappController.js
│   └── deviceController.js
├── middlewares/          # Middleware de autenticación
│   └── auth.js
├── public/              # Archivos estáticos (HTML, CSS)
│   ├── login.html
│   └── dashboard.html
├── routes/              # Rutas de la API
│   ├── index.js
│   └── whatsappRoutes.js
├── .wwebjs_auth/        # Sesiones de WhatsApp (no subir a Git)
├── .wwebjs_cache/       # Cache de WhatsApp (no subir a Git)
├── db.js                # Configuración de base de datos
├── main.js              # Punto de entrada principal
├── package.json         # Dependencias del proyecto
└── README.md            # Este archivo
```

## 🔒 Seguridad

- Las sesiones de WhatsApp se almacenan localmente en `.wwebjs_auth/`
- Los tokens de autenticación se generan automáticamente
- Las contraseñas se almacenan en texto plano (⚠️ considera usar bcrypt en producción)
- Usa variables de entorno para credenciales sensibles

## 🐛 Solución de Problemas

### "Error: connect ECONNREFUSED 127.0.0.1:3306"
- Asegúrate de que MySQL esté corriendo
- Verifica las credenciales en `.env`

### "Las sesiones se cierran solas"
- El sistema usa una versión estable de WhatsApp Web
- Las sesiones se guardan automáticamente en `.wwebjs_auth/`
- No borres esta carpeta si quieres mantener las sesiones

### "No se genera el código QR"
- Verifica que Chrome/Edge esté instalado
- Revisa los logs del servidor para más detalles

## 📝 Notas

- Las sesiones de WhatsApp persisten entre reinicios del servidor
- Puedes tener múltiples dispositivos conectados simultáneamente
- El dashboard se actualiza en tiempo real usando WebSockets
- Cada dispositivo puede pertenecer a una empresa diferente

## 📄 Licencia

MIT

## 👨‍💻 Autor

Tu nombre aquí
