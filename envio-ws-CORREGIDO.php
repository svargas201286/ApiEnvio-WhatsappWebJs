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

class EnvioWsCorregido
{
    const INSTACIA = 'http://localhost:3000';
    const TOKEN = '6a3107bf5356821d38f2d4dd1771203fc501e035b75cc26442ca453a7f8e9814';
    const URL_API_WS = self::INSTACIA . '/api/send-whatsap';
    
    // ⚠️ IMPORTANTE: Configura aquí tu número de WhatsApp conectado
    const NUMERO_WHATSAPP_ORIGEN = '51948907640'; // Cambia esto por tu número real
    
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

        // Obtiene los datos binarios del archivo XML
        $nombrexml = $emisor['ruc'] . '-' . $venta['tipocomp'] . '-' . $venta['serie'] . '-' . $venta['correlativo'];
        $archivoxml = __DIR__ . '/../../api/xml/' . $nombrexml . '.XML';
        
        // ✅ VERIFICAR QUE EL ARCHIVO EXISTE
        if (!file_exists($archivoxml)) {
            echo json_encode(['error' => 'Archivo XML no encontrado', 'path' => $archivoxml]);
            exit();
        }
        
        $datos_binarios_xml = file_get_contents($archivoxml);
        $datos_base64_xml = base64_encode($datos_binarios_xml);

        $nombrepdf = $emisor['ruc'] . '-' . $venta['tipocomp'] . '-' . $venta['serie'] . '-' . $venta['correlativo'];
        $archivopdf = __DIR__ . '/../../api/wspdf/' . $nombrepdf . '.pdf';
        
        // ✅ VERIFICAR QUE EL ARCHIVO EXISTE
        if (!file_exists($archivopdf)) {
            echo json_encode(['error' => 'Archivo PDF no encontrado', 'path' => $archivopdf]);
            exit();
        }
        
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

        // ✅ CORRECCIÓN: Agregar fromNumber
        $datos1 = array(
            "number" => $codnumws.$numws,
            "mediatype" => "document",
            "media" => $datos_base64_xml,
            "filename" => $nombrexml.'.xml',
            "caption" => $mensaje,
            "fromNumber" => self::NUMERO_WHATSAPP_ORIGEN  // ⚠️ CAMPO AGREGADO
        );
        
        $datos2 = array(
            "number" => $codnumws.$numws,
            "mediatype" => "document",
            "media" => $datos_base64_pdf,
            "filename" => $nombrepdf.'.pdf',
            "caption" => $mensaje,
            "fromNumber" => self::NUMERO_WHATSAPP_ORIGEN  // ⚠️ CAMPO AGREGADO
        );

        // Enviar XML
        $curl1 = curl_init();
        curl_setopt_array($curl1, array(
            CURLOPT_URL => self::URL_API_WS,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_ENCODING => "",
            CURLOPT_MAXREDIRS => 10,
            CURLOPT_TIMEOUT => 60,
            CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
            CURLOPT_CUSTOMREQUEST => "POST",
            CURLOPT_POSTFIELDS => json_encode($datos1),
            CURLOPT_HTTPHEADER => array(
                "Authorization: Bearer ".self::TOKEN,
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
        if (empty($res1['succes']) && empty($res1['success'])) { 
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
            CURLOPT_TIMEOUT => 60,
            CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
            CURLOPT_CUSTOMREQUEST => "POST",
            CURLOPT_POSTFIELDS => json_encode($datos2),
            CURLOPT_HTTPHEADER => array(
                "Authorization: Bearer ".self::TOKEN,
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
        if (!empty($res2['succes']) || !empty($res2['success'])) {
            echo json_encode(['success' => true, 'message' => 'Documentos enviados correctamente']);
        } else {
            echo json_encode(['error' => 'Error al enviar PDF', 'response' => $response2]);
        }
    }
}

EnvioWsCorregido::enviarWs();
