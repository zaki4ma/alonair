import React, { useRef, useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Dimensions,
  TouchableOpacity, Pressable, NativeSyntheticEvent, NativeScrollEvent,
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import Svg, {
  Circle, Ellipse, Path, Rect, G, Defs,
  RadialGradient, Stop, Pattern,
} from 'react-native-svg';
import Animated, {
  useSharedValue, useAnimatedStyle,
  withRepeat, withSequence, withTiming, withDelay,
} from 'react-native-reanimated';
import { Colors, Categories } from '@/constants/colors';

const { width: SW, height: SH } = Dimensions.get('window');

// ─────────────────────────────────────────────
// Slide 1 — コンセプト illustration
// ─────────────────────────────────────────────
function Slide1Art() {
  return (
    <Svg viewBox="0 0 320 280" width={SW * 0.88} height={SW * 0.88 * (280 / 320)}>
      <Defs>
        <RadialGradient id="fogGym" cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor="#FF7043" stopOpacity={0.22} />
          <Stop offset="100%" stopColor="#FF7043" stopOpacity={0} />
        </RadialGradient>
        <RadialGradient id="fogStudy" cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor="#5C6BC0" stopOpacity={0.22} />
          <Stop offset="100%" stopColor="#5C6BC0" stopOpacity={0} />
        </RadialGradient>
        <RadialGradient id="fogFish" cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor="#26A69A" stopOpacity={0.22} />
          <Stop offset="100%" stopColor="#26A69A" stopOpacity={0} />
        </RadialGradient>
        <RadialGradient id="fogRead" cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor="#7E57C2" stopOpacity={0.20} />
          <Stop offset="100%" stopColor="#7E57C2" stopOpacity={0} />
        </RadialGradient>
        <Pattern id="dots" x="0" y="0" width="14" height="14" patternUnits="userSpaceOnUse">
          <Circle cx={1} cy={1} r={0.7} fill="#90A4AE" opacity={0.16} />
        </Pattern>
      </Defs>

      <Rect width={320} height={280} fill="url(#dots)" rx={20} />

      {/* fog per cluster */}
      <Ellipse cx={100} cy={90}  rx={80} ry={62} fill="url(#fogGym)" />
      <Ellipse cx={230} cy={90}  rx={78} ry={60} fill="url(#fogStudy)" />
      <Ellipse cx={160} cy={200} rx={100} ry={68} fill="url(#fogFish)" />
      <Ellipse cx={60}  cy={220} rx={58} ry={48} fill="url(#fogRead)" />

      {/* connection lines within clusters */}
      <G stroke="#C9CFE2" strokeWidth={0.9} fill="none" opacity={0.85}>
        <Path d="M 88 80 Q 100 70 120 88" />
        <Path d="M 220 76 Q 240 86 250 100" />
        <Path d="M 130 200 Q 160 180 200 196" />
        <Path d="M 200 196 Q 180 220 150 220" />
      </G>

      {/* nodes */}
      {([
        [88,  80,  '#FF7043'], [120, 88,  '#FFAB91'], [105, 108, '#FFCCBC'],
        [220, 76,  '#5C6BC0'], [250, 100, '#9FA8DA'], [232, 118, '#C5CAE9'],
        [130, 200, '#26A69A'], [165, 180, '#26A69A'], [200, 196, '#80CBC4'], [150, 220, '#26A69A'],
        [60,  220, '#7E57C2'], [80,  238, '#B39DDB'],
      ] as [number, number, string][]).map(([cx, cy, c], i) => (
        <G key={i}>
          <Circle cx={cx} cy={cy} r={11} fill="#fff" stroke="#E8EAF0" />
          <Circle cx={cx} cy={cy} r={6.5} fill={c} />
        </G>
      ))}
    </Svg>
  );
}

// ─────────────────────────────────────────────
// Slide 2 — チェックインの仕組み illustration
// ─────────────────────────────────────────────
function Slide2Art() {
  const studyColor = Categories.study.color;
  return (
    <View style={s2.row}>
      {/* photo thumbnail */}
      <View style={s2.photo}>
        <Svg viewBox="0 0 50 62" width={50} height={62}>
          <Rect width={50} height={62} rx={7}
            fill="none" stroke="#3a4a5a" strokeWidth={1} />
          {/* fishing rod hint */}
          <Path d="M 5 62 L 40 8" stroke="rgba(60,60,60,0.5)" strokeWidth={2} strokeLinecap="round" />
          <Path d="M 40 8 L 44 38" stroke="rgba(180,180,180,0.6)" strokeWidth={0.8} />
        </Svg>
      </View>

      <ArrowRight />

      {/* AI circle */}
      <View style={[s2.aiCircle, { backgroundColor: `${studyColor}22` }]}>
        <View style={[s2.aiInner, { backgroundColor: studyColor }]}>
          <Text style={s2.aiEmoji}>📚</Text>
        </View>
      </View>

      <ArrowRight />

      {/* keyword pills */}
      <View style={s2.pills}>
        {['機械学習', 'Python'].map((k) => (
          <View key={k} style={s2.pill}>
            <Text style={s2.pillText}>{k}</Text>
          </View>
        ))}
        <View style={[s2.pill, { backgroundColor: studyColor }]}>
          <Text style={[s2.pillText, { color: '#fff' }]}>学習</Text>
        </View>
      </View>
    </View>
  );
}

function ArrowRight() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path d="M5 12h14m0 0-5-5m5 5-5 5"
        stroke={Colors.slate} strokeWidth={1.8}
        strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

const s2 = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center',
    gap: 10, paddingHorizontal: 8,
  },
  photo: {
    width: 50, height: 62, borderRadius: 7,
    backgroundColor: '#1a2230',
    overflow: 'hidden',
    transform: [{ rotate: '-4deg' }],
    shadowColor: '#000', shadowOpacity: 0.14,
    shadowRadius: 8, shadowOffset: { width: 0, height: 4 },
  },
  aiCircle: {
    width: 52, height: 52, borderRadius: 26,
    alignItems: 'center', justifyContent: 'center',
  },
  aiInner: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
  },
  aiEmoji: { fontSize: 16 },
  pills: { gap: 5 },
  pill: {
    backgroundColor: Colors.pillBg,
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 8,
  },
  pillText: {
    fontSize: 11, fontWeight: '600',
    color: Colors.charcoal,
    fontFamily: 'Outfit_600SemiBold',
  },
});

// ─────────────────────────────────────────────
// Slide 3 — つながり illustration
// ─────────────────────────────────────────────
function Slide3Art() {
  const fishColor = Categories.fish.color;
  return (
    <Svg viewBox="0 0 320 240" width={SW * 0.8} height={SW * 0.8 * (240 / 320)}>
      {/* fog */}
      <Ellipse cx={160} cy={130} rx={120} ry={60} fill={fishColor} opacity={0.08} />

      {/* connection line */}
      <Path d="M 90 130 Q 160 110 230 130"
        stroke="#C9CFE2" strokeWidth={1.2} fill="none" />

      {/* ripple rings on right node */}
      {[80, 56, 36].map((r, i) => (
        <Circle key={i} cx={230} cy={130} r={r}
          fill="none" stroke={fishColor}
          strokeWidth={1.5} opacity={0.05 + i * 0.10} />
      ))}

      {/* right node (receiving ripple) */}
      <Circle cx={230} cy={130} r={22} fill="#fff" stroke="#E8EAF0" />
      <Circle cx={230} cy={130} r={11} fill="#80CBC4" />

      {/* left node (YOU — sending) */}
      <Circle cx={90} cy={130} r={22} fill="#fff" stroke={fishColor} strokeWidth={2.5} />
      <Circle cx={90} cy={130} r={11} fill={fishColor} />

      {/* sending ripple from left */}
      <Circle cx={90} cy={130} r={3}  fill={fishColor} />
      <Circle cx={90} cy={130} r={14} fill="none" stroke={fishColor} strokeWidth={1.4} opacity={0.7} />
      <Circle cx={90} cy={130} r={22} fill="none" stroke={fishColor} strokeWidth={1} opacity={0.35} />
    </Svg>
  );
}

// ─────────────────────────────────────────────
// CTA background — drifting nodes
// ─────────────────────────────────────────────

// ノードデータ: [svgX, svgY, color] — viewBox 390×844 基準
const CTA_NODES: [number, number, string][] = [
  [70,  180, '#FFAB91'], [120, 150, '#FF7043'],
  [310, 180, '#9FA8DA'], [340, 240, '#5C6BC0'],
  [80,  520, '#26A69A'], [140, 560, '#80CBC4'],
  [310, 510, '#A5D6A7'], [320, 580, '#66BB6A'],
];

function FloatingNode({ svgX, svgY, color, index }: {
  svgX: number; svgY: number; color: string; index: number;
}) {
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);

  // ノードごとに振れ幅・周期・位相をずらして有機的に見せる
  const ampX  = 6 + (index % 3) * 3;        // 6〜12px
  const ampY  = 5 + (index % 4) * 2;        // 5〜11px
  const durX  = 3200 + index * 380;          // 3.2s〜6.1s
  const durY  = 2800 + index * 420;          // 2.8s〜6.2s
  const delay = index * 260;

  useEffect(() => {
    tx.value = withDelay(delay, withRepeat(
      withSequence(
        withTiming( ampX, { duration: durX }),
        withTiming(-ampX, { duration: durX }),
      ), -1, true,
    ));
    ty.value = withDelay(delay + 120, withRepeat(
      withSequence(
        withTiming(-ampY, { duration: durY }),
        withTiming( ampY, { duration: durY }),
      ), -1, true,
    ));
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }, { translateY: ty.value }],
  }));

  // SVG座標をスクリーン座標に変換
  const screenX = svgX * (SW / 390);
  const screenY = svgY * (SH / 844);

  return (
    <Animated.View style={[{
      position: 'absolute',
      left: screenX - 10,
      top:  screenY - 10,
      width: 20, height: 20, borderRadius: 10,
      backgroundColor: '#fff',
      borderWidth: 1, borderColor: Colors.line,
      alignItems: 'center', justifyContent: 'center',
    }, animStyle]}>
      <View style={{
        width: 12, height: 12, borderRadius: 6,
        backgroundColor: color,
      }} />
    </Animated.View>
  );
}

function CTABackground() {
  return (
    <>
      {/* 霧: SVGのまま静的に表示 */}
      <Svg
        viewBox="0 0 390 844"
        width={SW} height={SH}
        style={StyleSheet.absoluteFillObject}
        preserveAspectRatio="xMidYMid slice"
      >
        <Defs>
          <RadialGradient id="cGym" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor="#FF7043" stopOpacity={0.10} />
            <Stop offset="100%" stopColor="#FF7043" stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id="cStu" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor="#5C6BC0" stopOpacity={0.10} />
            <Stop offset="100%" stopColor="#5C6BC0" stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id="cFish" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor="#26A69A" stopOpacity={0.10} />
            <Stop offset="100%" stopColor="#26A69A" stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id="cWalk" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor="#66BB6A" stopOpacity={0.10} />
            <Stop offset="100%" stopColor="#66BB6A" stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Ellipse cx={80}  cy={180} rx={110} ry={80}  fill="url(#cGym)" />
        <Ellipse cx={320} cy={220} rx={110} ry={80}  fill="url(#cStu)" />
        <Ellipse cx={100} cy={540} rx={120} ry={80}  fill="url(#cFish)" />
        <Ellipse cx={320} cy={500} rx={100} ry={74}  fill="url(#cWalk)" />
      </Svg>

      {/* ノード: 個別にアニメーション */}
      {CTA_NODES.map(([svgX, svgY, color], i) => (
        <FloatingNode key={i} svgX={svgX} svgY={svgY} color={color} index={i} />
      ))}
    </>
  );
}

// ─────────────────────────────────────────────
// Slide components
// ─────────────────────────────────────────────
function SlideLayout({
  art, heading, body, dotIndex,
}: {
  art: React.ReactNode;
  heading: string;
  body: string;
  dotIndex: number;
}) {
  return (
    <View style={[slide.root, { width: SW }]}>
      <View style={slide.artWrap}>{art}</View>
      <View style={slide.copy}>
        <Text style={slide.heading}>{heading}</Text>
        <View style={slide.divider} />
        <Text style={slide.body}>{body}</Text>
        <View style={slide.dots}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={[slide.dot, dotIndex === i && slide.dotOn]} />
          ))}
        </View>
      </View>
    </View>
  );
}

const slide = StyleSheet.create({
  root: {
    height: SH,
    backgroundColor: Colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  artWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
  },
  copy: {
    paddingHorizontal: 36,
    paddingBottom: 72,
  },
  heading: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 28,
    color: Colors.charcoal,
    letterSpacing: -0.5,
    lineHeight: 38,
    marginBottom: 18,
  },
  divider: {
    width: 32, height: 2,
    backgroundColor: Colors.line,
    borderRadius: 1,
    marginBottom: 16,
  },
  body: {
    fontFamily: 'Outfit_400Regular',
    fontSize: 15,
    color: Colors.slate,
    lineHeight: 26,
    marginBottom: 36,
  },
  dots: { flexDirection: 'row', gap: 6 },
  dot: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: Colors.line,
  },
  dotOn: {
    width: 20, backgroundColor: Colors.charcoal,
  },
});

// ─────────────────────────────────────────────
// Main Onboarding screen
// ─────────────────────────────────────────────
export default function Onboarding() {
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const goToSlide = (i: number) => {
    scrollRef.current?.scrollTo({ x: i * SW, animated: true });
    setActiveIndex(i);
  };

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / SW);
    if (i !== activeIndex) setActiveIndex(i);
  };

  const handleStart = () => {
    // TODO: navigate to checkin when that screen is ready
    router.replace('/onboarding');
  };

  return (
    <View style={root.container}>
      <StatusBar style="dark" />

      {/* Skip — hidden on CTA slide */}
      {activeIndex < 3 && (
        <TouchableOpacity style={root.skip} onPress={() => goToSlide(3)}>
          <Text style={root.skipText}>スキップ</Text>
        </TouchableOpacity>
      )}

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        scrollEventThrottle={16}
        decelerationRate="fast"
      >
        {/* Slide 1 */}
        <SlideLayout
          dotIndex={0}
          heading={`一人だけど、\n独りじゃない。`}
          body={`釣り人も、受験生も、\n深夜のジム勢も。\nみんな今、何かに向き合っている。`}
          art={<Slide1Art />}
        />

        {/* Slide 2 */}
        <SlideLayout
          dotIndex={1}
          heading={`写真1枚で、\nマップに入れる。`}
          body={`AIが今の自分の状況を読んで、\n近くにいる仲間を引き寄せてくれる。`}
          art={<Slide2Art />}
        />

        {/* Slide 3 */}
        <SlideLayout
          dotIndex={2}
          heading="言葉はいらない。"
          body={`同じキーワードの人が\n自然に引き寄せられる。\nタップひとつで「頑張れ」を届けられる。\n返事もいらない。それでいい。`}
          art={<Slide3Art />}
        />

        {/* CTA */}
        <View style={[cta.root, { width: SW, height: SH }]}>
          <CTABackground />
          <View style={cta.overlay} />
          <View style={cta.content}>
            <View style={cta.logoWrap}>
              <View style={cta.logoIcon}>
                <Text style={{ fontSize: 22 }}>⬡</Text>
              </View>
              <Text style={cta.appName}>Alonair</Text>
              <Text style={cta.tagline}>今日、何をしますか？</Text>
            </View>

            <View style={cta.actions}>
              <Pressable
                style={({ pressed }) => [cta.btn, pressed && cta.btnPressed]}
                onPress={handleStart}
              >
                <Text style={cta.btnText}>📷　写真を撮って入室する</Text>
              </Pressable>
              <TouchableOpacity style={cta.secondaryBtn}>
                <Text style={cta.secondaryText}>すでにアカウントをお持ちの方</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const root = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  skip: {
    position: 'absolute', top: 58, right: 24, zIndex: 10,
  },
  skipText: {
    fontFamily: 'Outfit_500Medium',
    fontSize: 14,
    color: Colors.slate,
  },
});

const cta = StyleSheet.create({
  root: {
    backgroundColor: Colors.bg,
    overflow: 'hidden',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(245,246,250,0.55)',
  },
  content: {
    flex: 1,
    paddingHorizontal: 32,
    paddingTop: 100,
    paddingBottom: 52,
    justifyContent: 'space-between',
  },
  logoWrap: { gap: 6 },
  logoIcon: {
    width: 48, height: 48, borderRadius: 14,
    backgroundColor: Categories.study.color,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 12,
    shadowColor: Categories.study.color,
    shadowOpacity: 0.32, shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  appName: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 38,
    color: Colors.charcoal,
    letterSpacing: -1,
  },
  tagline: {
    fontFamily: 'Outfit_500Medium',
    fontSize: 18,
    color: Colors.charcoal,
    marginTop: 8,
  },
  actions: { gap: 14 },
  btn: {
    backgroundColor: Categories.study.color,
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    shadowColor: Categories.study.color,
    shadowOpacity: 0.28, shadowRadius: 14,
    shadowOffset: { width: 0, height: 7 },
  },
  btnPressed: { opacity: 0.85 },
  btnText: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 16,
    color: '#fff',
  },
  secondaryBtn: { alignItems: 'center', paddingVertical: 6 },
  secondaryText: {
    fontFamily: 'Outfit_400Regular',
    fontSize: 13,
    color: Colors.slate,
    textDecorationLine: 'underline',
  },
});
