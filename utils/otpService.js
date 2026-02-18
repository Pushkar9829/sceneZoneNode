/**
 * OTP sending service.
 * Sends OTP via Msg91 (DLT-compliant) when MSG91_AUTH_KEY is set.
 */

const otpStore = require('./otpStore')

const MSG91_FLOW_URL = 'https://api.msg91.com/api/v5/flow/'
const DEFAULT_SENDER_ID = 'SCNZNE'
// Use Flow ID from Msg91 panel (SMS → Flow → click your flow), NOT the DLT Template ID.
// If you only have DLT Template ID, create a Flow in Msg91 and map that DLT template to get a Flow ID.
const DEFAULT_FLOW_ID = '1207176979429239004'

function generateOtp(length = 6) {
  const digits = '0123456789'
  let otp = ''
  for (let i = 0; i < length; i++) {
    otp += digits[Math.floor(Math.random() * 10)]
  }
  return otp
}

/**
 * Normalize mobile to Msg91 format: 91xxxxxxxxxx (digits only, India country code).
 * @param {string} mobileNumber - E.164 (+919876543210) or 9876543210
 */
function normalizeMobile(mobileNumber) {
  const digits = String(mobileNumber).replace(/\D/g, '')
  if (digits.length === 10) return '91' + digits
  if (digits.length === 12 && digits.startsWith('91')) return digits
  return digits
}

/**
 * Send OTP to the given mobile number via Msg91 Flow API (DLT template).
 * Template: "Your OTP for login to SceneZone app is #var#. Regards, Team SceneZone"
 * @param {string} mobileNumber - E.164 format (e.g. +919876543210) or 10-digit
 * @param {string} otp - 6-digit OTP
 * @returns {Promise<void>}
 * @throws {Error} when Msg91 API returns error
 */
async function sendOtp(mobileNumber, otp) {
  const authKey = process.env.MSG91_AUTH_KEY
  if (!authKey) {
    console.log(`[OTP] MSG91_AUTH_KEY not set. Would send to ${mobileNumber}: ${otp}`)
    return
  }

  // MSG91_FLOW_ID = Flow ID from panel (SMS → Flow → your flow). MSG91_DLT_TEMPLATE_ID kept for backward compat.
  const flowId = process.env.MSG91_FLOW_ID || process.env.MSG91_DLT_TEMPLATE_ID || DEFAULT_FLOW_ID
  const sender = process.env.MSG91_SENDER_ID || DEFAULT_SENDER_ID
  const mobiles = normalizeMobile(mobileNumber)
  // Template has #var# — send OTP under all common keys so Msg91 replaces #var# (set MSG91_OTP_VAR_NAME to send only one).
  const otpVarName = process.env.MSG91_OTP_VAR_NAME
  const recipient = { mobiles }
  if (otpVarName) {
    recipient[otpVarName] = otp
  } else {
    recipient.var = otp
    recipient.VAR1 = otp
    recipient['#var#'] = otp
  }

  const body = {
    flow_id: flowId,
    sender,
    recipients: [recipient],
  }

  const res = await fetch(MSG91_FLOW_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      authkey: authKey,
    },
    body: JSON.stringify(body),
  })

  const data = await res.json().catch(() => ({}))
  if (data.type === 'error' || !res.ok) {
    const errMsg = data.message || data.msg || res.statusText || 'Unknown error'
    console.error('[OTP] Msg91 error:', errMsg, data)
    throw new Error(errMsg)
  }
  // Log request ID so you can check delivery in Msg91 → Delivery Report
  console.log(`[OTP] Sent to ${mobiles} via Msg91. Request ID: ${data.message || data.request_id || 'n/a'}. If SMS not received, use this ID in Msg91 delivery report and ensure Flow ID is from panel (not DLT Template ID).`)
}

/**
 * Generate OTP, store it, and send it. Used by send-otp endpoints.
 */
async function createAndSendOtp(mobileNumber) {
  const otp = generateOtp(6)
  otpStore.set(mobileNumber, otp)
  await sendOtp(mobileNumber, otp)
  return otp
}

/**
 * Verify OTP for a mobile number. Returns true if valid and consumes the OTP.
 */
function verifyOtp(mobileNumber, otp) {
  return otpStore.consume(mobileNumber, otp)
}

module.exports = {
  generateOtp,
  sendOtp,
  createAndSendOtp,
  verifyOtp,
}
