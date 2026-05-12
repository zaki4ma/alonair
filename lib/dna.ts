import { CategoryId } from '../constants/colors';

export type DnaVector = [number, number, number, number, number];

export interface DnaCheckinInput {
  category?: CategoryId;
  density?: number;
  colorTemp?: number;
  tools?: string[];
  createdAt?: Date | number | { toDate?: () => Date; seconds?: number };
  startTime?: Date | number | { toDate?: () => Date; seconds?: number };
  endedAt?: Date | number | { toDate?: () => Date; seconds?: number };
  durationMinutes?: number;
}

export interface DnaProfile {
  axes: DnaVector;
  tribe: TribeDefinition;
  sampleCount: number;
}

export interface TribeDefinition {
  id: string;
  name: string;
  description: string;
  rarityPct: number;
}

export interface DnaMatchCandidate<T = unknown> {
  id: string;
  axes: DnaVector;
  category?: CategoryId;
  payload?: T;
}

export interface DnaMatch<T = unknown> extends DnaMatchCandidate<T> {
  score: number;
}

const DEFAULT_VECTOR: DnaVector = [0.5, 0.5, 0.5, 0.5, 0.5];

const DIGITAL_TOOL_PATTERNS = [
  /mac\s*book/i,
  /ipad/i,
  /iphone/i,
  /pc/i,
  /laptop/i,
  /computer/i,
  /tablet/i,
  /keyboard/i,
  /monitor/i,
  /notion/i,
  /figma/i,
  /vs\s*code/i,
  /パソコン/,
  /ノートpc/i,
  /タブレット/,
  /キーボード/,
  /モニター/,
  /ディスプレイ/,
  /スマホ/,
];

const TRIBES: Record<string, TribeDefinition> = {
  focused_morning_digital: {
    id: 'focused_morning_digital',
    name: '暁のハイブリッド賢者',
    description: '朝の静けさとデジタル道具を使って、深い集中を積み上げるタイプ。',
    rarityPct: 3.8,
  },
  focused_morning_analog: {
    id: 'focused_morning_analog',
    name: '朝霧の没入職人',
    description: '早い時間に手触りのある作業へ入り込み、安定したリズムを作るタイプ。',
    rarityPct: 5.4,
  },
  focused_night_digital: {
    id: 'focused_night_digital',
    name: '深夜の構築術師',
    description: '夜の静かな時間に、論理とツールで作業を前に進めるタイプ。',
    rarityPct: 4.6,
  },
  focused_night_analog: {
    id: 'focused_night_analog',
    name: '月影の探究者',
    description: '夜に集中力が高まり、ひとつの対象を粘り強く掘り下げるタイプ。',
    rarityPct: 6.2,
  },
  divergent_morning_digital: {
    id: 'divergent_morning_digital',
    name: '朝光の発想編集者',
    description: '朝の軽さを使って、情報やアイデアを素早く組み替えるタイプ。',
    rarityPct: 7.1,
  },
  divergent_morning_analog: {
    id: 'divergent_morning_analog',
    name: '陽だまりの試行家',
    description: '身体感覚と直感を頼りに、朝から小さな実験を重ねるタイプ。',
    rarityPct: 8.8,
  },
  divergent_night_digital: {
    id: 'divergent_night_digital',
    name: '夜風のプロトタイパー',
    description: '夜の勢いで発想を形にし、デジタル環境で素早く試すタイプ。',
    rarityPct: 5.9,
  },
  divergent_night_analog: {
    id: 'divergent_night_analog',
    name: '宵の感性採集者',
    description: '日が暮れてから感覚が開き、偶然や余白から作業を育てるタイプ。',
    rarityPct: 9.7,
  },
  logical_longrun: {
    id: 'logical_longrun',
    name: '長距離の設計者',
    description: '論理的に整理しながら、長い時間をかけて成果を積み上げるタイプ。',
    rarityPct: 4.2,
  },
  creative_longrun: {
    id: 'creative_longrun',
    name: '持続する創造家',
    description: '感性の波を保ちながら、長く作り続ける粘り強いタイプ。',
    rarityPct: 4.9,
  },
  balanced: {
    id: 'balanced',
    name: '均衡のワーカー',
    description: '環境や時間帯に合わせて、集中と発想のバランスを取るタイプ。',
    rarityPct: 12.5,
  },
};

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0.5;
  return Math.max(0, Math.min(1, value));
}

function average(values: number[]): number {
  if (values.length === 0) return 0.5;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function toDate(value: DnaCheckinInput['createdAt']): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === 'number') return new Date(value);
  if (typeof value.toDate === 'function') return value.toDate();
  if (typeof value.seconds === 'number') return new Date(value.seconds * 1000);
  return null;
}

function getStartDate(input: DnaCheckinInput): Date | null {
  return toDate(input.startTime) ?? toDate(input.createdAt);
}

function getDurationMinutes(input: DnaCheckinInput): number | null {
  if (typeof input.durationMinutes === 'number') return Math.max(0, input.durationMinutes);

  const start = getStartDate(input);
  const end = toDate(input.endedAt);
  if (!start || !end) return null;

  return Math.max(0, (end.getTime() - start.getTime()) / 60000);
}

function calculateMorningness(input: DnaCheckinInput): number {
  const start = getStartDate(input);
  if (!start) return 0.5;

  const hour = start.getHours() + start.getMinutes() / 60;
  if (hour >= 4 && hour < 7) return 1;
  if (hour >= 7 && hour < 10) return 0.82;
  if (hour >= 10 && hour < 13) return 0.62;
  if (hour >= 13 && hour < 18) return 0.42;
  if (hour >= 18 && hour < 22) return 0.22;
  return 0.1;
}

function calculateDigitalAffinity(input: DnaCheckinInput): number {
  const tools = input.tools ?? [];
  if (tools.length === 0) return input.category === 'work' || input.category === 'study' ? 0.58 : 0.35;

  const digitalCount = tools.filter((tool) =>
    DIGITAL_TOOL_PATTERNS.some((pattern) => pattern.test(tool))
  ).length;

  return clamp01(digitalCount / tools.length);
}

function durationToEndurance(minutes: number | null): number {
  if (minutes === null) return 0.5;
  return clamp01((minutes - 15) / 105);
}

export function calculateDnaVector(checkins: DnaCheckinInput[]): DnaVector {
  if (checkins.length === 0) return DEFAULT_VECTOR;

  const focus = average(checkins.map((item) => clamp01(item.density ?? 0.5)));
  const logic = average(checkins.map((item) => clamp01(item.colorTemp ?? 0.5)));
  const digital = average(checkins.map(calculateDigitalAffinity));
  const morning = average(checkins.map(calculateMorningness));
  const endurance = average(checkins.map((item) => durationToEndurance(getDurationMinutes(item))));

  return [focus, logic, digital, morning, endurance];
}

export function getTribeDefinition(axes: DnaVector): TribeDefinition {
  const [focus, logic, digital, morning, endurance] = axes;

  if (endurance >= 0.72 && logic >= 0.58) return TRIBES.logical_longrun;
  if (endurance >= 0.72 && logic < 0.58) return TRIBES.creative_longrun;

  const focusKey = focus >= 0.55 ? 'focused' : 'divergent';
  const timeKey = morning >= 0.55 ? 'morning' : 'night';
  const toolKey = digital >= 0.5 ? 'digital' : 'analog';
  const key = `${focusKey}_${timeKey}_${toolKey}`;

  return TRIBES[key] ?? TRIBES.balanced;
}

export function calculateDnaProfile(checkins: DnaCheckinInput[]): DnaProfile {
  const axes = calculateDnaVector(checkins);
  return {
    axes,
    tribe: getTribeDefinition(axes),
    sampleCount: checkins.length,
  };
}

export function cosineSimilarity(a: DnaVector, b: DnaVector): number {
  const dot = a.reduce((sum, value, index) => sum + value * b[index], 0);
  const magA = Math.sqrt(a.reduce((sum, value) => sum + value * value, 0));
  const magB = Math.sqrt(b.reduce((sum, value) => sum + value * value, 0));
  if (magA === 0 || magB === 0) return 0;
  return clamp01(dot / (magA * magB));
}

export function findClosestDnaMatch<T>(
  myAxes: DnaVector,
  candidates: DnaMatchCandidate<T>[],
  category?: CategoryId
): DnaMatch<T> | null {
  const scoped = category
    ? candidates.filter((candidate) => !candidate.category || candidate.category === category)
    : candidates;

  return scoped.reduce<DnaMatch<T> | null>((best, candidate) => {
    const score = cosineSimilarity(myAxes, candidate.axes);
    if (!best || score > best.score) return { ...candidate, score };
    return best;
  }, null);
}

export function analyzeWorkDna(checkins: DnaCheckinInput[]): DnaProfile {
  return calculateDnaProfile(checkins);
}
