const express = require('express')
const router = express.Router()
const { body, validationResult } = require('express-validator')
const { sendOtp, registerOrLogin, deleteAccount } = require('../controllers/Auth/Auth')
const { authMiddleware } = require('../../middlewares/authMiddleware')

const validate = (req, res, next) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() })
  }
  next()
}

// POST /api/host/auth/send-otp — { mobileNumber } — send OTP (for future real SMS)
router.post(
  '/send-otp',
  [body('mobileNumber').notEmpty().matches(/^\+\d{1,3}\d{9,15}$/)],
  validate,
  sendOtp,
)

// POST /api/host/auth — { mobileNumber, otp } — login or auto-register
router.post(
  '/',
  [
    body('mobileNumber').notEmpty().matches(/^\+\d{1,3}\d{9,15}$/),
    body('otp').notEmpty().isString(),
  ],
  validate,
  registerOrLogin,
)

router.delete('/delete-account', authMiddleware(['host']), deleteAccount)

module.exports = router
