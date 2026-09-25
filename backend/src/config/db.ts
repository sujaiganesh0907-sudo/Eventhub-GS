import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import mongoose from 'mongoose';

// MongoDB Atlas connection if URI is configured
const MONGODB_URI = process.env.MONGODB_URI || '';

mongoose.set('bufferCommands', false);

if (MONGODB_URI) {
  mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 2000 })
    .then(() => console.log('Successfully connected to MongoDB Atlas.'))
    .catch((err) => console.warn('Could not connect to MongoDB Atlas, running on persistent embedded engine:', err.message));
}

// Persistent Document Database implementation
// Ensures single source of truth across all restarts and requests
const DATA_DIR = path.resolve(process.cwd(), '.data');
const DB_FILE = path.join(DATA_DIR, 'eventhub_db.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

interface DBState {
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
};

// Load initial database state
if (fs.existsSync(DB_FILE)) {
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    dbState = { ...dbState, ...parsed };
  } catch (err) {
    console.error('Error loading db file, starting fresh', err);
  }
} else {
  // Will be seeded below if empty
}

let saveTimeout: NodeJS.Timeout | null = null;
function persistDB() {
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
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(dbState, null, 2), 'utf-8');
  } catch (e) {
    console.error('Failed to sync write database:', e);
  }
}

export function generateId(): string {
  return crypto.randomBytes(12).toString('hex');
}

// Query helper for matching MongoDB-like filters
function matchFilter(doc: any, filter: any): boolean {
  if (!filter || Object.keys(filter).length === 0) return true;
  for (const [key, val] of Object.entries(filter)) {
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
  private items: T[];
  constructor(items: T[]) {
    this.items = [...items];
  }

  sort(sortObj: Record<string, 1 | -1>): this {
    const entries = Object.entries(sortObj);
    if (!entries.length) return this;
    this.items.sort((a: any, b: any) => {
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
    return this;
  }

  skip(n: number): this {
    this.items = this.items.slice(n);
    return this;
  }

  limit(n: number): this {
    this.items = this.items.slice(0, n);
    return this;
  }

  exec(): Promise<T[]> {
    return Promise.resolve(this.items);
  }

  then<TResult1 = T[], TResult2 = never>(
    onfulfilled?: ((value: T[]) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    return Promise.resolve(this.items).then(onfulfilled, onrejected);
  }
}

export class CollectionModel<T extends { _id?: string; id?: string }> {
  private collectionName: keyof DBState;

  constructor(collectionName: keyof DBState) {
    this.collectionName = collectionName;
  }

  private get items(): T[] {
    return dbState[this.collectionName] as T[];
  }

  find(filter: any = {}): ModelQuery<T> {
    const matched = this.items.filter((item) => matchFilter(item, filter));
    return new ModelQuery<T>(matched);
  }

  async findOne(filter: any = {}): Promise<T | null> {
    const found = this.items.find((item) => matchFilter(item, filter));
    return found ? { ...found } : null;
  }

  async findById(id: string): Promise<T | null> {
    return this.findOne({ _id: id });
  }

  async create(data: Partial<T> | Partial<T>[]): Promise<any> {
    if (Array.isArray(data)) {
      const created = data.map((d) => this.insertSingle(d));
      persistDB();
      return created;
    }
    const created = this.insertSingle(data);
    persistDB();
    return created;
  }

  private insertSingle(data: Partial<T>): T {
    const id = (data as any)._id || (data as any).id || generateId();
    const now = new Date().toISOString();
    const record = {
      ...data,
      _id: id,
      id: id,
      createdAt: (data as any).createdAt || now,
      updatedAt: (data as any).updatedAt || now,
    } as unknown as T;
    this.items.push(record);
    return record;
  }

  async updateOne(filter: any, update: any): Promise<{ modifiedCount: number }> {
    const idx = this.items.findIndex((item) => matchFilter(item, filter));
    if (idx === -1) return { modifiedCount: 0 };
    const current = this.items[idx];
    const updatedData = update.$set ? { ...current, ...update.$set } : { ...current, ...update };
    if (update.$inc) {
      for (const [k, v] of Object.entries(update.$inc)) {
        (updatedData as any)[k] = ((updatedData as any)[k] || 0) + Number(v);
      }
    }
    (updatedData as any).updatedAt = new Date().toISOString();
    this.items[idx] = updatedData;
    persistDB();
    return { modifiedCount: 1 };
  }

  async findByIdAndUpdate(id: string, update: any, _options?: any): Promise<T | null> {
    await this.updateOne({ _id: id }, update);
    return this.findById(id);
  }

  async deleteOne(filter: any): Promise<{ deletedCount: number }> {
    const idx = this.items.findIndex((item) => matchFilter(item, filter));
    if (idx === -1) return { deletedCount: 0 };
    this.items.splice(idx, 1);
    persistDB();
    return { deletedCount: 1 };
  }

  async findByIdAndDelete(id: string): Promise<T | null> {
    const existing = await this.findById(id);
    if (!existing) return null;
    await this.deleteOne({ _id: id });
    return existing;
  }

  async countDocuments(filter: any = {}): Promise<number> {
    return this.items.filter((item) => matchFilter(item, filter)).length;
  }
}

export { dbState, persistDB };
