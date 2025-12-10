# Correcciones para Envío de WhatsApp desde Sistema de Facturación

## Problema 1: Error "Faltan datos"

Tu código actual probablemente se ve así:
```php
$data = [
    'number' => $numero,
    'media' => $pdfBase64,
    'filename' => $filename
];
```

**CORRECCIÓN NECESARIA:**
```php
$data = [
    'number' => $numero,          // ✅ Número destino (con código país, sin +)
    'mediatype' => 'document',    // ⚠️ FALTABA ESTE CAMPO
    'media' => $pdfBase64,        // ✅ PDF en base64
    'filename' => $filename,      // ✅ Nombre del archivo
    'caption' => 'Tu mensaje',    // ✅ Mensaje opcional
    'fromNumber' => '51948907640' // ⚠️ FALTABA: Desde qué número enviar
];
```

## Problema 2: Archivos No Encontrados

**Error actual:**
```
file_get_contents(D:\xampp8.1\htdocs\FACTURACION-ELECTRONICA-V6\vistas\sendws/../../api/xml/10439142443-03-B001-2.XML)
```

**Solución:**
```php
// ANTES DE LEER EL ARCHIVO, VERIFICAR QUE EXISTE
$xmlPath = __DIR__ . '/../../api/xml/' . $ruc . '-' . $tipoDoc . '-' . $serie . '-' . $numero . '.XML';
$pdfPath = __DIR__ . '/../../api/wspdf/' . $ruc . '-' . $tipoDoc . '-' . $serie . '-' . $numero . '.pdf';

// Verificar existencia
if (!file_exists($pdfPath)) {
    die(json_encode([
        'error' => 'PDF no encontrado',
        'path' => $pdfPath,
        'existe' => file_exists($pdfPath) ? 'SI' : 'NO'
    ]));
}

// Solo si existe, leer el archivo
$pdfContent = file_get_contents($pdfPath);
```

## Problema 3: Error de Sintaxis en wspdf/index.php (línea 95)

Busca en la línea 95 de `wspdf/index.php` algo como:
```php
// INCORRECTO (causa el error)
echo "algo" "otra cosa";
// o
function algo("parametro")
```

**Debe ser:**
```php
// CORRECTO
echo "algo" . "otra cosa";
// o
function algo($parametro)
```

## Código Completo Corregido para envio-ws.php

```php
<?php
// Configuración
$API_URL = 'http://localhost:3000/api/send-whatsap';
$TOKEN = $_SESSION['whatsapp_token'] ?? 'TU_TOKEN_AQUI';

// Obtener datos del POST
$numero = $_POST['numero'] ?? '';
$ruc = $_POST['ruc'] ?? '';
$tipoDoc = $_POST['tipo_doc'] ?? '';
$serie = $_POST['serie'] ?? '';
$correlativo = $_POST['correlativo'] ?? '';
$numeroOrigen = $_POST['numero_origen'] ?? '51948907640'; // Tu número de WhatsApp

// Validar datos
if (empty($numero) || empty($ruc) || empty($serie) || empty($correlativo)) {
    die(json_encode(['error' => 'Faltan parámetros requeridos']));
}

// Construir rutas de archivos
$filename = $ruc . '-' . $tipoDoc . '-' . $serie . '-' . $correlativo;
$pdfPath = __DIR__ . '/../../api/wspdf/' . $filename . '.pdf';

// Verificar que el PDF existe
if (!file_exists($pdfPath)) {
    die(json_encode([
        'error' => 'PDF no encontrado',
        'path' => $pdfPath,
        'filename' => $filename
    ]));
}

// Leer y codificar el PDF
$pdfContent = file_get_contents($pdfPath);
$pdfBase64 = base64_encode($pdfContent);

// Preparar datos para la API
$data = [
    'number' => $numero,
    'mediatype' => 'document',
    'media' => $pdfBase64,
    'filename' => $filename . '.pdf',
    'caption' => 'Comprobante Electrónico ' . $serie . '-' . $correlativo,
    'fromNumber' => $numeroOrigen
];

// Enviar a la API
$ch = curl_init($API_URL);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'Authorization: Bearer ' . $TOKEN
]);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

// Responder
if ($httpCode === 200) {
    echo $response;
} else {
    echo json_encode([
        'error' => 'Error HTTP ' . $httpCode,
        'response' => $response
    ]);
}
?>
```

## Checklist de Verificación

- [ ] Agregar campo `mediatype: 'document'`
- [ ] Agregar campo `fromNumber` con tu número de WhatsApp conectado
- [ ] Verificar que los archivos PDF existan antes de leerlos
- [ ] Corregir error de sintaxis en línea 95 de `wspdf/index.php`
- [ ] Asegurarse de que el token de autorización sea válido
- [ ] Verificar que el número de destino tenga código de país (sin +)

## Ejemplo de Llamada desde JavaScript

```javascript
// En tu archivo reportes.js
function enviarWhatsApp(numero, ruc, serie, correlativo) {
    $.ajax({
        url: 'vistas/sendws/envio-ws.php',
        method: 'POST',
        data: {
            numero: numero,
            ruc: ruc,
            tipo_doc: '03', // Boleta
            serie: serie,
            correlativo: correlativo,
            numero_origen: '51948907640' // Tu número de WhatsApp
        },
        success: function(response) {
            console.log('Respuesta:', response);
            var data = JSON.parse(response);
            if (data.success) {
                alert('Documento enviado correctamente');
            } else {
                alert('Error: ' + data.error);
            }
        },
        error: function(xhr, status, error) {
            console.error('Error:', error);
            alert('Error al enviar: ' + error);
        }
    });
}
```
