import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot
} from 'firebase/firestore';
import { db } from '../firebase';
import { syncPirivuToLedger } from '../utils';

export const PIRIVU_COL = 'pirivu';
export const LEDGER_COL = 'ledger';
export const CONFIG_COL = 'config';
export const SECURITY_DOC = 'security';
export const DEFAULT_PIN = '2024';
export const MASTER_RECOVERY_KEY = 'ALUMBAL@SEC2024';

const PIN_SALT = 'ALUMBAL_DEVASWOM_SALT_SECURE_2024';

/**
 * Computes a salted SHA-256 hash for secure PIN storage and validation.
 */
export async function hashPin(pin) {
  const encoder = new TextEncoder();
  const data = encoder.encode(String(pin).trim() + PIN_SALT);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Real-time listener for the temple security configuration (PIN hash).
 */
export function subscribeToSecurityConfig(onData, onError) {
  const docRef = doc(db, CONFIG_COL, SECURITY_DOC);
  return onSnapshot(docRef, snap => {
    if (snap.exists()) {
      onData(snap.data());
    } else {
      onData(null);
    }
  }, err => {
    console.warn('Security config listener notice:', err);
    if (onError) onError(err);
  });
}

/**
 * Updates the temple PIN in Cloud Firestore with salted SHA-256 hash.
 */
export async function updateSecurityPinInCloud(newPin) {
  const pinHash = await hashPin(newPin);
  const docRef = doc(db, CONFIG_COL, SECURITY_DOC);
  await setDoc(docRef, {
    pinHash,
    updatedAt: Date.now()
  }, { merge: true });
  return pinHash;
}

/**
 * Real-time listener for Pirivu records.
 * Automatically updates when online or offline cache changes.
 */
export function subscribeToPirivu(onData, onError) {
  const colRef = collection(db, PIRIVU_COL);
  return onSnapshot(
    colRef,
    snapshot => {
      const list = [];
      snapshot.forEach(d => {
        const data = d.data();
        list.push({ ...data, id: d.id });
      });
      // Sort by date descending
      list.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
      onData(list);
    },
    err => {
      console.warn('Firestore Pirivu Sync Notice:', err);
      if (onError) onError(err);
    }
  );
}

/**
 * Real-time listener for Ledger records.
 */
export function subscribeToLedger(onData, onError) {
  const colRef = collection(db, LEDGER_COL);
  return onSnapshot(
    colRef,
    snapshot => {
      const list = [];
      snapshot.forEach(d => {
        const data = d.data();
        list.push({ ...data, id: d.id });
      });
      list.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
      onData(list);
    },
    err => {
      console.warn('Firestore Ledger Sync Notice:', err);
      if (onError) onError(err);
    }
  );
}

/**
 * Save or update a Pirivu record to Cloud Firestore.
 * Also synchronizes the corresponding income entry into the Ledger collection.
 */
export async function savePirivuRecord(rec, currentLedgerList = []) {
  const docRef = doc(db, PIRIVU_COL, String(rec.id));
  await setDoc(docRef, {
    name: rec.name || '',
    house: rec.house || '',
    receiptno: rec.receiptno || '',
    phone: rec.phone || '',
    date: rec.date || new Date().toISOString().slice(0, 10),
    receipt: Number(rec.receipt) || 0,
    paid: Number(rec.paid) || 0,
    occasion: rec.occasion || '',
    remarks: rec.remarks || '',
    updatedAt: Date.now()
  }, { merge: true });

  // Update linked ledger record
  const updatedLedger = syncPirivuToLedger(rec.id, rec, currentLedgerList);
  const linked = updatedLedger.find(r => r.id === 'pirivu_' + rec.id);
  if (linked) {
    const ledgerDocRef = doc(db, LEDGER_COL, linked.id);
    await setDoc(ledgerDocRef, {
      type: 'income',
      date: linked.date,
      amount: Number(linked.amount) || 0,
      desc: linked.desc,
      category: 'പണപ്പിരിവ്',
      linkedPirivu: true,
      pirivuId: rec.id,
      updatedAt: Date.now()
    }, { merge: true });
  } else {
    // If paid is 0, delete any existing linked ledger document
    await deleteDoc(doc(db, LEDGER_COL, 'pirivu_' + rec.id)).catch(() => {});
  }
}

/**
 * Delete a Pirivu record and its linked ledger entry.
 */
export async function deletePirivuRecord(id) {
  await deleteDoc(doc(db, PIRIVU_COL, String(id)));
  await deleteDoc(doc(db, LEDGER_COL, 'pirivu_' + id)).catch(() => {});
}

/**
 * Save or update a Ledger record to Cloud Firestore.
 */
export async function saveLedgerRecord(rec) {
  const docRef = doc(db, LEDGER_COL, String(rec.id));
  await setDoc(docRef, {
    date: rec.date || new Date().toISOString().slice(0, 10),
    type: rec.type || 'income',
    category: rec.category || '',
    desc: rec.desc || '',
    amount: Number(rec.amount) || 0,
    linkedPirivu: !!rec.linkedPirivu,
    pirivuId: rec.pirivuId || '',
    updatedAt: Date.now()
  }, { merge: true });
}

/**
 * Delete a Ledger record. If linked to a pirivu record, also removes it.
 */
export async function deleteLedgerRecord(id) {
  await deleteDoc(doc(db, LEDGER_COL, String(id)));
  if (id.startsWith('pirivu_')) {
    const pirivuId = id.replace('pirivu_', '');
    await deleteDoc(doc(db, PIRIVU_COL, pirivuId)).catch(() => {});
  }
}

/**
 * Transfer existing local storage data to Cloud Firestore.
 */
export async function migrateLocalToCloud(localPirivu = [], localLedger = []) {
  let count = 0;
  for (const p of localPirivu) {
    if (p && p.name) {
      await setDoc(doc(db, PIRIVU_COL, String(p.id)), {
        name: p.name || '',
        house: p.house || '',
        receiptno: p.receiptno || '',
        phone: p.phone || '',
        date: p.date || new Date().toISOString().slice(0, 10),
        receipt: Number(p.receipt) || 0,
        paid: Number(p.paid) || 0,
        occasion: p.occasion || '',
        remarks: p.remarks || '',
        updatedAt: Date.now()
      }, { merge: true });
      count++;
    }
  }

  for (const l of localLedger) {
    if (l && l.desc && Number(l.amount) > 0) {
      await setDoc(doc(db, LEDGER_COL, String(l.id)), {
        date: l.date || new Date().toISOString().slice(0, 10),
        type: l.type || 'income',
        category: l.category || '',
        desc: l.desc || '',
        amount: Number(l.amount) || 0,
        linkedPirivu: !!l.linkedPirivu,
        pirivuId: l.pirivuId || '',
        updatedAt: Date.now()
      }, { merge: true });
      count++;
    }
  }
  return count;
}
