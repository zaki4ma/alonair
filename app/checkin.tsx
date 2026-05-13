import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, Pressable, ScrollView,
  TextInput, ActivityIndicator, Image, Alert,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Categories, CategoryId } from '../constants/colors';
import { setSession } from '../store/session';
import { ensureAnonymousAuth, getUid } from '../store/auth';
import { saveCheckin } from '../store/firestore';
import { analyzeCheckinPhoto, type DNAResult } from '../store/gemini';

// ── Types ──────────────────────────────────────────────────────────────────

type Phase = 'select' | 'analyzing' | 'result';

// ── Root screen ────────────────────────────────────────────────────────────

export default function CheckinScreen() {
  const insets = useSafeAreaInsets();
  const [phase, setPhase] = useState<Phase>('select');
  const [category, setCategory] = useState<CategoryId>('study');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [result, setResult] = useState<DNAResult | null>(null);
  const [statusText, setStatusText] = useState('');
  const [apiError, setApiError] = useState<string | null>(null);

  const processImage = useCallback(async (asset: ImagePicker.ImagePickerAsset) => {
    if (!asset.base64) { setApiError('画像の読み込みに失敗しました'); setPhase('select'); return; }
    setImageUri(asset.uri);
    setPhase('analyzing');
    setApiError(null);
    try {
      await ensureAnonymousAuth();
      const r = await analyzeCheckinPhoto(asset.base64, asset.mimeType ?? 'image/jpeg');
      setResult(r);
      if (r.category && r.category in Categories) setCategory(r.category as CategoryId);
      setPhase('result');
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error('[Checkin]', msg);
      setApiError(msg);
      setPhase('select');
    }
  }, []);

  const openCamera = useCallback(async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('カメラのアクセスが必要です', '設定からカメラを許可してください'); return;
    }
    const picked = await ImagePicker.launchCameraAsync({
      quality: 0.6, base64: true, allowsEditing: true, aspect: [4, 3],
    });
    if (!picked.canceled && picked.assets?.[0]) await processImage(picked.assets[0]);
  }, [processImage]);

  const reset = useCallback(() => {
    setPhase('select'); setImageUri(null); setResult(null);
    setStatusText(''); setApiError(null);
  }, []);

  const goBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace('/onboarding' as never);
  }, []);

  const checkin = useCallback(async () => {
    if (result) {
      setSession({
        category,
        keywords: result.keywords,
        tools: result.tools,
        mood: result.mood,
        colorTemp: result.colorTemp,
        density: result.density,
        statusText,
        startTime: Date.now(),
      });
      const uid = getUid();
      if (uid) {
        try {
          await saveCheckin(uid, {
            category,
            keywords: result.keywords,
            tools: result.tools,
            mood: result.mood,
            colorTemp: result.colorTemp,
            density: result.density,
            status: statusText,
          });
        } catch (error) {
          console.error('[Checkin]', error);
          Alert.alert('チェックインに失敗しました', '通信状態を確認して、もう一度お試しください。');
          return;
        }
      }
    }
    router.replace('/map' as never);
  }, [result, category, statusText]);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {phase === 'select' && (
        <SelectPhase
          category={category}
          onCategory={setCategory}
          onCamera={openCamera}
          onBack={goBack}
          error={apiError}
          bottomPad={insets.bottom}
        />
      )}
      {phase === 'analyzing' && imageUri && <AnalyzingPhase imageUri={imageUri} />}
      {phase === 'result' && result && imageUri && (
        <ResultPhase
          imageUri={imageUri}
          result={result}
          category={category}
          onCategory={setCategory}
          statusText={statusText}
          onStatus={setStatusText}
          onCheckin={checkin}
          onReset={reset}
          bottomPad={insets.bottom}
        />
      )}
    </View>
  );
}

// ── Phase: Select ──────────────────────────────────────────────────────────

function SelectPhase({
  category, onCategory, onCamera, onBack, error, bottomPad,
}: {
  category: CategoryId;
  onCategory: (c: CategoryId) => void;
  onCamera: () => void;
  onBack: () => void;
  error: string | null;
  bottomPad: number;
}) {
  const cat = Categories[category];
  return (
    <View style={styles.fill}>
      {/* Header */}
      <View style={styles.selectHeader}>
        <Pressable onPress={onBack} style={styles.backBtn} hitSlop={12}>
          <Text style={styles.backArrow}>←</Text>
        </Pressable>
        <Text style={styles.selectTitle}>チェックイン</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: bottomPad + 24 }}>
        {/* Category */}
        <Text style={styles.sectionLabel}>カテゴリ</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.catRow}>
          {(Object.values(Categories) as typeof Categories[CategoryId][]).map((c) => {
            const active = c.id === category;
            return (
              <Pressable
                key={c.id}
                style={[styles.catPill, active && { backgroundColor: c.color, borderColor: c.color }]}
                onPress={() => onCategory(c.id as CategoryId)}
              >
                <Text style={styles.catEmoji}>{c.emoji}</Text>
                <Text style={[styles.catLabel, active && { color: '#fff' }]}>{c.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Prompt */}
        <View style={[styles.promptBox, { borderLeftColor: cat.color }]}>
          <Text style={styles.promptEmoji}>{cat.emoji}</Text>
          <View>
            <Text style={styles.promptText}>作業現場を撮影してください</Text>
            <Text style={styles.promptSub}>AIが環境を解析してDNAを抽出します</Text>
          </View>
        </View>

        {/* Error */}
        {error && <Text style={styles.errorText}>{error}</Text>}

        {/* Buttons */}
        <Pressable style={[styles.primaryBtn, { backgroundColor: cat.color }]} onPress={onCamera}>
          <Text style={styles.primaryBtnIcon}>📷</Text>
          <Text style={styles.primaryBtnText}>カメラで撮影</Text>
        </Pressable>

        <Text style={styles.privacyNote}>
          写真はAI解析のみに使用。サーバーには保存されません。
        </Text>
      </ScrollView>
    </View>
  );
}

// ── Phase: Analyzing ───────────────────────────────────────────────────────

function AnalyzingPhase({ imageUri }: { imageUri: string }) {
  return (
    <View style={styles.fill}>
      <Image source={{ uri: imageUri }} style={styles.analyzeImage} />
      <View style={styles.analyzeOverlay}>
        <View style={styles.analyzeCard}>
          <ActivityIndicator size="large" color={Colors.charcoal} />
          <Text style={styles.analyzeTitle}>AIが解析中...</Text>
          <Text style={styles.analyzeSub}>キーワードとDNAを抽出しています</Text>
        </View>
      </View>
    </View>
  );
}

// ── Phase: Result ──────────────────────────────────────────────────────────

function ResultPhase({
  imageUri, result, category, onCategory, statusText, onStatus,
  onCheckin, onReset, bottomPad,
}: {
  imageUri: string;
  result: DNAResult;
  category: CategoryId;
  onCategory: (c: CategoryId) => void;
  statusText: string;
  onStatus: (s: string) => void;
  onCheckin: () => void;
  onReset: () => void;
  bottomPad: number;
}) {
  const cat = Categories[category];
  const moodColor = moodToColor(result.mood);

  return (
    <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ paddingBottom: bottomPad + 24 }}>
        {/* Image + header */}
        <View style={styles.resultImageWrap}>
          <Image source={{ uri: imageUri }} style={styles.resultImage} />
          <View style={styles.resultImageOverlay} />
          <View style={styles.resultImageContent}>
            <View style={[styles.moodBadge, { backgroundColor: moodColor }]}>
              <Text style={styles.moodBadgeText}>{result.mood}</Text>
            </View>
          </View>
        </View>

        {/* Category override */}
        <View style={styles.resultSection}>
          <Text style={styles.sectionLabel}>カテゴリ</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.catRow}>
            {(Object.values(Categories) as typeof Categories[CategoryId][]).map((c) => {
              const active = c.id === category;
              return (
                <Pressable
                  key={c.id}
                  style={[styles.catPill, active && { backgroundColor: c.color, borderColor: c.color }]}
                  onPress={() => onCategory(c.id as CategoryId)}
                >
                  <Text style={styles.catEmoji}>{c.emoji}</Text>
                  <Text style={[styles.catLabel, active && { color: '#fff' }]}>{c.label}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* Keywords */}
        <View style={styles.resultSection}>
          <Text style={styles.sectionLabel}>抽出キーワード</Text>
          <View style={styles.pillRow}>
            {result.keywords.map((kw) => (
              <View key={kw} style={[styles.kwPill, { borderColor: cat.color }]}>
                <Text style={[styles.kwText, { color: cat.color }]}>{kw}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Tools */}
        {result.tools.length > 0 && (
          <View style={styles.resultSection}>
            <Text style={styles.sectionLabel}>検出ツール</Text>
            <View style={styles.pillRow}>
              {result.tools.map((t) => (
                <View key={t} style={styles.toolPill}>
                  <Text style={styles.toolText}>{t}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* DNA mini bars */}
        <View style={styles.resultSection}>
          <Text style={styles.sectionLabel}>DNA解析</Text>
          <View style={styles.dnaCard}>
            <DNABar
              label="色温度"
              leftLabel="暖色"
              rightLabel="寒色"
              value={result.colorTemp}
              leftColor="#FF8A65"
              rightColor="#5C6BC0"
            />
            <View style={styles.dnaDivider} />
            <DNABar
              label="情報密度"
              leftLabel="余白"
              rightLabel="密集"
              value={result.density}
              leftColor="#B0BEC5"
              rightColor="#37474F"
            />
          </View>
        </View>

        {/* Status text */}
        <View style={styles.resultSection}>
          <Text style={styles.sectionLabel}>ひとこと（任意）</Text>
          <TextInput
            style={styles.statusInput}
            placeholder="最大15文字"
            placeholderTextColor={Colors.slate}
            value={statusText}
            onChangeText={(t) => onStatus(t.slice(0, 15))}
            maxLength={15}
            returnKeyType="done"
          />
          <Text style={styles.charCount}>{statusText.length} / 15</Text>
        </View>

        {/* Actions */}
        <Pressable style={[styles.primaryBtn, { backgroundColor: cat.color, marginHorizontal: 20 }]}
          onPress={onCheckin}>
          <Text style={styles.primaryBtnText}>チェックイン</Text>
        </Pressable>

        <Pressable onPress={onReset} style={styles.resetBtn}>
          <Text style={styles.resetText}>撮り直す</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ── DNA Bar ────────────────────────────────────────────────────────────────

function DNABar({
  label, leftLabel, rightLabel, value, leftColor, rightColor,
}: {
  label: string; leftLabel: string; rightLabel: string;
  value: number; leftColor: string; rightColor: string;
}) {
  const thumbColor = interpolateColor(leftColor, rightColor, value);
  return (
    <View style={styles.dnaBarRow}>
      <Text style={styles.dnaBarLabel}>{label}</Text>
      <View style={styles.dnaBarTrackWrap}>
        <Text style={[styles.dnaBarSideLabel, { color: leftColor }]}>{leftLabel}</Text>
        <View style={styles.dnaBarTrack}>
          <View style={[styles.dnaBarThumb, { left: `${value * 100}%` as unknown as number, backgroundColor: thumbColor }]} />
        </View>
        <Text style={[styles.dnaBarSideLabel, { color: rightColor }]}>{rightLabel}</Text>
      </View>
    </View>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────

function moodToColor(mood: string): string {
  const map: Record<string, string> = {
    集中: '#5C6BC0', 発想: '#FF8A65', 創造: '#66BB6A', 探索: '#90A4AE',
  };
  return map[mood] ?? '#90A4AE';
}

function interpolateColor(from: string, to: string, t: number): string {
  const parse = (hex: string) => [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
  const [r1, g1, b1] = parse(from);
  const [r2, g2, b2] = parse(to);
  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const b = Math.round(b1 + (b2 - b1) * t);
  return `rgb(${r},${g},${b})`;
}

// ── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  fill: { flex: 1 },

  // Select phase
  selectHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  backArrow: { fontSize: 22, color: Colors.charcoal },
  selectTitle: { fontSize: 16, fontWeight: '600', color: Colors.charcoal, fontFamily: 'Outfit_600SemiBold' },

  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: Colors.slate,
    letterSpacing: 0.8, textTransform: 'uppercase',
    marginHorizontal: 20, marginBottom: 12, marginTop: 4,
  },

  catRow: { paddingHorizontal: 20, gap: 8, paddingBottom: 4 },
  catPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 9,
    borderRadius: 20, borderWidth: 1, borderColor: Colors.line,
    backgroundColor: Colors.card,
  },
  catEmoji: { fontSize: 16 },
  catLabel: { fontSize: 14, fontWeight: '500', color: Colors.charcoal, fontFamily: 'Outfit_500Medium' },

  promptBox: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    margin: 20, padding: 16,
    backgroundColor: Colors.card, borderRadius: 14,
    borderLeftWidth: 3,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  promptEmoji: { fontSize: 28 },
  promptText: { fontSize: 14, fontWeight: '600', color: Colors.charcoal, fontFamily: 'Outfit_600SemiBold' },
  promptSub: { fontSize: 11, color: Colors.slate, marginTop: 2 },

  errorText: { color: '#E53935', fontSize: 12, marginHorizontal: 20, marginBottom: 8 },

  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginHorizontal: 20, marginTop: 16, paddingVertical: 16,
    borderRadius: 14,
  },
  primaryBtnIcon: { fontSize: 20 },
  primaryBtnText: { fontSize: 15, fontWeight: '700', color: '#fff', fontFamily: 'Outfit_700Bold' },

  privacyNote: {
    fontSize: 10, color: Colors.slate, textAlign: 'center',
    marginTop: 20, marginHorizontal: 32, lineHeight: 16,
  },

  // Analyzing phase
  analyzeImage: { ...StyleSheet.absoluteFillObject, opacity: 0.35 },
  analyzeOverlay: {
    flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32,
  },
  analyzeCard: {
    backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: 20,
    padding: 32, alignItems: 'center', gap: 12, width: '100%',
    shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 20, shadowOffset: { width: 0, height: 4 },
  },
  analyzeTitle: { fontSize: 18, fontWeight: '700', color: Colors.charcoal, fontFamily: 'Outfit_700Bold' },
  analyzeSub: { fontSize: 13, color: Colors.slate, textAlign: 'center' },

  // Result phase
  resultImageWrap: { height: 200, position: 'relative' },
  resultImage: { width: '100%', height: '100%' },
  resultImageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  resultImageContent: {
    position: 'absolute', bottom: 14, left: 20,
  },
  moodBadge: {
    paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20,
  },
  moodBadgeText: { fontSize: 14, fontWeight: '700', color: '#fff', fontFamily: 'Outfit_700Bold' },

  resultSection: { marginTop: 20 },

  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 20 },
  kwPill: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1.5, backgroundColor: Colors.card,
  },
  kwText: { fontSize: 14, fontWeight: '600', fontFamily: 'Outfit_600SemiBold' },
  toolPill: {
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20,
    backgroundColor: Colors.bg, borderWidth: 1, borderColor: Colors.line,
  },
  toolText: { fontSize: 13, color: Colors.slate },

  dnaCard: {
    marginHorizontal: 20, backgroundColor: Colors.card, borderRadius: 14, padding: 16,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 2 },
  },
  dnaBarRow: { gap: 6 },
  dnaBarLabel: { fontSize: 12, fontWeight: '700', color: Colors.slate, letterSpacing: 0.5 },
  dnaBarTrackWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dnaBarSideLabel: { fontSize: 11, fontWeight: '600', width: 32 },
  dnaBarTrack: {
    flex: 1, height: 4, backgroundColor: Colors.line, borderRadius: 2, position: 'relative',
  },
  dnaBarThumb: {
    position: 'absolute', top: -4, width: 12, height: 12,
    borderRadius: 6, borderWidth: 2, borderColor: '#fff',
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 3, shadowOffset: { width: 0, height: 1 },
  },
  dnaDivider: { height: 1, backgroundColor: Colors.line, marginVertical: 14 },

  statusInput: {
    marginHorizontal: 20, padding: 14, backgroundColor: Colors.card,
    borderRadius: 12, borderWidth: 1, borderColor: Colors.line,
    fontSize: 14, color: Colors.charcoal, fontFamily: 'Outfit_400Regular',
  },
  charCount: { fontSize: 10, color: Colors.slate, textAlign: 'right', marginRight: 20, marginTop: 4 },

  resetBtn: { alignItems: 'center', paddingVertical: 16 },
  resetText: { fontSize: 13, color: Colors.slate },
});
