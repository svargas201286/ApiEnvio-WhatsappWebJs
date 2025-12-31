# 🔌 Guía de Integración para Sistemas Externos

## 📋 Índice

1. [Introducción](#introducción)
2. [Requisitos Previos](#requisitos-previos)
3. [Proceso de Conexión](#proceso-de-conexión)
4. [Autenticación](#autenticación)
5. [Endpoints Disponibles](#endpoints-disponibles)
6. [Ejemplos de Integración](#ejemplos-de-integración)
7. [Formatos y Especificaciones](#formatos-y-especificaciones)
8. [Solución de Problemas](#solución-de-problemas)

---

## 🎯 Introducción

Esta API permite a sistemas externos enviar mensajes y documentos por WhatsApp de forma programática. Es ideal para integrar con:

- ✅ Sistemas de facturación electrónica
- ✅ CRM y sistemas de gestión
- ✅ Plataformas de e-commerce
- ✅ Sistemas ERP
- ✅ Aplicaciones web y móviles
- ✅ Cualquier sistema que necesite enviar notificaciones por WhatsApp

### Características Principales

- 🚀 **API REST** fácil de integrar
- 📱 **Múltiples dispositivos WhatsApp** por usuario
- 📄 **Envío de documentos** (PDF, XML, imágenes, etc.)
- 💬 **Mensajes de texto** simples
- 🔐 **Autenticación segura** con tokens Bearer
- ⚡ **Respuestas rápidas** y confiables
- 📊 **Monitoreo de estado** de dispositivos

---

## 📦 Requisitos Previos

### Para Usar la API

1. **URL de la API**: Necesitas conocer la URL donde está desplegada la API
   - Desarrollo local: `http://localhost:3000`
   - Servidor: `http://TU_SERVIDOR:3000` o `https://tu-dominio.com`

2. **Credenciales de Acceso**:
   - Número de teléfono registrado
   - Contraseña
   - Token de autenticación (se obtiene al registrarse)

3. **Dispositivo WhatsApp Conectado**:
   - Al menos un número de WhatsApp vinculado a la API
   - El dispositivo debe estar conectado y activo

### Para Desarrolladores

- Conocimientos básicos de APIs REST
- Capacidad de realizar peticiones HTTP (GET, POST)
- Manejo de JSON
- Codificación Base64 (para envío de archivos)

---

## 🔗 Proceso de Conexión

### Paso 1: Registrar tu Usuario

**Endpoint:** `POST /api/registro`

**URL Completa:** `http://TU_SERVIDOR:3000/api/registro`

**Body (JSON):**
```json
{
  "numero": "51948907640",
  "password": "tu_contraseña_segura"
}
```

**Respuesta Exitosa:**
```json
{
  "token": "6a3107bf5356821d38f2d4dd1771203fc501e035b75cc26442ca453a7f8e9814",
  "numero": "51948907640"
}
```

⚠️ **IMPORTANTE:** Guarda el `token` en un lugar seguro. Lo necesitarás para todas las peticiones.

---

### Paso 2: Conectar un Dispositivo WhatsApp

**Endpoint:** `POST /api/add-device`

**Headers:**
```
Authorization: Bearer 6a3107bf5356821d38f2d4dd1771203fc501e035b75cc26442ca453a7f8e9814
Content-Type: application/json
```

**Body:**
```json
{
  "numero": "51948907640",
  "nombre": "Mi Dispositivo Principal"
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

### Paso 3: Escanear el Código QR

**Endpoint:** `GET /api/qr?numero=51948907640`

**Headers:**
```
Authorization: Bearer TU_TOKEN
```

**Respuesta:**
```json
{
  "qr": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
  "numero": "51948907640"
}
```

**Cómo escanear:**
1. Abre WhatsApp en tu celular
2. Ve a **Configuración** → **Dispositivos vinculados**
3. Toca **Vincular un dispositivo**
4. Escanea el código QR mostrado en la respuesta

---

### Paso 4: Verificar Conexión

**Endpoint:** `GET /api/status?numero=51948907640`

**Headers:**
```
Authorization: Bearer TU_TOKEN
```

**Respuesta cuando está conectado:**
```json
{
  "ready": true,
  "hasQr": false,
  "state": "CONNECTED",
  "numero": "51948907640"
}
```

✅ Si `ready: true` y `state: "CONNECTED"`, ya puedes enviar mensajes.

---

## 🔐 Autenticación

Todas las peticiones (excepto `/health` y `/system-status`) requieren autenticación.

### Formato del Header

```
Authorization: Bearer TU_TOKEN_AQUI
```

### Ejemplo en diferentes lenguajes:

**cURL:**
```bash
-H "Authorization: Bearer 6a3107bf5356821d38f2d4dd1771203fc501e035b75cc26442ca453a7f8e9814"
```

**PHP:**
```php
$headers = [
    'Authorization: Bearer ' . $token,
    'Content-Type: application/json'
];
```

**Python:**
```python
headers = {
    'Authorization': f'Bearer {token}',
    'Content-Type': 'application/json'
}
```

**JavaScript:**
```javascript
headers: {
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json'
}
```

---

## 📡 Endpoints Disponibles

### 1. Enviar Mensaje de Texto

**Endpoint:** `POST /api/send-message`

**Descripción:** Envía un mensaje de texto simple a un número de WhatsApp.

**Headers:**
```
Authorization: Bearer TU_TOKEN
Content-Type: application/json
```

**Body:**
```json
{
  "number": "51999999999",
  "message": "Hola, este es un mensaje de prueba",
  "fromNumber": "51948907640"
}
```

**Parámetros:**
- `number` (requerido): Número de destino en formato internacional sin `+`
- `message` (requerido): Texto del mensaje
- `fromNumber` (opcional): Número del dispositivo que enviará el mensaje. Si no se especifica, usa el dispositivo del usuario autenticado

**Respuesta Exitosa:**
```json
{
  "success": true,
  "from": "51948907640",
  "to": "51999999999"
}
```

---

### 2. Enviar Documento/Archivo

**Endpoint:** `POST /api/send-whatsap`

**Descripción:** Envía un archivo (PDF, XML, imagen, etc.) por WhatsApp.

**Headers:**
```
Authorization: Bearer TU_TOKEN
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
  "fromNumber": "51948907640"
}
```

**Parámetros:**
- `number` (requerido): Número de destino sin `+`
- `mediatype` (requerido): Tipo de archivo
  - `"document"` - Para PDF, XML, DOCX, XLSX, etc.
  - `"image"` - Para JPG, PNG, GIF
  - `"video"` - Para MP4, AVI
  - `"audio"` - Para MP3, OGG
- `media` (requerido): Contenido del archivo en **Base64**
- `filename` (requerido): Nombre del archivo con extensión
- `caption` (opcional): Mensaje que acompaña al archivo
- `fromNumber` (opcional): Número del dispositivo emisor

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

---

### 3. Endpoint Legacy (Para Sistemas Antiguos)

**Endpoint:** `POST /api/send-whatsap-legacy`

**Descripción:** Endpoint compatible con sistemas que usan `application/x-www-form-urlencoded` en lugar de JSON.

**Headers:**
```
Authorization: Bearer TU_TOKEN
Content-Type: application/x-www-form-urlencoded
```

**Body (form-urlencoded):**
```
numws=51999999999
&codnumws=51
&nombrexml=factura.xml
&nombrepdf=factura.pdf
&xml=BASE64_DEL_XML
&pdf=BASE64_DEL_PDF
&venta=B001-123
&emisor=Mi Empresa SAC
&cliente=Cliente XYZ
&licencia=ABC123
```

Este endpoint es útil si tu sistema ya está configurado para enviar datos con `http_build_query()` en PHP.

---

### 4. Verificar Estado del Sistema

**Endpoint:** `GET /api/health`

**Descripción:** Verifica que la API está funcionando.

**Sin autenticación requerida**

**Respuesta:**
```json
{
  "ok": true,
  "db": true,
  "uptime": 3600,
  "timestamp": "2025-12-13T16:20:31.000Z"
}
```

---

### 5. Listar Dispositivos Conectados

**Endpoint:** `GET /api/connections`

**Headers:**
```
Authorization: Bearer TU_TOKEN
```

**Respuesta:**
```json
[
  {
    "id": 1,
    "numero": "51948907640",
    "nombre": "Dispositivo Principal",
    "estado": "conectado",
    "ready": true,
    "state": "CONNECTED"
  }
]
```

---

## 💻 Ejemplos de Integración

### Ejemplo 1: PHP - Enviar Factura PDF

```php
<?php
// Configuración
$apiUrl = 'http://localhost:3000/api/send-whatsap';
$token = '6a3107bf5356821d38f2d4dd1771203fc501e035b75cc26442ca453a7f8e9814';

// Datos del envío
$numeroDestino = '51999999999';
$numeroOrigen = '51948907640';

// Leer archivo PDF
$pdfPath = '/ruta/al/archivo.pdf';
if (!file_exists($pdfPath)) {
    die('Archivo no encontrado');
}

$pdfContent = file_get_contents($pdfPath);
$pdfBase64 = base64_encode($pdfContent);

// Preparar datos
$datos = [
    'number' => $numeroDestino,
    'mediatype' => 'document',
    'media' => $pdfBase64,
    'filename' => basename($pdfPath),
    'caption' => 'Factura Electrónica',
    'fromNumber' => $numeroOrigen
];

// Enviar petición
$curl = curl_init();
curl_setopt_array($curl, [
    CURLOPT_URL => $apiUrl,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT => 60,
    CURLOPT_CUSTOMREQUEST => "POST",
    CURLOPT_POSTFIELDS => json_encode($datos),
    CURLOPT_HTTPHEADER => [
        "Authorization: Bearer " . $token,
        "Content-Type: application/json"
    ],
]);

$response = curl_exec($curl);
$httpCode = curl_getinfo($curl, CURLINFO_HTTP_CODE);
curl_close($curl);

// Procesar respuesta
if ($httpCode === 200) {
    $resultado = json_decode($response, true);
    if ($resultado['success']) {
        echo "✅ Documento enviado correctamente\n";
    } else {
        echo "❌ Error: " . $response . "\n";
    }
} else {
    echo "❌ Error HTTP " . $httpCode . ": " . $response . "\n";
}
?>
```

---

### Ejemplo 2: Python - Enviar Mensaje de Texto

```python
import requests

# Configuración
API_URL = 'http://localhost:3000/api/send-message'
TOKEN = '6a3107bf5356821d38f2d4dd1771203fc501e035b75cc26442ca453a7f8e9814'

# Datos del mensaje
payload = {
    "number": "51999999999",
    "message": "Hola, este es un mensaje de prueba desde Python",
    "fromNumber": "51948907640"
}

# Headers
headers = {
    'Authorization': f'Bearer {TOKEN}',
    'Content-Type': 'application/json'
}

# Enviar petición
try:
    response = requests.post(API_URL, json=payload, headers=headers, timeout=30)
    
    if response.status_code == 200:
        result = response.json()
        if result.get('success'):
            print("✅ Mensaje enviado correctamente")
        else:
            print(f"❌ Error: {response.text}")
    else:
        print(f"❌ Error HTTP {response.status_code}: {response.text}")
        
except Exception as e:
    print(f"❌ Excepción: {str(e)}")
```

---

### Ejemplo 3: JavaScript/Node.js - Enviar Documento

```javascript
const axios = require('axios');
const fs = require('fs');

// Configuración
const API_URL = 'http://localhost:3000/api/send-whatsap';
const TOKEN = '6a3107bf5356821d38f2d4dd1771203fc501e035b75cc26442ca453a7f8e9814';

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
  fromNumber: '51948907640'
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

### Ejemplo 4: cURL - Enviar Mensaje

```bash
curl -X POST http://localhost:3000/api/send-message \
  -H "Authorization: Bearer 6a3107bf5356821d38f2d4dd1771203fc501e035b75cc26442ca453a7f8e9814" \
  -H "Content-Type: application/json" \
  -d '{
    "number": "51999999999",
    "message": "Hola desde cURL",
    "fromNumber": "51948907640"
  }'
```

---

### Ejemplo 5: C# - Enviar Documento

```csharp
using System;
using System.Net.Http;
using System.Text;
using System.Threading.Tasks;
using Newtonsoft.Json;

class WhatsAppAPI
{
    private static readonly string API_URL = "http://localhost:3000/api/send-whatsap";
    private static readonly string TOKEN = "6a3107bf5356821d38f2d4dd1771203fc501e035b75cc26442ca453a7f8e9814";

    public static async Task EnviarDocumento(string numeroDestino, string rutaArchivo)
    {
        using (var client = new HttpClient())
        {
            // Leer archivo y convertir a Base64
            byte[] fileBytes = System.IO.File.ReadAllBytes(rutaArchivo);
            string base64 = Convert.ToBase64String(fileBytes);

            // Preparar datos
            var payload = new
            {
                number = numeroDestino,
                mediatype = "document",
                media = base64,
                filename = System.IO.Path.GetFileName(rutaArchivo),
                caption = "Documento adjunto",
                fromNumber = "51948907640"
            };

            // Configurar headers
            client.DefaultRequestHeaders.Add("Authorization", $"Bearer {TOKEN}");

            // Enviar petición
            var content = new StringContent(
                JsonConvert.SerializeObject(payload),
                Encoding.UTF8,
                "application/json"
            );

            var response = await client.PostAsync(API_URL, content);
            var responseBody = await response.Content.ReadAsStringAsync();

            if (response.IsSuccessStatusCode)
            {
                Console.WriteLine("✅ Documento enviado correctamente");
            }
            else
            {
                Console.WriteLine($"❌ Error: {responseBody}");
            }
        }
    }
}
```

---

## 📋 Formatos y Especificaciones

### Formato de Números de Teléfono

✅ **CORRECTO:**
```
51948907640      (Perú)
5491112345678    (Argentina)
34612345678      (España)
```

❌ **INCORRECTO:**
```
+51948907640     (No incluir el símbolo +)
948907640        (Falta el código de país)
51 948 907 640   (Sin espacios)
51-948-907-640   (Sin guiones)
(51) 948907640   (Sin paréntesis)
```

### Formato de Archivos Base64

**PHP:**
```php
$base64 = base64_encode(file_get_contents($rutaArchivo));
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

**C#:**
```csharp
byte[] fileBytes = File.ReadAllBytes(rutaArchivo);
string base64 = Convert.ToBase64String(fileBytes);
```

### Tipos de Archivo Soportados

| Tipo | Extensiones | mediatype |
|------|-------------|-----------|
| Documentos | PDF, XML, DOCX, XLSX, TXT | `"document"` |
| Imágenes | JPG, PNG, GIF, BMP | `"image"` |
| Videos | MP4, AVI, MOV | `"video"` |
| Audios | MP3, OGG, WAV | `"audio"` |

---

## 🔧 Solución de Problemas

### Error: "Token requerido"

**Causa:** No se incluyó el header de autenticación.

**Solución:**
```
Authorization: Bearer TU_TOKEN
```

---

### Error: "Token inválido"

**Causa:** El token es incorrecto o ha expirado.

**Solución:** Obtén un nuevo token con `/api/login`:
```bash
curl -X POST http://localhost:3000/api/login \
  -H "Content-Type: application/json" \
  -d '{"numero": "51948907640", "password": "tu_contraseña"}'
```

---

### Error: "Sesión de WhatsApp no lista"

**Causa:** El dispositivo no está conectado.

**Solución:**
1. Verifica el estado: `GET /api/status?numero=51948907640`
2. Si `state` es `"QR"`, escanea el código QR
3. Si `state` es `"NONE"`, agrega el dispositivo con `/api/add-device`

---

### Error: "Número no registrado en WhatsApp"

**Causa:** El número de destino no existe en WhatsApp o está mal formateado.

**Solución:**
- Verifica que el número esté registrado en WhatsApp
- Usa formato internacional sin `+`: `51999999999`
- No incluyas espacios ni guiones

---

### Error: "Failed to decode base64"

**Causa:** El archivo no está correctamente codificado en Base64.

**Solución:**
```php
// PHP - Asegúrate de leer el archivo en modo binario
$base64 = base64_encode(file_get_contents($ruta));
```

---

### Error de Timeout

**Causa:** El archivo es muy grande o la conexión es lenta.

**Solución:**
- Aumenta el timeout de tu petición HTTP (recomendado: 60 segundos)
- Verifica el tamaño del archivo (máximo recomendado: 16MB)

**PHP:**
```php
curl_setopt($curl, CURLOPT_TIMEOUT, 60);
```

**Python:**
```python
response = requests.post(url, json=payload, timeout=60)
```

---

## 📊 Límites y Recomendaciones

### Límites Técnicos

- **Tamaño máximo de archivo:** 16 MB (recomendado)
- **Timeout de petición:** 60 segundos
- **Formato de números:** Internacional sin `+`
- **Codificación:** UTF-8 para textos, Base64 para archivos

### Mejores Prácticas

1. ✅ **Valida los números** antes de enviar
2. ✅ **Maneja errores** apropiadamente
3. ✅ **Usa timeouts** adecuados (60 segundos mínimo)
4. ✅ **Verifica el estado** del dispositivo antes de enviar
5. ✅ **Guarda el token** de forma segura
6. ✅ **Implementa reintentos** en caso de error temporal
7. ✅ **Registra logs** de tus envíos

---

## 🔒 Seguridad

### Recomendaciones de Seguridad

1. **Nunca expongas tu token** en el código frontend
2. **Usa HTTPS** en producción
3. **Guarda el token** en variables de entorno
4. **Rota los tokens** periódicamente
5. **Valida las entradas** antes de enviar
6. **Implementa rate limiting** en tu sistema
7. **Monitorea el uso** de la API

### Ejemplo de Variables de Entorno

**PHP (.env):**
```env
WHATSAPP_API_URL=http://localhost:3000
WHATSAPP_API_TOKEN=6a3107bf5356821d38f2d4dd1771203fc501e035b75cc26442ca453a7f8e9814
WHATSAPP_FROM_NUMBER=51948907640
```

**Python (.env):**
```env
WHATSAPP_API_URL=http://localhost:3000
WHATSAPP_API_TOKEN=6a3107bf5356821d38f2d4dd1771203fc501e035b75cc26442ca453a7f8e9814
WHATSAPP_FROM_NUMBER=51948907640
```

---

## 📞 Soporte

Si tienes problemas o preguntas:

1. Revisa esta documentación completa
2. Consulta el archivo `DOCUMENTACION-API.md` para más detalles técnicos
3. Verifica el estado del sistema: `GET /api/health`
4. Revisa los logs del servidor

---

## 📝 Resumen Rápido

### Para Empezar:

1. **Registrarse:** `POST /api/registro`
2. **Agregar dispositivo:** `POST /api/add-device`
3. **Escanear QR:** `GET /api/qr?numero=TU_NUMERO`
4. **Enviar mensaje:** `POST /api/send-message`
5. **Enviar archivo:** `POST /api/send-whatsap`

### URLs Importantes:

- **API Base:** `http://TU_SERVIDOR:3000/api`
- **Health Check:** `http://TU_SERVIDOR:3000/api/health`
- **Dashboard:** `http://TU_SERVIDOR:3000/dashboard.html`

---

**¡Listo para integrar! 🚀**

Si necesitas ayuda adicional, consulta los archivos de ejemplo incluidos en el proyecto.
