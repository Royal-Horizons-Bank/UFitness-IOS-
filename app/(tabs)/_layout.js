import React from 'react';
import { Platform, StyleSheet, View, useColorScheme } from 'react-native';
import { Tabs } from 'expo-router';
import { NativeTabs, Icon, Label } from 'expo-router/unstable-native-tabs';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PALETTE } from '../../src/constants/theme';

export default function TabsLayout() {
  const theme = useColorScheme() || 'dark';
  const colors = PALETTE[theme];
  const insets = useSafeAreaInsets();

  // 🍏 iOS EXCLUSIVE: True Native Liquid Glass Tabs & SF Symbols
  if (Platform.OS === 'ios') {
    return (
      <NativeTabs
        iconColor={{
          default: colors.textDim,
          selected: colors.primary,
        }}
        labelStyle={{
          default: { color: colors.textDim },
          selected: { color: colors.primary },
        }}
      >
        <NativeTabs.Trigger name="profile">
          <Icon sf="person.crop.circle.fill" />
          <Label>Profile</Label>
        </NativeTabs.Trigger>
        
        <NativeTabs.Trigger name="workout">
          <Icon sf="figure.run" />
          <Label>Workout</Label>
        </NativeTabs.Trigger>
        
        <NativeTabs.Trigger name="index">
          <Icon sf="house.fill" />
          <Label>Home</Label>
        </NativeTabs.Trigger>
        
        <NativeTabs.Trigger name="compete">
          <Icon sf="person.2.fill" />
          <Label>Compete</Label>
        </NativeTabs.Trigger>
        
        <NativeTabs.Trigger name="daily">
          <Icon sf="calendar.day.timeline.left" />
          <Label>Daily</Label>
        </NativeTabs.Trigger>
      </NativeTabs>
    );
  }

  // 🤖 ANDROID EXCLUSIVE: Custom Glassmorphism & Vector Icons
  const androidBottomInset = Math.max(0, insets.bottom - 25);

  const renderGlowIcon = (name, focused, color, size) => (
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

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: true,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textDim,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginBottom: 10, 
        },
        tabBarStyle: [
          styles.tabBar,
          {
            height: 72 + androidBottomInset, 
            paddingBottom: androidBottomInset + 16, 
            paddingTop: 0, 
          }
        ],
        tabBarBackground: () => (
          <BlurView
            tint={theme === 'dark' ? 'dark' : 'light'}
            intensity={45}
            experimentalBlurMethod="dimezisBlurView" 
            style={StyleSheet.absoluteFill}
          />
        ),
      }}
    >
      <Tabs.Screen 
        name="profile" 
        options={{ title: "Profile", tabBarIcon: ({ focused, color, size }) => renderGlowIcon("person-outline", focused, color, size) }}
        listeners={{ tabPress: () => Haptics.selectionAsync() }}
      />
      <Tabs.Screen 
        name="workout" 
        options={{ title: "Workout", tabBarIcon: ({ focused, color, size }) => renderGlowIcon("barbell-outline", focused, color, size) }}
        listeners={{ tabPress: () => Haptics.selectionAsync() }}
      />
      <Tabs.Screen 
        name="index" 
        options={{ title: "Summary", tabBarIcon: ({ focused, color, size }) => renderGlowIcon("grid-outline", focused, color, size) }}
        listeners={{ tabPress: () => Haptics.selectionAsync() }}
      />
      <Tabs.Screen 
        name="compete" 
        options={{ title: "Compete", tabBarIcon: ({ focused, color, size }) => renderGlowIcon("trophy-outline", focused, color, size) }}
        listeners={{ tabPress: () => Haptics.selectionAsync() }}
      />
      <Tabs.Screen 
        name="daily" 
        options={{ title: "Daily", tabBarIcon: ({ focused, color, size }) => renderGlowIcon("calendar-outline", focused, color, size) }}
        listeners={{ tabPress: () => Haptics.selectionAsync() }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
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