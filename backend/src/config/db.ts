import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), 'backend/.env') });

// Configuration
const MONGODB_URI = process.env.MONGODB_URI || '';
const DB_NAME = 'eventhub_db';

mongoose.set('bufferCommands', false);

let isMongoConnectedFlag = false;

export function isMongoConnected(): boolean {
  return isMongoConnectedFlag && mongoose.connection.readyState === 1;
}

export function getMongoDb(): mongoose.mongo.Db {
  if (!mongoose.connection.db) {
    throw new Error('MongoDB database instance is not connected.');
  }
  return mongoose.connection.db;
}

/**
 * Connect to MongoDB Atlas
 */
export async function connectToMongo(customUri?: string): Promise<boolean> {
  const uri = customUri || MONGODB_URI;
  if (!uri) {
    console.warn('No MONGODB_URI provided. Running in persistent embedded engine fallback mode.');
    return false;
  }

  try {
    await mongoose.connect(uri, {
      dbName: DB_NAME,
      serverSelectionTimeoutMS: 5000,
    });
    isMongoConnectedFlag = true;
    console.log(`Successfully connected to MongoDB Atlas. LIVE PRIMARY DATABASE: '${DB_NAME}'`);

    // Auto-seed Atlas from .data/eventhub_db.json if Atlas collections are completely empty
    await syncJsonToAtlasIfEmpty();
    return true;
  } catch (err: any) {
    isMongoConnectedFlag = false;
    console.warn(`Could not connect to MongoDB Atlas (${err.message}). Using controlled embedded fallback mode.`);
    return false;
  }
}

// Auto-connect if URI is configured in environment
if (MONGODB_URI) {
  connectToMongo(MONGODB_URI).catch(() => {});
}

// Persistent Embedded Document Database Fallback Engine
// Used when MongoDB Atlas is unreachable or running in offline dev
const DATA_DIR = path.resolve(process.cwd(), '.data');
const DB_FILE = path.join(DATA_DIR, 'eventhub_db.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

export interface DBState {
  users: any[];
  studentProfiles: any[];
  colleges: any[];
  collegeVerifications: any[];
  collegeAdminMemberships: any[];
  events: any[];
  eventRegistrations: any[];
  payments: any[];
  registrationQRs: any[];
  attendances: any[];
  certificates: any[];
  placementPosts: any[];
  infrastructurePosts: any[];
  connections: any[];
  follows: any[];
  notifications: any[];
  reminders: any[];
  otpVerifications: any[];
  conversations: any[];
  messages: any[];
  conversationPreferences: any[];
  adminActivityLogs: any[];
  credentialPosts: any[];
  groups: any[];
  groupMemberships: any[];
  groupJoinRequests: any[];
  collegeAdminRequests: any[];
}

let dbState: DBState = {
  users: [],
  studentProfiles: [],
  colleges: [],
  collegeVerifications: [],
  collegeAdminMemberships: [],
  events: [],
  eventRegistrations: [],
  payments: [],
  registrationQRs: [],
  attendances: [],
  certificates: [],
  placementPosts: [],
  infrastructurePosts: [],
  connections: [],
  follows: [],
  notifications: [],
  reminders: [],
  otpVerifications: [],
  conversations: [],
  messages: [],
  conversationPreferences: [],
  adminActivityLogs: [],
  credentialPosts: [],
  groups: [],
  groupMemberships: [],
  groupJoinRequests: [],
  collegeAdminRequests: [],
};

// Load initial fallback state from .data/eventhub_db.json
if (fs.existsSync(DB_FILE)) {
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    dbState = { ...dbState, ...parsed };
  } catch (err) {
    console.error('Error loading db file, starting fresh', err);
  }
}

async function syncJsonToAtlasIfEmpty() {
  if (!isMongoConnected() || !fs.existsSync(DB_FILE)) return;
  try {
    const db = getMongoDb();
    const userCount = await db.collection('users').countDocuments();
    if (userCount > 0) {
      console.log(`MongoDB Atlas collection 'users' already has ${userCount} records. Ready.`);
      return;
    }

    console.log(`Seeding MongoDB Atlas '${DB_NAME}' collections from '${DB_FILE}'...`);
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    const sourceState = JSON.parse(raw);

    for (const [collectionName, records] of Object.entries(sourceState)) {
      if (!Array.isArray(records) || records.length === 0) continue;
      const col = db.collection<any>(collectionName);
      for (const item of records) {
        const docId = item._id || item.id || generateId();
        const cleanDoc = { ...item, _id: String(docId), id: String(docId) };
        await col.updateOne({ _id: String(docId) } as any, { $set: cleanDoc }, { upsert: true });
      }
    }
    console.log(`All collections synced to MongoDB Atlas '${DB_NAME}'.`);
  } catch (e: any) {
    console.warn('Auto-seed to Atlas warning:', e.message);
  }
}

let saveTimeout: NodeJS.Timeout | null = null;
function persistDB() {
  if (isMongoConnected()) return; // Do not dual-write when MongoDB Atlas is active
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(dbState, null, 2), 'utf-8');
    } catch (e) {
      console.error('Failed to persist database:', e);
    }
  }, 100);
}

export function syncPersistDBNow() {
  if (isMongoConnected()) return;
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(dbState, null, 2), 'utf-8');
  } catch (e) {
    console.error('Failed to sync write database:', e);
  }
}

process.on('beforeExit', syncPersistDBNow);
process.on('SIGINT', () => {
  syncPersistDBNow();
  process.exit(0);
});
process.on('SIGTERM', () => {
  syncPersistDBNow();
  process.exit(0);
});

export function generateId(): string {
  return crypto.randomBytes(12).toString('hex');
}

function normalizeDoc<T>(doc: any): T {
  if (!doc) return doc;
  const d = { ...doc };
  if (d._id && typeof d._id !== 'string') d._id = d._id.toString();
  if (!d.id && d._id) d.id = d._id;
  return d as T;
}

function sanitizeMongoFilter(filter: any): any {
  if (!filter || typeof filter !== 'object') return {};
  const cleaned: any = {};
  for (const [k, v] of Object.entries(filter)) {
    if (k === '_id' || k === 'id') {
      if (typeof v === 'string') {
        cleaned.$or = [{ _id: v }, { id: v }];
      } else if (v && typeof v === 'object' && '$in' in v && Array.isArray((v as any).$in)) {
        const inVals = (v as any).$in.map(String);
        cleaned.$or = [{ _id: { $in: inVals } }, { id: { $in: inVals } }];
      } else {
        cleaned[k] = v;
      }
    } else {
      cleaned[k] = v;
    }
  }
  return cleaned;
}

// In-Memory Query Filter Helper for Fallback Mode
function matchFilter(doc: any, filter: any): boolean {
  if (!filter || Object.keys(filter).length === 0) return true;
  for (const [key, val] of Object.entries(filter)) {
    if (key === '$or' && Array.isArray(val)) {
      const anyMatched = val.some((subFilter) => matchFilter(doc, subFilter));
      if (!anyMatched) return false;
      continue;
    }
    if (key === '$and' && Array.isArray(val)) {
      const allMatched = val.every((subFilter) => matchFilter(doc, subFilter));
      if (!allMatched) return false;
      continue;
    }
    if (key === '_id' || key === 'id') {
      const docId = doc._id || doc.id;
      if (typeof val === 'object' && val !== null) {
        if ('$in' in val && Array.isArray((val as any).$in)) {
          if (!(val as any).$in.includes(docId)) return false;
        } else if (docId !== String(val)) return false;
      } else if (docId !== String(val)) {
        return false;
      }
    } else if (val && typeof val === 'object' && !Array.isArray(val)) {
      if ('$in' in val && Array.isArray((val as any).$in)) {
        if (!(val as any).$in.includes(doc[key])) return false;
      } else if ('$nin' in val && Array.isArray((val as any).$nin)) {
        if ((val as any).$nin.includes(doc[key])) return false;
      } else if ('$ne' in val) {
        if (doc[key] === (val as any).$ne) return false;
      } else if ('$regex' in val) {
        const regex = new RegExp((val as any).$regex, (val as any).$options || 'i');
        if (!regex.test(String(doc[key] || ''))) return false;
      } else if ('$gte' in val || '$lte' in val || '$gt' in val || '$lt' in val) {
        const dVal = new Date(doc[key]).getTime() || Number(doc[key]);
        if ('$gte' in val && dVal < (new Date((val as any).$gte).getTime() || Number((val as any).$gte))) return false;
        if ('$lte' in val && dVal > (new Date((val as any).$lte).getTime() || Number((val as any).$lte))) return false;
        if ('$gt' in val && dVal <= (new Date((val as any).$gt).getTime() || Number((val as any).$gt))) return false;
        if ('$lt' in val && dVal >= (new Date((val as any).$lt).getTime() || Number((val as any).$lt))) return false;
      }
    } else if (doc[key] !== val) {
      return false;
    }
  }
  return true;
}

export class ModelQuery<T> {
  private collectionName: keyof DBState;
  private filter: any;
  private sortObj?: Record<string, 1 | -1>;
  private skipCount?: number;
  private limitCount?: number;
  private fallbackItems?: T[];

  constructor(collectionName: keyof DBState, filter: any = {}, fallbackItems?: T[]) {
    this.collectionName = collectionName;
    this.filter = filter;
    if (fallbackItems) {
      this.fallbackItems = [...fallbackItems];
    }
  }

  sort(sortObj: Record<string, 1 | -1>): this {
    this.sortObj = sortObj;
    if (this.fallbackItems) {
      const entries = Object.entries(sortObj);
      this.fallbackItems.sort((a: any, b: any) => {
        for (const [field, dir] of entries) {
          let aVal = a[field];
          let bVal = b[field];
          if (aVal instanceof Date) aVal = aVal.getTime();
          if (bVal instanceof Date) bVal = bVal.getTime();
          if (aVal < bVal) return dir === 1 ? -1 : 1;
          if (aVal > bVal) return dir === 1 ? 1 : -1;
        }
        return 0;
      });
    }
    return this;
  }

  skip(n: number): this {
    this.skipCount = n;
    return this;
  }

  limit(n: number): this {
    this.limitCount = n;
    return this;
  }

  async exec(): Promise<T[]> {
    if (isMongoConnected()) {
      const col = getMongoDb().collection(this.collectionName);
      let cursor = col.find(sanitizeMongoFilter(this.filter));
      if (this.sortObj) cursor = cursor.sort(this.sortObj);
      if (this.skipCount !== undefined) cursor = cursor.skip(this.skipCount);
      if (this.limitCount !== undefined) cursor = cursor.limit(this.limitCount);
      const docs = await cursor.toArray();
      return docs.map((d) => normalizeDoc<T>(d));
    }

    let items = this.fallbackItems || (dbState[this.collectionName] as T[]).filter((item) => matchFilter(item, this.filter));
    if (this.skipCount) items = items.slice(this.skipCount);
    if (this.limitCount !== undefined) items = items.slice(0, this.limitCount);
    return items;
  }

  then<TResult1 = T[], TResult2 = never>(
    onfulfilled?: ((value: T[]) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    return this.exec().then(onfulfilled, onrejected);
  }
}

export class CollectionModel<T extends { _id?: string; id?: string }> {
  private collectionName: keyof DBState;

  constructor(collectionName: keyof DBState) {
    this.collectionName = collectionName;
  }

  private get fallbackItems(): T[] {
    return dbState[this.collectionName] as T[];
  }

  find(filter: any = {}): ModelQuery<T> {
    if (isMongoConnected()) {
      return new ModelQuery<T>(this.collectionName, filter);
    }
    const matched = this.fallbackItems.filter((item) => matchFilter(item, filter));
    return new ModelQuery<T>(this.collectionName, filter, matched);
  }

  async findOne(filter: any = {}): Promise<T | null> {
    if (isMongoConnected()) {
      const col = getMongoDb().collection(this.collectionName);
      const doc = await col.findOne(sanitizeMongoFilter(filter));
      return doc ? normalizeDoc<T>(doc) : null;
    }
    const found = this.fallbackItems.find((item) => matchFilter(item, filter));
    return found ? { ...found } : null;
  }

  async findById(id: string): Promise<T | null> {
    return this.findOne({ _id: id });
  }

  async create(data: Partial<T> | Partial<T>[]): Promise<any> {
    const now = new Date().toISOString();

    if (Array.isArray(data)) {
      const records = data.map((d) => {
        const id = (d as any)._id || (d as any).id || generateId();
        return {
          ...d,
          _id: id,
          id: id,
          createdAt: (d as any).createdAt || now,
          updatedAt: (d as any).updatedAt || now,
        } as unknown as T;
      });

      if (isMongoConnected()) {
        const col = getMongoDb().collection(this.collectionName);
        await col.insertMany(records as any[]);
        return records;
      }

      this.fallbackItems.push(...records);
      persistDB();
      return records;
    }

    const id = (data as any)._id || (data as any).id || generateId();
    const record = {
      ...data,
      _id: id,
      id: id,
      createdAt: (data as any).createdAt || now,
      updatedAt: (data as any).updatedAt || now,
    } as unknown as T;

    if (isMongoConnected()) {
      const col = getMongoDb().collection(this.collectionName);
      await col.insertOne(record as any);
      return record;
    }

    this.fallbackItems.push(record);
    persistDB();
    return record;
  }

  async updateOne(filter: any, update: any): Promise<{ modifiedCount: number }> {
    const now = new Date().toISOString();
    const hasOperators = update.$set || update.$inc || update.$addToSet || update.$push;
    const mongoUpdate = hasOperators ? update : { $set: update };
    if (!mongoUpdate.$set) mongoUpdate.$set = {};
    mongoUpdate.$set.updatedAt = now;

    if (isMongoConnected()) {
      const col = getMongoDb().collection(this.collectionName);
      const res = await col.updateOne(sanitizeMongoFilter(filter), mongoUpdate);
      return { modifiedCount: res.modifiedCount };
    }

    const idx = this.fallbackItems.findIndex((item) => matchFilter(item, filter));
    if (idx === -1) return { modifiedCount: 0 };
    const current = this.fallbackItems[idx];
    const updatedData = update.$set ? { ...current, ...update.$set } : { ...current, ...update };
    if (update.$inc) {
      for (const [k, v] of Object.entries(update.$inc)) {
        (updatedData as any)[k] = ((updatedData as any)[k] || 0) + Number(v);
      }
    }
    if (update.$addToSet) {
      for (const [k, v] of Object.entries(update.$addToSet)) {
        const arr = Array.isArray((updatedData as any)[k]) ? [...(updatedData as any)[k]] : [];
        if (!arr.includes(v)) {
          arr.push(v);
        }
        (updatedData as any)[k] = arr;
      }
    }
    if (update.$push) {
      for (const [k, v] of Object.entries(update.$push)) {
        const arr = Array.isArray((updatedData as any)[k]) ? [...(updatedData as any)[k]] : [];
        arr.push(v);
        (updatedData as any)[k] = arr;
      }
    }
    (updatedData as any).updatedAt = now;
    this.fallbackItems[idx] = updatedData;
    persistDB();
    return { modifiedCount: 1 };
  }

  async findByIdAndUpdate(id: string, update: any, _options?: any): Promise<T | null> {
    const now = new Date().toISOString();
    const hasOperators = update.$set || update.$inc || update.$addToSet || update.$push;
    const mongoUpdate = hasOperators ? update : { $set: update };
    if (!mongoUpdate.$set) mongoUpdate.$set = {};
    mongoUpdate.$set.updatedAt = now;

    if (isMongoConnected()) {
      const col = getMongoDb().collection<any>(this.collectionName);
      const res = await col.findOneAndUpdate(
        { $or: [{ _id: String(id) }, { id: String(id) }] } as any,
        mongoUpdate,
        { returnDocument: 'after' }
      );
      return res ? normalizeDoc<T>(res) : null;
    }

    await this.updateOne({ _id: id }, update);
    return this.findById(id);
  }

  async deleteOne(filter: any): Promise<{ deletedCount: number }> {
    if (isMongoConnected()) {
      const col = getMongoDb().collection(this.collectionName);
      const res = await col.deleteOne(sanitizeMongoFilter(filter));
      return { deletedCount: res.deletedCount };
    }

    const idx = this.fallbackItems.findIndex((item) => matchFilter(item, filter));
    if (idx === -1) return { deletedCount: 0 };
    this.fallbackItems.splice(idx, 1);
    persistDB();
    return { deletedCount: 1 };
  }

  async deleteMany(filter: any): Promise<{ deletedCount: number }> {
    if (isMongoConnected()) {
      const col = getMongoDb().collection(this.collectionName);
      const res = await col.deleteMany(sanitizeMongoFilter(filter));
      return { deletedCount: res.deletedCount };
    }

    let deletedCount = 0;
    for (let i = this.fallbackItems.length - 1; i >= 0; i--) {
      if (matchFilter(this.fallbackItems[i], filter)) {
        this.fallbackItems.splice(i, 1);
        deletedCount++;
      }
    }
    if (deletedCount > 0) {
      persistDB();
    }
    return { deletedCount };
  }

  async findByIdAndDelete(id: string): Promise<T | null> {
    if (isMongoConnected()) {
      const col = getMongoDb().collection<any>(this.collectionName);
      const res = await col.findOneAndDelete({
        $or: [{ _id: String(id) }, { id: String(id) }],
      } as any);
      return res ? normalizeDoc<T>(res) : null;
    }

    const existing = await this.findById(id);
    if (!existing) return null;
    await this.deleteOne({ _id: id });
    return existing;
  }

  async countDocuments(filter: any = {}): Promise<number> {
    if (isMongoConnected()) {
      const col = getMongoDb().collection(this.collectionName);
      return await col.countDocuments(sanitizeMongoFilter(filter));
    }
    return this.fallbackItems.filter((item) => matchFilter(item, filter)).length;
  }
}

export { dbState, persistDB };
