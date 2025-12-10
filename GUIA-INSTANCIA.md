# 🔧 Cómo Usar la INSTANCIA en tus Archivos PHP

## ✅ Cambios Realizados en la API

La API ahora acepta el campo `fromNumber` que puede ser:
1. **Número directo**: `"51948907640"`
2. **Instancia (base64)**: `"OTU3MzY5NjE1"` (que se decodifica a `957369615`)

---

## 📝 Actualización para `envio-ws-local.php`

### CAMBIO 1: Agregar `fromNumber` a los datos

**BUSCAR (línea ~77):**
```php
$datos1 =array(
    "number" => $codnumws.$numws,
    "mediatype" => "document",
    "media" => $datos_base64_xml,
    "filename" => $nombrexml.'.xml',
    "caption" => $mensaje
);
```

**CAMBIAR POR:**
```php
$datos1 =array(
    "number" => $codnumws.$numws,
    "mediatype" => "document",
    "media" => $datos_base64_xml,
    "filename" => $nombrexml.'.xml',
    "caption" => $mensaje,
    "fromNumber" => self::INSTACIA  // ⚠️ AGREGAR ESTA LÍNEA
);
```

### CAMBIO 2: Hacer lo mismo para `$datos2`

**BUSCAR (línea ~84):**
```php
$datos2 =array(
    "number" => $codnumws.$numws,
    "mediatype" => "document",
    "media" => $datos_base64_pdf,
    "filename" => $nombrepdf.'.pdf',
    "caption" => $mensaje
);
```

**CAMBIAR POR:**
```php
$datos2 =array(
    "number" => $codnumws.$numws,
    "mediatype" => "document",
    "media" => $datos_base64_pdf,
    "filename" => $nombrepdf.'.pdf',
    "caption" => $mensaje,
    "fromNumber" => self::INSTACIA  // ⚠️ AGREGAR ESTA LÍNEA
);
```

### CAMBIO 3: Actualizar la URL de la API

**BUSCAR (línea ~22):**
```php
const URL_API_WS = " ".self::INSTACIA;
```

**CAMBIAR POR:**
```php
const URL_API_WS = "http://localhost:3000/api/send-whatsap";
```

---

## 🔍 Cómo Funciona

### Ejemplo de INSTANCIA:

```php
const INSTACIA = "OTU3MzY5NjE1"; // Base64 de "957369615"
```

Cuando envías esto a la API:
```json
{
  "number": "51999999999",
  "mediatype": "document",
  "media": "base64...",
  "filename": "factura.pdf",
  "caption": "Tu factura",
  "fromNumber": "OTU3MzY5NjE1"
}
```

La API automáticamente:
1. Detecta que `OTU3MzY5NjE1` es base64
2. Lo decodifica a `957369615`
3. Usa el dispositivo WhatsApp con número `957369615` para enviar

---

## 📋 Código Completo Corregido para `envio-ws-local.php`

```php
<?php
class EnvioWsLocal
{
    const INSTACIA = "OTU3MzY5NjE1"; // Tu instancia en base64
    const TOKEN = "6a3107bf5356821d38f2d4dd1771203fc501e035b75cc26442ca453a7f8e9814";
    const URL_API_WS = "http://localhost:3000/api/send-whatsap"; // ⚠️ CORREGIDO
    
    public static function enviarWsLocal(){
        // ... código anterior ...
        
        // ⚠️ AGREGAR fromNumber
        $datos1 = array(
            "number" => $codnumws.$numws,
            "mediatype" => "document",
            "media" => $datos_base64_xml,
            "filename" => $nombrexml.'.xml',
            "caption" => $mensaje,
            "fromNumber" => self::INSTACIA  // ⚠️ NUEVO
        );
        
        $datos2 = array(
            "number" => $codnumws.$numws,
            "mediatype" => "document",
            "media" => $datos_base64_pdf,
            "filename" => $nombrepdf.'.pdf',
            "caption" => $mensaje,
            "fromNumber" => self::INSTACIA  // ⚠️ NUEVO
        );
        
        // Enviar XML
        $curl = curl_init();
        curl_setopt_array($curl, [
            CURLOPT_URL => self::URL_API_WS,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_ENCODING => "",
            CURLOPT_MAXREDIRS => 10,
            CURLOPT_TIMEOUT => 30,
            CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
            CURLOPT_CUSTOMREQUEST => "POST",
            CURLOPT_POSTFIELDS => json_encode($datos1),
            CURLOPT_HTTPHEADER => [
                "Authorization: Bearer ".self::TOKEN,
                "Content-Type: application/json"
            ],
        ]);
        
        $response = curl_exec($curl);
        $err = curl_error($curl);
        curl_close($curl);
        
        if ($err) {
            echo json_encode(['error' => $err]);
            exit();
        }
        
        $res = json_decode($response, true);
        if (!empty($res['success']) || !empty($res['succes'])) {
            // Enviar PDF
            $curl2 = curl_init();
            curl_setopt_array($curl2, [
                CURLOPT_URL => self::URL_API_WS,
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_ENCODING => "",
                CURLOPT_MAXREDIRS => 10,
                CURLOPT_TIMEOUT => 30,
                CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
                CURLOPT_CUSTOMREQUEST => "POST",
                CURLOPT_POSTFIELDS => json_encode($datos2),
                CURLOPT_HTTPHEADER => [
                    "Authorization: Bearer ".self::TOKEN,
                    "Content-Type: application/json"
                ],
            ]);
            
            $response2 = curl_exec($curl2);
            $err2 = curl_error($curl2);
            curl_close($curl2);
            
            if ($err2) {
                echo json_encode(['error' => $err2]);
            } else {
                $res2 = json_decode($response2, true);
                if (!empty($res2['success']) || !empty($res2['succes'])) {
                    echo json_encode(['success' => true, 'message' => 'ok']);
                } else {
                    echo $response2;
                }
            }
        } else {
            echo $response;
        }
    }
}
?>
```

---

## 🎯 Resumen de Cambios

| Archivo | Línea | Qué Cambiar |
|---------|-------|-------------|
| `envio-ws-local.php` | ~22 | `const URL_API_WS = "http://localhost:3000/api/send-whatsap";` |
| `envio-ws-local.php` | ~77 | Agregar `"fromNumber" => self::INSTACIA` en `$datos1` |
| `envio-ws-local.php` | ~84 | Agregar `"fromNumber" => self::INSTACIA` en `$datos2` |

---

## ✅ Verificación

Después de los cambios, cuando envíes un documento deberías ver en los logs del servidor Node.js:

```
📥 Recibiendo solicitud de envío de documento
Datos recibidos: { number: '51999999999', fromNumber: 'OTU3MzY5NjE1', ... }
🔓 Instancia decodificada: OTU3MzY5NjE1 -> 957369615
📱 Usando dispositivo: 957369615
📤 Enviando document desde 957369615 a 51999999999
✅ Documento enviado exitosamente a 51999999999
```
