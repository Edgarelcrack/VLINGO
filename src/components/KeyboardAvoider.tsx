import React from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';

/**
 * Sube el contenido lo justo para que no quede bajo el teclado.
 *
 * Para elementos anclados abajo (la barra del chat, las hojas de los modales),
 * que no pueden resolverlo con scroll.
 *
 * Con edge-to-edge (obligatorio en RN 0.81) Android ya no redimensiona la
 * ventana al abrir el teclado, y los eventos `Keyboard` de React Native no son
 * fiables para calcularlo a mano. react-native-keyboard-controller lee los
 * insets del teclado de forma nativa (también dentro de un Modal) y reserva
 * solo la parte del teclado que solapa esta vista.
 */
export default function KeyboardAvoider({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <KeyboardAvoidingView behavior="padding" style={style}>
      {children}
    </KeyboardAvoidingView>
  );
}
