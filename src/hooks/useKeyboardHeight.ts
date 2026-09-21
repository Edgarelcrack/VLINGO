import { useEffect, useState } from 'react';
import { Keyboard, Platform } from 'react-native';

/**
 * Altura actual del teclado en píxeles (0 si está cerrado).
 *
 * Este proyecto tiene edge-to-edge activado (android/gradle.properties:
 * edgeToEdgeEnabled=true). Con edge-to-edge, `adjustResize` ya NO redimensiona
 * la ventana: el teclado pasa a ser un inset y la app sigue ocupando toda la
 * pantalla. Los eventos de teclado, en cambio, siguen informando la altura
 * correcta, así que son la base fiable para dejar hueco a mano.
 */
export function useKeyboardHeight(): number {
  const [altura, setAltura] = useState(0);

  useEffect(() => {
    // En iOS los eventos "Will" permiten animar a la vez que el teclado
    const eventoMostrar = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const eventoOcultar = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const mostrar = Keyboard.addListener(eventoMostrar, e => {
      setAltura(e.endCoordinates.height);
    });
    const ocultar = Keyboard.addListener(eventoOcultar, () => {
      setAltura(0);
    });

    return () => {
      mostrar.remove();
      ocultar.remove();
    };
  }, []);

  return altura;
}
