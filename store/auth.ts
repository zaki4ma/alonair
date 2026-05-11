import { getAuth, signInAnonymously } from 'firebase/auth';
import app from './firebase';

let _uid: string | null = null;
const auth = getAuth(app);

export function getUid(): string | null { return _uid; }

export async function ensureAnonymousAuth(): Promise<string> {
  if (auth.currentUser) {
    _uid = auth.currentUser.uid;
    return _uid;
  }
  const { user } = await signInAnonymously(auth);
  _uid = user.uid;
  return _uid;
}
