import React from 'react';
import { Text, View, Platform, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import HomeScreen             from '../screens/HomeScreen';
import ChatScreen             from '../screens/ChatScreen';
import ChatHistoryScreen    from '../screens/ChatHistoryScreen';
import CursosListScreen       from '../screens/CursosListScreen';
import CursoScreen            from '../screens/CursoScreen';
import ParteCursoScreen       from '../screens/ParteCursoScreen';
import PerfilScreen           from '../screens/PerfilScreen';
import LoginScreen            from '../screens/LoginScreen';
import RegisterScreen         from '../screens/RegisterScreen';
import ForgotPasswordScreen   from '../screens/ForgotPasswordScreen';
import CrearCursoScreen       from '../screens/CrearCursoScreen';
import EditorSeccionesScreen  from '../screens/EditorSeccionesScreen';

import { useAuth } from '../context/AuthContext';
import { Colors } from '../theme';

const Stack = createNativeStackNavigator();
const Tab   = createBottomTabNavigator();

const screenOpts = {
  headerStyle: { backgroundColor: Colors.bg },
  headerTintColor: Colors.text,
  headerTitleStyle: { fontWeight: '800' as const, fontSize: 17, color: Colors.text },
  headerShadowVisible: false,
  contentStyle: { backgroundColor: Colors.bg },
};

function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ ...screenOpts, headerShown: false }}>
      <Stack.Screen name="Login"          component={LoginScreen} />
      <Stack.Screen name="Register"       component={RegisterScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
    </Stack.Navigator>
  );
}

function HomeStack() {
  return (
    <Stack.Navigator screenOptions={screenOpts}>
      <Stack.Screen name="HomeMain" component={HomeScreen}      options={{ headerShown: false }} />
      <Stack.Screen name="Curso"    component={CursoScreen}     options={({ route }: any) => ({ title: route.params?.titulo ?? 'Curso' })} />
      <Stack.Screen name="Parte"    component={ParteCursoScreen} options={({ route }: any) => ({ title: route.params?.titulo ?? 'Parte' })} />
    </Stack.Navigator>
  );
}

function LessonsStack() {
  return (
    <Stack.Navigator screenOptions={screenOpts}>
      <Stack.Screen name="CursosList"      component={CursosListScreen}      options={{ headerShown: false }} />
      <Stack.Screen name="Curso"           component={CursoScreen}           options={({ route }: any) => ({ title: route.params?.titulo ?? 'Curso' })} />
      <Stack.Screen name="Parte"           component={ParteCursoScreen}      options={({ route }: any) => ({ title: route.params?.titulo ?? 'Parte' })} />
      <Stack.Screen name="CrearCurso"      component={CrearCursoScreen}      options={{ title: 'Nuevo curso', headerShown: true }} />
      <Stack.Screen name="EditorSecciones" component={EditorSeccionesScreen} options={{ title: 'Editor', headerShown: false }} />
    </Stack.Navigator>
  );
}

function ChatStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ChatHistory"      component={ChatHistoryScreen} />
      <Stack.Screen name="ChatConversation" component={ChatScreen} />
    </Stack.Navigator>
  );
}

function AppTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: Colors.bg },
        headerTintColor: Colors.text,
        headerTitleStyle: { fontWeight: '800' as const, color: Colors.text },
        headerShadowVisible: false,
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopColor: Colors.border,
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 82 : 70,
          paddingBottom: Platform.OS === 'ios' ? 18 : 12,
          paddingTop: 6,
        },
        tabBarShowLabel: true,
        tabBarActiveTintColor: Colors.accentBlue,
        tabBarInactiveTintColor: Colors.text3,
        tabBarLabelStyle: {
          fontSize: 9,
          fontWeight: '700' as const,
          letterSpacing: 0.8,
          textTransform: 'uppercase' as const,
        },
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeStack}
        options={{
          headerShown: false,
          tabBarLabel: 'Home',
          tabBarIcon: ({ focused, color }) =>
            <Ionicons name={focused ? 'home' : 'home-outline'} size={22} color={color} />,
        }}
      />
      <Tab.Screen
        name="LessonsTab"
        component={LessonsStack}
        options={{
          headerShown: false,
          tabBarLabel: 'Cursos',
          tabBarIcon: ({ focused, color }) =>
            <Ionicons name={focused ? 'book' : 'book-outline'} size={22} color={color} />,
        }}
      />
      <Tab.Screen
        name="ChatTab"
        component={ChatStack}
        options={{
          headerShown: false,
          tabBarLabel: 'Chat',
          tabBarIcon: ({ focused, color }) =>
            <Ionicons name={focused ? 'chatbubble' : 'chatbubble-outline'} size={22} color={color} />,
        }}
      />
      <Tab.Screen
        name="PerfilTab"
        component={PerfilScreen}
        options={{
          title: 'Mi Perfil',
          tabBarLabel: 'Perfil',
          tabBarIcon: ({ focused, color }) =>
            <Ionicons name={focused ? 'person' : 'person-outline'} size={22} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}

function RootNavigator() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{
          width: 64, height: 64, borderRadius: 32,
          backgroundColor: Colors.accentBlue,
          alignItems: 'center', justifyContent: 'center', marginBottom: 16,
        }}>
          <Text style={{ fontSize: 28, fontWeight: '900', color: '#fff' }}>V</Text>
        </View>
        <ActivityIndicator color={Colors.accentBlue} size="large" />
      </View>
    );
  }

  return session ? <AppTabs /> : <AuthStack />;
}

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <RootNavigator />
    </NavigationContainer>
  );
}
