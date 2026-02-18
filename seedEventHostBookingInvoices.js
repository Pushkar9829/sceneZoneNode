const mongoose = require('mongoose');
const EventHostBookingInvoices = require('../sceneZoneNode/artistHostBooking/models/invoices');
require('dotenv').config();

const MONGODB_URL = process.env.MONGO_URI

async function seed() {
  try {
    if (!process.env.MONGO_URI) {
      console.warn('MONGO_URI not provided, using default:', MONGODB_URL);
    }
    await mongoose.connect(MONGODB_URL);
    console.log('Connected to MongoDB');

    const settings = await EventHostBookingInvoices.getSingleton();
    console.log('Seeded EventHostBookingInvoices:', settings);
  } catch (err) {
    console.error('Error seeding EventHostBookingInvoices:', err);
    process.exit(1); // Exit with failure code for CI/CD
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

seed();