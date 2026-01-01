const db = require('../db');

module.exports = function (req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No autorizado' });

  db.query('SELECT id, numero, email, nombre FROM usuarios WHERE token = ?', [token], (err, results) => {
    if (results && results.length > 0) {
      req.token = token;
      req.user = results[0];
      next();
    } else {
      return res.status(401).json({ error: 'Token inválido o expirado' });
    }
  });
};