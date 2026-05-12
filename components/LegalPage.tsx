import { Link } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

export interface LegalSection {
  title: string;
  body?: string[];
  items?: string[];
}

interface LegalPageProps {
  title: string;
  lead: string;
  updatedAt: string;
  sections: LegalSection[];
}

function Brand() {
  return (
    <Link href="/" style={styles.brandLink}>
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
    </Link>
  );
}

export default function LegalPage({ title, lead, updatedAt, sections }: LegalPageProps) {
  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <View style={styles.nav}>
        <Brand />
        <View style={styles.navLinks}>
          <Link href="/terms" style={styles.navLink}>利用規約</Link>
          <Link href="/privacy" style={styles.navLink}>プライバシーポリシー</Link>
        </View>
      </View>

      <View style={styles.hero}>
        <Text style={styles.eyebrow}>LEGAL</Text>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.lead}>{lead}</Text>
        <Text style={styles.updated}>制定日: {updatedAt}</Text>
      </View>

      <View style={styles.document}>
        {sections.map((section, index) => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle}>第{index + 1}条 {section.title}</Text>
            {section.body?.map((paragraph) => (
              <Text key={paragraph} style={styles.paragraph}>{paragraph}</Text>
            ))}
            {section.items?.map((item) => (
              <View key={item} style={styles.itemRow}>
                <Text style={styles.bullet}>・</Text>
                <Text style={styles.itemText}>{item}</Text>
              </View>
            ))}
          </View>
        ))}
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>© 2026 Alonair Inc.</Text>
        <Link href="/" style={styles.footerLink}>トップへ戻る</Link>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#F5F6FA' },
  content: { alignItems: 'center' },
  nav: { width: '92%', maxWidth: 980, minHeight: 64, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#E8EAF0' },
  brandLink: { textDecorationLine: 'none' },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  brandMark: { width: 22, height: 22, borderRadius: 7, backgroundColor: '#5C6BC0', alignItems: 'center', justifyContent: 'center' },
  brandText: { fontFamily: 'Outfit_600SemiBold', fontSize: 19, color: '#37474F' },
  dot: { color: '#5C6BC0' },
  navLinks: { flexDirection: 'row', gap: 22 },
  navLink: { color: '#90A4AE', fontSize: 13, textDecorationLine: 'none' },
  hero: { width: '92%', maxWidth: 980, paddingTop: 72, paddingBottom: 42 },
  eyebrow: { color: '#5C6BC0', fontSize: 12, letterSpacing: 1.4, fontWeight: '700', marginBottom: 14 },
  title: { color: '#37474F', fontSize: 44, lineHeight: 54, fontWeight: '700', marginBottom: 18 },
  lead: { color: '#90A4AE', fontSize: 16, lineHeight: 30, maxWidth: 720 },
  updated: { color: '#B0BEC5', fontSize: 13, marginTop: 20 },
  document: { width: '92%', maxWidth: 980, backgroundColor: '#fff', borderWidth: 1, borderColor: '#E8EAF0', borderRadius: 8, paddingHorizontal: 36, paddingVertical: 34 },
  section: { paddingVertical: 20, borderBottomWidth: 1, borderBottomColor: '#F0F0F8' },
  sectionTitle: { color: '#37474F', fontSize: 20, lineHeight: 30, fontWeight: '700', marginBottom: 12 },
  paragraph: { color: '#546E7A', fontSize: 14, lineHeight: 27, marginBottom: 10 },
  itemRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  bullet: { color: '#5C6BC0', fontSize: 14, lineHeight: 26 },
  itemText: { flex: 1, color: '#546E7A', fontSize: 14, lineHeight: 26 },
  footer: { width: '92%', maxWidth: 980, paddingVertical: 24, flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 },
  footerText: { color: '#B0BEC5', fontSize: 12 },
  footerLink: { color: '#90A4AE', fontSize: 12, textDecorationLine: 'none' },
});
