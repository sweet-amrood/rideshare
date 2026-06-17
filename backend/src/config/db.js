const mongoose = require('mongoose');

const connectDB = async () => {
  const uri = (process.env.MONGODB_URI || '').trim();

  if (!uri) {
    console.error('MongoDB Connection Error: MONGODB_URI is not set in .env');
    process.exit(1);
  }

  try {
    const conn = await mongoose.connect(uri);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    console.log(`Database: ${conn.connection.name}`);

    await syncGeoIndexes();
    await dropLegacyUserUniqueIndexes();
  } catch (error) {
    console.error(`MongoDB Connection Error: ${error.message}`);
    process.exit(1);
  }
};

/** Ensure 2dsphere indexes exist for ride geospatial search */
const syncGeoIndexes = async () => {
  try {
    const Ride = require('../models/Ride');
    await Ride.syncIndexes();
  } catch (err) {
    console.warn(`Index sync note: ${err.message}`);
  }
};

/**
 * Older DBs may have unique indexes on name/username — drop so duplicates are allowed.
 * Email stays unique (enforced in schema + login).
 */
const dropLegacyUserUniqueIndexes = async () => {
  const User = require('../models/User');
  const allowDuplicateFields = new Set(['name', 'username']);

  try {
    const indexes = await User.collection.indexes();

    for (const index of indexes) {
      if (!index.unique || index.name === '_id_') continue;

      const keys = Object.keys(index.key || {});
      const blocksDuplicates = keys.some((k) => allowDuplicateFields.has(k));

      if (blocksDuplicates) {
        await User.collection.dropIndex(index.name);
        console.log(`Removed unique index on user field(s): ${keys.join(', ')} (${index.name})`);
      }
    }

    await User.syncIndexes();
  } catch (err) {
    console.warn(`User index cleanup note: ${err.message}`);
  }
};

module.exports = connectDB;
