const express = require('express');
const userController = require('../controllers/userController');
const whatsappController = require('../controllers/whatsappController');
const auth = require('../middlewares/auth');

const router = express.Router();

router.post('/registro', userController.register);
router.post('/login', userController.login);
router.get('/qr', whatsappController.getQr);
router.get('/status', whatsappController.getStatus);
router.get('/connections', whatsappController.getAllConnections);
router.post('/send-whatsap', auth, whatsappController.sendDocument);

module.exports = router;