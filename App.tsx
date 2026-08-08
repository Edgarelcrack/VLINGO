import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/context/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';
import { bootstrapApiUrl } from './src/lib/config';

export default function App() {
  // Solo espera la caché local de la URL de la API (milisegundos); el refresco
  // contra Supabase corre en segundo plano para no retrasar el arranque.
  const [listo, setListo] = useState(false);

  useEffect(() => {
    bootstrapApiUrl().finally(() => setListo(true));
  }, []);

  if (!listo) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F2F4F6' }}>
        <ActivityIndicator size="large" color="#2B4C72" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="dark" backgroundColor="#F2F4F6" />
        <AppNavigator />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
