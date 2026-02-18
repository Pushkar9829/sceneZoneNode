/**
 * In-memory OTP store (per mobile number).
 * For production with multiple servers, use Redis or similar so all instances see the same OTP.
 */

const store = new Map()
const OTP_TTL_MS = 5 * 60 * 1000 // 5 minutes

function key(mobileNumber) {
  return String(mobileNumber).trim()
}

function set(mobileNumber, otp) {
  const k = key(mobileNumber)
  store.set(k, {
    otp: String(otp),
    expiresAt: Date.now() + OTP_TTL_MS,
  })
}

function get(mobileNumber) {
  const k = key(mobileNumber)
  const entry = store.get(k)
  if (!entry) return null
  if (Date.now() > entry.expiresAt) {
    store.delete(k)
    return null
  }
  return entry.otp
}

function consume(mobileNumber, otp) {
  const stored = get(mobileNumber)
  if (!stored || stored !== String(otp)) return false
  store.delete(key(mobileNumber))
  return true
}

module.exports = {
  set,
  get,
  consume,
  OTP_TTL_MS,
}
