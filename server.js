const express = require('express')
const cors = require('cors')
const http = require('http')
const { Server } = require('socket.io')
require('dotenv').config()
const connectDB = require('./config/db')


// Artist Routes
const artistAuthentication = require('./Artist/Routes/Auth')
const artistProfile = require('./Artist/Routes/profile')
const performanceGalleryRoutes = require('./Artist/Routes/performanceGalleryRoutes')
const respondToInvitation = require('./Artist/Routes/respondInvite')
const eventApplication = require('./Artist/Routes/eventApplication')
const artistEvents = require('./Artist/Routes/event')
const filterEvents = require('./Artist/Routes/filter')
const rateEvent = require('./Artist/Routes/Rating')
const likedEventRoutes = require('./Artist/Routes/likedEventRoutes')
const savedEventRoutes = require('./Artist/Routes/savedEvent')

// Host Routes
const hostAuthentication = require('./Host/Routes/Auth')
const hostProfile = require('./Host/Routes/Profile')
const events = require('./Host/Routes/Event')
const shortlistArtist = require('./Host/Routes/shortlistArtist')
const sendInvitation = require('./Host/Routes/invitation')
const artistFilter = require('./Host/Routes/Filter')
const hostPaymentDetails = require('./Host/Routes/paymentDetails')
const rateArtist = require('./Host/Routes/Rating')

// Admin Routes
const adminAuthentication = require('./Admin/Routes/Auth')
const adminVerify = require('./Admin/Routes/Verification')
const createUser = require('./Admin/Routes/createUser')
const filterUsers = require('./Admin/Routes/filter')
const appUsers = require('./Admin/Routes/allUsers')
const updateArtistRoutes = require('./Admin/Routes/updateArtist')
const bannerRoutes = require('./Admin/Routes/banner')

const invoiceRoutes = require('./artistHostBooking/routes/invoiceRoutes')
const bookingRoutes = require('./artistHostBooking/routes/bookingRoutes')
const chatNegotiationRoutes = require('./artistHostChat/Routes/chatNegotiationRoutes')
const notificationRoutes = require('./Notification/routes/notificationRoutes')

// Event Host Routes
const eventHostInvoiceRoutes = require('./eventHostBooking/routes/adminRoutes')

const deleteAccountRoute = require("./DeleteAccount/deleteAccountRoute")

const app = express()
const server = http.createServer(app)
const io = new Server(server, {
  cors: {
    origin: [
      'http://localhost:3000',
      'http://localhost:8081',
      'https://api.thescenezone.com',
      'http://api.thescenezone.com',
    ],
    methods: ['GET', 'POST'],
    credentials: true,
  },
})

const PORT = process.env.PORT || 5000

// Database Connection
connectDB()

// Middleware
app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Global request logger
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`)
  console.log('Request body:', req.body)
  console.log('Request headers:', req.headers)
  next()
})

// Socket.IO Connection Handling
io.on('connection', (socket) => {
  console.log(`[${new Date().toISOString()}] User connected: ${socket.id}`)
  
  socket.join(socket.id)
  console.log(`[${new Date().toISOString()}] User ${socket.id} joined their own room`)
  
  // Join a room based on user ID (must match hostId/artistId string used in io.to())
  socket.on('join', (userId) => {
    const room = userId != null ? String(userId) : null
    if (room) {
      socket.join(room)
      socket.data.userId = room
      console.log(`[${new Date().toISOString()}] User joined room: ${room}`)
    } else {
      console.warn(`[${new Date().toISOString()}] Socket join ignored: missing userId`)
    }
  })

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log(`[${new Date().toISOString()}] User disconnected: ${socket.id}`)
  })
})

// Make io accessible in routes
app.set('io', io)

// Root Route
app.get('/', (req, res) => {
  res.send('check that hoe nigga')
})

// Artist Routes
app.use('/api/artist/auth', artistAuthentication)
app.use('/api/artist', [
  artistProfile,
  respondToInvitation,
  eventApplication,
  filterEvents,
  rateEvent,
])
app.use('/api/artist/profile', performanceGalleryRoutes)
app.use('/api/artist/event', [likedEventRoutes, savedEventRoutes])
app.use('/api/artist/events', artistEvents)

// Host Routes
app.use('/api/host/auth', hostAuthentication)
app.use('/api/host', [
  hostProfile,
  shortlistArtist,
  sendInvitation,
  artistFilter,
  hostPaymentDetails,
  rateArtist,
])
app.use('/api/host/events', events)

// Admin Routes
app.use('/api/admin/auth', adminAuthentication)
app.use('/api/admin', [
  adminVerify,
  createUser,
  filterUsers,
  appUsers,
  updateArtistRoutes,
])
app.use('/api/admin/banner', bannerRoutes)
app.use('/api/invoices', invoiceRoutes)
app.use('/api/bookings', bookingRoutes)
app.use('/api/chat', chatNegotiationRoutes)

// Event Host Routes
app.use('/api/eventhost/invoices', eventHostInvoiceRoutes)

// Notification Routes (for all user types)
app.use('/api/notifications', notificationRoutes)

// Public API to delete account
app.use('/api/delete-account', deleteAccountRoute)

// Start Server
server.listen(PORT, '0.0.0.0', () =>
  console.log(`Server running on http://localhost:${PORT}`),
)
