import { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Dimensions,
} from 'react-native';
import Svg, {
  Circle, Line, Polyline, Text as SvgText,
} from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Colors, Categories, CategoryId } from '../constants/colors';
import { getSession } from '../store/session';
import { ensureAnonymousAuth, getUid } from '../store/auth';
import { getCheckinDates } from '../store/firestore';
import { analyzeWorkDna } from '../lib/dna';
import { calculateStreakDays } from '../lib/streak';

const { width: SW } = Dimensions.get('window');

// ── Types ──────────────────────────────────────────────────────────────────

interface HistoryEntry {
  mood: string;
  duration: number; // minutes
  daysAgo: number;
}

// ── Mock history (until Firestore history is implemented) ──────────────────

const MOOD_COLOR: Record<string, string> = {
  集中: '#5C6BC0',
  発想: '#FF8A65',
  創造: '#66BB6A',
  探索: '#90A4AE',
};

const MOCK_HISTORY: HistoryEntry[] = [
  { mood: '集中', duration: 90,  daysAgo: 30 },
  { mood: '探索', duration: 45,  daysAgo: 28 },
  { mood: '集中', duration: 120, daysAgo: 25 },
  { mood: '発想', duration: 60,  daysAgo: 22 },
  { mood: '集中', duration: 100, daysAgo: 20 },
  { mood: '創造', duration: 150, daysAgo: 17 },
  { mood: '集中', duration: 80,  daysAgo: 15 },
  { mood: '集中', duration: 110, daysAgo: 13 },
  { mood: '発想', duration: 50,  daysAgo: 11 },
  { mood: '集中', duration: 130, daysAgo: 9  },
  { mood: '創造', duration: 90,  daysAgo: 7  },
  { mood: '集中', duration: 75,  daysAgo: 5  },
  { mood: '探索', duration: 60,  daysAgo: 3  },
  { mood: '集中', duration: 95,  daysAgo: 1  },
  { mood: '発想', duration: 70,  daysAgo: 0  },
];

// ── Helpers ────────────────────────────────────────────────────────────────

function durationToRadius(min: number): number {
  return Math.max(4, Math.min(11, 4 + min / 20));
}

function calcAxes(session: ReturnType<typeof getSession>): number[] {
  const profile = analyzeWorkDna(session ? [{
    category: session.category,
    density: session.density,
    colorTemp: session.colorTemp,
    tools: session.tools,
    startTime: session.startTime,
    durationMinutes: session.startTime ? (Date.now() - session.startTime) / 60000 : undefined,
  }] : []);

  return profile.axes;

  const mood = session?.mood ?? '集中';
  const category = (session?.category ?? 'study') as CategoryId;
  const hour = session?.startTime ? new Date(session?.startTime ?? Date.now()).getHours() : 7;
  const density = session?.density ?? 0.5;
  const colorTemp = session?.colorTemp ?? 0.5;

  const focusMap: Record<string, number> = { 集中: 0.78, 発想: 0.35, 創造: 0.48, 探索: 0.55 };
  const logicMap: Record<string, number> = { 集中: 0.80, 発想: 0.38, 創造: 0.22, 探索: 0.58 };
  const digitalCats = new Set(['study', 'work']);
  const morningness = hour <= 9 ? 0.85 : hour <= 12 ? 0.65 : hour <= 18 ? 0.45 : 0.15;

  return [
    focusMap[mood] ?? 0.5,
    logicMap[mood] ?? 0.5,
    digitalCats.has(category) ? 0.7 + colorTemp * 0.1 : 0.3 - colorTemp * 0.1,
    morningness,
    density * 0.6 + 0.2,
  ];
}

function getTribeName(category: CategoryId, mood: string): string {
  const map: Partial<Record<CategoryId, Record<string, string>>> = {
    study: { 集中: '暁のハイブリッド賢者', 発想: '思索の探求者', 創造: '知の錬金術師', 探索: '深夜の学術冒険家' },
    work:  { 集中: '孤高の構築者', 発想: '革新の設計士', 創造: '静寂の開拓者', 探索: '未踏領域の開発者' },
    read:  { 集中: '活字の求道者', 発想: '思想の遊牧民', 創造: '物語の考古学者', 探索: '深読みの旅人' },
    gym:   { 集中: '鋼鉄の修行僧', 発想: '躍動する哲学者', 創造: '肉体の彫刻家', 探索: '身体限界の探検家' },
  };
  return map[category]?.[mood] ?? '孤独な作業の達人';
}

function getTribeDesc(category: CategoryId, mood: string): string {
  if (mood === '集中') return '静寂の中で深く潜る、\n圧倒的な集中力の持ち主';
  if (mood === '発想') return 'アイデアが湧き出る瞬間を\n最大限に活かす思考の使い手';
  if (mood === '創造') return '独自の視点で新しいものを\n生み出し続ける希有な存在';
  return '幅広い知を融合させ\n独自の道を切り拓く探求者';
}

// ── DNA Strand ─────────────────────────────────────────────────────────────

function DnaStrand({ history }: { history: HistoryEntry[] }) {
  const step = 80;
  const topY = 28;
  const botY = 68;
  const svgW = (history.length - 1) * step + 80;

  const topEntries = history.filter((_, i) => i % 2 === 0);
  const botEntries = history.filter((_, i) => i % 2 === 1);

  const topXs = topEntries.map((_, i) => 40 + i * step * 2);
  const botXs = botEntries.map((_, i) => 40 + step + i * step * 2);

  const allXs = [...topXs, ...botXs].sort((a, b) => a - b);
  const crossPairs: [number, number, number, number][] = [];
  for (let i = 0; i < allXs.length - 1; i++) {
    const x1 = allXs[i];
    const y1 = topXs.includes(x1) ? topY : botY;
    const x2 = allXs[i + 1];
    const y2 = topXs.includes(x2) ? topY : botY;
    crossPairs.push([x1, y1, x2, y2]);
  }

  const topPoints = topXs.map((x) => `${x},${topY}`).join(' ');
  const botPoints = botXs.map((x) => `${x},${botY}`).join(' ');

  const lastTopX = topXs[topXs.length - 1];

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.strandScroll}>
      <Svg width={svgW + 40} height={100}>
        <Polyline points={topPoints} stroke="#E0E4F8" strokeWidth={1.2} fill="none" />
        <Polyline points={botPoints} stroke="#E0E4F8" strokeWidth={1.2} fill="none" />
        {crossPairs.map(([x1, y1, x2, y2], i) => (
          <Line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
            stroke="#DDE0F0" strokeWidth={1} strokeDasharray="2,2" />
        ))}
        {topEntries.map((entry, i) => {
          const cx = topXs[i];
          const r = durationToRadius(entry.duration);
          const fill = MOOD_COLOR[entry.mood] ?? Colors.slate;
          return (
            <Circle key={`t${i}`} cx={cx} cy={topY} r={r} fill={fill} />
          );
        })}
        {botEntries.map((entry, i) => {
          const cx = botXs[i];
          const r = durationToRadius(entry.duration);
          const fill = MOOD_COLOR[entry.mood] ?? Colors.slate;
          return (
            <Circle key={`b${i}`} cx={cx} cy={botY} r={r} fill={fill} />
          );
        })}
        {topEntries.map((entry, i) => {
          const cx = topXs[i];
          const r = durationToRadius(entry.duration);
          return (
            <Circle key={`tg${i}`} cx={cx} cy={topY} r={r * 0.35} fill="rgba(255,255,255,0.6)" />
          );
        })}
        {botEntries.map((entry, i) => {
          const cx = botXs[i];
          const r = durationToRadius(entry.duration);
          return (
            <Circle key={`bg${i}`} cx={cx} cy={botY} r={r * 0.35} fill="rgba(255,255,255,0.6)" />
          );
        })}
        <Circle cx={lastTopX} cy={topY} r={16} fill="none"
          stroke="rgba(92,107,192,0.25)" strokeWidth={1.5} />
        <SvgText x={topXs[0]} y={92} fontSize={8.5} fill="#CFD8DC" textAnchor="middle">30日前</SvgText>
        <SvgText x={topXs[Math.floor(topXs.length / 2)]} y={92} fontSize={8.5} fill="#CFD8DC" textAnchor="middle">2週前</SvgText>
        <SvgText x={lastTopX} y={92} fontSize={8.5} fill="#90A4AE" textAnchor="middle" fontWeight="600">今日</SvgText>
      </Svg>
    </ScrollView>
  );
}

// ── Axis Row ───────────────────────────────────────────────────────────────

function AxisRow({
  leftLabel, rightLabel, value, color,
}: {
  leftLabel: string; rightLabel: string; value: number; color: string;
}) {
  const trackW = SW - 40 - 34 * 2 - 8 * 2 - 20 * 2;
  const thumbLeft = value * trackW;
  const fillLeft = value >= 0.5 ? 0.5 * trackW : value * trackW;
  const fillWidth = Math.abs(value - 0.5) * trackW;

  return (
    <View style={styles.axisRow}>
      <Text style={[styles.axisLabel, styles.axisLabelRight]}>{leftLabel}</Text>
      <View style={[styles.axisTrack, { width: trackW }]}>
        <View style={[styles.axisFill, {
          left: fillLeft, width: fillWidth, backgroundColor: color,
        }]} />
        <View style={[styles.axisThumb, {
          left: thumbLeft - 5.5,
          backgroundColor: color,
          shadowColor: color,
        }]} />
      </View>
      <Text style={styles.axisLabel}>{rightLabel}</Text>
    </View>
  );
}

// ── Screen ─────────────────────────────────────────────────────────────────

export default function DnaScreen() {
  const insets = useSafeAreaInsets();
  const session = getSession();
  const [streakDays, setStreakDays] = useState(0);
  const category = (session?.category ?? 'study') as CategoryId;
  const cat = Categories[category];
  const mood = session?.mood ?? '集中';
  const dnaProfile = analyzeWorkDna(session ? [{
    category: session.category,
    density: session.density,
    colorTemp: session.colorTemp,
    tools: session.tools,
    startTime: session.startTime,
    durationMinutes: (Date.now() - session.startTime) / 60000,
  }] : []);
  const axes = dnaProfile.axes;
  const tribeName = dnaProfile.tribe.name;
  const tribeDesc = dnaProfile.tribe.description;

  const history: HistoryEntry[] = session
    ? [...MOCK_HISTORY.slice(0, -1), {
        mood: session.mood,
        duration: Math.floor((Date.now() - session.startTime) / 60000),
        daysAgo: 0,
      }]
    : MOCK_HISTORY;

  const sampleCount = history.length;
  const avgStart = '06:24';

  const goBack = useCallback(() => router.back(), []);

  useEffect(() => {
    let mounted = true;

    async function loadStreak() {
      try {
        const uid = getUid() ?? await ensureAnonymousAuth();
        const dates = await getCheckinDates(uid);
        const currentSessionDate = session?.startTime ? [new Date(session.startTime)] : [];
        if (mounted) setStreakDays(calculateStreakDays([...dates, ...currentSessionDate]));
      } catch (e) {
        console.error('[Streak]', e);
        if (mounted) setStreakDays(0);
      }
    }

    loadStreak();
    return () => {
      mounted = false;
    };
  }, [session?.startTime]);

  const AXIS_DEFS = [
    { leftLabel: '発散', rightLabel: '集中', value: axes[0], color: '#5C6BC0' },
    { leftLabel: '創造', rightLabel: '論理', value: axes[1], color: '#FF8A65' },
    { leftLabel: 'アナログ', rightLabel: 'デジタル', value: axes[2], color: '#66BB6A' },
    { leftLabel: '夜型', rightLabel: '朝型', value: axes[3], color: '#5C6BC0' },
    { leftLabel: '短距離', rightLabel: '長距離', value: axes[4], color: '#90A4AE' },
  ];

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* ── Header ── */}
        <View style={styles.header}>
          <Pressable onPress={goBack} style={styles.backBtn} hitSlop={12}>
            <Text style={styles.backArrow}>←</Text>
          </Pressable>

          {/* Tribe symbol */}
          <Svg style={styles.tribeSymbol} width={60} height={60} viewBox="0 0 60 60">
            <Circle cx={30} cy={10} r={9} fill="rgba(255,255,255,0.88)" />
            <Circle cx={12} cy={44} r={7} fill="rgba(255,255,255,0.4)" />
            <Circle cx={48} cy={44} r={7} fill="rgba(255,255,255,0.4)" />
            <Line x1={30} y1={10} x2={12} y2={44} stroke="rgba(255,255,255,0.28)" strokeWidth={1.5} />
            <Line x1={30} y1={10} x2={48} y2={44} stroke="rgba(255,255,255,0.28)" strokeWidth={1.5} />
            <Line x1={12} y1={44} x2={48} y2={44} stroke="rgba(255,255,255,0.28)" strokeWidth={1.5} />
            <Circle cx={30} cy={10} r={9} fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth={6} />
          </Svg>

          <View style={styles.rarityBadge}>
            <Text style={styles.rarityText}>✦ 希少度 上位 0.5%</Text>
          </View>
          <Text style={styles.tribeName}>{tribeName}</Text>
          <Text style={styles.tribeDesc}>{tribeDesc}</Text>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{sampleCount}</Text>
              <Text style={styles.statLabel}>標本数</Text>
            </View>
            <View style={[styles.statItem, styles.statBorder]}>
              <Text style={styles.statValue}>{streakDays}日</Text>
              <Text style={styles.statLabel}>継続</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{avgStart}</Text>
              <Text style={styles.statLabel}>平均開始</Text>
            </View>
          </View>
        </View>

        {/* ── DNA Strand ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>作業DNAストランド — 過去30日</Text>
        </View>
        <View style={styles.legend}>
          {Object.entries(MOOD_COLOR).map(([mood, color]) => (
            <View key={mood} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: color }]} />
              <Text style={styles.legendText}>{mood}</Text>
            </View>
          ))}
        </View>
        <DnaStrand history={history} />

        {/* ── DNA Profile ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>DNAプロファイル</Text>
        </View>
        <View style={styles.card}>
          {AXIS_DEFS.map((ax) => (
            <AxisRow key={ax.leftLabel} {...ax} />
          ))}
        </View>

        {/* ── DNA Match ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>DNA一致</Text>
        </View>
        <View style={styles.matchCard}>
          <Text style={styles.matchLabel}>⚡ 戦友を発見しました</Text>
          <View style={styles.matchBody}>
            <View style={[styles.matchAvatar, { backgroundColor: '#00838F' }]} />
            <View style={styles.matchInfo}>
              <Text style={styles.matchName}>Hana_reads</Text>
              <Text style={styles.matchSub}>朝型 · ハイブリッド · 収束型</Text>
              <View style={styles.matchTags}>
                <View style={styles.pill}><Text style={styles.pillText}>朝活</Text></View>
                <View style={styles.pill}><Text style={styles.pillText}>万年筆</Text></View>
              </View>
            </View>
            <View style={styles.matchPctBlock}>
              <Text style={styles.matchPct}>78%</Text>
              <Text style={styles.matchPctLabel}>一致</Text>
            </View>
          </View>
        </View>

        {/* ── Change Detection ── */}
        <View style={[styles.changeCard, { marginBottom: insets.bottom + 28 }]}>
          <View style={styles.changeIcon}>
            <Text style={{ fontSize: 18 }}>📈</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.changeTitle}>先月との変化を検出</Text>
            <Text style={styles.changeSub}>「発散型」→「収束・構築型」へシフト中</Text>
          </View>
          <Svg width={44} height={26} viewBox="0 0 44 26">
            <Polyline points="0,22 11,17 22,12 33,7 44,3"
              stroke="#5C6BC0" strokeWidth={2} fill="none"
              strokeLinecap="round" strokeLinejoin="round" />
            <Circle cx={44} cy={3} r={3} fill="#5C6BC0" />
          </Svg>
        </View>

      </ScrollView>
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },

  // Header
  header: {
    backgroundColor: '#1E2A82',
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 0,
    position: 'relative',
  },
  backBtn: {
    width: 36, height: 36, justifyContent: 'center', marginBottom: 8,
  },
  backArrow: { fontSize: 22, color: 'rgba(255,255,255,0.95)' },
  tribeSymbol: {
    position: 'absolute', right: 22, top: 52,
  },
  rarityBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,213,79,0.12)',
    borderWidth: 1, borderColor: 'rgba(255,213,79,0.35)',
    borderRadius: 20, paddingHorizontal: 11, paddingVertical: 4,
    marginBottom: 10,
  },
  rarityText: {
    fontSize: 12, color: '#FFD54F', fontWeight: '700', letterSpacing: 0.6,
  },
  tribeName: {
    fontSize: 21, fontWeight: '700', color: '#fff',
    lineHeight: 28, marginBottom: 6, paddingRight: 80,
    fontFamily: 'Outfit_700Bold',
  },
  tribeDesc: {
    fontSize: 13, color: 'rgba(255,255,255,0.82)',
    lineHeight: 19, paddingRight: 80, marginBottom: 20,
  },
  statsRow: {
    flexDirection: 'row',
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)',
    marginHorizontal: -24,
  },
  statItem: {
    flex: 1, alignItems: 'center', paddingVertical: 12,
  },
  statBorder: {
    borderLeftWidth: 1, borderRightWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  statValue: {
    fontSize: 18, fontWeight: '700', color: '#fff', fontFamily: 'Outfit_700Bold',
  },
  statLabel: {
    fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 2, letterSpacing: 0.4,
  },

  // Section
  section: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 4 },
  sectionTitle: {
    fontSize: 13, fontWeight: '700', color: '#546E7A',
    letterSpacing: 0.8, textTransform: 'uppercase',
  },

  // Strand
  strandScroll: { paddingLeft: 20, paddingBottom: 8 },
  legend: {
    flexDirection: 'row', gap: 14, paddingHorizontal: 20, paddingBottom: 14,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 7, height: 7, borderRadius: 4 },
  legendText: { fontSize: 12, color: '#546E7A' },

  // Card
  card: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    marginHorizontal: 20,
    marginBottom: 10,
    padding: 16,
    shadowColor: '#000', shadowOpacity: 0.055, shadowRadius: 14, shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  axisRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14,
  },
  axisLabel: { fontSize: 12, color: '#546E7A', width: 42 },
  axisLabelRight: { textAlign: 'right' },
  axisTrack: {
    height: 3, backgroundColor: '#EEF2FF', borderRadius: 2, position: 'relative',
  },
  axisFill: {
    position: 'absolute', height: '100%', borderRadius: 2,
  },
  axisThumb: {
    position: 'absolute', top: -4, width: 11, height: 11,
    borderRadius: 6, borderWidth: 2, borderColor: '#fff',
    shadowOpacity: 0.5, shadowRadius: 4, shadowOffset: { width: 0, height: 1 },
  },

  // Match
  matchCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    marginHorizontal: 20,
    marginBottom: 10,
    padding: 16,
    borderLeftWidth: 3, borderLeftColor: '#5C6BC0',
    shadowColor: '#000', shadowOpacity: 0.055, shadowRadius: 14, shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  matchLabel: {
    fontSize: 12, fontWeight: '700', color: '#5C6BC0',
    letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 10,
  },
  matchBody: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  matchAvatar: { width: 42, height: 42, borderRadius: 21, flexShrink: 0 },
  matchInfo: { flex: 1 },
  matchName: { fontSize: 13, fontWeight: '600', color: Colors.charcoal, fontFamily: 'Outfit_600SemiBold' },
  matchSub: { fontSize: 12, color: '#546E7A', marginTop: 2 },
  matchTags: { flexDirection: 'row', gap: 4, marginTop: 6 },
  pill: { backgroundColor: '#EEF2FF', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  pillText: { fontSize: 12, color: '#5C6BC0' },
  matchPctBlock: { alignItems: 'center' },
  matchPct: { fontSize: 26, fontWeight: '700', color: '#5C6BC0', fontFamily: 'Outfit_700Bold', lineHeight: 30 },
  matchPctLabel: { fontSize: 12, color: '#546E7A', marginTop: 1 },

  // Change
  changeCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.card,
    borderRadius: 16,
    marginHorizontal: 20,
    padding: 14,
    shadowColor: '#000', shadowOpacity: 0.055, shadowRadius: 14, shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  changeIcon: {
    width: 38, height: 38, borderRadius: 10, backgroundColor: '#EEF2FF',
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  changeTitle: { fontSize: 12, fontWeight: '600', color: Colors.charcoal, fontFamily: 'Outfit_600SemiBold' },
  changeSub: { fontSize: 13, color: '#546E7A', marginTop: 2 },
});
