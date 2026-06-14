import React from 'react';
import { Platform, I18nManager } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialIcons';

// Screens
import TasbihScreen from '../screens/TasbihScreen';
import AdhkarScreen from '../screens/AdhkarScreen';
import PrayerTimesScreen from '../screens/PrayerTimesScreen';
import StatisticsScreen from '../screens/StatisticsScreen';
import SettingsScreen from '../screens/SettingsScreen';

// Colors
const COLORS = {
  primary: '#1B5E20',
  primaryLight: '#388E3C',
  accent: '#FFC107',
  background: '#F5F5F0',
  inactive: '#9E9E9E',
  white: '#FFFFFF',
  surface: '#FFFFFF',
};

export type RootTabParamList = {
  Home: undefined;
  Tasbih: undefined;
  Azkar: undefined;
  PrayerTimes: undefined;
  Statistics: undefined;
  Settings: undefined;
};

const Tab = createBottomTabNavigator<RootTabParamList>();

const TAB_ICONS: Record<string, string> = {
  Home: 'home',
  Tasbih: 'pan-tool',
  Azkar: 'book',
  PrayerTimes: 'access-time',
  Statistics: 'bar-chart',
  Settings: 'settings',
};

const TAB_LABELS: Record<string, string> = {
  Home: 'الرئيسية',
  Tasbih: 'التسبيح',
  Azkar: 'الأذكار',
  PrayerTimes: 'أوقات الصلاة',
  Statistics: 'الإحصائيات',
  Settings: 'الإعدادات',
};

function AppNavigator() {
  return (
    <Tab.Navigator
      initialRouteName="Tasbih"
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          const iconName = TAB_ICONS[route.name] || 'circle';
          return (
            <Icon
              name={focused ? iconName : `${iconName}`}
              size={size}
              color={color}
            />
          );
        },
        tabBarLabel: TAB_LABELS[route.name] || route.name,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.inactive,
        tabBarStyle: {
          backgroundColor: COLORS.surface,
          borderTopColor: '#E0E0E0',
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 88 : 65,
          paddingBottom: Platform.OS === 'ios' ? 28 : 8,
          paddingTop: 6,
          direction: I18nManager.isRTL ? 'rtl' : 'ltr',
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          fontFamily: Platform.OS === 'ios' ? 'Cairo' : undefined,
        },
        headerShown: false,
        headerStyle: {
          backgroundColor: COLORS.primary,
        },
        headerTintColor: COLORS.white,
        headerTitleStyle: {
          fontFamily: Platform.OS === 'ios' ? 'Cairo' : undefined,
          fontWeight: '700',
        },
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreenWrapper}
        options={{ headerShown: false }}
      />
      <Tab.Screen
        name="Tasbih"
        component={TasbihScreen}
        options={{ headerShown: false }}
      />
      <Tab.Screen
        name="Azkar"
        component={AdhkarScreen}
        options={{ headerShown: false }}
      />
      <Tab.Screen
        name="PrayerTimes"
        component={PrayerTimesScreen}
        options={{ headerShown: false }}
      />
      <Tab.Screen
        name="Statistics"
        component={StatisticsScreen}
        options={{ headerShown: false }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ headerShown: false }}
      />
    </Tab.Navigator>
  );
}

/**
 * HomeScreen — wrapped inline to avoid circular imports.
 * Displays a quick dashboard of today's progress.
 */
function HomeScreenWrapper() {
  const HomeScreen = require('../screens/HomeScreen').default;
  return <HomeScreen />;
}

export { COLORS };
export default AppNavigator;
