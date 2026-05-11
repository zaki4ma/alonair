import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, ChevronRight, Trash2 } from 'lucide-react-native';
import { Colors } from '../constants/colors';
import { ensureAnonymousAuth, getUid } from '../store/auth';
import { deleteUserData } from '../store/firestore';
import { clearSession } from '../store/session';
import { useEffect, useState } from 'react';

const ONBOARDING_DONE_KEY = 'onboarding_done';
const FEEDBACK_EMAIL = 'support@alonair.app';

function appVersion(): string {
  return Constants.expoConfig?.version ?? '1.0.0';
}

function buildNumber(): string {
  return (
    Constants.expoConfig?.ios?.buildNumber ??
    Constants.expoConfig?.android?.versionCode?.toString() ??
    Constants.nativeBuildVersion ??
    '1'
  );
}

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const [uid, setUid] = useState<string | null>(() => getUid());
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let mounted = true;
    ensureAnonymousAuth()
      .then((nextUid) => {
        if (mounted) setUid(nextUid);
      })
      .catch(console.error);
    return () => {
      mounted = false;
    };
  }, []);

  const accountId = uid ? uid.slice(0, 8) : '--------';

  const deleteAllData = () => {
    Alert.alert(
      'データを削除しますか？',
      'この端末のオンボーディング状態と、サーバー上の自分のチェックイン履歴を削除します。この操作は取り消せません。',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '削除する',
          style: 'destructive',
          onPress: async () => {
            if (deleting) return;
            setDeleting(true);
            try {
              const currentUid = uid ?? await ensureAnonymousAuth();
              await deleteUserData(currentUid);
              await AsyncStorage.removeItem(ONBOARDING_DONE_KEY);
              clearSession();
              router.replace('/onboarding' as never);
            } catch (error) {
              console.error('[Settings] delete data', error);
              Alert.alert('削除できませんでした', '通信状態を確認して、もう一度お試しください。');
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  const sendFeedback = () => {
    const subject = encodeURIComponent('Alonair feedback');
    const body = encodeURIComponent(`匿名ID: ${accountId}\n\n`);
    Linking.openURL(`mailto:${FEEDBACK_EMAIL}?subject=${subject}&body=${body}`).catch(() => {
      Alert.alert('メールを開けませんでした', `宛先: ${FEEDBACK_EMAIL}`);
    });
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()} hitSlop={12}>
          <ChevronLeft size={24} color={Colors.charcoal} strokeWidth={2} />
        </Pressable>
        <Text style={styles.headerTitle}>設定</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 28 }]}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>アカウント</Text>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>匿名ID</Text>
            <Text style={styles.rowValue}>{accountId}</Text>
          </View>
          <Pressable
            style={({ pressed }) => [styles.actionRow, pressed && styles.pressed]}
            onPress={deleteAllData}
            disabled={deleting}
          >
            <View style={styles.actionLeft}>
              <Trash2 size={18} color="#D32F2F" strokeWidth={2} />
              <Text style={styles.deleteText}>
                {deleting ? '削除中...' : 'データをすべて削除する'}
              </Text>
            </View>
            <ChevronRight size={18} color={Colors.slate} strokeWidth={2} />
          </Pressable>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>アプリ情報</Text>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>バージョン</Text>
            <Text style={styles.rowValue}>{appVersion()}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>ビルド</Text>
            <Text style={styles.rowValue}>{buildNumber()}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Pressable
            style={({ pressed }) => [styles.actionRow, pressed && styles.pressed]}
            onPress={sendFeedback}
          >
            <Text style={styles.rowLabel}>フィードバックを送る</Text>
            <ChevronRight size={18} color={Colors.slate} strokeWidth={2} />
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: Colors.line,
    backgroundColor: Colors.card,
    paddingHorizontal: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    color: Colors.charcoal,
    fontFamily: 'Outfit_700Bold',
  },
  headerSpacer: { width: 40 },
  content: {
    padding: 20,
    gap: 16,
  },
  section: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.line,
    overflow: 'hidden',
  },
  sectionTitle: {
    fontSize: 12,
    color: Colors.slate,
    fontFamily: 'Outfit_700Bold',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 6,
  },
  row: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.line,
  },
  actionRow: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.line,
  },
  actionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  rowLabel: {
    fontSize: 15,
    color: Colors.charcoal,
    fontFamily: 'Outfit_500Medium',
  },
  rowValue: {
    fontSize: 14,
    color: Colors.slate,
    fontFamily: 'Outfit_600SemiBold',
  },
  deleteText: {
    fontSize: 15,
    color: '#D32F2F',
    fontFamily: 'Outfit_600SemiBold',
  },
  pressed: {
    opacity: 0.65,
  },
});
