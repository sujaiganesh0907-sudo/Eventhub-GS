import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import mongoose from 'mongoose';

dotenv.config({
  path: path.resolve(process.cwd(), 'backend', '.env'),
});

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('MONGODB_URI is missing.');
  process.exit(1);
}

const DB_FILE = path.resolve(process.cwd(), '.data', 'eventhub_db.json');

const COLLECTIONS = [
  'users',
  'studentProfiles',
  'colleges',
  'collegeVerifications',
  'collegeAdminMemberships',
  'events',
  'eventRegistrations',
  'payments',
  'registrationQRs',
  'attendances',
  'certificates',
  'placementPosts',
  'infrastructurePosts',
  'connections',
  'follows',
  'notifications',
  'reminders',
  'otpVerifications',
  'conversations',
  'messages',
  'conversationPreferences',
  'adminActivityLogs',
  'credentialPosts',
  'groups',
  'groupMemberships',
  'groupJoinRequests',
];

async function migrate() {
  if (!fs.existsSync(DB_FILE)) {
    throw new Error(`Embedded database not found: ${DB_FILE}`);
  }

  const raw = fs.readFileSync(DB_FILE, 'utf8');
  const data = JSON.parse(raw);

  await mongoose.connect(MONGODB_URI);

  const db = mongoose.connection.db;

  if (!db) {
    throw new Error('MongoDB database connection is unavailable.');
  }

  console.log('Connected to MongoDB Atlas.');

  for (const collectionName of COLLECTIONS) {
    const records = Array.isArray(data[collectionName])
      ? data[collectionName]
      : [];

    if (records.length === 0) {
      console.log(`${collectionName}: 0 records - skipped`);
      continue;
    }

    const collection = db.collection(collectionName);

    const existingCount = await collection.countDocuments();

    if (existingCount > 0) {
      console.log(
        `${collectionName}: skipped because Atlas already contains ${existingCount} record(s)`
      );
      continue;
    }

    await collection.insertMany(records, {
      ordered: false,
    });

    console.log(
      `${collectionName}: migrated ${records.length} record(s)`
    );
  }

  console.log('Migration completed successfully.');
  await mongoose.disconnect();
}

migrate().catch(async (error) => {
  console.error('Migration failed:', error.message);

  try {
    await mongoose.disconnect();
  } catch {}

  process.exit(1);
});