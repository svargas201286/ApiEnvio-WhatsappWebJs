# Sistema de Conexiones Persistentes de WhatsApp

## 🎯 Objetivo
Mantener las conexiones de WhatsApp activas de forma permanente, incluso después de cerrar el navegador o reiniciar el servidor.

## ✅ Características Implementadas

### 1. **Conexiones Persistentes**
- ✅ Las conexiones de WhatsApp se mantienen activas indefinidamente
- ✅ No se cierran automáticamente por inactividad
- ✅ Solo se limpian clientes que nunca se conectaron

### 2. **Reconexión Automática**
- ✅ Si se pierde la conexión, se intenta reconectar automáticamente en 5 segundos
- ✅ Logs detallados de cada intento de reconexión
- ✅ Estados claros: CONNECTED, DISCONNECTED, RECONNECTING

### 3. **Persistencia de Sesiones**
- ✅ Estado de conexiones se guarda cada 5 minutos en `whatsapp-sessions.json`
- ✅ Al reiniciar el servidor, se cargan las sesiones guardadas
- ✅ Información de cuándo se conectó cada cliente

### 4. **Monitoreo Avanzado**
- ✅ Endpoint `/api/connections` para ver todas las conexiones
- ✅ Información detallada de cada cliente
- ✅ Contadores de clientes totales y conectados

## 🔧 Cómo Funciona

### Flujo de Conexión:
1. **Usuario escanea QR** → Cliente se conecta a WhatsApp
2. **Conexión exitosa** → Estado: `CONNECTED`, se marca `connectedAt`
3. **Conexión se mantiene** → No se cierra por inactividad
4. **Si se pierde conexión** → Estado: `DISCONNECTED`, se intenta reconectar en 5s
5. **Reconexión exitosa** → Vuelve a `CONNECTED`

### Limpieza Inteligente:
- ❌ **NO se limpian** clientes conectados (`ready: true`)
- ✅ **SÍ se limpian** clientes que nunca se conectaron después de 1 hora
- ✅ **SÍ se limpian** clientes con errores de autenticación

## 📊 Endpoints de Monitoreo

### Estado de una Conexión
```bash
GET /api/status?numero=1234567890
```
Respuesta:
```json
{
  "ready": true,
  "hasQr": false,
  "state": "CONNECTED",
  "connectedAt": 1703123456789,
  "disconnectedAt": null
}
```

### Todas las Conexiones
```bash
GET /api/connections
```
Respuesta:
```json
{
  "totalClients": 3,
  "connectedClients": 2,
  "connections": {
    "1234567890": {
      "ready": true,
      "state": "CONNECTED",
      "hasQr": false,
      "connectedAt": 1703123456789,
      "disconnectedAt": null,
      "lastSeen": 1703123456789
    }
  }
}
```

## 🚀 Uso Recomendado

### Para Desarrollo:
```bash
node main.js
```

### Para Producción (con auto-reinicio):
```bash
node start.js
```

### Monitoreo Continuo:
```bash
# Verificar estado del sistema
curl http://localhost:3000/api/system-status

# Ver todas las conexiones
curl http://localhost:3000/api/connections

# Ver estado de una conexión específica
curl "http://localhost:3000/api/status?numero=1234567890"
```

## 📝 Logs Importantes

### Conexión Exitosa:
```
✅ Cliente 1234567890 conectado exitosamente a WhatsApp
```

### Desconexión:
```
⚠️ Cliente 1234567890 desconectado: reason
🔄 Intentando reconectar cliente 1234567890...
```

### Limpieza:
```
Limpiando cliente que nunca se conectó: 9876543210
```

### Persistencia:
```
💾 Estado de sesiones guardado
📂 Estado de sesiones cargado: ["1234567890", "0987654321"]
```

## 🔍 Solución de Problemas

### Si una conexión se pierde:
1. **Verificar logs** para ver la razón de desconexión
2. **El sistema intentará reconectar automáticamente**
3. **Si falla la reconexión**, el cliente quedará en estado `DISCONNECTED`

### Si el servidor se reinicia:
1. **Las sesiones se cargan automáticamente** desde `whatsapp-sessions.json`
2. **Los clientes se reinicializan** automáticamente
3. **No es necesario escanear QR nuevamente** (si la sesión es válida)

### Si una conexión no se mantiene:
1. **Verificar que WhatsApp Web no se haya cerrado** en el móvil
2. **Verificar la conexión a internet**
3. **Revisar logs** para errores específicos

## ⚠️ Consideraciones Importantes

1. **Sesiones de WhatsApp**: Las sesiones se mantienen en `.wwebjs_auth/` y se reutilizan
2. **Memoria**: El sistema mantiene solo clientes activos en memoria
3. **Archivos temporales**: Se crea `whatsapp-sessions.json` para persistencia
4. **Reconexión**: Solo se intenta reconectar si la desconexión fue inesperada

## 🎉 Resultado Final

**Las conexiones de WhatsApp ahora se mantienen activas de forma permanente**, incluso si:
- Cierras el navegador
- Reinicias el servidor
- Hay interrupciones de red temporales
- El sistema se reinicia automáticamente

El usuario solo necesita escanear el QR **una vez** y la conexión se mantendrá activa indefinidamente.
