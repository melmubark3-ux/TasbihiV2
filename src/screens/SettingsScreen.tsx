import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TextInput,
  TouchableOpacity,
  Platform,
  Alert,
  I18nManager,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Slider from '@react-native-community/slider';
import { Picker } from '@react-native-picker/picker';

// --- Types ---
interface AppSettings {
  /** Prayer calculation method */
  calculationMethod: string;
  /** Notifications enabled */
  notificationsEnabled: boolean;
  /** Adhan sound file name */
  adhanSound: string;
  /** Microphone sensitivity 0-100 */
  micSensitivity: number;
  /** Daily tasbih goal */
  dailyGoal: number;
  /** Manually set city (empty = auto) */
  manualCity: string;
  /** RTL enabled */
  rtl: boolean;
}

// --- Constants ---
const STORAGE_KEY = '@tasbihi_settings';

const CALCULATION_METHODS = [
  { id: 'MWL', label: 'رابطة العالم الإسلامي' },
  { id: 'ISNA', label: 'الجمعية الإسلامية لأمريكا الشمالية' },
  { id: 'Egypt', label: 'الهيئة المصرية العامة للمساحة' },
  { id: 'Makkah', label: 'أم القرى (مكة المكرمة)' },
  { id: 'Karachi', label: 'جامعة العلوم الإسلامية بكراتشي' },
  { id: 'Tehran', label: 'معهد الجيوفيزياء بجامعة طهران' },
  { id: 'Jafari', label: 'الجعفري (شيعة اثنا عشرية)' },
  { id: 'Dubai', label: 'دبي' },
  { id: 'Kuwait', label: 'الكويت' },
  { id: 'Qatar', label: 'قطر' },
  { id: 'MuslimWorldLeague', label: 'رابطة العالم الإسلامي (محدث)' },
  { id: 'Singapore', label: 'سنغافورة' },
  { id: 'Turkey', label: 'تركيا' },
];

const ADHAN_SOUNDS = [
  { id: 'default', label: 'أذان افتراضي' },
  { id: 'makkah', label: 'أذان مكة المكرمة' },
  { id: 'madinah', label: 'أذان المدينة المنورة' },
  { id: 'mishary', label: 'مشاري العفاسي' },
  { id: 'sudais', label: 'عبد الرحمن السديس' },
  { id: 'shuraym', label: 'سعود الشريم' },
  { id: 'husary', label: 'محمود خليل الحصري' },
  { id: 'basit', label: 'عبد الباسط عبد الصمد' },
  { id: 'minshawi', label: 'محمد صديق المنشاوي' },
];

const DAILY_GOAL_PRESETS = [33, 100, 500, 1000, 5000];

// --- Default Settings ---
const DEFAULT_SETTINGS: AppSettings = {
  calculationMethod: 'MWL',
  notificationsEnabled: true,
  adhanSound: 'default',
  micSensitivity: 70,
  dailyGoal: 33,
  manualCity: '',
  rtl: true,
};

// --- Section Header ---
function SectionHeader({ title, icon }: { title: string; icon?: string }) {
  return (
    <View style={sectionStyles.header}>
      {icon && (
        <Icon name={icon} size={20} color={COLORS.primary} style={sectionStyles.icon} />
      )}
      <Text style={sectionStyles.title}>{title}</Text>
    </View>
  );
}

const sectionStyles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    marginTop: 16,
    paddingHorizontal: 2,
  },
  icon: {
    marginRight: 8,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.primary,
  },
});

// --- Setting Row ---
interface SettingRowProps {
  label: string;
  description?: string;
  children: React.ReactNode;
}

function SettingRow({ label, description, children }: SettingRowProps) {
  return (
    <View style={rowStyles.container}>
      <View style={rowStyles.labelContainer}>
        <Text style={rowStyles.label}>{label}</Text>
        {description ? (
          <Text style={rowStyles.description}>{description}</Text>
        ) : null}
      </View>
      <View style={rowStyles.control}>{children}</View>
    </View>
  );
}

const rowStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
  },
  labelContainer: {
    flex: 1,
    marginRight: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  description: {
    fontSize: 12,
    color: COLORS.muted,
    marginTop: 2,
  },
  control: {
    minWidth: 80,
    alignItems: 'flex-end',
  },
});

// --- Picker Modal Wrapper ---
function PickerRow({
  label,
  description,
  selectedValue,
  items,
  onValueChange,
}: {
  label: string;
  description?: string;
  selectedValue: string;
  items: { id: string; label: string }[];
  onValueChange: (value: string) => void;
}) {
  return (
    <SettingRow label={label} description={description}>
      <View style={pickerStyles.wrapper}>
        <Picker
          selectedValue={selectedValue}
          onValueChange={onValueChange}
          style={pickerStyles.picker}
          dropdownIconColor={COLORS.primary}
        >
          {items.map((item) => (
            <Picker.Item key={item.id} label={item.label} value={item.id} />
          ))}
        </Picker>
      </View>
    </SettingRow>
  );
}

const pickerStyles = StyleSheet.create({
  wrapper: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#FAFAFA',
    minWidth: 100,
  },
  picker: {
    height: Platform.OS === 'ios' ? 120 : 48,
    width: 140,
    color: COLORS.textPrimary,
  },
});

// --- Colors ---
const COLORS = {
  primary: '#1B5E20',
  primaryLight: '#388E3C',
  accent: '#FFC107',
  surface: '#FFFFFF',
  background: '#F5F5F0',
  textPrimary: '#212121',
  textSecondary: '#616161',
  muted: '#9E9E9E',
  danger: '#D32F2F',
};

// --- Main Screen ---
function SettingsScreen() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Load settings
  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as Partial<AppSettings>;
          setSettings({ ...DEFAULT_SETTINGS, ...parsed });
        }
      } catch (error) {
        console.error('[Settings] Load error:', error);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Save settings helper
  const saveSettings = useCallback(
    async (updated: AppSettings) => {
      try {
        setSaving(true);
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        setSettings(updated);
      } catch (error) {
        Alert.alert('خطأ', 'فشل حفظ الإعدادات');
        console.error('[Settings] Save error:', error);
      } finally {
        setSaving(false);
      }
    },
    [],
  );

  // Handlers
  const updateSetting = useCallback(
    <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
      const updated = { ...settings, [key]: value };
      saveSettings(updated);

      // If RTL changed, prompt to restart
      if (key === 'rtl' && value !== settings.rtl) {
        Alert.alert(
          'تغيير اتجاه الواجهة',
          'سيتطلب التغيير إعادة تشغيل التطبيق. هل تريد المتابعة؟',
          [
            { text: 'إلغاء', style: 'cancel', onPress: () => saveSettings(settings) },
            {
              text: 'موافق',
              onPress: () => {
                I18nManager.allowRTL(value as boolean);
                I18nManager.forceRTL(value as boolean);
              },
            },
          ],
        );
      }

      // If city changed, could trigger prayer times recalculation
      if (key === 'manualCity') {
        // Future: emit event for PrayerTimesScreen to recalc
      }
    },
    [settings, saveSettings],
  );

  if (loading) {
    return (
      <View style={loadingStyles.container}>
        <Text style={loadingStyles.text}>جاري تحميل الإعدادات...</Text>
      </View>
    );
  }

  return (
    <View style={screenStyles.container}>
      {/* Header */}
      <View style={screenStyles.header}>
        <Text style={screenStyles.headerTitle}>⚙️ الإعدادات</Text>
        <Text style={screenStyles.headerSubtitle}>خصّص التطبيق حسب رغبتك</Text>
      </View>

      <ScrollView
        style={screenStyles.scroll}
        contentContainerStyle={screenStyles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Prayer Calculation Method */}
        <SectionHeader title="أوقات الصلاة" icon="access-time" />
        <PickerRow
          label="طريقة الحساب"
          description="اختر طريقة حساب أوقات الصلاة"
          selectedValue={settings.calculationMethod}
          items={CALCULATION_METHODS}
          onValueChange={(value) => updateSetting('calculationMethod', value)}
        />

        <SettingRow
          label="المدينة"
          description="أدخل اسم المدينة يدوياً (اترك فارغاً للتحديد التلقائي)"
        >
          <TextInput
            style={inputStyles.textInput}
            value={settings.manualCity}
            onChangeText={(text) => updateSetting('manualCity', text)}
            placeholder="مثال: مكة المكرمة"
            placeholderTextColor={COLORS.muted}
            textAlign="right"
            autoCorrect={false}
          />
        </SettingRow>

        {/* Notifications */}
        <SectionHeader title="الإشعارات" icon="notifications" />
        <SettingRow
          label="تفعيل الإشعارات"
          description="تذكير بأوقات الصلاة والأذكار"
        >
          <Switch
            value={settings.notificationsEnabled}
            onValueChange={(value) => updateSetting('notificationsEnabled', value)}
            trackColor={{ false: '#D1D1D1', true: '#A5D6A7' }}
            thumbColor={settings.notificationsEnabled ? COLORS.primary : '#F4F4F4'}
          />
        </SettingRow>

        {/* Adhan Sound */}
        <PickerRow
          label="صوت الأذان"
          description="اختر صوت الأذان المفضل"
          selectedValue={settings.adhanSound}
          items={ADHAN_SOUNDS}
          onValueChange={(value) => updateSetting('adhanSound', value)}
        />

        {/* Microphone Sensitivity */}
        <SectionHeader title="الميكروفون" icon="mic" />
        <SettingRow
          label="حساسية الميكروفون"
          description={'مستوى الحساسية: ' + settings.micSensitivity + '%'}
        >
          <View style={sliderStyles.container}>
            <Slider
              style={sliderStyles.slider}
              minimumValue={0}
              maximumValue={100}
              step={5}
              value={settings.micSensitivity}
              onSlidingComplete={(value) => updateSetting('micSensitivity', Math.round(value))}
              minimumTrackTintColor={COLORS.primary}
              maximumTrackTintColor="#E0E0E0"
              thumbTintColor={COLORS.primary}
            />
            <Text style={sliderStyles.value}>{settings.micSensitivity}%</Text>
          </View>
        </SettingRow>

        {/* Daily Goal */}
        <SectionHeader title="الهدف اليومي" icon="flag" />
        <SettingRow
          label="الهدف اليومي للتسبيح"
          description={'الهدف الحالي: ' + settings.dailyGoal.toLocaleString('ar-SA') + ' تسبيحة'}
        >
          <View style={goalStyles.container}>
            <TextInput
              style={[inputStyles.textInput, goalStyles.input]}
              value={String(settings.dailyGoal)}
              onChangeText={(text) => {
                const num = parseInt(text, 10);
                if (!isNaN(num) && num > 0) {
                  updateSetting('dailyGoal', num);
                }
              }}
              keyboardType="number-pad"
              textAlign="center"
            />
          </View>
        </SettingRow>
        <View style={goalPresetStyles.container}>
          {DAILY_GOAL_PRESETS.map((preset) => (
            <TouchableOpacity
              key={preset}
              style={[
                goalPresetStyles.chip,
                settings.dailyGoal === preset && goalPresetStyles.chipActive,
              ]}
              onPress={() => updateSetting('dailyGoal', preset)}
            >
              <Text
                style={[
                  goalPresetStyles.chipText,
                  settings.dailyGoal === preset && goalPresetStyles.chipTextActive,
                ]}
              >
                {preset.toLocaleString('ar-SA')}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* RTL */}
        <SectionHeader title="الواجهة" icon="palette" />
        <SettingRow
          label="دعم الكتابة من اليمين (RTL)"
          description={settings.rtl ? 'مفعل' : 'معطل'}
        >
          <Switch
            value={settings.rtl}
            onValueChange={(value) => updateSetting('rtl', value)}
            trackColor={{ false: '#D1D1D1', true: '#A5D6A7' }}
            thumbColor={settings.rtl ? COLORS.primary : '#F4F4F4'}
          />
        </SettingRow>

        {/* Reset */}
        <View style={resetStyles.container}>
          <TouchableOpacity
            style={resetStyles.button}
            onPress={() => {
              Alert.alert(
                'إعادة ضبط الإعدادات',
                'هل أنت متأكد؟ سيتم إعادة جميع الإعدادات إلى الوضع الافتراضي.',
                [
                  { text: 'إلغاء', style: 'cancel' },
                  {
                    text: 'إعادة ضبط',
                    style: 'destructive',
                    onPress: () => saveSettings(DEFAULT_SETTINGS),
                  },
                ],
              );
            }}
          >
            <Icon name="restore" size={20} color={COLORS.danger} />
            <Text style={resetStyles.text}>إعادة ضبط الإعدادات</Text>
          </TouchableOpacity>
        </View>

        {/* App Info */}
        <View style={infoStyles.container}>
          <Text style={infoStyles.text}>تسبيحي v1.0.0</Text>
          <Text style={infoStyles.text}>تطبيق تسبيح وأذكار وأوقات صلاة</Text>
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

// --- Local Styles ---
const screenStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    backgroundColor: COLORS.primary,
    paddingTop: Platform.OS === 'ios' ? 56 : 16,
    paddingBottom: 16,
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
});

const inputStyles = StyleSheet.create({
  textInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 14,
    color: COLORS.textPrimary,
    backgroundColor: '#FAFAFA',
    minWidth: 120,
    textAlign: 'right',
  },
});

const sliderStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 160,
  },
  slider: {
    flex: 1,
    height: 40,
  },
  value: {
    fontSize: 12,
    color: COLORS.muted,
    minWidth: 36,
    textAlign: 'center',
  },
});

const goalStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    minWidth: 80,
  },
});

const goalPresetStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
    justifyContent: 'flex-end',
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#E8F5E9',
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },
  chipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  chipText: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '600',
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
});

const resetStyles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginTop: 16,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.danger,
  },
  text: {
    fontSize: 14,
    color: COLORS.danger,
    fontWeight: '600',
    marginLeft: 8,
  },
});

const infoStyles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginTop: 24,
  },
  text: {
    fontSize: 12,
    color: COLORS.muted,
  },
});

const loadingStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  text: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
});

export default SettingsScreen;
