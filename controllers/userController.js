const crypto = require('crypto');
const db = require('../db');

exports.register = (req, res) => {
  const { numero, password, name } = req.body;
  if (!numero || !password) return res.status(400).json({ error: 'Faltan datos' });
  const token = crypto.randomBytes(32).toString('hex');
  const deviceName = name || 'Dispositivo';
  
  db.query(
    'INSERT INTO usuarios (numero, password, token) VALUES (?, ?, ?)',
    [numero, password, token],
    (err) => {
      if (err) {
        // Si ya existe, actualizamos la contraseña y devolvemos el token existente
        return db.query(
          'UPDATE usuarios SET password = ? WHERE numero = ?',
          [password, numero],
          (updErr) => {
            if (updErr) return res.status(500).json({ error: 'Error de base de datos' });
            db.query(
              'SELECT token FROM usuarios WHERE numero = ?',
              [numero],
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
  const { numero, password } = req.body;
  db.query(
    'SELECT token FROM usuarios WHERE numero = ? AND password = ?',
    [numero, password],
    (err, results) => {
      if (err) return res.status(500).json({ error: 'Error de base de datos' });
      if (results.length === 0) return res.status(401).json({ error: 'Credenciales incorrectas' });
      res.json({ token: results[0].token });
    }
  );
};