# 🚀 Guía de Instalación en Servidor aaPanel

## 📋 Información del Servidor
- **IP Local:** 192.168.18.95
- **IP Pública:** 38.250.155.67
- **Panel:** aaPanel
- **Software instalado:** Nginx 1.24.0, MySQL 10.11.10, phpMyAdmin 5.2, PHP 8.1

---

## 🔧 Paso 1: Instalar Node.js y PM2

### Opción A: Desde aaPanel (Recomendado)
1. Accede a aaPanel: `http://192.168.18.95:7800`
2. Ve a **App Store**
3. Busca **"Node Version Manager"** o **"PM2 Manager"**
4. Instala **Node.js** (versión 18.x o superior)
5. Instala **PM2 Manager** para gestión de procesos

### Opción B: Instalación manual vía SSH
```bash
# Conectar al servidor
ssh usuario@192.168.18.95

# Instalar Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verificar instalación
node --version
npm --version

# Instalar PM2 globalmente
sudo npm install -g pm2

# Verificar PM2
pm2 --version
```

---

## 📦 Paso 2: Subir el Proyecto al Servidor

### Opción A: Usando Git (Recomendado)

Como el repositorio es **PÚBLICO**, no necesitas iniciar sesión en GitHub. Sin embargo, si usas un usuario que no es root (ej. `samuel`), necesitarás usar `sudo` para los permisos.

1. **Conectar al servidor:**
   ```bash
   ssh tu_usuario@192.168.18.95
   ```

2. **Ejecutar comando de instalación limpia:**
   Este comando borra cualquier versión anterior, descarga la nueva y ajusta los permisos (todo en uno):
   ```bash
   cd /www/wwwroot/ && sudo rm -rf whatsapp-api && sudo git clone https://github.com/svargas201286/ApiEnvio-WhatsappWebJs.git whatsapp-api
   ```

3. **Ajustar permisos de la carpeta (CRÍTICO):**
   Para poder instalar dependencias y ejecutar sin errores, asigna la carpeta a tu usuario:
   ```bash
   # Reemplaza 'tu_usuario' con tu usuario real (ej. samuel)
   sudo chown -R $USER:$USER /www/wwwroot/whatsapp-api
   ```

4. **Instalar dependencias:**
   ```bash
   cd whatsapp-api
   npm install --production
   ```

### Opción B: Usando FTP/SFTP
1. Abre **FileZilla** o **WinSCP**
2. Conecta a: `192.168.18.95`
3. Usuario: (tu usuario SSH)
4. Puerto: 22 (SFTP)
5. Sube toda la carpeta a: `/www/wwwroot/whatsapp-api`
6. Luego por SSH ejecuta:
```bash
cd /www/wwwroot/whatsapp-api
npm install --production
```

---

## 🗄️ Paso 3: Configurar Base de Datos MySQL

### 3.1 Crear Base de Datos en aaPanel
1. En aaPanel, ve a **Database**
2. Clic en **Add database**
3. Completa:
   - **Database name:** `whatsapp_api`
   - **Username:** `whatsapp_user`
   - **Password:** (genera una contraseña segura)
   - **Access permission:** Local server (127.0.0.1)
4. Guarda la información de acceso

### 3.2 Configurar Variables de Entorno
```bash
# Conectar al servidor
ssh usuario@192.168.18.95

# Ir al directorio del proyecto
cd /www/wwwroot/whatsapp-api

# Crear archivo .env desde el ejemplo
cp .env.example .env

# Editar el archivo .env
nano .env
```

Edita el archivo `.env` con los datos de tu base de datos:
```env
DB_HOST=127.0.0.1
DB_USER=whatsapp_user
DB_PASSWORD=tu_password_de_aapanel
DB_NAME=whatsapp_api
DB_PORT=3306

PORT=3000
NODE_ENV=production

SERVER_LOCAL_IP=192.168.18.95
SERVER_PUBLIC_IP=38.250.155.67
```

Guarda con `Ctrl+O`, Enter, y sal con `Ctrl+X`

---

## 🚀 Paso 4: Iniciar la Aplicación con PM2 (Inicio Automático)

### 4.1 Iniciar con el archivo de configuración

El proyecto incluye un archivo `ecosystem.config.js` que configura PM2 para:
- ✅ **Reinicio automático** si la aplicación falla
- ✅ **Reinicio automático** si usa más de 1GB de RAM
- ✅ **Logs organizados** en la carpeta `logs/`
- ✅ **Configuración optimizada** para producción

```bash
# Asegúrate de estar en el directorio del proyecto
cd /www/wwwroot/whatsapp-api

# Crear carpeta de logs
mkdir -p logs

# Iniciar la aplicación con el archivo de configuración
pm2 start ecosystem.config.js

# Ver el estado
pm2 status

# Ver los logs en tiempo real
pm2 logs whatsapp-api
```

### 4.2 Configurar inicio automático al arrancar el servidor

**IMPORTANTE:** Estos pasos aseguran que tu aplicación se inicie automáticamente cuando el servidor se reinicie.

```bash
# Guardar la configuración actual de PM2
pm2 save

# Generar script de inicio automático
pm2 startup

# PM2 te mostrará un comando como este (CÓPIALO Y EJECÚTALO):
# sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u tu_usuario --hp /home/tu_usuario

# Ejecuta el comando que PM2 te muestre (ejemplo):
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u www --hp /home/www

# Verificar que se guardó correctamente
pm2 save

# Verificar que el servicio systemd está activo
sudo systemctl status pm2-www
```

### 4.3 Verificar que funciona el inicio automático

```bash
# Reiniciar el servidor para probar
sudo reboot

# Después de que el servidor reinicie, conectarse de nuevo y verificar:
ssh usuario@192.168.18.95

# Verificar que PM2 está corriendo
pm2 status

# Deberías ver tu aplicación "whatsapp-api" en estado "online"
```

### 4.4 Comandos útiles de PM2

```bash
# Ver estado de procesos
pm2 status

# Ver logs en tiempo real
pm2 logs whatsapp-api

# Ver logs de errores solamente
pm2 logs whatsapp-api --err

# Reiniciar aplicación manualmente
pm2 restart whatsapp-api

# Detener aplicación (se reiniciará automáticamente al reiniciar el servidor)
pm2 stop whatsapp-api

# Eliminar de PM2 (NO se iniciará automáticamente)
pm2 delete whatsapp-api

# Ver uso de recursos en tiempo real
pm2 monit

# Limpiar logs antiguos
pm2 flush

# Ver información detallada
pm2 show whatsapp-api
```

---

## 🌐 Paso 5: Configurar Nginx como Proxy Reverso

### 5.1 Crear Sitio en aaPanel
1. En aaPanel, ve a **Website**
2. Clic en **Add site**
3. Completa:
   - **Domain:** `api.tudominio.com` (o usa la IP: `38.250.155.67`)
   - **Root directory:** `/www/wwwroot/whatsapp-api/public`
   - **PHP Version:** Pure static (no PHP)

### 5.2 Configurar Proxy Reverso
1. Clic en el sitio creado → **Settings**
2. Ve a **Reverse Proxy**
3. Agrega:
   - **Proxy name:** WhatsApp API
   - **Target URL:** `http://127.0.0.1:3000`
   - **Enable:** ✓

O edita manualmente la configuración de Nginx:

```bash
# Editar configuración del sitio
nano /www/server/panel/vhost/nginx/whatsapp-api.conf
```

Agrega esta configuración:
```nginx
server {
    listen 80;
    server_name 38.250.155.67;  # O tu dominio

    # Logs
    access_log /www/wwwlogs/whatsapp-api.log;
    error_log /www/wwwlogs/whatsapp-api.error.log;

    # Proxy reverso a Node.js
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts para WhatsApp
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # WebSocket para Socket.IO
    location /socket.io/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

Reinicia Nginx:
```bash
sudo nginx -t
sudo systemctl restart nginx
```

---

## 🔒 Paso 6: Configurar Firewall

### En aaPanel
1. Ve a **Security**
2. Agrega reglas para:
   - **Puerto 80** (HTTP) - Allow
   - **Puerto 443** (HTTPS) - Allow
   - **Puerto 3000** (Node.js) - Allow solo desde localhost

### Vía SSH (si usas UFW)
```bash
# Permitir HTTP y HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# NO abrir el puerto 3000 externamente (solo Nginx debe acceder)
# sudo ufw allow 3000/tcp  # NO HACER ESTO

# Verificar reglas
sudo ufw status
```

---

## 🔐 Paso 7: Configurar Certificado SSL (Gratis)

**NOTA:** No necesitas instalar ninguna app adicional. aaPanel ya incluye la herramienta gratuita "Let's Encrypt".

### 7.1 Activar SSL en aaPanel
1. En el menú izquierdo, ve a **Website**.
2. En la lista de tus sitios, haz clic en **Conf** (o en el nombre del dominio).
3. En la ventana emergente, haz clic en la pestaña **SSL**.
4. Selecciona **Let's Encrypt** (la opción gratuita).
5. Verifica que tu dominio esté marcado.
6. Haz clic en el botón **Apply** (Solicitar).
   - El sistema verificará el dominio y generará el certificado.
   - Una vez termine, verás la fecha de expiración y el certificado activado.
7. (Opcional) Activa el interruptor **"Force HTTPS"** arriba a la derecha para obligar a todos a entrar seguro.

### 7.2 Renovación Automática
aaPanel configura automáticamente una tarea programada (Cron) para renovar el certificado antes de que expire, así que no tienes que preocuparte por hacerlo manualmente.

---

## ✅ Paso 8: Verificar Instalación

### 8.1 Verificar que la API esté corriendo
```bash
# Ver estado de PM2
pm2 status

# Ver logs en tiempo real
pm2 logs whatsapp-api --lines 50

# Verificar que el puerto esté escuchando
sudo netstat -tulpn | grep :3000
```

### 8.2 Probar la API
```bash
# Desde el servidor
curl http://localhost:3000/api/health

# Desde tu computadora local (red local)
curl http://192.168.18.95/api/health

# Desde internet (IP pública)
curl http://38.250.155.67/api/health
```

Deberías recibir una respuesta JSON como:
```json
{
  "ok": true,
  "db": true,
  "uptime": 123.456,
  "timestamp": "2025-12-10T11:56:23.000Z"
}
```

---

## 📱 Paso 9: Probar Envío de WhatsApp

### 9.1 Registrar un dispositivo
```bash
curl -X POST http://38.250.155.67/api/registro \
  -H "Content-Type: application/json" \
  -d '{"numero": "51957369615", "password": "tu_password"}'
```

### 9.2 Obtener código QR
Abre en el navegador:
```
http://38.250.155.67/api/qr/51957369615
```

Escanea el código QR con WhatsApp.

### 9.3 Enviar mensaje de prueba
```bash
curl -X POST http://38.250.155.67/api/send \
  -H "Content-Type: application/json" \
  -d '{
    "fromNumber": "51957369615",
    "toNumber": "51999999999",
    "message": "Hola desde el servidor!"
  }'
```

---

## 🔧 Comandos Útiles de PM2

```bash
# Ver estado de procesos
pm2 status

# Ver logs
pm2 logs whatsapp-api

# Reiniciar aplicación
pm2 restart whatsapp-api

# Detener aplicación
pm2 stop whatsapp-api

# Eliminar de PM2
pm2 delete whatsapp-api

# Ver uso de recursos
pm2 monit

# Limpiar logs
pm2 flush
```

---

## 🐛 Solución de Problemas

### La API no inicia
```bash
# Ver logs detallados
pm2 logs whatsapp-api --lines 100

# Verificar que las dependencias estén instaladas
cd /www/wwwroot/whatsapp-api
npm install

# Verificar permisos
sudo chown -R www:www /www/wwwroot/whatsapp-api
```

### Error de conexión a MySQL
```bash
# Verificar que MySQL esté corriendo
sudo systemctl status mysql

# Probar conexión manual
mysql -u whatsapp_user -p whatsapp_api

# Verificar credenciales en .env
cat /www/wwwroot/whatsapp-api/.env
```

### Puerto 3000 en uso
```bash
# Ver qué proceso usa el puerto
sudo lsof -i :3000

# Matar proceso si es necesario
sudo kill -9 <PID>

# Reiniciar PM2
pm2 restart whatsapp-api
```

### No se puede acceder desde internet
```bash
# Verificar firewall
sudo ufw status

# Verificar que Nginx esté corriendo
sudo systemctl status nginx

# Ver logs de Nginx
sudo tail -f /www/wwwlogs/whatsapp-api.error.log
```

---

## 📊 Monitoreo

### Ver uso de recursos
```bash
# CPU y memoria de PM2
pm2 monit

# Recursos del sistema
htop

# Espacio en disco
df -h
```

### Logs importantes
```bash
# Logs de la aplicación
pm2 logs whatsapp-api

# Logs de Nginx
sudo tail -f /www/wwwlogs/whatsapp-api.log
sudo tail -f /www/wwwlogs/whatsapp-api.error.log

# Logs del sistema
sudo journalctl -u nginx -f
```

---

## 🎯 URLs de Acceso

Una vez configurado, tu API estará disponible en:

- **Red Local:** `http://192.168.18.95/api/`
- **Internet:** `http://38.250.155.67/api/`
- **Con dominio:** `http://api.tudominio.com/api/` (si configuraste un dominio)

### Endpoints principales:
- Health check: `/api/health`
- Registro: `/api/registro`
- QR Code: `/api/qr/:numero`
- Enviar mensaje: `/api/send`
- Enviar archivo: `/api/send-file`

---

## 📝 Notas Importantes

1. **Seguridad:** Cambia las contraseñas por defecto
2. **Backups:** Configura backups automáticos de la base de datos en aaPanel
3. **SSL:** Instala certificado SSL para producción
4. **Monitoreo:** Revisa los logs regularmente
5. **Actualizaciones:** Mantén Node.js y las dependencias actualizadas

---

## 🆘 Soporte

Si encuentras problemas, revisa:
1. Los logs de PM2: `pm2 logs whatsapp-api`
2. Los logs de Nginx: `/www/wwwlogs/whatsapp-api.error.log`
3. El estado de los servicios: `pm2 status` y `sudo systemctl status nginx`

---

**¡Listo!** Tu API de WhatsApp debería estar funcionando correctamente en el servidor. 🎉
