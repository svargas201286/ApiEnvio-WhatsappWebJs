const db = require('../db');
const deviceController = require('./deviceController');

// Endpoint compatible con el sistema de facturación existente
exports.sendWhatsappLegacy = async (req, res) => {
  try {
    console.log('📥 Recibiendo solicitud legacy de envío');
    console.log('Datos recibidos:', req.body);

    // Extraer datos del formato legacy
    const {
      numws,
      codnumws,
      nombrexml,
      nombrepdf,
      xml,
      pdf,
      venta,
      emisor,
      cliente
    } = req.body;

    // Validar datos requeridos
    if (!numws || !codnumws || !xml || !pdf) {
      return res.status(400).json({ error: 'Faltan datos requeridos' });
    }

    // Construir número completo
    const numeroDestino = codnumws + numws;

    // Obtener token del header
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'Token requerido' });
    }

    // Buscar usuario por token para obtener su número (dispositivo)
    db.query('SELECT numero FROM usuarios WHERE token = ?', [token], async (err, results) => {
      if (err || results.length === 0) {
        return res.status(401).json({ error: 'Token inválido' });
      }

      const numeroDispositivo = results[0].numero;
      console.log(`📱 Usuario asociado al dispositivo: ${numeroDispositivo}`);

      // Buscar instancia_id asociado al número
      db.query('SELECT instancia_id FROM dispositivos_whatsapp WHERE numero = ?', [numeroDispositivo], (err, resultsDevices) => {
        if (err || resultsDevices.length === 0) {
          return res.status(404).json({ error: 'Dispositivo no configurado en el sistema' });
        }

        const instancia_id = resultsDevices[0].instancia_id;
        console.log(`🆔 Instancia ID encontrada: ${instancia_id}`);

        // Obtener el cliente de WhatsApp usando instancia_id
        const whatsappController = require('./whatsappController');
        const clients = whatsappController.getClients();

        if (!clients[instancia_id] || !clients[instancia_id].ready) {
          return res.status(400).json({
            error: 'Sesión de WhatsApp no lista',
            device: numeroDispositivo,
            instance: instancia_id
          });
        }

        try {
          // Construir mensaje
          const clientenr = venta?.tipocomp == '01' ? cliente?.razon_social : cliente?.nombre;
          const mensaje = `*${emisor?.razon_social}*\n` +
            `*RUC: ${emisor?.ruc}*\n` +
            `=========================\n` +
            `*ESTIMADO CLIENTE,*\n` +
            `Sr(es). ${clientenr}\n` +
            `=========================\n` +
            `*SE ADJUNTA SU COMPROBANTE EN FORMATO XML Y PDF*\n` +
            `=========================\n` +
            `Número de whatsapp solo para notificaciones, no responder a este mensaje`;

          const { MessageMedia } = require('whatsapp-web.js');

          // Enviar XML
          const xmlMedia = new MessageMedia('application/xml', xml, nombrexml + '.xml');
          clients[instancia_id].client.sendMessage(`${numeroDestino}@c.us`, xmlMedia, { caption: mensaje });
          console.log(`✅ XML enviado a ${numeroDestino}`);

          // Enviar PDF
          const pdfMedia = new MessageMedia('application/pdf', pdf, nombrepdf + '.pdf');
          clients[instancia_id].client.sendMessage(`${numeroDestino}@c.us`, pdfMedia, { caption: mensaje });
          console.log(`✅ PDF enviado a ${numeroDestino}`);

          res.json({
            succes: true,  // Mantener typo para compatibilidad
            success: true,
            message: 'Documentos enviados correctamente'
          });

        } catch (error) {
          console.error('❌ Error al enviar:', error);
          res.status(500).json({ error: error.message });
        }
      });
    });

  } catch (error) {
    console.error('❌ Error en sendWhatsappLegacy:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Exportar función para obtener clientes (necesaria para el endpoint legacy)
exports.getClients = () => {
  const whatsappController = require('./whatsappController');
  return whatsappController.getClients ? whatsappController.getClients() : {};
};
