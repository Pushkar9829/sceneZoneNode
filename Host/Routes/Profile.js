const express = require('express')
const router = express.Router()
const multer = require('multer')
const {
  createHostProfile,
  deleteHostProfile,
  getHostProfile,
  updateHostProfile,
} = require('../controllers/Profile/profile')
const { authMiddleware } = require('../../middlewares/authMiddleware')
const upload = multer()

router.get('/get-profile', authMiddleware(['host', 'admin']), getHostProfile)

router.post(
  '/create-profile',
  authMiddleware(['host', 'admin']),
  upload.single('profileImageUrl'),
  createHostProfile,
)

router.patch(
  '/update-profile',
  authMiddleware(['host', 'admin']),
  upload.single('profileImageUrl'),
  updateHostProfile,
)

router.delete(
  '/delete-profile',
  authMiddleware(['host', 'admin']),
  deleteHostProfile,
)

module.exports = router
