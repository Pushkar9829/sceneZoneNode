const Admin = require('../../models/Auth/Auth')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcryptjs')
const { apiResponse } = require('../../../utils/apiResponse')

const JWT_SECRET = process.env.JWT_SECRET

exports.login = async (req, res) => {
  if (!JWT_SECRET) {
    console.error('FATAL: JWT_SECRET is not defined.')
    return res
      .status(500)
      .json({ success: false, message: 'Internal Server Error' })
  }

  const { email, password } = req.body

  try {
    const admin = await Admin.findOne({ email })

    if (!admin) {
      return apiResponse(res, {
        success: false,
        message: 'Invalid Credentials',
        statusCode: 404,
      })
    }

    const isMatch = await bcrypt.compare(password, admin.password)

    if (!isMatch) {
      return apiResponse(res, {
        success: false,
        message: 'Invalid Credentials',
        statusCode: 400,
      })
    }

    const token = jwt.sign(
      { adminId: admin._id, role: admin.role },
      JWT_SECRET,
      {expiresIn: '7d'}
    )

    const adminResponse = admin.toObject()
    delete adminResponse.password

    res.setHeader('Authorization', `Bearer ${token}`)

    return apiResponse(res, {
      message: 'Login successful',
      data: { token: token, admin: adminResponse },
    })
  } catch (error) {
    console.error('[login] Error while logging Admin:', error)
    return apiResponse(res, {
      success: false,
      message: 'Login failed',
      data: { error: error.message },
      statusCode: 500,
    })
  }
}
