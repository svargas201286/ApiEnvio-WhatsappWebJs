const express = require('express');
const userController = require('../controllers/userController');
const whatsappController = require('../controllers/whatsappController');
const legacyController = require('../controllers/legacyController');
const auth = require('../middlewares/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configuración de Multer
const uploadDir = 'uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/')
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname))
  }
});

const upload = multer({ storage: storage });

const queueController = require('../controllers/queueController');

const router = express.Router();

router.post('/registro', userController.register);
router.post('/login', userController.login);
router.post('/forgot-password', userController.forgotPassword);
router.get('/qr', whatsappController.getQr);
router.get('/status', whatsappController.getStatus);
router.get('/me', auth, userController.getUserProfile);
router.get('/connections', auth, whatsappController.getAllConnections);
router.post('/disconnect', auth, whatsappController.disconnectDevice);
router.post('/add-device', auth, whatsappController.addDevice);
router.post('/delete-device', auth, whatsappController.deleteDevice);
router.post('/update-device', auth, whatsappController.updateDevice);
router.post('/update-instance', auth, whatsappController.updateInstance);
router.get('/generate-instance', auth, whatsappController.generateInstance);
router.post('/generate-instance', auth, whatsappController.generateInstance);
router.post('/send-message', auth, queueController.addToQueue);

// Rutas para archivos
router.post('/send-media', auth, upload.single('media'), queueController.addToQueue);
router.post('/send-whatsap', auth, upload.single('pdf'), queueController.addToQueue);

// Endpoint legacy para compatibilidad con sistema de facturación existente
router.post('/send-whatsap-legacy', auth, legacyController.sendWhatsappLegacy);

module.exports = router;