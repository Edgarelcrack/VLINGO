import React, { forwardRef, useRef } from 'react';
import { TextInput, TextInputProps } from 'react-native';

type Campo = TextInput | null;

let campoActivo: Campo = null;
const suscriptores = new Set<() => void>();

/** El campo de texto enfocado ahora mismo, o null. */
export const obtenerCampoActivo = (): Campo => campoActivo;

/** Avisa cuando cambia el campo enfocado. Devuelve la función de baja. */
export function alCambiarCampo(aviso: () => void): () => void {
  suscriptores.add(aviso);
  return () => { suscriptores.delete(aviso); };
}

function fijarActivo(campo: Campo) {
  if (campoActivo === campo) return;
  campoActivo = campo;
  suscriptores.forEach(aviso => aviso());
}

/**
 * TextInput que además registra cuál es el campo enfocado.
 *
 * Existe porque `TextInput.State.currentlyFocusedInput()` devuelve null en los
 * builds de release con la nueva arquitectura (newArchEnabled=true), que es la
 * de este proyecto. Todo el ajuste del teclado dependía de esa API: se
 * ejecutaba, no encontraba campo y no hacía nada. En Expo Go no se notaba
 * porque allí el sistema redimensiona la ventana y resuelve el teclado solo.
 *
 * Llevando el registro nosotros con onFocus/onBlur funciona igual en ambos, y
 * además da un aviso inmediato al saltar de un campo a otro.
 */
const CampoTexto = forwardRef<TextInput, TextInputProps>(function CampoTexto(props, refExterna) {
  const propia = useRef<Campo>(null);

  const guardarRef = (nodo: Campo) => {
    propia.current = nodo;
    if (typeof refExterna === 'function') refExterna(nodo);
    else if (refExterna) (refExterna as React.MutableRefObject<Campo>).current = nodo;
  };

  return (
    <TextInput
      {...props}
      ref={guardarRef}
      onFocus={e => { fijarActivo(propia.current); props.onFocus?.(e); }}
      onBlur={e => {
        if (campoActivo === propia.current) fijarActivo(null);
        props.onBlur?.(e);
      }}
    />
  );
});

export default CampoTexto;
