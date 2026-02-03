const db = require('../db');
const deviceController = require('./deviceController');

// Endpoint compatible con el sistema de facturación existente
exports.sendWhatsappLegacy = async (req, res) => {
  try {
    console.log('📥 Recibiendo solicitud legacy de envío (Baileys)');
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

    if (!numws || !codnumws || !xml || !pdf) {
      return res.status(400).json({ error: 'Faltan datos requeridos' });
    }

    const numeroDestino = codnumws + numws;
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'Token requerido' });
    }

    db.query('SELECT numero FROM usuarios WHERE token = ?', [token], async (err, results) => {
      if (err || results.length === 0) {
        return res.status(401).json({ error: 'Token inválido' });
      }

      const numeroDispositivo = results[0].numero;

      db.query('SELECT instancia_id FROM dispositivos_whatsapp WHERE numero = ?', [numeroDispositivo], async (err, resultsDevices) => {
        if (err || resultsDevices.length === 0) {
          return res.status(404).json({ error: 'Dispositivo no configurado' });
        }

        const instancia_id = resultsDevices[0].instancia_id;
        const whatsappController = require('./whatsappController');
        const clients = whatsappController.getClients();

        if (!clients[instancia_id] || !clients[instancia_id].ready) {
          return res.status(400).json({ error: 'Sesión de WhatsApp no lista' });
        }

        try {
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

          const jid = `${numeroDestino.replace(/[^0-9]/g, '')}@s.whatsapp.net`;
          const sock = clients[instancia_id].sock;

          // Enviar XML
          await sock.sendMessage(jid, {
            document: Buffer.from(xml, 'base64'),
            mimetype: 'application/xml',
            fileName: (nombrexml || 'comprobante') + '.xml',
            caption: mensaje
          });
          console.log(`✅ XML enviado a ${numeroDestino}`);

          // Enviar PDF
          await sock.sendMessage(jid, {
            document: Buffer.from(pdf, 'base64'),
            mimetype: 'application/pdf',
            fileName: (nombrepdf || 'comprobante') + '.pdf',
            caption: mensaje
          });
          console.log(`✅ PDF enviado a ${numeroDestino}`);

          res.json({
            succes: true,
            success: true,
            message: 'Documentos enviados correctamente via Baileys'
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

exports.getClients = () => {
  const whatsappController = require('./whatsappController');
  return whatsappController.getClients ? whatsappController.getClients() : {};
};
