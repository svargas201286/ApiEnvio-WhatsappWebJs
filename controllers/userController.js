const crypto = require('crypto');
const db = require('../db');

exports.register = (req, res) => {
  const { numero, email, password, name } = req.body;
  if ((!numero && !email) || !password) return res.status(400).json({ error: 'Faltan datos' });
  const token = crypto.randomBytes(32).toString('hex');
  const deviceName = name || 'Dispositivo';

  // Try to find if user exists by number or email
  const identifier = numero || email;
  const idField = numero ? 'numero' : 'email';

  db.query(
    'INSERT INTO usuarios (numero, email, password, token, nombre) VALUES (?, ?, ?, ?, ?)',
    [numero || null, email || null, password, token, name || 'Usuario'],
    (err) => {
      if (err) {
        // Si ya existe (duplicate entry), actualizamos
        // Note: This simple update logic assumes uniqueness on the field used. 
        // A better approach might be checking existence first, but for now we follow the existing pattern.
        return db.query(
          `UPDATE usuarios SET password = ?, email = COALESCE(email, ?) WHERE ${idField} = ?`,
          [password, email, identifier],
          (updErr) => {
            if (updErr) return res.status(500).json({ error: 'Error de base de datos' });
            db.query(
              `SELECT token FROM usuarios WHERE ${idField} = ?`,
              [identifier],
              (selErr, rows) => {
                if (selErr || rows.length === 0) return res.status(500).json({ error: 'Error de base de datos' });
                return res.json({ token: rows[0].token, name: deviceName });
              }
            );
          }
        );
      }
      res.json({ token, name: deviceName });
    }
  );
};

exports.login = (req, res) => {
  let { identifier, password, email, numero } = req.body;
  if (!identifier) identifier = email || numero;

  if (!identifier || !password) return res.status(400).json({ error: 'Faltan datos' });

  db.query(
    'SELECT token, numero, email FROM usuarios WHERE (email = ? OR numero = ?) AND password = ?',
    [identifier, identifier, password],
    (err, results) => {
      if (err) return res.status(500).json({ error: 'Error de base de datos' });
      if (results.length === 0) return res.status(401).json({ error: 'Credenciales incorrectas' });
      res.json({ token: results[0].token, numero: results[0].numero, email: results[0].email });
    }
  );
};

exports.forgotPassword = (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email requerido' });

  // Mock sending email
  // In a real app, generate a reset token, save it, and send an email
  res.json({ success: true, message: 'Si el correo existe, se enviarán instrucciones.' });
};

exports.getUserProfile = (req, res) => {
  const token = req.token;
  if (!req.user) {
    // Fallback
    return db.query('SELECT numero, email, nombre FROM usuarios WHERE token = ?', [token], (err, results) => {
      if (err || results.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });
      res.json(results[0]);
    });
  }
  res.json({
    numero: req.user.numero,
    email: req.user.email,
    nombre: req.user.nombre || 'Usuario'
  });
};