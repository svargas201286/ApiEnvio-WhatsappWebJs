# 🔧 CAMBIOS FINALES PARA envio-ws.php

## ✅ Tu código actual está casi perfecto

Solo faltan **2 líneas** para que funcione completamente.

---

## 📝 CAMBIO 1: Agregar INSTANCIA (Línea 18)

**BUSCAR (línea 18):**
```php
const INSTACIA = 'http://localhost:3000'; // Base de la API Node local
```

**CAMBIAR POR:**
```php
const INSTACIA = 'OTU3MzY5NjE1'; // Instancia del dispositivo en base64 (957369615)
const URL_BASE = 'http://localhost:3000'; // Base de la API Node local
```

---

## 📝 CAMBIO 2: Actualizar URL_API_WS (Línea 21)

**BUSCAR (línea 21):**
```php
const URL_API_WS = self::INSTACIA . '/api/send-whatsap';
```

**CAMBIAR POR:**
```php
const URL_API_WS = self::URL_BASE . '/api/send-whatsap';
```

---

## 📝 CAMBIO 3: Agregar fromNumber en $datos1 (Línea ~73)

**BUSCAR:**
```php
$datos1 = array(
    "number" => $codnumws.$numws,
    "mediatype" => "document",
    "media" => $datos_base64_xml,
    "filename" => $nombrexml.'.xml',
    "caption" => $mensaje
);
```

**CAMBIAR POR:**
```php
$datos1 = array(
    "number" => $codnumws.$numws,
    "mediatype" => "document",
    "media" => $datos_base64_xml,
    "filename" => $nombrexml.'.xml',
    "caption" => $mensaje,
    "fromNumber" => self::INSTACIA  // ⚠️ AGREGAR ESTA LÍNEA
);
```

---

## 📝 CAMBIO 4: Agregar fromNumber en $datos2 (Línea ~80)

**BUSCAR:**
```php
$datos2 = array(
    "number" => $codnumws.$numws,
    "mediatype" => "document",
    "media" => $datos_base64_pdf,
    "filename" => $nombrepdf.'.pdf',
    "caption" => $mensaje
);
```

**CAMBIAR POR:**
```php
$datos2 = array(
    "number" => $codnumws.$numws,
    "mediatype" => "document",
    "media" => $datos_base64_pdf,
    "filename" => $nombrepdf.'.pdf',
    "caption" => $mensaje,
    "fromNumber" => self::INSTACIA  // ⚠️ AGREGAR ESTA LÍNEA
);
```

---

## 📋 RESUMEN DE CAMBIOS

| Línea | Qué Hacer |
|-------|-----------|
| 18 | Cambiar `const INSTACIA = 'http://localhost:3000';` por `const INSTACIA = 'OTU3MzY5NjE1';` |
| 19 | Agregar `const URL_BASE = 'http://localhost:3000';` |
| 21 | Cambiar `self::INSTACIA . '/api/send-whatsap'` por `self::URL_BASE . '/api/send-whatsap'` |
| ~73 | Agregar `"fromNumber" => self::INSTACIA` en `$datos1` |
| ~80 | Agregar `"fromNumber" => self::INSTACIA` en `$datos2` |

---

## ✅ Código Completo de las Constantes

```php
class EnvioWs
{
    const INSTACIA = 'OTU3MzY5NjE1'; // Instancia del dispositivo (957369615 en base64)
    const URL_BASE = 'http://localhost:3000'; // URL de la API
    const TOKEN = '6a3107bf5356821d38f2d4dd1771203fc501e035b75cc26442ca453a7f8e9814';
    const URL_API_WS = self::URL_BASE . '/api/send-whatsap';
    
    // ... resto del código ...
}
```

---

## 🎯 Después de los Cambios

Tu código enviará:
```json
{
  "number": "51948907640",
  "mediatype": "document",
  "media": "base64...",
  "filename": "factura.xml",
  "caption": "mensaje...",
  "fromNumber": "OTU3MzY5NjE1"  ← La API decodifica esto a 957369615
}
```

Y la API usará el dispositivo `957369615` para enviar el mensaje.

---

## ⚠️ IMPORTANTE

Si quieres usar el dispositivo `51948907640` en lugar de `957369615`, cambia la INSTANCIA a:

```php
const INSTACIA = 'NTE5NDg5MDc2NDA='; // 51948907640 en base64
```

Para saber qué dispositivos tienes disponibles, revisa el dashboard en `http://localhost:3000/dashboard.html`.
