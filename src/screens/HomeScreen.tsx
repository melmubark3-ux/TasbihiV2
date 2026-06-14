import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Animated,
  Alert,
  Vibration,
} from 'react-native';
import Voice from '@react-native-voice/voice';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

// ─────────────────────────────────────────────────
// Types & Constants
// ─────────────────────────────────────────────────

interface Tasbih {
  id: string;
  label: string;
  count: number;
  target: number;
}

const DEFAULT_TASBIHAT: Tasbih[] = [
  { id: '1', label: 'سُبْحَانَ اللَّهِ', count: 0, target: 33 },
  { id: '2', label: 'الْحَمْدُ لِلَّهِ', count: 0, target: 33 },
  { id: '3', label: 'اللَّهُ أَكْبَرُ', count: 0, target: 34 },
  { id: '4', label: 'لَا إِلَهَ إِلَّا اللَّهُ', count: 0, target: 100 },
  { id: '5', label: 'أَسْتَغْفِرُ اللَّهَ', count: 0, target: 100 },
  { id: '6', label: 'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ', count: 0, target: 100 },
  { id: '7', label: 'سُبْحَانَ اللَّهِ الْعَظِيمِ', count: 0, target: 33 },
  { id: '8', label: 'لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ', count: 0, target: 100 },
];

const STORAGE_KEY = '@tasbihi_state';

// ─────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────

const loadState = async (): Promise<{ selectedId: string; tasbihat: Tasbih[] } | null> => {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
};

const saveState = async (selectedId: string, tasbihat: Tasbih[]) => {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ selectedId, tasbihat }));
  } catch {}
};

// ─────────────────────────────────────────────────
// HomeScreen Component
// ─────────────────────────────────────────────────

const HomeScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [tasbihat, setTasbihat] = useState<Tasbih[]>(DEFAULT_TASBIHAT);
  const [selectedId, setSelectedId] = useState<string>('1');
  const [voiceActive, setVoiceActive] = useState(false);
  const [lastPhrase, setLastPhrase] = useState<string>('');
  const [listening, setListening] = useState(false);

  // Animations
  const pulseAnim = React.useRef(new Animated.Value(1)).current;
  const progressAnim = React.useRef(new Animated.Value(0)).current;

  // ── Current tasbih ──
  const currentTasbih = tasbihat.find((t) => t.id === selectedId) ?? tasbihat[0];
  const progress = currentTasbih.target > 0 ? currentTasbih.count / currentTasbih.target : 0;
  const dailyTotal = tasbihat.reduce((s, t) => s + t.count, 0);

  // ── Persist on change ──
  useEffect(() => {
    saveState(selectedId, tasbihat);
  }, [selectedId, tasbihat]);

  // ── Restore persisted state ──
  useEffect(() => {
    (async () => {
      const saved = await loadState();
      if (saved) {
        setSelectedId(saved.selectedId);
        setTasbihat(saved.tasbihat);
      }
    })();
  }, []);

  // ── Listen for route params (coming from TasbihScreen) ──
  useEffect(() => {
    const unsub = navigation.addListener('focus', () => {
      const params = navigation.getState()?.routes?.slice(-1)[0]?.params;
      if (params?.selectedId) {
        setSelectedId(params.selectedId);
        navigation.setParams({ selectedId: undefined });
      }
    });
    return unsub;
  }, [navigation]);

  // ── Animate progress bar ──
  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: progress,
      duration: 400,
      useNativeDriver: false,
    }).start();
  }, [progress, progressAnim]);

  // ── Voice recognition setup ──
  useEffect(() => {
    Voice.onSpeechResults = (e: any) => {
      const text = e.value?.[0] ?? '';
      handleVoiceMatch(text);
    };
    Voice.onSpeechError = () => setListening(false);
    Voice.onSpeechEnd = () => setListening(false);
    return () => {
      Voice.destroy().then(Voice.removeAllListeners);
    };
  }, []);

  const handleVoiceMatch = (text: string) => {
    const normalized = text.trim();
    if (!normalized) return;

    // Try to match the spoken phrase against current tasbih
    const match = tasbihat.find((t) => normalized.includes(t.label));
    if (match) {
      setLastPhrase(match.label);
      incrementCount(match.id);
    }
  };

  // ── Manual increment ──
  const incrementCount = (id: string) => {
    setTasbihat((prev) =>
      prev.map((t) =>
        t.id === id ? { ...t, count: t.count + 1 } : t,
      ),
    );
    // Pulse animation
    Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 1.08, duration: 80, useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 1, duration: 80, useNativeDriver: true }),
    ]).start();
    Vibration.vibrate(30);
  };

  // ── Toggle voice mode ──
  const toggleVoice = async () => {
    try {
      if (listening) {
        await Voice.stop();
        setListening(false);
        setVoiceActive(false);
      } else {
        await Voice.start('ar-SA');
        setListening(true);
        setVoiceActive(true);
      }
    } catch {
      Alert.alert('خطأ', 'تعذر بدء التعرف الصوتي');
    }
  };

  // ── Reset current tasbih ──
  const resetCurrent = () => {
    Alert.alert('إعادة تعيين', `إعادة تعيين "${currentTasbih.label}"؟`, [
      { text: 'إلغاء', style: 'cancel' },
      {
        text: 'نعم',
        onPress: () =>
          setTasbihat((prev) =>
            prev.map((t) => (t.id === selectedId ? { ...t, count: 0 } : t)),
          ),
      },
    ]);
  };

  // ── Render ──
  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* ─── Header ─── */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>🌙 تسبيحي</Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('TasbihScreen')}
            style={styles.switchBtn}
          >
            <Icon name="swap-horizontal-bold" size={22} color="#D4AF37" />
            <Text style={styles.switchBtnText}>تغيير</Text>
          </TouchableOpacity>
        </View>

        {/* ─── Daily Total ─── */}
        <View style={styles.dailyRow}>
          <Icon name="star-four-points" size={16} color="#D4AF37" />
          <Text style={styles.dailyLabel}>المجموع اليومي</Text>
          <Text style={styles.dailyCount}>{dailyTotal.toLocaleString('ar-SA')}</Text>
        </View>

        {/* ─── Current Tasbih Label ─── */}
        <View style={styles.tasbihLabelWrapper}>
          <Text style={styles.tasbihLabel}>{currentTasbih.label}</Text>
          <Text style={styles.targetHint}>
            الهدف: {currentTasbih.target.toLocaleString('ar-SA')}
          </Text>
        </View>

        {/* ─── Counter Circle ─── */}
        <TouchableOpacity activeOpacity={0.75} onPress={() => incrementCount(selectedId)}>
          <Animated.View style={[styles.counterCircle, { transform: [{ scale: pulseAnim }] }]}>
            <Text style={styles.counterNumber}>
              {currentTasbih.count.toLocaleString('ar-SA')}
            </Text>
            <Text style={styles.counterUnit}>مرة</Text>
          </Animated.View>
        </TouchableOpacity>

        {/* ─── Progress Bar ─── */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBg}>
            <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
          </View>
          <Text style={styles.progressText}>
            {Math.round(progress * 100)}%
          </Text>
        </View>

        {/* ─── Action Buttons ─── */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.actionBtn, voiceActive && styles.actionBtnActive]}
            onPress={toggleVoice}
          >
            <Icon
              name={listening ? 'microphone' : 'microphone-outline'}
              size={28}
              color={voiceActive ? '#fff' : '#D4AF37'}
            />
            <Text style={[styles.actionBtnText, voiceActive && styles.actionBtnTextActive]}>
              {listening ? 'استماع...' : 'صوتي'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: '#2E7D3222' }]}
            onPress={resetCurrent}
          >
            <Icon name="refresh" size={24} color="#D4AF37" />
            <Text style={styles.actionBtnText}>إعادة</Text>
          </TouchableOpacity>
        </View>

        {/* ─── Last Detected Phrase ─── */}
        {lastPhrase ? (
          <View style={styles.lastPhraseWrapper}>
            <Icon name="message-text-outline" size={14} color="#A5D6A7" />
            <Text style={styles.lastPhraseLabel}>آخر تسبيحة: </Text>
            <Text style={styles.lastPhrase}>{lastPhrase}</Text>
          </View>
        ) : null}

        {/* ─── Voice indicator ─── */}
        {listening && (
          <View style={styles.voiceIndicator}>
            <Icon name="waveform" size={18} color="#fff" />
            <Text style={styles.voiceIndicatorText}>يستمع...</Text>
          </View>
        )}
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
    alignItems: 'center',
    paddingTop: 16,
    paddingHorizontal: 20,
  },

  // ── Header ──
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#D4AF37',
    letterSpacing: 1,
  },
  switchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1B3A1D',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#D4AF3744',
  },
  switchBtnText: {
    color: '#D4AF37',
    fontSize: 13,
    marginLeft: 4,
    fontWeight: '600',
  },

  // ── Daily total ──
  dailyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1B3A1D',
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: 20,
    marginBottom: 28,
  },
  dailyLabel: {
    color: '#A5D6A7',
    fontSize: 14,
    marginHorizontal: 8,
  },
  dailyCount: {
    color: '#D4AF37',
    fontSize: 18,
    fontWeight: '700',
  },

  // ── Tasbih label ──
  tasbihLabelWrapper: {
    alignItems: 'center',
    marginBottom: 12,
  },
  tasbihLabel: {
    fontSize: 26,
    fontWeight: '600',
    color: '#E8F5E9',
    textAlign: 'center',
  },
  targetHint: {
    fontSize: 13,
    color: '#81C784',
    marginTop: 4,
  },

  // ── Counter ──
  counterCircle: {
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: '#1B3A1D',
    borderWidth: 4,
    borderColor: '#D4AF37',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 24,
    // shadow
    shadowColor: '#D4AF37',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  counterNumber: {
    fontSize: 52,
    fontWeight: '800',
    color: '#D4AF37',
  },
  counterUnit: {
    fontSize: 14,
    color: '#A5D6A7',
    marginTop: 4,
  },

  // ── Progress ──
  progressContainer: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 28,
  },
  progressBg: {
    flex: 1,
    height: 10,
    backgroundColor: '#1B3A1D',
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#D4AF37',
    borderRadius: 5,
  },
  progressText: {
    color: '#D4AF37',
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 10,
    minWidth: 40,
    textAlign: 'right',
  },

  // ── Actions ──
  actionRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 24,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 30,
    backgroundColor: '#1B3A1D',
    borderWidth: 1,
    borderColor: '#D4AF3744',
    minWidth: 120,
  },
  actionBtnActive: {
    backgroundColor: '#2E7D32',
    borderColor: '#D4AF37',
  },
  actionBtnText: {
    color: '#D4AF37',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  actionBtnTextActive: {
    color: '#fff',
  },

  // ── Last phrase ──
  lastPhraseWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1B3A1D88',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 16,
    marginBottom: 12,
  },
  lastPhraseLabel: {
    color: '#81C784',
    fontSize: 12,
    marginLeft: 4,
  },
  lastPhrase: {
    color: '#E8F5E9',
    fontSize: 14,
    fontWeight: '500',
  },

  // ── Voice indicator ──
  voiceIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2E7D32',
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: 20,
  },
  voiceIndicatorText: {
    color: '#fff',
    fontSize: 13,
    marginLeft: 6,
  },
});

export default HomeScreen;
