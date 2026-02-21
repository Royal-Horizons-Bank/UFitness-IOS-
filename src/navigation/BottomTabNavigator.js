import React from 'react';
import { StyleSheet, Platform, useColorScheme, View } from 'react-native'; 
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Screens
import ProfileScreen from '../screens/ProfileScreen';
import WorkoutScreen from '../screens/WorkoutScreen';
import SummaryScreen from '../screens/SummaryScreen';
import DailyScreen from '../screens/DailyScreen';
import CompeteScreen from '../screens/CompeteScreen';

import { PALETTE, BLUR_INTENSITY } from '../constants/theme';

const Tab = createBottomTabNavigator();

const BottomTabNavigator = () => {
  const theme = useColorScheme() || 'light'; 
  const currentColors = PALETTE[theme]; 
  const insets = useSafeAreaInsets();
  
  // Lower the tab bar further on Android by subtracting 25 from the inset
  const androidBottomInset = Math.max(0, insets.bottom - 25);

  const renderGlowIcon = (name, focused, color, size) => {
    return (
      <View style={[
        styles.iconContainer,
        focused && {
          shadowColor: color,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.6,
          shadowRadius: 7, 
          elevation: 5 
        }
      ]}>
        <Ionicons name={name} size={size} color={color} />
      </View>
    );
  };

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarActiveTintColor: currentColors.tabIconActive,
        tabBarInactiveTintColor: currentColors.tabIconInactive,
        tabBarStyle: [
          styles.tabBar,
          Platform.OS === 'android' && {
            height: 60 + androidBottomInset, 
            paddingBottom: androidBottomInset,
          }
        ],
        tabBarBackground: () => (
          <BlurView
            tint={currentColors.blurTint}
            // Reduced intensity specifically for Android to make it less "thick"
            intensity={Platform.OS === 'android' ? 45 : BLUR_INTENSITY}
            // Maintains high-quality native glassmorphism on Android
            experimentalBlurMethod="dimezisBlurView" 
            style={StyleSheet.absoluteFill}
          />
        ),
      }}
    >
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen} 
        options={{
          tabBarIcon: ({ focused, color, size }) => renderGlowIcon("person-outline", focused, color, size),
        }}
        listeners={{ tabPress: () => Haptics.selectionAsync() }}
      />
      <Tab.Screen 
        name="Workout" 
        component={WorkoutScreen} 
        options={{
          tabBarIcon: ({ focused, color, size }) => renderGlowIcon("barbell-outline", focused, color, size),
        }}
        listeners={{ tabPress: () => Haptics.selectionAsync() }}
      />
      <Tab.Screen 
        name="Summary" 
        component={SummaryScreen} 
        options={{
          tabBarIcon: ({ focused, color, size }) => renderGlowIcon("grid-outline", focused, color, size),
        }}
        listeners={{ tabPress: () => Haptics.selectionAsync() }}
      />
      <Tab.Screen 
        name="Compete" 
        component={CompeteScreen} 
        options={{
          tabBarIcon: ({ focused, color, size }) => renderGlowIcon("trophy-outline", focused, color, size),
        }}
        listeners={{ tabPress: () => Haptics.selectionAsync() }}
      />
      <Tab.Screen 
        name="Daily" 
        component={DailyScreen} 
        options={{
          tabBarIcon: ({ focused, color, size }) => renderGlowIcon("calendar-outline", focused, color, size),
        }}
        listeners={{ tabPress: () => Haptics.selectionAsync() }}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    // Lowered the height for iOS from 85 to 75
    height: Platform.OS === 'ios' ? 75 : 65, 
    elevation: 0, 
    borderTopWidth: 0, 
    borderTopColor: 'transparent',
    overflow: 'hidden', 
  },
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  }
});

export default BottomTabNavigator;