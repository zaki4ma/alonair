import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { AlertTriangle, Lock, LogOut, RefreshCw, ShieldCheck } from 'lucide-react-native';
import { Colors } from '../constants/colors';
import {
  currentUserHasAdminClaim,
  getCurrentUser,
  signInAdmin,
  signOutCurrentUser,
  subscribeAuthUser,
} from '../store/auth';
import {
  getAdminDashboardSnapshot,
  type AdminDashboardSnapshot,
  type AdminRiskUser,
} from '../store/admin';

function formatTime(date: Date): string {
  return new Intl.DateTimeFormat('ja-JP', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(date);
}

function formatDateTime(value?: { toDate?: () => Date }): string {
  const date = value?.toDate?.();
  if (!date) return '-';

  return new Intl.DateTimeFormat('ja-JP', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function StatCard({ label, value, tone }: { label: string; value: string | number; tone?: 'warn' }) {
  return (
    <View style={[styles.statCard, tone === 'warn' && styles.warnCard]}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, tone === 'warn' && styles.warnValue]}>{value}</Text>
    </View>
  );
}

function RiskRow({ user }: { user: AdminRiskUser }) {
  return (
    <View style={styles.tableRow}>
      <Text style={[styles.cell, styles.uidCell]}>{user.uid.slice(0, 10)}</Text>
      <Text style={styles.cell}>{user.sentReactions}</Text>
      <Text style={styles.cell}>{user.blocksMade}</Text>
      <Text style={styles.cell}>{user.blockedBy}</Text>
      <Text style={[styles.cell, styles.scoreCell]}>{user.riskScore}</Text>
    </View>
  );
}

export default function AdminScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authChecked, setAuthChecked] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<AdminDashboardSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingAuth, setLoadingAuth] = useState(false);

  const userEmail = getCurrentUser()?.email ?? 'unknown';

  const refresh = useCallback(async () => {
    if (!isAdmin) return;

    setLoading(true);
    setAuthError(null);
    try {
      setSnapshot(await getAdminDashboardSnapshot());
    } catch (error) {
      console.error('[Admin] dashboard', error);
      setAuthError('管理データを取得できませんでした。Firestore rules と admin claim を確認してください。');
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    const fallbackTimer = setTimeout(() => {
      setAuthChecked(true);
    }, 3000);

    const unsubscribe = subscribeAuthUser(async (user) => {
      clearTimeout(fallbackTimer);
      setSnapshot(null);
      setAuthError(null);
      if (!user || user.isAnonymous) {
        setIsAdmin(false);
        setAuthChecked(true);
        return;
      }

      try {
        setIsAdmin(await currentUserHasAdminClaim());
      } catch (error) {
        console.error('[Admin] claim', error);
        setIsAdmin(false);
        setAuthError('管理者権限を確認できませんでした。');
      } finally {
        setAuthChecked(true);
      }
    });

    return () => {
      clearTimeout(fallbackTimer);
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (isAdmin) void refresh();
  }, [isAdmin, refresh]);

  const activeMax = useMemo(() => {
    if (!snapshot) return 1;
    return Math.max(1, ...snapshot.categories.map((category) => category.activeCount));
  }, [snapshot]);

  const login = async () => {
    if (loadingAuth) return;

    setLoadingAuth(true);
    setAuthError(null);
    try {
      await signInAdmin(email, password);
      const hasClaim = await currentUserHasAdminClaim();
      setIsAdmin(hasClaim);
      if (!hasClaim) {
        setAuthError('このアカウントには admin custom claim がありません。');
      }
    } catch (error) {
      console.error('[Admin] login', error);
      setAuthError('ログインできませんでした。メールアドレスとパスワードを確認してください。');
    } finally {
      setLoadingAuth(false);
    }
  };

  const logout = async () => {
    await signOutCurrentUser();
    setEmail('');
    setPassword('');
    setIsAdmin(false);
    setSnapshot(null);
  };

  if (!authChecked) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!isAdmin) {
    return (
      <View style={styles.loginPage}>
        <View style={styles.loginPanel}>
          <View style={styles.loginIcon}>
            <Lock size={24} color="#fff" strokeWidth={2.2} />
          </View>
          <Text style={styles.loginTitle}>Alonair Admin</Text>
          <Text style={styles.loginLead}>Firebase Auth の管理者アカウントでログインしてください。</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="admin@example.com"
            placeholderTextColor={Colors.slate}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="password"
            placeholderTextColor={Colors.slate}
            secureTextEntry
          />
          {authError ? <Text style={styles.errorText}>{authError}</Text> : null}
          <Pressable style={styles.primaryButton} onPress={login} disabled={loadingAuth}>
            {loadingAuth ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>ログイン</Text>}
          </Pressable>
          <Text style={styles.loginNote}>
            権限判定には Firebase custom claims の admin=true を使います。
          </Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View>
          <View style={styles.titleRow}>
            <ShieldCheck size={24} color="#5C6BC0" strokeWidth={2.2} />
            <Text style={styles.title}>Admin Dashboard</Text>
          </View>
          <Text style={styles.subtitle}>
            {snapshot ? `Last updated ${formatTime(snapshot.generatedAt)}` : 'Loading operational snapshot'}
          </Text>
        </View>
        <View style={styles.headerActions}>
          <Text style={styles.userText}>{userEmail}</Text>
          <Pressable style={styles.iconButton} onPress={refresh} disabled={loading}>
            <RefreshCw size={18} color={Colors.charcoal} strokeWidth={2} />
          </Pressable>
          <Pressable style={styles.iconButton} onPress={logout}>
            <LogOut size={18} color={Colors.charcoal} strokeWidth={2} />
          </Pressable>
        </View>
      </View>

      {authError ? (
        <View style={styles.errorBanner}>
          <AlertTriangle size={18} color="#B26A00" strokeWidth={2} />
          <Text style={styles.errorBannerText}>{authError}</Text>
        </View>
      ) : null}

      {!snapshot || loading ? (
        <View style={styles.loadingPanel}>
          <ActivityIndicator />
          <Text style={styles.loadingText}>集計中...</Text>
        </View>
      ) : (
        <>
          <View style={styles.statsGrid}>
            <StatCard label="現在アクティブ" value={snapshot.totalActive} />
            <StatCard label="期限切れアクティブ" value={snapshot.staleActive} tone={snapshot.staleActive > 0 ? 'warn' : undefined} />
            <StatCard label="今日のチェックイン" value={snapshot.todayCheckins} />
            <StatCard label="今日のユニークユーザー" value={snapshot.uniqueUsersToday} />
            <StatCard label="今日のリアクション" value={snapshot.todayReactions} />
            <StatCard label="総ブロック数" value={snapshot.totalBlocks} />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>ルーム別状況</Text>
            <View style={styles.categoryGrid}>
              {snapshot.categories.map((category) => (
                <View key={category.id} style={styles.categoryCard}>
                  <View style={styles.categoryTop}>
                    <View style={[styles.colorDot, { backgroundColor: category.color }]} />
                    <Text style={styles.categoryLabel}>{category.label}</Text>
                    <Text style={styles.categoryCount}>{category.activeCount}</Text>
                  </View>
                  <View style={styles.barTrack}>
                    <View
                      style={[
                        styles.barFill,
                        {
                          backgroundColor: category.color,
                          width: `${Math.max(4, (category.activeCount / activeMax) * 100)}%`,
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.categoryMeta}>
                    today {category.todayCheckins} / stale {category.staleCount}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.twoColumn}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>最近のチェックイン</Text>
              {snapshot.recentCheckins.length === 0 ? (
                <Text style={styles.emptyText}>今日のチェックインはまだありません。</Text>
              ) : (
                snapshot.recentCheckins.map((checkin) => (
                  <View key={checkin.id} style={styles.checkinRow}>
                    <View style={styles.checkinMain}>
                      <Text style={styles.uidText}>{checkin.uid.slice(0, 10)}</Text>
                      <Text style={styles.keywordText} numberOfLines={1}>
                        {checkin.keywords?.slice(0, 3).join(', ') || '-'}
                      </Text>
                    </View>
                    <View style={styles.checkinSide}>
                      <Text style={styles.categoryId}>{checkin.category}</Text>
                      <Text style={styles.dateText}>{formatDateTime(checkin.createdAt)}</Text>
                    </View>
                  </View>
                ))
              )}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>安全運用シグナル</Text>
              {snapshot.riskUsers.length === 0 ? (
                <Text style={styles.emptyText}>目立ったシグナルはありません。</Text>
              ) : (
                <View style={styles.table}>
                  <View style={styles.tableHeader}>
                    <Text style={[styles.headerCell, styles.uidCell]}>UID</Text>
                    <Text style={styles.headerCell}>送信</Text>
                    <Text style={styles.headerCell}>Block</Text>
                    <Text style={styles.headerCell}>被Block</Text>
                    <Text style={styles.headerCell}>Score</Text>
                  </View>
                  {snapshot.riskUsers.map((user) => <RiskRow key={user.uid} user={user} />)}
                </View>
              )}
            </View>
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#F5F6FA' },
  content: { width: '100%', maxWidth: 1180, alignSelf: 'center', padding: 28, gap: 18 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F5F6FA' },
  loginPage: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F5F6FA', padding: 24 },
  loginPanel: { width: '100%', maxWidth: 420, backgroundColor: Colors.card, borderRadius: 8, borderWidth: 1, borderColor: Colors.line, padding: 28 },
  loginIcon: { width: 48, height: 48, borderRadius: 8, backgroundColor: '#5C6BC0', alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
  loginTitle: { fontSize: 26, color: Colors.charcoal, fontFamily: 'Outfit_700Bold' },
  loginLead: { fontSize: 14, color: Colors.slate, lineHeight: 22, marginTop: 8, marginBottom: 22 },
  input: { borderWidth: 1, borderColor: Colors.line, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 10, color: Colors.charcoal, outlineStyle: 'none' as never },
  errorText: { color: '#C62828', fontSize: 13, lineHeight: 20, marginBottom: 10 },
  primaryButton: { height: 44, borderRadius: 8, backgroundColor: '#5C6BC0', alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  primaryButtonText: { color: '#fff', fontFamily: 'Outfit_700Bold', fontSize: 14 },
  loginNote: { color: Colors.slate, fontSize: 12, lineHeight: 18, marginTop: 16 },
  header: { minHeight: 68, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: { fontSize: 28, color: Colors.charcoal, fontFamily: 'Outfit_700Bold' },
  subtitle: { color: Colors.slate, fontSize: 13, marginTop: 6 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  userText: { color: Colors.slate, fontSize: 13, marginRight: 6 },
  iconButton: { width: 38, height: 38, borderRadius: 8, borderWidth: 1, borderColor: Colors.line, backgroundColor: Colors.card, alignItems: 'center', justifyContent: 'center' },
  errorBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FFF8E1', borderWidth: 1, borderColor: '#FFE0B2', borderRadius: 8, padding: 12 },
  errorBannerText: { flex: 1, color: '#7A4B00', fontSize: 13 },
  loadingPanel: { minHeight: 260, alignItems: 'center', justifyContent: 'center', gap: 10 },
  loadingText: { color: Colors.slate, fontSize: 13 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  statCard: { flex: 1, minWidth: 170, backgroundColor: Colors.card, borderRadius: 8, borderWidth: 1, borderColor: Colors.line, padding: 18 },
  warnCard: { borderColor: '#FFE0B2', backgroundColor: '#FFF8E1' },
  statLabel: { color: Colors.slate, fontSize: 12, fontFamily: 'Outfit_600SemiBold' },
  statValue: { color: Colors.charcoal, fontSize: 30, fontFamily: 'Outfit_700Bold', marginTop: 10 },
  warnValue: { color: '#B26A00' },
  section: { backgroundColor: Colors.card, borderRadius: 8, borderWidth: 1, borderColor: Colors.line, padding: 18 },
  sectionTitle: { color: Colors.charcoal, fontSize: 16, fontFamily: 'Outfit_700Bold', marginBottom: 14 },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  categoryCard: { width: '19%', minWidth: 180, borderWidth: 1, borderColor: Colors.line, borderRadius: 8, padding: 12 },
  categoryTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  colorDot: { width: 9, height: 9, borderRadius: 5 },
  categoryLabel: { flex: 1, color: Colors.charcoal, fontSize: 13, fontFamily: 'Outfit_600SemiBold' },
  categoryCount: { color: Colors.charcoal, fontSize: 18, fontFamily: 'Outfit_700Bold' },
  barTrack: { height: 6, borderRadius: 3, backgroundColor: Colors.bg, marginTop: 12, overflow: 'hidden' },
  barFill: { height: 6, borderRadius: 3 },
  categoryMeta: { color: Colors.slate, fontSize: 11, marginTop: 8 },
  twoColumn: { flexDirection: 'row', gap: 18, alignItems: 'flex-start' },
  checkinRow: { minHeight: 54, borderTopWidth: 1, borderTopColor: Colors.line, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  checkinMain: { flex: 1 },
  uidText: { color: Colors.charcoal, fontSize: 13, fontFamily: 'Outfit_700Bold' },
  keywordText: { color: Colors.slate, fontSize: 12, marginTop: 3 },
  checkinSide: { alignItems: 'flex-end' },
  categoryId: { color: '#5C6BC0', fontSize: 12, fontFamily: 'Outfit_700Bold' },
  dateText: { color: Colors.slate, fontSize: 11, marginTop: 3 },
  emptyText: { color: Colors.slate, fontSize: 13, lineHeight: 20 },
  table: { borderTopWidth: 1, borderTopColor: Colors.line },
  tableHeader: { flexDirection: 'row', paddingVertical: 10 },
  tableRow: { flexDirection: 'row', paddingVertical: 10, borderTopWidth: 1, borderTopColor: Colors.line },
  headerCell: { flex: 1, color: Colors.slate, fontSize: 11, fontFamily: 'Outfit_700Bold' },
  cell: { flex: 1, color: Colors.charcoal, fontSize: 12, fontFamily: 'Outfit_500Medium' },
  uidCell: { flex: 1.4 },
  scoreCell: { color: '#B26A00', fontFamily: 'Outfit_700Bold' },
});
