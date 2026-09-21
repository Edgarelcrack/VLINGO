import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { subirAudioDesdeUri } from '../services/storageService';

const NAVY  = '#2B4C72';
const GREEN = '#2E7D52';
const RED   = '#E05A4E';


const MAX_SEGUNDOS = 300;

type Estado = 'idle' | 'grabando' | 'grabado' | 'subiendo';

const mmss = (total: number) => {
  const m = Math.floor(total / 60).toString().padStart(2, '0');
  const s = Math.floor(total % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
};

export default function GrabadorAudio({
  onSubido,
  disabled,
}: {
  onSubido: (url: string) => void;
  disabled?: boolean;
}) {
  const [estado, setEstado]               = useState<Estado>('idle');
  const [segundos, setSegundos]           = useState(0);
  const [reproduciendo, setReproduciendo] = useState(false);

  const grabacionRef = useRef<Audio.Recording | null>(null);
  const sonidoRef    = useRef<Audio.Sound | null>(null);
  const uriRef       = useRef<string | null>(null);
  const timerRef     = useRef<ReturnType<typeof setInterval> | null>(null);
  const segundosRef  = useRef(0);
  const montadoRef   = useRef(true);

  const pararTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    montadoRef.current = true;
    return () => {
      montadoRef.current = false;
      pararTimer();
      grabacionRef.current?.stopAndUnloadAsync().catch(() => {});
      sonidoRef.current?.setOnPlaybackStatusUpdate(null);
      sonidoRef.current?.unloadAsync().catch(() => {});
      Audio.setAudioModeAsync({ allowsRecordingIOS: false }).catch(() => {});
    };
  }, [pararTimer]);

  const descartarSonido = useCallback(async () => {
    const s = sonidoRef.current;
    sonidoRef.current = null;
    if (s) {
      s.setOnPlaybackStatusUpdate(null);
      await s.unloadAsync().catch(() => {});
    }
    if (montadoRef.current) setReproduciendo(false);
  }, []);

  const empezar = async () => {
    try {
      const permiso = await Audio.requestPermissionsAsync();
      if (!permiso.granted) {
        Alert.alert(
          'Permiso denegado',
          'Necesitas conceder acceso al micrófono para grabar audio.',
        );
        return;
      }

      await descartarSonido();
      uriRef.current = null;

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY,
      );
      grabacionRef.current = recording;

      if (!montadoRef.current) {
        // Se desmontó mientras pedíamos permiso
        await recording.stopAndUnloadAsync().catch(() => {});
        return;
      }

      segundosRef.current = 0;
      setSegundos(0);
      setEstado('grabando');

      timerRef.current = setInterval(() => {
        segundosRef.current += 1;
        setSegundos(segundosRef.current);
        // Corte automático al llegar al tope
        if (segundosRef.current >= MAX_SEGUNDOS) detener();
      }, 1000);
    } catch {
      if (montadoRef.current) {
        setEstado('idle');
        Alert.alert('Error', 'No se pudo iniciar la grabación.');
      }
    }
  };

  const detener = async () => {
    pararTimer();
    const rec = grabacionRef.current;
    grabacionRef.current = null;
    if (!rec) return;

    try {
      await rec.stopAndUnloadAsync();
      uriRef.current = rec.getURI();
      // Devolver el modo normal, si no en iOS la reproducción sale muy baja
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
      if (montadoRef.current) {
        setEstado(uriRef.current ? 'grabado' : 'idle');
      }
    } catch {
      if (montadoRef.current) {
        setEstado('idle');
        Alert.alert('Error', 'No se pudo finalizar la grabación.');
      }
    }
  };

  const alternarPreview = async () => {
    const uri = uriRef.current;
    if (!uri) return;

    if (sonidoRef.current) {
      const s = sonidoRef.current;
      if (reproduciendo) {
        await s.pauseAsync().catch(() => {});
        if (montadoRef.current) setReproduciendo(false);
      } else {
        // Si terminó, volver al inicio antes de repetir
        await s.replayAsync().catch(() => {});
        if (montadoRef.current) setReproduciendo(true);
      }
      return;
    }

    try {
      const { sound } = await Audio.Sound.createAsync({ uri }, { shouldPlay: true });
      sonidoRef.current = sound;
      if (montadoRef.current) setReproduciendo(true);

      sound.setOnPlaybackStatusUpdate(status => {
        if (status.isLoaded && status.didJustFinish && montadoRef.current) {
          setReproduciendo(false);
        }
      });
    } catch {
      Alert.alert('Error', 'No se pudo reproducir la grabación.');
    }
  };

  const repetir = async () => {
    await descartarSonido();
    uriRef.current = null;
    segundosRef.current = 0;
    setSegundos(0);
    setEstado('idle');
  };

  const usar = async () => {
    const uri = uriRef.current;
    if (!uri) return;

    await descartarSonido();
    setEstado('subiendo');

    const { url, error } = await subirAudioDesdeUri(
      uri,
      `grabacion_${Date.now()}.m4a`,
    );

    if (!montadoRef.current) return;

    if (error || !url) {
      setEstado('grabado');
      Alert.alert('Error al subir la grabación', error ?? 'Inténtalo de nuevo.');
      return;
    }

    onSubido(url);
    uriRef.current = null;
    segundosRef.current = 0;
    setSegundos(0);
    setEstado('idle');
  };

  // Render

  if (estado === 'subiendo') {
    return (
      <View style={g.caja}>
        <ActivityIndicator size="small" color={NAVY} />
        <Text style={g.texto}>Subiendo grabación...</Text>
      </View>
    );
  }

  if (estado === 'grabando') {
    return (
      <View style={[g.caja, g.cajaGrabando]}>
        <View style={g.punto} />
        <Text style={[g.texto, { color: RED, flex: 1 }]}>
          Grabando · {mmss(segundos)}
        </Text>
        <TouchableOpacity onPress={detener} style={g.btnStop} activeOpacity={0.8}>
          <Ionicons name="stop" size={14} color="#fff" />
          <Text style={g.btnStopTxt}>Detener</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (estado === 'grabado') {
    return (
      <View style={g.wrap}>
        <View style={[g.caja, g.cajaLista]}>
          <TouchableOpacity onPress={alternarPreview} style={g.btnPlay} activeOpacity={0.8}>
            <Ionicons name={reproduciendo ? 'pause' : 'play'} size={16} color="#fff" />
          </TouchableOpacity>
          <Text style={[g.texto, { flex: 1 }]}>
            Grabación lista · {mmss(segundos)}
          </Text>
        </View>
        <Text style={g.ayuda}>Escúchala antes de guardarla.</Text>
        <View style={g.fila}>
          <TouchableOpacity onPress={repetir} style={g.btnSec} activeOpacity={0.8}>
            <Ionicons name="refresh" size={15} color={NAVY} />
            <Text style={g.btnSecTxt}>Repetir</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={usar} style={g.btnPrim} activeOpacity={0.85}>
            <Ionicons name="checkmark" size={15} color="#fff" />
            <Text style={g.btnPrimTxt}>Usar esta grabación</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <TouchableOpacity
      style={[g.caja, disabled && { opacity: 0.5 }]}
      onPress={empezar}
      disabled={disabled}
      activeOpacity={0.8}
    >
      <Ionicons name="mic-outline" size={18} color={NAVY} />
      <Text style={g.texto}>Grabar mi propio audio</Text>
    </TouchableOpacity>
  );
}

const g = StyleSheet.create({
  wrap: { gap: 8 },
  caja: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 1, borderColor: '#DFE5EC', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12, backgroundColor: '#F7F9FC',
  },
  cajaGrabando: { borderColor: RED + '55', backgroundColor: RED + '10' },
  cajaLista:    { borderColor: GREEN + '55', backgroundColor: GREEN + '10' },
  texto: { fontSize: 13, color: NAVY, fontWeight: '600' },
  ayuda: { fontSize: 11, color: '#8A97A6', paddingHorizontal: 2 },
  punto: { width: 10, height: 10, borderRadius: 5, backgroundColor: RED },
  fila:  { flexDirection: 'row', gap: 8 },
  btnStop: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: RED, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8,
  },
  btnStopTxt: { color: '#fff', fontSize: 12, fontWeight: '700' },
  btnPlay: {
    width: 34, height: 34, borderRadius: 17, backgroundColor: GREEN,
    alignItems: 'center', justifyContent: 'center',
  },
  btnSec: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    borderWidth: 1, borderColor: '#DFE5EC', borderRadius: 10,
    paddingVertical: 10, paddingHorizontal: 14,
  },
  btnSecTxt: { color: NAVY, fontSize: 13, fontWeight: '600' },
  btnPrim: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, backgroundColor: NAVY, borderRadius: 10, paddingVertical: 10,
  },
  btnPrimTxt: { color: '#fff', fontSize: 13, fontWeight: '700' },
});
