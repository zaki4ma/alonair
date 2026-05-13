import { router, useLocalSearchParams } from 'expo-router';
import { Award, Flame, Heart, RotateCcw, Tag } from 'lucide-react-native';
import { ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Categories, CategoryId, Colors } from '../constants/colors';
import { clearSession } from '../store/session';

function asString(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? '' : value ?? '';
}

function parseNumber(value: string | string[] | undefined): number {
  const parsed = Number(asString(value));
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseKeywords(value: string | string[] | undefined): string[] {
  try {
    const parsed = JSON.parse(asString(value));
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === 'string')
      : [];
  } catch {
    return [];
  }
}

function parseCategory(value: string | string[] | undefined): CategoryId {
  const category = asString(value);
  return category in Categories ? category as CategoryId : 'study';
}

function formatDuration(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0 && minutes > 0) return `${hours}時間 ${minutes}分`;
  if (hours > 0) return `${hours}時間`;
  if (minutes > 0) return `${minutes}分`;
  return '1分未満';
}

export default function SummaryScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const category = parseCategory(params.category);
  const cat = Categories[category];
  const mood = asString(params.mood) || '集中';
  const keywords = parseKeywords(params.keywords);
  const durationSec = parseNumber(params.durationSec);
  const streakDays = parseNumber(params.streakDays);
  const reactionCount = parseNumber(params.reactionCount);

  const goCheckin = () => {
    clearSession();
    router.replace('/checkin' as never);
  };

  const goHome = () => {
    clearSession();
    router.replace('/onboarding' as never);
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 28 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={[styles.iconCircle, { backgroundColor: cat.color }]}>
            <Award size={30} color="#fff" strokeWidth={2.2} />
          </View>
          <Text style={styles.title}>お疲れさまでした</Text>
          <Text style={styles.subtitle}>今回のセッションを記録しました</Text>
        </View>

        <View style={styles.summaryPanel}>
          <View style={styles.categoryRow}>
            <View style={[styles.categoryBadge, { backgroundColor: `${cat.color}18` }]}>
              <Text style={styles.categoryEmoji}>{cat.emoji}</Text>
              <Text style={[styles.categoryText, { color: cat.color }]}>{cat.label}</Text>
            </View>
            <Text style={styles.dot}>・</Text>
            <Text style={styles.mood}>{mood}</Text>
          </View>

          <Text style={styles.duration}>{formatDuration(durationSec)}</Text>

          <View style={styles.metricRow}>
            <View style={styles.metric}>
              <View style={[styles.metricIcon, { backgroundColor: '#FFF3E0' }]}>
                <Flame size={18} color="#EF6C00" strokeWidth={2.2} />
              </View>
              <View>
                <Text style={styles.metricValue}>{streakDays}日連続</Text>
                <Text style={styles.metricLabel}>ストリーク</Text>
              </View>
            </View>

            <View style={styles.metric}>
              <View style={[styles.metricIcon, { backgroundColor: '#FCE4EC' }]}>
                <Heart size={18} color="#EC407A" strokeWidth={2.2} />
              </View>
              <View>
                <Text style={styles.metricValue}>{reactionCount}</Text>
                <Text style={styles.metricLabel}>届いた応援</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <Tag size={16} color={Colors.slate} strokeWidth={2} />
            <Text style={styles.sectionTitle}>キーワード</Text>
          </View>
          <View style={styles.keywordRow}>
            {keywords.length > 0 ? keywords.map((keyword) => (
              <View key={keyword} style={[styles.keywordPill, { borderColor: cat.color }]}>
                <Text style={[styles.keywordText, { color: cat.color }]}>{keyword}</Text>
              </View>
            )) : (
              <Text style={styles.emptyText}>キーワードはありません</Text>
            )}
          </View>
        </View>

        {reactionCount > 0 && (
          <View style={styles.reactionCard}>
            <Heart size={20} color="#EC407A" strokeWidth={2.2} />
            <Text style={styles.reactionText}>{reactionCount}件の応援が届きました</Text>
          </View>
        )}

        <View style={styles.actions}>
          <Pressable style={[styles.primaryBtn, { backgroundColor: cat.color }]} onPress={goCheckin}>
            <RotateCcw size={18} color="#fff" strokeWidth={2.2} />
            <Text style={styles.primaryBtnText}>もう一度チェックイン</Text>
          </Pressable>
          <Pressable style={styles.secondaryBtn} onPress={goHome}>
            <Text style={styles.secondaryBtnText}>ホームへ</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  content: {
    paddingHorizontal: 20,
    paddingTop: 24,
    gap: 18,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  iconCircle: {
    width: 62,
    height: 62,
    borderRadius: 31,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 27,
    color: Colors.charcoal,
    fontFamily: 'Outfit_700Bold',
    lineHeight: 34,
  },
  subtitle: {
    fontSize: 13,
    color: Colors.slate,
    fontFamily: 'Outfit_400Regular',
    marginTop: 6,
  },
  summaryPanel: {
    backgroundColor: Colors.card,
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.line,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 18,
  },
  categoryEmoji: { fontSize: 16 },
  categoryText: {
    fontSize: 14,
    fontFamily: 'Outfit_700Bold',
  },
  dot: {
    fontSize: 18,
    color: Colors.slate,
    marginHorizontal: 8,
  },
  mood: {
    fontSize: 15,
    color: Colors.charcoal,
    fontFamily: 'Outfit_600SemiBold',
  },
  duration: {
    marginTop: 18,
    fontSize: 36,
    color: Colors.charcoal,
    fontFamily: 'Outfit_700Bold',
  },
  metricRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 22,
  },
  metric: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.bg,
    borderRadius: 14,
    padding: 12,
  },
  metricIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricValue: {
    fontSize: 15,
    color: Colors.charcoal,
    fontFamily: 'Outfit_700Bold',
  },
  metricLabel: {
    fontSize: 10,
    color: Colors.slate,
    marginTop: 2,
  },
  section: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.line,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 13,
    color: Colors.slate,
    fontFamily: 'Outfit_700Bold',
  },
  keywordRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  keywordPill: {
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1.5,
    backgroundColor: Colors.card,
  },
  keywordText: {
    fontSize: 14,
    fontFamily: 'Outfit_600SemiBold',
  },
  emptyText: {
    fontSize: 13,
    color: Colors.slate,
  },
  reactionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFF7FA',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F8BBD0',
  },
  reactionText: {
    flex: 1,
    fontSize: 14,
    color: Colors.charcoal,
    fontFamily: 'Outfit_600SemiBold',
    lineHeight: 20,
  },
  actions: {
    gap: 10,
    marginTop: 4,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 14,
    paddingVertical: 16,
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 15,
    fontFamily: 'Outfit_700Bold',
  },
  secondaryBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    paddingVertical: 15,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.line,
  },
  secondaryBtnText: {
    color: Colors.charcoal,
    fontSize: 14,
    fontFamily: 'Outfit_600SemiBold',
  },
});
