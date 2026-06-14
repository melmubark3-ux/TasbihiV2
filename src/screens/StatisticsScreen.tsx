import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  Platform,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/MaterialIcons';

// --- Types ---
interface DailyCount {
  date: string; // YYYY-MM-DD
  count: number;
}

interface Goal {
  id: string;
  target: number;
  achieved: boolean;
  date: string;
}

interface StatisticsData {
  today: number;
  week: DailyCount[];
  month: DailyCount[];
  total: number;
  streak: number;
  bestDay: { date: string; count: number };
  goalsAchieved: number;
  goalsTotal: number;
}

// --- Constants ---
const STORAGE_KEY = '@tasbihi_counts';
const GOALS_KEY = '@tasbihi_goals';
const SCREEN_WIDTH = Dimensions.get('window').width;
const CHART_HEIGHT = 180;
const BAR_GAP = 4;

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
  streak: '#FF6F00',
  best: '#C62828',
  chartBar: '#4CAF50',
  chartBarInactive: '#C8E6C9',
};

// --- Helpers ---
function getDateString(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function getWeekDates(): string[] {
  const dates: string[] = [];
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=Sun
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - ((dayOfWeek + (dayOfWeek === 0 ? 6 : dayOfWeek - 1)) - i));
    dates.push(getDateString(d));
  }
  return dates;
}

function getMonthDates(): string[] {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const days = getDaysInMonth(year, month);
  const dates: string[] = [];
  for (let i = 1; i <= days; i++) {
    const d = `${year}-${String(month).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
    dates.push(d);
  }
  return dates;
}

function computeStreak(countsMap: Map<string, number>): number {
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = getDateString(d);
    if ((countsMap.get(key) || 0) > 0) {
      streak++;
    } else if (i > 0) {
      break;
    } else {
      // Today has no count yet
      break;
    }
  }
  return streak;
}

// --- Bar Chart ---
interface BarChartProps {
  data: { label: string; value: number }[];
  maxValue: number;
  height: number;
}

function BarChart({ data, maxValue, height }: BarChartProps) {
  const effectiveMax = Math.max(maxValue, 1);

  return (
    <View style={chartStyles.container}>
      {data.map((item, idx) => {
        const barHeight = (item.value / effectiveMax) * height;
        const isHighlighted = item.value > 0;
        return (
          <View key={idx} style={chartStyles.barWrapper}>
            <Text style={chartStyles.barValue}>
              {item.value > 0 ? item.value : ''}
            </Text>
            <View
              style={[
                chartStyles.bar,
                {
                  height: Math.max(barHeight, 2),
                  backgroundColor: isHighlighted
                    ? COLORS.chartBar
                    : COLORS.chartBarInactive,
                },
              ]}
            />
            <Text style={chartStyles.barLabel} numberOfLines={1}>
              {item.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const chartStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-evenly',
    height: CHART_HEIGHT + 40,
    paddingHorizontal: 8,
  },
  barWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginHorizontal: BAR_GAP / 2,
  },
  bar: {
    width: '80%',
    minWidth: 8,
    borderRadius: 4,
  },
  barValue: {
    fontSize: 9,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  barLabel: {
    fontSize: 9,
    color: COLORS.muted,
    marginTop: 4,
    textAlign: 'center',
  },
});

// --- Stat Card ---
interface StatCardProps {
  title: string;
  value: string | number;
  icon?: string;
  color?: string;
}

function StatCard({ title, value, icon, color }: StatCardProps) {
  return (
    <View style={[cardStyles.card, color ? { borderLeftColor: color } : undefined]}>
      {icon && (
        <Icon name={icon} size={24} color={color || COLORS.primary} style={cardStyles.icon} />
      )}
      <View style={cardStyles.textContainer}>
        <Text style={cardStyles.title}>{title}</Text>
        <Text style={cardStyles.value}>{value}</Text>
      </View>
    </View>
  );
}

const cardStyles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  icon: {
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  value: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
});

// --- Main Screen ---
function StatisticsScreen() {
  const [data, setData] = useState<StatisticsData | null>(null);
  const [loading, setLoading] = useState(true);

  const loadStatistics = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      const countsMap: Map<string, number> = raw
        ? new Map(Object.entries(JSON.parse(raw)))
        : new Map();

      // Goals
      const goalsRaw = await AsyncStorage.getItem(GOALS_KEY);
      const goals: Goal[] = goalsRaw ? JSON.parse(goalsRaw) : [];

      const today = getDateString();
      const todayCount = countsMap.get(today) || 0;

      // Week
      const weekDates = getWeekDates();
      const weekData = weekDates.map((d) => ({
        label: new Date(d).toLocaleDateString('ar-SA', { weekday: 'short' }),
        value: countsMap.get(d) || 0,
      }));

      // Month
      const monthDates = getMonthDates();
      const monthData = monthDates.map((d) => ({
        label: String(new Date(d).getDate()),
        value: countsMap.get(d) || 0,
      }));

      // Total
      let total = 0;
      const datesArray: string[] = [];
      countsMap.forEach((v, k) => {
        total += v;
        datesArray.push(k);
      });

      // Best day
      let bestDay: { date: string; count: number } = { date: '', count: 0 };
      countsMap.forEach((v, k) => {
        if (v > bestDay.count) {
          bestDay = { date: k, count: v };
        }
      });

      // Streak
      const streak = computeStreak(countsMap);

      // Goals achieved
      const goalsAchieved = goals.filter((g) => g.achieved).length;

      setData({
        today: todayCount,
        week: weekData.map((d) => ({ date: d.label, count: d.value })),
        month: monthData.map((d) => ({ date: d.label, count: d.value })),
        total,
        streak,
        bestDay,
        goalsAchieved,
        goalsTotal: goals.length,
      });
    } catch (error) {
      console.error('[Statistics] Load error:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStatistics();
  }, [loadStatistics]);

  if (loading) {
    return (
      <View style={loadingStyles.container}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={loadingStyles.text}>جاري تحميل الإحصائيات...</Text>
      </View>
    );
  }

  if (!data) {
    return (
      <View style={loadingStyles.container}>
        <Text style={loadingStyles.text}>لا توجد بيانات بعد</Text>
      </View>
    );
  }

  const weekMax = Math.max(...data.week.map((d) => d.count), 1);
  const monthMax = Math.max(...data.month.map((d) => d.count), 1);

  return (
    <View style={screenStyles.container}>
      {/* Fixed header */}
      <View style={screenStyles.header}>
        <Text style={screenStyles.headerTitle}>📊 الإحصائيات</Text>
        <Text style={screenStyles.headerSubtitle}>تتبع تسبيحاتك وأذكارك</Text>
      </View>

      <ScrollView
        style={screenStyles.scroll}
        contentContainerStyle={screenStyles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Today */}
        <View style={sectionStyles.section}>
          <Text style={sectionStyles.sectionTitle}>اليوم</Text>
          <StatCard
            title="تسبيحات اليوم"
            value={data.today.toLocaleString('ar-SA')}
            icon="today"
            color={COLORS.primary}
          />
        </View>

        {/* Totals */}
        <View style={sectionStyles.section}>
          <Text style={sectionStyles.sectionTitle}>الإجمالي</Text>
          <StatCard
            title="مجموع التسبيحات"
            value={data.total.toLocaleString('ar-SA')}
            icon="stars"
            color={COLORS.primaryLight}
          />
        </View>

        {/* Streak */}
        <View style={sectionStyles.section}>
          <Text style={sectionStyles.sectionTitle}>المواظبة</Text>
          <View style={streakStyles.container}>
            <Icon name="local-fire-department" size={32} color={COLORS.streak} />
            <View style={streakStyles.textContainer}>
              <Text style={streakStyles.value}>{data.streak}</Text>
              <Text style={streakStyles.label}>أيام متتالية</Text>
            </View>
          </View>
        </View>

        {/* Best Day */}
        {data.bestDay.date ? (
          <View style={sectionStyles.section}>
            <Text style={sectionStyles.sectionTitle}>أفضل يوم</Text>
            <StatCard
              title={data.bestDay.date}
              value={`${data.bestDay.count.toLocaleString('ar-SA')} تسبيحة`}
              icon="emoji-events"
              color={COLORS.best}
            />
          </View>
        ) : null}

        {/* Goals */}
        <View style={sectionStyles.section}>
          <Text style={sectionStyles.sectionTitle}>الأهداف</Text>
          <StatCard
            title="الأهداف المحققة"
            value={`${data.goalsAchieved} / ${data.goalsTotal}`}
            icon="flag"
            color={COLORS.accent}
          />
        </View>

        {/* Weekly Chart */}
        <View style={sectionStyles.section}>
          <Text style={sectionStyles.sectionTitle}>هذا الأسبوع</Text>
          <View style={chartBoxStyles.box}>
            <BarChart
              data={data.week.map((d) => ({ label: d.date, value: d.count }))}
              maxValue={weekMax}
              height={CHART_HEIGHT}
            />
          </View>
        </View>

        {/* Monthly Chart */}
        <View style={sectionStyles.section}>
          <Text style={sectionStyles.sectionTitle}>هذا الشهر</Text>
          <View style={chartBoxStyles.box}>
            <BarChart
              data={data.month.map((d) => ({ label: d.date, value: d.count }))}
              maxValue={monthMax}
              height={CHART_HEIGHT}
            />
          </View>
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

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

const sectionStyles = StyleSheet.create({
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginBottom: 8,
    marginRight: 4,
  },
});

const chartBoxStyles = StyleSheet.create({
  box: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 8,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
});

const streakStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    borderRadius: 12,
    padding: 16,
  },
  textContainer: {
    marginLeft: 12,
  },
  value: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.streak,
  },
  label: {
    fontSize: 13,
    color: COLORS.textSecondary,
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
    marginTop: 12,
    fontSize: 16,
    color: COLORS.textSecondary,
  },
});

export default StatisticsScreen;
