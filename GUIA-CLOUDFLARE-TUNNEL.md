# GUÍA MAESTRA: Despliegue de WhatsApp API con Cloudflare Tunnel y aaPanel

Esta guía cubre **TODO** el proceso de instalación desde cero, incluyendo la configuración del servidor, la instalación de la aplicación, y la configuración "Híbrida" de Cloudflare para convivir con un hosting antiguo.

---

## 🏗️ Requisitos Previos

- **Servidor:** PC/Servidor con aaPanel instalado (IP Local: `192.168.18.95`).
- **Dominio:** `sistemasvargas.com` (Gestionado en Cloudflare).
- **Hosting Antiguo:** cPanel/Migracem con IP `65.181.111.156`.
- **Objetivo:** Que `apienviocomprobante.sistemasvargas.com` vaya al servidor casa, y todo lo demás (`dulcealba`, etc.) siga en el hosting viejo.

---

## 🛠️ FASE 1: Preparación del Servidor (aaPanel)

Antes de nada, necesitamos el entorno listo en tu servidor.

### 1. Instalar Node.js y PM2
En la terminal de aaPanel o vía SSH:

```bash
# Instalar Node.js 18 (o superior)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Instalar PM2 y pnpm
sudo npm install -g pm2 pnpm
pm2 install pm2-logrotate
```

### 2. Descargar el Proyecto
```bash
# Ir a la carpeta web
cd /www/wwwroot/

# Clonar el repositorio (si ya existe, borra la carpeta anterior)
sudo rm -rf WHATSAPP25
sudo git clone https://github.com/svargas201286/ApiEnvio-WhatsappWebJs.git WHATSAPP25

# Asignar permisos correctos
sudo chown -R www:www WHATSAPP25
sudo chmod -R 755 WHATSAPP25
```

### 3. Instalar Dependencias
```bash
cd WHATSAPP25
npm install --production
```

---

## ⚡ FASE 2: Configuración de DNS en Cloudflare (Estrategia Híbrida)

Para evitar romper tus webs antiguas, configura esto en Cloudflare **ANTES** de conectar nada.

1.  Entra a **Cloudflare > DNS > Records**.
2.  Configura las nubes así (Crucial):

| Tipo | Nombre | Contenido (IP Hosting Viejo) | Proxy Status | Acción |
| :--- | :--- | :--- | :--- | :--- |
| **A** | `sistemasvargas.com` | `65.181.111.156` | **☁️ GRIS (DNS Only)** | Deja pasar a hosting viejo |
| **A** | `*` (Asterisco) | `65.181.111.156` | **☁️ GRIS (DNS Only)** | Salva todos los subdominios |
| **CNAME** | `www` | `sistemasvargas.com` | **☁️ GRIS (DNS Only)** | - |
| **CNAME** | `mail` | `sistemasvargas.com` | **☁️ GRIS (DNS Only)** | Salva correos |
| **CNAME** | `apienviocomprobante` | `(ID-TUNEL).cfargotunnel.com` | **☁️ NARANJA (Proxied)** | **Único Túnel Activo** |

---

## � FASE 3: Instalación y Blindaje del Túnel

En la terminal de tu servidor:

### 1. Instalar Cloudflared
```bash
curl -L --output cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared.deb
```

### 2. Conectar el Túnel
(Este comando te lo da Cloudflare Zero Trust al crear el túnel):
```bash
sudo cloudflared service install TU_TOKEN_LARGO_AQUI
```

### 3. 🛡️ FIX CRÍTICO: Protocolo HTTP2 (Estabilidad)
Para evitar que tu proveedor de internet bloquee la conexión (Protocolo QUIC/UDP), forzamos HTTP2/TCP.

1.  Edita el servicio:
    ```bash
    sudo nano /etc/systemd/system/cloudflared.service
    ```
2.  Busca la línea `ExecStart` y añade `--protocol http2` al final. Debe quedar así:
    ```text
    ExecStart=/usr/bin/cloudflared --no-autoupdate tunnel run --token ... --protocol http2
    ```
3.  Guarda (`Ctrl+O`, `Enter`, `Ctrl+X`) y reinicia:
    ```bash
    sudo systemctl daemon-reload
    sudo systemctl restart cloudflared
    ```
4.  Verifica que esté **active (running)** y sin errores rojos:
    ```bash
    sudo systemctl status cloudflared
    ```

---

## � FASE 4: Despliegue de la Aplicación (PM2)

El túnel envía el tráfico a `localhost:3000`. Asegurémonos de que la app esté ahí.

### 1. Iniciar la App
```bash
cd /www/wwwroot/WHATSAPP25

# Iniciar proceso
pm2 start main.js --name "whatsapp-api"

# (Opcional) Si tienes ecosystem.config.js
# pm2 start ecosystem.config.js

# Guardar y configurar inicio al arranque
pm2 save
pm2 startup
```

### 2. Verificar funcionamiento local
```bash
curl -v http://localhost:3000
```
*Si recibes HTML, la app está viva.*

---

## � FASE 5: Solución de Problemas (Troubleshooting)

### 1. Error 522 en Webs Antiguas (`dulcealba`, etc.)
*   **Problema:** Cloudflare intenta proteger tu hosting viejo y este rechaza la conexión.
*   **Solución:** Pon la nube en **GRIS** (DNS Only) para ese subdominio en Cloudflare DNS.

### 2. Error 1033 o 502 en `apienviocomprobante`
*   **Problema:** El túnel o la app están apagados.
*   **Solución:**
    *   Túnel: `sudo systemctl restart cloudflared`
    *   App: `pm2 restart whatsapp-api`

### 3. La conexión del Túnel es inestable (Logs con errores)
*   **Problema:** Bloqueo de UDP/QUIC por el ISP.
*   **Solución:** Aplica el fix de HTTP2 (Fase 3, Paso 3).

### 4. En mi PC no carga, pero en celular sí
*   **Problema:** Caché DNS sucio en Windows.
*   **Solución:** Abre CMD en tu PC y ejecuta `ipconfig /flushdns`.

---
**¡Felicidades! Tienes un sistema profesional, seguro (HTTPS) y resiliente.**
