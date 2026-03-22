import React, { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Stack, useRouter, useSegments } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';

import { UserProvider, useUser } from '../src/context/UserContext';
import { PALETTE } from '../src/constants/theme';

SplashScreen.preventAutoHideAsync();

const RootNavigation = () => {
  const { user, userData, loading } = useUser();
  const segments = useSegments();
  const router = useRouter();

  // STRICT GUARD: If we have an active user token but the database hasn't populated 
  // the email yet, we are holding placeholder data and MUST WAIT before routing.
  const isSyncing = user && (!userData || !userData.email);
  const isAppReady = !loading && !isSyncing;

  // SPLASH SCREEN EFFECT
  useEffect(() => {
    if (isAppReady) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [isAppReady]);

  // ROUTING EFFECT
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

  // Lock the screen to prevent routing race conditions
  if (!isAppReady) {
    return (
      <View style={{ flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#FF3B30" />
      </View>
    ); 
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