const mongoose = require('mongoose')

const artistProfileSchema = new mongoose.Schema({
  artistId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ArtistAuthentication',
    required: true,
  },
  profileImageUrl: {
    type: String,
    default: null,
  },
  dob: {
    type: Date,
    required: true,
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    unique: true,
  },
  address: {
    type: String,
    required: true,
    trim: true,
  },
  artistType: {
    type: String,
    required: true,
    trim: true,
  },
  artistSubType: {
    type: String,
    default: null,
    trim: true,
  },
  instrument: {
    type: String,
    default: null,
    trim: true,
  },
  budget: {
    type: Number,
    required: true,
    min: 0,
  },
  upiId: {
    type: String,
    trim: true,
    default: null,
  },
  razorpayAccountId: {
    type: String,
    trim: true,
    default: null,
  },
  contactNumber: {
    type: String,
    trim: true,
    default: null,
  },
  isCrowdGuarantee: {
    type: Boolean,
    default: false,
  },
  isNegotiaitonAvailable: {
    type: Boolean,
    default: true,
  },
  performanceUrlId: {
    type: [mongoose.Schema.Types.ObjectId],
    ref: 'ArtistPerformanceGallery',
  },
  // isShortlisted:{
  //   type:Boolean,
  //   default:false
  // },
  // AssignedEvents:[
  //   {
  //     type:mongoose.Schema.Types.ObjectId,
  //     ref:"Event"
  //   }
  // ],
  //average rating
  Rating: {
    type: Number,
    default: 0,
  },
  allRating: {
    type: [
      {
        hostId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'HostAuthentication',
        },
        rating: {
          type: Number,
          min: 1,
          max: 5,
        },
      },
    ],
    default: [],
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
  },
})

module.exports = mongoose.model('ArtistProfile', artistProfileSchema)
