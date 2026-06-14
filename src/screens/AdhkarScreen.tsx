import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  SectionList,
  TouchableOpacity,
  ScrollView,
  Animated,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

// ─────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────

interface Dhikr {
  id: string;
  arabic: string;
  transliteration: string;
  translation: string;
  count: number;
  category: 'morning' | 'evening' | 'prayer' | 'sleep';
}

interface Tab {
  key: Dhikr['category'];
  label: string;
  icon: string;
}

// ─────────────────────────────────────────────────
// Data
// ─────────────────────────────────────────────────

const TABS: Tab[] = [
  { key: 'morning', label: 'الصباح', icon: 'weather-sunny' },
  { key: 'evening', label: 'المساء', icon: 'weather-night' },
  { key: 'prayer', label: 'بعد الصلاة', icon: 'mosque' },
  { key: 'sleep', label: 'النوم', icon: 'sleep' },
];

const ALL_ADHKAR: Dhikr[] = [
  // ── Morning ──
  { id: 'm1', arabic: 'أَصْبَحْنَا وَأَصْبَحَ الْمُلْكُ لِلَّهِ', transliteration: 'Asbahna wa asbahal mulku lillah', translation: 'أصبحنا وأصبح الملك لله', count: 1, category: 'morning' },
  { id: 'm2', arabic: 'اللَّهُمَّ بِكَ أَصْبَحْنَا وَبِكَ أَمْسَيْنَا', transliteration: 'Allahumma bika asbahna wa bika amsayna', translation: 'اللهم بك أصبحنا وبك أمسينا', count: 1, category: 'morning' },
  { id: 'm3', arabic: 'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ', transliteration: 'Subhan Allah wa bihamdih', translation: 'سبحان الله وبحمده', count: 100, category: 'morning' },
  { id: 'm4', arabic: 'أَعُوذُ بِاللَّهِ السَّمِيعِ الْعَلِيمِ مِنَ الشَّيْطَانِ الرَّجِيمِ', transliteration: 'A\'udhu billahis samee\'il alim min ash-shaytanir rajeem', translation: 'أعوذ بالله السميع العليم من الشيطان الرجيم', count: 3, category: 'morning' },
  { id: 'm5', arabic: 'بِسْمِ اللَّهِ الَّذِي لَا يَضُرُّ مَعَ اسْمِهِ شَيْءٌ', transliteration: 'Bismillahilladhi la yadurru ma\'a ismihi shay\'', translation: 'بسم الله الذي لا يضر مع اسمه شيء', count: 3, category: 'morning' },
  { id: 'm6', arabic: 'رَضِيتُ بِاللَّهِ رَبًّا وَبِالْإِسْلَامِ دِينًا', transliteration: 'Radeetu billahi rabban wa bil-islami deenan', translation: 'رضيت بالله رباً وبالإسلام ديناً', count: 3, category: 'morning' },
  { id: 'm7', arabic: 'اللَّهُمَّ إِنِّي أَسْأَلُكَ الْعَافِيَةَ فِي الدُّنْيَا وَالْآخِرَةِ', transliteration: 'Allahumma inni as\'alukal \'afiyata fid-dunya wal-akhira', translation: 'اللهم إني أسألك العافية في الدنيا والآخرة', count: 1, category: 'morning' },

  // ── Evening ──
  { id: 'e1', arabic: 'أَمْسَيْنَا وَأَمْسَى الْمُلْكُ لِلَّهِ', transliteration: 'Amsayna wa amsal mulku lillah', translation: 'أمسينا وأمسى الملك لله', count: 1, category: 'evening' },
  { id: 'e2', arabic: 'اللَّهُمَّ بِكَ أَمْسَيْنَا وَبِكَ أَصْبَحْنَا', transliteration: 'Allahumma bika amsayna wa bika asbahna', translation: 'اللهم بك أمسينا وبك أصبحنا', count: 1, category: 'evening' },
  { id: 'e3', arabic: 'اللَّهُمَّ عَالِمَ الْغَيْبِ وَالشَّهَادَةِ', transliteration: 'Allahumma \'alimal ghaybi wash-shahadah', translation: 'اللهم عالم الغيب والشهادة', count: 1, category: 'evening' },
  { id: 'e4', arabic: 'أَمْسَيْنَا عَلَى فِطْرَةِ الْإِسْلَامِ', transliteration: 'Amsayna \'ala fitratil islam', translation: 'أمسينا على فطرة الإسلام', count: 1, category: 'evening' },
  { id: 'e5', arabic: 'سُبْحَانَ اللَّهِ الْعَظِيمِ وَبِحَمْدِهِ', transliteration: 'Subhan Allahil \'azeem wa bihamdih', translation: 'سبحان الله العظيم وبحمده', count: 100, category: 'evening' },

  // ── After Prayer ──
  { id: 'p1', arabic: 'أَسْتَغْفِرُ اللَّهَ (ثَلَاثًا)', transliteration: 'Astaghfirullah (3x)', translation: 'أستغفر الله', count: 3, category: 'prayer' },
  { id: 'p2', arabic: 'اللَّهُمَّ أَنْتَ السَّلَامُ وَمِنْكَ السَّلَامُ', transliteration: 'Allahumma antas salam wa minkas salam', translation: 'اللهم أنت السلام ومنك السلام', count: 1, category: 'prayer' },
  { id: 'p3', arabic: 'سُبْحَانَ اللَّهِ (33×)', transliteration: 'Subhan Allah (33x)', translation: 'سبحان الله', count: 33, category: 'prayer' },
  { id: 'p4', arabic: 'الْحَمْدُ لِلَّهِ (33×)', transliteration: 'Alhamdulillah (33x)', translation: 'الحمد لله', count: 33, category: 'prayer' },
  { id: 'p5', arabic: 'اللَّهُ أَكْبَرُ (34×)', transliteration: 'Allahu Akbar (34x)', translation: 'الله أكبر', count: 34, category: 'prayer' },
  { id: 'p6', arabic: 'لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ', transliteration: 'La ilaha illallah wahdahu la sharika lah', translation: 'لا إله إلا الله وحده لا شريك له', count: 1, category: 'prayer' },

  // ── Sleep ──
  { id: 'sl1', arabic: 'بِاسْمِكَ اللَّهُمَّ أَمُوتُ وَأَحْيَا', transliteration: 'Bismika Allahumma amootu wa ahya', translation: 'باسمك اللهم أموت وأحيا', count: 1, category: 'sleep' },
  { id: 'sl2', arabic: 'اللَّهُمَّ إِنِّي أَسْلَمْتُ نَفْسِي إِلَيْكَ', transliteration: 'Allahumma inni aslamtu nafsi ilayk', translation: 'اللهم إني أسلمت نفسي إليك', count: 1, category: 'sleep' },
  { id: 'sl3', arabic: 'سُبْحَانَ اللَّهِ (33×)', transliteration: 'Subhan Allah (33x)', translation: 'سبحان الله', count: 33, category: 'sleep' },
  { id: 'sl4', arabic: 'الْحَمْدُ لِلَّهِ (33×)', transliteration: 'Alhamdulillah (33x)', translation: 'الحمد لله', count: 33, category: 'sleep' },
  { id: 'sl5', arabic: 'اللَّهُ أَكْبَرُ (34×)', transliteration: 'Allahu Akbar (34x)', translation: 'الله أكبر', count: 34, category: 'sleep' },
  { id: 'sl6', arabic: 'آيَةُ الْكُرْسِيِّ', transliteration: 'Ayat al-Kursi', translation: 'آية الكرسي', count: 1, category: 'sleep' },
  { id: 'sl7', arabic: 'قُلْ هُوَ اللَّهُ أَحَدٌ', transliteration: 'Qul Huwallahu Ahad', translation: 'سورة الإخلاص', count: 3, category: 'sleep' },
  { id: 'sl8', arabic: 'قُلْ أَعُوذُ بِرَبِّ الْفَلَقِ', transliteration: 'Qul A\'udhu birabbil falaq', translation: 'سورة الفلق', count: 3, category: 'sleep' },
  { id: 'sl9', arabic: 'قُلْ أَعُوذُ بِرَبِّ النَّاسِ', transliteration: 'Qul A\'udhu birabbin nas', translation: 'سورة الناس', count: 3, category: 'sleep' },
];

// ─────────────────────────────────────────────────
// AdhkarScreen Component
// ─────────────────────────────────────────────────

const AdhkarScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [activeTab, setActiveTab] = useState<Dhikr['category']>('morning');
  const [listening, setListening] = useState(false);
  const [completedCount, setCompletedCount] = useState<Record<string, number>>({});

  // Get adhkar for active tab
  const currentAdhkar = useMemo(
    () => ALL_ADHKAR.filter((d) => d.category === activeTab),
    [activeTab],
  );

  // Calculate overall progress
  const totalDhikrCount = currentAdhkar.reduce((s, d) => s + d.count, 0);
  const completedDhikrCount = currentAdhkar.reduce(
    (s, d) => s + (completedCount[d.id] ?? 0),
    0,
  );
  const progressPct =
    totalDhikrCount > 0 ? Math.min(completedDhikrCount / totalDhikrCount, 1) : 0;

  // Mark a dhikr as read (increase count)
  const markRead = (id: string, maxCount: number) => {
    setCompletedCount((prev) => {
      const current = prev[id] ?? 0;
      if (current >= maxCount) return prev;
      return { ...prev, [id]: current + 1 };
    });
  };

  // Reset tab progress
  const resetProgress = () => {
    setCompletedCount({});
  };

  const renderDhikrItem = (item: Dhikr) => {
    const done = completedCount[item.id] ?? 0;
    const isComplete = done >= item.count;
    const subProgress = item.count > 0 ? done / item.count : 0;

    return (
      <TouchableOpacity
        key={item.id}
        style={[styles.dhikrCard, isComplete && styles.dhikrCardComplete]}
        activeOpacity={0.7}
        onPress={() => markRead(item.id, item.count)}
      >
        <View style={styles.dhikrHeader}>
          <View style={styles.countBadge}>
            <Icon name="counter" size={12} color="#D4AF37" />
            <Text style={styles.countBadgeText}>
              {done}/{item.count}
            </Text>
          </View>
          {isComplete && (
            <Icon name="check-circle" size={20} color="#4CAF50" />
          )}
        </View>

        <Text style={styles.dhikrArabic}>{item.arabic}</Text>
        <Text style={styles.dhikrTranslit}>{item.transliteration}</Text>
        <Text style={styles.dhikrTranslation}>{item.translation}</Text>

        {/* Mini progress */}
        <View style={styles.subProgressBg}>
          <View
            style={[
              styles.subProgressFill,
              { width: `${Math.round(subProgress * 100)}%` },
            ]}
          />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* ─── Header ─── */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>📿 الأذكار</Text>
          <TouchableOpacity onPress={resetProgress} style={styles.resetBtn}>
            <Icon name="refresh" size={18} color="#D4AF37" />
          </TouchableOpacity>
        </View>

        {/* ─── Overall Progress ─── */}
        <View style={styles.progressOverview}>
          <View style={styles.progressBarBg}>
            <View
              style={[
                styles.progressBarFill,
                { width: `${Math.round(progressPct * 100)}%` },
              ]}
            />
          </View>
          <Text style={styles.progressLabel}>
            {Math.round(progressPct * 100)}% تم
          </Text>
        </View>

        {/* ─── Tabs ─── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabContainer}
        >
          {TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[styles.tab, isActive && styles.tabActive]}
                onPress={() => setActiveTab(tab.key)}
              >
                <Icon
                  name={tab.icon}
                  size={18}
                  color={isActive ? '#0D1B0E' : '#D4AF37'}
                />
                <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* ─── Dhikr List ─── */}
        <ScrollView
          style={styles.listContainer}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        >
          {currentAdhkar.map(renderDhikrItem)}
        </ScrollView>

        {/* ─── Voice Mode Button ─── */}
        <TouchableOpacity
          style={[styles.voiceBtn, listening && styles.voiceBtnActive]}
          onPress={() => setListening(!listening)}
        >
          <Icon
            name={listening ? 'microphone' : 'microphone-outline'}
            size={22}
            color="#fff"
          />
          <Text style={styles.voiceBtnText}>
            {listening ? 'إيقاف الاستماع' : 'استمع للأذكار'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

// ─────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0D1B0E',
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
  },

  // ── Header ──
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#D4AF37',
  },
  resetBtn: {
    padding: 8,
    backgroundColor: '#1B3A1D',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D4AF3722',
  },

  // ── Progress ──
  progressOverview: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  progressBarBg: {
    flex: 1,
    height: 8,
    backgroundColor: '#1B3A1D',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#D4AF37',
    borderRadius: 4,
  },
  progressLabel: {
    color: '#D4AF37',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 10,
    minWidth: 40,
    textAlign: 'right',
  },

  // ── Tabs ──
  tabContainer: {
    flexDirection: 'row',
    gap: 10,
    paddingBottom: 12,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#1B3A1D',
    borderWidth: 1,
    borderColor: '#D4AF3722',
  },
  tabActive: {
    backgroundColor: '#D4AF37',
    borderColor: '#D4AF37',
  },
  tabText: {
    color: '#D4AF37',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  tabTextActive: {
    color: '#0D1B0E',
  },

  // ── List ──
  listContainer: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 90,
  },

  // ── Dhikr Card ──
  dhikrCard: {
    backgroundColor: '#1B3A1D',
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#D4AF3718',
  },
  dhikrCardComplete: {
    borderColor: '#4CAF5044',
    opacity: 0.85,
  },
  dhikrHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  countBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0D1B0E',
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  countBadgeText: {
    color: '#D4AF37',
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 4,
  },
  dhikrArabic: {
    fontSize: 20,
    fontWeight: '600',
    color: '#E8F5E9',
    textAlign: 'right',
    marginBottom: 6,
    lineHeight: 32,
  },
  dhikrTranslit: {
    fontSize: 13,
    color: '#81C784',
    fontStyle: 'italic',
    marginBottom: 4,
  },
  dhikrTranslation: {
    fontSize: 13,
    color: '#A5D6A7',
    marginBottom: 6,
  },
  subProgressBg: {
    height: 4,
    backgroundColor: '#0D1B0E',
    borderRadius: 2,
    overflow: 'hidden',
  },
  subProgressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 2,
  },

  // ── Voice Button ──
  voiceBtn: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2E7D32',
    paddingVertical: 14,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: '#D4AF3744',
  },
  voiceBtnActive: {
    backgroundColor: '#1B5E20',
    borderColor: '#D4AF37',
  },
  voiceBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    marginLeft: 8,
  },
});

export default AdhkarScreen;
