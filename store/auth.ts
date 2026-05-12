import {
  getAuth,
  onAuthStateChanged,
  signInAnonymously,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from 'firebase/auth';
import app from './firebase';

let _uid: string | null = null;
const auth = getAuth(app);

export function getUid(): string | null { return _uid; }

export function getCurrentUser(): User | null {
  return auth.currentUser;
}

export function subscribeAuthUser(callback: (user: User | null) => void): () => void {
  return onAuthStateChanged(auth, (user) => {
    _uid = user?.uid ?? null;
    callback(user);
  });
}

export async function ensureAnonymousAuth(): Promise<string> {
  if (auth.currentUser) {
    _uid = auth.currentUser.uid;
    return _uid;
  }
  const { user } = await signInAnonymously(auth);
  _uid = user.uid;
  return _uid;
}

export async function signInAdmin(email: string, password: string): Promise<User> {
  const { user } = await signInWithEmailAndPassword(auth, email.trim(), password);
  _uid = user.uid;
  return user;
}

export async function signOutCurrentUser(): Promise<void> {
  await signOut(auth);
  _uid = null;
}

export async function currentUserHasAdminClaim(): Promise<boolean> {
  const user = auth.currentUser;
  if (!user) return false;

  const token = await user.getIdTokenResult(true);
  return token.claims.admin === true;
}
