# Guía para Configurar el Inicio Automático en el Servidor Ubuntu (192.168.18.95)

Sigue estos pasos en tu servidor Linux para asegurar que el proyecto se inicie automáticamente después de reiniciar.

## 1. Conectar al Servidor
Abre tu terminal y conéctate al servidor:
```bash
ssh usuario@192.168.18.95
# (Ingresa tu contraseña si es necesario)
```
*Nota: Reemplaza `usuario` con tu usuario real del servidor (ej. `samuel`).*

## 2. Navegar al Proyecto
Ve a la carpeta donde tienes el proyecto alojado. Por ejemplo:
```bash
cd /ruta/a/tu/proyecto
# Ej: cd /var/www/WHATSAPP25  (Ajusta según tu ruta real)
```

## 3. Iniciar los Procesos
Asegúrate de que la aplicación esté corriendo con PM2:
```bash
pm2 start ecosystem.config.js
# O si usas el archivo main directo: pm2 start main.js --name "whatsapp-api"
```

## 4. Configurar Autoinicio (IMPORTANTE)
Para que PM2 se ejecute al encender el servidor, ejecuta:
```bash
pm2 startup
```

**ESTO TE DARÁ UN COMANDO EN LA TERMINAL.** Se verá algo así:
`sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u samuel --hp /home/samuel`

**COPIA Y PEGA ESE COMANDO QUE TE SALIÓ Y EJECUTALO.**

## 5. Guardar la Lista de Procesos
Una vez ejecutado el comando anterior, guarda el estado actual para que PM2 sepa qué procesos revivir:
```bash
pm2 save
```

---

## Verificación
Reinicia el servidor para probar:
```bash
sudo reboot
```
Espera unos minutos y vuelve a conectar. Ejecuta `pm2 list` y deberías ver `whatsapp-api` en estado **online**.
