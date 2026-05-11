import { CategoryId } from '../constants/colors';

export interface SessionData {
  category: CategoryId;
  keywords: string[];
  tools: string[];
  mood: string;
  colorTemp: number;
  density: number;
  statusText: string;
  startTime: number;
}

let _session: SessionData | null = null;

export function setSession(data: SessionData) { _session = data; }
export function getSession(): SessionData | null { return _session; }
export function clearSession() { _session = null; }
