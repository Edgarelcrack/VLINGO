# VLINGO

Prototipo de aplicación móvil (Android) para el aprendizaje del inglés con un asistente virtual basado en inteligencia artificial.

> Trabajo de grado — Universidad del Valle, sede Tuluá (2026).
> Autores: Juan Pablo Escobar Viveros y Edgar Andrés Vargas García.
> Director: Joshua David Triana Madrid, MSc.

## Descripción

VLINGO permite a un estudiante:

- Presentar una **prueba de nivelación** y obtener un nivel MCER.
- Tomar **cursos** organizados en secciones y lecciones, con preguntas de lectura, escritura, listening y pronunciación.
- Ganar **XP, rachas diarias y logros** (gamificación).
- Conversar con un **asistente de IA** y recibir evaluación de sus textos escritos.

El profesor puede crear cursos, secciones, contenido y preguntas desde la misma aplicación.

## Requisitos previos

- **Node.js 20.16 o superior** y npm.
- La app **Expo Go** instalada en tu celular (Android o iOS), con el celular y el computador en la **misma red Wi-Fi**.
- (Opcional) **Android Studio** y **JDK**, solo si se quiere compilar el proyecto nativo o generar un APK.
- Un proyecto de **Supabase** con las tablas y funciones del modelo (`usuario`, `curso`, `seccion`, `pregunta`, `progreso_usuario`, `app_config`, el bucket `audio-ejercicios` y las funciones RPC).

> **Nota:** en Expo Go funciona la mayoría de las pantallas, pero el reconocimiento de voz de los ejercicios de pronunciación (`expo-speech-recognition`) necesita código nativo y **no funciona en Expo Go**. Para probarlo, se compila con `npx expo run:android`.

## Instalación

```bash
# 1. Clonar el repositorio
git clone <URL-DEL-REPOSITORIO>
cd vlingo-app

# 2. Instalar dependencias
npm install
```

## Variables de entorno

Crear un archivo `.env` en la raíz del proyecto:

```env
SUPABASE_URL=https://TU-PROYECTO.supabase.co
SUPABASE_ANON_KEY=tu_clave_anon_de_supabase
API_URL=http://192.168.X.X:3000
API_KEY=tu_clave_compartida
```

| Variable | Descripción |
| --- | --- |
| `SUPABASE_URL` | URL del proyecto de Supabase |
| `SUPABASE_ANON_KEY` | Clave pública (anon) de Supabase |
| `API_URL` | Dirección de respaldo del servicio del asistente de IA |
| `API_KEY` | Clave compartida que la app envía en la cabecera `x-api-key` |

Notas:

- Las variables se inyectan **en tiempo de compilación** (`react-native-dotenv`). Si se cambian cambias, se tiene que volver a compilar la app.
- En uso normal, la app obtiene la dirección vigente del servicio desde la fila `api_url` de la tabla `app_config` en Supabase. `API_URL` solo se usa como respaldo.
- Nunca subir el `.env` al repositorio (agrégalo a `.gitignore`).

## Ejecución

Inicia el servidor de desarrollo:

```bash
npx expo start
```

Se mostrará un código QR en la terminal. Abrir con la app **Expo Go** . Si no conecta, probar con el modo túnel:

```bash
npx expo start --tunnel
```

Para limpiar la caché de Metro:

```bash
npx expo start -c
```

### Compilar en Android (opcional)

Necesario para usar el reconocimiento de voz. Con un dispositivo conectado por USB (depuración activada) o un emulador:

```bash
npm run android
```

### Generar un APK (EAS Build)
 
El APK se genera con **EAS Build**, el servicio de compilación de Expo. Necesitas una cuenta gratuita en [expo.dev](https://expo.dev).
 
```bash
# 1. Instalar EAS CLI (una sola vez)
npm install -g eas-cli
 
# 2. Iniciar sesión
eas login
 
# 3. Configurar el proyecto (solo la primera vez; crea eas.json)
eas build:configure
 
# 4. Generar el APK
eas build -p android --profile preview
```
 
Para que el perfil `preview` produzca un `.apk` instalable (y no un `.aab`), tu `eas.json` debe tener:
 
```json
{
  "build": {
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      }
    }
  }
}
```
 
Al terminar, EAS te entrega un enlace y un QR para descargar el APK e instalarlo en el celular.
 
> **Variables de entorno:** como `.env` no se versiona, EAS no lo recibe automáticamente. Definir `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `API_URL` y `API_KEY` en el proyecto de expo.dev (Environment variables) o en `eas.json` antes de compilar. Si no, el APK saldrá sin ellas.


## Pruebas

Las pruebas unitarias usan **Jest** con el preset `jest-expo` y cubren la nivelación inicial (`NIV`), la racha diaria (`RAC`) y el progreso de cursos (`PRO`).

```bash
npm run test:report
```

Este comando ejecuta las pruebas con cobertura, guarda los resultados en `reports/jest.json` y genera la tabla de resultados con `scripts/generar-tabla-pruebas.js`.

## Estructura del proyecto

```text
vlingo-app/
├── App.tsx                 # Punto de entrada
├── app.json                # Configuración de Expo (permisos y plugins)
├── babel.config.js         # Habilita el módulo @env
├── .env                    # Variables de entorno (no se versiona)
├── android/                # Proyecto nativo de Android generado por Expo
├── scripts/                # Utilidades (p. ej. generar-tabla-pruebas.js)
└── src/
    ├── screens/            # 15 pantallas (auth, nivelación, home, cursos, edición, chat, perfil)
    ├── navigation/         # AppNavigator.tsx (stacks y tabs)
    ├── context/            # AuthContext.tsx (sesión y perfil)
    ├── services/           # Acceso a Supabase (cursos, preguntas, puntuación, usuarios, storage)
    ├── lib/                # supabase.ts, config.ts, api.ts
    ├── data/               # placementQuestions.ts (banco de nivelación)
    ├── components/         # AnimatedScreen, SkeletonLoader
    ├── types/              # Tipos TypeScript y env.d.ts
    └── theme/              # Paleta de colores
```

## Tecnologías principales

- React Native 0.81.5, React 19.1 y Expo ~54
- TypeScript 5
- React Navigation 6 (stack y bottom tabs)
- Supabase (`@supabase/supabase-js`)
- `expo-speech-recognition`, `expo-av`, `expo-document-picker`, `expo-file-system`, `expo-haptics`
- Jest + `jest-expo`

## Problemas comunes

- **La pronunciación no funciona:** es una limitación de Expo Go. Compilar con `npm run android`.
- **Expo Go no conecta:** verifica que el celular y el PC estén en la misma red, o usa `npx expo start --tunnel`.
- **Cambió el `.env` y no se refleja:** las variables se incorporan al compilar; reiniciar con `npx expo start -c`.
- **El chat devuelve 401:** la `API_KEY` de la app no coincide con la del servicio, o se compiló la app sin definirla.

