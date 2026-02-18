const mongoose = require('mongoose')

const hostAuthenticationSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      default: '',
    },
    mobileNumber: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      default: 'host',
    },
    password: {
      type: String,
      required: true,
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

module.exports = mongoose.model('HostAuthentication', hostAuthenticationSchema)
