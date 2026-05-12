import {
  collection,
  getDocs,
  limit,
  query,
  Timestamp,
  where,
} from 'firebase/firestore';
import app from './firebase';
import { getFirestore } from 'firebase/firestore';
import { Categories, type CategoryId } from '../constants/colors';
import type { BlockDoc, CheckinDoc, ReactionDoc } from './firestore';

const db = getFirestore(app);
const RECENT_LIMIT = 200;

export interface AdminCategorySnapshot {
  id: CategoryId;
  label: string;
  color: string;
  activeCount: number;
  staleCount: number;
  todayCheckins: number;
}

export interface AdminRiskUser {
  uid: string;
  sentReactions: number;
  receivedReactions: number;
  blocksMade: number;
  blockedBy: number;
  riskScore: number;
}

export interface AdminDashboardSnapshot {
  generatedAt: Date;
  totalActive: number;
  staleActive: number;
  todayCheckins: number;
  todayReactions: number;
  totalBlocks: number;
  uniqueUsersToday: number;
  categories: AdminCategorySnapshot[];
  recentCheckins: (CheckinDoc & { id: string })[];
  riskUsers: AdminRiskUser[];
}

function timestampToMillis(value?: Timestamp): number {
  return value?.toMillis?.() ?? 0;
}

function isToday(timestamp?: Timestamp): boolean {
  const millis = timestampToMillis(timestamp);
  if (!millis) return false;

  const date = new Date(millis);
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

function ensureRiskUser(map: Map<string, AdminRiskUser>, uid: string): AdminRiskUser {
  const current = map.get(uid);
  if (current) return current;

  const next: AdminRiskUser = {
    uid,
    sentReactions: 0,
    receivedReactions: 0,
    blocksMade: 0,
    blockedBy: 0,
    riskScore: 0,
  };
  map.set(uid, next);
  return next;
}

function calculateRiskUsers(reactions: ReactionDoc[], blocks: BlockDoc[]): AdminRiskUser[] {
  const users = new Map<string, AdminRiskUser>();

  reactions.forEach((reaction) => {
    ensureRiskUser(users, reaction.fromUid).sentReactions += 1;
    ensureRiskUser(users, reaction.toUid).receivedReactions += 1;
  });

  blocks.forEach((block) => {
    ensureRiskUser(users, block.blockerUid).blocksMade += 1;
    ensureRiskUser(users, block.blockedUid).blockedBy += 1;
  });

  return Array.from(users.values())
    .map((user) => ({
      ...user,
      riskScore: user.sentReactions * 1 + user.blocksMade * 2 + user.blockedBy * 4,
    }))
    .filter((user) => user.riskScore > 0)
    .sort((a, b) => b.riskScore - a.riskScore)
    .slice(0, 10);
}

export async function getAdminDashboardSnapshot(): Promise<AdminDashboardSnapshot> {
  const now = Date.now();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayStartTimestamp = Timestamp.fromDate(todayStart);

  const [activeSnap, historySnap, reactionsSnap, blocksSnap] = await Promise.all([
    getDocs(collection(db, 'checkins')),
    getDocs(query(
      collection(db, 'checkinHistory'),
      where('createdAt', '>=', todayStartTimestamp),
      limit(RECENT_LIMIT)
    )),
    getDocs(query(
      collection(db, 'reactions'),
      where('createdAt', '>=', todayStartTimestamp),
      limit(RECENT_LIMIT)
    )),
    getDocs(collection(db, 'blocks')),
  ]);

  const activeCheckins = activeSnap.docs.map((doc) => ({
    id: doc.id,
    ...(doc.data() as CheckinDoc),
  }));
  const todayHistory = historySnap.docs.map((doc) => ({
    id: doc.id,
    ...(doc.data() as CheckinDoc),
  }));
  const todayReactions = reactionsSnap.docs.map((doc) => doc.data() as ReactionDoc);
  const blocks = blocksSnap.docs.map((doc) => doc.data() as BlockDoc);

  const freshActive = activeCheckins.filter((checkin) => {
    const expiresAt = timestampToMillis(checkin.expiresAt);
    return checkin.isActive && expiresAt > now;
  });
  const staleActive = activeCheckins.filter((checkin) => {
    const expiresAt = timestampToMillis(checkin.expiresAt);
    return checkin.isActive && (!expiresAt || expiresAt <= now);
  });
  const usersToday = new Set(todayHistory.filter((doc) => isToday(doc.createdAt)).map((doc) => doc.uid));

  const categories = Object.values(Categories).map((category) => {
    const id = category.id as CategoryId;
    return {
      id,
      label: category.label,
      color: category.color,
      activeCount: freshActive.filter((checkin) => checkin.category === id).length,
      staleCount: staleActive.filter((checkin) => checkin.category === id).length,
      todayCheckins: todayHistory.filter((checkin) => checkin.category === id).length,
    };
  });

  return {
    generatedAt: new Date(),
    totalActive: freshActive.length,
    staleActive: staleActive.length,
    todayCheckins: todayHistory.length,
    todayReactions: todayReactions.length,
    totalBlocks: blocks.length,
    uniqueUsersToday: usersToday.size,
    categories,
    recentCheckins: todayHistory
      .sort((a, b) => timestampToMillis(b.createdAt) - timestampToMillis(a.createdAt))
      .slice(0, 12),
    riskUsers: calculateRiskUsers(todayReactions, blocks),
  };
}
