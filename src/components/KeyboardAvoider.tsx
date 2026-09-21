import React, { useEffect, useRef, useState } from 'react';
import { StyleProp, TextInput, View, ViewStyle } from 'react-native';
import { useTecladoEnfoque } from '../hooks/useTecladoEnfoque';


const MARGEN = 8;


const TOLERANCIA = 2;


const MAX_PASADAS = 8;
const ESPERA_PASADA_MS = 50;


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
