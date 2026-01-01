const db = require('../db');

// Crear o actualizar dispositivo en la base de datos
exports.createOrUpdateDevice = (numero, data = {}) => {
  return new Promise((resolve, reject) => {
    const {
      nombre = 'Dispositivo',
      estado = 'desconectado',
      instancia_id = null,
      qr_code = null,
      usuario_id = null
    } = data;

    // Usamos instancia_id para el ON DUPLICATE KEY UPDATE ahora que es UNIQUE
    const query = `
      INSERT INTO dispositivos_whatsapp (numero, nombre, estado, instancia_id, qr_code, usuario_id, fecha_conexion)
      VALUES (?, ?, ?, ?, ?, ?, NOW())
      ON DUPLICATE KEY UPDATE
        numero = VALUES(numero),
        nombre = VALUES(nombre),
        estado = VALUES(estado),
        qr_code = VALUES(qr_code),
        fecha_conexion = CASE WHEN VALUES(estado) = 'conectado' AND estado != 'conectado' THEN NOW() ELSE fecha_conexion END,
        fecha_desconexion = CASE WHEN VALUES(estado) = 'desconectado' AND estado != 'desconectado' THEN NOW() ELSE fecha_desconexion END,
        ultima_actividad = NOW()
    `;

    db.query(query, [numero, nombre, estado, instancia_id, qr_code, usuario_id], (err, result) => {
      if (err) {
        console.error('Error al crear/actualizar dispositivo:', err);
        reject(err);
      } else {
        resolve(result);
      }
    });
  });
};

// Obtener todos los dispositivos
exports.getAllDevices = (usuario_id = null) => {
  return new Promise((resolve, reject) => {
    let query = `
      SELECT 
        id,
        numero,
        nombre,
        estado,
        fecha_conexion,
        fecha_desconexion,
        ultima_actividad,
        instancia_id,
        qr_code,
        usuario_id,
        created_at
      FROM dispositivos_whatsapp 
    `;

    const params = [];
    if (usuario_id) {
      query += ' WHERE usuario_id = ?';
      params.push(usuario_id);
    }

    query += ' ORDER BY ultima_actividad DESC';

    db.query(query, params, (err, results) => {
      if (err) {
        console.error('Error al obtener dispositivos:', err);
        reject(err);
      } else {
        resolve(results);
      }
    });
  });
};

// Obtener dispositivo por número o instancia
exports.getDeviceByNumber = (numero) => {
  return new Promise((resolve, reject) => {
    const query = 'SELECT * FROM dispositivos_whatsapp WHERE numero = ? OR instancia_id = ? LIMIT 1';
    db.query(query, [numero, numero], (err, results) => {
      if (err) reject(err);
      else resolve(results[0] || null);
    });
  });
};

// Actualizar estado del dispositivo por instancia
exports.updateDeviceStatus = (identifier, estado) => {
  return new Promise((resolve, reject) => {
    const query = `
      UPDATE dispositivos_whatsapp 
      SET 
        estado = ?,
        fecha_conexion = CASE WHEN ? = 'conectado' AND estado != 'conectado' THEN NOW() ELSE fecha_conexion END,
        fecha_desconexion = CASE WHEN ? = 'desconectado' AND estado != 'desconectado' THEN NOW() ELSE fecha_desconexion END,
        ultima_actividad = NOW()
      WHERE instancia_id = ? OR numero = ?
    `;

    db.query(query, [estado, estado, estado, identifier, identifier], (err, result) => {
      if (err) reject(err);
      else resolve(result);
    });
  });
};

// Eliminar dispositivo por instancia
exports.deleteDevice = (identifier) => {
  return new Promise((resolve, reject) => {
    const query = 'DELETE FROM dispositivos_whatsapp WHERE instancia_id = ? OR numero = ?';
    db.query(query, [identifier, identifier], (err, result) => {
      if (err) reject(err);
      else resolve(result);
    });
  });
};

// Actualizar QR code por instancia
exports.updateQRCode = (identifier, qr_code) => {
  return new Promise((resolve, reject) => {
    const query = 'UPDATE dispositivos_whatsapp SET qr_code = ?, ultima_actividad = NOW() WHERE instancia_id = ? OR numero = ?';
    db.query(query, [qr_code, identifier, identifier], (err, result) => {
      if (err) reject(err);
      else resolve(result);
    });
  });
};

// Verificar si una instancia existe
exports.instanceExists = (instancia_id, excludeId = null) => {
  return new Promise((resolve, reject) => {
    let query = 'SELECT COUNT(*) as count FROM dispositivos_whatsapp WHERE instancia_id = ?';
    const params = [instancia_id];
    if (excludeId) {
      query += ' AND id != ?';
      params.push(excludeId);
    }
    db.query(query, params, (err, results) => {
      if (err) reject(err);
      else resolve(results[0].count > 0);
    });
  });
};

// Generar instancia única (Base64)
exports.generateUniqueInstance = async (excludeId = null) => {
  const crypto = require('crypto');
  let attempts = 0;
  while (attempts < 50) {
    const randomBytes = crypto.randomBytes(12);
    const instancia_id = randomBytes.toString('base64')
      .replace(/\+/g, '')
      .replace(/\//g, '')
      .replace(/=/g, '')
      .substring(0, 16); // 16 caracteres alfanuméricos
    const exists = await exports.instanceExists(instancia_id, excludeId);
    if (!exists) return instancia_id;
    attempts++;
  }
  throw new Error('No se pudo generar una instancia única');
};

// Actualizar dispositivo
exports.updateDevice = (identifier, data = {}) => {
  return new Promise((resolve, reject) => {
    const { nombre, instancia_id } = data;
    const updates = [];
    const values = [];

    if (nombre !== undefined) {
      updates.push('nombre = ?');
      values.push(nombre);
    }
    if (instancia_id !== undefined) {
      updates.push('instancia_id = ?');
      values.push(instancia_id);
    }

    if (updates.length === 0) return resolve();

    updates.push('ultima_actividad = NOW()');
    values.push(identifier, identifier);

    const query = `UPDATE dispositivos_whatsapp SET ${updates.join(', ')} WHERE instancia_id = ? OR numero = ?`;
    db.query(query, values, (err, result) => {
      if (err) reject(err);
      else resolve(result);
    });
  });
};