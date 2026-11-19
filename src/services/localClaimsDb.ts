import type { ClaimRecord } from '../types/claim';

const DB_NAME = 'student_overpayment_claims_db';
const DB_VERSION = 1;
const STORE_NAME = 'claims';
const LEGACY_STORAGE_KEY = 'student_overpayment_claims_v1';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB tidak tersedia di lingkungan ini.'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'ticketNumber' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Gagal membuka IndexedDB.'));
  });
}

function readAllFromStore(db: IDBDatabase): Promise<ClaimRecord[]> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.getAll();
    req.onsuccess = () => resolve((req.result as ClaimRecord[]) ?? []);
    req.onerror = () => reject(req.error ?? new Error('Gagal membaca data klaim.'));
  });
}

function putAllToStore(db: IDBDatabase, records: ClaimRecord[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    for (const rec of records) {
      store.put(rec);
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('Gagal menyimpan data klaim.'));
  });
}

function putOneToStore(db: IDBDatabase, record: ClaimRecord): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(record);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('Gagal menyimpan berkas klaim.'));
  });
}

function mergeMissingSeedFields(
  records: ClaimRecord[],
  seedClaims: ClaimRecord[],
): { merged: ClaimRecord[]; changed: boolean } {
  const seedByTicket = new Map(seedClaims.map((s) => [s.ticketNumber, s]));
  let changed = false;
  const merged = records.map((rec) => {
    const seed = seedByTicket.get(rec.ticketNumber);
    if (seed && !rec.periode && seed.periode) {
      changed = true;
      return { ...rec, periode: seed.periode };
    }
    return rec;
  });
  return { merged, changed };
}

export async function getLocalClaims(seedClaims: ClaimRecord[]): Promise<ClaimRecord[]> {
  try {
    const db = await openDb();
    let records = await readAllFromStore(db);

    if (records.length === 0) {
      // Migrasikan data lama dari localStorage jika ada, atau isi seed awal
      let initial = seedClaims;
      try {
        const legacyRaw = localStorage.getItem(LEGACY_STORAGE_KEY);
        if (legacyRaw) {
          const parsed = JSON.parse(legacyRaw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            initial = parsed as ClaimRecord[];
          }
        }
      } catch {
        // Abaikan jika localStorage kosong/rusak
      }
      const { merged } = mergeMissingSeedFields(initial, seedClaims);
      await putAllToStore(db, merged);
      records = merged;
    } else {
      const { merged, changed } = mergeMissingSeedFields(records, seedClaims);
      if (changed) {
        await putAllToStore(db, merged);
        records = merged;
      }
    }

    db.close();
    return records.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  } catch {
    // Fallback ke localStorage jika IndexedDB diblokir
    try {
      const raw = localStorage.getItem(LEGACY_STORAGE_KEY);
      if (!raw) {
        localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(seedClaims));
        return seedClaims;
      }
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return seedClaims;
      const { merged } = mergeMissingSeedFields(parsed as ClaimRecord[], seedClaims);
      return merged;
    } catch {
      return seedClaims;
    }
  }
}

export async function saveLocalClaimRecord(
  record: ClaimRecord,
  seedClaims: ClaimRecord[],
): Promise<ClaimRecord> {
  try {
    const db = await openDb();
    const existing = await readAllFromStore(db);
    if (existing.length === 0) {
      await putAllToStore(db, seedClaims);
    }
    await putOneToStore(db, record);
    db.close();
    return record;
  } catch {
    const existing = await getLocalClaims(seedClaims);
    const exists = existing.some((c) => c.ticketNumber === record.ticketNumber);
    const next = exists
      ? existing.map((c) => (c.ticketNumber === record.ticketNumber ? record : c))
      : [record, ...existing];
    localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(next));
    return record;
  }
}
