/**
 * useTasbihCounter — Hook عداد التسبيح مع التخزين والإحصائيات
 * ==============================================================
 * يتكامل مع useVoiceRecognition
 * يخزن العداد في AsyncStorage
 * يحسب الإحصائيات: اليوم، الأسبوع، الشهر، المجموع الكلي
 * يدعم goals يومية
 */

import { useEffect, useCallback, useRef, useState, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TasbihPhrase } from '../services/VoiceService';
import { useVoiceRecognition, UseVoiceRecognitionOptions } from './useVoiceRecognition';

// ===================== أنواع البيانات =====================

/** إحصائيات يومية */
export interface DailyStats {
  /** التاريخ بصيغة YYYY-MM-DD */
  date: string;
  /** عدد التسبيحات في هذا اليوم */
  count: number;
  /** تفصيل حسب العبارة — map من phraseId → count */
  breakdown: Record<string, number>;
  /** هل تم تحقيق الهدف اليومي */
  goalAchieved: boolean;
}

/** إحصائيات أسبوعية */
export interface WeeklyStats {
  /** السنة + رقم الأسبوع بصيغة YYYY-Www */
  weekId: string;
  /** إجمالي التسبيحات هذا الأسبوع */
  totalCount: number;
  /** متوسط التسبيحات اليومي */
  averagePerDay: number;
  /** قائمة الأيام مع الإحصائيات */
  days: DailyStats[];
  /** أفضل يوم في الأسبوع */
  bestDay: { date: string; count: number } | null;
}

/** إحصائيات شهرية */
export interface MonthlyStats {
  /** الشهر بصيغة YYYY-MM */
  month: string;
  /** إجمالي التسبيحات هذا الشهر */
  totalCount: number;
  /** متوسط التسبيحات اليومي */
  averagePerDay: number;
  /** قائمة الأسابيع مع الإحصائيات */
  weeks: WeeklyStats[];
  /** أفضل أسبوع في الشهر */
  bestWeek: { weekId: string; count: number } | null;
}

/** الهدف اليومي */
export interface DailyGoal {
  /** العدد المستهدف */
  target: number;
  /** تم تفعيل الهدف */
  enabled: boolean;
}

/** هيكل التخزين الكامل في AsyncStorage */
interface StorageData {
  /** إحصائيات الأيام — مفتاحه هو التاريخ YYYY-MM-DD */
  days: Record<string, DailyStats>;
  /** الهدف اليومي */
  goal: DailyGoal;
  /** آخر تاريخ تم التحديث فيه */
  lastUpdated: string;
}

/** خيارات التهيئة للـ Hook */
export interface UseTasbihCounterOptions extends UseVoiceRecognitionOptions {
  /** مفتاح التخزين في AsyncStorage */
  storageKey?: string;
  /** الهدف اليومي الافتراضي */
  defaultGoal?: number;
  /** تفعيل الهدف الافتراضي */
  goalEnabled?: boolean;
  /** عبارة التسبيح الافتراضية */
  defaultPhrase?: TasbihPhrase;
}

/** واجهة Hook useTasbihCounter الكاملة */
export interface UseTasbihCounterReturn {
  /** العداد الكلي الحالي */
  count: number;
  /** إحصائيات اليوم */
  todayStats: DailyStats;
  /** إحصائيات الأسبوع الحالي */
  weeklyStats: WeeklyStats;
  /** إحصائيات الشهر الحالي */
  monthlyStats: MonthlyStats;
  /** المجموع الكلي عبر كل الأيام */
  totalAllTime: number;
  /** الهدف اليومي */
  dailyGoal: DailyGoal;
  /** نسبة التقدم نحو الهدف (0-1) */
  dailyProgress: number;
  /** هل تم تحقيق الهدف اليوم */
  goalAchieved: boolean;
  /** هل البيانات محملة من التخزين */
  isLoaded: boolean;

  /** زيادة العداد يدوياً */
  incrementManually: () => void;
  /** إعادة تعيين عداد اليوم */
  resetToday: () => void;
  /** إعادة تعيين كل الإحصائيات */
  resetAll: () => void;
  /** تعيين هدف يومي جديد */
  setDailyGoal: (target: number, enabled?: boolean) => Promise<void>;
  /** تفعيل/تعطيل الهدف */
  toggleGoal: (enabled: boolean) => Promise<void>;
  /** تغيير عبارة التسبيح */
  setTargetPhrase: (phrase: TasbihPhrase) => void;

  /** إحصائيات أسبوع محدد */
  getWeekStats: (weekId: string) => WeeklyStats | null;
  /** إحصائيات شهر محدد */
  getMonthStats: (month: string) => MonthlyStats | null;
}

// ===================== ثوابت ودوال مساعدة =====================

/** مفتاح التخزين الافتراضي */
const DEFAULT_STORAGE_KEY = '@tasbihi_counter';

/** الحصول على التاريخ الحالي بصيغة YYYY-MM-DD */
function getTodayString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** الحصول على معرف الأسبوع بصيغة YYYY-Www */
function getWeekId(date: Date = new Date()): string {
  const year = date.getFullYear();
  const startOfYear = new Date(year, 0, 1);
  const diff = date.getTime() - startOfYear.getTime();
  const dayOfYear = Math.floor(diff / (24 * 60 * 60 * 1000)) + 1;
  const weekNumber = Math.ceil(dayOfYear / 7);
  return `${year}-W${String(weekNumber).padStart(2, '0')}`;
}

/** الحصول على معرف الشهر بصيغة YYYY-MM */
function getMonthId(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

/** الحصول على بداية ونهاية أسبوع معين */
function getWeekDateRange(weekId: string): { start: Date; end: Date } {
  const [yearStr, weekStr] = weekId.split('-W');
  const year = parseInt(yearStr, 10);
  const weekNum = parseInt(weekStr, 10);

  // أول يوم في السنة
  const startOfYear = new Date(year, 0, 1);
  // إزاحة لأول يوم من الأسبوع المطلوب
  const start = new Date(startOfYear);
  start.setDate(start.getDate() + (weekNum - 1) * 7);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);

  return { start, end };
}

/** إنشاء إحصائيات يومية فارغة */
function createEmptyDailyStats(date?: string): DailyStats {
  return {
    date: date || getTodayString(),
    count: 0,
    breakdown: {},
    goalAchieved: false,
  };
}

// ===================== Hook الرئيسي =====================

/**
 * useTasbihCounter — Hook عداد التسبيح المتكامل
 *
 * يدمج بين:
 * 1. التعرف على الصوت (useVoiceRecognition)
 * 2. التخزين المحلي (AsyncStorage)
 * 3. الإحصائيات اليومية/الأسبوعية/الشهرية
 * 4. الأهداف اليومية
 *
 * @example
 * ```tsx
 * const {
 *   count,
 *   todayStats,
 *   dailyProgress,
 *   dailyGoal,
 *   incrementManually,
 *   setDailyGoal,
 * } = useTasbihCounter({
 *   defaultGoal: 100,
 *   defaultPhrase: { id: 'subhanallah', text: 'سبحان الله' },
 * });
 * ```
 */
export function useTasbihCounter(
  options: UseTasbihCounterOptions = {},
): UseTasbihCounterReturn {
  const {
    storageKey = DEFAULT_STORAGE_KEY,
    defaultGoal = 33,
    goalEnabled = true,
    defaultPhrase,
    ...voiceOptions
  } = options;

  // ===================== Voice Recognition =====================

  const voice = useVoiceRecognition({
    ...voiceOptions,
    initialPhrase: defaultPhrase || voiceOptions.initialPhrase,
    onTasbihDetected: (phrase) => {
      // عند اكتشاف تسبيحة صوتياً — نزيد العداد
      handleIncrement(phrase.id);
      // استدعاء المعالج الأصلي إذا وُجد
      voiceOptions.onTasbihDetected?.(phrase);
    },
  });

  // ===================== حالة التخزين والإحصائيات =====================

  const [isLoaded, setIsLoaded] = useState(false);
  const [daysData, setDaysData] = useState<Record<string, DailyStats>>({});
  const [dailyGoal, setDailyGoalState] = useState<DailyGoal>({
    target: defaultGoal,
    enabled: goalEnabled,
  });

  /** Reference لتجنب إعادة الحساب */
  const storageKeyRef = useRef(storageKey);
  const daysDataRef = useRef<Record<string, DailyStats>>({});

  /** تحديث daysRef في كل مرة يتغير فيها daysData */
  useEffect(() => {
    daysDataRef.current = daysData;
  }, [daysData]);

  // ===================== تحميل البيانات من التخزين =====================

  useEffect(() => {
    const loadData = async () => {
      try {
        const stored = await AsyncStorage.getItem(storageKeyRef.current);
        if (stored) {
          const parsed: StorageData = JSON.parse(stored);
          setDaysData(parsed.days || {});
          daysDataRef.current = parsed.days || {};
          setDailyGoalState(parsed.goal || { target: defaultGoal, enabled: goalEnabled });
        }
      } catch (err) {
        console.error('[useTasbihCounter] فشل تحميل البيانات من التخزين:', err);
      } finally {
        setIsLoaded(true);
      }
    };

    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ===================== حفظ البيانات في التخزين =====================

  /** حفظ البيانات الحالية في AsyncStorage */
  const saveToStorage = useCallback(
    async (days: Record<string, DailyStats>, goal: DailyGoal): Promise<void> => {
      try {
        const data: StorageData = {
          days,
          goal,
          lastUpdated: getTodayString(),
        };
        await AsyncStorage.setItem(storageKeyRef.current, JSON.stringify(data));
      } catch (err) {
        console.error('[useTasbihCounter] فشل حفظ البيانات:', err);
      }
    },
    [],
  );

  // ===================== إدارة العداد =====================

  /**
   * معالجة زيادة العداد — تستدعى تلقائياً عند اكتشاف تسبيحة صوتياً
   * أو يدوياً عبر incrementManually
   */
  const handleIncrement = useCallback(
    (phraseId: string): void => {
      const today = getTodayString();
      const currentDays = { ...daysDataRef.current };

      // الحصول على أو إنشاء إحصائيات اليوم
      const todayStats: DailyStats = currentDays[today]
        ? { ...currentDays[today] }
        : createEmptyDailyStats(today);

      // زيادة العدد
      todayStats.count += 1;

      // تحديث التفصيل
      todayStats.breakdown = {
        ...todayStats.breakdown,
        [phraseId]: (todayStats.breakdown[phraseId] || 0) + 1,
      };

      // التحقق من تحقيق الهدف
      if (dailyGoal.enabled && !todayStats.goalAchieved) {
        todayStats.goalAchieved = todayStats.count >= dailyGoal.target;
      }

      // حفظ التحديث
      currentDays[today] = todayStats;
      setDaysData(currentDays);
      daysDataRef.current = currentDays;

      // حفظ في التخزين (بدون انتظار)
      saveToStorage(currentDays, dailyGoal);
    },
    [dailyGoal, saveToStorage],
  );

  /**
   * زيادة العداد يدوياً
   */
  const incrementManually = useCallback((): void => {
    voice.incrementManually();

    // استخدام معرف العبارة الحالية أو افتراضي
    const phraseId = voice.targetPhrase?.id || 'manual';
    handleIncrement(phraseId);
  }, [voice, handleIncrement]);

  /**
   * إعادة تعيين عداد اليوم
   */
  const resetToday = useCallback(async (): Promise<void> => {
    const today = getTodayString();
    const currentDays = { ...daysDataRef.current };

    currentDays[today] = createEmptyDailyStats(today);
    setDaysData(currentDays);
    daysDataRef.current = currentDays;

    voice.resetCount();
    await saveToStorage(currentDays, dailyGoal);
  }, [dailyGoal, saveToStorage, voice]);

  /**
   * إعادة تعيين كل الإحصائيات
   */
  const resetAll = useCallback(async (): Promise<void> => {
    setDaysData({});
    daysDataRef.current = {};

    voice.resetCount();
    await saveToStorage({}, dailyGoal);
  }, [dailyGoal, saveToStorage, voice]);

  // ===================== إدارة الأهداف =====================

  /**
   * تعيين هدف يومي جديد
   */
  const setDailyGoal = useCallback(
    async (target: number, enabled?: boolean): Promise<void> => {
      const newGoal: DailyGoal = {
        target,
        enabled: enabled !== undefined ? enabled : dailyGoal.enabled,
      };
      setDailyGoalState(newGoal);
      await saveToStorage(daysDataRef.current, newGoal);
    },
    [dailyGoal.enabled, saveToStorage],
  );

  /**
   * تفعيل/تعطيل الهدف
   */
  const toggleGoal = useCallback(
    async (enabled: boolean): Promise<void> => {
      const newGoal = { ...dailyGoal, enabled };
      setDailyGoalState(newGoal);
      await saveToStorage(daysDataRef.current, newGoal);
    },
    [dailyGoal, saveToStorage],
  );

  // ===================== الإحصائيات المحسوبة =====================

  /** إحصائيات اليوم الحالي */
  const todayStats = useMemo<DailyStats>(() => {
    const today = getTodayString();
    return daysData[today] || createEmptyDailyStats(today);
  }, [daysData]);

  /** نسبة التقدم نحو الهدف (0-1) */
  const dailyProgress = useMemo<number>(() => {
    if (!dailyGoal.enabled || dailyGoal.target === 0) return 0;
    return Math.min(todayStats.count / dailyGoal.target, 1);
  }, [dailyGoal.enabled, dailyGoal.target, todayStats.count]);

  /** هل تم تحقيق الهدف */
  const goalAchieved = useMemo<boolean>(() => {
    return dailyGoal.enabled && todayStats.goalAchieved;
  }, [dailyGoal.enabled, todayStats.goalAchieved]);

  /** المجموع الكلي عبر كل الأيام */
  const totalAllTime = useMemo<number>(() => {
    return Object.values(daysData).reduce((sum, day) => sum + day.count, 0);
  }, [daysData]);

  /** إحصائيات الأسبوع الحالي */
  const weeklyStats = useMemo<WeeklyStats>(() => {
    const currentWeekId = getWeekId();
    return computeWeekStats(daysData, currentWeekId);
  }, [daysData]);

  /** إحصائيات الشهر الحالي */
  const monthlyStats = useMemo<MonthlyStats>(() => {
    const currentMonth = getMonthId();
    return computeMonthStats(daysData, currentMonth);
  }, [daysData]);

  /**
   * الحصول على إحصائيات أسبوع محدد
   */
  const getWeekStats = useCallback(
    (weekId: string): WeeklyStats | null => {
      return computeWeekStats(daysData, weekId);
    },
    [daysData],
  );

  /**
   * الحصول على إحصائيات شهر محدد
   */
  const getMonthStats = useCallback(
    (month: string): MonthlyStats | null => {
      return computeMonthStats(daysData, month);
    },
    [daysData],
  );

  return {
    // العداد
    count: voice.count,
    todayStats,
    weeklyStats,
    monthlyStats,
    totalAllTime,

    // الهدف
    dailyGoal,
    dailyProgress,
    goalAchieved,

    // الحالة
    isLoaded,

    // دوال التحكم
    incrementManually,
    resetToday,
    resetAll,
    setDailyGoal,
    toggleGoal,
    setTargetPhrase: voice.setTargetPhrase,

    // إحصائيات حسب الطلب
    getWeekStats,
    getMonthStats,
  };
}

// ===================== دوال حساب الإحصائيات =====================

/**
 * حساب إحصائيات أسبوع معين
 */
function computeWeekStats(
  days: Record<string, DailyStats>,
  weekId: string,
): WeeklyStats {
  const { start, end } = getWeekDateRange(weekId);

  // جمع كل الأيام التي تقع ضمن هذا الأسبوع
  const weekDays: DailyStats[] = [];
  const current = new Date(start);

  while (current <= end) {
    const dateStr = formatDate(current);
    const dayStats = days[dateStr];
    if (dayStats) {
      weekDays.push(dayStats);
    }
    current.setDate(current.getDate() + 1);
  }

  const totalCount = weekDays.reduce((sum, day) => sum + day.count, 0);

  // أفضل يوم
  let bestDay: { date: string; count: number } | null = null;
  for (const day of weekDays) {
    if (!bestDay || day.count > bestDay.count) {
      bestDay = { date: day.date, count: day.count };
    }
  }

  return {
    weekId,
    totalCount,
    averagePerDay: weekDays.length > 0 ? totalCount / weekDays.length : 0,
    days: weekDays,
    bestDay,
  };
}

/**
 * حساب إحصائيات شهر معين
 */
function computeMonthStats(
  days: Record<string, DailyStats>,
  month: string,
): MonthlyStats {
  const [yearStr, monthStr] = month.split('-');
  const year = parseInt(yearStr, 10);
  const monthNum = parseInt(monthStr, 10);

  // جميع أيام الشهر
  const monthDays: DailyStats[] = [];
  const daysInMonth = new Date(year, monthNum, 0).getDate();

  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${month}-${String(day).padStart(2, '0')}`;
    const dayStats = days[dateStr];
    if (dayStats) {
      monthDays.push(dayStats);
    }
  }

  const totalCount = monthDays.reduce((sum, d) => sum + d.count, 0);

  // حساب الأسابيع
  const weeksMap = new Map<string, DailyStats[]>();
  for (const dayStats of monthDays) {
    const dateParts = dayStats.date.split('-').map(Number);
    const date = new Date(dateParts[0], dateParts[1] - 1, dateParts[2]);
    const weekId = getWeekId(date);

    if (!weeksMap.has(weekId)) {
      weeksMap.set(weekId, []);
    }
    weeksMap.get(weekId)!.push(dayStats);
  }

  const weeks: WeeklyStats[] = [];
  let bestWeek: { weekId: string; count: number } | null = null;

  weeksMap.forEach((weekDays, weekId) => {
    const weekCount = weekDays.reduce((sum, d) => sum + d.count, 0);
    const weekStats: WeeklyStats = {
      weekId,
      totalCount: weekCount,
      averagePerDay: weekDays.length > 0 ? weekCount / weekDays.length : 0,
      days: weekDays,
      bestDay: null,
    };

    // أفضل يوم في هذا الأسبوع
    let bestDayInWeek: { date: string; count: number } | null = null;
    for (const day of weekDays) {
      if (!bestDayInWeek || day.count > bestDayInWeek.count) {
        bestDayInWeek = { date: day.date, count: day.count };
      }
    }
    weekStats.bestDay = bestDayInWeek;

    weeks.push(weekStats);

    if (!bestWeek || weekCount > bestWeek.count) {
      bestWeek = { weekId, count: weekCount };
    }
  });

  return {
    month,
    totalCount,
    averagePerDay: monthDays.length > 0 ? totalCount / monthDays.length : 0,
    weeks,
    bestWeek,
  };
}

/**
 * تنسيق تاريخ إلى YYYY-MM-DD
 */
function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default useTasbihCounter;
