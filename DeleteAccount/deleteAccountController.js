const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')
const { auth } = require('../config/firebase')
const { apiResponse } = require('../utils/apiResponse')

const ArtistAuth = require('../Artist/models/Auth/Auth')
const HostAuth = require('../Host/models/Auth/Auth')

const ArtistProfile = require('../Artist/models/Profile/profile')
const HostProfile = require('../Host/models/Profile/profile')

const {
  cascadeDeleteHost,
  cascadeDeleteArtist,
} = require('../utils/deleteAccountService')

exports.deleteAccount = async (req, res) => {
  const { mobileNumber, role, password } = req.body
  console.log(
    `[DeleteAccount] Attempting to delete: ${mobileNumber} as ${role}`,
  )

  const session = await mongoose.startSession()
  session.startTransaction()

  try {
    let AuthModel, cascadeFunction, profileIdField

    // 1. Configure based on Role
    switch (role) {
      case 'artist':
        AuthModel = ArtistAuth
        ProfileModel = ArtistProfile
        cascadeFunction = cascadeDeleteArtist
        profileIdField = 'artistId'
        break
      case 'host':
        AuthModel = HostAuth
        ProfileModel = HostProfile
        cascadeFunction = cascadeDeleteHost
        profileIdField = 'hostId'
        break
      default:
        return apiResponse(res, {
          success: false,
          message: 'Invalid role specified',
          statusCode: 400,
        })
    }

    // 2. Find the Account
    const account = await AuthModel.findOne({ mobileNumber }).session(session)

    if (!account) {
      await session.abortTransaction()
      session.endSession()
      return apiResponse(res, {
        success: false,
        message: 'Account not found for this mobile number.',
        statusCode: 404,
      })
    }

    // 3. Verify Password (SECURITY CRITICAL)
    const isMatch = await bcrypt.compare(password, account.password)
    if (!isMatch) {
      await session.abortTransaction()
      session.endSession()
      return apiResponse(res, {
        success: false,
        message: 'Invalid password. Deletion denied.',
        statusCode: 401,
      })
    }

    const accountId = account._id
    console.log(
      `[DeleteAccount] Verified ${role} ${accountId}. Starting cascade delete...`,
    )

    // 4. EXECUTE CASCADE DELETE (The Shared Logic)
    await cascadeFunction(accountId, session)

    // 5. Delete the associated profile
    const profileQuery = {};
    profileQuery[profileIdField] = accountId;
    await ProfileModel.deleteOne(profileQuery).session(session);

    // 6. Delete Auth
    await AuthModel.findByIdAndDelete(accountId).session(session)
    console.log(`[DeleteAccount] Deleted Auth entry from DB: ${account._id}`)

    // 7. Commit Transaction
    await session.commitTransaction()
    session.endSession()
    console.log(
      `[DeleteAccount] Database cleanup successful for ${role} ${accountId}`,
    )

    // 8. Cleanup Firebase (After DB success)
    if (account.firebaseUid) {
      try {
        await auth.deleteUser(account.firebaseUid)
        console.log(
          `[DeleteAccount] Firebase user deleted: ${account.firebaseUid}`,
        )
      } catch (firebaseError) {
        console.warn(
          `[DeleteAccount] Firebase delete warning: ${firebaseError.message}`,
        )
      }
    }

    return apiResponse(res, {
      success: true,
      message: 'Account and all related data deleted successfully',
    })
  } catch (error) {
    await session.abortTransaction()
    session.endSession()
    console.error('Delete user error:', error)

    return apiResponse(res, {
      success: false,
      message: 'Failed to delete user account',
      error: error.message,
      statusCode: 500,
    })
  }
}
