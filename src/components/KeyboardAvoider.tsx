import React, { useEffect, useRef, useState } from 'react';
import { StyleProp, TextInput, View, ViewStyle } from 'react-native';
import { useTecladoEnfoque } from '../hooks/useTecladoEnfoque';

/** Separación entre el campo y el borde del teclado. */
const MARGEN = 8;

/** Damos por bueno el ajuste con esta holgura, en píxeles. */
const TOLERANCIA = 2;

/**
 * Pasadas de refinamiento y espera entre ellas.
 *
 * Un bloque anclado abajo acierta a la primera y se detiene. Pero un contenido
 * centrado (el modal de Perfil) sube solo la mitad de lo que se le añade, así
 * que hace falta repetir hasta que el campo quede realmente en el borde.
 */
const MAX_PASADAS = 8;
const ESPERA_PASADA_MS = 50;

/**
 * Sube el contenido lo justo para que el campo enfocado quede sobre el teclado.
 *
 * Para elementos anclados abajo (la barra del chat, las hojas de los editores,
 * los modales), que no pueden resolverlo con scroll.
 *
 * Mide el CAMPO ENFOCADO, no el contenedor: el contenedor llega hasta el fondo
 * de la pantalla y por debajo puede haber barra de pestañas o safe area, así
 * que reservaba de más y dejaba una franja vacía.
 */
export default function KeyboardAvoider({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const [hueco, setHueco] = useState(0);
  const huecoRef = useRef(0);
  const temporizadorRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pararAjuste = () => {
    if (temporizadorRef.current) {
      clearTimeout(temporizadorRef.current);
      temporizadorRef.current = null;
    }
  };

  useEffect(() => pararAjuste, []);

  const aplicar = (valor: number) => {
    huecoRef.current = valor;
    setHueco(valor);
  };

  const ajustar = (borde: number, pasada: number) => {
    const campo = TextInput.State.currentlyFocusedInput?.();
    if (!campo) return;

    try {
      campo.measureInWindow((_x, y, _w, alto) => {
        const falta = y + alto + MARGEN - borde;
        if (Math.abs(falta) <= TOLERANCIA) return;

        const nuevo = Math.max(0, huecoRef.current + falta);
        if (nuevo === huecoRef.current) return;

        aplicar(nuevo);

        // Comprobar si de verdad se movió lo pedido; si no, insistir
        if (pasada + 1 < MAX_PASADAS) {
          temporizadorRef.current = setTimeout(
            () => ajustar(borde, pasada + 1),
            ESPERA_PASADA_MS,
          );
        }
      });
    } catch {}
  };

  useTecladoEnfoque(estado => {
    pararAjuste();
    if (!estado) { aplicar(0); return; }
    ajustar(estado.borde, 0);
  });

  return <View style={[style, { paddingBottom: hueco }]}>{children}</View>;
}
