import { useCallback, useEffect, useRef, useState } from 'react';
import { NativeScrollEvent, NativeSyntheticEvent, ScrollView } from 'react-native';
import { useTecladoEnfoque } from './useTecladoEnfoque';
import { obtenerCampoActivo } from '../components/CampoTexto';

/** Separación entre el campo y el borde del teclado. */
const MARGEN = 8;

/**
 * Espera entre reservar el recorrido y desplazar. Si desplazamos en el mismo
 * instante en que añadimos el paddingBottom, ese recorrido todavía no existe y
 * Android recorta el scroll al máximo disponible — lo sufría justo el último
 * campo del formulario, que es el que más recorrido necesita.
 */
const ESPERA_RECORRIDO_MS = 90;

/**
 * Deja el campo enfocado justo encima del teclado, sin encoger la pantalla.
 *
 * El ScrollView conserva toda su altura y el contenido pasa por detrás del
 * teclado (encogerlo dejaba una franja muerta). Dos fases: primero se reserva
 * recorrido con `espacioTeclado`, después se desplaza.
 *
 * Uso:
 *   const { scrollRef, scrollProps, espacioTeclado } = useKeyboardAwareScroll();
 *   <ScrollView
 *     ref={scrollRef}
 *     {...scrollProps}
 *     contentContainerStyle={[s.content, { paddingBottom: 24 + espacioTeclado }]}
 *   />
 */
export function useKeyboardAwareScroll() {
  const scrollRef = useRef<ScrollView>(null);
  const offsetY   = useRef(0);
  const temporizadorRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [espacioTeclado, setEspacioTeclado] = useState(0);

  const onScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    offsetY.current = e.nativeEvent.contentOffset.y;
  }, []);

  useEffect(() => () => {
    if (temporizadorRef.current) clearTimeout(temporizadorRef.current);
  }, []);

  useTecladoEnfoque(estado => {
    if (temporizadorRef.current) clearTimeout(temporizadorRef.current);

    if (!estado) { setEspacioTeclado(0); return; }

    // Fase 1: reservar recorrido
    setEspacioTeclado(estado.altura);

    // Fase 2: desplazar, ya con el recorrido aplicado
    temporizadorRef.current = setTimeout(() => {
      const scroll = scrollRef.current;
      const campo  = obtenerCampoActivo();
      if (!scroll || !campo) return;

      try {
        campo.measureInWindow((_x, y, _w, alto) => {
          // Solo si el teclado lo tapa; un campo que ya se ve no se mueve.
          const falta = y + alto + MARGEN - estado.borde;
          if (falta > 0) {
            scroll.scrollTo({ y: offsetY.current + falta, animated: true });
          }
        });
      } catch {}
    }, ESPERA_RECORRIDO_MS);
  });

  return {
    scrollRef,
    espacioTeclado,
    scrollProps: {
      onScroll,
      scrollEventThrottle: 16,
      // Sin esto, con el teclado abierto el primer toque en un botón solo
      // cierra el teclado en vez de pulsarlo.
      keyboardShouldPersistTaps: 'handled' as const,
    },
  };
}
