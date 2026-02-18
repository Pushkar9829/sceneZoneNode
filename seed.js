const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Admin
const AdminAuth = require('./Admin/models/Auth/Auth');
const HomePageBanner = require('./Admin/models/Banner/Banner');

// Artist
const ArtistAuthentication = require('./Artist/models/Auth/Auth');
const ArtistProfile = require('./Artist/models/Profile/profile');
const EventApplication = require('./Artist/models/EventApplication/eventApplication');
const LikedEvent = require('./Artist/models/LikedEvent/LikedEvent');
const SavedEvent = require('./Artist/models/savedEvent/savedEvent');
const ArtistPerformanceGallery = require('./Artist/models/Profile/performanceGalleryArtist');

// Host
const HostAuthentication = require('./Host/models/Auth/Auth');
const HostProfile = require('./Host/models/Profile/profile');
const Event = require('./Host/models/Events/event');
const ShortlistArtist = require('./Host/models/ShortlistArtist/shortlistArtist');
const EventInvitation = require('./Host/models/InviteArtist/inviteArtist');
const HostPaymentDetails = require('./Host/models/paymentDetails/paymentDetails');

// artistHostBooking
const Invoice = require('./artistHostBooking/models/invoices');
const Booking = require('./artistHostBooking/models/booking');

// artistHostChat
const Chat = require('./artistHostChat/Model/chat');
const ChatNegotiation = require('./artistHostChat/Model/ChatNegotiation');

// eventHostBooking
const EventHostBookingInvoices = require('./eventHostBooking/model/eventHostBookingInvoices');

// Notification
const Notification = require('./Notification/model/notification');
const FCMToken = require('./Notification/model/fcmToken');

// ----- Demo login (use these to sign in on both app sides) -----
const DEMO_ARTIST_NUMBER = '+919876543210';
const DEMO_HOST_NUMBER = '+919876543211';
const DEMO_PASSWORD = 'Password@123';

// ----- Config: adjust these for more/less data -----
const SEED_CONFIG = {
  artists: 80,
  hosts: 25,
  events: 150,
  performanceVideosPerArtist: 2,
  eventApplicationsPerArtist: 4,
  shortlistEntries: 60,
  eventInvitations: 80,
  likedEvents: 120,
  savedEvents: 100,
  bookings: 70,
  chatNegotiations: 40,
  notifications: 100,
  banners: 10,
};

// ----- Real internet URLs for images & videos -----
const IMAGE_URLS = [
  'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400',
  'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400',
  'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400',
  'https://images.unsplash.com/photo-1507838153414-b4b713384a76?w=400',
  'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400',
  'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=400',
  'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400',
  'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=400',
  'https://images.unsplash.com/photo-1524368535928-5b5e00ddc76b?w=400',
  'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=400',
  'https://picsum.photos/seed/a1/400/300',
  'https://picsum.photos/seed/a2/400/300',
  'https://picsum.photos/seed/a3/400/300',
  'https://picsum.photos/seed/a4/400/300',
  'https://picsum.photos/seed/a5/400/300',
  'https://i.pravatar.cc/400?img=1',
  'https://i.pravatar.cc/400?img=2',
  'https://i.pravatar.cc/400?img=3',
  'https://i.pravatar.cc/400?img=4',
  'https://i.pravatar.cc/400?img=5',
];

const POSTER_URLS = [
  'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=600',
  'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600',
  'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=600',
  'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=600',
  'https://picsum.photos/seed/p1/600/400',
  'https://picsum.photos/seed/p2/600/400',
  'https://picsum.photos/seed/p3/600/400',
  'https://picsum.photos/seed/p4/600/400',
  'https://picsum.photos/seed/p5/600/400',
  'https://picsum.photos/seed/p6/600/400',
];

const VIDEO_URLS = [
  'https://www.w3schools.com/html/mov_bbb.mp4',
  'https://www.w3schools.com/html/movie.mp4',
  'https://sample-videos.com/video321/mp4/720/big_buck_bunny_720p_1mb.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4',
];

const GENRES = ['Rock', 'Pop', 'Jazz', 'Hip Hop', 'Classical', 'Electronic', 'Blues', 'Metal', 'Folk', 'Reggae', 'Soul', 'Indie'];
const ARTIST_TYPES = ['Solo', 'Duo', 'Band', 'DJ', 'Solo/Duo Singer', 'Instrumentalist', 'Anchor'];
const INSTRUMENTS = ['Guitar', 'Piano', 'Drums', 'Saxophone', 'Violin', 'Trumpet', 'Bass', 'Synthesizer', 'Banjo', null];
const VENUES = ['Blue Frog Mumbai', 'Hard Rock Cafe Delhi', 'The Piano Man Delhi', 'AntiSocial Mumbai', 'Summer House Cafe', 'Kitty Su Delhi', 'Auro Kitchen & Bar', 'Moods & Attitude', 'High Spirits Pune', 'Social Bangalore', 'Koramangala Social', 'HRC Hyderabad', 'Lounge 9 Bangalore', 'The Humming Tree', 'B flat Bar'];
const CITIES = ['Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai', 'Pune', 'Kolkata', 'Ahmedabad', 'Jaipur', 'Goa', 'Chandigarh', 'Kochi', 'Noida', 'Gurgaon'];
const EVENT_NAMES = ['Sunset Concert', 'Rock Night', 'Jazz Evening', 'Indie Fest', 'Acoustic Sessions', 'Live at the Lounge', 'Weekend Gig', 'Open Mic Night', 'Album Launch', 'Unplugged', 'Summer Fest', 'Winter Ball', 'New Year Eve', 'Holi Special', 'Diwali Night', 'Corporate Evening', 'Wedding Sangeet', 'College Fest', 'Street Fest', 'Beach Party'];

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const pickMany = (arr, n) => {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(n, arr.length));
};

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB connected');
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
    process.exit(1);
  }
};

const seed = async () => {
  await connectDB();

  try {
    console.log('Clearing existing data...');
    await Promise.all([
      Notification.deleteMany({}),
      FCMToken.deleteMany({}),
      Booking.deleteMany({}),
      Chat.deleteMany({}),
      ChatNegotiation.deleteMany({}),
      EventApplication.deleteMany({}),
      EventInvitation.deleteMany({}),
      ShortlistArtist.deleteMany({}),
      LikedEvent.deleteMany({}),
      SavedEvent.deleteMany({}),
      ArtistPerformanceGallery.deleteMany({}),
      ArtistProfile.deleteMany({}),
      HostPaymentDetails.deleteMany({}),
      HostProfile.deleteMany({}),
      Event.deleteMany({}),
      Invoice.deleteMany({}),
      EventHostBookingInvoices.deleteMany({}),
      HomePageBanner.deleteMany({}),
      AdminAuth.deleteMany({}),
      ArtistAuthentication.deleteMany({}),
      HostAuthentication.deleteMany({}),
    ]);
    console.log('Existing data cleared\n');

    const hashedPassword = await bcrypt.hash('Password@123', 10);

    // 1. Admin Auth
    await AdminAuth.create({
      email: process.env.ADMIN_EMAIL || 'admin@scenezone.com',
      password: hashedPassword,
      role: 'admin',
    });
    console.log('AdminAuth seeded');

    // 2. Artist Auth + Profile (demo artist first, then bulk)
    const artistAuthList = [];
    const artistProfileList = [];
    const demoArtistAuth = await ArtistAuthentication.create({
      fullName: 'Demo Artist',
      mobileNumber: DEMO_ARTIST_NUMBER,
      password: hashedPassword,
      role: 'artist',
      isVerified: true,
      isProfileComplete: true,
    });
    artistAuthList.push(demoArtistAuth);
    const demoArtistProfile = await ArtistProfile.create({
      artistId: demoArtistAuth._id,
      email: 'demo.artist@scenezone.com',
      address: '123 Demo Street, Mumbai',
      dob: new Date('1992-05-15'),
      artistType: 'Solo',
      instrument: 'Guitar',
      budget: 50000,
      profileImageUrl: IMAGE_URLS[0],
      isCrowdGuarantee: true,
      isNegotiaitonAvailable: true,
    });
    artistProfileList.push(demoArtistProfile);
    for (let i = 1; i < SEED_CONFIG.artists; i++) {
      const mobileNumber = `+9198765${String(40000 + i).padStart(5, '0')}`;
      const auth = await ArtistAuthentication.create({
        fullName: `Artist ${i + 1}`,
        mobileNumber,
        password: hashedPassword,
        role: 'artist',
        isVerified: true,
        isProfileComplete: true,
      });
      artistAuthList.push(auth);
      const email = `artist${i + 1}@scenezone.com`;
      const profile = await ArtistProfile.create({
        artistId: auth._id,
        email,
        address: `${100 + i} Street, ${pick(CITIES)}`,
        dob: new Date(1985 + (i % 20), i % 12, (i % 28) + 1),
        artistType: pick(ARTIST_TYPES),
        instrument: pick(INSTRUMENTS),
        budget: 20000 + Math.floor(Math.random() * 80000),
        profileImageUrl: pick(IMAGE_URLS),
        isCrowdGuarantee: Math.random() > 0.6,
        isNegotiaitonAvailable: Math.random() > 0.3,
      });
      artistProfileList.push(profile);
    }
    console.log(`ArtistAuthentication + ArtistProfile: ${SEED_CONFIG.artists} each (incl. demo artist)`);

    // 3. Host Auth + Profile (demo host first, then bulk)
    const hostAuthList = [];
    const hostProfileList = [];
    const demoHostAuth = await HostAuthentication.create({
      fullName: 'Demo Host',
      mobileNumber: DEMO_HOST_NUMBER,
      password: hashedPassword,
      role: 'host',
      isVerified: true,
      isProfileComplete: true,
    });
    hostAuthList.push(demoHostAuth);
    const demoHostProfile = await HostProfile.create({
      hostId: demoHostAuth._id,
      fullName: demoHostAuth.fullName,
      email: 'demo.host@scenezone.com',
      location: 'Mumbai',
      isProfileComplete: true,
    });
    hostProfileList.push(demoHostProfile);
    for (let i = 1; i < SEED_CONFIG.hosts; i++) {
      const mobileNumber = `+9198766${String(40000 + i).padStart(5, '0')}`;
      const auth = await HostAuthentication.create({
        fullName: `Host ${i + 1}`,
        mobileNumber,
        password: hashedPassword,
        role: 'host',
        isVerified: true,
        isProfileComplete: true,
      });
      hostAuthList.push(auth);
      const profile = await HostProfile.create({
        hostId: auth._id,
        fullName: auth.fullName,
        email: `host${i + 1}@scenezone.com`,
        location: pick(CITIES),
        isProfileComplete: true,
      });
      hostProfileList.push(profile);
    }
    console.log(`HostAuthentication + HostProfile: ${SEED_CONFIG.hosts} each (incl. demo host)`);

    // 4. Banners (bulk with real URLs)
    const bannerDocs = Array.from({ length: SEED_CONFIG.banners }, (_, i) => ({
      bannerName: `Banner ${i + 1}`,
      bannerImageUrl: IMAGE_URLS[i % IMAGE_URLS.length] || POSTER_URLS[i % POSTER_URLS.length],
    }));
    await HomePageBanner.insertMany(bannerDocs);
    console.log(`HomePageBanner: ${SEED_CONFIG.banners}`);

    // 5. Events (bulk; posterUrl from internet)
    const eventList = [];
    for (let i = 0; i < SEED_CONFIG.events; i++) {
      const host = pick(hostAuthList);
      const daysAhead = Math.floor(Math.random() * 120);
      const eventDate = new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000);
      const event = await Event.create({
        hostId: host._id,
        eventName: `${pick(EVENT_NAMES)} ${i + 1}`,
        venue: pick(VENUES),
        eventDateTime: [eventDate],
        genre: pickMany(GENRES, 1 + Math.floor(Math.random() * 3)),
        about: 'Seed event for performance testing. Live music and great vibes.',
        location: pick(CITIES),
        budget: 50000 + Math.floor(Math.random() * 200000),
        isSoundSystem: Math.random() > 0.4,
        posterUrl: pick(POSTER_URLS),
        status: pick(['pending', 'approved', 'approved', 'rejected']),
        isCompleted: false,
        isCancelled: false,
        Discount: { level1: 10, level2: 20, level3: 30 },
        assignedArtists: [],
        ticketSetting: {
          ticketType: 'free',
          ticketStatus: pick(['comingsoon', 'live', 'soldout']),
          isEnabled: true,
        },
      });
      eventList.push(event);
    }
    console.log(`Event: ${SEED_CONFIG.events}`);

    // 6. ArtistPerformanceGallery (bulk; videoUrl from internet)
    const performanceList = [];
    for (let i = 0; i < artistAuthList.length; i++) {
      const n = SEED_CONFIG.performanceVideosPerArtist;
      for (let j = 0; j < n; j++) {
        const perf = await ArtistPerformanceGallery.create({
          artistId: artistAuthList[i]._id,
          artistProfileId: artistProfileList[i]._id,
          venueName: pick(VENUES),
          genre: pick(GENRES),
          videoUrl: pick(VIDEO_URLS),
        });
        performanceList.push(perf);
      }
    }
    console.log(`ArtistPerformanceGallery: ${artistAuthList.length * SEED_CONFIG.performanceVideosPerArtist}`);

    // 7. EventApplication (bulk; unique artistId + eventId)
    const appKeys = new Set();
    let appCount = 0;
    for (let i = 0; i < artistAuthList.length; i++) {
      const numApps = Math.min(SEED_CONFIG.eventApplicationsPerArtist, eventList.length);
      const eventsToApply = pickMany(eventList, numApps);
      for (const ev of eventsToApply) {
        const key = `${artistAuthList[i]._id}_${ev._id}`;
        if (appKeys.has(key)) continue;
        appKeys.add(key);
        await EventApplication.create({
          artistId: artistAuthList[i]._id,
          eventId: ev._id,
          status: pick(['pending', 'accepted', 'rejected']),
        });
        appCount++;
      }
    }
    console.log(`EventApplication: ${appCount}`);

    // 8. ShortlistArtist (bulk; unique hostId + artistId)
    const shortlistKeys = new Set();
    let shortlistCount = 0;
    for (let i = 0; i < SEED_CONFIG.shortlistEntries * 2; i++) {
      if (shortlistCount >= SEED_CONFIG.shortlistEntries) break;
      const host = pick(hostAuthList);
      const artist = pick(artistAuthList);
      const key = `${host._id}_${artist._id}`;
      if (shortlistKeys.has(key)) continue;
      shortlistKeys.add(key);
      const ev = pick(eventList);
      await ShortlistArtist.create({
        hostId: host._id,
        artistId: artist._id,
        isSalaryBasis: Math.random() > 0.5,
        assignedEvents: [ev._id],
      });
      shortlistCount++;
    }
    console.log(`ShortlistArtist: ${shortlistCount}`);

    // 9. EventInvitation (bulk; unique artistId + eventId)
    const inviteKeys = new Set();
    let inviteCount = 0;
    for (let i = 0; i < SEED_CONFIG.eventInvitations * 2; i++) {
      if (inviteCount >= SEED_CONFIG.eventInvitations) break;
      const artistProfile = pick(artistProfileList);
      const ev = pick(eventList);
      const key = `${artistProfile._id}_${ev._id}`;
      if (inviteKeys.has(key)) continue;
      inviteKeys.add(key);
      await EventInvitation.create({
        artistId: artistProfile._id,
        eventId: ev._id,
        status: pick(['pending', 'accepted', 'rejected']),
      });
      inviteCount++;
    }
    console.log(`EventInvitation: ${inviteCount}`);

    // 10. Invoice (artistHostBooking) – keep minimal
    await Invoice.create([
      { platform_fees: { amount: 50 }, taxes: { amount: 10 } },
    ]);
    console.log('Invoice (artistHostBooking) seeded');

    // 11. EventHostBookingInvoices
    await EventHostBookingInvoices.create({
      platformFees: 0,
      taxRate: 18,
    });
    console.log('EventHostBookingInvoices seeded');

    // 12. Booking (bulk; unique artistId + eventId per booking)
    const bookingKeys = new Set();
    let bookingCount = 0;
    for (let i = 0; i < SEED_CONFIG.bookings * 2; i++) {
      if (bookingCount >= SEED_CONFIG.bookings) break;
      const artistProfile = pick(artistProfileList);
      const host = pick(hostAuthList);
      const ev = pick(eventList);
      const key = `${artistProfile._id}_${ev._id}`;
      if (bookingKeys.has(key)) continue;
      bookingKeys.add(key);
      const subtotal = 30000 + Math.floor(Math.random() * 100000);
      const platform_fees = 100;
      const taxes = Math.floor(subtotal * 0.05);
      await Booking.create({
        artistId: artistProfile._id,
        hostId: host._id,
        eventId: ev._id,
        date_time: ev.eventDateTime[0] || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        invoices: { subtotal, platform_fees, taxes, total: subtotal + platform_fees + taxes },
        payment_status: pick(['pending', 'pending', 'completed']),
      });
      bookingCount++;
    }
    console.log(`Booking: ${bookingCount}`);

    // 13. ChatNegotiation (bulk; unique eventId + hostId + artistId)
    const chatKeys = new Set();
    let chatCount = 0;
    for (let i = 0; i < SEED_CONFIG.chatNegotiations * 3; i++) {
      if (chatCount >= SEED_CONFIG.chatNegotiations) break;
      const ev = pick(eventList);
      const host = pick(hostAuthList);
      const artist = pick(artistAuthList);
      const key = `${ev._id}_${host._id}_${artist._id}`;
      if (chatKeys.has(key)) continue;
      chatKeys.add(key);
      await ChatNegotiation.create({
        eventId: ev._id,
        hostId: host._id,
        artistId: artist._id,
        messages: [],
        isActive: Math.random() > 0.5,
        latestProposedPrice: 20000 + Math.floor(Math.random() * 80000),
        proposedBy: pick(['host', 'artist']),
        isHostApproved: false,
        isArtistApproved: false,
      });
      chatCount++;
    }
    console.log(`ChatNegotiation: ${chatCount}`);

    // 14. LikedEvent + SavedEvent (bulk; unique artistId + eventId per model)
    const likedKeys = new Set();
    let likedCount = 0;
    for (let i = 0; i < SEED_CONFIG.likedEvents * 2; i++) {
      if (likedCount >= SEED_CONFIG.likedEvents) break;
      const artist = pick(artistAuthList);
      const ev = pick(eventList);
      const key = `${artist._id}_${ev._id}`;
      if (likedKeys.has(key)) continue;
      likedKeys.add(key);
      await LikedEvent.create({ eventId: ev._id, artistId: artist._id });
      likedCount++;
    }
    const savedKeys = new Set();
    let savedCount = 0;
    for (let i = 0; i < SEED_CONFIG.savedEvents * 2; i++) {
      if (savedCount >= SEED_CONFIG.savedEvents) break;
      const artist = pick(artistAuthList);
      const ev = pick(eventList);
      const key = `${artist._id}_${ev._id}`;
      if (savedKeys.has(key)) continue;
      savedKeys.add(key);
      await SavedEvent.create({ eventId: ev._id, artistId: artist._id });
      savedCount++;
    }
    console.log(`LikedEvent: ${likedCount}, SavedEvent: ${savedCount}`);

    // 15. HostPaymentDetails (one per host)
    for (const host of hostAuthList) {
      await HostPaymentDetails.create({
        hostId: host._id,
        paymentMethod: 'UPI',
        cardHolderName: host.fullName,
        cardNumber: 4111111111111111,
        expiryDate: '12/28',
        cvv: 123,
      });
    }
    console.log(`HostPaymentDetails: ${hostAuthList.length}`);

    // 16. Notifications (bulk)
    for (let i = 0; i < SEED_CONFIG.notifications; i++) {
      const recipient = Math.random() > 0.5 ? pick(artistAuthList) : pick(hostAuthList);
      const sender = Math.random() > 0.5 ? pick(hostAuthList) : pick(artistAuthList);
      await Notification.create({
        recipientId: recipient._id,
        recipientType: recipient.role,
        senderId: sender._id,
        senderType: sender.role,
        title: `Notification ${i + 1}`,
        body: 'Seed notification for performance testing.',
        type: pick(['system_alert', 'booking_confirmed', 'event_invitation', 'chat_message', 'event_application', 'price_proposal', 'event_reminder']),
        isRead: Math.random() > 0.6,
        isPushSent: false,
      });
    }
    console.log(`Notification: ${SEED_CONFIG.notifications}`);

    // 17. FCMToken (one per artist/host)
    for (const a of artistAuthList.slice(0, 20)) {
      await FCMToken.create({
        userId: a._id,
        userType: 'artist',
        fcmToken: 'seed-fcm-' + a._id.toString() + '-' + Date.now(),
        deviceId: 'seed-device-' + a._id.toString(),
        isActive: true,
      });
    }
    for (const h of hostAuthList.slice(0, 10)) {
      await FCMToken.create({
        userId: h._id,
        userType: 'host',
        fcmToken: 'seed-fcm-' + h._id.toString() + '-' + Date.now(),
        deviceId: 'seed-device-' + h._id.toString(),
        isActive: true,
      });
    }
    console.log('FCMToken seeded (30 total)');

    console.log('\n----- Seed summary -----');
    console.log(`Artists: ${SEED_CONFIG.artists}, Hosts: ${SEED_CONFIG.hosts}, Events: ${SEED_CONFIG.events}`);
    console.log('All URLs use real internet sources (Unsplash, Picsum, Pravatar, sample videos).');
    console.log('\n----- DEMO LOGIN (use for both app sides) -----');
    console.log('  ARTIST side:');
    console.log('    Mobile: ' + DEMO_ARTIST_NUMBER);
    console.log('    Password: ' + DEMO_PASSWORD);
    console.log('  HOST side:');
    console.log('    Mobile: ' + DEMO_HOST_NUMBER);
    console.log('    Password: ' + DEMO_PASSWORD);
    console.log('----------------------------------------------\n');
    console.log('Seed completed successfully.');
  } catch (err) {
    console.error('Seed error:', err);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('MongoDB connection closed.');
    process.exit(0);
  }
};

seed();
