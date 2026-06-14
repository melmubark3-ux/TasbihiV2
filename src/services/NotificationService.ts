/**
 * NotificationService
 * -------------------
 * Manages Athan (call to prayer) notifications and Adhkar (remembrance) reminders
 * using @notifee/react-native.
 *
 * Features:
 * - Athan channel with custom sound from raw/athan.mp3
 * - Reminder channel for adhkar
 * - Schedule notifications for all 5 daily prayers
 * - Cancel / reschedule all notifications
 * - Test notification sender
 * - Adhkar (morning/evening) reminders
 */

import notifee, {
  AndroidImportance,
  AndroidCategory,
  AndroidSound,
  TimestampTrigger,
  TriggerType,
  RepeatFrequency,
  Notification,
  AndroidNotificationSetting,
} from '@notifee/react-native';
import { Platform, PermissionsAndroid } from 'react-native';

// ─────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────

export interface PrayerNotificationSchedule {
  prayerName: string;
  prayerNameAr: string;
  hour: number;
  minute: number;
  /** Unique ID per prayer so it can be individually managed */
  id: string;
}

export interface AdhkarReminderConfig {
  enabled: boolean;
  morningHour: number;   // default: 6
  morningMinute: number; // default: 0
  eveningHour: number;   // default: 17
  eveningMinute: number; // default: 0
  intervalMinutes?: number; // if > 0, repeat every N minutes instead of once
}

export interface NotificationServiceConfig {
  /** Prayer schedule for the day — will be recalculated daily */
  prayerSchedule: PrayerNotificationSchedule[];
  adhkarReminder: AdhkarReminderConfig;
  /** Whether to show a heads-up (pop-up) notification */
  headsUp: boolean;
}

// ─────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────

const CHANNEL_ATHAN = 'athan-channel';
const CHANNEL_ADHKAR = 'adhkar-channel';
const CHANNEL_REMINDER = 'reminder-channel';

const CHANNEL_NAMES = {
  [CHANNEL_ATHAN]: 'الأذان',
  [CHANNEL_ADHKAR]: 'الأذكار',
  [CHANNEL_REMINDER]: 'تذكير عام',
} as const;

const CHANNEL_DESCRIPTIONS = {
  [CHANNEL_ATHAN]: 'إشعارات أوقات الصلوات الخمس مع صوت الأذان',
  [CHANNEL_ADHKAR]: 'تذكير بأذكار الصباح والمساء',
  [CHANNEL_REMINDER]: 'تذكيرات عامة للتطبيق',
} as const;

// IDs are prefixed to avoid collisions with other notifications
const NOTIF_PREFIX = 'tasbihi_';
const PRAYER_NOTIF_PREFIX = `${NOTIF_PREFIX}prayer_`;
const ADHKAR_MORNING_ID = `${NOTIF_PREFIX}adhkar_morning`;
const ADHKAR_EVENING_ID = `${NOTIF_PREFIX}adhkar_evening`;

// ─────────────────────────────────────────────────────────────────────
// Service Class
// ─────────────────────────────────────────────────────────────────────

export class NotificationService {
  private config: NotificationServiceConfig;
  private channelsCreated: boolean = false;

  constructor(config: NotificationServiceConfig) {
    this.config = { ...config };
  }

  // ── Configuration ────────────────────────────────────────────────

  updateConfig(config: Partial<NotificationServiceConfig>): void {
    this.config = { ...this.config, ...config };
  }

  updatePrayerSchedule(schedule: PrayerNotificationSchedule[]): void {
    this.config.prayerSchedule = schedule;
  }

  updateAdhkarReminder(config: Partial<AdhkarReminderConfig>): void {
    this.config.adhkarReminder = { ...this.config.adhkarReminder, ...config };
  }

  // ── Channel Setup ────────────────────────────────────────────────

  /**
   * Create Android notification channels.
   * Must be called once on app startup (idempotent).
   */
  async createChannels(): Promise<void> {
    if (this.channelsCreated) return;

    try {
      // Athan channel — high importance for the call to prayer
      await notifee.createChannel({
        id: CHANNEL_ATHAN,
        name: CHANNEL_NAMES[CHANNEL_ATHAN],
        description: CHANNEL_DESCRIPTIONS[CHANNEL_ATHAN],
        importance: AndroidImportance.HIGH,
        sound: 'athan',
        vibration: true,
        vibrationPattern: [300, 500, 300, 500],
        lights: true,
        lightColor: '#1B5E20', // Islamic green
      });

      // Adhkar channel — default importance
      await notifee.createChannel({
        id: CHANNEL_ADHKAR,
        name: CHANNEL_NAMES[CHANNEL_ADHKAR],
        description: CHANNEL_DESCRIPTIONS[CHANNEL_ADHKAR],
        importance: AndroidImportance.DEFAULT,
        sound: 'default',
        vibration: true,
      });

      // General reminder channel
      await notifee.createChannel({
        id: CHANNEL_REMINDER,
        name: CHANNEL_NAMES[CHANNEL_REMINDER],
        description: CHANNEL_DESCRIPTIONS[CHANNEL_REMINDER],
        importance: AndroidImportance.DEFAULT,
        sound: 'default',
      });

      this.channelsCreated = true;
      console.log('[NotificationService] Channels created successfully');
    } catch (error) {
      console.error('[NotificationService] Failed to create channels:', error);
      throw error;
    }
  }

  // ── Permission Handling ──────────────────────────────────────────

  /**
   * Request notification permissions on Android 13+.
   * On older versions, permissions are granted at install time.
   */
  async requestPermissions(): Promise<boolean> {
    try {
      // Android 13+ (API 33+) requires POST_NOTIFICATIONS permission
      if (Platform.OS === 'android' && Platform.Version >= 33) {
        const granted = await PermissionsAndroid.request(
          'android.permission.POST_NOTIFICATIONS' as any,
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      }

      // iOS (handled by notifee)
      const settings = await notifee.requestPermission();
      return settings.authorizationStatus >= 1; // AUTHORIZED or PROVISIONAL
    } catch (error) {
      console.error('[NotificationService] Permission error:', error);
      return false;
    }
  }

  /**
   * Check if notification permissions are granted.
   */
  async hasPermission(): Promise<boolean> {
    try {
      if (Platform.OS === 'android' && Platform.Version >= 33) {
        const granted = await PermissionsAndroid.check(
          'android.permission.POST_NOTIFICATIONS' as any,
        );
        return granted;
      }

      const settings = await notifee.getNotificationSettings();
      return (
        settings.authorizationStatus >= 1
      );
    } catch {
      return false;
    }
  }

  // ── Creating Triggers ────────────────────────────────────────────

  /**
   * Create a daily timestamp trigger for a specific hour/minute.
   * If the time has already passed today, schedules for tomorrow.
   */
  private createDailyTrigger(
    hour: number,
    minute: number,
    second: number = 0,
  ): TimestampTrigger {
    const now = new Date();
    const triggerDate = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      hour,
      minute,
      second,
    );

    // If the time has passed today, schedule for tomorrow
    if (triggerDate.getTime() <= now.getTime()) {
      triggerDate.setDate(triggerDate.getDate() + 1);
    }

    return {
      type: TriggerType.TIMESTAMP,
      timestamp: triggerDate.getTime(),
      repeatFrequency: RepeatFrequency.DAILY,
      alarmManager: {
        allowWhileIdle: true,
      },
    };
  }

  // ── Prayer Notifications ────────────────────────────────────────

  /**
   * Schedule notifications for all 5 daily prayers.
   * Creates one notification per prayer with the Athan sound.
   */
  async scheduleAllPrayerNotifications(): Promise<void> {
    await this.ensureReady();

    // Cancel existing prayer notifications first
    await this.cancelPrayerNotifications();

    for (const prayer of this.config.prayerSchedule) {
      await this.scheduleSinglePrayerNotification(prayer);
    }

    console.log(
      `[NotificationService] Scheduled ${this.config.prayerSchedule.length} prayer notifications`,
    );
  }

  /**
   * Schedule a single prayer notification.
   */
  private async scheduleSinglePrayerNotification(
    prayer: PrayerNotificationSchedule,
  ): Promise<string> {
    const trigger = this.createDailyTrigger(prayer.hour, prayer.minute, 0);

    const notification: Notification = {
      title: `🕌 ${prayer.prayerNameAr}`,
      body: `حان الآن موعد صلاة ${prayer.prayerNameAr}`,
      android: {
        channelId: CHANNEL_ATHAN,
        channelImportance: AndroidImportance.HIGH,
        category: AndroidCategory.ALARM,
        sound: 'athan' as AndroidSound,
        pressAction: { id: 'default' },
        smallIcon: 'ic_notification',
        largeIcon: 'ic_launcher',
        color: '#1B5E20',
        lights: [27, 1000, 1000], // green, on 1s, off 1s
        fullScreenAction: {
          id: 'default',
          launchActivity: 'default',
        },
        // Heads-up / pop-up display
        asForegroundService: this.config.headsUp,
        ongoing: false,
        autoCancel: true,
        localOnly: true,
      },
      ios: {
        sound: 'athan.caf',
        categoryIdentifier: 'athan',
        foregroundPresentationOptions: {
          alert: true,
          badge: true,
          sound: true,
        },
        critical: true,
        criticalVolume: 1.0,
      },
      data: {
        type: 'prayer',
        prayerName: prayer.prayerName,
        prayerNameAr: prayer.prayerNameAr,
      },
    };

    await notifee.createTriggerNotification(notification, trigger);
    return prayer.id;
  }

  // ── Adhkar Reminders ─────────────────────────────────────────────

  /**
   * Schedule morning and evening adhkar reminders.
   */
  async scheduleAdhkarReminder(): Promise<void> {
    await this.ensureReady();

    // Cancel existing adhkar notifications
    await this.cancelAdhkarNotifications();

    const { morningHour, morningMinute, eveningHour, eveningMinute, enabled } =
      this.config.adhkarReminder;

    if (!enabled) {
      console.log('[NotificationService] Adhkar reminders are disabled');
      return;
    }

    // Morning adhkar
    const morningTrigger = this.createDailyTrigger(morningHour, morningMinute, 0);
    await notifee.createTriggerNotification(
      {
        title: '☀️ أذكار الصباح',
        body: 'حان وقت أذكار الصباح - اذكر الله يذكرك',
        android: {
          channelId: CHANNEL_ADHKAR,
          channelImportance: AndroidImportance.DEFAULT,
          category: AndroidCategory.REMINDER,
          sound: 'default' as AndroidSound,
          pressAction: { id: 'default' },
          smallIcon: 'ic_notification',
          color: '#1565C0',
        },
        ios: {
          sound: 'default',
          categoryIdentifier: 'adhkar',
          foregroundPresentationOptions: {
            alert: true,
            badge: true,
            sound: true,
          },
        },
        data: {
          type: 'adhkar',
          adhkarTime: 'morning',
        },
      },
      morningTrigger,
    );

    // Evening adhkar
    const eveningTrigger = this.createDailyTrigger(eveningHour, eveningMinute, 0);
    await notifee.createTriggerNotification(
      {
        title: '🌙 أذكار المساء',
        body: 'حان وقت أذكار المساء - استعيذ بالله من شر الليل',
        android: {
          channelId: CHANNEL_ADHKAR,
          channelImportance: AndroidImportance.DEFAULT,
          category: AndroidCategory.REMINDER,
          sound: 'default' as AndroidSound,
          pressAction: { id: 'default' },
          smallIcon: 'ic_notification',
          color: '#E65100',
        },
        ios: {
          sound: 'default',
          categoryIdentifier: 'adhkar',
          foregroundPresentationOptions: {
            alert: true,
            badge: true,
            sound: true,
          },
        },
        data: {
          type: 'adhkar',
          adhkarTime: 'evening',
        },
      },
      eveningTrigger,
    );

    console.log('[NotificationService] Adhkar reminders scheduled');
  }

  // ── Cancellation ─────────────────────────────────────────────────

  /**
   * Cancel all notifications managed by this service.
   */
  async cancelAllNotifications(): Promise<void> {
    try {
      const ids = await this.getAllManagedNotificationIds();
      for (const id of ids) {
        await notifee.cancelNotification(id);
      }
      console.log(`[NotificationService] Cancelled ${ids.length} notifications`);
    } catch (error) {
      console.error('[NotificationService] Error cancelling notifications:', error);
    }
  }

  /**
   * Cancel only prayer notifications.
   */
  async cancelPrayerNotifications(): Promise<void> {
    try {
      for (const prayer of this.config.prayerSchedule) {
        await notifee.cancelNotification(prayer.id);
      }
    } catch (error) {
      console.error('[NotificationService] Error cancelling prayer notifications:', error);
    }
  }

  /**
   * Cancel only adhkar notifications.
   */
  async cancelAdhkarNotifications(): Promise<void> {
    try {
      await notifee.cancelNotification(ADHKAR_MORNING_ID);
      await notifee.cancelNotification(ADHKAR_EVENING_ID);
    } catch (error) {
      console.error('[NotificationService] Error cancelling adhkar notifications:', error);
    }
  }

  /**
   * Get all managed notification IDs currently displayed.
   */
  private async getAllManagedNotificationIds(): Promise<string[]> {
    const ids: string[] = [];

    // Prayer notifications
    for (const prayer of this.config.prayerSchedule) {
      ids.push(prayer.id);
    }

    // Adhkar notifications
    ids.push(ADHKAR_MORNING_ID);
    ids.push(ADHKAR_EVENING_ID);

    return ids;
  }

  // ── Reschedule ───────────────────────────────────────────────────

  /**
   * Cancel all and reschedule everything.
   * Call this when app settings change (e.g., new city, new method).
   */
  async rescheduleAll(): Promise<void> {
    await this.cancelAllNotifications();
    await this.scheduleAllPrayerNotifications();
    await this.scheduleAdhkarReminder();
    console.log('[NotificationService] All notifications rescheduled');
  }

  // ── Test Notification ────────────────────────────────────────────

  /**
   * Send a test notification to verify setup.
   */
  async sendTestNotification(): Promise<void> {
    await this.ensureReady();

    await notifee.displayNotification({
      title: '🔔 إشعار تجريبي',
      body: 'إذا كنت ترى هذا الإشعار، فإن الإشعارات تعمل بشكل صحيح',
      android: {
        channelId: CHANNEL_REMINDER,
        channelImportance: AndroidImportance.DEFAULT,
        pressAction: { id: 'default' },
        smallIcon: 'ic_notification',
      },
      ios: {
        sound: 'default',
        foregroundPresentationOptions: {
          alert: true,
          badge: true,
          sound: true,
        },
      },
      data: {
        type: 'test',
      },
    });

    console.log('[NotificationService] Test notification sent');
  }

  // ── Foreground Service ──────────────────────────────────────────

  /**
   * Display a foreground service notification for ongoing Athan playback.
   * Call this when starting Athan audio to keep the app alive.
   */
  async showAthanForegroundService(prayerNameAr: string): Promise<void> {
    await notifee.displayNotification({
      title: `🕌 ${prayerNameAr}`,
      body: 'جاري تشغيل صوت الأذان',
      android: {
        channelId: CHANNEL_ATHAN,
        channelImportance: AndroidImportance.LOW,
        asForegroundService: true,
        category: AndroidCategory.SERVICE,
        pressAction: { id: 'default' },
        smallIcon: 'ic_notification',
        color: '#1B5E20',
        ongoing: true,
        localOnly: true,
      },
      data: {
        type: 'athan_playing',
      },
    });
  }

  /**
   * Stop the foreground service notification.
   */
  async stopAthanForegroundService(): Promise<void> {
    await notifee.stopForegroundService();
  }

  // ── Utility ──────────────────────────────────────────────────────

  /**
   * Ensure channels are created and permissions granted (best-effort).
   */
  private async ensureReady(): Promise<void> {
    await this.createChannels();
    // Don't block scheduling if permission not granted — user may grant later
  }

  /**
   * Create prayer notification schedule entries from raw prayer times.
   * Converts Date objects to hour/minute pairs.
   */
  static prayerTimesToSchedule(
    prayerTimes: {
      fajr: Date;
      sunrise: Date;
      dhuhr: Date;
      asr: Date;
      maghrib: Date;
      isha: Date;
    },
    date: Date = new Date(),
  ): PrayerNotificationSchedule[] {
    const dateStr = date.toISOString().split('T')[0].replace(/-/g, '');

    return [
      {
        prayerName: 'Fajr',
        prayerNameAr: 'الفجر',
        hour: prayerTimes.fajr.getHours(),
        minute: prayerTimes.fajr.getMinutes(),
        id: `${NOTIF_PREFIX}${dateStr}_fajr`,
      },
      {
        prayerName: 'Dhuhr',
        prayerNameAr: 'الظهر',
        hour: prayerTimes.dhuhr.getHours(),
        minute: prayerTimes.dhuhr.getMinutes(),
        id: `${NOTIF_PREFIX}${dateStr}_dhuhr`,
      },
      {
        prayerName: 'Asr',
        prayerNameAr: 'العصر',
        hour: prayerTimes.asr.getHours(),
        minute: prayerTimes.asr.getMinutes(),
        id: `${NOTIF_PREFIX}${dateStr}_asr`,
      },
      {
        prayerName: 'Maghrib',
        prayerNameAr: 'المغرب',
        hour: prayerTimes.maghrib.getHours(),
        minute: prayerTimes.maghrib.getMinutes(),
        id: `${NOTIF_PREFIX}${dateStr}_maghrib`,
      },
      {
        prayerName: 'Isha',
        prayerNameAr: 'العشاء',
        hour: prayerTimes.isha.getHours(),
        minute: prayerTimes.isha.getMinutes(),
        id: `${NOTIF_PREFIX}${dateStr}_isha`,
      },
    ];
  }

  /**
   * Default adhkar reminder config.
   */
  static defaultAdhkarReminder(): AdhkarReminderConfig {
    return {
      enabled: true,
      morningHour: 6,
      morningMinute: 0,
      eveningHour: 17,
      eveningMinute: 0,
    };
  }

  /**
   * Destroy — clean up resources.
   */
  destroy(): void {
    this.channelsCreated = false;
  }
}

export default NotificationService;
