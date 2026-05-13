import { getFunctions, httpsCallable } from 'firebase/functions';
import app from './firebase';
import { CategoryId } from '../constants/colors';

export interface DNAResult {
  keywords: string[];
  category: CategoryId;
  colorTemp: number;
  density: number;
  tools: string[];
  mood: string;
}

interface AnalyzeCheckinPhotoRequest {
  base64: string;
  mimeType: string;
}

const functions = getFunctions(app, 'asia-northeast1');
const analyzeCheckinPhotoCallable = httpsCallable<AnalyzeCheckinPhotoRequest, DNAResult>(
  functions,
  'analyzeCheckinPhoto'
);

export async function analyzeCheckinPhoto(base64: string, mimeType = 'image/jpeg'): Promise<DNAResult> {
  const normalizedMimeType = /^image\/(jpeg|jpg|png|webp)$/i.test(mimeType)
    ? mimeType
    : 'image/jpeg';
  const result = await analyzeCheckinPhotoCallable({ base64, mimeType: normalizedMimeType });
  return result.data;
}
