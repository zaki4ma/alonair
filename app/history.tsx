import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Clock, RefreshCw } from 'lucide-react-native';
import { Timestamp } from 'firebase/firestore';
import { Categories, CategoryId, Colors } from '../constants/colors';
import { ensureAnonymousAuth, getUid } from '../store/auth';
import { CheckinDoc, getCheckinHistory } from '../store/firestore';
import { calculateStreakDays } from '../lib/streak';

type HistoryItem = CheckinDoc & { id: string };

function timestampToDate(value?: Timestamp): Date | null {
  return value ? value.toDate() : null;
}

function getDurationMinutes(item: HistoryItem): number {
  const start = timestampToDate(item.createdAt);
  if (!start) return 0;

  const end = timestampToDate(item.endedAt) ?? new Date();
  return Math.max(1, Math.round((end.getTime() - start.getTime()) / 60000));
}

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}分`;
  if (m === 0) return `${h}時間`;
  return `${h}時間${m}分`;
}

function formatDate(item: HistoryItem): string {
  const date = timestampToDate(item.createdAt);
  if (!date) return '保存中';
  return new Intl.DateTimeFormat('ja-JP', {
    month: 'numeric',
    day: 'numeric',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function isAfterDaysAgo(item: HistoryItem, days: number): boolean {
  const date = timestampToDate(item.createdAt);
  if (!date) return false;
  return date.getTime() >= Date.now() - days * 24 * 60 * 60 * 1000;
}

function getCategory(item: HistoryItem) {
  const id = item.category as CategoryId;
  return Categories[id] ?? Categories.misc;
}

export default function HistoryScreen() {
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadHistory = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const uid = getUid() ?? await ensureAnonymousAuth();
      const docs = await getCheckinHistory(uid);
      setItems(docs);
    } catch (e) {
      console.error('[History]', e);
      setError(e instanceof Error ? e.message : '履歴の取得に失敗しました');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const summary = useMemo(() => {
    const weekMinutes = items
      .filter((item) => isAfterDaysAgo(item, 7))
      .reduce((sum, item) => sum + getDurationMinutes(item), 0);
    const monthMinutes = items
      .filter((item) => isAfterDaysAgo(item, 30))
      .reduce((sum, item) => sum + getDurationMinutes(item), 0);
    const categoryTotals = items.reduce<Record<string, number>>((acc, item) => {
      const category = getCategory(item);
      acc[category.id] = (acc[category.id] ?? 0) + getDurationMinutes(item);
      return acc;
    }, {});
    const streakDays = calculateStreakDays(
      items
        .map((item) => timestampToDate(item.createdAt))
        .filter((date): date is Date => !!date)
    );

    const topCategories = Object.entries(categoryTotals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([categoryId, minutes]) => ({
        category: Categories[categoryId as CategoryId] ?? Categories.misc,
        minutes,
      }));

    return { weekMinutes, monthMinutes, streakDays, topCategories };
  }, [items]);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable style={styles.headerIconButton} onPress={() => router.back()} hitSlop={12}>
          <ArrowLeft size={22} color={Colors.charcoal} strokeWidth={2} />
        </Pressable>
        <View style={styles.headerTextBlock}>
          <Text style={styles.title}>作業ログ</Text>
          <Text style={styles.subtitle}>チェックイン履歴</Text>
        </View>
        <Pressable style={styles.headerIconButton} onPress={() => loadHistory(true)} hitSlop={12}>
          <RefreshCw size={20} color={Colors.slate} strokeWidth={2} />
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.charcoal} />
          <Text style={styles.centerText}>履歴を読み込み中</Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => loadHistory(true)} />
          }
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 28 }]}
        >
          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <View style={styles.summaryGrid}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>過去7日</Text>
              <Text style={styles.summaryValue}>{formatDuration(summary.weekMinutes)}</Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>過去30日</Text>
              <Text style={styles.summaryValue}>{formatDuration(summary.monthMinutes)}</Text>
            </View>
          </View>
          <View style={styles.streakCard}>
            <Text style={styles.streakLabel}>🔥 連続作業</Text>
            <Text style={styles.streakValue}>{summary.streakDays}日</Text>
          </View>

          <Text style={styles.sectionTitle}>カテゴリ別</Text>
          <View style={styles.categoryCard}>
            {summary.topCategories.length === 0 ? (
              <Text style={styles.emptySmall}>まだ集計できる履歴がありません</Text>
            ) : summary.topCategories.map(({ category, minutes }) => (
              <View key={category.id} style={styles.categoryRow}>
                <View style={styles.categoryNameWrap}>
                  <View style={[styles.categoryDot, { backgroundColor: category.color }]} />
                  <Text style={styles.categoryName}>{category.label}</Text>
                </View>
                <Text style={styles.categoryMinutes}>{formatDuration(minutes)}</Text>
              </View>
            ))}
          </View>

          <Text style={styles.sectionTitle}>履歴</Text>
          {items.length === 0 ? (
            <View style={styles.emptyCard}>
              <Clock size={26} color={Colors.slate} strokeWidth={1.8} />
              <Text style={styles.emptyTitle}>チェックイン履歴はまだありません</Text>
              <Text style={styles.emptyBody}>作業を開始して終了すると、ここに時間とカテゴリが残ります。</Text>
            </View>
          ) : items.map((item) => {
            const category = getCategory(item);
            const duration = getDurationMinutes(item);

            return (
              <View key={item.id} style={styles.historyCard}>
                <View style={styles.historyTopRow}>
                  <View style={[styles.categoryBadge, { backgroundColor: `${category.color}18` }]}>
                    <Text style={[styles.categoryBadgeText, { color: category.color }]}>
                      {category.label}
                    </Text>
                  </View>
                  <Text style={styles.dateText}>{formatDate(item)}</Text>
                </View>
                <View style={styles.historyMainRow}>
                  <View style={styles.keywordWrap}>
                    {item.keywords.slice(0, 4).map((keyword) => (
                      <View key={keyword} style={styles.keywordPill}>
                        <Text style={styles.keywordText}>{keyword}</Text>
                      </View>
                    ))}
                  </View>
                  <Text style={styles.durationText}>{formatDuration(duration)}</Text>
                </View>
                {item.status ? <Text style={styles.statusText}>{item.status}</Text> : null}
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.card,
    borderBottomWidth: 1,
    borderBottomColor: Colors.line,
  },
  headerIconButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextBlock: { flex: 1, alignItems: 'center' },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.charcoal,
    fontFamily: 'Outfit_700Bold',
  },
  subtitle: { fontSize: 11, color: Colors.slate, marginTop: 2 },
  content: { padding: 20, gap: 14 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  centerText: { fontSize: 13, color: Colors.slate },
  errorText: {
    color: '#E53935',
    fontSize: 12,
    lineHeight: 18,
    padding: 12,
    backgroundColor: '#FFEBEE',
    borderRadius: 8,
  },
  summaryGrid: { flexDirection: 'row', gap: 10 },
  summaryCard: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.line,
  },
  summaryLabel: { fontSize: 12, color: Colors.slate, marginBottom: 8 },
  summaryValue: {
    fontSize: 21,
    fontWeight: '700',
    color: Colors.charcoal,
    fontFamily: 'Outfit_700Bold',
  },
  streakCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF3E0',
    borderRadius: 8,
    padding: 14,
    borderWidth: 1,
    borderColor: '#FFE0B2',
  },
  streakLabel: {
    fontSize: 14,
    color: '#EF6C00',
    fontFamily: 'Outfit_700Bold',
  },
  streakValue: {
    fontSize: 22,
    color: '#EF6C00',
    fontFamily: 'Outfit_700Bold',
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.slate,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginTop: 4,
  },
  categoryCard: {
    backgroundColor: Colors.card,
    borderRadius: 8,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.line,
    gap: 10,
  },
  categoryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  categoryNameWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  categoryDot: { width: 8, height: 8, borderRadius: 4 },
  categoryName: {
    fontSize: 14,
    color: Colors.charcoal,
    fontFamily: 'Outfit_500Medium',
  },
  categoryMinutes: {
    fontSize: 14,
    color: Colors.charcoal,
    fontFamily: 'Outfit_600SemiBold',
  },
  emptySmall: { fontSize: 13, color: Colors.slate },
  emptyCard: {
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: 8,
    padding: 24,
    borderWidth: 1,
    borderColor: Colors.line,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.charcoal,
    marginTop: 10,
    fontFamily: 'Outfit_700Bold',
  },
  emptyBody: { fontSize: 13, color: Colors.slate, textAlign: 'center', lineHeight: 19, marginTop: 6 },
  historyCard: {
    backgroundColor: Colors.card,
    borderRadius: 8,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.line,
    gap: 10,
  },
  historyTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  categoryBadge: { borderRadius: 14, paddingHorizontal: 10, paddingVertical: 4 },
  categoryBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'Outfit_700Bold',
  },
  dateText: { fontSize: 12, color: Colors.slate },
  historyMainRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  keywordWrap: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  keywordPill: {
    backgroundColor: Colors.pillBg,
    borderRadius: 12,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  keywordText: {
    fontSize: 12,
    color: '#5C6BC0',
    fontFamily: 'Outfit_600SemiBold',
  },
  durationText: {
    fontSize: 16,
    color: Colors.charcoal,
    fontFamily: 'Outfit_700Bold',
  },
  statusText: { fontSize: 13, color: Colors.slate, lineHeight: 18 },
});
