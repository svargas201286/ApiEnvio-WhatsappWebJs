# Correcciones para envio-ws.php

## Problema Actual:
1. ❌ No envía el token de autorización
2. ❌ Usa `http_build_query` en lugar de `json_encode`
3. ❌ No envía el campo `fromNumber` (INSTANCIA)
4. ❌ Los archivos XML/PDF no existen

## Solución:

Reemplaza TODO el contenido de `envio-ws.php` con este código corregido:

```php
<?php
session_start();
require_once(dirname(__FILE__) . "/../../vendor/autoload.php");

use Conect\Conexion;
use Controladores\ControladorClientes;
use Controladores\ControladorProductos;
use Controladores\ControladorVentas;
use Controladores\ControladorCategorias;
use Controladores\ControladorEnvioSunat;
use Controladores\ControladorResumenDiario;
use Controladores\ControladorEmpresa;
use Controladores\ControladorSucursal;
use Controladores\ControladorSunat;
use Controladores\ControladorUsuarios;
use Controladores\ControladorCuentasBanco;

class EnvioWs
{
    const INSTANCIA = "NTE5NDg5MDc2NDA="; // 51948907640 en base64
    const TOKEN = "6a3107bf5356821d38f2d4dd1771203fc501e035b75cc26442ca453a7f8e9814";
    const URL_API_WS = 'http://localhost:3000/api/send-whatsap';
    
    public static function enviarWs(){
        $idcomp = $_POST['idComp'];
        $numws = $_POST['numberws'];
        $codnumws = $_POST['codnumberws'];
        
        if($numws == "" || strlen($numws) < 9 || $codnumws == ""){
            echo json_encode(['error' => 'Número inválido']);
            exit();
        }
        
        $emisor = ControladorEmpresa::ctrEmisor();
        $item = "id";
        $valor = $idcomp;
        $venta = ControladorVentas::ctrMostrarVentas($item, $valor);

        $item = "id";
        $valor = $venta['codcliente'];
        $cliente = ControladorClientes::ctrMostrarClientes($item, $valor);

        // Construir nombres de archivos
        $nombrexml = $emisor['ruc'] . '-' . $venta['tipocomp'] . '-' . $venta['serie'] . '-' . $venta['correlativo'];
        $archivoxml = __DIR__ . '/../../api/xml/' . $nombrexml . '.XML';
        
        $nombrepdf = $emisor['ruc'] . '-' . $venta['tipocomp'] . '-' . $venta['serie'] . '-' . $venta['correlativo'];
        $archivopdf = __DIR__ . '/../../api/wspdf/' . $nombrepdf . '.pdf';
        
        // Verificar que los archivos existan
        if (!file_exists($archivoxml)) {
            echo json_encode(['error' => 'Archivo XML no encontrado', 'path' => $archivoxml]);
            exit();
        }
        
        if (!file_exists($archivopdf)) {
            echo json_encode(['error' => 'Archivo PDF no encontrado', 'path' => $archivopdf]);
            exit();
        }
        
        // Leer y codificar archivos
        $datos_binarios_xml = file_get_contents($archivoxml);
        $datos_base64_xml = base64_encode($datos_binarios_xml);
        
        $datos_binarios_pdf = file_get_contents($archivopdf);
        $datos_base64_pdf = base64_encode($datos_binarios_pdf);

        // Construir mensaje
        $clientenr = $venta['tipocomp'] == '01' ? $cliente['razon_social'] : $cliente['nombre'];
        $mensaje = "*".$emisor['razon_social']."*".PHP_EOL;
        $mensaje .= "*RUC: ".$emisor['ruc']."*".PHP_EOL;
        $mensaje .= "=========================".PHP_EOL;
        $mensaje .= "*ESTIMADO CLIENTE,*\n".
                   "Sr(es). ".$clientenr."".PHP_EOL;
        $mensaje .= "=========================".PHP_EOL;
        $mensaje .= "*SE ADJUNTA SU COMPROBANTE EN FORMATO XML Y PDF*".PHP_EOL;
        $mensaje .= "=========================".PHP_EOL;
        $mensaje .= "Número de whatsapp solo para notificaciones, no responder a este mensaje".PHP_EOL;

        // Preparar datos para enviar XML
        $datos1 = array(
            "number" => $codnumws.$numws,
            "mediatype" => "document",
            "media" => $datos_base64_xml,
            "filename" => $nombrexml.'.xml',
            "caption" => $mensaje,
            "fromNumber" => self::INSTANCIA  // ⚠️ IMPORTANTE
        );
        
        // Preparar datos para enviar PDF
        $datos2 = array(
            "number" => $codnumws.$numws,
            "mediatype" => "document",
            "media" => $datos_base64_pdf,
            "filename" => $nombrepdf.'.pdf',
            "caption" => $mensaje,
            "fromNumber" => self::INSTANCIA  // ⚠️ IMPORTANTE
        );

        // Enviar XML
        $curl1 = curl_init();
        curl_setopt_array($curl1, array(
            CURLOPT_URL => self::URL_API_WS,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_ENCODING => "",
            CURLOPT_MAXREDIRS => 10,
            CURLOPT_TIMEOUT => 30,
            CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
            CURLOPT_CUSTOMREQUEST => "POST",
            CURLOPT_POSTFIELDS => json_encode($datos1),  // ⚠️ JSON, no http_build_query
            CURLOPT_HTTPHEADER => array(
                "Authorization: Bearer ".self::TOKEN,  // ⚠️ IMPORTANTE
                "Content-Type: application/json"
            ),
        ));
        
        $response1 = curl_exec($curl1);
        $httpCode1 = curl_getinfo($curl1, CURLINFO_HTTP_CODE);
        $err1 = curl_error($curl1);
        curl_close($curl1);
        
        if ($err1) {
            echo json_encode(['error' => 'cURL Error', 'details' => $err1]);
            exit();
        }
        
        if ($httpCode1 !== 200) {
            echo json_encode(['error' => 'HTTP Error ' . $httpCode1, 'response' => $response1]);
            exit();
        }
        
        $res1 = json_decode($response1, true);
        if (empty($res1['success']) && empty($res1['succes'])) {
            echo json_encode(['error' => 'Error al enviar XML', 'response' => $response1]);
            exit();
        }

        // Enviar PDF
        $curl2 = curl_init();
        curl_setopt_array($curl2, array(
            CURLOPT_URL => self::URL_API_WS,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_ENCODING => "",
            CURLOPT_MAXREDIRS => 10,
            CURLOPT_TIMEOUT => 30,
            CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
            CURLOPT_CUSTOMREQUEST => "POST",
            CURLOPT_POSTFIELDS => json_encode($datos2),  // ⚠️ JSON, no http_build_query
            CURLOPT_HTTPHEADER => array(
                "Authorization: Bearer ".self::TOKEN,  // ⚠️ IMPORTANTE
                "Content-Type: application/json"
            ),
        ));
        
        $response2 = curl_exec($curl2);
        $httpCode2 = curl_getinfo($curl2, CURLINFO_HTTP_CODE);
        $err2 = curl_error($curl2);
        curl_close($curl2);
        
        if ($err2) {
            echo json_encode(['error' => 'cURL Error', 'details' => $err2]);
            exit();
        }
        
        if ($httpCode2 !== 200) {
            echo json_encode(['error' => 'HTTP Error ' . $httpCode2, 'response' => $response2]);
            exit();
        }
        
        $res2 = json_decode($response2, true);
        if (!empty($res2['success']) || !empty($res2['succes'])) {
            echo json_encode(['success' => true, 'message' => 'ok']);
        } else {
            echo json_encode(['error' => 'Error al enviar PDF', 'response' => $response2]);
        }
    }
}

EnvioWs::enviarWs();
?>
```

## Cambios Principales:

1. ✅ Agregado `const INSTANCIA` y `const TOKEN`
2. ✅ Cambiado `http_build_query` por `json_encode`
3. ✅ Agregado header `Authorization: Bearer TOKEN`
4. ✅ Agregado header `Content-Type: application/json`
5. ✅ Agregado campo `fromNumber` en ambos arrays
6. ✅ Agregada verificación de existencia de archivos
7. ✅ Mejorado manejo de errores

## ⚠️ Sobre los Archivos Faltantes:

Los archivos no existen:
- `D:\xampp8.1\htdocs\FACTURACION-ELECTRONICA-V6\api\xml\10439142443-03-B001-2.XML`
- `D:\xampp8.1\htdocs\FACTURACION-ELECTRONICA-V6\api\wspdf\10439142443-03-B001-2.pdf`

Asegúrate de que estos archivos se generen correctamente antes de intentar enviarlos por WhatsApp.
```

---

**Copia y pega este código completo en `envio-ws.php` y debería funcionar correctamente.**
