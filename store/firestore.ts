import {
  getFirestore,
  doc,
  setDoc,
  addDoc,
  updateDoc,
  getDoc,
  getDocs,
  collection,
  deleteDoc,
  query,
  writeBatch,
  where,
  onSnapshot,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import app from './firebase';

const db = getFirestore(app);

// ── Types ──────────────────────────────────────────────────────────────────

export interface CheckinDoc {
  uid: string;
  category: string;
  keywords: string[];
  tools?: string[];
  mood: string;
  colorTemp: number;
  density: number;
  status: string;
  createdAt: Timestamp;
  endedAt?: Timestamp;
  isActive: boolean;
  activeHistoryId?: string;
}

export interface ReactionDoc {
  fromUid: string;
  toUid: string;
  kind: string;
  createdAt: Timestamp;
  seen: boolean;
}

// ── Write ──────────────────────────────────────────────────────────────────

export async function saveCheckin(
  uid: string,
  data: Omit<CheckinDoc, 'uid' | 'createdAt' | 'isActive'>
): Promise<void> {
  const historyRef = await addDoc(collection(db, 'checkinHistory'), {
    uid,
    ...data,
    createdAt: serverTimestamp(),
    isActive: true,
  });

  await setDoc(doc(db, 'checkins', uid), {
    uid,
    ...data,
    createdAt: serverTimestamp(),
    isActive: true,
    activeHistoryId: historyRef.id,
  });
}

export async function endCheckin(uid: string): Promise<void> {
  const activeRef = doc(db, 'checkins', uid);
  const activeSnap = await getDoc(activeRef);
  const activeHistoryId = activeSnap.exists()
    ? (activeSnap.data() as CheckinDoc).activeHistoryId
    : undefined;

  await updateDoc(doc(db, 'checkins', uid), {
    isActive: false,
    endedAt: serverTimestamp(),
  });

  if (activeHistoryId) {
    await updateDoc(doc(db, 'checkinHistory', activeHistoryId), {
      isActive: false,
      endedAt: serverTimestamp(),
    });
  }
}

export async function updateCheckinStatus(uid: string, status: string): Promise<void> {
  await updateDoc(doc(db, 'checkins', uid), { status });
}

export async function sendReaction(fromUid: string, toUid: string, kind: string): Promise<void> {
  await addDoc(collection(db, 'reactions'), {
    fromUid,
    toUid,
    kind,
    createdAt: serverTimestamp(),
    seen: false,
  });
}

export async function markReactionSeen(reactionId: string): Promise<void> {
  await updateDoc(doc(db, 'reactions', reactionId), { seen: true });
}

export async function deleteUserData(uid: string): Promise<void> {
  await deleteDoc(doc(db, 'checkins', uid));

  const historySnap = await getDocs(query(
    collection(db, 'checkinHistory'),
    where('uid', '==', uid)
  ));
  const sentReactionsSnap = await getDocs(query(
    collection(db, 'reactions'),
    where('fromUid', '==', uid)
  ));
  const receivedReactionsSnap = await getDocs(query(
    collection(db, 'reactions'),
    where('toUid', '==', uid)
  ));

  const batch = writeBatch(db);
  historySnap.docs.forEach((historyDoc) => batch.delete(historyDoc.ref));
  sentReactionsSnap.docs.forEach((reactionDoc) => batch.delete(reactionDoc.ref));
  receivedReactionsSnap.docs.forEach((reactionDoc) => batch.delete(reactionDoc.ref));
  await batch.commit();
}

// ── Real-time read ─────────────────────────────────────────────────────────

export function subscribeActiveCheckins(
  category: string,
  callback: (docs: (CheckinDoc & { id: string })[]) => void
): () => void {
  const q = query(
    collection(db, 'checkins'),
    where('isActive', '==', true),
    where('category', '==', category)
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...(d.data() as CheckinDoc) })));
  });
}

export function subscribeIncomingReactions(
  uid: string,
  callback: (docs: (ReactionDoc & { id: string })[]) => void
): () => void {
  const q = query(
    collection(db, 'reactions'),
    where('toUid', '==', uid),
    where('seen', '==', false)
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...(d.data() as ReactionDoc) })));
  });
}

export async function getCheckinHistory(
  uid: string,
  maxItems = 60
): Promise<(CheckinDoc & { id: string })[]> {
  const q = query(
    collection(db, 'checkinHistory'),
    where('uid', '==', uid)
  );
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => ({ id: d.id, ...(d.data() as CheckinDoc) }))
    .sort((a, b) => {
      const aTime = a.createdAt?.toMillis?.() ?? 0;
      const bTime = b.createdAt?.toMillis?.() ?? 0;
      return bTime - aTime;
    })
    .slice(0, maxItems);
}

export async function getCheckinDates(uid: string): Promise<Date[]> {
  const docs = await getCheckinHistory(uid, 120);
  return docs
    .map((doc) => doc.createdAt?.toDate?.())
    .filter((date): date is Date => !!date);
}
