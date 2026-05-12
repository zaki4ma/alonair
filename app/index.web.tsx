import React, { useEffect, useRef, useState } from 'react';
import { Link, type Href } from 'expo-router';
import { Animated, Easing, Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, type DimensionValue } from 'react-native';
import Svg, { Circle, Defs, Ellipse, G, Path, Pattern, RadialGradient, Rect, Stop } from 'react-native-svg';

const categories = [
  ['勉強', '📚', '#5C6BC0'],
  ['作業', '💻', '#546E7A'],
  ['読書', '📖', '#7E57C2'],
  ['ジム', '🏋️', '#FF7043'],
  ['散歩', '🚶', '#66BB6A'],
  ['釣り', '🎣', '#26A69A'],
  ['飲み', '☕', '#FFA726'],
  ['料理', '🍳', '#EC407A'],
  ['創作', '✏️', '#C0CA33'],
  ['その他', '•', '#90A4AE'],
] as const;

const faqs = [
  ['写真は誰かに見られますか？', 'いいえ。撮った写真はAIが解析するためだけに使われ、マップには保存されません。表示されるのは抽出されたキーワードだけです。'],
  ['本名やプロフィール写真は必要ですか？', '必要ありません。ユーザーネームと文字のアバターから始められます。見せるものを最小限にした設計です。'],
  ['チャットやDMはできますか？', 'できません。Alonair にあるのは「無言のエール」を送るボタンだけです。返事もありません。'],
  ['AIがジャンルを間違えたらどうなりますか？', '入室前の確認画面でタップして変更できます。カテゴリやキーワードはあとから調整できます。'],
  ['料金はかかりますか？', '基本機能は無料です。詳しい価格プランはリリース時にお知らせします。'],
] as const;

const howItWorksImage = require('../assets/lp-how-it-works.png');

function Brand() {
  return (
    <View style={styles.brand}>
      <View style={styles.brandMark}>
        <Svg width={15} height={15} viewBox="0 0 24 24">
          <Circle cx={12} cy={6} r={2.4} fill="#fff" />
          <Circle cx={6} cy={16} r={2.4} fill="#fff" />
          <Circle cx={18} cy={16} r={2.4} fill="#fff" />
          <Path d="M12 8.4 7.6 14.4M12 8.4l4.4 6M8.4 16h7.2" stroke="#fff" strokeWidth={1.4} strokeLinecap="round" />
        </Svg>
      </View>
      <Text style={styles.brandText}>Alonair<Text style={styles.dot}>.</Text></Text>
    </View>
  );
}

function AppStoreBadge() {
  return (
    <TouchableOpacity style={styles.appBadge} activeOpacity={0.85}>
      <Svg width={26} height={26} viewBox="0 0 24 24">
        <Path fill="#fff" d="M17.05 12.55c-.03-2.86 2.34-4.24 2.44-4.31-1.33-1.94-3.4-2.21-4.13-2.24-1.76-.18-3.43 1.04-4.32 1.04-.9 0-2.27-1.01-3.74-.98-1.92.03-3.7 1.12-4.69 2.83-2 3.47-.51 8.6 1.43 11.42.95 1.38 2.07 2.92 3.55 2.87 1.43-.06 1.97-.92 3.69-.92 1.72 0 2.21.92 3.72.89 1.54-.03 2.51-1.4 3.45-2.79 1.09-1.6 1.54-3.15 1.57-3.23-.03-.01-3.01-1.15-3.04-4.58zM14.3 4.32c.78-.94 1.31-2.25 1.16-3.55-1.13.05-2.5.75-3.31 1.69-.72.83-1.36 2.17-1.19 3.44 1.26.1 2.55-.64 3.34-1.58z" />
      </Svg>
      <View>
        <Text style={styles.badgeSmall}>Download on the</Text>
        <Text style={styles.badgeLarge}>App Store</Text>
      </View>
    </TouchableOpacity>
  );
}

function SignupForm() {
  const [sent, setSent] = useState(false);
  return (
    <View style={styles.signup}>
      <TextInput style={styles.input} placeholder="メールで先行通知を受け取る" placeholderTextColor="#B0BEC5" keyboardType="email-address" />
      <TouchableOpacity style={styles.signupButton} onPress={() => setSent(true)} activeOpacity={0.85}>
        <Text style={styles.signupButtonText}>{sent ? '登録済み' : '登録'}</Text>
      </TouchableOpacity>
    </View>
  );
}

function PhoneMock({ variant = 'map' }: { variant?: 'map' | 'camera' | 'cheer' | 'onboarding' }) {
  return (
    <View style={styles.phone}>
      <View style={[styles.phoneScreen, variant === 'camera' && styles.cameraScreen]}>
        {variant === 'camera' ? (
          <>
            <View style={styles.cameraFrame}><Text style={styles.cameraHint}>ここに収めてください</Text></View>
            <Text style={styles.cameraTitle}>今の様子を撮ってください</Text>
            <View style={styles.shutter} />
          </>
        ) : variant === 'onboarding' ? (
          <View style={styles.onboardingScreen}>
            <ClusterArt />
            <Text style={styles.onboardingTitle}>一人だけど、{'\n'}独りじゃない。</Text>
            <Text style={styles.onboardingText}>釣り人も、受験生も、深夜のジム勢も。</Text>
          </View>
        ) : (
          <>
            <View style={styles.mmTop}>
              <Text style={styles.mmBrand}>Alonair<Text style={styles.dot}>.</Text></Text>
              <Text style={styles.mmPresence}>8人</Text>
              <Text style={styles.mmTimer}>01:23:45</Text>
            </View>
            <View style={styles.mmCanvas}>
              <Svg style={styles.edges} viewBox="0 0 256 460" preserveAspectRatio="none">
                <Path d="M128 230 Q70 180 50 130M128 230 Q190 200 200 130M128 230 Q90 290 80 350M128 230 Q180 290 180 350" stroke="#C9CFE2" strokeWidth={1.4} fill="none" />
              </Svg>
              <MiniNode you left="50%" top="50%" name="あなた" pill="機械学習" />
              <MiniNode left="22%" top="28%" name="aoi_" pill="統計" />
              <MiniNode left="78%" top="28%" name="kanon" pill="代数" />
              <MiniNode left="30%" top="78%" name="ren" pill="深層学習" />
              <MiniNode left="72%" top="78%" name="mio" pill="TOEIC" />
            </View>
            {variant === 'cheer' && (
              <View style={styles.sheet}>
                <View style={styles.handle} />
                <Text style={styles.sheetName}>aoi_</Text>
                <Text style={styles.sheetMeta}>勉強 · 1時間23分</Text>
                <Text style={styles.sheetPills}>機械学習  統計</Text>
                <View style={styles.cheerButton}><Text style={styles.cheerButtonText}>👋 無言のエールを送る</Text></View>
              </View>
            )}
            <View style={styles.mmBottom}>
              <Text style={styles.iconButton}>📷</Text>
              <View style={styles.focusPill}><Text style={styles.focusText}>📚 勉強  1:23:45</Text></View>
              <Text style={styles.iconButton}>✎</Text>
            </View>
          </>
        )}
      </View>
    </View>
  );
}

function QuietConnectionVisual() {
  const pulseOne = useRef(new Animated.Value(0)).current;
  const pulseTwo = useRef(new Animated.Value(0)).current;
  const pulseThree = useRef(new Animated.Value(0)).current;
  const drift = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const makePulseLoop = (value: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(value, {
            toValue: 1,
            duration: 2300,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(value, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ])
      );

    const pulseLoopOne = makePulseLoop(pulseOne, 0);
    const pulseLoopTwo = makePulseLoop(pulseTwo, 760);
    const pulseLoopThree = makePulseLoop(pulseThree, 1520);
    const driftLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(drift, {
          toValue: 1,
          duration: 3600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(drift, {
          toValue: 0,
          duration: 3600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    pulseLoopOne.start();
    pulseLoopTwo.start();
    pulseLoopThree.start();
    driftLoop.start();

    return () => {
      pulseLoopOne.stop();
      pulseLoopTwo.stop();
      pulseLoopThree.stop();
      driftLoop.stop();
    };
  }, [drift, pulseOne, pulseThree, pulseTwo]);

  const makePulseStyle = (value: Animated.Value) => ({
    opacity: value.interpolate({ inputRange: [0, 0.12, 0.74, 1], outputRange: [0, 0.44, 0.12, 0] }),
    transform: [{ scale: value.interpolate({ inputRange: [0, 1], outputRange: [0.58, 2.35] }) }],
  });
  const nodeLift = drift.interpolate({ inputRange: [0, 1], outputRange: [-5, 6] });
  const nodeSlide = drift.interpolate({ inputRange: [0, 1], outputRange: [5, -5] });

  return (
    <View style={styles.quietVisual}>
      <View style={styles.quietMapPanel}>
        <View style={styles.quietGrid} />
        <Animated.View style={[styles.quietRing, styles.quietRingOne, makePulseStyle(pulseOne)]} />
        <Animated.View style={[styles.quietRing, styles.quietRingTwo, makePulseStyle(pulseTwo)]} />
        <Animated.View style={[styles.quietRing, styles.quietRingThree, makePulseStyle(pulseThree)]} />
        <QuietNode name="YOU" label="機械学習" x="50%" y="50%" active />
        <Animated.View style={[styles.quietNodeWrap, { left: '16%', top: '22%', transform: [{ translateY: nodeLift }] }]}>
          <QuietNode name="AO" label="統計" compact />
        </Animated.View>
        <Animated.View style={[styles.quietNodeWrap, { left: '78%', top: '20%', transform: [{ translateX: nodeSlide }] }]}>
          <QuietNode name="KN" label="代数" compact />
        </Animated.View>
        <Animated.View style={[styles.quietNodeWrap, { left: '18%', top: '78%', transform: [{ translateX: nodeSlide }] }]}>
          <QuietNode name="RN" label="深層学習" compact />
        </Animated.View>
        <Animated.View style={[styles.quietNodeWrap, { left: '78%', top: '80%', transform: [{ translateY: nodeLift }] }]}>
          <QuietNode name="MI" label="TOEIC" compact />
        </Animated.View>
      </View>
    </View>
  );
}

function QuietNode({ name, label, x, y, active, compact }: { name: string; label: string; x?: DimensionValue; y?: DimensionValue; active?: boolean; compact?: boolean }) {
  return (
    <View style={[styles.quietNode, x !== undefined && y !== undefined && { left: x, top: y }, active && styles.quietNodeActive, compact && styles.quietNodeCompact]}>
      {active ? <Text style={styles.quietNodeBadge}>YOU</Text> : null}
      <View style={[styles.quietAvatar, active && styles.quietAvatarActive]}>
        <Text style={styles.quietAvatarText}>{name}</Text>
      </View>
      <Text style={styles.quietNodeName}>{active ? 'あなた' : name.toLowerCase()}</Text>
      <Text style={styles.quietNodePill}>{label}</Text>
    </View>
  );
}

function MiniNode({ left, top, name, pill, you }: { left: DimensionValue; top: DimensionValue; name: string; pill?: string; you?: boolean }) {
  return (
    <View style={[styles.node, { left, top }, you && styles.nodeYou]}>
      {you && <View style={styles.youBadge}><Text style={styles.youBadgeText}>YOU</Text></View>}
      <View style={styles.avatarWrap}>
        <View style={styles.avatar}><Text style={styles.avatarText}>{name.slice(0, 2).toUpperCase()}</Text></View>
        <View style={styles.catBadge}><Text style={styles.catText}>📚</Text></View>
      </View>
      <Text style={styles.nodeName}>{name}</Text>
      {pill ? <Text style={styles.nodePill}>{pill}</Text> : null}
    </View>
  );
}

function ClusterArt() {
  return (
    <Svg viewBox="0 0 320 220" width="100%" height={180}>
      <Defs>
        <RadialGradient id="study" cx="50%" cy="50%" r="50%"><Stop offset="0%" stopColor="#5C6BC0" stopOpacity={0.22} /><Stop offset="100%" stopColor="#5C6BC0" stopOpacity={0} /></RadialGradient>
        <RadialGradient id="fish" cx="50%" cy="50%" r="50%"><Stop offset="0%" stopColor="#26A69A" stopOpacity={0.22} /><Stop offset="100%" stopColor="#26A69A" stopOpacity={0} /></RadialGradient>
        <RadialGradient id="gym" cx="50%" cy="50%" r="50%"><Stop offset="0%" stopColor="#FF7043" stopOpacity={0.2} /><Stop offset="100%" stopColor="#FF7043" stopOpacity={0} /></RadialGradient>
        <Pattern id="dots" x="0" y="0" width="14" height="14" patternUnits="userSpaceOnUse"><Circle cx={1} cy={1} r={0.7} fill="#90A4AE" opacity={0.18} /></Pattern>
      </Defs>
      <Rect width={320} height={220} fill="url(#dots)" rx={20} />
      <Ellipse cx={90} cy={82} rx={76} ry={56} fill="url(#gym)" />
      <Ellipse cx={230} cy={82} rx={76} ry={56} fill="url(#study)" />
      <Ellipse cx={160} cy={166} rx={96} ry={58} fill="url(#fish)" />
      <G stroke="#C9CFE2" strokeWidth={1} fill="none" opacity={0.85}>
        <Path d="M88 80 Q100 70 120 88M220 76 Q240 86 250 100M130 164 Q160 146 200 162" />
      </G>
      {[[88, 80, '#FF7043'], [120, 88, '#FFAB91'], [220, 76, '#5C6BC0'], [250, 100, '#9FA8DA'], [130, 164, '#26A69A'], [165, 146, '#26A69A'], [200, 162, '#80CBC4']] .map(([cx, cy, color], i) => (
        <G key={i}><Circle cx={cx} cy={cy} r={11} fill="#fff" stroke="#E8EAF0" /><Circle cx={cx} cy={cy} r={6.5} fill={color as string} /></G>
      ))}
    </Svg>
  );
}

export default function LandingPage() {
  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <View style={styles.nav}>
        <Brand />
        <View style={styles.navLinks}>
          <Text style={styles.navLink}>コンセプト</Text>
          <Text style={styles.navLink}>仕組み</Text>
          <Text style={styles.navLink}>カテゴリ</Text>
          <Text style={styles.navLink}>よくある質問</Text>
        </View>
        <TouchableOpacity style={styles.navCta}><Text style={styles.navCtaText}>事前登録</Text></TouchableOpacity>
      </View>

      <View style={styles.hero}>
        <View style={styles.heroCopy}>
          <Text style={styles.eyebrow}>iOS · 2026 SUMMER LAUNCH</Text>
          <Text style={styles.heroTitle}>一人だけど、{'\n'}独りじゃない。{'\n'}<Text style={styles.heroMuted}>そのための、{'\n'}静かな部屋。</Text></Text>
          <Text style={styles.heroSub}>勉強も、釣りも、夜の散歩も。写真を1枚撮るだけで、同じことに向き合う誰かと、そっと並ぶ。喋らなくていい。気配だけでいい。</Text>
          <View style={styles.ctaRow}>
            <AppStoreBadge />
            <SignupForm />
          </View>
          <Text style={styles.fine}>事前登録すると、リリース時にメールでお知らせします。</Text>
        </View>
        <View style={styles.heroArt}>
          <View style={[styles.floatCard, styles.keywordCard]}><Text style={styles.keywordText}>機械学習  Python</Text></View>
          <View style={[styles.floatCard, styles.cheerCard]}><Text style={styles.keywordText}>👋 無言のエール</Text></View>
          <PhoneMock />
        </View>
      </View>

      <View style={styles.concept}>
        <Text style={styles.sectionEyebrow}>CONCEPT</Text>
        <Text style={styles.quote}>ひとりで何かに向き合う時間に、{'\n'}<Text style={styles.quoteStrong}>いちばん静かな仲間がいる。</Text></Text>
        <Text style={styles.body}>Alonair（アロネア）は、写真1枚で「いまの自分」をマップに置くアプリ。AIがあなたの今を読み取って、近くで同じことに向き合う仲間と、ふわりと並べてくれます。</Text>
      </View>

      <Section eyebrow="HOW IT WORKS" title={'写真1枚で、\nマップに入る。'} lead="面倒な入力も、ジャンルを選ぶ必要もありません。手元のものを撮るだけで、Alonair が今のあなたを言葉にしてくれます。">
        <Image source={howItWorksImage} style={styles.howImage} resizeMode="cover" />
        <View style={styles.steps}>
          <Step n="01" title="撮る" text="机、本、釣り竿、ジムの床。今のあなたを表すものを1枚だけ。" />
          <Step n="02" title="読み取る" text="AIがカテゴリとキーワードを抽出し、短い状態として整えます。" />
          <Step n="03" title="並ぶ" text="近くで似たことに向き合う人たちのマップに静かに入室します。" />
        </View>
      </Section>

      <View style={styles.quiet}>
        <QuietConnectionVisual />
        <View style={styles.quietCopy}>
          <Text style={styles.sectionEyebrow}>QUIET CONNECTION</Text>
          <Text style={styles.sectionTitle}>言葉はいらない。</Text>
          <Text style={styles.body}>チャットもDMもありません。送れるのは、無言のエールだけ。返事を考える負担がないから、自分の時間を続けられます。</Text>
        </View>
      </View>

      <Section eyebrow="CATEGORIES" title={'どんなことでも、\n同じことをしている誰かがいる。'} lead="勉強や仕事だけじゃない。釣り、夜の散歩、一人飲み、深夜の料理まで。10のカテゴリで、いまの時間をそっと共有できます。">
        <View style={styles.cats}>
          {categories.map(([label, icon, color]) => (
            <View key={label} style={styles.cat}>
              <Text style={styles.catIcon}>{icon}</Text>
              <Text style={styles.catLabel}>{label}</Text>
              <View style={[styles.catBar, { backgroundColor: color }]} />
            </View>
          ))}
        </View>
      </Section>

      <Section eyebrow="SCREENS" title="画面たち。">
        <View style={styles.gallery}>
          <GalleryItem label="MAP" variant="map" />
          <GalleryItem label="CHECK-IN" variant="camera" />
          <GalleryItem label="QUIET CHEER" variant="cheer" />
          <GalleryItem label="ONBOARDING" variant="onboarding" />
        </View>
      </Section>

      <Section eyebrow="FAQ" title="よくある質問。">
        <View style={styles.faq}>
          {faqs.map(([q, a]) => <View key={q} style={styles.faqItem}><Text style={styles.faqQ}>{q}</Text><Text style={styles.faqA}>{a}</Text></View>)}
        </View>
      </Section>

      <View style={styles.finale}>
        <Text style={styles.finaleTitle}>今日は、何に向き合いますか？</Text>
        <Text style={styles.body}>リリース時にメールでお知らせします。静かな部屋で、お待ちしています。</Text>
        <View style={styles.ctaRow}><AppStoreBadge /><SignupForm /></View>
      </View>

      <View style={styles.footer}>
        <View style={styles.footerBrand}>
          <Brand />
          <Text style={styles.footerText}>一人だけど、独りじゃない。静かな部屋で、誰かと並ぶためのアプリ。</Text>
        </View>
        <FooterCol title="Product" items={['コンセプト', '仕組み', 'カテゴリ', 'よくある質問']} />
        <FooterCol title="Legal" items={[{ label: '利用規約', href: '/terms' }, { label: 'プライバシーポリシー', href: '/privacy' }, '特定商取引法']} />
        <FooterCol title="Contact" items={['お問い合わせ']} />
      </View>
      <View style={styles.footBottom}><Text style={styles.footBottomText}>© 2026 Alonair Inc.</Text><Text style={styles.footBottomText}>Made quietly in Tokyo · v0.2</Text></View>
    </ScrollView>
  );
}

function Section({ eyebrow, title, lead, children }: { eyebrow: string; title: string; lead?: string; children: React.ReactNode }) {
  return <View style={styles.section}><Text style={styles.sectionEyebrow}>{eyebrow}</Text><Text style={styles.sectionTitle}>{title}</Text>{lead ? <Text style={styles.lead}>{lead}</Text> : null}{children}</View>;
}

function Step({ n, title, text }: { n: string; title: string; text: string }) {
  return <View style={styles.step}><Text style={styles.stepN}>{n}</Text><Text style={styles.stepTitle}>{title}</Text><Text style={styles.stepText}>{text}</Text></View>;
}

function GalleryItem({ label, variant }: { label: string; variant: 'map' | 'camera' | 'cheer' | 'onboarding' }) {
  return <View style={styles.galleryItem}><PhoneMock variant={variant} /><Text style={styles.galleryLabel}>{label}</Text></View>;
}

type FooterItem = string | { label: string; href: Href };

function FooterCol({ title, items }: { title: string; items: FooterItem[] }) {
  return (
    <View style={styles.footerCol}>
      <Text style={styles.footerTitle}>{title}</Text>
      {items.map((item) => {
        if (typeof item === 'string') {
          return <Text key={item} style={styles.footerLink}>{item}</Text>;
        }
        return (
          <Link key={item.label} href={item.href} style={styles.footerLink}>
            {item.label}
          </Link>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#F5F6FA' },
  content: { alignItems: 'center' },
  nav: { width: '92%', maxWidth: 1180, minHeight: 64, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: 'rgba(232,234,240,0.9)' },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  brandMark: { width: 22, height: 22, borderRadius: 7, backgroundColor: '#5C6BC0', alignItems: 'center', justifyContent: 'center', shadowColor: '#5C6BC0', shadowOpacity: 0.3, shadowRadius: 12 },
  brandText: { fontFamily: 'Outfit_600SemiBold', fontSize: 19, color: '#37474F' },
  dot: { color: '#5C6BC0' },
  navLinks: { flexDirection: 'row', gap: 28 },
  navLink: { color: '#90A4AE', fontSize: 13 },
  navCta: { backgroundColor: '#37474F', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999 },
  navCtaText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  hero: { width: '92%', maxWidth: 1180, paddingVertical: 76, flexDirection: 'row', gap: 48, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' },
  heroCopy: { flex: 1, minWidth: 330, maxWidth: 560 },
  eyebrow: { color: '#5C6BC0', fontSize: 12, letterSpacing: 1.6, fontFamily: 'Outfit_500Medium', marginBottom: 22 },
  heroTitle: { color: '#37474F', fontSize: 56, lineHeight: 66, fontWeight: '700' },
  heroMuted: { color: '#90A4AE', fontWeight: '400' },
  heroSub: { color: '#90A4AE', fontSize: 16, lineHeight: 30, marginTop: 24, marginBottom: 32, maxWidth: 490 },
  ctaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, alignItems: 'center' },
  appBadge: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#0C1116', paddingVertical: 11, paddingLeft: 16, paddingRight: 20, borderRadius: 12 },
  badgeSmall: { color: 'rgba(255,255,255,0.7)', fontSize: 10 },
  badgeLarge: { color: '#fff', fontSize: 16, fontFamily: 'Outfit_500Medium' },
  signup: { flexDirection: 'row', gap: 6, backgroundColor: '#fff', borderWidth: 1, borderColor: '#E8EAF0', borderRadius: 14, padding: 5, width: 360, maxWidth: '100%' },
  input: { flex: 1, paddingHorizontal: 12, fontSize: 14, color: '#37474F', outlineStyle: 'none' as never },
  signupButton: { backgroundColor: '#5C6BC0', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, justifyContent: 'center' },
  signupButtonText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  fine: { color: '#B0BEC5', fontSize: 11, marginTop: 14 },
  heroArt: { flex: 1, minWidth: 320, minHeight: 520, alignItems: 'center', justifyContent: 'center' },
  floatCard: { position: 'absolute', backgroundColor: '#fff', borderWidth: 1, borderColor: '#E8EAF0', borderRadius: 999, paddingHorizontal: 14, paddingVertical: 9, shadowColor: '#37474F', shadowOpacity: 0.1, shadowRadius: 18, zIndex: 2 },
  keywordCard: { left: 20, top: 54 },
  cheerCard: { right: 10, bottom: 110 },
  keywordText: { color: '#37474F', fontSize: 12, fontWeight: '600' },
  phone: { width: 280, height: 580, backgroundColor: '#fff', borderRadius: 42, padding: 12, shadowColor: '#37474F', shadowOpacity: 0.18, shadowRadius: 42 },
  phoneScreen: { flex: 1, borderRadius: 31, backgroundColor: '#F5F6FA', overflow: 'hidden', position: 'relative' },
  mmTop: { height: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, backgroundColor: 'rgba(245,246,250,0.92)', borderBottomWidth: 1, borderBottomColor: '#E8EAF0' },
  mmBrand: { color: '#37474F', fontSize: 16, fontWeight: '700' },
  mmPresence: { color: '#90A4AE', fontSize: 11 },
  mmTimer: { color: '#5C6BC0', fontSize: 13, fontFamily: 'Outfit_500Medium' },
  mmCanvas: { flex: 1, position: 'relative', backgroundColor: '#F5F6FA' },
  edges: { position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 },
  node: { position: 'absolute', transform: [{ translateX: -46 }, { translateY: -44 }], width: 92, backgroundColor: '#fff', borderRadius: 14, paddingVertical: 9, alignItems: 'center', shadowColor: '#37474F', shadowOpacity: 0.08, shadowRadius: 14 },
  nodeYou: { shadowColor: '#5C6BC0', shadowOpacity: 0.18 },
  youBadge: { position: 'absolute', top: -12, backgroundColor: '#5C6BC0', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  youBadgeText: { color: '#fff', fontSize: 9, fontWeight: '700' },
  avatarWrap: { position: 'relative' },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#9FA8DA', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  catBadge: { position: 'absolute', left: -8, top: -4, width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  catText: { fontSize: 10 },
  nodeName: { color: '#37474F', fontSize: 11, fontWeight: '600', marginTop: 6 },
  nodePill: { backgroundColor: '#F0F0F8', color: '#37474F', fontSize: 9, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 7, marginTop: 4 },
  mmBottom: { position: 'absolute', left: 12, right: 12, bottom: 12, height: 54, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.94)', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },
  iconButton: { width: 34, height: 34, textAlign: 'center', lineHeight: 34, backgroundColor: '#F5F6FA', borderRadius: 17 },
  focusPill: { backgroundColor: '#5C6BC0', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  focusText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: '#fff', padding: 18, borderTopLeftRadius: 18, borderTopRightRadius: 18, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 18 },
  handle: { width: 32, height: 3, borderRadius: 2, backgroundColor: '#E8EAF0', alignSelf: 'center', marginBottom: 14 },
  sheetName: { color: '#37474F', fontSize: 14, fontWeight: '700' },
  sheetMeta: { color: '#5C6BC0', fontSize: 10, fontWeight: '700', marginTop: 3 },
  sheetPills: { color: '#37474F', fontSize: 11, marginVertical: 12 },
  cheerButton: { backgroundColor: '#5C6BC0', borderRadius: 10, paddingVertical: 11, alignItems: 'center' },
  cheerButtonText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  cameraScreen: { backgroundColor: '#0E1018' },
  cameraFrame: { position: 'absolute', left: 42, right: 42, top: 150, height: 220, borderWidth: 1.5, borderStyle: 'dashed', borderColor: 'rgba(255,255,255,0.55)', borderRadius: 14, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 10 },
  cameraHint: { color: 'rgba(255,255,255,0.72)', fontSize: 10 },
  cameraTitle: { position: 'absolute', top: 58, alignSelf: 'center', color: 'rgba(255,255,255,0.92)', fontSize: 12 },
  shutter: { position: 'absolute', bottom: 32, alignSelf: 'center', width: 54, height: 54, borderRadius: 27, backgroundColor: '#fff' },
  onboardingScreen: { padding: 22, flex: 1, justifyContent: 'center' },
  onboardingTitle: { color: '#37474F', fontSize: 20, lineHeight: 30, fontWeight: '700', marginTop: 18 },
  onboardingText: { color: '#90A4AE', fontSize: 12, lineHeight: 22, marginTop: 12 },
  concept: { width: '92%', maxWidth: 900, alignItems: 'center', paddingVertical: 92 },
  sectionEyebrow: { color: '#5C6BC0', fontSize: 12, letterSpacing: 1.4, fontWeight: '700', marginBottom: 14 },
  quote: { color: '#37474F', fontSize: 34, lineHeight: 52, textAlign: 'center', fontWeight: '300' },
  quoteStrong: { fontWeight: '700' },
  body: { color: '#90A4AE', fontSize: 16, lineHeight: 30, maxWidth: 680 },
  section: { width: '92%', maxWidth: 1180, paddingVertical: 86 },
  sectionTitle: { color: '#37474F', fontSize: 42, lineHeight: 52, fontWeight: '700', marginBottom: 18 },
  lead: { color: '#90A4AE', fontSize: 16, lineHeight: 30, maxWidth: 680, marginBottom: 34 },
  howImage: { width: '100%', height: 360, borderRadius: 8, marginBottom: 28, borderWidth: 1, borderColor: '#E8EAF0', backgroundColor: '#fff' },
  steps: { flexDirection: 'row', gap: 18, flexWrap: 'wrap' },
  step: { flex: 1, minWidth: 240, backgroundColor: '#fff', borderRadius: 8, padding: 24, borderWidth: 1, borderColor: '#E8EAF0' },
  stepN: { color: '#5C6BC0', fontFamily: 'Outfit_600SemiBold', fontSize: 12, marginBottom: 18 },
  stepTitle: { color: '#37474F', fontSize: 20, fontWeight: '700', marginBottom: 10 },
  stepText: { color: '#90A4AE', fontSize: 14, lineHeight: 24 },
  quiet: { width: '92%', maxWidth: 1040, paddingVertical: 90, flexDirection: 'row', flexWrap: 'wrap', gap: 56, alignItems: 'center', justifyContent: 'center' },
  quietVisual: { width: 480, maxWidth: '100%', aspectRatio: 1.12, justifyContent: 'center' },
  quietMapPanel: { flex: 1, borderRadius: 8, backgroundColor: '#fff', borderWidth: 1, borderColor: '#E8EAF0', overflow: 'hidden', position: 'relative', shadowColor: '#37474F', shadowOpacity: 0.08, shadowRadius: 28 },
  quietGrid: { ...StyleSheet.absoluteFillObject, opacity: 0.52, backgroundColor: '#F5F6FA' },
  quietRing: { position: 'absolute', left: '50%', top: '50%', width: 132, height: 132, marginLeft: -66, marginTop: -66, borderRadius: 66, borderWidth: 2.5, borderColor: '#5C6BC0', backgroundColor: 'transparent', zIndex: 2 },
  quietRingOne: { borderColor: '#5C6BC0' },
  quietRingTwo: { borderColor: '#26A69A', width: 118, height: 118, marginLeft: -59, marginTop: -59, borderRadius: 59 },
  quietRingThree: { borderColor: '#5C6BC0', width: 104, height: 104, marginLeft: -52, marginTop: -52, borderRadius: 52 },
  quietNodeWrap: { position: 'absolute', width: 96, height: 86, marginLeft: -48, marginTop: -43, zIndex: 3 },
  quietNode: { position: 'absolute', left: '50%', top: '50%', width: 118, minHeight: 104, marginLeft: -59, marginTop: -52, backgroundColor: '#fff', borderWidth: 1, borderColor: '#E8EAF0', borderRadius: 14, alignItems: 'center', paddingVertical: 12, shadowColor: '#37474F', shadowOpacity: 0.09, shadowRadius: 16, zIndex: 4 },
  quietNodeCompact: { position: 'relative', left: undefined, top: undefined, width: 96, minHeight: 86, marginLeft: 0, marginTop: 0, paddingVertical: 9 },
  quietNodeActive: { borderColor: 'rgba(92,107,192,0.42)', shadowColor: '#5C6BC0', shadowOpacity: 0.22, shadowRadius: 22 },
  quietNodeBadge: { position: 'absolute', top: -13, color: '#fff', backgroundColor: '#5C6BC0', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2, fontSize: 9, fontWeight: '800' },
  quietAvatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#9FA8DA', alignItems: 'center', justifyContent: 'center', marginBottom: 7 },
  quietAvatarActive: { backgroundColor: '#5C6BC0' },
  quietAvatarText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  quietNodeName: { color: '#37474F', fontSize: 12, fontWeight: '700', marginBottom: 5 },
  quietNodePill: { color: '#37474F', backgroundColor: '#F0F0F8', borderRadius: 7, paddingHorizontal: 7, paddingVertical: 3, fontSize: 10, fontWeight: '600' },
  quietCopy: { flex: 1, minWidth: 300, maxWidth: 460 },
  cats: { width: '100%', flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 16 },
  cat: { width: '18.6%', minWidth: 132, backgroundColor: '#fff', borderWidth: 1, borderColor: '#E8EAF0', borderRadius: 8, padding: 18, overflow: 'hidden' },
  catIcon: { fontSize: 22, marginBottom: 16 },
  catLabel: { color: '#37474F', fontSize: 14, fontWeight: '700' },
  catBar: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 4 },
  gallery: { flexDirection: 'row', flexWrap: 'wrap', gap: 24, justifyContent: 'center' },
  galleryItem: { alignItems: 'center', transform: [{ scale: 0.82 }], marginHorizontal: -18, marginVertical: -44 },
  galleryLabel: { color: '#90A4AE', fontSize: 11, letterSpacing: 1.2, fontFamily: 'Outfit_600SemiBold', marginTop: 18 },
  faq: { maxWidth: 820, gap: 10 },
  faqItem: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#E8EAF0', borderRadius: 8, padding: 20 },
  faqQ: { color: '#37474F', fontSize: 16, fontWeight: '700', marginBottom: 8 },
  faqA: { color: '#90A4AE', fontSize: 14, lineHeight: 25 },
  finale: { width: '92%', maxWidth: 980, alignItems: 'center', paddingVertical: 90, borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#E8EAF0' },
  finaleTitle: { color: '#37474F', fontSize: 42, lineHeight: 52, fontWeight: '700', textAlign: 'center', marginBottom: 18 },
  footer: { width: '92%', maxWidth: 1180, paddingTop: 54, paddingBottom: 34, flexDirection: 'row', flexWrap: 'wrap', gap: 44, justifyContent: 'space-between' },
  footerBrand: { width: 300 },
  footerText: { color: '#90A4AE', fontSize: 13, lineHeight: 24, marginTop: 14 },
  footerCol: { minWidth: 150, gap: 10 },
  footerTitle: { color: '#37474F', fontFamily: 'Outfit_600SemiBold', fontSize: 12, marginBottom: 4 },
  footerLink: { color: '#90A4AE', fontSize: 13, marginBottom: 8 },
  footBottom: { width: '92%', maxWidth: 1180, borderTopWidth: 1, borderColor: '#E8EAF0', paddingVertical: 18, flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 },
  footBottomText: { color: '#B0BEC5', fontSize: 12 },
});
