import React, { useEffect, useState, useCallback } from 'react';
import {
  StatusBar,
  LogBox,
  I18nManager,
  Platform,
  Text,
  View,
  StyleSheet,
} from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import notifee, { AndroidImportance } from '@notifee/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import AppNavigator from './src/navigation/AppNavigator';
import { COLORS } from './src/navigation/AppNavigator';

// Suppress known warnings in release
LogBox.ignoreLogs([
  'Non-serializable values were found in the navigation state',
  'VirtualizedLists should never be nested',
]);

// --- Constants ---
const STORAGE_KEYS = {
  SETTINGS: '@tasbihi_settings',
  HAS_LAUNCHED: '@tasbihi_has_launched',
};

// --- Error Boundary ---
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<
  React.PropsWithChildren<{ onReset?: () => void }>,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={errorStyles.container}>
          <Text style={errorStyles.title}>⚠️ حدث خطأ</Text>
          <Text style={errorStyles.message}>
            {this.state.error?.message || 'حدث خطأ غير متوقع'}
          </Text>
          <Text style={errorStyles.reset} onPress={this.handleReset}>
            اضغط لإعادة التشغيل
          </Text>
        </View>
      );
    }
    return this.props.children;
  }
}

const errorStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#B71C1C',
    marginBottom: 12,
  },
  message: {
    fontSize: 16,
    color: '#555',
    textAlign: 'center',
    marginBottom: 24,
  },
  reset: {
    fontSize: 16,
    color: COLORS.primary,
    fontWeight: '600',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: 8,
    overflow: 'hidden',
  },
});

// --- Notification Channel ---
async function setupNotifications() {
  try {
    // Create notification channel (Android)
    if (Platform.OS === 'android') {
      await notifee.createChannel({
        id: 'tasbihi_prayer',
        name: 'أوقات الصلاة',
        description: 'إشعارات تذكير بأوقات الصلاة',
        importance: AndroidImportance.HIGH,
        sound: 'azan',
        vibration: true,
      });

      await notifee.createChannel({
        id: 'tasbihi_reminder',
        name: 'تذكير بالتسبيح',
        description: 'تذكير يومي للتسبيح والأذكار',
        importance: AndroidImportance.DEFAULT,
        vibration: true,
      });
    }
  } catch (error) {
    console.warn('[Notifications] Setup failed:', error);
  }
}

// --- Permissions ---
async function requestPermissions() {
  try {
    // Notification permissions
    if (Platform.OS === 'ios') {
      await notifee.requestPermission();
    }

    // Location permissions for auto prayer times
    if (Platform.OS === 'android') {
      // Permission handled by @react-native-community/geolocation
    }
  } catch (error) {
    console.warn('[Permissions] Request failed:', error);
  }
}

// --- Theme / RTL ---
function forceRTL(enable: boolean) {
  if (I18nManager.isRTL !== enable) {
    I18nManager.allowRTL(enable);
    I18nManager.forceRTL(enable);
  }
}

// --- App ---
function App(): React.JSX.Element {
  const [isReady, setIsReady] = useState(false);
  const [settings, setSettings] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    async function bootstrap() {
      try {
        // 1. Load saved settings
        const stored = await AsyncStorage.getItem(STORAGE_KEYS.SETTINGS);
        const parsed: Record<string, unknown> = stored ? JSON.parse(stored) : {};
        setSettings(parsed);

        // 2. Enable RTL (Arabic-first app)
        const isRTL = parsed.rtl !== false; // default true
        forceRTL(isRTL);

        // 3. Notifications & permissions
        await setupNotifications();
        await requestPermissions();

        // 4. Mark first launch if needed
        const hasLaunched = await AsyncStorage.getItem(STORAGE_KEYS.HAS_LAUNCHED);
        if (!hasLaunched) {
          await AsyncStorage.setItem(STORAGE_KEYS.HAS_LAUNCHED, 'true');
        }
      } catch (error) {
        console.error('[App] Bootstrap error:', error);
      } finally {
        setIsReady(true);
      }
    }

    bootstrap();
  }, []);

  const navigationTheme = {
    dark: false,
    colors: {
      primary: COLORS.primary,
      background: COLORS.background,
      card: COLORS.surface,
      text: '#212121',
      border: '#E0E0E0',
      notification: COLORS.accent,
    },
  };

  if (!isReady) {
    return (
      <View style={splashStyles.container}>
        <Text style={splashStyles.title}>تسبيحي</Text>
        <Text style={splashStyles.subtitle}>بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ</Text>
      </View>
    );
  }

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <StatusBar
          barStyle="light-content"
          backgroundColor={COLORS.primary}
          translucent={false}
        />
        <NavigationContainer theme={navigationTheme}>
          <AppNavigator />
        </NavigationContainer>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}

const splashStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
  },
  title: {
    fontSize: 42,
    fontWeight: '800',
    color: COLORS.white,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 18,
    color: 'rgba(255,255,255,0.85)',
  },
});

export default App;
