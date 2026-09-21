import { useEffect, useState } from 'react';
import { Keyboard, Platform } from 'react-native';


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
