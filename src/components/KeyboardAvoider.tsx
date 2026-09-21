import React, { useRef, useState } from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';
import { useTecladoEnfoque } from '../hooks/useTecladoEnfoque';
import { obtenerCampoActivo } from './CampoTexto';

/** Separación entre el campo y el borde del teclado. */
const MARGEN = 8;

/**
 * Sube el contenido lo justo para que el campo enfocado quede sobre el teclado.
 *
 * Para elementos anclados abajo (la barra del chat, las hojas de los editores),
 * que no pueden resolverlo con scroll.
 *
 * El ajuste es acumulativo (hueco actual + lo que falte), así que converge solo
 * y también corrige al pasar de un campo a otro con el teclado abierto.
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

  const aplicar = (valor: number) => {
    huecoRef.current = valor;
    setHueco(valor);
  };

  useTecladoEnfoque(estado => {
    if (!estado) { aplicar(0); return; }

    const campo = obtenerCampoActivo();
    if (!campo) return;

    try {
      campo.measureInWindow((_x, y, _w, alto) => {
        const falta = y + alto + MARGEN - estado.borde;
        const nuevo = Math.max(0, huecoRef.current + falta);
        // Un píxel de tolerancia evita renders por redondeos
        if (Math.abs(nuevo - huecoRef.current) > 1) aplicar(nuevo);
      });
    } catch {}
  });

  return <View style={[style, { paddingBottom: hueco }]}>{children}</View>;
}
