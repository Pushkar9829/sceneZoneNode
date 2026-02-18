# OTP flow – Msg91 (DLT) integration

## Current behaviour

- **Send OTP:** `POST /api/artist/auth/send-otp` or `POST /api/host/auth/send-otp` with `{ mobileNumber }`.
  - Generates a 6-digit OTP, stores it in memory for 5 minutes, and sends SMS via **Msg91 Flow API** (DLT template) when `MSG91_AUTH_KEY` is set.
- **Verify & login/register:** `POST /api/artist/auth` or `POST /api/host/auth` with `{ mobileNumber, otp }`.
  - Accepts either the **hardcoded dev OTP `123456`** or the **OTP stored** when you called send-otp.

## Msg91 (DLT) setup

OTP is sent using the SceneZone DLT template: *"Your OTP for login to SceneZone app is ##var##. Regards, Team SceneZone"*.

1. In your **`.env`** add:

```
MSG91_AUTH_KEY=your_msg91_auth_key
# Flow ID from Msg91 panel (SMS → Flow → click your flow → use that Template/Flow ID). Not the DLT Template ID.
MSG91_FLOW_ID=your_flow_id_from_panel
# Optional:
# MSG91_SENDER_ID=SCNZNE
# If your flow variable for OTP is "var" not VAR1: MSG91_OTP_VAR_NAME=var
```

2. If `MSG91_AUTH_KEY` is not set, OTP is only logged to the console (no SMS).

### Error: "Template ID Missing or Invalid Template"

This means the value sent as `flow_id` is not a valid **Flow ID** in Msg91. **Do not use the DLT Template ID** (e.g. 1207176979429239004) in the API — use the **Flow ID** from the panel.

**Fix:**

1. In **Msg91** go to **SMS** → **Flow** (or **Templates** / **Send SMS via Flow**).
2. Find the flow that uses your OTP template (or create one):
   - **Add Flow** → set Flow Name, Sender ID (e.g. SCNZNE), and the template text with a variable (e.g. `Your OTP for login to SceneZone app is ##var##. Regards, Team SceneZone`).
   - When creating the flow, add a variable (e.g. name it **VAR1** or **var**) for the OTP.
   - **Map** your approved DLT Template ID (1207176979429239004) to this flow as per Msg91’s “Map DLT Template Id with Flow Id” steps.
3. Open that flow — the **Flow ID** (or Template ID) shown there is often a short alphanumeric string (e.g. `5f8a2b1c4d6e...`), **not** the 20-digit DLT number.
4. In your `.env` set:  
   `MSG91_FLOW_ID=<that_flow_id>`  
   (no quotes, no spaces).
5. Restart the backend and send OTP again.

### No SMS received (API returns success)

- **Use Flow ID, not DLT Template ID.** See **"Template ID Missing or Invalid Template"** above.
- **Variable name:** The code sends the OTP in a variable named **VAR1** by default. If your flow uses **var**, set `MSG91_OTP_VAR_NAME=var` in `.env`.
- **Delivery report:** Use the request ID from the server log in Msg91 **Delivery Report** to see the exact failure reason.
- **Sender ID:** Must match the flow and DLT (e.g. SCNZNE). Set `MSG91_SENDER_ID` if different.

### Example: Twilio (alternative)

To use Twilio instead, set Twilio env vars and change `utils/otpService.js` to call Twilio in `sendOtp` (see git history or Twilio docs).

## Production: multiple servers

The in-memory store in **`utils/otpStore.js`** is per process. For multiple backend instances, use a shared store (e.g. **Redis**) with the same interface: `set(mobileNumber, otp)`, `consume(mobileNumber, otp)`.

## Postman config

**Base URL:** `http://localhost:5000` (or your `PORT` from `.env`)

| Method | URL | Body (JSON) | Notes |
|--------|-----|-------------|--------|
| POST | `{{baseUrl}}/api/artist/auth/send-otp` | `{ "mobileNumber": "+919876543210" }` | Send OTP to artist number. `mobileNumber` must be E.164: `+` then country code then 9–15 digits. |
| POST | `{{baseUrl}}/api/artist/auth` | `{ "mobileNumber": "+919876543210", "otp": "123456" }` | Verify OTP & login/register (Artist). Use OTP from SMS or dev `123456`. Response includes `Authorization: Bearer <token>`. |
| POST | `{{baseUrl}}/api/host/auth/send-otp` | `{ "mobileNumber": "+919876543210" }` | Send OTP to host number. |
| POST | `{{baseUrl}}/api/host/auth` | `{ "mobileNumber": "+919876543210", "otp": "123456" }` | Verify OTP & login/register (Host). Response includes `Authorization: Bearer <token>`. |

**Postman collection:** Import **`postman/SceneZone-OTP-Auth.postman_collection.json`** (see repo). Set collection variable `baseUrl` = `http://localhost:5000` if needed.

**Flow:** 1) Call **send-otp** with `mobileNumber` → 2) User gets SMS (or use `123456` in dev) → 3) Call **auth** with same `mobileNumber` and `otp` → 4) Use the returned JWT in `Authorization: Bearer <token>` for protected routes.

## Disabling dev OTP (123456)

To accept only OTPs sent via send-otp (no hardcoded 123456), in Artist and Host `controllers/Auth/Auth.js` remove the `HARDCODED_OTP` check and keep only `otpService.verifyOtp(mobileNumber, otp)`.
