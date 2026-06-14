import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Alert,
  TextInput,
  Platform,
  Animated,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Geolocation from '@react-native-community/geolocation';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

// ─────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────

interface PrayerTimesData {
  Fajr: string;
  Sunrise: string;
  Dhuhr: string;
  Asr: string;
  Maghrib: string;
  Isha: string;
}

interface CityOption {
  name: string;
  lat: number;
  lng: number;
}

// ─────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────

const CITIES: CityOption[] = [
  { name: 'مكة المكرمة', lat: 21.4225, lng: 39.8262 },
  { name: 'المدينة المنورة', lat: 24.4672, lng: 39.6112 },
  { name: 'الرياض', lat: 24.7136, lng: 46.6753 },
  { name: 'جدة', lat: 21.5433, lng: 39.1728 },
  { name: 'الدمام', lat: 26.4207, lng: 50.0888 },
  { name: 'القاهرة', lat: 30.0444, lng: 31.2357 },
  { name: 'عمان', lat: 31.9632, lng: 35.9307 },
  { name: 'دبي', lat: 25.2048, lng: 55.2708 },
  { name: 'لندن', lat: 51.5074, lng: -0.1278 },
  { name: 'نيويورك', lat: 40.7128, lng: -74.006 },
];

const PRAYER_NAMES: { key: keyof PrayerTimesData; label: string; icon: string }[] = [
  { key: 'Fajr', label: 'الفجر', icon: 'weather-sunset-up' },
  { key: 'Sunrise', label: 'الشروق', icon: 'weather-sunny' },
  { key: 'Dhuhr', label: 'الظهر', icon: 'white-balance-sunny' },
  { key: 'Asr', label: 'العصر', icon: 'weather-partly-cloudy' },
  { key: 'Maghrib', label: 'المغرب', icon: 'weather-sunset-down' },
  { key: 'Isha', label: 'العشاء', icon: 'weather-night' },
];

const DAYS_OF_WEEK_AR = [
  'الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت',
];

const STORAGE_CITY_KEY = '@tasbihi_city';

// ─────────────────────────────────────────────────
// Prayer calculation using approximations
// (production should use adhan npm library)
// ─────────────────────────────────────────────────

function calculatePrayerTimes(lat: number, lng: number, date: Date): PrayerTimesData {
  // Simplified calculation based on sun position
  // For production, use the 'adhan' npm package properly
  const day = date.getDate();
  const month = date.getMonth() + 1;
  const year = date.getFullYear();

  // Helper: compute day of year
  const dayOfYear = Math.floor(
    (Date.UTC(year, month - 1, day) - Date.UTC(year, 0, 0)) / 86400000,
  );

  // Sun declination
  const declination = 23.45 * Math.sin((360 / 365) * (dayOfYear - 81) * (Math.PI / 180));
  const latitudeRad = lat * (Math.PI / 180);
  const declinationRad = declination * (Math.PI / 180);

  // Sunrise hour angle
  const cosSunrise =
    (Math.sin(-0.8333 * (Math.PI / 180)) - Math.sin(latitudeRad) * Math.sin(declinationRad)) /
    (Math.cos(latitudeRad) * Math.cos(declinationRad));
  const sunriseHourAngle =
    cosSunrise > 1 || cosSunrise < -1 ? 0 : Math.acos(cosSunrise) * (180 / Math.PI);

  // Dhuhr (midday) in minutes from midnight = 12:00 + timezone offset correction
  const timezoneOffset = Math.round(lng / 15);
  const equationOfTime =
    229.2 *
    (0.000075 + 0.001868 * Math.cos((2 * Math.PI * (dayOfYear - 1)) / 365) -
      0.032077 * Math.sin((2 * Math.PI * (dayOfYear - 1)) / 365) -
      0.014615 * Math.cos((4 * Math.PI * (dayOfYear - 1)) / 365) -
      0.04089 * Math.sin((4 * Math.PI * (dayOfYear - 1)) / 365));

  const dhuhrMinutes = 720 + equationOfTime - timezoneOffset * 60;
  const sunriseMinutes = dhuhrMinutes - sunriseHourAngle * 4;
  const sunsetMinutes = dhuhrMinutes + sunriseHourAngle * 4;

  // Fajr: when sun is 18° below horizon
  const cosFajr =
    (Math.sin(-18 * (Math.PI / 180)) - Math.sin(latitudeRad) * Math.sin(declinationRad)) /
    (Math.cos(latitudeRad) * Math.cos(declinationRad));
  const fajrHourAngle = cosFajr > 1 || cosFajr < -1 ? sunriseHourAngle : Math.acos(cosFajr) * (180 / Math.PI);
  const fajrMinutes = dhuhrMinutes - fajrHourAngle * 4;

  // Isha: when sun is 17° below horizon
  const cosIsha =
    (Math.sin(-17 * (Math.PI / 180)) - Math.sin(latitudeRad) * Math.sin(declinationRad)) /
    (Math.cos(latitudeRad) * Math.cos(declinationRad));
  const ishaHourAngle = cosIsha > 1 || cosIsha < -1 ? sunriseHourAngle : Math.acos(cosIsha) * (180 / Math.PI);
  const ishaMinutes = dhuhrMinutes + ishaHourAngle * 4;

  // Asr: shadow length = object height (Shafi'i)
  const asrDeclinationRad = declinationRad;
  const tanAsr = 1 + Math.tan(Math.abs(latitudeRad - 0) * (Math.PI / 180));
  // simplified Asr: using sunset - offset
  const asrMinutes = dhuhrMinutes + sunriseHourAngle * 3.5;

  const formatTime = (mins: number): string => {
    const h = Math.floor(mins / 60) % 24;
    const m = Math.floor(mins % 60);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  };

  return {
    Fajr: formatTime(fajrMinutes),
    Sunrise: formatTime(sunriseMinutes),
    Dhuhr: formatTime(dhuhrMinutes),
    Asr: formatTime(asrMinutes),
    Maghrib: formatTime(sunsetMinutes),
    Isha: formatTime(ishaMinutes),
  };
}

// ─────────────────────────────────────────────────
// PrayerTimesScreen Component
// ─────────────────────────────────────────────────

const PrayerTimesScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [city, setCity] = useState<CityOption>(CITIES[0]);
  const [showCityPicker, setShowCityPicker] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const now = new Date();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Prayer times for today
  const prayerTimes = useMemo(
    () => calculatePrayerTimes(city.lat, city.lng, now),
    [city, now.getDate(), now.getMonth(), now.getFullYear()],
  );

  // ── Countdown timer ──
  const [countdown, setCountdown] = useState('');
  const [nextPrayer, setNextPrayer] = useState('');

  useEffect(() => {
    const timer = setInterval(() => {
      const now_ = new Date();
      const next = getNextPrayer(prayerTimes, now_);
      if (next) {
        setNextPrayer(next.name);
        setCountdown(formatCountdown(next.timeMs - now_.getTime()));
      } else {
        // All prayers passed for today, show Fajr tomorrow
        setNextPrayer('الفجر (غداً)');
        const tomorrow = new Date(now_);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowTimes = calculatePrayerTimes(city.lat, city.lng, tomorrow);
        const [h, m] = tomorrowTimes.Fajr.split(':').map(Number);
        const fajrTomorrow = new Date(tomorrow);
        fajrTomorrow.setHours(h, m, 0, 0);
        setCountdown(formatCountdown(fajrTomorrow.getTime() - now_.getTime()));
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [prayerTimes, city]);

  // ── Fade in animation ──
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  // ── Load saved city ──
  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_CITY_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          setCity(parsed);
        }
      } catch {}
    })();
  }, []);

  const saveCity = async (c: CityOption) => {
    setCity(c);
    setShowCityPicker(false);
    await AsyncStorage.setItem(STORAGE_CITY_KEY, JSON.stringify(c));
  };

  // ── Auto-detect location ──
  const detectLocation = () => {
    setLocationLoading(true);
    Geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        // Find nearest city or just use coords
        const nearest = CITIES.reduce((prev, curr) => {
          const distPrev = Math.hypot(prev.lat - latitude, prev.lng - longitude);
          const distCurr = Math.hypot(curr.lat - latitude, curr.lng - longitude);
          return distCurr < distPrev ? curr : prev;
        }, CITIES[0]);
        saveCity(nearest);
        setLocationLoading(false);
      },
      () => {
        setLocationLoading(false);
        Alert.alert('خطأ', 'تعذر الحصول على الموقع الحالي. يرجى اختيار المدينة يدوياً.');
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  // ── Week days ──
  const todayIndex = now.getDay();
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const idx = (todayIndex + i) % 7;
    const d = new Date(now);
    d.setDate(d.getDate() + i);
    return { label: DAYS_OF_WEEK_AR[idx], date: d.getDate(), isToday: i === 0 };
  });

  // Filter cities
  const filteredCities = searchText
    ? CITIES.filter((c) => c.name.includes(searchText))
    : CITIES;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* ─── Header ─── */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>🕌 أوقات الصلاة</Text>
          <TouchableOpacity onPress={detectLocation} style={styles.locBtn}>
            <Icon
              name={locationLoading ? 'loading' : 'crosshairs-gps'}
              size={20}
              color="#D4AF37"
            />
          </TouchableOpacity>
        </View>

        {/* ─── City Selector ─── */}
        <TouchableOpacity
          style={styles.citySelector}
          onPress={() => setShowCityPicker(!showCityPicker)}
        >
          <Icon name="map-marker" size={18} color="#D4AF37" />
          <Text style={styles.cityName}>{city.name}</Text>
          <Icon
            name={showCityPicker ? 'chevron-up' : 'chevron-down'}
            size={18}
            color="#81C784"
          />
        </TouchableOpacity>

        {/* ─── City Picker ─── */}
        {showCityPicker && (
          <View style={styles.cityPickerContainer}>
            <View style={styles.citySearchRow}>
              <Icon name="magnify" size={18} color="#81C784" />
              <TextInput
                style={styles.citySearchInput}
                placeholder="ابحث عن مدينة..."
                placeholderTextColor="#558B2F"
                value={searchText}
                onChangeText={setSearchText}
                textAlign="right"
              />
            </View>
            <ScrollView style={styles.cityList} showsVerticalScrollIndicator={false}>
              {filteredCities.map((c) => (
                <TouchableOpacity
                  key={c.name}
                  style={[
                    styles.cityOption,
                    city.name === c.name && styles.cityOptionActive,
                  ]}
                  onPress={() => saveCity(c)}
                >
                  <Icon
                    name="city"
                    size={16}
                    color={city.name === c.name ? '#0D1B0E' : '#81C784'}
                  />
                  <Text
                    style={[
                      styles.cityOptionText,
                      city.name === c.name && styles.cityOptionTextActive,
                    ]}
                  >
                    {c.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* ─── Countdown ─── */}
        <Animated.View style={[styles.countdownCard, { opacity: fadeAnim }]}>
          <Text style={styles.countdownLabel}>الوقت المتبقي</Text>
          <Text style={styles.countdownNextPrayer}>{nextPrayer}</Text>
          <Text style={styles.countdownTimer}>{countdown}</Text>
        </Animated.View>

        {/* ─── Week Days ─── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.weekContainer}
        >
          {weekDays.map((day, idx) => (
            <View
              key={idx}
              style={[styles.weekDay, day.isToday && styles.weekDayToday]}
            >
              <Text style={[styles.weekDayLabel, day.isToday && styles.weekDayLabelToday]}>
                {day.label.slice(0, 2)}
              </Text>
              <Text style={[styles.weekDayDate, day.isToday && styles.weekDayDateToday]}>
                {day.date}
              </Text>
            </View>
          ))}
        </ScrollView>

        {/* ─── Prayer Times List ─── */}
        <ScrollView
          style={styles.prayerList}
          contentContainerStyle={styles.prayerListContent}
          showsVerticalScrollIndicator={false}
        >
          {PRAYER_NAMES.map((prayer) => {
            const time = prayerTimes[prayer.key];
            const isNext = prayer.label === nextPrayer || (
              nextPrayer.includes(prayer.label) && nextPrayer.includes('الفجر') === prayer.label.includes('الفجر')
            );
            // Determine if this prayer is the next one
            const now_ = new Date();
            const [h, m] = time.split(':').map(Number);
            const prayerDate = new Date(now_);
            prayerDate.setHours(h, m, 0, 0);
            const isNextPrayer = isNext && prayerDate.getTime() > now_.getTime();

            return (
              <View
                key={prayer.key}
                style={[styles.prayerRow, isNextPrayer && styles.prayerRowNext]}
              >
                <View style={styles.prayerIcon}>
                  <Icon name={prayer.icon} size={22} color="#D4AF37" />
                </View>
                <Text style={styles.prayerLabel}>{prayer.label}</Text>
                <Text style={styles.prayerTime}>{time}</Text>
                {isNextPrayer && (
                  <View style={styles.nextBadge}>
                    <Text style={styles.nextBadgeText}>التالي</Text>
                  </View>
                )}
              </View>
            );
          })}
        </ScrollView>

        {/* ─── Islamic date hint ─── */}
        <View style={styles.islamicDateHint}>
          <Icon name="calendar-text" size={14} color="#81C784" />
          <Text style={styles.islamicDateText}>
            {now.toLocaleDateString('ar-SA', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

// ─────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────

function getNextPrayer(
  times: PrayerTimesData,
  now: Date,
): { name: string; timeMs: number } | null {
  const order: (keyof PrayerTimesData)[] = [
    'Fajr',
    'Sunrise',
    'Dhuhr',
    'Asr',
    'Maghrib',
    'Isha',
  ];
  const nowMs = now.getTime();

  for (const key of order) {
    const [h, m] = times[key].split(':').map(Number);
    const prayerDate = new Date(now);
    prayerDate.setHours(h, m, 0, 0);
    if (prayerDate.getTime() > nowMs) {
      const name = PRAYER_NAMES.find((p) => p.key === key)?.label ?? key;
      return { name, timeMs: prayerDate.getTime() };
    }
  }
  return null;
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return '00:00:00';
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

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
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#D4AF37',
  },
  locBtn: {
    padding: 8,
    backgroundColor: '#1B3A1D',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D4AF3722',
  },

  // ── City Selector ──
  citySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1B3A1D',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#D4AF3722',
    marginBottom: 10,
  },
  cityName: {
    flex: 1,
    color: '#E8F5E9',
    fontSize: 15,
    fontWeight: '600',
    marginHorizontal: 8,
    textAlign: 'right',
  },

  // ── City Picker ──
  cityPickerContainer: {
    backgroundColor: '#1B3A1D',
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#D4AF3722',
  },
  citySearchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0D1B0E',
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 38,
    marginBottom: 8,
  },
  citySearchInput: {
    flex: 1,
    color: '#E8F5E9',
    fontSize: 13,
    marginHorizontal: 6,
    paddingVertical: 0,
  },
  cityList: {
    maxHeight: 160,
  },
  cityOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 10,
    marginBottom: 2,
  },
  cityOptionActive: {
    backgroundColor: '#D4AF37',
  },
  cityOptionText: {
    color: '#E8F5E9',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
  cityOptionTextActive: {
    color: '#0D1B0E',
    fontWeight: '700',
  },

  // ── Countdown ──
  countdownCard: {
    backgroundColor: '#1B3A1D',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#D4AF3733',
  },
  countdownLabel: {
    color: '#81C784',
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 4,
  },
  countdownNextPrayer: {
    color: '#D4AF37',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
  },
  countdownTimer: {
    color: '#E8F5E9',
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: 4,
  },

  // ── Week ──
  weekContainer: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 10,
  },
  weekDay: {
    width: 44,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#1B3A1D',
    borderWidth: 1,
    borderColor: '#D4AF3718',
  },
  weekDayToday: {
    backgroundColor: '#D4AF37',
    borderColor: '#D4AF37',
  },
  weekDayLabel: {
    color: '#81C784',
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 2,
  },
  weekDayLabelToday: {
    color: '#0D1B0E',
  },
  weekDayDate: {
    color: '#E8F5E9',
    fontSize: 15,
    fontWeight: '700',
  },
  weekDayDateToday: {
    color: '#0D1B0E',
  },

  // ── Prayer List ──
  prayerList: {
    flex: 1,
  },
  prayerListContent: {
    paddingBottom: 60,
  },
  prayerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: '#1B3A1D',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#D4AF3718',
  },
  prayerRowNext: {
    borderColor: '#D4AF37',
    backgroundColor: '#1B3A1D',
  },
  prayerIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#0D1B0E',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  prayerLabel: {
    flex: 1,
    color: '#E8F5E9',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'right',
  },
  prayerTime: {
    color: '#D4AF37',
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 10,
  },
  nextBadge: {
    backgroundColor: '#D4AF37',
    paddingVertical: 2,
    paddingHorizontal: 10,
    borderRadius: 10,
    marginLeft: 8,
  },
  nextBadgeText: {
    color: '#0D1B0E',
    fontSize: 10,
    fontWeight: '800',
  },

  // ── Islamic Date ──
  islamicDateHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#1B3A1D',
    marginTop: 4,
  },
  islamicDateText: {
    color: '#81C784',
    fontSize: 12,
    marginLeft: 6,
  },
});

export default PrayerTimesScreen;
