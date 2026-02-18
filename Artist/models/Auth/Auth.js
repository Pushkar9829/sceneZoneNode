const mongoose = require('mongoose')

const artistAuthenticationSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      default: '',
    },
    mobileNumber: {
      type: String,
      required: true,
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      default: 'artist',
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    isProfileComplete: {
      type: Boolean,
      default: false,
    },
    firebaseUid: {
      type: String,
      default: null,
    },
  },
  { timestamps: true },
)

module.exports = mongoose.model(
  'ArtistAuthentication',
  artistAuthenticationSchema,
)
