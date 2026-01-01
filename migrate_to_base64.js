const db = require('./db');
const crypto = require('crypto');

function generateBase64() {
  return crypto.randomBytes(12).toString('base64')
    .replace(/\+/g, '')
    .replace(/\//g, '')
    .replace(/=/g, '')
    .substring(0, 16);
}

db.query('SELECT id FROM dispositivos_whatsapp', (err, rows) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }

  let completed = 0;
  if (rows.length === 0) process.exit(0);

  rows.forEach(row => {
    const newId = generateBase64();
    db.query('UPDATE dispositivos_whatsapp SET instancia_id = ? WHERE id = ?', [newId, row.id], (err) => {
      if (err) console.error(err);
      completed++;
      if (completed === rows.length) {
        console.log('Migración completada');
        process.exit(0);
      }
    });
  });
});
