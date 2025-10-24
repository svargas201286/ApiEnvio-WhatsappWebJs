const db = require('../db');

// Crear o actualizar dispositivo en la base de datos
exports.createOrUpdateDevice = (numero, data = {}) => {
  return new Promise((resolve, reject) => {
    const {
      nombre = 'Dispositivo',
      estado = 'desconectado',
      instancia_id = null,
      qr_code = null
    } = data;

    const query = `
      INSERT INTO dispositivos_whatsapp (numero, nombre, estado, instancia_id, qr_code, fecha_conexion)
      VALUES (?, ?, ?, ?, ?, NOW())
      ON DUPLICATE KEY UPDATE
        nombre = VALUES(nombre),
        estado = VALUES(estado),
        instancia_id = VALUES(instancia_id),
        qr_code = VALUES(qr_code),
        fecha_conexion = CASE WHEN VALUES(estado) = 'conectado' AND estado != 'conectado' THEN NOW() ELSE fecha_conexion END,
        fecha_desconexion = CASE WHEN VALUES(estado) = 'desconectado' AND estado != 'desconectado' THEN NOW() ELSE fecha_desconexion END,
        ultima_actividad = NOW()
    `;

    db.query(query, [numero, nombre, estado, instancia_id, qr_code], (err, result) => {
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
exports.getAllDevices = () => {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT 
        numero,
        nombre,
        estado,
        fecha_conexion,
        fecha_desconexion,
        ultima_actividad,
        instancia_id,
        created_at
      FROM dispositivos_whatsapp 
      ORDER BY ultima_actividad DESC
    `;

    db.query(query, (err, results) => {
      if (err) {
        console.error('Error al obtener dispositivos:', err);
        reject(err);
      } else {
        resolve(results);
      }
    });
  });
};

// Obtener dispositivo por número
exports.getDeviceByNumber = (numero) => {
  return new Promise((resolve, reject) => {
    const query = 'SELECT * FROM dispositivos_whatsapp WHERE numero = ?';
    
    db.query(query, [numero], (err, results) => {
      if (err) {
        console.error('Error al obtener dispositivo:', err);
        reject(err);
      } else {
        resolve(results[0] || null);
      }
    });
  });
};

// Actualizar estado del dispositivo
exports.updateDeviceStatus = (numero, estado) => {
  return new Promise((resolve, reject) => {
    const query = `
      UPDATE dispositivos_whatsapp 
      SET 
        estado = ?,
        fecha_conexion = CASE WHEN ? = 'conectado' AND estado != 'conectado' THEN NOW() ELSE fecha_conexion END,
        fecha_desconexion = CASE WHEN ? = 'desconectado' AND estado != 'desconectado' THEN NOW() ELSE fecha_desconexion END,
        ultima_actividad = NOW()
      WHERE numero = ?
    `;

    db.query(query, [estado, estado, estado, numero], (err, result) => {
      if (err) {
        console.error('Error al actualizar estado del dispositivo:', err);
        reject(err);
      } else {
        resolve(result);
      }
    });
  });
};

// Eliminar dispositivo
exports.deleteDevice = (numero) => {
  return new Promise((resolve, reject) => {
    const query = 'DELETE FROM dispositivos_whatsapp WHERE numero = ?';
    
    db.query(query, [numero], (err, result) => {
      if (err) {
        console.error('Error al eliminar dispositivo:', err);
        reject(err);
      } else {
        resolve(result);
      }
    });
  });
};

// Actualizar QR code
exports.updateQRCode = (numero, qr_code) => {
  return new Promise((resolve, reject) => {
    const query = 'UPDATE dispositivos_whatsapp SET qr_code = ?, ultima_actividad = NOW() WHERE numero = ?';
    
    db.query(query, [qr_code, numero], (err, result) => {
      if (err) {
        console.error('Error al actualizar QR code:', err);
        reject(err);
      } else {
        resolve(result);
      }
    });
  });
};
