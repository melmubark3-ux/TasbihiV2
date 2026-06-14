/**
 * StorageService
 * --------------
 * AsyncStorage wrapper for the Tasbihi app.
 * Handles persistence of:
 *  - Tasbih (counting) statistics
 *  - App settings (city, calculation method, theme, language, etc.)
 *  - Adhkar (remembrance) progress tracking
 *
 * All keys are namespaced with a `@tasbihi/` prefix to avoid collisions.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// ─────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────

/** A single tasbih entry / session */
export interface TasbihSession {
  id: string;
  /** Arabic phrase or title (e.g. 'سبحان الله') */
  phrase: string;
  /** Target count (default: 33 or 100) */
  targetCount: number;
  /** Actual count achieved */
  count: number;
  /** Timestamp when started */
  startedAt: string; // ISO string
  /** Timestamp when completed / last updated */
  updatedAt: string; // ISO string
  /** Whether the session was completed (count >= target) */
  completed: boolean;
}

/** Aggregated per-phrase statistics */
export interface TasbihStats {
  /** Phrase text (e.g. 'سبحان الله') */
  phrase: string;
  /** Total count across all sessions */
  totalCount: number;
  /** Number of completed sessions */
  completedSessions: number;
  /** Total number of sessions */
  totalSessions: number;
  /** Today's count for this phrase */
  todayCount: number;
  /** Last used date */
  lastUsed: string; // ISO date string
}

/** Overall dashboard statistics */
export interface TasbihDashboardStats {
  /** Total count across all phrases ever */
  grandTotal: number;
  /** Sessions completed today */
  todayCompletedSessions: number;
  /** Total sessions ever */
  totalSessions: number;
  /** Total completed sessions ever */
  totalCompletedSessions: number;
  /** Current streak in days */
  streak: number;
  /** Longest streak */
  longestStreak: number;
  /** Last active date (YYYY-MM-DD) for streak calculation */
  lastActiveDate: string | null;
  /** Per-phrase stats */
  perPhrase: TasbihStats[];
}

/** App settings */
export interface AppSettings {
  /** Selected city identifier (name or custom id) */
  selectedCity: string | null;
  /** Latitude (manual override) */
  latitude: number | null;
  /** Longitude (manual override) */
  longitude: number | null;
  /** Calculation method key */
  calculationMethod: string;
  /** Theme: 'light' | 'dark' | 'system' */
  theme: 'light' | 'dark' | 'system';
  /** Preferred language: 'ar' | 'en' */
  language: 'ar' | 'en';
  /** Use 24-hour format for times */
  use24h: boolean;
  /** Enable Athan notifications */
  athanNotifications: boolean;
  /** Enable Adhkar reminders */
  adhkarReminders: boolean;
  /** Adhkar morning reminder hour */
  adhkarMorningHour: number;
  /** Adhkar morning reminder minute */
  adhkarMorningMinute: number;
  /** Adhkar evening reminder hour */
  adhkarEveningHour: number;
  /** Adhkar evening reminder minute */
  adhkarEveningMinute: number;
  /** Sound enabled for tasbih clicks */
  tasbihSound: boolean;
  /** Vibration enabled for tasbih target reached */
  tasbihVibration: boolean;
  /** Default tasbih target count */
  defaultTargetCount: number;
}

/** Adhkar (remembrance) progress for the day */
export interface AdhkarProgress {
  /** Date string (YYYY-MM-DD) */
  date: string;
  /** Morning adhkar checked / completed */
  morningCompleted: boolean;
  /** Evening adhkar checked / completed */
  eveningCompleted: boolean;
  /** Timestamps of completion */
  morningCompletedAt: string | null;
  eveningCompletedAt: string | null;
  /** Count of morning adhkar items read (e.g. 3/10) */
  morningCount: number;
  /** Total morning items available */
  morningTotal: number;
  /** Count of evening adhkar items read */
  eveningCount: number;
  /** Total evening items available */
  eveningTotal: number;
}

/** User profile / badge data */
export interface UserProfile {
  /** Display name */
  name: string;
  /** Avatar emoji or URI */
  avatar: string;
  /** Total hours spent in dhikr (approximate) */
  totalHours: number;
  /** Achievements / badges earned */
  badges: string[];
  /** Date joined (ISO) */
  joinedAt: string;
}

// ─────────────────────────────────────────────────────────────────────
// Defaults
// ─────────────────────────────────────────────────────────────────────

export const DEFAULT_SETTINGS: AppSettings = {
  selectedCity: null,
  latitude: null,
  longitude: null,
  calculationMethod: 'ummalqura',
  theme: 'system',
  language: 'ar',
  use24h: false,
  athanNotifications: true,
  adhkarReminders: true,
  adhkarMorningHour: 6,
  adhkarMorningMinute: 0,
  adhkarEveningHour: 17,
  adhkarEveningMinute: 0,
  tasbihSound: true,
  tasbihVibration: true,
  defaultTargetCount: 33,
};

export const DEFAULT_ADHKAR_PROGRESS = (date?: string): AdhkarProgress => ({
  date: date ?? new Date().toISOString().split('T')[0],
  morningCompleted: false,
  eveningCompleted: false,
  morningCompletedAt: null,
  eveningCompletedAt: null,
  morningCount: 0,
  morningTotal: 10,
  eveningCount: 0,
  eveningTotal: 10,
});

// ─────────────────────────────────────────────────────────────────────
// Storage Keys
// ─────────────────────────────────────────────────────────────────────

const KEYS = {
  SETTINGS: '@tasbihi/settings',
  TASBIH_SESSIONS: '@tasbihi/tasbih_sessions',
  TASBIH_STATS: '@tasbihi/tasbih_stats',
  DASHBOARD_STATS: '@tasbihi/dashboard_stats',
  ADHKAR_PROGRESS: '@tasbihi/adhkar_progress',
  USER_PROFILE: '@tasbihi/user_profile',
  LAST_ACTIVE_DATE: '@tasbihi/last_active_date',
  CUSTOM_CITIES: '@tasbihi/custom_cities',
} as const;

// ─────────────────────────────────────────────────────────────────────
// Service Class
// ─────────────────────────────────────────────────────────────────────

export class StorageService {
  // ── Settings ──────────────────────────────────────────────────────

  /**
   * Save full app settings.
   */
  async saveSettings(settings: AppSettings): Promise<void> {
    try {
      const json = JSON.stringify(settings);
      await AsyncStorage.setItem(KEYS.SETTINGS, json);
    } catch (error) {
      console.error('[StorageService] saveSettings error:', error);
      throw error;
    }
  }

  /**
   * Get app settings, falling back to defaults for missing keys.
   */
  async getSettings(): Promise<AppSettings> {
    try {
      const json = await AsyncStorage.getItem(KEYS.SETTINGS);
      if (!json) {
        return { ...DEFAULT_SETTINGS };
      }
      const parsed = JSON.parse(json);
      // Merge with defaults to handle new keys added in future versions
      return { ...DEFAULT_SETTINGS, ...parsed };
    } catch (error) {
      console.error('[StorageService] getSettings error:', error);
      return { ...DEFAULT_SETTINGS };
    }
  }

  /**
   * Update specific setting fields without overwriting the entire object.
   */
  async updateSettings(partial: Partial<AppSettings>): Promise<AppSettings> {
    const current = await this.getSettings();
    const updated: AppSettings = { ...current, ...partial };
    await this.saveSettings(updated);
    return updated;
  }

  // ── Tasbih Sessions ──────────────────────────────────────────────

  /**
   * Save a tasbih session (create or update by id).
   */
  async saveTasbihSession(session: TasbihSession): Promise<void> {
    try {
      const sessions = await this.getAllTasbihSessions();
      const index = sessions.findIndex((s) => s.id === session.id);

      if (index >= 0) {
        sessions[index] = session;
      } else {
        sessions.push(session);
      }

      // Keep only the last 500 sessions to avoid unbounded storage
      const trimmed = sessions.slice(-500);
      await AsyncStorage.setItem(KEYS.TASBIH_SESSIONS, JSON.stringify(trimmed));

      // Update aggregate stats after saving a session
      await this.recalculateStats();
    } catch (error) {
      console.error('[StorageService] saveTasbihSession error:', error);
      throw error;
    }
  }

  /**
   * Get all tasbih sessions.
   */
  async getAllTasbihSessions(): Promise<TasbihSession[]> {
    try {
      const json = await AsyncStorage.getItem(KEYS.TASBIH_SESSIONS);
      if (!json) return [];
      return JSON.parse(json) as TasbihSession[];
    } catch (error) {
      console.error('[StorageService] getAllTasbihSessions error:', error);
      return [];
    }
  }

  /**
   * Get today's sessions.
   */
  async getTodaySessions(): Promise<TasbihSession[]> {
    const all = await this.getAllTasbihSessions();
    const today = new Date().toISOString().split('T')[0];
    return all.filter((s) => s.updatedAt.startsWith(today));
  }

  /**
   * Delete a specific session by id.
   */
  async deleteTasbihSession(id: string): Promise<void> {
    try {
      const sessions = await this.getAllTasbihSessions();
      const filtered = sessions.filter((s) => s.id !== id);
      await AsyncStorage.setItem(KEYS.TASBIH_SESSIONS, JSON.stringify(filtered));
      await this.recalculateStats();
    } catch (error) {
      console.error('[StorageService] deleteTasbihSession error:', error);
      throw error;
    }
  }

  /**
   * Clear all tasbih sessions (dangerous!).
   */
  async clearAllSessions(): Promise<void> {
    try {
      await AsyncStorage.removeItem(KEYS.TASBIH_SESSIONS);
      await AsyncStorage.removeItem(KEYS.TASBIH_STATS);
      await AsyncStorage.removeItem(KEYS.DASHBOARD_STATS);
      await AsyncStorage.removeItem(KEYS.LAST_ACTIVE_DATE);
    } catch (error) {
      console.error('[StorageService] clearAllSessions error:', error);
      throw error;
    }
  }

  // ── Tasbih Stats ─────────────────────────────────────────────────

  /**
   * Save per-phrase tasbih stats directly.
   */
  async saveTasbihStats(stats: TasbihStats[]): Promise<void> {
    try {
      await AsyncStorage.setItem(KEYS.TASBIH_STATS, JSON.stringify(stats));
    } catch (error) {
      console.error('[StorageService] saveTasbihStats error:', error);
      throw error;
    }
  }

  /**
   * Get per-phrase tasbih statistics.
   */
  async getTasbihStats(): Promise<TasbihStats[]> {
    try {
      const json = await AsyncStorage.getItem(KEYS.TASBIH_STATS);
      if (!json) return [];
      return JSON.parse(json) as TasbihStats[];
    } catch (error) {
      console.error('[StorageService] getTasbihStats error:', error);
      return [];
    }
  }

  /**
   * Get aggregated dashboard statistics.
   */
  async getDashboardStats(): Promise<TasbihDashboardStats> {
    try {
      const json = await AsyncStorage.getItem(KEYS.DASHBOARD_STATS);
      if (!json) {
        // Calculate from scratch if not cached
        return await this.recalculateStats();
      }
      return JSON.parse(json) as TasbihDashboardStats;
    } catch (error) {
      console.error('[StorageService] getDashboardStats error:', error);
      return await this.recalculateStats();
    }
  }

  /**
   * Recalculate all statistics from session data.
   * Called automatically after any session mutation.
   */
  async recalculateStats(): Promise<TasbihDashboardStats> {
    const sessions = await this.getAllTasbihSessions();
    const today = new Date().toISOString().split('T')[0];

    // Build per-phrase map
    const phraseMap = new Map<string, {
      totalCount: number;
      completedSessions: number;
      totalSessions: number;
      todayCount: number;
      lastUsed: string;
    }>();

    let grandTotal = 0;
    let todayCompletedSessions = 0;
    let totalCompletedSessions = 0;

    for (const session of sessions) {
      const existing = phraseMap.get(session.phrase) ?? {
        totalCount: 0,
        completedSessions: 0,
        totalSessions: 0,
        todayCount: 0,
        lastUsed: session.updatedAt,
      };

      existing.totalCount += session.count;
      existing.totalSessions += 1;
      if (session.completed) existing.completedSessions += 1;
      if (session.updatedAt.startsWith(today)) existing.todayCount += session.count;
      if (session.updatedAt > existing.lastUsed) existing.lastUsed = session.updatedAt;

      phraseMap.set(session.phrase, existing);

      grandTotal += session.count;
      if (session.completed && session.updatedAt.startsWith(today)) {
        todayCompletedSessions += 1;
      }
      if (session.completed) totalCompletedSessions += 1;
    }

    // Calculate streak
    const lastActive = await this.getLastActiveDate();
    const streak = this.calculateStreak(lastActive, sessions);

    const perPhrase: TasbihStats[] = Array.from(phraseMap.entries()).map(
      ([phrase, data]) => ({
        phrase,
        totalCount: data.totalCount,
        completedSessions: data.completedSessions,
        totalSessions: data.totalSessions,
        todayCount: data.todayCount,
        lastUsed: data.lastUsed,
      }),
    );

    const dashboard: TasbihDashboardStats = {
      grandTotal,
      todayCompletedSessions,
      totalSessions: sessions.length,
      totalCompletedSessions,
      streak: streak.current,
      longestStreak: streak.longest,
      lastActiveDate: lastActive,
      perPhrase,
    };

    // Cache dashboard
    await AsyncStorage.setItem(KEYS.DASHBOARD_STATS, JSON.stringify(dashboard));
    await AsyncStorage.setItem(KEYS.TASBIH_STATS, JSON.stringify(perPhrase));

    // Update last active date
    const todayStr = new Date().toISOString().split('T')[0];
    await this.setLastActiveDate(todayStr);

    return dashboard;
  }

  // ── Streak Calculation ───────────────────────────────────────────

  /**
   * Calculate the current and longest streak.
   */
  private calculateStreak(
    lastActiveDate: string | null,
    sessions: TasbihSession[],
  ): { current: number; longest: number } {
    if (sessions.length === 0) {
      return { current: 0, longest: 0 };
    }

    // Collect unique active dates
    const activeDates = new Set<string>();
    for (const session of sessions) {
      const date = session.updatedAt.split('T')[0];
      activeDates.add(date);
    }

    const sortedDates = Array.from(activeDates).sort().reverse();

    if (sortedDates.length === 0) {
      return { current: 0, longest: 0 };
    }

    // Calculate current streak
    const today = new Date().toISOString().split('T')[0];
    let currentStreak = 0;

    if (sortedDates[0] === today) {
      currentStreak = 1;
      for (let i = 1; i < sortedDates.length; i++) {
        const prevDate = new Date(sortedDates[i - 1]);
        const currDate = new Date(sortedDates[i]);
        const diffDays = this.daysBetween(prevDate, currDate);

        if (diffDays === 1) {
          currentStreak++;
        } else {
          break;
        }
      }
    }

    // Calculate longest streak
    let longestStreak = 1;
    let tempStreak = 1;

    for (let i = 1; i < sortedDates.length; i++) {
      const prevDate = new Date(sortedDates[i - 1]);
      const currDate = new Date(sortedDates[i]);
      const diffDays = this.daysBetween(prevDate, currDate);

      if (diffDays === 1) {
        tempStreak++;
        longestStreak = Math.max(longestStreak, tempStreak);
      } else {
        tempStreak = 1;
      }
    }

    // Also consider the current streak for longest
    longestStreak = Math.max(longestStreak, currentStreak);

    return { current: currentStreak, longest: longestStreak };
  }

  /**
   * Get the absolute number of days between two dates (ignoring time).
   */
  private daysBetween(a: Date, b: Date): number {
    const aNorm = new Date(a.getFullYear(), a.getMonth(), a.getDate());
    const bNorm = new Date(b.getFullYear(), b.getMonth(), b.getDate());
    const diffMs = Math.abs(aNorm.getTime() - bNorm.getTime());
    return Math.round(diffMs / (1000 * 60 * 60 * 24));
  }

  // ── Last Active Date ─────────────────────────────────────────────

  async getLastActiveDate(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(KEYS.LAST_ACTIVE_DATE);
    } catch {
      return null;
    }
  }

  async setLastActiveDate(date: string): Promise<void> {
    try {
      await AsyncStorage.setItem(KEYS.LAST_ACTIVE_DATE, date);
    } catch (error) {
      console.error('[StorageService] setLastActiveDate error:', error);
    }
  }

  // ── Adhkar Progress ──────────────────────────────────────────────

  /**
   * Save adhkar progress for a specific date.
   */
  async saveAdhkarProgress(progress: AdhkarProgress): Promise<void> {
    try {
      const allProgress = await this.getAllAdhkarProgress();
      const index = allProgress.findIndex((p) => p.date === progress.date);

      if (index >= 0) {
        allProgress[index] = progress;
      } else {
        allProgress.push(progress);
      }

      // Keep only last 90 days
      const trimmed = allProgress.slice(-90);
      await AsyncStorage.setItem(KEYS.ADHKAR_PROGRESS, JSON.stringify(trimmed));
    } catch (error) {
      console.error('[StorageService] saveAdhkarProgress error:', error);
      throw error;
    }
  }

  /**
   * Get adhkar progress for today.
   */
  async getTodayAdhkarProgress(): Promise<AdhkarProgress> {
    const today = new Date().toISOString().split('T')[0];
    return this.getAdhkarProgressForDate(today);
  }

  /**
   * Get adhkar progress for a specific date.
   */
  async getAdhkarProgressForDate(date: string): Promise<AdhkarProgress> {
    try {
      const allProgress = await this.getAllAdhkarProgress();
      const found = allProgress.find((p) => p.date === date);
      return found ?? DEFAULT_ADHKAR_PROGRESS(date);
    } catch {
      return DEFAULT_ADHKAR_PROGRESS(date);
    }
  }

  /**
   * Get all adhkar progress entries.
   */
  async getAllAdhkarProgress(): Promise<AdhkarProgress[]> {
    try {
      const json = await AsyncStorage.getItem(KEYS.ADHKAR_PROGRESS);
      if (!json) return [];
      return JSON.parse(json) as AdhkarProgress[];
    } catch (error) {
      console.error('[StorageService] getAllAdhkarProgress error:', error);
      return [];
    }
  }

  /**
   * Mark morning adhkar as completed for today.
   */
  async completeMorningAdhkar(
    count?: number,
    total?: number,
  ): Promise<AdhkarProgress> {
    const progress = await this.getTodayAdhkarProgress();
    progress.morningCompleted = true;
    progress.morningCompletedAt = new Date().toISOString();
    if (count !== undefined) progress.morningCount = count;
    if (total !== undefined) progress.morningTotal = total;
    await this.saveAdhkarProgress(progress);
    return progress;
  }

  /**
   * Mark evening adhkar as completed for today.
   */
  async completeEveningAdhkar(
    count?: number,
    total?: number,
  ): Promise<AdhkarProgress> {
    const progress = await this.getTodayAdhkarProgress();
    progress.eveningCompleted = true;
    progress.eveningCompletedAt = new Date().toISOString();
    if (count !== undefined) progress.eveningCount = count;
    if (total !== undefined) progress.eveningTotal = total;
    await this.saveAdhkarProgress(progress);
    return progress;
  }

  /**
   * Get adhkar completion stats for the current week.
   */
  async getWeeklyAdhkarStats(): Promise<{
    completedDays: number;
    totalDays: number;
    morningsCompleted: number;
    eveningsCompleted: number;
  }> {
    const allProgress = await this.getAllAdhkarProgress();
    const today = new Date();
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    const weekKey = weekAgo.toISOString().split('T')[0];
    const weekProgress = allProgress.filter((p) => p.date >= weekKey);

    const morningsCompleted = weekProgress.filter((p) => p.morningCompleted).length;
    const eveningsCompleted = weekProgress.filter((p) => p.eveningCompleted).length;
    const completedDays = weekProgress.filter(
      (p) => p.morningCompleted || p.eveningCompleted,
    ).length;

    return {
      completedDays,
      totalDays: 7,
      morningsCompleted,
      eveningsCompleted,
    };
  }

  // ── User Profile ─────────────────────────────────────────────────

  async saveUserProfile(profile: UserProfile): Promise<void> {
    try {
      await AsyncStorage.setItem(KEYS.USER_PROFILE, JSON.stringify(profile));
    } catch (error) {
      console.error('[StorageService] saveUserProfile error:', error);
      throw error;
    }
  }

  async getUserProfile(): Promise<UserProfile | null> {
    try {
      const json = await AsyncStorage.getItem(KEYS.USER_PROFILE);
      if (!json) return null;
      return JSON.parse(json) as UserProfile;
    } catch (error) {
      console.error('[StorageService] getUserProfile error:', error);
      return null;
    }
  }

  // ── Custom Cities ────────────────────────────────────────────────

  /**
   * Save user-added custom cities.
   */
  async saveCustomCities(
    cities: Array<{ name: string; nameAr: string; latitude: number; longitude: number; country: string; countryAr: string }>,
  ): Promise<void> {
    try {
      await AsyncStorage.setItem(KEYS.CUSTOM_CITIES, JSON.stringify(cities));
    } catch (error) {
      console.error('[StorageService] saveCustomCities error:', error);
      throw error;
    }
  }

  async getCustomCities(): Promise<
    Array<{ name: string; nameAr: string; latitude: number; longitude: number; country: string; countryAr: string }>
  > {
    try {
      const json = await AsyncStorage.getItem(KEYS.CUSTOM_CITIES);
      if (!json) return [];
      return JSON.parse(json);
    } catch {
      return [];
    }
  }

  // ── Bulk Operations ──────────────────────────────────────────────

  /**
   * Clear ALL app data (factory reset).
   */
  async clearAll(): Promise<void> {
    try {
      const keys = Object.values(KEYS);
      await AsyncStorage.multiRemove(keys);
      console.log('[StorageService] All data cleared');
    } catch (error) {
      console.error('[StorageService] clearAll error:', error);
      throw error;
    }
  }

  /**
   * Get total storage size estimate (number of stored keys).
   */
  async getStorageInfo(): Promise<{ keys: number; estimatedBytes: number }> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const tasbihiKeys = keys.filter((k) => k.startsWith('@tasbihi/'));
      let totalBytes = 0;

      for (const key of tasbihiKeys) {
        const value = await AsyncStorage.getItem(key);
        if (value) {
          totalBytes += key.length + value.length;
        }
      }

      return {
        keys: tasbihiKeys.length,
        estimatedBytes: totalBytes * 2, // UTF-16 -> rough byte estimate
      };
    } catch {
      return { keys: 0, estimatedBytes: 0 };
    }
  }

  /**
   * Export all data as JSON (for backup).
   */
  async exportData(): Promise<string> {
    try {
      const data: Record<string, any> = {};

      for (const [key, storageKey] of Object.entries(KEYS)) {
        const value = await AsyncStorage.getItem(storageKey);
        if (value) {
          try {
            data[key] = JSON.parse(value);
          } catch {
            data[key] = value;
          }
        }
      }

      data._exportedAt = new Date().toISOString();
      data._version = 1;

      return JSON.stringify(data, null, 2);
    } catch (error) {
      console.error('[StorageService] exportData error:', error);
      throw error;
    }
  }

  /**
   * Import data from a JSON backup (overwrites existing data).
   */
  async importData(json: string): Promise<boolean> {
    try {
      const data = JSON.parse(json);

      for (const [key, value] of Object.entries(data)) {
        if (key.startsWith('_')) continue; // skip metadata

        const storageKey = (KEYS as any)[key];
        if (storageKey) {
          await AsyncStorage.setItem(storageKey, JSON.stringify(value));
        }
      }

      return true;
    } catch (error) {
      console.error('[StorageService] importData error:', error);
      return false;
    }
  }
}

export default StorageService;
