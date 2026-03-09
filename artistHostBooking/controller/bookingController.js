const Razorpay = require('razorpay')
const crypto = require('crypto')
const Booking = require('../models/booking')
const Event = require('../../Host/models/Events/event')
const ArtistProfile = require('../../Artist/models/Profile/profile')
const NotificationService = require('../../Notification/controller/notificationService')
// Initialize Razorpay instance
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
})

// @desc    Create a Razorpay order
// @route   POST /api/bookings/create-order
// @access  Private
const createOrder = async (req, res) => {
  const { amount, currency, eventId, artistId } = req.body
  console.log('Create order request received:', {
    amount,
    currency,
    eventId,
    artistId,
    timestamp: new Date().toISOString(),
  })

  if (!amount || !currency || !eventId || !artistId) {
    console.error('Validation failed for create-order:', {
      hasAmount: !!amount,
      hasCurrency: !!currency,
      hasEventId: !!eventId,
      hasArtistId: !!artistId,
      timestamp: new Date().toISOString(),
    })
    return res.status(400).json({ success: false, message: 'Missing required fields' })
  }

  if (!Number.isInteger(amount) || amount <= 0) {
    console.error('Invalid amount:', { amount, timestamp: new Date().toISOString() })
    return res.status(400).json({ success: false, message: 'Amount must be a positive integer in paise' })
  }

  try {
    const options = {
      amount, // Amount in paise
      currency,
      receipt: `booking_${Date.now()}`,
    }
    console.log('Creating Razorpay order with options:', {
      options,
      timestamp: new Date().toISOString(),
    })

    const order = await razorpay.orders.create(options)
    console.log('Razorpay order created:', {
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      timestamp: new Date().toISOString(),
    })

    res.status(200).json({
      success: true,
      data: {
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
      },
    })
  } catch (error) {
    console.error('Error creating Razorpay order:', {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    })
    return res.status(500).json({ success: false, message: 'Failed to create order' })
  }
}

// @desc    Verify Razorpay payment and create booking
// @route   POST /api/bookings/verify-payment
// @access  Private
const verifyPayment = async (req, res) => {
  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    eventId,
    artistId,
    invoices,
  } = req.body
  const hostId = req.user.hostId
  console.log('Verify payment request received:', {
    razorpay_order_id,
    razorpay_payment_id,
    eventId,
    artistId,
    invoices,
    hostId,
    timestamp: new Date().toISOString(),
  })

  // Validate input
  if (
    !razorpay_order_id ||
    !razorpay_payment_id ||
    !razorpay_signature ||
    !eventId ||
    !artistId ||
    !invoices ||
    invoices.total == null ||
    invoices.total === ''
  ) {
    console.error('Validation failed for verify-payment:', {
      hasOrderId: !!razorpay_order_id,
      hasPaymentId: !!razorpay_payment_id,
      hasEventId: !!eventId,
      hasArtistId: !!artistId,
      hasInvoices: !!invoices,
      hasTotal: invoices?.total != null,
      timestamp: new Date().toISOString(),
    })
    return res.status(400).json({ success: false, message: 'Missing required fields' })
  }

  const totalNum = Number(invoices.total)
  if (isNaN(totalNum) || totalNum <= 0) {
    console.error('Invalid invoices.total:', { total: invoices.total, timestamp: new Date().toISOString() })
    return res.status(400).json({ success: false, message: 'Invalid total amount' })
  }

  // Normalize invoice fields (accept camelCase from app)
  const subtotal = Number(invoices.subtotal) || 0
  const platform_fees = Number(invoices.platform_fees ?? invoices.platformFees) || 0
  const taxes = Number(invoices.taxes ?? invoices.tax) || 0
  const total = totalNum

  // Verify Razorpay signature
  const generatedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest('hex')
  console.log('Signature verification:', {
    generatedSignature,
    razorpay_signature,
    timestamp: new Date().toISOString(),
  })

  if (generatedSignature !== razorpay_signature) {
    console.error('Invalid payment signature:', {
      timestamp: new Date().toISOString(),
    })
    return res.status(400).json({ success: false, message: 'Invalid payment signature' })
  }

  // Validate event and artist existence
  console.log('Validating event:', {
    eventId,
    timestamp: new Date().toISOString(),
  })
  const event = await Event.findById(eventId)
  console.log('Event lookup result:', {
    event: event ? event._id : null,
    timestamp: new Date().toISOString(),
  })
  if (!event) {
    console.error('Event not found:', { eventId, timestamp: new Date().toISOString() })
    return res.status(404).json({ success: false, message: 'Event not found' })
  }

  console.log('Validating artist:', {
    artistId,
    timestamp: new Date().toISOString(),
  })
  const artist = await ArtistProfile.findOne({ artistId: artistId })
  console.log('Artist lookup result:', {
    artist: artist ? artist._id : null,
    timestamp: new Date().toISOString(),
  })
  if (!artist) {
    console.error('Artist not found:', { artistId, timestamp: new Date().toISOString() })
    return res.status(404).json({ success: false, message: 'Artist not found' })
  }

  // Start a session for atomic updates
  const session = await Booking.startSession()
  session.startTransaction()

  try {
    console.log('Attempting to create booking:', {
      artistId,
      hostId,
      eventId,
      invoices,
      timestamp: new Date().toISOString(),
    })
    const booking = await Booking.create(
      [
        {
          artistId,
          hostId,
          eventId,
          date_time: new Date(),
          invoices: {
            subtotal,
            platform_fees,
            taxes,
            total,
          },
          payment_status: 'completed',
          razorpay_order_id,
          razorpay_payment_id,
        },
      ],
      { session },
    )
    console.log('Booking created:', {
      bookingId: booking[0]._id,
      timestamp: new Date().toISOString(),
    })

    console.log('Updating event with artist:', {
      eventId,
      artistId,
      timestamp: new Date().toISOString(),
    })
    const updatedEvent = await Event.findByIdAndUpdate(
      eventId,
      { $addToSet: { assignedArtists: artistId } },
      { session, new: true },
    )
    console.log('Event updated with artist:', {
      eventId,
      artistId,
      assignedArtists: updatedEvent.assignedArtists,
      timestamp: new Date().toISOString(),
    })

    await session.commitTransaction()
    session.endSession()

    // Create notifications for both host and artist
    try {
      // Notification for artist
      const artistNotificationData = {
        recipientId: artistId,
        recipientType: 'artist',
        senderId: hostId,
        senderType: 'host',
        title: `Booking Confirmed!`,
        body: `Your booking for "${event.eventName}" has been confirmed and payment received`,
        type: 'booking_confirmed',
        data: {
          bookingId: booking[0]._id,
          eventId: eventId,
          amount: invoices.total,
        },
      }

      // Notification for host
      const hostNotificationData = {
        recipientId: hostId,
        recipientType: 'host',
        senderId: artistId,
        senderType: 'artist',
        title: `Payment Received!`,
        body: `Payment of ₹${invoices.total} received for "${event.eventName}" booking`,
        type: 'payment_received',
        data: {
          bookingId: booking[0]._id,
          eventId: eventId,
          amount: invoices.total,
        },
      }

      await Promise.all([
        NotificationService.createAndSendNotification(artistNotificationData),
        NotificationService.createAndSendNotification(hostNotificationData),
      ])

      console.log(
        `[${new Date().toISOString()}] Notifications created for booking ${booking[0]._id}`,
      )
    } catch (notificationError) {
      console.error(
        `[${new Date().toISOString()}] Error creating notifications:`,
        notificationError,
      )
      // Don't fail the request if notification fails
    }

    res.status(201).json({
      success: true,
      data: booking[0],
    })
  } catch (error) {
    await session.abortTransaction()
    session.endSession()
    console.error('Error verifying payment or creating booking:', {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    })
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to verify payment or create booking',
    })
  }
}

// @desc    Get all events assigned to the current artist
// @route   GET /api/bookings/assigned-events
// @access  Private (artist)
const getAssignedEventsForArtist = async (req, res) => {
  try {
    console.log('Starting getAssignedEventsForArtist function')
    const artistId = req.user.artistId
    console.log('Extracted artistId:', artistId)

    if (!artistId) {
      console.log('Artist ID not found in token, returning 400')
      return res
        .status(400)
        .json({ success: false, message: 'Artist ID not found in token.' })
    }

    // Find all events where this artist is assigned
    console.log('Querying events for artistId:', artistId)
    const events = await Event.find({ assignedArtists: artistId }).lean()
    console.log('Found events:', events)

    res.status(200).json({ success: true, data: events })
    console.log('Response sent successfully')
  } catch (error) {
    console.error('Error fetching assigned events for artist:', error)
    res
      .status(500)
      .json({
        success: false,
        message: 'Failed to fetch assigned events',
        error: error.message,
      })
    console.log('Error response sent')
  }
}

const getAllBookings = async (req, res) => {
  try {
    console.log('Starting getAllBookings function')

    // Fetch all bookings from the database
    const bookings = await Booking.find().lean()
    console.log(`Found ${bookings.length} bookings`)

    res.status(200).json({ success: true, data: bookings })
    console.log('Response sent successfully')
  } catch (error) {
    console.error('Error fetching all bookings:', error)
    res
      .status(500)
      .json({
        success: false,
        message: 'Failed to fetch bookings',
        error: error.message,
      })
    console.log('Error response sent')
  }
}

module.exports = {
  createOrder,
  verifyPayment,
  getAssignedEventsForArtist,
  getAllBookings,
}
