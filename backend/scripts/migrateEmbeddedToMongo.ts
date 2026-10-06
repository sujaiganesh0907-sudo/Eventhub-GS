import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), 'backend/.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/eventhub_db';
const DATA_DIR = path.resolve(process.cwd(), '.data');
const DB_FILE = path.join(DATA_DIR, 'eventhub_db.json');

export async function migrateEmbeddedToMongo(targetUri?: string) {
  const uri = targetUri || MONGODB_URI;
  console.log(`Starting migration from embedded JSON to MongoDB Atlas database 'eventhub_db'...`);

  if (!fs.existsSync(DB_FILE)) {
    console.warn(`No embedded database file found at ${DB_FILE}. Nothing to migrate.`);
    return { success: false, message: 'Source file not found' };
  }

  const raw = fs.readFileSync(DB_FILE, 'utf-8');
  const dbState = JSON.parse(raw);

  const connection = await mongoose.createConnection(uri, {
    dbName: 'eventhub_db',
    serverSelectionTimeoutMS: 8000,
  }).asPromise();

  console.log(`Connected to MongoDB Atlas: database 'eventhub_db'`);

  const db = connection.db;
  if (!db) {
    throw new Error('Database connection object unavailable');
  }

  const report: Record<string, number> = {};

  for (const [collectionName, records] of Object.entries(dbState)) {
    if (!Array.isArray(records) || records.length === 0) continue;

    const col = db.collection(collectionName);
    let count = 0;

    for (const record of records) {
      if (!record || typeof record !== 'object') continue;
      const docId = record._id || record.id;
      if (!docId) continue;

      const cleanDoc = { ...record, _id: String(docId), id: String(docId) };
      await col.updateOne(
        { _id: String(docId) } as any,
        { $set: cleanDoc },
        { upsert: true }
      );
      count++;
    }

    report[collectionName] = count;
    console.log(`Migrated ${count} records into collection '${collectionName}'`);
  }

  await connection.close();
  console.log(`Migration completed successfully!`);
  return { success: true, report };
}

// Execute directly if run as a script
if (process.argv[1]?.endsWith('migrateEmbeddedToMongo.ts') || process.argv[1]?.endsWith('migrateEmbeddedToMongo.js')) {
  migrateEmbeddedToMongo()
    .then((res) => {
      console.log('Migration finished:', res);
      process.exit(0);
    })
    .catch((err) => {
      console.error('Migration failed:', err);
      process.exit(1);
    });
}
