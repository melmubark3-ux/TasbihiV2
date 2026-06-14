/**
 * VoiceService — خدمة التعرف على الصوت العربي لتطبيق تسبيحي
 * ==========================================================
 * تستخدم @react-native-voice/voice للتعرف على الكلام باللغة العربية (ar-SA)
 * وتقارن الكلمات المنطوقة مع عبارات التسبيح المخزنة وتحسب عدد مرات النطق الصحيح
 */

import Voice, {
  SpeechResultsEvent,
  SpeechErrorEvent,
  SpeechPartialResultsEvent,
} from '@react-native-voice/voice';

// ===================== أنواع البيانات =====================

/** قائمة عبارات التسبيح المدعومة */
export interface TasbihPhrase {
  /** النص الكامل للعبارة */
  text: string;
  /** معرف فريد */
  id: string;
  /** نطق بديل أو متغيرات (مثل "سبحان الله وبحمده" / "سبحان ربي العظيم") */
  variants?: string[];
}

/** أحداث الخدمة */
export interface VoiceServiceEvents {
  /** تم الكشف عن تسبيحة صحيحة كاملة */
  onTasbihDetected: (phrase: TasbihPhrase) => void;
  /** تطابق جزئي — المستخدم في منتصف نطق العبارة */
  onPartialMatch: (partial: string, phraseId: string) => void;
  /** خطأ في التعرف أو الخدمة */
  onError: (error: VoiceServiceError) => void;
  /** حالة الاستماع تغيرت */
  onListeningStateChange: (state: ListeningState) => void;
  /** نتائج صوت خام — الكلمات التي سمعها الجهاز */
  onRawResults: (words: string[]) => void;
}

/** أنواع أخطاء الخدمة */
export interface VoiceServiceError {
  code: string;
  message: string;
  nativeError?: any;
}

/** حالات الاستماع الممكنة */
export type ListeningState = 'idle' | 'listening' | 'processing' | 'error';

/** نوع دالة إلغاء الاشتراك في الحدث */
type Unsubscribe = () => void;

/** إحصائيات الجلسة الحالية */
export interface SessionStats {
  /** عدد التسبيحات الصحيحة في هذه الجلسة */
  correctCount: number;
  /** إجمالي المحاولات (صحيحة + خاطئة) */
  totalAttempts: number;
  /** نسبة الدقة */
  accuracy: number;
  /** مدة الجلسة بالمللي ثانية */
  duration: number;
  /** الطابع الزمني لبدء الجلسة */
  startedAt: number;
}

// ===================== إعدادات التطابق =====================

/**
 * درجة التشابه الدنيا (0-1) لقبول النتيجة كتطابق صحيح
 * القيم الأعلى = دقة أعلى لكن قد تفوت بعض التسبيحات
 */
const SIMILARITY_THRESHOLD = 0.75;

/**
 * مدة الانتظار بالمللي ثانية قبل اعتبار الصمت نهاية للعبارة
 */
const SILENCE_TIMEOUT_MS = 2000;

/**
 * تطبيع النص العربي للمقارنة:
 * - إزالة التشكيل (الحركات)
 * - إزالة علامات الترقيم
 * - توحيد أشكال الحروف (أ, إ, آ → ا | ة → ه | ى → ي)
 */
function normalizeArabicText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u064B-\u065F\u0610-\u061A\u06D6-\u06ED]/g, '') // إزالة التشكيل
    .replace(/[^\w\s]/g, '') // إزالة علامات الترقيم
    .replace(/[إأآا]/g, 'ا') // توحيد الألف
    .replace(/ة/g, 'ه') // تاء مربوطة → هاء
    .replace(/ى/g, 'ي') // ألف مقصورة → ياء
    .replace(/\s+/g, ' ') // توحيد المسافات
    .trim();
}

/**
 * حساب درجة التشابه بين نصين عربيين باستخدام:
 * 1. النسبة المئوية لحرف الـ n-gram المشتركة
 * 2. مسافة ليفنشتاين المعدلة (حساب عدد الاختلافات)
 */
function calculateSimilarity(spoken: string, target: string): number {
  const a = normalizeArabicText(spoken);
  const b = normalizeArabicText(target);

  if (a === b) return 1.0;
  if (a.length === 0 || b.length === 0) return 0.0;

  // Bigram similarity (حساب التشابه باستخدام bigrams)
  const aBigrams = new Set<string>();
  const bBigrams = new Set<string>();

  for (let i = 0; i < a.length - 1; i++) {
    aBigrams.add(a.substring(i, i + 2));
  }
  for (let i = 0; i < b.length - 1; i++) {
    bBigrams.add(b.substring(i, i + 2));
  }

  let intersection = 0;
  aBigrams.forEach((bg) => {
    if (bBigrams.has(bg)) intersection++;
  });

  const union = aBigrams.size + bBigrams.size - intersection;
  const bigramScore = union > 0 ? intersection / union : 0;

  // Levenshtein-based similarity
  const maxLen = Math.max(a.length, b.length);
  const editDistance = computeLevenshteinDistance(a, b);
  const levenshteinScore = maxLen > 0 ? 1 - editDistance / maxLen : 1.0;

  // Weighted average — نعطي وزناً أكبر لـ bigram لأنه أفضل للغة العربية
  return bigramScore * 0.6 + levenshteinScore * 0.4;
}

/**
 * حساب مسافة ليفنشتاين بين سلسلتين
 */
function computeLevenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,      // حذف
        dp[i][j - 1] + 1,      // إدراج
        dp[i - 1][j - 1] + cost, // استبدال
      );
    }
  }
  return dp[m][n];
}

/**
 * التحقق مما إذا كانت الكلمات المنطوقة تحتوي على عبارة التسبيح كاملة
 * أو جزء منها
 */
function matchSpokenWords(
  words: string[],
  phrase: TasbihPhrase,
): { isFullMatch: boolean; isPartialMatch: boolean; similarity: number } {
  // دمج كل الكلمات المنطوقة في جملة واحدة للمقارنة
  const spokenFull = words.join(' ');

  // جميع النصوص الممكنة للمقارنة (النص الأصلي + المتغيرات)
  const possibleTexts = [phrase.text, ...(phrase.variants || [])];

  let bestSimilarity = 0;
  let bestIsFullMatch = false;
  let bestIsPartialMatch = false;

  for (const targetText of possibleTexts) {
    const similarity = calculateSimilarity(spokenFull, targetText);

    // تطابق كامل
    if (similarity >= SIMILARITY_THRESHOLD) {
      if (similarity > bestSimilarity) {
        bestSimilarity = similarity;
        bestIsFullMatch = true;
        bestIsPartialMatch = false;
      }
    }

    // تطابق جزئي — هل تبدأ الكلمات المنطوقة بجزء من العبارة؟
    // هذا يساعد في الكشف عن المستخدم وهو في منتصف العبارة
    const normalizedSpoken = normalizeArabicText(spokenFull);
    const normalizedTarget = normalizeArabicText(targetText);

    // تحقق من تطابق بداية العبارة المنطوقة مع بداية الهدف
    const spokenWords = normalizedSpoken.split(' ');
    const targetWords = normalizedTarget.split(' ');

    if (spokenWords.length > 0 && spokenWords.length <= targetWords.length) {
      const partialTarget = targetWords.slice(0, spokenWords.length).join(' ');
      const partialSimilarity = calculateSimilarity(normalizedSpoken, partialTarget);

      if (partialSimilarity >= SIMILARITY_THRESHOLD * 0.8 && partialSimilarity > bestSimilarity) {
        // تطابق جزئي — بشرط ألا يكون تطابقاً كاملاً
        if (!bestIsFullMatch) {
          bestSimilarity = partialSimilarity;
          bestIsPartialMatch = true;
        }
      }
    }
  }

  return {
    isFullMatch: bestIsFullMatch,
    isPartialMatch: bestIsPartialMatch && !bestIsFullMatch,
    similarity: bestSimilarity,
  };
}

// ===================== الخدمة الرئيسية =====================

/**
 * VoiceService — خدمة التعرف على الصوت العربي
 *
 * @example
 * ```ts
 * const service = new VoiceService();
 * service.subscribe('onTasbihDetected', (phrase) => {
 *   console.log(`تم التسبيح: ${phrase.text}`);
 * });
 * await service.startListening(targetPhrase);
 * ```
 */
export class VoiceService {
  /** قائمة المشتركين في الأحداث */
  private listeners: Map<keyof VoiceServiceEvents, Set<Function>> = new Map();

  /** حالة الاستماع الحالية */
  private _state: ListeningState = 'idle';

  /** عبارة التسبيح المستهدفة حالياً */
  private _targetPhrase: TasbihPhrase | null = null;

  /** مؤقت الصمت لإنهاء الاستماع تلقائياً */
  private silenceTimer: ReturnType<typeof setTimeout> | null = null;

  /** إحصائيات الجلسة الحالية */
  private _sessionStats: SessionStats | null = null;

  /** عدد التسبيحات المكتشفة في الجلسة */
  private _sessionCount: number = 0;

  /** الطابع الزمني لآخر تسبيحة */
  private _lastDetectionTime: number = 0;

  /** الفاصل الزمني الأدنى بين التسبيحات (بالمللي ثانية) — لمنع التكرار */
  private readonly DEBOUNCE_MS = 800;

  // ===================== الخصائص العمومية =====================

  /** الحالة الحالية للخدمة */
  get state(): ListeningState {
    return this._state;
  }

  /** عبارة التسبيح المستهدفة حالياً */
  get targetPhrase(): TasbihPhrase | null {
    return this._targetPhrase;
  }

  /** إحصائيات الجلسة الحالية */
  get sessionStats(): SessionStats | null {
    return this._sessionStats;
  }

  /** عدد التسبيحات في الجلسة الحالية */
  get sessionCount(): number {
    return this._sessionCount;
  }

  // ===================== إدارة الأحداث =====================

  /**
   * الاشتراك في حدث من أحداث الخدمة
   * @returns دالة لإلغاء الاشتراك
   */
  subscribe<K extends keyof VoiceServiceEvents>(
    event: K,
    callback: VoiceServiceEvents[K],
  ): Unsubscribe {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback as Function);

    return () => {
      this.listeners.get(event)?.delete(callback as Function);
    };
  }

  /** إرسال حدث لجميع المشتركين */
  private emit<K extends keyof VoiceServiceEvents>(
    event: K,
    ...args: Parameters<VoiceServiceEvents[K]>
  ): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach((cb) => {
        try {
          (cb as Function)(...args);
        } catch (err) {
          console.error(`[VoiceService] خطأ في معالج الحدث ${event}:`, err);
        }
      });
    }
  }

  // ===================== إدارة الحالة =====================

  /** تحديث حالة الاستماع وإرسال حدث */
  private setState(newState: ListeningState): void {
    if (this._state !== newState) {
      this._state = newState;
      this.emit('onListeningStateChange', newState);
    }
  }

  /** بدء جلسة إحصائيات جديدة */
  private startNewSession(): void {
    this._sessionCount = 0;
    this._sessionStats = {
      correctCount: 0,
      totalAttempts: 0,
      accuracy: 0,
      duration: 0,
      startedAt: Date.now(),
    };
  }

  /** تحديث إحصائيات الجلسة */
  private updateSessionStats(correct: boolean): void {
    if (!this._sessionStats) return;

    this._sessionStats.totalAttempts++;
    if (correct) {
      this._sessionStats.correctCount++;
    }
    this._sessionStats.accuracy =
      this._sessionStats.totalAttempts > 0
        ? this._sessionStats.correctCount / this._sessionStats.totalAttempts
        : 0;
    this._sessionStats.duration = Date.now() - this._sessionStats.startedAt;
  }

  // ===================== دوال الاستماع =====================

  /**
   * بدء الاستماع للتعرف على عبارة تسبيح محددة
   * @param targetPhrase — عبارة التسبيح المستهدفة
   */
  async startListening(targetPhrase: TasbihPhrase): Promise<void> {
    try {
      // إذا كان هناك جلسة سابقة، ننهيها
      await this.stopListening();

      this._targetPhrase = targetPhrase;
      this.startNewSession();

      // تسجيل معالجات أحداث Voice
      Voice.onSpeechStart = this.handleSpeechStart;
      Voice.onSpeechEnd = this.handleSpeechEnd;
      Voice.onSpeechResults = this.handleSpeechResults;
      Voice.onSpeechPartialResults = this.handleSpeechPartialResults;
      Voice.onSpeechError = this.handleSpeechError;

      // بدء التعرف باللغة العربية
      await Voice.start('ar-SA');
      this.setState('listening');

      console.log(`[VoiceService] بدء الاستماع للتعرف على: "${targetPhrase.text}"`);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('[VoiceService] فشل بدء الاستماع:', errorMsg);
      this.setState('error');
      this.emit('onError', {
        code: 'START_FAILED',
        message: `فشل بدء التعرف على الصوت: ${errorMsg}`,
        nativeError: error,
      });
    }
  }

  /**
   * إيقاف الاستماع
   */
  async stopListening(): Promise<void> {
    try {
      this.clearSilenceTimer();

      // إلغاء تسجيل المعالجات لتجنب استقبال نتائج بعد الإيقاف
      Voice.onSpeechStart = undefined;
      Voice.onSpeechEnd = undefined;
      Voice.onSpeechResults = undefined;
      Voice.onSpeechPartialResults = undefined;
      Voice.onSpeechError = undefined;

      if (this._state === 'listening' || this._state === 'processing') {
        await Voice.stop();
        await Voice.destroy();
      }

      this.setState('idle');
      this._targetPhrase = null;

      // إنهاء إحصائيات الجلسة
      if (this._sessionStats) {
        this._sessionStats.duration = Date.now() - this._sessionStats.startedAt;
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('[VoiceService] فشل إيقاف الاستماع:', errorMsg);
      // لا نرسل خطأ هنا لأننا نريد الإيقاف بالقوة
      this.setState('idle');
    }
  }

  /**
   * تبديل حالة الاستماع (تشغيل/إيقاف)
   */
  async toggleListening(targetPhrase?: TasbihPhrase): Promise<void> {
    if (this._state === 'listening' || this._state === 'processing') {
      await this.stopListening();
    } else if (targetPhrase) {
      await this.startListening(targetPhrase);
    }
  }

  /**
   * تصحيح عدد التسبيحات يدوياً — يُستخدم عندما تفشل الخدمة
   * في التعرف ولكن المستخدم يعرف أنه قال التسبيحة
   */
  incrementManually(): void {
    this._sessionCount++;
    this.updateSessionStats(true);
  }

  /**
   * إعادة تعيين عداد الجلسة
   */
  resetSessionCount(): void {
    this._sessionCount = 0;
    this.startNewSession();
  }

  // ===================== معالجات أحداث Voice =====================

  private handleSpeechStart = (): void => {
    console.log('[VoiceService] بدأ المستخدم بالكلام');
    this.setState('listening');
  };

  private handleSpeechEnd = (): void => {
    console.log('[VoiceService] انتهى المستخدم من الكلام');
    this.setState('processing');

    // بدء مؤقت الصمت — إذا لم تصل نتائج جديدة، نعود للاستماع
    this.silenceTimer = setTimeout(() => {
      if (this._state === 'processing') {
        this.setState('listening');
      }
    }, SILENCE_TIMEOUT_MS);
  };

  /**
   * معالجة النتائج النهائية للتعرف على الصوت
   */
  private handleSpeechResults = (event: SpeechResultsEvent): void => {
    const words = event.value || [];

    if (words.length === 0 || !this._targetPhrase) return;

    this.clearSilenceTimer();
    this.setState('processing');

    console.log(`[VoiceService] النتائج النهائية: [${words.join(', ')}]`);

    // إرسال النتائج الخام
    this.emit('onRawResults', words);

    // تحليل الكلمات المنطوقة
    const match = matchSpokenWords(words, this._targetPhrase);

    if (match.isFullMatch) {
      this.handleFullMatch();
    } else if (match.isPartialMatch) {
      this.handlePartialMatch(words.join(' '));
    } else {
      // لا يوجد تطابق — نحدّث الإحصائيات فقط
      this.updateSessionStats(false);
    }

    // العودة للاستماع بعد معالجة النتائج
    this.setState('listening');
  };

  /**
   * معالجة النتائج الجزئية (في الوقت الحقيقي)
   */
  private handleSpeechPartialResults = (event: SpeechPartialResultsEvent): void => {
    const words = event.value || [];

    if (words.length === 0 || !this._targetPhrase) return;

    // إرسال النتائج الخام الجزئية
    this.emit('onRawResults', words);

    // الكشف عن التطابق الجزئي في الوقت الحقيقي
    const match = matchSpokenWords(words, this._targetPhrase);

    if (match.isPartialMatch) {
      this.emit('onPartialMatch', words.join(' '), this._targetPhrase.id);
    }

    // إذا كان هناك تطابق كامل في النتائج الجزئية (قد يحدث مع بعض الأنظمة)
    if (match.isFullMatch) {
      this.handleFullMatch();
    }
  };

  /**
   * معالجة أخطاء التعرف على الصوت
   */
  private handleSpeechError = (event: SpeechErrorEvent): void => {
    const errorCode = event?.error?.code || 'UNKNOWN';
    const errorMessage = event?.error?.message || 'خطأ غير معروف في التعرف على الصوت';

    console.error(`[VoiceService] خطأ: ${errorCode} - ${errorMessage}`);

    // بعض الأخطاء لا تعني مشكلة حقيقية (مثل "no match")
    const nonFatalErrors = ['7', 'no match', 'SpeechRecognitionError'];
    const isFatal = !nonFatalErrors.some((code) => errorCode.includes(code));

    if (isFatal) {
      this.setState('error');
      this.emit('onError', {
        code: errorCode,
        message: errorMessage,
        nativeError: event.error,
      });
    } else {
      // خطأ غير fatal — نعيد المحاولة
      this.setState('listening');
    }
  };

  // ===================== دوال مساعدة =====================

  /**
   * معالجة التطابق الكامل — زيادة العداد وإرسال الحدث
   */
  private handleFullMatch(): void {
    const now = Date.now();

    // Debounce: منع عد同一 التسبيحة أكثر من مرة خلال الفاصل الزمني
    if (now - this._lastDetectionTime < this.DEBOUNCE_MS) {
      console.log('[VoiceService] تجاهل التسبيحة — تكرار سريع');
      return;
    }

    this._sessionCount++;
    this._lastDetectionTime = now;
    this.updateSessionStats(true);

    console.log(`[VoiceService] ✅ تم الكشف عن تسبيحة! العدد: ${this._sessionCount}`);

    if (this._targetPhrase) {
      this.emit('onTasbihDetected', this._targetPhrase);
    }
  }

  /**
   * معالجة التطابق الجزئي
   */
  private handlePartialMatch(partial: string): void {
    if (this._targetPhrase) {
      this.emit('onPartialMatch', partial, this._targetPhrase.id);
    }
  }

  /** إلغاء مؤقت الصمت */
  private clearSilenceTimer(): void {
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
  }

  /**
   * تنظيف الموارد — يجب استدعاؤها عند إلغاء تحميل المكون
   */
  async destroy(): Promise<void> {
    await this.stopListening();

    this.listeners.clear();
    this._targetPhrase = null;
    this._sessionStats = null;
    this._sessionCount = 0;
  }
}

// ===================== عبارات تسبيح افتراضية =====================

/** عبارات تسبيح جاهزة للاستخدام */
export const DEFAULT_TASBIH_PHRASES: TasbihPhrase[] = [
  {
    id: 'subhanallah',
    text: 'سبحان الله',
    variants: ['سبحان الله العظيم', 'سبحان ربي العظيم'],
  },
  {
    id: 'alhamdulillah',
    text: 'الحمد لله',
    variants: ['الحمد لله رب العالمين'],
  },
  {
    id: 'allahu_akbar',
    text: 'الله أكبر',
    variants: ['الله أكبر كبيرا'],
  },
  {
    id: 'la_ilaha_illallah',
    text: 'لا إله إلا الله',
    variants: ['لا اله الا الله', 'لا اله الا الله وحده'],
  },
  {
    id: 'subhanallah_wabihamdih',
    text: 'سبحان الله وبحمده',
    variants: ['سبحان الله العظيم وبحمده'],
  },
  {
    id: 'astaghfirullah',
    text: 'أستغفر الله',
    variants: ['استغفر الله العظيم', 'استغفر الله واتوب اليه'],
  },
  {
    id: 'la_howla',
    text: 'لا حول ولا قوة إلا بالله',
    variants: ['لا حول ولا قوه الا بالله العلي العظيم'],
  },
];

export default VoiceService;
