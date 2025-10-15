const express = require('express');
const auth = require('../middlewares/auth');

module.exports = (clients) => {
    const router = express.Router();
    const controller = require('../controllers/whatsappController')(clients);

    router.post('/send-whatsap', auth, controller.sendDocument);

    return router;
};