const mongoose = require('mongoose')
const { auth } = require('../../../config/firebase')
const { apiResponse } = require('../../../utils/apiResponse')
const Host = require('../../models/Auth/Auth')
const HostProfile = require('../../models/Profile/profile')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcryptjs')
const { cascadeDeleteHost } = require('../../../utils/deleteAccountService')

const JWT_SECRET = process.env.JWT_SECRET
const HARDCODED_OTP = '123456'
const otpService = require('../../../utils/otpService')

/**
 * Send OTP to mobile number. Call this when user enters number (before Verify OTP screen).
 * In future: wire otpService.sendOtp to Twilio / MSG91 / Firebase.
 */
exports.sendOtp = async (req, res) => {
  const { mobileNumber } = req.body
  if (!mobileNumber) {
    return apiResponse(res, { success: false, statusCode: 400, message: 'mobileNumber is required.' })
  }
  try {
    await otpService.createAndSendOtp(mobileNumber)
    return apiResponse(res, { success: true, message: 'OTP sent successfully.' })
  } catch (err) {
    console.error('[Host.sendOtp] Error:', err)
    return apiResponse(res, { success: false, message: 'Failed to send OTP.', statusCode: 500 })
  }
}

/**
 * Single endpoint: Register or Login (Host).
 * Number + OTP only. If user exists → login; else create user and login (no name/password required).
 * OTP: use hardcoded 123456 (dev) or the OTP sent via sendOtp (real SMS in future).
 */
exports.registerOrLogin = async (req, res) => {
  const { mobileNumber, otp } = req.body

  if (!JWT_SECRET) {
    return res.status(500).json({ success: false, message: 'Internal Server Error' })
  }

  try {
    const isValidOtp =
      (otp !== undefined && otp !== null && otp === HARDCODED_OTP) ||
      otpService.verifyOtp(mobileNumber, otp)
    if (!isValidOtp) {
      return apiResponse(res, {
        success: false,
        statusCode: 400,
        message: 'Invalid or expired OTP',
      })
    }
    if (!mobileNumber) {
      return apiResponse(res, {
        success: false,
        statusCode: 400,
        message: 'mobileNumber is required.',
      })
    }

    let hostUser = await Host.findOne({ mobileNumber })
    if (hostUser) {
      const token = jwt.sign(
        { hostId: hostUser._id, role: hostUser.role },
        JWT_SECRET,
        { expiresIn: '24h' },
      )
      res.setHeader('Authorization', `Bearer ${token}`)
      const userResponse = hostUser.toObject()
      delete userResponse.password
      return apiResponse(res, {
        success: true,
        message: 'Login successful',
        data: { user: userResponse, isNewUser: false },
      })
    }

    const defaultPassword = await bcrypt.hash(mobileNumber + Date.now(), 10)
    const newHost = new Host({
      fullName: '',
      mobileNumber,
      password: defaultPassword,
      role: 'host',
      isVerified: true,
      isProfileComplete: false,
    })
    await newHost.save()
    const token = jwt.sign(
      { hostId: newHost._id, role: newHost.role },
      JWT_SECRET,
      { expiresIn: '24h' },
    )
    res.setHeader('Authorization', `Bearer ${token}`)
    const userResponse = newHost.toObject()
    delete userResponse.password
    return apiResponse(res, {
      success: true,
      statusCode: 201,
      message: 'Account created. Login successful.',
      data: { user: userResponse, isNewUser: true },
    })
  } catch (error) {
    console.error('[Host.registerOrLogin] Error:', error)
    return apiResponse(res, {
      success: false,
      message: 'Authentication failed',
      error: error.message,
      statusCode: 500,
    })
  }
}

exports.deleteAccount = async (req, res) => {
  const session = await mongoose.startSession()
  session.startTransaction()
  try {
    const hostId = req.user.hostId
    const user = await Host.findById(hostId).session(session)
    if (!user) {
      await session.abortTransaction()
      session.endSession()
      return apiResponse(res, { success: false, message: 'Host not found', statusCode: 404 })
    }
    await cascadeDeleteHost(hostId, session)
    await HostProfile.deleteOne({ hostId }).session(session)
    await Host.findByIdAndDelete(hostId).session(session)
    await session.commitTransaction()
    session.endSession()
    if (user.firebaseUid) {
      try {
        await auth.deleteUser(user.firebaseUid)
      } catch (e) {
        console.warn('[Host.deleteAccount] Firebase delete warning:', e.message)
      }
    }
    return apiResponse(res, { success: true, message: 'Host and all associated data deleted successfully' })
  } catch (error) {
    await session.abortTransaction()
    session.endSession()
    console.error('Delete host error:', error)
    return apiResponse(res, { success: false, message: 'Failed to delete host', error: error.message, statusCode: 500 })
  }
}
