<?php
// ejemplo-envio-mensaje.js
$token = '6a3107bf5356821d38f2d4dd1771203fc501e035b75cc26442ca453a7f8e9814'; // Reemplaza con tu token real
$destinatario = '51948907640'; // Número destino en formato internacional
$mensaje = '¡Hola desde PHP!';

$data = array(
    "number" => $destinatario,
    "mediatype" => "text",
    "media" => "",
    "filename" => "",
    "caption" => $mensaje
);

$ch = curl_init('http://localhost:3000/api/send-whatsap');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
curl_setopt($ch, CURLOPT_HTTPHEADER, array(
    "Authorization: Bearer $token",
    "Content-Type: application/json"
));

$response = curl_exec($ch);
curl_close($ch);

echo $response;
?>