import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, Dimensions, Modal, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle,
  withRepeat, withSequence, withTiming, withDelay,
} from 'react-native-reanimated';
import Svg, { Line, Circle as SvgCircle } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  Camera,
  Pencil,
  LogOut,
  Play,
  Pause,
  Send,
  History,
  Settings,
  Check,
  Circle as CircleIcon,
} from 'lucide-react-native';
import { Colors, Categories, CategoryId } from '../constants/colors';
import { getSession, setSession } from '../store/session';
import { ensureAnonymousAuth, getUid } from '../store/auth';
import {
  endCheckin,
  getCheckinDates,
  markReactionSeen,
  sendReaction,
  subscribeActiveCheckins,
  subscribeIncomingReactions,
  updateCheckinStatus,
  CheckinDoc,
} from '../store/firestore';
import { calculateStreakDays } from '../lib/streak';

const { width: SW } = Dimensions.get('window');

const NODE_W = 92;
const NODE_H = 116;
const REACTION_KINDS = [
  { id: 'focus', label: '集中', icon: '◎' },
  { id: 'energy', label: '応援', icon: '✦' },
  { id: 'calm', label: '見守り', icon: '◌' },
] as const;

// ── Types ──────────────────────────────────────────────────────────────────

interface NodeData {
  id: string;
  uid: string;
  username: string;
  keywords: string[];
  status?: string;
  mood: string;
  isYou?: boolean;
  isDozed?: boolean;
  hasRipple?: boolean;
  x: number; // 0–1 fraction of canvas width
  y: number; // 0–1 fraction of canvas height
  seed: number;
}

// ── UID helpers ────────────────────────────────────────────────────────────

function uidToPosition(uid: string): { x: number; y: number } {
  let h1 = 0, h2 = 0;
  for (let i = 0; i < uid.length; i++) {
    const c = uid.charCodeAt(i);
    if (i % 2 === 0) h1 = (h1 * 31 + c) & 0xffffff;
    else h2 = (h2 * 31 + c) & 0xffffff;
  }
  return {
    x: 0.1 + (h1 % 1000) / 1000 * 0.8,
    y: 0.1 + (h2 % 1000) / 1000 * 0.8,
  };
}

function uidToSeed(uid: string): number {
  return uid.charCodeAt(0) + uid.charCodeAt(uid.length - 1);
}

function checkinToNode(doc: CheckinDoc & { id: string }): NodeData {
  const pos = uidToPosition(doc.uid);
  return {
    id: doc.id,
    uid: doc.uid,
    username: doc.uid.slice(0, 6),
    keywords: doc.keywords.slice(0, 2),
    status: doc.status || undefined,
    mood: doc.mood,
    x: pos.x,
    y: pos.y,
    seed: uidToSeed(doc.uid),
  };
}

function buildConnections(myKeywords: string[], others: NodeData[]): [string, string][] {
  const mySet = new Set(myKeywords);
  return others
    .filter((n) => n.keywords.some((kw) => mySet.has(kw)))
    .map((n) => ['you', n.id] as [string, string]);
}

function clampPosition(value: number): number {
  return Math.max(0.14, Math.min(0.86, value));
}

function pushNodeApart(
  node: NodeData,
  anchor: { x: number; y: number },
  minDistance: number,
  seedOffset = 0
): NodeData {
  const dx = node.x - anchor.x;
  const dy = node.y - anchor.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  if (distance >= minDistance) return node;

  const angle = distance > 0.001
    ? Math.atan2(dy, dx)
    : ((node.seed + seedOffset) % 360) * Math.PI / 180;

  return {
    ...node,
    x: clampPosition(anchor.x + Math.cos(angle) * minDistance),
    y: clampPosition(anchor.y + Math.sin(angle) * minDistance),
  };
}

function spreadNodes(nodes: NodeData[], center: { x: number; y: number }): NodeData[] {
  let arranged = nodes.map((node, index) =>
    pushNodeApart(node, center, 0.28, index * 41)
  );

  for (let pass = 0; pass < 6; pass++) {
    arranged = arranged.map((node, index) => {
      let next = node;
      for (let otherIndex = 0; otherIndex < arranged.length; otherIndex++) {
        if (index === otherIndex) continue;
        next = pushNodeApart(next, arranged[otherIndex], 0.18, index * 53 + otherIndex);
      }
      return next;
    });
  }

  return arranged;
}

// ── Helpers ────────────────────────────────────────────────────────────────

const AVATAR_COLORS = ['#81C784', '#64B5F6', '#FFB74D', '#F06292', '#4DD0E1', '#AED581', '#CE93D8'];
function avatarBg(seed: number) { return AVATAR_COLORS[seed % AVATAR_COLORS.length]; }

function formatHMS(sec: number) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${String(h).padStart(2, '0')}:${mm}:${ss}` : `${mm}:${ss}`;
}

function formatMS(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// ── Top Bar ────────────────────────────────────────────────────────────────

function TopBar({
  sessionSecs,
  activeCount,
  streakDays,
}: {
  sessionSecs: number;
  activeCount: number;
  streakDays: number;
}) {
  return (
    <View style={styles.topBar}>
      <Text style={styles.appName}>Alonair</Text>
      <View style={styles.activeWrap}>
        <View style={styles.activeDot} />
        <Text style={styles.activeText}>{activeCount}人が集中中</Text>
      </View>
      <View style={styles.streakPill}>
        <Text style={styles.streakText}>🔥 {streakDays}日</Text>
      </View>
      <Text style={styles.sessionTime}>{formatHMS(sessionSecs)}</Text>
    </View>
  );
}

// ── Ripple rings ───────────────────────────────────────────────────────────

function RippleRings({ cx, cy }: { cx: number; cy: number }) {
  const rings = [0, 1, 2];
  return (
    <>
      {rings.map((i) => (
        <RippleRing key={i} cx={cx} cy={cy} delay={i * 600} />
      ))}
    </>
  );
}

function RippleRing({ cx, cy, delay }: { cx: number; cy: number; delay: number }) {
  const scale = useSharedValue(0.3);
  const opacity = useSharedValue(0);

  useEffect(() => {
    scale.value = withDelay(delay, withRepeat(
      withSequence(
        withTiming(0.3, { duration: 0 }),
        withTiming(1.8, { duration: 2000 }),
      ),
      -1, false
    ));
    opacity.value = withDelay(delay, withRepeat(
      withSequence(
        withTiming(0.6, { duration: 0 }),
        withTiming(0, { duration: 2000 }),
      ),
      -1, false
    ));
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 1.5,
    borderColor: 'rgba(92,107,192,0.5)',
    left: cx - 40,
    top: cy - 40,
  }));

  return <Animated.View style={animStyle} />;
}

// ── Connection lines SVG ───────────────────────────────────────────────────

function ConnectionLines({
  nodes, connections, canvasW, canvasH,
}: {
  nodes: NodeData[]; connections: [string, string][]; canvasW: number; canvasH: number;
}) {
  if (canvasW === 0) return null;
  const byId: Record<string, NodeData> = {};
  nodes.forEach((n) => { byId[n.id] = n; });

  return (
    <Svg
      width={canvasW} height={canvasH}
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
    >
      {connections.map(([a, b]) => {
        const na = byId[a];
        const nb = byId[b];
        if (!na || !nb) return null;
        return (
          <Line
            key={`${a}-${b}`}
            x1={na.x * canvasW}
            y1={na.y * canvasH}
            x2={nb.x * canvasW}
            y2={nb.y * canvasH}
            stroke={Colors.line}
            strokeWidth={1}
          />
        );
      })}
    </Svg>
  );
}

// ── Node card ──────────────────────────────────────────────────────────────

function NodeCard({
  node, canvasW, canvasH, accentColor, onPress,
}: {
  node: NodeData; canvasW: number; canvasH: number; accentColor: string; onPress?: () => void;
}) {
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const amp = 4 + (node.seed % 4) * 2;
  const durX = 3200 + node.seed * 380;
  const dly = node.seed * 280;

  useEffect(() => {
    tx.value = withDelay(dly, withRepeat(
      withSequence(withTiming(amp, { duration: durX }), withTiming(-amp, { duration: durX })),
      -1, true
    ));
    ty.value = withDelay(dly + 180, withRepeat(
      withSequence(
        withTiming(amp * 0.75, { duration: Math.round(durX * 1.3) }),
        withTiming(-amp * 0.75, { duration: Math.round(durX * 1.3) }),
      ),
      -1, true
    ));
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }, { translateY: ty.value }],
  }));

  const left = node.x * canvasW - NODE_W / 2;
  const top = node.y * canvasH - NODE_H / 2;

  return (
    <Animated.View
      style={[
        styles.nodeOuter,
        { left, top },
        animStyle,
        node.isDozed && styles.nodeDozed,
      ]}
    >
      {onPress && (
        <Pressable
          style={[StyleSheet.absoluteFill, styles.nodePressTarget]}
          onPress={onPress}
          hitSlop={24}
        />
      )}
      {/* Aura glow for YOU */}
      {node.isYou && (
        <View style={[styles.nodeAura, { borderColor: accentColor }]} />
      )}

      {/* YOU badge */}
      {node.isYou && (
        <View style={styles.youBadgeRow}>
          <View style={[styles.youBadge, { backgroundColor: accentColor }]}>
            <Text style={styles.youBadgeText}>YOU</Text>
          </View>
          <View style={[styles.editBadge, { backgroundColor: accentColor }]}>
            <Pencil size={8} color="#fff" strokeWidth={2.5} />
          </View>
        </View>
      )}

      {/* Card */}
      <View style={[
        styles.nodeCard,
        node.isYou && { borderColor: accentColor, borderWidth: 2.5 },
      ]}>
        <View style={[
          styles.avatar,
          { backgroundColor: node.isYou ? accentColor : avatarBg(node.seed) },
        ]}>
          {node.isDozed && <Text style={{ fontSize: 12 }}>💤</Text>}
        </View>
        <Text style={styles.nodeUsername} numberOfLines={1}>{node.username}</Text>
        <View style={styles.nodeKwRow}>
          {node.keywords.slice(0, 2).map((kw) => (
            <View key={kw} style={[
              styles.nodeKwPill,
              { backgroundColor: node.isYou ? `${accentColor}18` : Colors.pillBg },
            ]}>
              <Text
                style={[styles.nodeKwText, { color: node.isYou ? accentColor : '#5C6BC0' }]}
                numberOfLines={1}
              >
                {kw}
              </Text>
            </View>
          ))}
        </View>
        {node.status ? (
          <Text style={styles.nodeStatus} numberOfLines={1}>{node.status}</Text>
        ) : null}
      </View>
    </Animated.View>
  );
}

// ── Bottom Bar ─────────────────────────────────────────────────────────────

const POMO_SECS = 25 * 60;
const POMO_BREAK_SECS = 5 * 60;
const POMO_DONE_MS = 3000;

type PomoPhase = 'focus' | 'done' | 'break';

function BottomBar({
  accentColor, onRecheckin, onExit, bottomInset,
}: {
  accentColor: string;
  onRecheckin: () => void;
  onExit: () => void;
  bottomInset: number;
}) {
  const [pomoSecs, setPomoSecs] = useState(POMO_SECS);
  const [pomoRunning, setPomoRunning] = useState(true);
  const [pomoPhase, setPomoPhase] = useState<PomoPhase>('focus');

  useEffect(() => {
    if (!pomoRunning || pomoPhase === 'done' || pomoSecs <= 0) return;
    const id = setInterval(() => setPomoSecs((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [pomoPhase, pomoRunning, pomoSecs]);

  useEffect(() => {
    if (pomoPhase !== 'focus' || pomoSecs > 0) return;

    setPomoPhase('done');
    setPomoRunning(false);

    const id = setTimeout(() => {
      setPomoPhase('break');
      setPomoSecs(POMO_BREAK_SECS);
      setPomoRunning(true);
    }, POMO_DONE_MS);

    return () => clearTimeout(id);
  }, [pomoPhase, pomoSecs]);

  useEffect(() => {
    if (pomoPhase !== 'break' || pomoSecs > 0) return;
    setPomoRunning(false);
  }, [pomoPhase, pomoSecs]);

  const togglePomo = useCallback(() => {
    if (pomoPhase === 'done') return;
    if (pomoPhase === 'break' && pomoSecs === 0) {
      setPomoPhase('focus');
      setPomoSecs(POMO_SECS);
      setPomoRunning(true);
      return;
    }
    setPomoRunning((r) => !r);
  }, [pomoPhase, pomoSecs]);

  const pomoActive = pomoRunning || pomoPhase === 'done';
  const pomoBg = pomoPhase === 'done'
    ? '#66BB6A'
    : pomoPhase === 'break'
      ? Colors.line
      : pomoRunning
        ? accentColor
        : Colors.line;
  const pomoTextColor = pomoActive && pomoPhase !== 'break' ? '#fff' : Colors.slate;
  const pomoLabel = pomoPhase === 'done'
    ? 'お疲れさま！'
    : pomoPhase === 'break'
      ? (pomoSecs === 0 ? '休憩完了' : '休憩')
      : (pomoRunning ? '集中' : '停止中');

  return (
    <View style={[styles.bottomBar, { paddingBottom: Math.max(bottomInset, 16) }]}>
      {/* Re-checkin */}
      <Pressable style={styles.iconBtn} onPress={onRecheckin} hitSlop={8}>
        <Camera size={24} color={Colors.charcoal} strokeWidth={1.8} />
        <Text style={styles.iconBtnLabel}>再認証</Text>
      </Pressable>

      {/* Pomodoro pill */}
      <Pressable
        style={[styles.pomoPill, { backgroundColor: pomoBg }]}
        onPress={togglePomo}
      >
        {pomoPhase === 'done' ? (
          <Check size={15} color="#fff" strokeWidth={2.8} />
        ) : pomoPhase === 'break' ? (
          <CircleIcon size={14} color={pomoTextColor} strokeWidth={2.2} />
        ) : pomoRunning ? (
          <Play size={14} color="#fff" fill="#fff" />
        ) : (
          <Pause size={14} color={Colors.slate} fill={Colors.slate} />
        )}
        <Text style={[styles.pomoLabel, { color: pomoTextColor }]}>
          {pomoLabel}
        </Text>
        {pomoPhase !== 'done' && (
          <Text style={[styles.pomoTime, { color: pomoTextColor }]}>
            {formatMS(pomoSecs)}
          </Text>
        )}
      </Pressable>

      {/* DNA screen */}
      <Pressable style={styles.iconBtn} onPress={() => router.push('/dna' as never)} hitSlop={8}>
        <Pencil size={24} color={Colors.charcoal} strokeWidth={1.8} />
        <Text style={styles.iconBtnLabel}>DNA</Text>
      </Pressable>

      {/* History screen */}
      <Pressable style={styles.iconBtn} onPress={() => router.push('/history' as never)} hitSlop={8}>
        <History size={24} color={Colors.charcoal} strokeWidth={1.8} />
        <Text style={styles.iconBtnLabel}>履歴</Text>
      </Pressable>

      {/* Settings screen */}
      <Pressable style={styles.iconBtn} onPress={() => router.push('/settings' as never)} hitSlop={8}>
        <Settings size={24} color={Colors.charcoal} strokeWidth={1.8} />
        <Text style={styles.iconBtnLabel}>設定</Text>
      </Pressable>

      {/* Exit */}
      <Pressable style={styles.iconBtn} onPress={onExit} hitSlop={8}>
        <LogOut size={24} color={Colors.slate} strokeWidth={1.8} />
        <Text style={[styles.iconBtnLabel, { color: Colors.slate }]}>退出</Text>
      </Pressable>
    </View>
  );
}

// ── Map Screen ─────────────────────────────────────────────────────────────

export default function MapScreen() {
  const insets = useSafeAreaInsets();
  const session = getSession();
  const category = (session?.category ?? 'study') as CategoryId;
  const cat = Categories[category];
  const accentColor = cat.color;

  const [sessionSecs, setSessionSecs] = useState(() => {
    if (!session) return 0;
    return Math.floor((Date.now() - session.startTime) / 1000);
  });

  const [canvasSize, setCanvasSize] = useState({ w: 0, h: 0 });
  const [otherNodes, setOtherNodes] = useState<NodeData[]>([]);
  const [currentStatus, setCurrentStatus] = useState(session?.statusText ?? '');
  const [statusModalVisible, setStatusModalVisible] = useState(false);
  const [editingStatus, setEditingStatus] = useState('');
  const [reactionTarget, setReactionTarget] = useState<NodeData | null>(null);
  const [sendingReaction, setSendingReaction] = useState(false);
  const [reactionCooldowns, setReactionCooldowns] = useState<Record<string, number>>({});
  const [rippleTargetId, setRippleTargetId] = useState<string | null>(null);
  const [streakDays, setStreakDays] = useState(0);
  const [receivedReactionCount, setReceivedReactionCount] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setSessionSecs((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const uid = getUid();
    const unsubscribe = subscribeActiveCheckins(category, (docs) => {
      const nodes = docs
        .filter((d) => d.uid !== uid)
        .map(checkinToNode);
      setOtherNodes(nodes);
    });
    return unsubscribe;
  }, [category]);

  useEffect(() => {
    const uid = getUid();
    if (!uid) return;
    const unsubscribe = subscribeIncomingReactions(uid, (docs) => {
      if (docs.length === 0) return;
      setReceivedReactionCount((count) => count + docs.length);
      setRippleTargetId('you');
      docs.forEach((reaction) => {
        markReactionSeen(reaction.id).catch(console.error);
      });
      setTimeout(() => setRippleTargetId((current) => current === 'you' ? null : current), 4200);
    });
    return unsubscribe;
  }, []);

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

  const openStatusModal = useCallback(() => {
    setEditingStatus(currentStatus);
    setStatusModalVisible(true);
  }, [currentStatus]);

  const saveStatus = useCallback(async () => {
    setCurrentStatus(editingStatus);
    const current = getSession();
    if (current) setSession({ ...current, statusText: editingStatus });
    const uid = getUid();
    if (uid) updateCheckinStatus(uid, editingStatus).catch(console.error);
    setStatusModalVisible(false);
  }, [editingStatus]);

  const handleExit = useCallback(async () => {
    const uid = getUid();
    if (uid) await endCheckin(uid).catch(console.error);
    router.replace({
      pathname: '/summary',
      params: {
        category,
        mood: session?.mood ?? '',
        keywords: JSON.stringify(session?.keywords ?? []),
        durationSec: String(sessionSecs),
        streakDays: String(streakDays),
        reactionCount: String(receivedReactionCount),
      },
    } as never);
  }, [category, receivedReactionCount, session?.keywords, session?.mood, sessionSecs, streakDays]);

  const openReactionModal = useCallback((node: NodeData) => {
    setReactionTarget(node);
  }, []);

  const handleSendReaction = useCallback(async (kind: string) => {
    if (!reactionTarget || sendingReaction) return;

    const now = Date.now();
    const cooldownUntil = reactionCooldowns[reactionTarget.uid] ?? 0;
    if (cooldownUntil > now) return;

    const fromUid = getUid();
    if (!fromUid) return;

    setSendingReaction(true);
    setReactionCooldowns((prev) => ({
      ...prev,
      [reactionTarget.uid]: now + 60_000,
    }));

    try {
      await sendReaction(fromUid, reactionTarget.uid, kind);
      setRippleTargetId(reactionTarget.id);
      setReactionTarget(null);
      setTimeout(() => {
        setRippleTargetId((current) => current === reactionTarget.id ? null : current);
      }, 4200);
    } catch (e) {
      console.error('[Reaction]', e);
      setReactionCooldowns((prev) => ({
        ...prev,
        [reactionTarget.uid]: 0,
      }));
    } finally {
      setSendingReaction(false);
    }
  }, [reactionTarget, reactionCooldowns, sendingReaction]);

  const youNode: NodeData = {
    id: 'you',
    uid: getUid() ?? 'you',
    username: 'あなた',
    keywords: session?.keywords.slice(0, 2) ?? ['作業中'],
    status: currentStatus || undefined,
    mood: session?.mood ?? '集中',
    isYou: true,
    x: 0.50,
    y: 0.42,
    seed: 0,
  };

  const spacedOtherNodes = spreadNodes(otherNodes, youNode);
  const allNodes: NodeData[] = [youNode, ...spacedOtherNodes];
  const connections = buildConnections(youNode.keywords, spacedOtherNodes);
  const rippleNode = allNodes.find((n) => n.id === rippleTargetId || n.hasRipple);
  const reactionCooldownUntil = reactionTarget ? reactionCooldowns[reactionTarget.uid] ?? 0 : 0;
  const reactionDisabled = sendingReaction || reactionCooldownUntil > Date.now();

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <TopBar sessionSecs={sessionSecs} activeCount={allNodes.length} streakDays={streakDays} />

      {/* Canvas */}
      <View
        style={styles.canvas}
        onLayout={(e) => {
          const { width, height } = e.nativeEvent.layout;
          setCanvasSize({ w: width, h: height });
        }}
      >
        {/* Subtle dot grid background */}
        {canvasSize.w > 0 && (
          <Svg
            width={canvasSize.w}
            height={canvasSize.h}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          >
            {Array.from({ length: Math.ceil(canvasSize.w / 28) + 1 }).map((_, xi) =>
              Array.from({ length: Math.ceil(canvasSize.h / 28) + 1 }).map((_, yi) => (
                <SvgCircle
                  key={`${xi}-${yi}`}
                  cx={xi * 28}
                  cy={yi * 28}
                  r={1}
                  fill={Colors.line}
                />
              ))
            )}
          </Svg>
        )}

        {/* Connection lines */}
        <ConnectionLines
          nodes={allNodes}
          connections={connections}
          canvasW={canvasSize.w}
          canvasH={canvasSize.h}
        />

        {/* Ripple rings */}
        {canvasSize.w > 0 && rippleNode && (
          <RippleRings
            cx={rippleNode.x * canvasSize.w}
            cy={rippleNode.y * canvasSize.h}
          />
        )}

        {/* Nodes — YOU rendered last so it stays on top */}
        {canvasSize.w > 0 && allNodes.filter((n) => !n.isYou).map((node) => (
          <NodeCard
            key={node.id}
            node={node}
            canvasW={canvasSize.w}
            canvasH={canvasSize.h}
            accentColor={accentColor}
            onPress={() => openReactionModal(node)}
          />
        ))}
        {canvasSize.w > 0 && allNodes.filter((n) => n.isYou).map((node) => (
          <NodeCard
            key={node.id}
            node={node}
            canvasW={canvasSize.w}
            canvasH={canvasSize.h}
            accentColor={accentColor}
            onPress={openStatusModal}
          />
        ))}
      </View>

      <BottomBar
        accentColor={accentColor}
        onRecheckin={() => router.replace('/checkin' as never)}
        onExit={handleExit}
        bottomInset={insets.bottom}
      />

      {/* ── Status Edit Modal ── */}
      <Modal
        visible={statusModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setStatusModalVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setStatusModalVisible(false)}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <Pressable style={[styles.modalSheet, { paddingBottom: insets.bottom + 16 }]}>
              <View style={styles.modalHandle} />
              <Text style={styles.modalTitle}>ひとこと編集</Text>
              <TextInput
                style={[styles.modalInput, { borderColor: accentColor }]}
                value={editingStatus}
                onChangeText={(t) => setEditingStatus(t.slice(0, 15))}
                placeholder="最大15文字"
                placeholderTextColor={Colors.slate}
                maxLength={15}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={saveStatus}
              />
              <Text style={styles.modalCharCount}>{editingStatus.length} / 15</Text>
              <Pressable
                style={[styles.modalSaveBtn, { backgroundColor: accentColor }]}
                onPress={saveStatus}
              >
                <Text style={styles.modalSaveBtnText}>保存</Text>
              </Pressable>
            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>

      <Modal
        visible={!!reactionTarget}
        transparent
        animationType="fade"
        onRequestClose={() => setReactionTarget(null)}
      >
        <Pressable style={styles.reactionOverlay} onPress={() => setReactionTarget(null)}>
          <Pressable style={styles.reactionSheet}>
            <View style={styles.reactionHeader}>
              <View style={[styles.reactionAvatar, { backgroundColor: reactionTarget ? avatarBg(reactionTarget.seed) : Colors.slate }]} />
              <View style={styles.reactionTitleBlock}>
                <Text style={styles.reactionTitle}>{reactionTarget?.username}</Text>
                <Text style={styles.reactionSub}>応援リアクション</Text>
              </View>
            </View>
            <View style={styles.reactionKinds}>
              {REACTION_KINDS.map((reaction) => (
                <Pressable
                  key={reaction.id}
                  style={[
                    styles.reactionKindBtn,
                    reactionDisabled && styles.reactionKindDisabled,
                  ]}
                  onPress={() => handleSendReaction(reaction.id)}
                  disabled={reactionDisabled}
                >
                  <Text style={styles.reactionIcon}>{reaction.icon}</Text>
                  <Text style={styles.reactionLabel}>{reaction.label}</Text>
                </Pressable>
              ))}
            </View>
            <View style={styles.reactionHintRow}>
              <Send size={14} color={Colors.slate} strokeWidth={1.8} />
              <Text style={styles.reactionHint}>
                {reactionDisabled ? '少し時間を置いて送れます' : '相手にはさりげない波紋だけが届きます'}
              </Text>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },

  // Top bar
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: Colors.line,
    backgroundColor: Colors.card,
  },
  appName: {
    fontSize: 16, fontWeight: '700', color: Colors.charcoal,
    fontFamily: 'Outfit_700Bold', letterSpacing: -0.3,
  },
  activeWrap: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  activeDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#66BB6A' },
  activeText: { fontSize: 12, color: Colors.charcoal, fontFamily: 'Outfit_500Medium' },
  streakPill: {
    backgroundColor: '#FFF3E0',
    borderRadius: 14,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  streakText: {
    fontSize: 12,
    color: '#EF6C00',
    fontFamily: 'Outfit_700Bold',
  },
  sessionTime: {
    fontSize: 13, fontFamily: 'Outfit_500Medium',
    color: Colors.slate, fontVariant: ['tabular-nums'],
  },

  // Canvas
  canvas: { flex: 1, position: 'relative', overflow: 'hidden' },

  // Node
  nodeOuter: {
    position: 'absolute',
    width: NODE_W,
    alignItems: 'center',
  },
  nodeDozed: { opacity: 0.3 },
  nodeAura: {
    position: 'absolute',
    width: NODE_W + 20,
    height: NODE_W + 20,
    borderRadius: (NODE_W + 20) / 2,
    borderWidth: 1,
    top: 18,
    backgroundColor: 'rgba(92,107,192,0.07)',
  },
  youBadgeRow: {
    flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4,
  },
  youBadge: {
    paddingHorizontal: 7, paddingVertical: 2,
    borderRadius: 6,
  },
  youBadgeText: { fontSize: 9, fontWeight: '800', color: '#fff', letterSpacing: 1 },
  editBadge: {
    width: 16, height: 16, borderRadius: 4,
    alignItems: 'center', justifyContent: 'center',
  },
  nodePressTarget: {
    zIndex: 20,
    elevation: 20,
  },
  nodeCard: {
    width: NODE_W,
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.line,
    shadowColor: '#000',
    shadowOpacity: 0.07,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    gap: 4,
  },
  avatar: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  nodeUsername: {
    fontSize: 10, fontWeight: '600', color: Colors.charcoal,
    fontFamily: 'Outfit_600SemiBold',
  },
  nodeKwRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 3, justifyContent: 'center' },
  nodeKwPill: { paddingHorizontal: 5, paddingVertical: 2, borderRadius: 6 },
  nodeKwText: { fontSize: 9, fontWeight: '600', fontFamily: 'Outfit_600SemiBold' },
  nodeStatus: { fontSize: 9, color: Colors.slate, fontStyle: 'italic' },

  // Bottom bar
  bottomBar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: Colors.line,
    backgroundColor: Colors.card, gap: 6,
  },
  iconBtn: { alignItems: 'center', width: 44 },
  iconBtnLabel: { fontSize: 11, color: Colors.charcoal, marginTop: 4, fontFamily: 'Outfit_500Medium' },
  pomoPill: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 7,
    paddingVertical: 12, borderRadius: 22,
  },
  pomoLabel: { fontSize: 14, fontWeight: '600', fontFamily: 'Outfit_600SemiBold' },
  pomoTime: {
    fontSize: 16, fontWeight: '700',
    fontFamily: 'Outfit_700Bold', fontVariant: ['tabular-nums'],
  },

  // Status modal
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: Colors.card,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingHorizontal: 24, paddingTop: 12,
  },
  modalHandle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: Colors.line, alignSelf: 'center', marginBottom: 20,
  },
  modalTitle: {
    fontSize: 16, fontWeight: '700', color: Colors.charcoal,
    fontFamily: 'Outfit_700Bold', marginBottom: 16,
  },
  modalInput: {
    borderWidth: 1.5, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 16, color: Colors.charcoal,
    fontFamily: 'Outfit_400Regular',
  },
  modalCharCount: {
    fontSize: 11, color: Colors.slate, textAlign: 'right', marginTop: 6, marginBottom: 16,
  },
  modalSaveBtn: {
    paddingVertical: 14, borderRadius: 14, alignItems: 'center',
  },
  modalSaveBtnText: {
    fontSize: 15, fontWeight: '700', color: '#fff', fontFamily: 'Outfit_700Bold',
  },

  // Reaction modal
  reactionOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.28)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  reactionSheet: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: Colors.card,
    borderRadius: 18,
    padding: 18,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
  reactionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  reactionAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
  },
  reactionTitleBlock: { flex: 1 },
  reactionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.charcoal,
    fontFamily: 'Outfit_700Bold',
  },
  reactionSub: {
    fontSize: 12,
    color: Colors.slate,
    marginTop: 2,
  },
  reactionKinds: {
    flexDirection: 'row',
    gap: 8,
  },
  reactionKindBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: Colors.bg,
    borderWidth: 1,
    borderColor: Colors.line,
  },
  reactionKindDisabled: {
    opacity: 0.45,
  },
  reactionIcon: {
    fontSize: 22,
    color: '#5C6BC0',
    lineHeight: 26,
  },
  reactionLabel: {
    fontSize: 11,
    color: Colors.charcoal,
    marginTop: 4,
    fontFamily: 'Outfit_600SemiBold',
  },
  reactionHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 14,
  },
  reactionHint: {
    flex: 1,
    fontSize: 11,
    color: Colors.slate,
    lineHeight: 16,
  },
});
