const mongoose = require('mongoose')
const { auth } = require('../../../config/firebase')
const { apiResponse } = require('../../../utils/apiResponse')
const Artist = require('../../models/Auth/Auth')
const ArtistProfile = require('../../models/Profile/profile')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcryptjs')
const { cascadeDeleteArtist } = require('../../../utils/deleteAccountService')

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
    console.error('[Artist.sendOtp] Error:', err)
    return apiResponse(res, { success: false, message: 'Failed to send OTP.', statusCode: 500 })
  }
}

/**
 * Single endpoint: Register or Login (Artist).
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

    let artistUser = await Artist.findOne({ mobileNumber })
    if (artistUser) {
      const token = jwt.sign(
        { artistId: artistUser._id, role: artistUser.role },
        JWT_SECRET,
        { expiresIn: '24h' },
      )
      res.setHeader('Authorization', `Bearer ${token}`)
      const userResponse = artistUser.toObject()
      delete userResponse.password
      return apiResponse(res, {
        success: true,
        message: 'Login successful',
        data: { user: userResponse, isNewUser: false },
      })
    }

    const defaultPassword = await bcrypt.hash(mobileNumber + Date.now(), 10)
    const newArtist = new Artist({
      fullName: '',
      mobileNumber,
      password: defaultPassword,
      role: 'artist',
      isVerified: false,
      isProfileComplete: false,
    })
    await newArtist.save()
    const token = jwt.sign(
      { artistId: newArtist._id, role: newArtist.role },
      JWT_SECRET,
      { expiresIn: '24h' },
    )
    res.setHeader('Authorization', `Bearer ${token}`)
    const userResponse = newArtist.toObject()
    delete userResponse.password
    return apiResponse(res, {
      success: true,
      statusCode: 201,
      message: 'Account created. Login successful.',
      data: { user: userResponse, isNewUser: true },
    })
  } catch (error) {
    console.error('[Artist.registerOrLogin] Error:', error)
    return apiResponse(res, {
      success: false,
      message: 'Authentication failed',
      error: error.message,
      statusCode: 500,
    })
  }
}

exports.getArtist = async (req, res) => {
  try {
    const artistId = req.user.artistId
    const artistUser = await Artist.findById(artistId).select('-password')
    if (!artistUser) {
      return apiResponse(res, { success: false, message: 'Artist not found', statusCode: 404 })
    }
    const artistProfile = await ArtistProfile.findOne({ artistId })
    if (!artistProfile) {
      return apiResponse(res, { success: false, message: 'Artist profile not found', statusCode: 404 })
    }
    const artistData = { ...artistUser.toObject(), profile: artistProfile.toObject() }
    return apiResponse(res, { success: true, message: 'Artist fetched successfully', data: artistData })
  } catch (error) {
    console.error('Get artist error:', error)
    return apiResponse(res, { success: false, message: 'Failed to fetch artist', error: error.message, statusCode: 500 })
  }
}

exports.getArtistById = async (req, res) => {
  try {
    const { artistId } = req.params
    const artistUser = await Artist.findById(artistId).select('-password')
    if (!artistUser) {
      return apiResponse(res, { success: false, message: 'Artist not found', statusCode: 404 })
    }
    const artistProfile = await ArtistProfile.findOne({ artistId })
    if (!artistProfile) {
      return apiResponse(res, { success: false, message: 'Artist profile not found', statusCode: 404 })
    }
    const artistData = {
      _id: artistUser._id,
      fullName: artistUser.fullName,
      mobileNumber: artistUser.mobileNumber,
      email: artistProfile.email,
      profileImageUrl: artistProfile.profileImageUrl,
    }
    return apiResponse(res, { success: true, message: 'Artist details fetched successfully', data: artistData })
  } catch (error) {
    console.error('Get artist by ID error:', error)
    return apiResponse(res, { success: false, message: 'Failed to fetch artist details', error: error.message, statusCode: 500 })
  }
}

exports.deleteAccount = async (req, res) => {
  const session = await mongoose.startSession()
  session.startTransaction()
  try {
    const artistId = req.user.artistId
    const artistDoc = await Artist.findById(artistId).session(session)
    if (!artistDoc) {
      await session.abortTransaction()
      session.endSession()
      return apiResponse(res, { success: false, message: 'Artist not found', statusCode: 404 })
    }
    await cascadeDeleteArtist(artistId, session)
    await ArtistProfile.deleteOne({ artistId }).session(session)
    await Artist.findByIdAndDelete(artistId).session(session)
    await session.commitTransaction()
    session.endSession()
    if (artistDoc.firebaseUid) {
      try {
        await auth.deleteUser(artistDoc.firebaseUid)
      } catch (e) {
        console.warn('[Artist.deleteAccount] Firebase delete warning:', e.message)
      }
    }
    return apiResponse(res, { success: true, message: 'Artist account and related data deleted successfully' })
  } catch (error) {
    await session.abortTransaction()
    session.endSession()
    console.error('Delete artist error:', error)
    return apiResponse(res, { success: false, message: 'Failed to delete artist account', error: error.message, statusCode: 500 })
  }
}
