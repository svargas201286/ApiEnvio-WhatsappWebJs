# Solución para Cierre Automático del Sistema

## Problemas Identificados y Solucionados

### 1. **Manejo de Errores No Capturados**
- ✅ Agregado manejo global de `uncaughtException` y `unhandledRejection`
- ✅ Los errores ahora se registran en consola pero no cierran el proceso

### 2. **Configuración Mejorada de Puppeteer**
- ✅ Agregados argumentos adicionales para estabilidad
- ✅ Aumentado timeout a 60 segundos
- ✅ Deshabilitadas funciones que pueden causar cierres

### 3. **Sistema de Reconexión Automática**
- ✅ Limpieza automática de clientes inactivos cada 10 minutos
- ✅ Reinicio automático de clientes que fallan
- ✅ Mejor manejo de estados de conexión

### 4. **Logging Detallado**
- ✅ Logs de todas las operaciones importantes
- ✅ Información de estado de clientes
- ✅ Errores detallados para debugging

### 5. **Monitoreo del Sistema**
- ✅ Endpoint `/api/health` para verificación rápida
- ✅ Endpoint `/api/system-status` para monitoreo detallado
- ✅ Información de memoria y uptime

## Cómo Usar

### Inicio Normal
```bash
node main.js
```

### Inicio con Auto-Reinicio (Recomendado)
```bash
node start.js
```

### Verificación del Sistema
- **Health Check**: `GET http://localhost:3000/api/health`
- **Estado del Sistema**: `GET http://localhost:3000/api/system-status`

## Nuevas Características

### 1. **Script de Inicio Inteligente** (`start.js`)
- Verifica dependencias antes de iniciar
- Reinicia automáticamente si el proceso falla
- Manejo graceful de señales del sistema

### 2. **Limpieza Automática**
- Clientes inactivos se limpian automáticamente
- Previene acumulación de memoria
- Mejora la estabilidad del sistema

### 3. **Mejor Manejo de Errores**
- Errores de WhatsApp Web.js se capturan y registran
- El sistema continúa funcionando aunque falle un cliente
- Logs detallados para debugging

## Solución de Problemas

### Si el sistema sigue cerrándose:

1. **Verificar logs**:
   ```bash
   node main.js 2>&1 | tee logs.txt
   ```

2. **Usar el script de auto-reinicio**:
   ```bash
   node start.js
   ```

3. **Verificar estado del sistema**:
   ```bash
   curl http://localhost:3000/api/system-status
   ```

### Posibles Causas Restantes:

1. **Memoria insuficiente**: El sistema ahora monitorea el uso de memoria
2. **Problemas de Chrome**: Verificar que Chrome esté instalado correctamente
3. **Problemas de base de datos**: Verificar conexión MySQL
4. **Problemas de red**: Verificar conectividad a WhatsApp

## Configuración Recomendada

### Variables de Entorno (Opcional)
```bash
export CHROME_PATH="C:/Program Files/Google/Chrome/Application/chrome.exe"
export NODE_ENV="production"
```

### Monitoreo Continuo
Para producción, considera usar PM2:
```bash
npm install -g pm2
pm2 start start.js --name whatsapp-api
pm2 monit
```

## Endpoints de Monitoreo

- `GET /api/health` - Estado básico del sistema
- `GET /api/system-status` - Estado detallado con métricas
- `GET /api/qr?numero=1234567890` - Obtener QR para WhatsApp
- `GET /api/status?numero=1234567890` - Estado de cliente WhatsApp

## Logs Importantes a Monitorear

- `Cliente X desconectado` - Indica desconexión de WhatsApp
- `Error al inicializar cliente` - Problemas de configuración
- `Limpiando cliente inactivo` - Limpieza automática funcionando
- `Error no capturado` - Errores críticos que se están manejando

El sistema ahora es mucho más robusto y debería mantenerse funcionando de forma estable.
