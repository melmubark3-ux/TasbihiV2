// ========================================
// أنواع تطبيق التسبيح والأذكار
// Tasbihi App - TypeScript Types & Interfaces
// ========================================

// ---------- التسبيحات ----------
export interface TasbihPhrase {
  id: string;
  text: string;
  category: TasbihCategory;
  recommendedCount: number;
  description: string;
  benefit?: string;
  arabicDescription?: string;
}

export type TasbihCategory =
  | 'تسبيح'
  | 'تحميد'
  | 'تهليل'
  | 'تكبير'
  | 'استغفار'
  | 'حوقلة'
  | 'صلاة على النبي'
  | 'تسبيح مركب'
  | 'جامع';

// ---------- الأذكار ----------
export interface AdhkarEntry {
  id: string;
  text: string;
  repeat: number;
  category: AdhkarCategory;
  time: AdhkarTime;
  virtue: string;
  source?: string;
  transliteration?: string;
}

export type AdhkarCategory =
  | 'أذكار الصباح'
  | 'أذكار المساء'
  | 'أذكار بعد الصلاة'
  | 'أذكار النوم'
  | 'أذكار الاستيقاظ'
  | 'أذكار عامة';

export type AdhkarTime = 'morning' | 'evening' | 'both' | 'general';

// ---------- أوقات الصلاة ----------
export type PrayerName =
  | 'الفجر'
  | 'الشروق'
  | 'الظهر'
  | 'العصر'
  | 'المغرب'
  | 'العشاء'
  | 'الفجر (الصبح)'
  | 'الظهر (الأولى)'
  | 'العصر (الثانية)'
  | 'المغرب (الثالثة)'
  | 'العشاء (الرابعة)';

export interface PrayerTime {
  name: PrayerName;
  time: string; // HH:mm format
  arabicName: string;
  isNext?: boolean;
  remaining?: string; // الوقت المتبقي
  icon?: string;
}

// ---------- المدينة والموقع ----------
export interface City {
  id: string;
  name: string;
  country: string;
  nameAr: string;
  countryAr: string;
  latitude: number;
  longitude: number;
  timezone: number;
  method: CalculationMethod;
}

export type CalculationMethod =
  | 'Egyptian'
  | 'UmmAlQura'
  | 'Kuwaiti'
  | 'Karachi'
  | 'MuslimWorldLeague'
  | 'Dubai'
  | 'MoonsightingCommittee'
  | 'ISNA'
  | 'Tehran'
  | 'Singapore'
  | 'Turkey'
  | 'Custom';

// ---------- الإحصائيات ----------
export interface TasbihStats {
  totalCount: number;
  todayCount: number;
  streakDays: number;
  lastSessionDate: string | null;
  totalSessions: number;
}

export interface DailyStats {
  date: string; // YYYY-MM-DD
  totalCount: number;
  phraseCounts: Record<string, number>; // id -> count
  sessionsCount: number;
  timeSpentMinutes: number;
}

export interface WeeklyStats {
  weekStart: string; // YYYY-MM-DD (Monday)
  totalCount: number;
  dailyCounts: DailyStats[];
  averagePerDay: number;
  bestDay: string | null;
  totalSessions: number;
}

export interface MonthlyStats {
  month: string; // YYYY-MM
  totalCount: number;
  weeklyCounts: WeeklyStats[];
  averagePerDay: number;
  totalSessions: number;
  bestDay: string | null;
  totalDaysActive: number;
}

export interface PhraseStats {
  phraseId: string;
  totalCount: number;
  todayCount: number;
  lastUsed: string | null;
}

// ---------- الإعدادات ----------
export interface AppSettings {
  theme: 'light' | 'dark' | 'auto' | 'sepia';
  language: 'ar' | 'en' | 'auto';
  fontSize: 'small' | 'medium' | 'large' | 'xlarge';
  tasbihSound: boolean;
  vibration: boolean;
  keepScreenOn: boolean;
  countAfterScreenOff: boolean;
  autoSave: boolean;
  showNotifications: boolean;
  notificationTime: string; // HH:mm
  morningAdhkarTime: string; // HH:mm
  eveningAdhkarTime: string; // HH:mm
  prayerNotifications: boolean;
  adhkarNotifications: boolean;
  tasbihCounterStyle: 'classic' | 'modern' | 'minimal' | 'threeD';
  showTasbihProgress: boolean;
  resetDailyStats: boolean;
  dataSync: boolean;
  backupEnabled: boolean;
  lastBackupDate: string | null;
  calculationMethod: CalculationMethod;
}

export const DEFAULT_APP_SETTINGS: AppSettings = {
  theme: 'auto',
  language: 'ar',
  fontSize: 'medium',
  tasbihSound: true,
  vibration: true,
  keepScreenOn: true,
  countAfterScreenOff: false,
  autoSave: true,
  showNotifications: true,
  notificationTime: '06:00',
  morningAdhkarTime: '06:00',
  eveningAdhkarTime: '17:00',
  prayerNotifications: true,
  adhkarNotifications: true,
  tasbihCounterStyle: 'classic',
  showTasbihProgress: true,
  resetDailyStats: true,
  dataSync: false,
  backupEnabled: false,
  lastBackupDate: null,
  calculationMethod: 'Egyptian',
};

// ---------- الصوت (Voice/VoiceOver) ----------
export interface VoiceState {
  isPlaying: boolean;
  currentPhraseId: string | null;
  currentIndex: number;
  totalPhrases: number;
  repeatRemaining: number;
  speed: 'slow' | 'normal' | 'fast';
  isPaused: boolean;
}

export type VoiceGender = 'male' | 'female';

export interface VoiceSettings {
  enabled: boolean;
  gender: VoiceGender;
  speed: number; // 0.5 - 2.0
  autoAdvance: boolean;
  pauseBetweenPhrases: number; // milliseconds
  autoRepeatAdhkar: boolean;
}

// ---------- الإشعارات ----------
export interface NotificationSchedule {
  id: string;
  title: string;
  body: string;
  type: 'adhkar_morning' | 'adhkar_evening' | 'prayer' | 'daily_goal' | 'streak' | 'weekly_report';
  scheduledTime: string; // HH:mm
  enabled: boolean;
  daysOfWeek?: number[]; // 0=Sunday, 1=Monday...
  prayerName?: PrayerName;
}

// ---------- الجلسة ----------
export interface TasbihSession {
  id: string;
  startTime: string; // ISO datetime
  endTime: string | null; // ISO datetime
  phraseId: string;
  phraseText: string;
  targetCount: number;
  achievedCount: number;
  isCompleted: boolean;
  duration?: number; // seconds
}

// ---------- التطبيق العام ----------
export interface AppState {
  isReady: boolean;
  isFirstLaunch: boolean;
  lastActiveDate: string | null;
  appVersion: string;
  buildNumber: number;
}

// ---------- العام (شامل) ----------
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// ---------- المصحف (إضافي للتوسعة) ----------
export interface Surah {
  id: number;
  name: string;
  nameAr: string;
  ayahCount: number;
  revelationType: 'meccan' | 'medinan';
  startPage: number;
  endPage: number;
}

export interface Ayah {
  surahId: number;
  ayahNumber: number;
  text: string;
  page: number;
  juz: number;
  sajda?: boolean;
}

// ---------- الرفيق الروحي ----------
export interface DailyQuote {
  id: string;
  text: string;
  source: string;
  category: 'quran' | 'hadith' | 'athar' | 'wisdom';
  bookmarked?: boolean;
}

// ---------- الأهداف ----------
export interface Goal {
  id: string;
  title: string;
  description?: string;
  type: 'daily_count' | 'daily_session' | 'streak_days' | 'weekly_count' | 'monthly_count';
  target: number;
  current: number;
  startDate: string; // ISO date
  endDate?: string; // ISO date
  isCompleted: boolean;
  isRecurring: boolean;
  category?: TasbihCategory;
}

// ---------- الإكسبورت ----------
export interface ExportData {
  version: string;
  exportDate: string; // ISO datetime
  settings: Partial<AppSettings>;
  stats: TasbihStats;
  dailyStats: DailyStats[];
  phraseStats: PhraseStats[];
  sessions: TasbihSession[];
  goals: Goal[];
}

// ---------- نوع بسيط للتعداد ----------
export type CounterType = 'button' | 'swipe' | 'tap' | 'mic' | 'shake';

export type ThemeMode = 'light' | 'dark' | 'auto' | 'sepia';

export type AppLanguage = 'ar' | 'en';
