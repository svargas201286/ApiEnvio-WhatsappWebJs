# 🔧 CORRECCIONES NECESARIAS PARA TUS ARCHIVOS PHP

## ❌ PROBLEMA PRINCIPAL: Falta el campo `fromNumber`

Tu API de WhatsApp requiere el campo `fromNumber` para saber desde qué número enviar el mensaje.

---

## 📝 CAMBIOS NECESARIOS EN `envio-ws.php` Y `envio-ws-local.php`

### 1️⃣ Agregar Constante para el Número de Origen

**Agregar después de la línea 22 (después de `const URL_API_WS`):**

```php
// ⚠️ AGREGAR ESTA LÍNEA
const NUMERO_WHATSAPP_ORIGEN = '51948907640'; // Tu número de WhatsApp conectado
```

---

### 2️⃣ Modificar el Array `$datos1`

**BUSCAR (alrededor de la línea 72):**
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
    "fromNumber" => self::NUMERO_WHATSAPP_ORIGEN  // ⚠️ AGREGAR ESTA LÍNEA
);
```

---

### 3️⃣ Modificar el Array `$datos2`

**BUSCAR (alrededor de la línea 79):**
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
    "fromNumber" => self::NUMERO_WHATSAPP_ORIGEN  // ⚠️ AGREGAR ESTA LÍNEA
);
```

---

### 4️⃣ (OPCIONAL) Agregar Verificación de Archivos

**BUSCAR (alrededor de la línea 43):**
```php
$archivoxml = __DIR__ . '/../../api/xml/' . $nombrexml . '.XML';
$datos_binarios_xml = file_get_contents($archivoxml);
```

**CAMBIAR POR:**
```php
$archivoxml = __DIR__ . '/../../api/xml/' . $nombrexml . '.XML';

// ⚠️ AGREGAR ESTA VERIFICACIÓN
if (!file_exists($archivoxml)) {
    echo json_encode(['error' => 'Archivo XML no encontrado', 'path' => $archivoxml]);
    exit();
}

$datos_binarios_xml = file_get_contents($archivoxml);
```

**HACER LO MISMO PARA EL PDF (alrededor de la línea 51):**
```php
$archivopdf = __DIR__ . '/../../api/wspdf/' . $nombrepdf . '.pdf';

// ⚠️ AGREGAR ESTA VERIFICACIÓN
if (!file_exists($archivopdf)) {
    echo json_encode(['error' => 'Archivo PDF no encontrado', 'path' => $archivopdf]);
    exit();
}

$datos_binarios_pdf = file_get_contents($archivopdf);
```

---

## 📋 RESUMEN DE CAMBIOS

| Línea Aprox. | Qué Agregar | Dónde |
|--------------|-------------|-------|
| 22 | `const NUMERO_WHATSAPP_ORIGEN = '51948907640';` | Después de `const URL_API_WS` |
| 43 | Verificación `if (!file_exists($archivoxml))` | Antes de `file_get_contents($archivoxml)` |
| 51 | Verificación `if (!file_exists($archivopdf))` | Antes de `file_get_contents($archivopdf)` |
| 77 | `"fromNumber" => self::NUMERO_WHATSAPP_ORIGEN` | Dentro del array `$datos1` |
| 84 | `"fromNumber" => self::NUMERO_WHATSAPP_ORIGEN` | Dentro del array `$datos2` |

---

## ✅ DESPUÉS DE LOS CAMBIOS

Tu código debería enviar correctamente con esta estructura:

```json
{
  "number": "51948907640",
  "mediatype": "document",
  "media": "base64...",
  "filename": "archivo.pdf",
  "caption": "Mensaje",
  "fromNumber": "51948907640"  ← ESTE CAMPO ES OBLIGATORIO
}
```

---

## 🎯 ARCHIVO DE REFERENCIA

He creado un archivo completo corregido en:
**`d:\xampp8.1\htdocs\WHATSAPP25\envio-ws-CORREGIDO.php`**

Puedes copiar el código de ese archivo y adaptarlo a tus necesidades.

---

## 🔍 CÓMO VERIFICAR QUE FUNCIONA

1. Asegúrate de que tu número de WhatsApp esté conectado en el dashboard
2. Prueba enviar un documento desde tu sistema de facturación
3. Deberías ver en la consola del servidor Node.js algo como:
   ```
   📤 Enviando documento desde 51948907640 a 51999999999
   ✅ Documento enviado correctamente
   ```

---

## ⚠️ IMPORTANTE

- Cambia `'51948907640'` por tu número real de WhatsApp conectado
- El número debe estar en formato internacional sin el signo `+`
- Ejemplo: `51948907640` (Perú), `5491112345678` (Argentina), etc.
