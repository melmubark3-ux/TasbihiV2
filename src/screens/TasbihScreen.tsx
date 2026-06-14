import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  TextInput,
  SectionList,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────

interface TasbihItem {
  id: string;
  arabic: string;
  transliteration: string;
  target: number;
  category: string;
}

// ─────────────────────────────────────────────────
// Data
// ─────────────────────────────────────────────────

const TASBIH_SECTIONS: { title: string; data: TasbihItem[] }[] = [
  {
    title: 'تسبيحات الصلاة',
    data: [
      { id: 's1', arabic: 'سُبْحَانَ اللَّهِ', transliteration: 'Subhan Allah', target: 33, category: 'تسبيحات الصلاة' },
      { id: 's2', arabic: 'الْحَمْدُ لِلَّهِ', transliteration: 'Alhamdulillah', target: 33, category: 'تسبيحات الصلاة' },
      { id: 's3', arabic: 'اللَّهُ أَكْبَرُ', transliteration: 'Allahu Akbar', target: 34, category: 'تسبيحات الصلاة' },
    ],
  },
  {
    title: 'أذكار عامة',
    data: [
      { id: 'g1', arabic: 'لَا إِلَهَ إِلَّا اللَّهُ', transliteration: 'La ilaha illallah', target: 100, category: 'أذكار عامة' },
      { id: 'g2', arabic: 'أَسْتَغْفِرُ اللَّهَ', transliteration: 'Astaghfirullah', target: 100, category: 'أذكار عامة' },
      { id: 'g3', arabic: 'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ', transliteration: 'Subhan Allah wa bihamdih', target: 100, category: 'أذكار عامة' },
      { id: 'g4', arabic: 'سُبْحَانَ اللَّهِ الْعَظِيمِ', transliteration: 'Subhan Allah al-`Azeem', target: 33, category: 'أذكار عامة' },
    ],
  },
  {
    title: 'أدعية',
    data: [
      { id: 'd1', arabic: 'رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً', transliteration: 'Rabbana atina fid-dunya hasanah', target: 7, category: 'أدعية' },
      { id: 'd2', arabic: 'لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ', transliteration: 'La hawla wa la quwwata illa billah', target: 100, category: 'أدعية' },
      { id: 'd3', arabic: 'رَبِّ اغْفِرْ لِي وَارْحَمْنِي', transliteration: 'Rabbi-ghfir li warhamni', target: 7, category: 'أدعية' },
      { id: 'd4', arabic: 'اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ', transliteration: 'Allahumma salli `ala Muhammad', target: 100, category: 'أدعية' },
    ],
  },
  {
    title: 'استغفار',
    data: [
      { id: 'st1', arabic: 'أَسْتَغْفِرُ اللَّهَ الْعَظِيمَ', transliteration: 'Astaghfirullah al-`Azeem', target: 100, category: 'استغفار' },
      { id: 'st2', arabic: 'سَيِّدُ الِاسْتِغْفَارِ', transliteration: 'Sayyid al-Istighfar', target: 1, category: 'استغفار' },
      { id: 'st3', arabic: 'رَبِّ إِنِّي ظَلَمْتُ نَفْسِي فَاغْفِرْ لِي', transliteration: 'Rabbi inni zalamtu nafsi faghfir li', target: 7, category: 'استغفار' },
    ],
  },
];

// ─────────────────────────────────────────────────
// TasbihScreen Component
// ─────────────────────────────────────────────────

const TasbihScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [search, setSearch] = useState('');

  // Filter sections based on search
  const filteredSections = useMemo(() => {
    if (!search.trim()) return TASBIH_SECTIONS;
    const q = search.trim().toLowerCase();
    return TASBIH_SECTIONS.map((section) => ({
      ...section,
      data: section.data.filter(
        (item) =>
          item.arabic.includes(q) ||
          item.transliteration.toLowerCase().includes(q),
      ),
    })).filter((s) => s.data.length > 0);
  }, [search]);

  const selectTasbih = (item: TasbihItem) => {
    // Save the selected ID to AsyncStorage and navigate back
    navigation.navigate('HomeScreen', { selectedId: item.id });
  };

  const renderSectionHeader = ({ section }: { section: { title: string } }) => (
    <View style={styles.sectionHeader}>
      <Icon name="bookmark-outline" size={16} color="#D4AF37" />
      <Text style={styles.sectionTitle}>{section.title}</Text>
    </View>
  );

  const renderItem = ({ item }: { item: TasbihItem }) => (
    <TouchableOpacity
      style={styles.itemCard}
      activeOpacity={0.7}
      onPress={() => selectTasbih(item)}
    >
      <View style={styles.itemContent}>
        <Text style={styles.itemArabic}>{item.arabic}</Text>
        <Text style={styles.itemTranslit}>{item.transliteration}</Text>
      </View>
      <View style={styles.itemMeta}>
        <Icon name="target" size={14} color="#81C784" />
        <Text style={styles.itemTarget}>{item.target.toLocaleString('ar-SA')}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* ─── Header ─── */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Icon name="arrow-right" size={24} color="#D4AF37" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>اختر تسبيحاً</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* ─── Search Bar ─── */}
        <View style={styles.searchContainer}>
          <Icon name="magnify" size={20} color="#81C784" />
          <TextInput
            style={styles.searchInput}
            placeholder="ابحث عن تسبيحة..."
            placeholderTextColor="#558B2F"
            value={search}
            onChangeText={setSearch}
            textAlign="right"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Icon name="close-circle" size={18} color="#81C784" />
            </TouchableOpacity>
          )}
        </View>

        {/* ─── List ─── */}
        <SectionList
          sections={filteredSections}
          keyExtractor={(item) => item.id}
          renderSectionHeader={renderSectionHeader}
          renderItem={renderItem}
          stickySectionHeadersEnabled={false}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Icon name="file-search-outline" size={48} color="#1B3A1D" />
              <Text style={styles.emptyText}>لا توجد نتائج</Text>
            </View>
          }
        />
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
    paddingHorizontal: 20,
    paddingTop: 8,
  },

  // ── Header ──
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  backBtn: {
    padding: 6,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#D4AF37',
    textAlign: 'center',
  },

  // ── Search ──
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1B3A1D',
    borderRadius: 16,
    paddingHorizontal: 14,
    height: 46,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#D4AF3722',
  },
  searchInput: {
    flex: 1,
    color: '#E8F5E9',
    fontSize: 15,
    marginHorizontal: 8,
    paddingVertical: 0,
  },

  // ── Section ──
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
    marginTop: 8,
  },
  sectionTitle: {
    color: '#D4AF37',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
  },

  // ── Item ──
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1B3A1D',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#D4AF3718',
  },
  itemContent: {
    flex: 1,
  },
  itemArabic: {
    fontSize: 18,
    fontWeight: '600',
    color: '#E8F5E9',
    marginBottom: 4,
  },
  itemTranslit: {
    fontSize: 12,
    color: '#81C784',
    fontStyle: 'italic',
  },
  itemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0D1B0E',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  itemTarget: {
    color: '#A5D6A7',
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 4,
  },

  // ── List ──
  listContent: {
    paddingBottom: 40,
  },

  // ── Empty ──
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    color: '#558B2F',
    fontSize: 16,
    marginTop: 12,
  },
});

export default TasbihScreen;
