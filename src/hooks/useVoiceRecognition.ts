/**
 * useVoiceRecognition — Hook مخصص لتغليف VoiceService في تطبيق تسبيحي
 * ====================================================================
 * يدير حالة الاستماع (listening, paused, error)
 * ويعرض واجهة سهلة للمكونات لبدء وإيقاف التعرف على الصوت
 */

import { useEffect, useCallback, useRef, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import {
  VoiceService,
  VoiceServiceEvents,
  TasbihPhrase,
  ListeningState,
  SessionStats,
} from '../services/VoiceService';

// ===================== أنواع Hook =====================

/** واجهة Hook useVoiceRecognition */
export interface UseVoiceRecognitionReturn {
  /** الحالة الحالية للاستماع */
  isListening: boolean;
  /** حالة الخدمة المفصلة */
  listeningState: ListeningState;
  /** تم إيقاف الاستماع مؤقتاً (فقدان التركيز) */
  isPaused: boolean;
  /** آخر عبارة تم الكشف عنها بالكامل */
  lastDetectedPhrase: TasbihPhrase | null;
  /** آخر نص جزئي تم التعرف عليه */
  partialText: string;
  /** خطأ إن وجد */
  error: string | null;
  /** عدد التسبيحات في الجلسة الحالية */
  count: number;
  /** إحصائيات الجلسة */
  sessionStats: SessionStats | null;
  /** عبارة التسبيح المستهدفة حالياً */
  targetPhrase: TasbihPhrase | null;

  /** بدء الاستماع لعبارة محددة */
  startListening: (phrase: TasbihPhrase) => Promise<void>;
  /** إيقاف الاستماع */
  stopListening: () => Promise<void>;
  /** تبديل حالة الاستماع */
  toggleListening: (phrase?: TasbihPhrase) => Promise<void>;
  /** إضافة تسبيحة يدوياً */
  incrementManually: () => void;
  /** إعادة تعيين عداد الجلسة */
  resetCount: () => void;

  /** اختيار عبارة تسبيح جديدة */
  setTargetPhrase: (phrase: TasbihPhrase) => void;
}

/** خيارات التهيئة للـ Hook */
export interface UseVoiceRecognitionOptions {
  /** بدء الاستماع تلقائياً عند تحميل المكون */
  autoStart?: boolean;
  /** عبارة التسبيح الأولية */
  initialPhrase?: TasbihPhrase;
  /** معالج عند اكتشاف تسبيحة */
  onTasbihDetected?: (phrase: TasbihPhrase) => void;
  /** معالج عند خطأ */
  onError?: (error: string) => void;
}

// ===================== Hook =====================

/**
 * useVoiceRecognition — Hook للتحكم في خدمة التعرف على الصوت
 *
 * @example
 * ```tsx
 * const {
 *   isListening,
 *   count,
 *   startListening,
 *   stopListening,
 * } = useVoiceRecognition({
 *   autoStart: false,
 *   onTasbihDetected: (phrase) => {
 *     Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
 *   },
 * });
 *
 * // بدء الاستماع
 * await startListening({ id: 'subhanallah', text: 'سبحان الله' });
 * ```
 */
export function useVoiceRecognition(
  options: UseVoiceRecognitionOptions = {},
): UseVoiceRecognitionReturn {
  const {
    autoStart = false,
    initialPhrase,
    onTasbihDetected: onTasbihDetectedCallback,
    onError: onErrorCallback,
  } = options;

  // ===================== Ref للإشارة إلى الخدمة =====================
  // نستخدم ref لتجنب إعادة إنشاء الخدمة مع كل render
  const serviceRef = useRef<VoiceService | null>(null);
  const unsubscribeRef = useRef<(() => void)[]>([]);
  const targetPhraseRef = useRef<TasbihPhrase | null>(initialPhrase || null);

  /** الحصول على نسخة الخدمة (إنشاء عند أول استدعاء) */
  const getService = useCallback((): VoiceService => {
    if (!serviceRef.current) {
      serviceRef.current = new VoiceService();
    }
    return serviceRef.current;
  }, []);

  // ===================== حالة المكون =====================

  const [isListening, setIsListening] = useState(false);
  const [listeningState, setListeningState] = useState<ListeningState>('idle');
  const [isPaused, setIsPaused] = useState(false);
  const [lastDetectedPhrase, setLastDetectedPhrase] = useState<TasbihPhrase | null>(null);
  const [partialText, setPartialText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [count, setCount] = useState(0);
  const [sessionStats, setSessionStats] = useState<SessionStats | null>(null);
  const [targetPhrase, setTargetPhraseState] = useState<TasbihPhrase | null>(
    initialPhrase || null,
  );
  // حارس لتجنب استدعاء setState بعد إلغاء تحميل المكون
  const isMountedRef = useRef(true);

  // تحديث الحالة بشكل آمن (فقط إذا كان المكون لا يزال موجوداً)
  const safeSetState = <T,>(setter: React.Dispatch<React.SetStateAction<T>>, value: T): void => {
    if (isMountedRef.current) {
      setter(value);
    }
  };

  // ===================== الاشتراك في أحداث الخدمة =====================

  /** إعداد الاشتراكات في أحداث الخدمة */
  const setupSubscriptions = useCallback(
    (service: VoiceService): void => {
      // إلغاء الاشتراكات القديمة
      unsubscribeRef.current.forEach((unsub) => {
        try {
          unsub();
        } catch {
          // تجاهل الأخطاء أثناء إلغاء الاشتراك
        }
      });
      unsubscribeRef.current = [];

      // اشتراك: تغير حالة الاستماع
      unsubscribeRef.current.push(
        service.subscribe('onListeningStateChange', (state) => {
          safeSetState(setListeningState, state);
          safeSetState(setIsListening, state === 'listening' || state === 'processing');
          safeSetState(setIsPaused, state === 'idle' && service.sessionCount > 0);
        }),
      );

      // اشتراك: تم اكتشاف تسبيحة
      unsubscribeRef.current.push(
        service.subscribe('onTasbihDetected', (phrase) => {
          safeSetState(setLastDetectedPhrase, phrase);
          safeSetState(setCount, service.sessionCount);
          safeSetState(setSessionStats, service.sessionStats);
          // تشغيل الاهتزاز أو المؤثر الصوتي عبر callback المستخدم
          onTasbihDetectedCallback?.(phrase);
        }),
      );

      // اشتراك: تطابق جزئي
      unsubscribeRef.current.push(
        service.subscribe('onPartialMatch', (partial) => {
          safeSetState(setPartialText, partial);
        }),
      );

      // اشتراك: خطأ
      unsubscribeRef.current.push(
        service.subscribe('onError', (errorEvent) => {
          const errorMessage = errorEvent.message;
          safeSetState(setError, errorMessage);
          onErrorCallback?.(errorMessage);
        }),
      );

      // اشتراك: نتائج خام — نُحدّث النص الجزئي
      unsubscribeRef.current.push(
        service.subscribe('onRawResults', (words) => {
          if (words.length > 0) {
            safeSetState(setPartialText, words.join(' '));
          }
        }),
      );
    },
    [onTasbihDetectedCallback, onErrorCallback],
  );

  // ===================== الإعداد الأولي =====================

  useEffect(() => {
    const service = getService();
    setupSubscriptions(service);

    // بدء الاستماع تلقائياً إذا طلب المستخدم ذلك ووجدت عبارة أولية
    if (autoStart && initialPhrase) {
      service.startListening(initialPhrase).catch((err) => {
        const msg = err instanceof Error ? err.message : String(err);
        safeSetState(setError, `فشل بدء الاستماع التلقائي: ${msg}`);
      });
    }

    // معالجة تغير حالة التطبيق (خلفية/أمامية)
    const handleAppStateChange = async (nextState: AppStateStatus): Promise<void> => {
      // عند العودة إلى التطبيق بعد الخلفية
      if (nextState === 'active' && isMountedRef.current) {
        // إذا كنا في حالة خطأ أو متوقف مؤقتاً، نعيد المحاولة
        if (
          listeningState === 'error' ||
          (listeningState === 'idle' && targetPhraseRef.current)
        ) {
          try {
            await service.startListening(targetPhraseRef.current!);
          } catch {
            // تجاهل إذا فشلت إعادة التشغيل — المستخدم سيبدأ يدوياً
          }
        }
      }
    };

    const appStateSubscription = AppState.addEventListener('change', handleAppStateChange);

    // تنظيف عند إلغاء تحميل المكون
    return () => {
      isMountedRef.current = false;
      appStateSubscription.remove();

      // إلغاء الاشتراكات
      unsubscribeRef.current.forEach((unsub) => {
        try {
          unsub();
        } catch {
          // تجاهل
        }
      });

      // تدمير الخدمة
      service.destroy().catch(() => {
        // تجاهل أخطاء التدمير
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ===================== دوال التحكم =====================

  /**
   * بدء الاستماع للتعرف على عبارة محددة
   */
  const startListening = useCallback(
    async (phrase: TasbihPhrase): Promise<void> => {
      const service = getService();

      try {
        safeSetState(setError, null);
        safeSetState(setPartialText, '');
        targetPhraseRef.current = phrase;
        safeSetState(setTargetPhraseState, phrase);

        await service.startListening(phrase);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        safeSetState(setError, `فشل بدء الاستماع: ${msg}`);
        throw err;
      }
    },
    [getService],
  );

  /**
   * إيقاف الاستماع
   */
  const stopListening = useCallback(async (): Promise<void> => {
    const service = getService();

    try {
      await service.stopListening();
      targetPhraseRef.current = null;
      safeSetState(setTargetPhraseState, null);
      safeSetState(setPartialText, '');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      safeSetState(setError, `فشل إيقاف الاستماع: ${msg}`);
    }
  }, [getService]);

  /**
   * تبديل حالة الاستماع (تشغيل/إيقاف)
   */
  const toggleListening = useCallback(
    async (phrase?: TasbihPhrase): Promise<void> => {
      if (isListening) {
        await stopListening();
      } else {
        const target = phrase || targetPhraseRef.current;
        if (target) {
          await startListening(target);
        }
      }
    },
    [isListening, startListening, stopListening],
  );

  /**
   * إضافة تسبيحة يدوياً — عندما يعرف المستخدم أنه قالها
   * ولكن الخدمة لم تتعرف عليها لسبب ما
   */
  const incrementManually = useCallback((): void => {
    const service = getService();
    service.incrementManually();
    safeSetState(setCount, service.sessionCount);
    safeSetState(setSessionStats, service.sessionStats);

    // إرسال حدث التسبيحة مع آخر عبارة مستهدفة
    if (targetPhraseRef.current) {
      safeSetState(setLastDetectedPhrase, targetPhraseRef.current);
      onTasbihDetectedCallback?.(targetPhraseRef.current);
    }
  }, [getService, onTasbihDetectedCallback]);

  /**
   * إعادة تعيين عداد الجلسة
   */
  const resetCount = useCallback((): void => {
    const service = getService();
    service.resetSessionCount();
    safeSetState(setCount, 0);
    safeSetState(setSessionStats, null);
    safeSetState(setLastDetectedPhrase, null);
  }, [getService]);

  /**
   * تغيير عبارة التسبيح المستهدفة
   * إذا كان الاستماع نشطاً، سيبدأ بالاستماع للعبارة الجديدة تلقائياً
   */
  const setTargetPhrase = useCallback(
    (phrase: TasbihPhrase): void => {
      targetPhraseRef.current = phrase;
      safeSetState(setTargetPhraseState, phrase);

      // إذا كان الاستماع نشطاً، نُعيد التشغيل بالعبارة الجديدة
      if (isListening) {
        startListening(phrase).catch(() => {
          // تجاهل — المستخدم يمكنه المحاولة يدوياً
        });
      }
    },
    [isListening, startListening],
  );

  // ===================== واجهة المستخدم =====================

  return {
    // الحالة
    isListening,
    listeningState,
    isPaused,
    lastDetectedPhrase,
    partialText,
    error,
    count,
    sessionStats,
    targetPhrase,

    // دوال التحكم
    startListening,
    stopListening,
    toggleListening,
    incrementManually,
    resetCount,
    setTargetPhrase,
  };
}

export default useVoiceRecognition;
