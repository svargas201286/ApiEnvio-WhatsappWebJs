# 📋 Guía de Uso - Endpoint Legacy para Sistema de Facturación

## ✅ Cambios Realizados

He creado un **nuevo endpoint** en la API que acepta el formato exacto que tu sistema de facturación ya está enviando. **NO necesitas modificar tus archivos PHP**.

---

## 🎯 Nuevo Endpoint

**URL:** `http://localhost:3000/api/send-whatsap-legacy`

Este endpoint acepta el formato `application/x-www-form-urlencoded` (el que usas con `http_build_query`).

---

## 📝 Cambio en `envio-ws.php`

**SOLO necesitas cambiar la URL en la línea 20:**

```php
// ANTES:
const URL_API_WS = 'http://localhost:3000/api/send-whatsap';

// DESPUÉS:
const URL_API_WS = 'http://localhost:3000/api/send-whatsap-legacy';
```

**¡ESO ES TODO!** No necesitas cambiar nada más. El endpoint legacy:
- ✅ Acepta `http_build_query` (no necesita JSON)
- ✅ Construye el mensaje automáticamente
- ✅ Envía XML y PDF en el orden correcto
- ✅ Usa el dispositivo del usuario autenticado (por token)
- ✅ Mantiene las sesiones intactas

---

## 🔧 Cómo Funciona

1. Tu PHP envía los datos con `http_build_query`
2. El endpoint legacy los recibe
3. Extrae el número de dispositivo del token
4. Construye el mensaje de WhatsApp
5. Envía el XML primero
6. Envía el PDF después
7. Devuelve `{"succes": true}` (con el typo para compatibilidad)

---

## 📊 Datos que Envías

Tu sistema ya envía:
```php
$datos = array(
    'numws' => $numws,
    'codnumws' => $codnumws,
    "venta" => $venta,
    "emisor" => $emisor,
    "cliente" => $cliente,
    "licencia" => $licencia,
    'nombrexml' => $nombrexml,
    'nombrepdf' => $nombrepdf,
    "xml" => $datos_base64_xml,
    "pdf" => $datos_base64_pdf
);
```

El endpoint legacy los procesa automáticamente.

---

## ✅ Ventajas

1. **Sin cambios en PHP** - Solo cambias la URL
2. **Sesiones intactas** - No afecta las conexiones de WhatsApp
3. **Compatible** - Funciona con tu código existente
4. **Automático** - Construye el mensaje por ti

---

## 🚀 Prueba

1. Cambia la URL en `envio-ws.php` a `/api/send-whatsap-legacy`
2. Intenta enviar un documento desde tu sistema de facturación
3. Deberías ver en los logs:
   ```
   📥 Recibiendo solicitud legacy de envío
   📱 Usando dispositivo: 948907640
   ✅ XML enviado a 51948907640
   ✅ PDF enviado a 51948907640
   ```

---

## ⚠️ Importante

- El token debe ser válido
- El dispositivo debe estar conectado
- Los archivos XML y PDF deben existir
- El número debe estar en formato: código + número (ej: `51` + `948907640`)
