<?php
/**
 * Ejemplo de cómo enviar documentos PDF por WhatsApp desde PHP
 * Usar este código en tu sistema de facturación
 */

// Configuración
$API_URL = 'http://localhost:3000/api/send-whatsap';
$TOKEN = 'TU_TOKEN_AQUI'; // Obtener del login o dashboard

// Datos del mensaje
$numeroDestino = '51948907640'; // Número con código de país, sin +
$numeroOrigen = '51948907640'; // Tu número de WhatsApp conectado

// Rutas de archivos
$xmlPath = __DIR__ . '/../../api/xml/10439142443-03-B001-2.XML';
$pdfPath = __DIR__ . '/../../api/wspdf/10439142443-03-B001-2.pdf';

// Verificar que los archivos existan
if (!file_exists($pdfPath)) {
    die(json_encode([
        'error' => 'Archivo PDF no encontrado',
        'path' => $pdfPath
    ]));
}

// Leer el archivo PDF y convertirlo a base64
$pdfContent = file_get_contents($pdfPath);
$pdfBase64 = base64_encode($pdfContent);

// Preparar los datos para enviar
$data = [
    'number' => $numeroDestino,
    'mediatype' => 'document',
    'media' => $pdfBase64,
    'filename' => basename($pdfPath), // Nombre del archivo
    'caption' => 'Factura Electrónica - B001-2', // Mensaje opcional
    'fromNumber' => $numeroOrigen // IMPORTANTE: Especificar desde qué número enviar
];

// Configurar la petición cURL
$ch = curl_init($API_URL);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'Authorization: Bearer ' . $TOKEN
]);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));

// Ejecutar la petición
$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

// Procesar la respuesta
if ($httpCode === 200) {
    $result = json_decode($response, true);
    if (isset($result['success']) && $result['success']) {
        echo json_encode([
            'success' => true,
            'message' => 'Documento enviado correctamente',
            'from' => $result['from'] ?? $numeroOrigen
        ]);
    } else {
        echo json_encode([
            'error' => 'Error al enviar',
            'details' => $result
        ]);
    }
} else {
    echo json_encode([
        'error' => 'Error HTTP ' . $httpCode,
        'response' => $response
    ]);
}
?>
