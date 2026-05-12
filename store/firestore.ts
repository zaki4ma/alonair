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
const CHECKIN_ACTIVE_TTL_MS = 2 * 60 * 1000;

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
  lastSeenAt?: Timestamp;
  expiresAt?: Timestamp;
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

export interface BlockDoc {
  blockerUid: string;
  blockedUid: string;
  blockedName: string;
  createdAt: Timestamp;
}

// ── Write ──────────────────────────────────────────────────────────────────

export async function saveCheckin(
  uid: string,
  data: Omit<CheckinDoc, 'uid' | 'createdAt' | 'isActive'>
): Promise<void> {
  const expiresAt = Timestamp.fromMillis(Date.now() + CHECKIN_ACTIVE_TTL_MS);
  const historyRef = await addDoc(collection(db, 'checkinHistory'), {
    uid,
    ...data,
    createdAt: serverTimestamp(),
    lastSeenAt: serverTimestamp(),
    expiresAt,
    isActive: true,
  });

  await setDoc(doc(db, 'checkins', uid), {
    uid,
    ...data,
    createdAt: serverTimestamp(),
    lastSeenAt: serverTimestamp(),
    expiresAt,
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
  await updateDoc(doc(db, 'checkins', uid), {
    status,
    lastSeenAt: serverTimestamp(),
    expiresAt: Timestamp.fromMillis(Date.now() + CHECKIN_ACTIVE_TTL_MS),
  });
}

export async function heartbeatCheckin(uid: string): Promise<void> {
  const activeRef = doc(db, 'checkins', uid);
  const expiresAt = Timestamp.fromMillis(Date.now() + CHECKIN_ACTIVE_TTL_MS);
  await updateDoc(activeRef, {
    lastSeenAt: serverTimestamp(),
    expiresAt,
  });
}

export async function sendReaction(fromUid: string, toUid: string, kind: string): Promise<void> {
  const [blockedBySender, blockedByReceiver] = await Promise.all([
    getDoc(doc(db, 'blocks', `${fromUid}_${toUid}`)),
    getDoc(doc(db, 'blocks', `${toUid}_${fromUid}`)),
  ]);
  if (blockedBySender.exists() || blockedByReceiver.exists()) return;

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

export async function blockUser(
  blockerUid: string,
  blockedUid: string,
  blockedName: string
): Promise<void> {
  if (blockerUid === blockedUid) return;

  await setDoc(doc(db, 'blocks', `${blockerUid}_${blockedUid}`), {
    blockerUid,
    blockedUid,
    blockedName,
    createdAt: serverTimestamp(),
  });
}

export async function unblockUser(blockerUid: string, blockedUid: string): Promise<void> {
  await deleteDoc(doc(db, 'blocks', `${blockerUid}_${blockedUid}`));
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
  const blockedByMeSnap = await getDocs(query(
    collection(db, 'blocks'),
    where('blockerUid', '==', uid)
  ));

  const batch = writeBatch(db);
  historySnap.docs.forEach((historyDoc) => batch.delete(historyDoc.ref));
  sentReactionsSnap.docs.forEach((reactionDoc) => batch.delete(reactionDoc.ref));
  receivedReactionsSnap.docs.forEach((reactionDoc) => batch.delete(reactionDoc.ref));
  blockedByMeSnap.docs.forEach((blockDoc) => batch.delete(blockDoc.ref));
  await batch.commit();
}

// ── Real-time read ─────────────────────────────────────────────────────────

export function subscribeActiveCheckins(
  category: string,
  callback: (docs: (CheckinDoc & { id: string })[]) => void
): () => void {
  let latestDocs: (CheckinDoc & { id: string })[] = [];
  const emitFreshDocs = () => {
    const now = Date.now();
    callback(latestDocs.filter((d) => {
      const expiresAt = d.expiresAt?.toMillis?.();
      return typeof expiresAt === 'number' && expiresAt > now;
    }));
  };

  const q = query(
    collection(db, 'checkins'),
    where('isActive', '==', true),
    where('category', '==', category)
  );
  const unsubscribeSnapshot = onSnapshot(q, (snap) => {
    latestDocs = snap.docs.map((d) => ({ id: d.id, ...(d.data() as CheckinDoc) }));
    emitFreshDocs();
  });
  const freshnessTimer = setInterval(emitFreshDocs, 30_000);

  return () => {
    clearInterval(freshnessTimer);
    unsubscribeSnapshot();
  };
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

export function subscribeBlockedUsers(
  uid: string,
  callback: (docs: (BlockDoc & { id: string })[]) => void
): () => void {
  const q = query(
    collection(db, 'blocks'),
    where('blockerUid', '==', uid)
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...(d.data() as BlockDoc) })));
  });
}

export function subscribeBlockedUidSet(
  uid: string,
  callback: (blockedUidSet: Set<string>) => void
): () => void {
  let blockedByMe = new Set<string>();
  let blockingMe = new Set<string>();
  const emit = () => callback(new Set([...blockedByMe, ...blockingMe]));

  const unsubscribeBlockedByMe = onSnapshot(
    query(collection(db, 'blocks'), where('blockerUid', '==', uid)),
    (snap) => {
      blockedByMe = new Set(snap.docs.map((d) => (d.data() as BlockDoc).blockedUid));
      emit();
    }
  );
  const unsubscribeBlockingMe = onSnapshot(
    query(collection(db, 'blocks'), where('blockedUid', '==', uid)),
    (snap) => {
      blockingMe = new Set(snap.docs.map((d) => (d.data() as BlockDoc).blockerUid));
      emit();
    }
  );

  return () => {
    unsubscribeBlockedByMe();
    unsubscribeBlockingMe();
  };
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
