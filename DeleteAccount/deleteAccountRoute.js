const express = require('express')
const router = express.Router()
const { body, validationResult } = require('express-validator')
const { deleteAccount } = require('./deleteAccountController')

// Middleware for validation errors
const validate = (req, res, next) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() })
  }
  next()
}

router.delete(
  '/',
  [
    body('mobileNumber')
      .notEmpty()
      .matches(/^\+\d{1,3}\d{9,15}$/),
    body('role').notEmpty().isIn(['artist', 'host']),
    body('password').isLength({ min: 8 }),
  ],
  validate,
  deleteAccount,
)

module.exports = router
