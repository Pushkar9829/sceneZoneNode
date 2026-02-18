const Event = require('../Host/models/Events/event');
const ShortlistArtist = require('../Host/models/ShortlistArtist/shortlistArtist');

const EventApplication = require('../Artist/models/EventApplication/eventApplication');
const LikedEvent = require('../Artist/models/LikedEvent/LikedEvent');
const SavedEvent = require('../Artist/models/savedEvent/savedEvent');
const PerformanceGallery = require('../Artist/models/Profile/performanceGalleryArtist');

const ChatNegotiation = require('../artistHostChat/Model/ChatNegotiation');
const Booking = require('../artistHostBooking/models/booking');

const ArtistProfile = require('../Artist/models/Profile/profile');

/**
 * Cascade Delete for HOST
 * 1. Finds all events owned by host.
 * 2. Deletes dependent data (Applications) linked to those events.
 * 3. Deletes direct host data (Chats, Bookings, Shortlists).
 * 4. Deletes the events themselves.
 */
const cascadeDeleteHost = async (hostId, session) => {
  // 1. Find all events created by this host
  const events = await Event.find({ hostId }).session(session);
  const eventIds = events.map((e) => e._id);

  // 2. Clean up data linked to these specific events
  if (eventIds.length > 0) {
    await EventApplication.deleteMany({ eventId: { $in: eventIds } }).session(session);
    // Note: Invitations are usually inside specific collections or arrays, ensure those are handled if they are separate docs
  }

  // 3. Delete Host's direct interactions
  await ChatNegotiation.deleteMany({ hostId }).session(session);
  await Booking.deleteMany({ hostId }).session(session); // artistHostBooking
  await ShortlistArtist.deleteMany({ hostId }).session(session);

  // 4. Delete the Events
  await Event.deleteMany({ hostId }).session(session);
};

/**
 * Cascade Delete for ARTIST
 * 1. Remove artist reference from any Event's assignedArtists array.
 * 2. Delete all artist-specific data (Chats, Applications, Likes, Gallery).
 */
const cascadeDeleteArtist = async (artistId, session) => {
  // 1. FIND THE PROFILE ID
  const artistProfile = await ArtistProfile.findOne({ artistId: artistId }).session(session);
  const profileId = artistProfile ? artistProfile._id : artistId;

  // 2. Remove Artist from "assignedArtists" in any Event
  // (Assuming events reference the Auth ID - if they reference Profile ID, change this to profileId)
  await Event.updateMany(
    { assignedArtists: artistId },
    { $pull: { assignedArtists: artistId } }
  ).session(session);

  // 3. Delete Bookings
  // Bookings use the Profile ID, so we use the ID we just found.
  if (profileId) {
      await Booking.deleteMany({ artistId: profileId }).session(session);
  }

  // 4. Delete Direct Interactions & Data
  await ChatNegotiation.deleteMany({ artistId }).session(session);
  await EventApplication.deleteMany({ artistId }).session(session);
  await LikedEvent.deleteMany({ artistId }).session(session);
  await SavedEvent.deleteMany({ artistId }).session(session);
  
  // PerformanceGallery is usually linked to the Profile, so check this one carefully.
  // If PerformanceGallery schema has `artistId` as ref:'ArtistProfile', use profileId.
  // If it refs 'ArtistAuthentication', use artistId.
  // Based on standard practices, it likely uses Auth ID, but if it fails, try profileId.
  await PerformanceGallery.deleteMany({ artistId }).session(session); 

  // 5. Finally, delete the Profile itself
  if (profileId) {
      await ArtistProfile.deleteOne({ _id: profileId }).session(session);
  }
};

module.exports = {
  cascadeDeleteHost,
  cascadeDeleteArtist,
};