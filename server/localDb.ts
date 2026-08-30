import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export interface LocalDbSchema {
  users: Record<string, any>;
  sessions: Record<string, any>;
  settings: Record<string, any>;
  chats: Record<string, any>;
  sites: Record<string, any>;
  plans: Record<string, any>;
  coupons: Record<string, any>;
  transactions: Record<string, any>;
  user_apis: Record<string, any>;
  user_api_keys: Record<string, any>;
}

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'aurum_db.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initial default database structure
const defaultDbData: LocalDbSchema = {
  users: {},
  sessions: {},
  settings: {
    system: {
      nvidiaNimKey: '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',
      nvidiaNimEnabled: true,
      nvidiaNimProvider: 'NVIDIA NIM (free)',
      nvidiaNimDisplayName: 'NVIDIA NIM (build.nvidia.com)',
      nvidiaNimModel: 'meta/llama-3.3-70b-instruct',
      nvidiaNimChatModel: 'meta/llama-3.3-70b-instruct',
      nvidiaNimPriority: 1,
      nvidiaNimImageModel: 'black-forest-labs/flux.1-dev',
      oxapayKey: '',
      adminEmails: ['teamthunderofficialyt@gmail.com', 'freefiregtamcpe@gmail.com'],
      updatedAt: new Date().toISOString()
    }
  },
  chats: {},
  sites: {},
  plans: {
    plan_free: {
      id: 'plan_free',
      name: 'Free (Spark)',
      priceINR: 0,
      queriesLimit: 50,
      description: 'Standard daily generative capacity (50 priority queries per day).',
      createdAt: new Date().toISOString()
    },
    plan_starter: {
      id: 'plan_starter',
      name: 'Starter',
      priceINR: 199,
      queriesLimit: 250,
      description: 'Expanded daily allowance (250 priority queries per day) with accelerated models.',
      createdAt: new Date().toISOString()
    },
    plan_pro: {
      id: 'plan_pro',
      name: 'Pro Sovereign',
      priceINR: 499,
      queriesLimit: 1000,
      description: 'High capacity allowance (1,000 priority queries per day) + priority synthesis.',
      createdAt: new Date().toISOString()
    },
    plan_pro_plus: {
      id: 'plan_pro_plus',
      name: 'Pro Plus',
      priceINR: 899,
      queriesLimit: 2500,
      description: 'Ultimate power allowance (2,500 priority queries per day) with developer API access.',
      createdAt: new Date().toISOString()
    },
    plan_enterprise: {
      id: 'plan_enterprise',
      name: 'Enterprise',
      priceINR: 1999,
      queriesLimit: -1,
      description: 'Unlimited queries, dedicated GPU cluster access, and 24/7 priority support.',
      createdAt: new Date().toISOString()
    }
  },
  coupons: {
    FREE: { code: 'FREE', discount: 100, type: 'percent', planId: 'all', active: true },
    FREEAURUM: { code: 'FREEAURUM', discount: 100, type: 'percent', planId: 'all', active: true },
    AURUM100: { code: 'AURUM100', discount: 100, type: 'percent', planId: 'all', active: true },
    WELCOME50: { code: 'WELCOME50', discount: 50, type: 'percent', planId: 'all', active: true },
    DISCOUNT50: { code: 'DISCOUNT50', discount: 50, type: 'percent', planId: 'all', active: true },
    AURUM50: { code: 'AURUM50', discount: 50, type: 'percent', planId: 'all', active: true },
    AURUM20: { code: 'AURUM20', discount: 20, type: 'percent', planId: 'all', active: true }
  },
  transactions: {},
  user_apis: {},
  user_api_keys: {}
};

class LocalDatabase {
  private data: LocalDbSchema;
  private saveTimeout: NodeJS.Timeout | null = null;

  constructor() {
    this.data = this.loadData();
  }

  private loadData(): LocalDbSchema {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        console.log(`[LocalDb] Successfully loaded VPS database from ${DB_FILE}`);
        return {
          users: { ...defaultDbData.users, ...(parsed.users || {}) },
          sessions: { ...defaultDbData.sessions, ...(parsed.sessions || {}) },
          settings: { ...defaultDbData.settings, ...(parsed.settings || {}) },
          chats: { ...defaultDbData.chats, ...(parsed.chats || {}) },
          sites: { ...defaultDbData.sites, ...(parsed.sites || {}) },
          plans: { ...defaultDbData.plans, ...(parsed.plans || {}) },
          coupons: { ...defaultDbData.coupons, ...(parsed.coupons || {}) },
          transactions: { ...defaultDbData.transactions, ...(parsed.transactions || {}) },
          user_apis: { ...defaultDbData.user_apis, ...(parsed.user_apis || {}) },
          user_api_keys: { ...defaultDbData.user_api_keys, ...(parsed.user_api_keys || {}) }
        };
      }
    } catch (err: any) {
      console.warn(`[LocalDb] Could not read existing DB file: ${err.message}. Initializing defaults.`);
    }

    this.saveDataImmediately(defaultDbData);
    return defaultDbData;
  }

  private saveDataImmediately(dataToSave: LocalDbSchema) {
    try {
      const tempPath = `${DB_FILE}.tmp.${Date.now()}`;
      fs.writeFileSync(tempPath, JSON.stringify(dataToSave, null, 2), 'utf-8');
      fs.renameSync(tempPath, DB_FILE);
    } catch (err: any) {
      console.error(`[LocalDb] Failed to save DB file:`, err.message);
    }
  }

  public scheduleSave() {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    this.saveTimeout = setTimeout(() => {
      this.saveDataImmediately(this.data);
      this.saveTimeout = null;
    }, 150);
  }

  public flush() {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
      this.saveTimeout = null;
    }
    this.saveDataImmediately(this.data);
  }

  public getRawData(): LocalDbSchema {
    return this.data;
  }

  // Password hashing utility (SHA-256 with salt)
  public hashPassword(password: string, salt?: string): string {
    const actualSalt = salt || crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, actualSalt, 1000, 64, 'sha256').toString('hex');
    return `${actualSalt}:${hash}`;
  }

  public verifyPassword(password: string, storedHash: string): boolean {
    if (!storedHash || !storedHash.includes(':')) {
      // Fallback simple hash comparison if needed
      const simple = crypto.createHash('sha256').update(password).digest('hex');
      return simple === storedHash;
    }
    const [salt, originalHash] = storedHash.split(':');
    const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha256').toString('hex');
    return hash === originalHash;
  }

  public createSessionToken(userId: string, email: string): string {
    const token = 'aurum_sess_' + crypto.randomBytes(32).toString('hex');
    this.data.sessions[token] = {
      token,
      userId,
      email,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
    };
    this.scheduleSave();
    return token;
  }

  public verifySession(token: string): { userId: string; email: string } | null {
    if (!token) return null;
    const session = this.data.sessions[token];
    if (!session) return null;
    if (session.expiresAt && new Date(session.expiresAt).getTime() < Date.now()) {
      delete this.data.sessions[token];
      this.scheduleSave();
      return null;
    }
    return { userId: session.userId, email: session.email };
  }

  public removeSession(token: string) {
    if (this.data.sessions[token]) {
      delete this.data.sessions[token];
      this.scheduleSave();
    }
  }

  // Firestore-compatible collection interface
  public collection(collectionName: keyof LocalDbSchema | string) {
    const colName = collectionName as keyof LocalDbSchema;
    if (!this.data[colName]) {
      this.data[colName] = {};
    }

    return new LocalCollectionQuery(this, colName);
  }
}

export class LocalCollectionQuery {
  private db: LocalDatabase;
  private collectionName: keyof LocalDbSchema;
  private filters: Array<{ field: string; op: string; value: any }> = [];
  private orderConfig?: { field: string; direction: 'asc' | 'desc' };
  private limitCount?: number;

  constructor(db: LocalDatabase, collectionName: keyof LocalDbSchema) {
    this.db = db;
    this.collectionName = collectionName;
  }

  public doc(docId?: string) {
    const id = docId || crypto.randomUUID();
    return new LocalDocumentReference(this.db, this.collectionName, id);
  }

  public where(field: string, op: string, value: any) {
    this.filters.push({ field, op, value });
    return this;
  }

  public orderBy(field: string, direction: 'asc' | 'desc' = 'asc') {
    this.orderConfig = { field, direction };
    return this;
  }

  public limit(count: number) {
    this.limitCount = count;
    return this;
  }

  public async get() {
    const rawCol = this.db.getRawData()[this.collectionName] || {};
    let entries = Object.entries(rawCol).map(([id, data]) => ({ id, data: { ...data, id } }));

    // Apply filters
    for (const filter of this.filters) {
      entries = entries.filter(entry => {
        const itemVal = entry.data[filter.field];
        if (filter.op === '==' || filter.op === '===') {
          return itemVal === filter.value;
        }
        if (filter.op === '!=') {
          return itemVal !== filter.value;
        }
        if (filter.op === '>') {
          return itemVal > filter.value;
        }
        if (filter.op === '>=') {
          return itemVal >= filter.value;
        }
        if (filter.op === '<') {
          return itemVal < filter.value;
        }
        if (filter.op === '<=') {
          return itemVal <= filter.value;
        }
        if (filter.op === 'in' && Array.isArray(filter.value)) {
          return filter.value.includes(itemVal);
        }
        return true;
      });
    }

    // Apply sorting
    if (this.orderConfig) {
      const { field, direction } = this.orderConfig;
      entries.sort((a, b) => {
        const valA = a.data[field];
        const valB = b.data[field];
        if (valA === valB) return 0;
        if (valA === undefined || valA === null) return direction === 'asc' ? -1 : 1;
        if (valB === undefined || valB === null) return direction === 'asc' ? 1 : -1;
        if (direction === 'asc') {
          return valA > valB ? 1 : -1;
        } else {
          return valA < valB ? 1 : -1;
        }
      });
    }

    // Apply limit
    if (this.limitCount !== undefined && this.limitCount > 0) {
      entries = entries.slice(0, this.limitCount);
    }

    const docs = entries.map(e => ({
      id: e.id,
      exists: true,
      data: () => ({ ...e.data })
    }));

    return {
      empty: docs.length === 0,
      size: docs.length,
      docs,
      forEach: (callback: (doc: any) => void) => docs.forEach(callback)
    };
  }
}

export class LocalDocumentReference {
  public id: string;
  private db: LocalDatabase;
  private collectionName: keyof LocalDbSchema;

  constructor(db: LocalDatabase, collectionName: keyof LocalDbSchema, id: string) {
    this.db = db;
    this.collectionName = collectionName;
    this.id = id;
  }

  public async get() {
    const rawCol = this.db.getRawData()[this.collectionName] || {};
    const item = rawCol[this.id];
    const exists = !!item;

    return {
      id: this.id,
      exists,
      data: () => (exists ? { ...item, id: this.id } : undefined)
    };
  }

  public async set(data: any, options?: { merge?: boolean }) {
    const rawCol = this.db.getRawData()[this.collectionName] || {};
    const existing = (options?.merge && rawCol[this.id]) ? { ...rawCol[this.id] } : {};
    const merged = { ...existing };

    for (const [key, value] of Object.entries(data)) {
      if (value && typeof value === 'object' && (value as any).__op === 'arrayUnion') {
        const arr = Array.isArray(merged[key]) ? [...merged[key]] : [];
        for (const item of (value as any).elements) {
          arr.push(item);
        }
        merged[key] = arr;
      } else if (value && typeof value === 'object' && (value as any).__op === 'increment') {
        const current = typeof merged[key] === 'number' ? merged[key] : 0;
        merged[key] = current + (value as any).amount;
      } else if (value && typeof value === 'object' && (value as any).__op === 'serverTimestamp') {
        merged[key] = new Date().toISOString();
      } else if (value && typeof value === 'object' && (value as any).__op === 'delete') {
        delete merged[key];
      } else {
        merged[key] = value;
      }
    }

    merged.id = this.id;
    rawCol[this.id] = JSON.parse(JSON.stringify(merged));
    this.db.getRawData()[this.collectionName] = rawCol;
    this.db.scheduleSave();
    return { id: this.id };
  }

  public async update(data: any) {
    return this.set(data, { merge: true });
  }

  public async delete() {
    const rawCol = this.db.getRawData()[this.collectionName] || {};
    if (rawCol[this.id]) {
      delete rawCol[this.id];
      this.db.scheduleSave();
    }
    return { id: this.id };
  }
}

export const localDb = new LocalDatabase();

export const FieldValue = {
  serverTimestamp: () => ({ __op: 'serverTimestamp' }),
  delete: () => ({ __op: 'delete' }),
  arrayUnion: (...elements: any[]) => ({ __op: 'arrayUnion', elements }),
  increment: (amount: number) => ({ __op: 'increment', amount })
};
