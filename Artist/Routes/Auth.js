const express = require('express')
const router = express.Router()
const { body, validationResult } = require('express-validator')
const { sendOtp, registerOrLogin, getArtist, getArtistById, deleteAccount } = require('../controllers/Auth/Auth')
const { authMiddleware } = require('../../middlewares/authMiddleware')

const validate = (req, res, next) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() })
  }
  next()
}

// POST /api/artist/auth/send-otp — { mobileNumber } — send OTP (for future real SMS)
router.post(
  '/send-otp',
  [body('mobileNumber').notEmpty().matches(/^\+\d{1,3}\d{9,15}$/)],
  validate,
  sendOtp,
)

// POST /api/artist/auth — { mobileNumber, otp } — login or auto-register
router.post(
  '/',
  [
    body('mobileNumber').notEmpty().matches(/^\+\d{1,3}\d{9,15}$/),
    body('otp').notEmpty().isString(),
  ],
  validate,
  registerOrLogin,
)

router.get('/get-artist', authMiddleware(['artist']), getArtist)
router.get('/get-artist/:artistId', authMiddleware(['host', 'artist', 'admin']), getArtistById)
router.delete('/delete-account', authMiddleware(['artist']), deleteAccount)

module.exports = router
