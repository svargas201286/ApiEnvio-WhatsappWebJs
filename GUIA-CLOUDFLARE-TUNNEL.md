# 🌐 Guía Definitiva: Cloudflare Tunnel en aaPanel (Solución a CGNAT)

Esta guía te permitirá publicar tu API en internet **sin abrir puertos** y **saltándote las restricciones de tu proveedor de internet** (CGNAT). Es la solución más segura y profesional.

---

## 📋 Requisitos Previos

1.  Una cuenta gratuita en [Cloudflare](https://dash.cloudflare.com/sign-up).
2.  Tener tu dominio (`sistemasvargas.com`) agregado y activo en Cloudflare.
    *   *Si tus DNS están en otro lado (ej. GoDaddy), debes cambiarlos a los que te indique Cloudflare.*

---

## 🚀 Paso 1: Crear el Túnel en Cloudflare

1.  Entra al **[Dashboard de Cloudflare Zero Trust](https://one.dash.cloudflare.com/)**.
    *   Si es la primera vez, te pedirá elegir un plan: selecciona el **Free (Gratis)**.
    *   Te pedirá una tarjeta, pero **NO TE COBRARÁN NADA** (es requisito para verificar la cuenta).
2.  En el menú izquierdo, ve a **Networks** > **Tunnels**.
3.  Haz clic en el botón azul **Create a tunnel**.
4.  Selecciona **Cloudflared** (Connector).
5.  Ponle un nombre, por ejemplo: `Servidor-aaPanel` y guarda.

---

## 💻 Paso 2: Instalar el Conector en aaPanel

Una vez guardado el nombre, Cloudflare te mostrará una pantalla con comandos de instalación.

1.  Busca la sección que dice **"Install and run a connector"**.
2.  Haz clic en el icono de **Debian** (generalmente aaPanel corre en Debian/Ubuntu) o **Red Hat** (si usas CentOS).
    *   *Si no sabes cuál usar, prueba primero con Debian (64-bit).*
3.  **COPIA** el comando largo que aparece en el cuadro negro (empieza con `curl -L ...`).

### En tu aaPanel:
1.  Abre aaPanel y ve al menú **Terminal**.
2.  Loguéate como `root` (o usa `sudo` si entras como usuario normal).
3.  **PEGA** el comando que copiaste de Cloudflare y dale Enter.

El servidor descargará e instalará el servicio. Si todo sale bien, en la web de Cloudflare verás que el apartado "Connectors" cambia a estado **Connected** (verde). Haz clic en **Next**.

---

## 🔗 Paso 3: Conectar el Dominio (Public Hostnames)

Ahora le diremos a Cloudflare qué tráfico enviar a tu servidor.

1.  En la pestaña **Public Hostnames**, haz clic en **Add a public hostname**.
2.  Configura los datos así:

    *   **Subdomain:** `apienviocomprobante`
    *   **Domain:** `sistemasvargas.com`
    *   **Path:** (Déjalo vacío)
    *   **Service:**
        *   **Type:** `HTTP`
        *   **URL:** `localhost:80`

    *> **NOTA IMPORTANTE:** Apuntamos al puerto **80** (localhost:80) para que el tráfico pase primero por el Nginx de aaPanel. Así, tus configuraciones de aaPanel (como el Proxy Reverso hacia el puerto 3000 que ya hiciste) seguirán funcionando correctamente.*

3.  Haz clic en **Save hostname**.

---

## ✅ ¡Listo!

Ya no necesitas abrir puertos en tu router ni pelear con tu proveedor de internet.

### Prueba tu web:
Entra desde tu celular (con datos móviles, para estar fuera de tu red) a:
`https://apienviocomprobante.sistemasvargas.com`

Debería cargar perfectamente y con el candado de seguridad 🔒 proporcionado por Cloudflare.

---

## 🛠️ Solución de Problemas

### El comando de instalación da error
Si usas CentOS (común en aaPanel) y el comando de Debian falla, intenta seleccionando **Red Hat** en la página de Cloudflare.

### Error "Command not found"
Asegúrate de copiar todo el comando completo.

### Comandos útiles en aaPanel Terminal

Ver si el túnel está corriendo:
```bash
systemctl status cloudflared
```

Reiniciar el túnel:
```bash
systemctl restart cloudflared
```

Ver logs del túnel (para ver si hay errores de conexión):
```bash
journalctl -u cloudflared -f
```
