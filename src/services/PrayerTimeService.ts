/**
 * PrayerTimeService
 * ---------------
 * Calculates Islamic prayer times using the `adhan` library.
 * Supports multiple calculation methods, manual city selection,
 * and returns times for all five daily prayers + sunrise.
 */

import {
  PrayerTimes,
  Coordinates,
  CalculationMethod,
  CalculationParameters,
  Madhab,
  HighLatitudeRule,
  Prayer,
  Qibla,
} from 'adhan';

// ─────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────

export interface PrayerTimeResult {
  fajr: Date;
  sunrise: Date;
  dhuhr: Date;
  asr: Date;
  maghrib: Date;
  isha: Date;
}

export interface CityInfo {
  name: string;
  nameAr: string;
  latitude: number;
  longitude: number;
  country: string;
  countryAr: string;
}

export type CalculationMethodKey =
  | 'ummalqura'
  | 'muslimworldleague'
  | 'egyptian'
  | 'karachi'
  | 'dubai'
  | 'kwt'
  | 'mwl'
  | 'qatar'
  | 'singapore'
  | 'tehran'
  | 'northamerica'
  | 'custom';

export interface PrayerServiceConfig {
  coordinates: Coordinates;
  calculationMethod: CalculationMethodKey;
  /** Optional manual adjustment in minutes (e.g. +2 to delay Isha) */
  adjustments?: Partial<Record<Prayer, number>>;
  /** For high-latitude regions */
  highLatitudeRule?: HighLatitudeRule;
}

export interface NextPrayerInfo {
  prayerName: string;
  prayerTime: Date;
  timeUntil: number; // milliseconds
}

// ─────────────────────────────────────────────────────────────────────
// Default city list (majors + Saudi cities)
// ─────────────────────────────────────────────────────────────────────

const DEFAULT_CITIES: CityInfo[] = [
  { name: 'Makkah',       nameAr: 'مكة المكرمة',       latitude: 21.3891,  longitude: 39.8579,  country: 'Saudi Arabia',        countryAr: 'السعودية' },
  { name: 'Madinah',      nameAr: 'المدينة المنورة',     latitude: 24.5247,  longitude: 39.5692,  country: 'Saudi Arabia',        countryAr: 'السعودية' },
  { name: 'Riyadh',       nameAr: 'الرياض',             latitude: 24.7136,  longitude: 46.6753,  country: 'Saudi Arabia',        countryAr: 'السعودية' },
  { name: 'Jeddah',       nameAr: 'جدة',               latitude: 21.5433,  longitude: 39.1728,  country: 'Saudi Arabia',        countryAr: 'السعودية' },
  { name: 'Cairo',        nameAr: 'القاهرة',            latitude: 30.0444,  longitude: 31.2357,  country: 'Egypt',               countryAr: 'مصر' },
  { name: 'Baghdad',      nameAr: 'بغداد',              latitude: 33.3152,  longitude: 44.3661,  country: 'Iraq',                countryAr: 'العراق' },
  { name: 'Damascus',     nameAr: 'دمشق',               latitude: 33.5138,  longitude: 36.2765,  country: 'Syria',               countryAr: 'سوريا' },
  { name: 'Amman',        nameAr: 'عمان',               latitude: 31.9454,  longitude: 35.9284,  country: 'Jordan',              countryAr: 'الأردن' },
  { name: 'Jerusalem',    nameAr: 'القدس',               latitude: 31.7683,  longitude: 35.2137,  country: 'Palestine',           countryAr: 'فلسطين' },
  { name: 'Kuwait City',  nameAr: 'مدينة الكويت',        latitude: 29.3759,  longitude: 47.9774,  country: 'Kuwait',              countryAr: 'الكويت' },
  { name: 'Dubai',        nameAr: 'دبي',                latitude: 25.2769,  longitude: 55.2962,  country: 'UAE',                 countryAr: 'الإمارات' },
  { name: 'Abu Dhabi',    nameAr: 'أبو ظبي',             latitude: 24.4539,  longitude: 54.3773,  country: 'UAE',                 countryAr: 'الإمارات' },
  { name: 'Doha',         nameAr: 'الدوحة',              latitude: 25.2854,  longitude: 51.5310,  country: 'Qatar',               countryAr: 'قطر' },
  { name: 'Muscat',       nameAr: 'مسقط',               latitude: 23.5880,  longitude: 58.3829,  country: 'Oman',                countryAr: 'عُمان' },
  { name: 'Manama',       nameAr: 'المنامة',             latitude: 26.2285,  longitude: 50.5860,  country: 'Bahrain',             countryAr: 'البحرين' },
  { name: 'Istanbul',     nameAr: 'إسطنبول',             latitude: 41.0082,  longitude: 28.9784,  country: 'Turkey',              countryAr: 'تركيا' },
  { name: 'Ankara',       nameAr: 'أنقرة',               latitude: 39.9334,  longitude: 32.8597,  country: 'Turkey',              countryAr: 'تركيا' },
  { name: 'Kuala Lumpur', nameAr: 'كوالالمبور',          latitude: 3.1390,   longitude: 101.6869, country: 'Malaysia',            countryAr: 'ماليزيا' },
  { name: 'Jakarta',      nameAr: 'جاكرتا',              latitude: -6.2088,  longitude: 106.8456, country: 'Indonesia',           countryAr: 'إندونيسيا' },
  { name: 'London',       nameAr: 'لندن',                latitude: 51.5074,  longitude: -0.1278,  country: 'United Kingdom',      countryAr: 'المملكة المتحدة' },
  { name: 'New York',     nameAr: 'نيويورك',             latitude: 40.7128,  longitude: -74.0060, country: 'United States',       countryAr: 'الولايات المتحدة' },
  { name: 'Los Angeles',  nameAr: 'لوس أنجلوس',          latitude: 34.0522,  longitude: -118.2437,country: 'United States',       countryAr: 'الولايات المتحدة' },
  { name: 'Toronto',      nameAr: 'تورونتو',             latitude: 43.6532,  longitude: -79.3832, country: 'Canada',              countryAr: 'كندا' },
  { name: 'Sydney',       nameAr: 'سيدني',               latitude: -33.8688, longitude: 151.2093, country: 'Australia',           countryAr: 'أستراليا' },
  { name: 'Karachi',      nameAr: 'كراتشي',              latitude: 24.8607,  longitude: 67.0011,  country: 'Pakistan',            countryAr: 'باكستان' },
  { name: 'Dhaka',        nameAr: 'دكا',                latitude: 23.8103,  longitude: 90.4125,  country: 'Bangladesh',          countryAr: 'بنغلاديش' },
  { name: 'Casablanca',   nameAr: 'الدار البيضاء',       latitude: 33.5731,  longitude: -7.5898,  country: 'Morocco',             countryAr: 'المغرب' },
  { name: 'Tunis',        nameAr: 'تونس',                latitude: 36.8065,  longitude: 10.1815,  country: 'Tunisia',             countryAr: 'تونس' },
  { name: 'Algiers',      nameAr: 'الجزائر',              latitude: 36.7538,  longitude: 3.0588,   country: 'Algeria',             countryAr: 'الجزائر' },
  { name: 'Rabat',        nameAr: 'الرباط',               latitude: 33.9716,  longitude: -6.8498,  country: 'Morocco',             countryAr: 'المغرب' },
];

// ─────────────────────────────────────────────────────────────────────
// Method name mapping for user display
// ─────────────────────────────────────────────────────────────────────

export const CALCULATION_METHODS: Record<CalculationMethodKey, { label: string; labelAr: string; params: CalculationParameters }> = {
  ummalqura: {
    label: 'Umm Al-Qura (Makkah)',
    labelAr: 'أم القرى (مكة المكرمة)',
    params: CalculationMethod.UmmAlQura(),
  },
  muslimworldleague: {
    label: 'Muslim World League',
    labelAr: 'رابطة العالم الإسلامي',
    params: CalculationMethod.MuslimWorldLeague(),
  },
  egyptian: {
    label: 'Egyptian General Authority',
    labelAr: 'الهيئة المصرية العامة للمساحة',
    params: CalculationMethod.Egyptian(),
  },
  karachi: {
    label: 'University of Islamic Sciences (Karachi)',
    labelAr: 'جامعة العلوم الإسلامية (كراتشي)',
    params: CalculationMethod.Karachi(),
  },
  dubai: {
    label: 'Dubai (UAE)',
    labelAr: 'دبي (الإمارات)',
    params: CalculationMethod.Dubai(),
  },
  kwt: {
    label: 'Kuwait',
    labelAr: 'الكويت',
    params: CalculationMethod.Kuwait(),
  },
  mwl: {
    label: 'Moroccan',
    labelAr: 'المغرب',
    params: CalculationMethod.Morocco(),
  },
  qatar: {
    label: 'Qatar',
    labelAr: 'قطر',
    params: CalculationMethod.Qatar(),
  },
  singapore: {
    label: 'Singapore',
    labelAr: 'سنغافورة',
    params: CalculationMethod.Singapore(),
  },
  tehran: {
    label: 'Tehran',
    labelAr: 'طهران',
    params: CalculationMethod.Tehran(),
  },
  northamerica: {
    label: 'North America (ISNA)',
    labelAr: 'أمريكا الشمالية',
    params: CalculationMethod.NorthAmerica(),
  },
  custom: {
    label: 'Custom',
    labelAr: 'مخصص',
    params: CalculationMethod.Other(),
  },
};

// ─────────────────────────────────────────────────────────────────────
// Service Class
// ─────────────────────────────────────────────────────────────────────

export class PrayerTimeService {
  private config: PrayerServiceConfig;
  private _prayerTimes: PrayerTimes | null = null;
  private _lastDate: string = '';

  constructor(config: PrayerServiceConfig) {
    this.config = { ...config };
  }

  // ── Getters ──────────────────────────────────────────────────────

  get coordinates(): Coordinates {
    return this.config.coordinates;
  }

  get method(): CalculationMethodKey {
    return this.config.calculationMethod;
  }

  get prayerTimes(): PrayerTimes | null {
    return this._prayerTimes;
  }

  // ── Configuration ────────────────────────────────────────────────

  updateCoordinates(latitude: number, longitude: number): void {
    this.config.coordinates = new Coordinates(latitude, longitude);
    this._prayerTimes = null;
    this._lastDate = '';
  }

  updateMethod(method: CalculationMethodKey): void {
    this.config.calculationMethod = method;
    this._prayerTimes = null;
    this._lastDate = '';
  }

  setAdjustments(adjustments: Partial<Record<Prayer, number>>): void {
    this.config.adjustments = adjustments;
    this._prayerTimes = null;
    this._lastDate = '';
  }

  setHighLatitudeRule(rule: HighLatitudeRule): void {
    this.config.highLatitudeRule = rule;
    this._prayerTimes = null;
    this._lastDate = '';
  }

  // ── Calculation ──────────────────────────────────────────────────

  /**
   * Calculate prayer times for a given date (defaults to today).
   * Caches result for the same date to avoid recalculation.
   */
  private calculate(date: Date = new Date()): PrayerTimes {
    const dateKey = date.toISOString().split('T')[0];

    if (this._prayerTimes && this._lastDate === dateKey) {
      return this._prayerTimes;
    }

    const params = CALCULATION_METHODS[this.config.calculationMethod].params;

    // Apply custom adjustments if provided
    if (this.config.adjustments) {
      const adj = this.config.adjustments;
      if (adj.fajr !== undefined) params.adjustments.fajr = adj.fajr;
      if (adj.sunrise !== undefined) params.adjustments.sunrise = adj.sunrise;
      if (adj.dhuhr !== undefined) params.adjustments.dhuhr = adj.dhuhr;
      if (adj.asr !== undefined) params.adjustments.asr = adj.asr;
      if (adj.maghrib !== undefined) params.adjustments.maghrib = adj.maghrib;
      if (adj.isha !== undefined) params.adjustments.isha = adj.isha;
    }

    // Apply high-latitude rule
    if (this.config.highLatitudeRule) {
      params.highLatitudeRule = this.config.highLatitudeRule;
    }

    this._prayerTimes = new PrayerTimes(this.config.coordinates, date, params);
    this._lastDate = dateKey;
    return this._prayerTimes;
  }

  /**
   * Get formatted prayer times for a given date.
   * Returns all five prayers + sunrise as Date objects.
   */
  getPrayerTimes(date?: Date): PrayerTimeResult {
    const pt = this.calculate(date ?? new Date());

    return {
      fajr: pt.fajr,
      sunrise: pt.sunrise,
      dhuhr: pt.dhuhr,
      asr: pt.asr,
      maghrib: pt.maghrib,
      isha: pt.isha,
    };
  }

  /**
   * Format a Date object to a time string (HH:MM AM/PM or 24h).
   */
  formatTime(date: Date, use24h: boolean = false): string {
    const hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, '0');

    if (use24h) {
      return `${hours.toString().padStart(2, '0')}:${minutes}`;
    }

    const period = hours >= 12 ? 'PM' : 'AM';
    const h12 = hours % 12 || 12;
    return `${h12}:${minutes} ${period}`;
  }

  /**
   * Get all prayer times as formatted strings.
   */
  getFormattedPrayerTimes(use24h: boolean = false, date?: Date): Record<string, string> {
    const times = this.getPrayerTimes(date);
    const result: Record<string, string> = {};

    for (const [key, value] of Object.entries(times)) {
      result[key] = this.formatTime(value, use24h);
    }

    return result;
  }

  // ── Next Prayer ──────────────────────────────────────────────────

  /**
   * Determine which prayer is next (or current) based on current time.
   * Returns the prayer name, its time, and milliseconds until it starts.
   * If a prayer time has already passed, returns the next one.
   * If all have passed, returns Fajr of the next day.
   */
  getNextPrayer(date?: Date): NextPrayerInfo {
    const now = date ?? new Date();
    const pt = this.calculate(now);

    // Prayer order we care about
    const prayerEntries: { name: string; time: Date }[] = [
      { name: 'Fajr',       time: pt.fajr },
      { name: 'Sunrise',    time: pt.sunrise },
      { name: 'Dhuhr',      time: pt.dhuhr },
      { name: 'Asr',        time: pt.asr },
      { name: 'Maghrib',    time: pt.maghrib },
      { name: 'Isha',       time: pt.isha },
    ];

    // Find the first prayer whose time is still in the future
    for (const entry of prayerEntries) {
      if (entry.time > now) {
        return {
          prayerName: entry.name,
          prayerTime: entry.time,
          timeUntil: entry.time.getTime() - now.getTime(),
        };
      }
    }

    // All prayers for today have passed → return tomorrow's Fajr
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowPt = this.calculate(tomorrow);

    return {
      prayerName: 'Fajr',
      prayerTime: tomorrowPt.fajr,
      timeUntil: tomorrowPt.fajr.getTime() - now.getTime(),
    };
  }

  /**
   * Get the time remaining until the next prayer, formatted as an object.
   */
  getTimeUntilNextPrayer(date?: Date): { hours: number; minutes: number; seconds: number; totalMs: number } {
    const next = this.getNextPrayer(date);
    const ms = next.timeUntil;

    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return { hours, minutes, seconds, totalMs: ms };
  }

  /**
   * Get a human-readable string for the time until next prayer.
   */
  getTimeUntilNextPrayerString(date?: Date): string {
    const { hours, minutes, seconds } = this.getTimeUntilNextPrayer(date);
    const parts: string[] = [];

    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    parts.push(`${seconds}s`);

    return parts.join(' ');
  }

  // ── Qibla Direction ──────────────────────────────────────────────

  /**
   * Get Qibla direction from the current coordinates, in degrees clockwise from North.
   */
  getQiblaDirection(): number {
    return Qibla(this.config.coordinates);
  }

  // ── City List ────────────────────────────────────────────────────

  /**
   * Get the built-in list of cities.
   */
  getCityList(): CityInfo[] {
    return DEFAULT_CITIES;
  }

  /**
   * Find a city by its Arabic or English name (partial match).
   */
  findCity(query: string): CityInfo[] {
    const lower = query.toLowerCase();
    return DEFAULT_CITIES.filter(
      (c) =>
        c.name.toLowerCase().includes(lower) ||
        c.nameAr.includes(query) ||
        c.country.toLowerCase().includes(lower) ||
        c.countryAr.includes(query),
    );
  }

  /**
   * Add a custom city (will not be persisted across app restarts unless saved by the caller).
   */
  static createCity(info: Omit<CityInfo, 'countryAr' | 'nameAr'> & { nameAr?: string; countryAr?: string }): CityInfo {
    return {
      name: info.name,
      nameAr: info.nameAr ?? info.name,
      latitude: info.latitude,
      longitude: info.longitude,
      country: info.country,
      countryAr: info.countryAr ?? info.country,
    };
  }

  // ── Static Convenience ───────────────────────────────────────────

  /**
   * Create a pre-configured service for a known city.
   */
  static forCity(
    city: CityInfo,
    method: CalculationMethodKey = 'ummalqura',
    adjustments?: Partial<Record<Prayer, number>>,
  ): PrayerTimeService {
    return new PrayerTimeService({
      coordinates: new Coordinates(city.latitude, city.longitude),
      calculationMethod: method,
      adjustments,
    });
  }

  /**
   * Get prayer names in Arabic.
   */
  static prayerNameAr(name: string): string {
    const map: Record<string, string> = {
      Fajr: 'الفجر',
      Sunrise: 'الشروق',
      Dhuhr: 'الظهر',
      Asr: 'العصر',
      Maghrib: 'المغرب',
      Isha: 'العشاء',
    };
    return map[name] ?? name;
  }

  /**
   * Get prayer names in English.
   */
  static prayerNameEn(name: string): string {
    const map: Record<string, string> = {
      Fajr: 'Fajr',
      Sunrise: 'Sunrise',
      Dhuhr: 'Dhuhr',
      Asr: 'Asr',
      Maghrib: 'Maghrib',
      Isha: 'Isha',
    };
    return map[name] ?? name;
  }
}

export default PrayerTimeService;
