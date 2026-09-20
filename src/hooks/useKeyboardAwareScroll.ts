import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Keyboard,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  TextInput,
} from 'react-native';

/**
 * Mantiene visible el TextInput enfocado cuando aparece el teclado.
 *
 * En Android el manifest usa `adjustResize`, así que la ventana se encoge al
 * abrir el teclado — pero nada desplaza el campo enfocado dentro del ScrollView.
 * Si el input queda en la mitad inferior, el teclado lo tapa y el usuario
 * escribe sin ver lo que escribe.
 *
 * Uso:
 *   const { scrollRef, scrollProps, keyboardHeight } = useKeyboardAwareScroll();
 *   <ScrollView
 *     ref={scrollRef}
 *     {...scrollProps}
 *     contentContainerStyle={{ paddingBottom: base + keyboardHeight }}
 *   />
 *
 * El `paddingBottom` extra es imprescindible: sin él, un input que sea el
 * último elemento no tiene hacia dónde desplazarse.
 */
export function useKeyboardAwareScroll(margen = 24) {
  const scrollRef = useRef<ScrollView>(null);
  const offsetY   = useRef(0);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const onScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    offsetY.current = e.nativeEvent.contentOffset.y;
  }, []);

  useEffect(() => {
    const mostrar = Keyboard.addListener('keyboardDidShow', e => {
      setKeyboardHeight(e.endCoordinates.height);

      const scroll = scrollRef.current;
      const input  = TextInput.State.currentlyFocusedInput?.();
      if (!scroll || !input) return;

      const tecladoTop = e.endCoordinates.screenY;

      // measureInWindow puede fallar si el nodo se desmontó entre medias
      try {
        input.measureInWindow((_x, y, _w, alto) => {
          const invasion = y + alto + margen - tecladoTop;
          if (invasion > 0) {
            scroll.scrollTo({ y: offsetY.current + invasion, animated: true });
          }
        });
      } catch {}
    });

    const ocultar = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardHeight(0);
    });

    return () => {
      mostrar.remove();
      ocultar.remove();
    };
  }, [margen]);

  return {
    scrollRef,
    keyboardHeight,
    scrollProps: {
      onScroll,
      scrollEventThrottle: 16,
      // Sin esto, con el teclado abierto el primer toque en un botón solo
      // cierra el teclado en vez de pulsarlo.
      keyboardShouldPersistTaps: 'handled' as const,
    },
  };
}
