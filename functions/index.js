const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const admin = require('firebase-admin');

admin.initializeApp();

const geminiApiKey = defineSecret('GEMINI_API_KEY');

const CATEGORY_IDS = new Set([
  'study',
  'work',
  'read',
  'gym',
  'walk',
  'fish',
  'drink',
  'cook',
  'make',
  'misc',
]);
const MOODS = new Set(['集中', '発想', '創造', '探索']);
const MAX_BASE64_LENGTH = 8 * 1024 * 1024;

function clamp01(value, fallback = 0.5) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.max(0, Math.min(1, numeric));
}

function sanitizeString(value, fallback, maxLength = 24) {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  if (!trimmed) return fallback;
  return trimmed.slice(0, maxLength);
}

function sanitizeStringArray(value, fallback, maxItems, maxLength = 24) {
  if (!Array.isArray(value)) return fallback;
  const items = value
    .filter((item) => typeof item === 'string')
    .map((item) => item.trim().slice(0, maxLength))
    .filter(Boolean)
    .slice(0, maxItems);
  return items.length > 0 ? items : fallback;
}

function extractJson(raw) {
  const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  const first = cleaned.indexOf('{');
  const last = cleaned.lastIndexOf('}');
  if (first === -1 || last === -1 || last <= first) return cleaned;
  return cleaned.slice(first, last + 1);
}

function sanitizeGeminiResult(parsed) {
  const category = CATEGORY_IDS.has(parsed?.category) ? parsed.category : 'misc';
  const mood = MOODS.has(parsed?.mood) ? parsed.mood : '集中';

  return {
    keywords: sanitizeStringArray(parsed?.keywords, ['作業中'], 4),
    category,
    colorTemp: clamp01(parsed?.colorTemp),
    density: clamp01(parsed?.density),
    tools: sanitizeStringArray(parsed?.tools, [], 6),
    mood: sanitizeString(mood, '集中', 8),
  };
}

exports.analyzeCheckinPhoto = onCall({
  region: 'asia-northeast1',
  secrets: [geminiApiKey],
  timeoutSeconds: 60,
  memory: '512MiB',
  invoker: 'public',
}, async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', 'Authentication is required.');
  }

  const base64 = request.data?.base64;
  const mimeType = request.data?.mimeType ?? 'image/jpeg';

  if (typeof base64 !== 'string' || base64.length === 0) {
    throw new HttpsError('invalid-argument', 'base64 image data is required.');
  }
  if (base64.length > MAX_BASE64_LENGTH) {
    throw new HttpsError('invalid-argument', 'image data is too large.');
  }
  if (typeof mimeType !== 'string' || !/^image\/(jpeg|jpg|png|webp)$/i.test(mimeType)) {
    throw new HttpsError('invalid-argument', 'unsupported image type.');
  }

  const prompt = `Analyze this photo of a solo activity or workspace. Return ONLY a JSON object:
{
  "keywords": ["2-4 Japanese strings of activity/topic"],
  "category": "study|work|read|gym|walk|fish|drink|cook|make|misc",
  "colorTemp": 0.0,
  "density": 0.0,
  "tools": ["detected items in Japanese"],
  "mood": "集中|発想|創造|探索"
}
colorTemp: 0.0=warm orange/amber, 1.0=cool blue/gray
density: 0.0=sparse minimal, 1.0=dense packed
Return raw JSON only, no markdown.`;

  const apiKey = geminiApiKey.value();
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: prompt },
            { inline_data: { mime_type: mimeType, data: base64 } },
          ],
        }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 2048 },
      }),
    }
  );

  const json = await response.json();
  if (!response.ok) {
    const message = json?.error?.message ?? `HTTP ${response.status}`;
    throw new HttpsError('internal', `Gemini request failed: ${message}`);
  }

  const parts = json.candidates?.[0]?.content?.parts ?? [];
  const raw = parts.map((part) => part.text ?? '').join('');
  const finishReason = json.candidates?.[0]?.finishReason ?? 'unknown';
  if (!raw) {
    throw new HttpsError('internal', `Gemini response is empty: ${finishReason}`);
  }

  try {
    return sanitizeGeminiResult(JSON.parse(extractJson(raw)));
  } catch (error) {
    throw new HttpsError('internal', `Failed to parse Gemini JSON: ${String(error).slice(0, 120)}`);
  }
});
