const express = require('express');
const { authMiddleware } = require('../../middlewares/authMiddleware');
const { updateInvoiceSettings } = require('../controller/adminInvoicesController');

const router = express.Router();

router.post('/invoice-settings', authMiddleware(['admin', 'host']), (req, res, next) => {
  console.log('Accessing invoice-settings route');
  updateInvoiceSettings(req, res, next);
});

module.exports = router;