# 📚 Documentación API WhatsApp Multi-Dispositivo

## 📋 Tabla de Contenidos

1. [Introducción](#introducción)
2. [Requisitos Previos](#requisitos-previos)
3. [Instalación](#instalación)
4. [Configuración](#configuración)
5. [Autenticación](#autenticación)
6. [Endpoints de la API](#endpoints-de-la-api)
7. [Ejemplos de Uso](#ejemplos-de-uso)
8. [Códigos de Error](#códigos-de-error)
9. [Mejores Prácticas](#mejores-prácticas)
10. [Solución de Problemas](#solución-de-problemas)

---

## 🎯 Introducción

Esta API permite enviar mensajes y documentos por WhatsApp utilizando múltiples dispositivos. Está construida con Node.js y utiliza `@whiskeysockets/baileys` para la integración nativa con WhatsApp vía Sockets.

### Características Principales

- ✅ Soporte para múltiples dispositivos WhatsApp por usuario
- ✅ Envío de mensajes de texto
- ✅ Envío de documentos (PDF, XML, etc.)
- ✅ Sesiones persistentes (no requiere escanear QR en cada reinicio)
- ✅ Dashboard web para gestión de dispositivos
- ✅ Actualizaciones en tiempo real vía WebSockets
- ✅ Autenticación con tokens Bearer

### URL Base

```
http://localhost:3000/api
```

Para producción, reemplaza `localhost` con tu dominio o IP pública.

---

## 📦 Requisitos Previos

### Software Necesario

- **Node.js**: v18.0.0 o superior
- **npm**: v9.0.0 o superior
- **MySQL**: v5.7 o superior
- **No requiere Chrome/Puppeteer** (Baileys usa sockets nativos)

### Conocimientos Recomendados

- Conceptos básicos de APIs REST
- Manejo de JSON
- Autenticación con tokens Bearer
- Codificación Base64

---

## 🚀 Instalación

### 1. Clonar o Descargar el Proyecto

```bash
git clone <url-del-repositorio>
cd WHATSAPP25
```

### 2. Instalar Dependencias

```bash
npm install
```

### 3. Configurar Variables de Entorno

Crea un archivo `.env` en la raíz del proyecto:

```env
# Configuración de Base de Datos
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=whatsapp_api
DB_PORT=3306

# Configuración del Servidor
PORT=3000

# No se requiere configuración de Chrome con Baileys
```

### 4. Crear Base de Datos

```sql
CREATE DATABASE whatsapp_api CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Las tablas se crearán automáticamente al iniciar el servidor.

### 5. Iniciar el Servidor

```bash
npm start
```

O para desarrollo con auto-reinicio:

```bash
npm run dev
```

### 6. Verificar Instalación

Abre tu navegador en:

```
http://localhost:3000/health
```

Deberías ver:

```json
{
  "status": "ok",
  "timestamp": "2025-12-10T06:00:00.000Z"
}
```

---

## ⚙️ Configuración

### Acceder al Dashboard

```
http://localhost:3000/dashboard.html
```

### Registro de Usuario

1. Abre `http://localhost:3000/login.html`
2. Ingresa tu número de teléfono (formato: `51948907640`)
3. Ingresa una contraseña
4. Haz clic en "Registrar/Iniciar Sesión"
5. Guarda el **token** que se muestra (lo necesitarás para las peticiones API)

### Conectar un Dispositivo WhatsApp

1. En el dashboard, haz clic en "Agregar Dispositivo"
2. Ingresa el número del dispositivo (formato: `51948907640`)
3. Escanea el código QR con WhatsApp en tu celular:
   - Abre WhatsApp en tu celular
   - Ve a **Configuración** > **Dispositivos vinculados**
   - Toca **Vincular un dispositivo**
   - Escanea el código QR mostrado en el dashboard

4. Espera a que el estado cambie a "SESIÓN ABIERTA"

---

## 🔐 Autenticación

Todas las peticiones a la API (excepto `/health` y `/system-status`) requieren autenticación mediante token Bearer.

### Obtener un Token

**Endpoint:** `POST /api/login`

**Body (JSON):**
```json
{
  "numero": "51948907640",
  "password": "tu_contraseña"
}
```

**Respuesta Exitosa:**
```json
{
  "token": "6a3107bf5356821d38f2d4dd1771203fc501e035b75cc26442ca453a7f8e9814",
  "numero": "51948907640"
}
```

### Usar el Token

Incluye el token en el header `Authorization` de todas tus peticiones:

```
Authorization: Bearer 6a3107bf5356821d38f2d4dd1771203fc501e035b75cc26442ca453a7f8e9814
```

---

## 📡 Endpoints de la API

### 1. Registro/Login

#### `POST /api/registro`

Registra un nuevo usuario o actualiza uno existente.

**Body:**
```json
{
  "numero": "51948907640",
  "password": "mi_contraseña_segura"
}
```

**Respuesta:**
```json
{
  "token": "6a3107bf5356821d38f2d4dd1771203fc501e035b75cc26442ca453a7f8e9814",
  "numero": "51948907640"
}
```

---

#### `POST /api/login`

Inicia sesión con un usuario existente.

**Body:**
```json
{
  "numero": "51948907640",
  "password": "mi_contraseña_segura"
}
```

**Respuesta:**
```json
{
  "token": "6a3107bf5356821d38f2d4dd1771203fc501e035b75cc26442ca453a7f8e9814",
  "numero": "51948907640"
}
```

---

### 2. Gestión de Dispositivos

#### `POST /api/add-device`

Agrega un nuevo dispositivo WhatsApp.

**Headers:**
```
Authorization: Bearer <tu_token>
Content-Type: application/json
```

**Body:**
```json
{
  "numero": "51948907640",
  "nombre": "Dispositivo Principal"
}
```

**Respuesta:**
```json
{
  "message": "Dispositivo agregado correctamente",
  "numero": "51948907640"
}
```

---

#### `GET /api/connections`

Obtiene la lista de todos los dispositivos del usuario.

**Headers:**
```
Authorization: Bearer <tu_token>
```

**Respuesta:**
```json
[
  {
    "id": 1,
    "numero": "51948907640",
    "nombre": "Dispositivo Principal",
    "estado": "conectado",
    "instancia_id": "NTE5NDg5MDc2NDA=",
    "fecha_conexion": "2025-12-10T06:00:00.000Z",
    "ready": true,
    "hasQr": false,
    "state": "CONNECTED"
  },
  {
    "id": 2,
    "numero": "51957369615",
    "nombre": "Dispositivo Secundario",
    "estado": "desconectado",
    "instancia_id": "NTE5NTczNjk2MTU=",
    "fecha_desconexion": "2025-12-10T05:00:00.000Z",
    "ready": false,
    "hasQr": true,
    "state": "QR"
  }
]
```

---

#### `GET /api/qr?numero=<numero_dispositivo>`

Obtiene el código QR para conectar un dispositivo.

**Headers:**
```
Authorization: Bearer <tu_token>
```

**Parámetros de Query:**
- `numero`: Número del dispositivo (ej: `51948907640`)

**Respuesta:**
```json
{
  "qr": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
  "numero": "51948907640"
}
```

---

#### `GET /api/status?numero=<numero_dispositivo>`

Obtiene el estado de un dispositivo específico.

**Headers:**
```
Authorization: Bearer <tu_token>
```

**Parámetros de Query:**
- `numero`: Número del dispositivo

**Respuesta:**
```json
{
  "ready": true,
  "hasQr": false,
  "state": "CONNECTED",
  "numero": "51948907640"
}
```

**Estados Posibles:**
- `NONE`: No inicializado
- `INIT`: Inicializando
- `QR`: Esperando escaneo de QR
- `LOADING_*`: Cargando (con porcentaje)
- `CONNECTED`: Conectado y listo
- `ERROR`: Error en la conexión

---

#### `POST /api/disconnect`

Desconecta un dispositivo WhatsApp.

**Headers:**
```
Authorization: Bearer <tu_token>
Content-Type: application/json
```

**Body:**
```json
{
  "numero": "51948907640"
}
```

**Respuesta:**
```json
{
  "message": "Dispositivo 51948907640 desconectado correctamente"
}
```

---

### 3. Envío de Mensajes

#### `POST /api/send-message`

Envía un mensaje de texto simple.

**Headers:**
```
Authorization: Bearer <tu_token>
Content-Type: application/json
```

**Body:**
```json
{
  "number": "51999999999",
  "message": "Hola, este es un mensaje de prueba",
  "fromNumber": "NTE5NDg5MDc2NDA="
}
```

**Parámetros:**
- `number` (string, requerido): Número de destino en formato internacional sin `+` (ej: `51999999999`)
- `message` (string, requerido): Texto del mensaje
- `fromNumber` (string, opcional): Instancia del dispositivo en base64. Si no se proporciona, usa el dispositivo del usuario autenticado

**Respuesta Exitosa:**
```json
{
  "success": true,
  "from": "51948907640",
  "to": "51999999999"
}
```

---

#### `POST /api/send-whatsap`

Envía un documento (PDF, XML, imagen, etc.) por WhatsApp.

**Headers:**
```
Authorization: Bearer <tu_token>
Content-Type: application/json
```

**Body:**
```json
{
  "number": "51999999999",
  "mediatype": "document",
  "media": "JVBERi0xLjQKJeLjz9MKMyAwIG9iago8PC9UeXBlL...",
  "filename": "factura.pdf",
  "caption": "Adjunto tu factura electrónica",
  "fromNumber": "NTE5NDg5MDc2NDA="
}
```

**Parámetros:**
- `number` (string, requerido): Número de destino sin `+`
- `mediatype` (string, requerido): Tipo de archivo
  - `"document"`: Para PDF, XML, DOCX, etc.
  - `"image"`: Para imágenes
  - `"video"`: Para videos
  - `"audio"`: Para audios
- `media` (string, requerido): Contenido del archivo en **Base64**
- `filename` (string, requerido): Nombre del archivo con extensión
- `caption` (string, opcional): Mensaje que acompaña al archivo
- `fromNumber` (string, opcional): Instancia del dispositivo en base64

**Respuesta Exitosa:**
```json
{
  "success": true,
  "succes": true,
  "from": "51948907640",
  "to": "51999999999",
  "filename": "factura.pdf"
}
```

**Nota:** La API devuelve tanto `success` como `succes` (con typo) para compatibilidad con sistemas legacy.

---

### 4. Endpoints de Sistema

#### `GET /health`

Verifica que el servidor está funcionando.

**Sin autenticación requerida**

**Respuesta:**
```json
{
  "status": "ok",
  "timestamp": "2025-12-10T06:00:00.000Z"
}
```

---

#### `GET /system-status`

Obtiene información detallada del sistema.

**Sin autenticación requerida**

**Respuesta:**
```json
{
  "status": "ok",
  "uptime": 3600,
  "memory": {
    "used": 150,
    "total": 8192
  },
  "connections": 2,
  "timestamp": "2025-12-10T06:00:00.000Z"
}
```

---

## 💡 Ejemplos de Uso

### Ejemplo 1: Enviar Mensaje de Texto (cURL)

```bash
curl -X POST http://localhost:3000/api/send-message \
  -H "Authorization: Bearer 6a3107bf5356821d38f2d4dd1771203fc501e035b75cc26442ca453a7f8e9814" \
  -H "Content-Type: application/json" \
  -d '{
    "number": "51999999999",
    "message": "Hola desde la API",
    "fromNumber": "NTE5NDg5MDc2NDA="
  }'
```

---

### Ejemplo 2: Enviar PDF (PHP)

```php
<?php
// Configuración
$apiUrl = 'http://localhost:3000/api/send-whatsap';
$token = '6a3107bf5356821d38f2d4dd1771203fc501e035b75cc26442ca453a7f8e9814';
$instancia = 'NTE5NDg5MDc2NDA='; // 51948907640 en base64

// Leer archivo PDF
$pdfPath = '/ruta/al/archivo.pdf';
$pdfContent = file_get_contents($pdfPath);
$pdfBase64 = base64_encode($pdfContent);

// Preparar datos
$datos = array(
    "number" => "51999999999",
    "mediatype" => "document",
    "media" => $pdfBase64,
    "filename" => "factura.pdf",
    "caption" => "Adjunto tu factura",
    "fromNumber" => $instancia
);

// Enviar petición
$curl = curl_init();
curl_setopt_array($curl, array(
    CURLOPT_URL => $apiUrl,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT => 60,
    CURLOPT_CUSTOMREQUEST => "POST",
    CURLOPT_POSTFIELDS => json_encode($datos),
    CURLOPT_HTTPHEADER => array(
        "Authorization: Bearer " . $token,
        "Content-Type: application/json"
    ),
));

$response = curl_exec($curl);
$httpCode = curl_getinfo($curl, CURLINFO_HTTP_CODE);
curl_close($curl);

if ($httpCode === 200) {
    $resultado = json_decode($response, true);
    if ($resultado['success']) {
        echo "✅ Documento enviado correctamente";
    } else {
        echo "❌ Error: " . $response;
    }
} else {
    echo "❌ Error HTTP " . $httpCode . ": " . $response;
}
?>
```

---

### Ejemplo 3: Enviar Documento (Python)

```python
import requests
import base64

# Configuración
API_URL = 'http://localhost:3000/api/send-whatsap'
TOKEN = '6a3107bf5356821d38f2d4dd1771203fc501e035b75cc26442ca453a7f8e9814'
INSTANCIA = 'NTE5NDg5MDc2NDA='  # 51948907640 en base64

# Leer archivo
with open('/ruta/al/archivo.pdf', 'rb') as f:
    pdf_content = f.read()
    pdf_base64 = base64.b64encode(pdf_content).decode('utf-8')

# Preparar datos
payload = {
    "number": "51999999999",
    "mediatype": "document",
    "media": pdf_base64,
    "filename": "factura.pdf",
    "caption": "Adjunto tu factura",
    "fromNumber": INSTANCIA
}

# Headers
headers = {
    'Authorization': f'Bearer {TOKEN}',
    'Content-Type': 'application/json'
}

# Enviar petición
response = requests.post(API_URL, json=payload, headers=headers, timeout=60)

if response.status_code == 200:
    result = response.json()
    if result.get('success'):
        print("✅ Documento enviado correctamente")
    else:
        print(f"❌ Error: {response.text}")
else:
    print(f"❌ Error HTTP {response.status_code}: {response.text}")
```

---

### Ejemplo 4: Enviar Documento (JavaScript/Node.js)

```javascript
const axios = require('axios');
const fs = require('fs');

// Configuración
const API_URL = 'http://localhost:3000/api/send-whatsap';
const TOKEN = '6a3107bf5356821d38f2d4dd1771203fc501e035b75cc26442ca453a7f8e9814';
const INSTANCIA = 'NTE5NDg5MDc2NDA='; // 51948907640 en base64

// Leer archivo
const pdfBuffer = fs.readFileSync('/ruta/al/archivo.pdf');
const pdfBase64 = pdfBuffer.toString('base64');

// Preparar datos
const payload = {
  number: '51999999999',
  mediatype: 'document',
  media: pdfBase64,
  filename: 'factura.pdf',
  caption: 'Adjunto tu factura',
  fromNumber: INSTANCIA
};

// Enviar petición
axios.post(API_URL, payload, {
  headers: {
    'Authorization': `Bearer ${TOKEN}`,
    'Content-Type': 'application/json'
  },
  timeout: 60000
})
.then(response => {
  if (response.data.success) {
    console.log('✅ Documento enviado correctamente');
  } else {
    console.log('❌ Error:', response.data);
  }
})
.catch(error => {
  console.error('❌ Error:', error.response?.data || error.message);
});
```

---

## 🔢 Códigos de Error

### Códigos HTTP

| Código | Significado | Descripción |
|--------|-------------|-------------|
| 200 | OK | Petición exitosa |
| 400 | Bad Request | Datos faltantes o inválidos |
| 401 | Unauthorized | Token inválido o faltante |
| 404 | Not Found | Recurso no encontrado |
| 500 | Internal Server Error | Error interno del servidor |

### Errores Comunes

#### Error: "Token requerido"
```json
{
  "error": "Token requerido"
}
```
**Solución:** Incluye el header `Authorization: Bearer <token>`

---

#### Error: "Token inválido"
```json
{
  "error": "Token inválido"
}
```
**Solución:** Verifica que el token sea correcto. Obtén uno nuevo con `/api/login`

---

#### Error: "Faltan datos"
```json
{
  "error": "Faltan datos"
}
```
**Solución:** Verifica que todos los campos requeridos estén presentes en el body

---

#### Error: "Sesión de WhatsApp no lista"
```json
{
  "error": "Sesión de WhatsApp no lista",
  "device": "51948907640",
  "state": "QR"
}
```
**Solución:** 
- Si `state` es `"QR"`: Escanea el código QR
- Si `state` es `"INIT"` o `"LOADING_*"`: Espera unos segundos
- Si `state` es `"NONE"`: Agrega el dispositivo con `/api/add-device`

---

#### Error: "Número no registrado en WhatsApp"
```json
{
  "error": "Número no registrado en WhatsApp",
  "number": "51999999999"
}
```
**Solución:** Verifica que el número de destino:
- Esté registrado en WhatsApp
- Esté en formato internacional sin `+` (ej: `51999999999`)
- No tenga espacios ni guiones

---

## 📌 Mejores Prácticas

### 1. Formato de Números

✅ **Correcto:**
```
51948907640
5491112345678
34612345678
```

❌ **Incorrecto:**
```
+51948907640  (no incluir el +)
948907640     (falta código de país)
51 948 907 640 (sin espacios)
51-948-907-640 (sin guiones)
```

---

### 2. Codificación Base64

Asegúrate de codificar correctamente los archivos en Base64:

**PHP:**
```php
$base64 = base64_encode(file_get_contents($ruta_archivo));
```

**Python:**
```python
import base64
with open(ruta_archivo, 'rb') as f:
    base64_content = base64.b64encode(f.read()).decode('utf-8')
```

**JavaScript:**
```javascript
const base64 = fs.readFileSync(rutaArchivo).toString('base64');
```

---

### 3. Manejo de Timeouts

Los envíos de documentos pueden tardar. Configura timeouts adecuados:

- **Mensajes de texto:** 10-15 segundos
- **Documentos pequeños (<1MB):** 30 segundos
- **Documentos grandes (>1MB):** 60-120 segundos

---

### 4. Identificación de Dispositivos

Cada dispositivo tiene una **INSTANCIA** única (número en base64):

```javascript
// Convertir número a instancia
const numero = '51948907640';
const instancia = Buffer.from(numero).toString('base64');
// Resultado: 'NTE5NDg5MDc2NDA='

// Convertir instancia a número
const instanciaBase64 = 'NTE5NDg5MDc2NDA=';
const numeroOriginal = Buffer.from(instanciaBase64, 'base64').toString('utf-8');
// Resultado: '51948907640'
```

---

### 5. Verificar Estado Antes de Enviar

Antes de enviar mensajes, verifica que el dispositivo esté conectado:

```javascript
// 1. Verificar estado
const statusResponse = await axios.get(
  `http://localhost:3000/api/status?numero=51948907640`,
  { headers: { 'Authorization': `Bearer ${token}` } }
);

// 2. Solo enviar si está listo
if (statusResponse.data.ready && statusResponse.data.state === 'CONNECTED') {
  // Enviar mensaje
} else {
  console.log('Dispositivo no está listo. Estado:', statusResponse.data.state);
}
```

---

### 6. Manejo de Errores

Implementa reintentos con backoff exponencial:

```javascript
async function enviarConReintentos(payload, maxReintentos = 3) {
  for (let intento = 1; intento <= maxReintentos; intento++) {
    try {
      const response = await axios.post(API_URL, payload, { headers });
      return response.data;
    } catch (error) {
      if (intento === maxReintentos) throw error;
      
      const espera = Math.pow(2, intento) * 1000; // 2s, 4s, 8s
      console.log(`Reintento ${intento}/${maxReintentos} en ${espera}ms...`);
      await new Promise(resolve => setTimeout(resolve, espera));
    }
  }
}
```

---

## 🔧 Solución de Problemas

### Problema: El servidor no inicia

**Síntomas:**
```
Error: connect ECONNREFUSED 127.0.0.1:3306
```

**Solución:**
1. Verifica que MySQL esté corriendo
2. Verifica las credenciales en `.env`
3. Verifica que la base de datos exista

---

### Problema: No se genera el QR

**Síntomas:**
- El estado se queda en `INIT`
- No aparece código QR

**Solución:**
1. Verifica la conexión a Internet.
2. Verifica que no haya bloqueos de Firewall.
3. Reinicia el servidor. Baileys no requiere Chrome, por lo que este error suele ser de red o de inicialización de socket.

---

### Problema: Sesión se desconecta constantemente

**Síntomas:**
- El dispositivo se desconecta cada pocos minutos
- Aparece "LOGOUT" en los logs

**Solución:**
1. Verifica que solo haya una instancia del servidor corriendo
2. No cierres WhatsApp Web en otros navegadores
3. Verifica que la carpeta `sessions/` tenga permisos de escritura.
4. Actualiza las dependencias:
   ```bash
   npm update @whiskeysockets/baileys
   ```

---

### Problema: Error de conexión Baileys

**Síntomas:**
- La sesión se cierra con códigos de error 401, 440, etc.

**Solución:**
1. Verifica que el dispositivo no haya cerrado sesión manualmente.
2. Si el error persiste, borra la carpeta del dispositivo en `sessions/` y vuelve a escanear el QR.
1. Verifica que el número de destino esté en formato correcto (sin `+`)
2. Verifica que el número esté registrado en WhatsApp
3. Intenta enviar un mensaje de texto primero antes de un documento

---

### Problema: Archivos no se envían

**Síntomas:**
- El mensaje se envía pero sin archivo adjunto
- Error de timeout

**Solución:**
1. Verifica que el archivo esté correctamente codificado en Base64
2. Verifica el tamaño del archivo (WhatsApp tiene límite de 100MB)
3. Aumenta el timeout de la petición
4. Para archivos grandes, considera comprimirlos primero

---

## 📞 Soporte

### Logs del Servidor

Los logs se muestran en la consola donde ejecutaste `npm start`. Para logs persistentes, redirige la salida:

```bash
npm start > logs/server.log 2>&1
```

### Información de Debug

Para obtener información detallada, revisa:

1. **Estado del sistema:**
   ```
   GET http://localhost:3000/system-status
   ```

2. **Conexiones activas:**
   ```
   GET http://localhost:3000/api/connections
   ```

3. **Logs del servidor:** Consola donde ejecutaste `npm start`

4. **Base de datos:** Revisa las tablas `usuarios` y `dispositivos_whatsapp`

---

## 📄 Licencia

Este proyecto está bajo la licencia MIT.

---

## 👨‍💻 Autor

Desarrollado por Samuel Vargas

---

## 🔄 Historial de Versiones

### v1.0.0 (2025-12-10)
- ✅ Lanzamiento inicial
- ✅ Soporte multi-dispositivo
- ✅ Envío de mensajes y documentos
- ✅ Dashboard web
- ✅ Sesiones persistentes
- ✅ WebSockets para actualizaciones en tiempo real

---

**Última actualización:** 10 de Diciembre de 2025
