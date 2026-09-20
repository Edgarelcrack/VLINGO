import React from 'react';
import { Text, View, Platform, ActivityIndicator, TouchableOpacity } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
import EditorPreguntasScreen  from '../screens/EditorPreguntasScreen';
import EditorContenidoScreen  from '../screens/EditorContenidoScreen';
import PlacementScreen        from '../screens/PlacementScreen';

import { useAuth } from '../context/AuthContext';
import { Colors } from '../theme';
import AnimatedScreen from '../components/AnimatedScreen';

const withFade = <P extends object>(Component: React.ComponentType<P>) => {
  const Wrapped = (props: P) => (
    <AnimatedScreen>
      <Component {...props} />
    </AnimatedScreen>
  );
  Wrapped.displayName = `Animated(${Component.displayName ?? Component.name ?? 'Screen'})`;
  return Wrapped;
};

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
    <Stack.Navigator screenOptions={{ ...screenOpts, headerShown: false }}>
      <Stack.Screen name="HomeMain" component={HomeScreen} />
      <Stack.Screen name="Curso"    component={CursoScreen} />
      <Stack.Screen name="Parte"    component={ParteCursoScreen} />
    </Stack.Navigator>
  );
}

function LessonsStack() {
  return (
    <Stack.Navigator screenOptions={{ ...screenOpts, headerShown: false }}>
      <Stack.Screen name="CursosList"      component={CursosListScreen} />
      <Stack.Screen name="Curso"           component={CursoScreen} />
      <Stack.Screen name="Parte"           component={ParteCursoScreen} />
      <Stack.Screen name="CrearCurso"      component={CrearCursoScreen} />
      <Stack.Screen name="EditorSecciones" component={EditorSeccionesScreen} />
      <Stack.Screen name="EditorPreguntas" component={EditorPreguntasScreen} />
      <Stack.Screen name="EditorContenido" component={EditorContenidoScreen} />
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

const HomeStackAnimated    = withFade(HomeStack);
const LessonsStackAnimated = withFade(LessonsStack);
const ChatStackAnimated    = withFade(ChatStack);
const PerfilScreenAnimated = withFade(PerfilScreen);

function AppTabs() {
  const insets = useSafeAreaInsets();
  const baseHeight = Platform.OS === 'ios' ? 64 : 58;
  const basePaddingBottom = Platform.OS === 'ios' ? 4 : 8;
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
          height: baseHeight + insets.bottom,
          paddingBottom: basePaddingBottom + insets.bottom,
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
        component={HomeStackAnimated}
        options={{
          headerShown: false,
          tabBarLabel: 'Home',
          tabBarIcon: ({ focused, color }) =>
            <Ionicons name={focused ? 'home' : 'home-outline'} size={22} color={color} />,
        }}
      />
      <Tab.Screen
        name="LessonsTab"
        component={LessonsStackAnimated}
        options={{
          headerShown: false,
          tabBarLabel: 'Cursos',
          tabBarIcon: ({ focused, color }) =>
            <Ionicons name={focused ? 'book' : 'book-outline'} size={22} color={color} />,
        }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            if (navigation.isFocused()) {
              e.preventDefault();
              navigation.navigate('LessonsTab', { screen: 'CursosList' });
            }
          },
        })}
      />
      <Tab.Screen
        name="ChatTab"
        component={ChatStackAnimated}
        options={{
          headerShown: false,
          tabBarLabel: 'Chat',
          tabBarIcon: ({ focused, color }) =>
            <Ionicons name={focused ? 'chatbubble' : 'chatbubble-outline'} size={22} color={color} />,
        }}
      />
      <Tab.Screen
        name="PerfilTab"
        component={PerfilScreenAnimated}
        options={{
          headerShown: false,
          tabBarLabel: 'Perfil',
          tabBarIcon: ({ focused, color }) =>
            <Ionicons name={focused ? 'person' : 'person-outline'} size={22} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}

function LoadingScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: '#F2F4F6', alignItems: 'center', justifyContent: 'center' }}>
      <View style={{
        width: 72, height: 72, borderRadius: 36,
        backgroundColor: '#2B4C72',
        alignItems: 'center', justifyContent: 'center', marginBottom: 20,
        shadowColor: '#2B4C72', shadowOpacity: 0.25, shadowRadius: 12, shadowOffset: { width: 0, height: 4 },
        elevation: 5,
      }}>
        <Text style={{ fontSize: 32, fontWeight: '900', color: '#fff' }}>V</Text>
      </View>
      <ActivityIndicator color="#2B4C72" size="large" />
    </View>
  );
}

/**
 * Salida cuando el perfil no carga. Sin esto, un fallo de red al abrir la app
 * dejaba al usuario en la pantalla de carga indefinidamente, sin mensaje.
 */
function ProfileErrorScreen({
  mensaje,
  onReintentar,
  onSalir,
}: {
  mensaje: string;
  onReintentar: () => Promise<void>;
  onSalir: () => Promise<void>;
}) {
  const [reintentando, setReintentando] = React.useState(false);

  const reintentar = async () => {
    setReintentando(true);
    try { await onReintentar(); } finally { setReintentando(false); }
  };

  return (
    <View style={{
      flex: 1, backgroundColor: '#F2F4F6',
      alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32,
    }}>
      <Ionicons name="cloud-offline-outline" size={44} color="#2B4C72" />
      <Text style={{ fontSize: 17, fontWeight: '800', color: '#1E2D3D', marginTop: 16, textAlign: 'center' }}>
        No se pudo cargar tu perfil
      </Text>
      <Text style={{ fontSize: 13, color: '#6B7A8C', marginTop: 8, textAlign: 'center' }}>
        Revisa tu conexión e inténtalo de nuevo.
      </Text>
      <Text style={{ fontSize: 11, color: '#9AA7B5', marginTop: 6, textAlign: 'center' }} numberOfLines={3}>
        {mensaje}
      </Text>
      <TouchableOpacity
        onPress={reintentar}
        disabled={reintentando}
        activeOpacity={0.85}
        style={{
          marginTop: 22, backgroundColor: '#2B4C72', borderRadius: 12,
          paddingVertical: 13, paddingHorizontal: 34, minWidth: 150,
          alignItems: 'center', opacity: reintentando ? 0.6 : 1,
        }}
      >
        {reintentando
          ? <ActivityIndicator color="#fff" />
          : <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>Reintentar</Text>}
      </TouchableOpacity>
      <TouchableOpacity onPress={onSalir} style={{ marginTop: 14 }} activeOpacity={0.7}>
        <Text style={{ color: '#6B7A8C', fontSize: 13, fontWeight: '600' }}>Cerrar sesión</Text>
      </TouchableOpacity>
    </View>
  );
}

function RootNavigator() {
  const { session, userProfile, loading, profileError, refreshProfile, signOut } = useAuth();

  if (loading) return <LoadingScreen />;
  if (!session) return <AuthStack />;

  // Si hay sesión pero el perfil aún no se ha cargado, esperamos antes de
  // decidir si mostrar el test o las tabs (evita un flash de AppTabs).
  if (!userProfile) {
    if (profileError) {
      return (
        <ProfileErrorScreen
          mensaje={profileError}
          onReintentar={refreshProfile}
          onSalir={signOut}
        />
      );
    }
    return <LoadingScreen />;
  }

  // Solo estudiantes con nivel === null deben hacer el test de nivelación.
  // Profesores y administradores nunca entran aquí.
  const needsPlacement =
    userProfile.tipo === 'estudiante' && userProfile.nivel === null;
  if (needsPlacement) return <PlacementScreen />;

  return <AppTabs />;
}

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <RootNavigator />
    </NavigationContainer>
  );
}
