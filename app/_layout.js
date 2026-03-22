import React, { useEffect } from 'react';
import { View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Stack, useRouter, useSegments } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';

import { UserProvider, useUser } from '../src/context/UserContext';

// Keep the native splash screen visible while loading
SplashScreen.preventAutoHideAsync();

const RootNavigation = () => {
  const { user, userData, loading } = useUser();
  const segments = useSegments();
  const router = useRouter();

  // GUARD: If we have an active user token but the database hasn't populated 
  // the email yet, we are holding placeholder data and must wait before routing.
  const isSyncing = user && (!userData || !userData.email);
  const isAppReady = !loading && !isSyncing;

  // 1. SPLASH SCREEN EFFECT
  useEffect(() => {
    if (isAppReady) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [isAppReady]);

  // 2. ROUTING EFFECT
  useEffect(() => {
    if (!isAppReady) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inSetupGroup = segments[0] === '(setup)';

    if (!user) {
      if (!inAuthGroup) router.replace('/(auth)/login');
    } else if (user && userData && !userData.isSetupComplete) {
      if (!inSetupGroup) router.replace('/(setup)');
    } else if (user && userData?.isSetupComplete) {
      if (inAuthGroup || inSetupGroup) router.replace('/(tabs)');
    }
  }, [user, userData, isAppReady, segments]);

  // Keep rendering null so the native splash screen stays locked until we are ready
  if (!isAppReady) {
    return null; 
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(setup)" options={{ headerShown: false }} />
      
      <Stack.Screen name="history" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="bodystats" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="settings" options={{ animation: 'slide_from_right' }} />
    </Stack>
  );
};

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <UserProvider>
        <StatusBar style="light" />
        <RootNavigation />
      </UserProvider>
    </SafeAreaProvider>
  );
}