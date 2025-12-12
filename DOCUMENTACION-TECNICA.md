# 📘 DOCUMENTACIÓN TÉCNICA Y GUÍA DE SOLUCIÓN DE PROBLEMAS

Esta documentación detalla la arquitectura, configuración y procedimientos de mantenimiento para el sistema de API de WhatsApp desplegado con Cloudflare Tunnel y Node.js en aaPanel.

---

## 🏗️ Arquitectura del Sistema

### Componentes Principales
1.  **Node.js API (Backend):** 
    *   Ejecuta `whatsapp-web.js` con Puppeteer (Chrome decapitado).
    *   Gestiona sesiones de WhatsApp, envío de mensajes y archivos.
    *   **Puerto Real:** 3005 (Configurado manualmente en código y PM2).
    *   **Gestor de Procesos:** PM2 (Nombre: `whatsapp-api`).

2.  **Cloudflare Tunnel:**
    *   Conecta el servidor local (detrás de CGNAT) con el mundo exterior.
    *   **Protocolo:** HTTP2 (Forzado para evitar bloqueos de ISP).
    *   **Ruta Pública:** `https://apienviocomprobante.sistemasvargas.com`.
    *   **Destino Local:** `http://localhost:3005`.

3.  **DNS Híbrido (Cloudflare):**
    *   `apienviocomprobante` -> ☁️ Nube Naranja (Túnel).
    *   `sistemasvargas.com`, `www`, `*` -> ☁️ Nube Gris (IP Hosting Viejo: 65.181.111.156).

---

## 🛠️ Procedimientos de Mantenimiento

### 1. Actualización de Código (Despliegue)
Para subir cambios desde tu PC local al servidor de producción:

**En tu PC (Local):**
```bash
git add .
git commit -m "Descripción del cambio"
git push origin master
```

**En el Servidor (aaPanel Terminal):**
```bash
cd /www/wwwroot/whatsapp-api
sudo git pull
pm2 restart whatsapp-api
```
*(Si git da error de "unsafe directory", ejecuta: `sudo git config --global --add safe.directory /www/wwwroot/whatsapp-api`)*

### 2. Reinicio de Servicios
Si la API no responde o el QR no carga:

**Reiniciar App Node.js:**
```bash
pm2 restart whatsapp-api
```

**Reiniciar Túnel Cloudflare:**
```bash
sudo systemctl restart cloudflared
```

### 3. Limpieza de Sesión (Hard Reset)
Si WhatsApp se queda "pegado" o corrupto y no genera QR:

```bash
cd /www/wwwroot/whatsapp-api
pm2 stop whatsapp-api
rm -rf .wwebjs_auth .wwebjs_cache whatsapp-sessions.json
pm2 start whatsapp-api
```
*Esto obligará a escanear el QR de nuevo como si fuera la primera vez.*

---

## 🚨 Solución de Problemas Frecuentes

### ❌ Error: "EADDRINUSE: address already in use"
*   **Causa:** El puerto 3005 (o 3000) está ocupado por un proceso fantasma.
*   **Solución:**
    ```bash
    # Matar proceso en puerto 3005
    sudo kill -9 $(sudo lsof -t -i:3005)
    # Reiniciar PM2
    pm2 restart whatsapp-api
    ```

### ❌ Error: "Protocol error (Runtime.callFunctionOn): Target closed"
*   **Causa:** Chrome/Puppeteer se crasheó por falta de memoria o librerías.
*   **Solución:**
    1.  Asegurar instalación de librerías: `sudo apt-get install -y libnss3 libatk1.0-0 libatk-bridge2.0-0 libcups2 libxcomposite1 ...` (ver lista completa en instalación).
    2.  Reiniciar servicio.

### ❌ Error: "EACCES: permission denied"
*   **Causa:** El usuario no tiene permisos para escribir en la carpeta.
*   **Solución:**
    ```bash
    sudo chown -R $USER:$USER /www/wwwroot/whatsapp-api
    sudo chmod -R 755 /www/wwwroot/whatsapp-api
    ```

### ❌ La Web carga, pero el QR se queda en "Iniciando..." infinito
*   **Causa:** La conexión de internet del servidor es lenta o Puppeteer está tardando en arrancar.
*   **Solución:** 
    *   Verificar logs: `pm2 logs whatsapp-api --lines 50`.
    *   Si no hay errores rojos, solo espera un poco más.
    *   Si persiste, haz "Limpieza de Sesión".

---

## 📝 Referencia de Configuración

**Archivo `.env` (Producción):**
```env
PORT=3005
NODE_ENV=production
SERVER_LOCAL_IP=192.168.18.95
```

**Comando PM2 para iniciar (si se borra):**
```bash
PORT=3005 pm2 start main.js --name "whatsapp-api"
```

**Configuración Cloudflare Tunnel:**
*   Public Hostname: `apienviocomprobante.sistemasvargas.com`
*   Service: `http://localhost:3005`
