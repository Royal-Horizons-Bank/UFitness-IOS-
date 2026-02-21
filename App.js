import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { UserProvider, useUser } from './src/context/UserContext';

// --- SCREENS IMPORT ---
import AuthScreen from './src/screens/AuthScreen';
import SetupScreen from './src/screens/SetupScreen'; 
import BottomTabNavigator from './src/navigation/BottomTabNavigator';
import HistoryScreen from './src/screens/HistoryScreen';
import BodyStatsScreen from './src/screens/BodyStatsScreen';
import SettingsScreen from './src/screens/SettingsScreen'; // <--- NEW IMPORT

const Stack = createNativeStackNavigator();

const RootNavigator = () => {
  const { user, userData, loading } = useUser();

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#B93237" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          userData && !userData.isSetupComplete ? (
            <Stack.Group>
              <Stack.Screen name="Setup" component={SetupScreen} />
            </Stack.Group>
          ) : (
            <Stack.Group>
              <Stack.Screen name="MainTabs" component={BottomTabNavigator} />
              
              <Stack.Screen 
                name="History" 
                component={HistoryScreen} 
                options={{ animation: 'slide_from_right' }} 
              />
              
              <Stack.Screen 
                name="BodyStats" 
                component={BodyStatsScreen} 
                options={{ animation: 'slide_from_right' }} 
              />

              <Stack.Screen 
                name="Settings" 
                component={SettingsScreen} 
                options={{ animation: 'slide_from_right' }} 
              />
            </Stack.Group>
          )
        ) : (
          <Stack.Group>
            <Stack.Screen name="Auth" component={AuthScreen} />
          </Stack.Group>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default function App() {
  return (
    <SafeAreaProvider>
      <UserProvider>
        <StatusBar style="light" />
        <RootNavigator />
      </UserProvider>
    </SafeAreaProvider>
  );
}