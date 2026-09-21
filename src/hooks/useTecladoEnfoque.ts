import { useEffect, useRef } from 'react';
import { Keyboard } from 'react-native';
import { alCambiarCampo } from '../components/CampoTexto';

/** Margen para medir con el layout ya asentado tras abrirse el teclado. */
const ESPERA_MS = 80;

export type EstadoTeclado = {
  /** Coordenada Y donde empieza el teclado en pantalla. */
  borde: number;
  /** Alto del teclado. */
  altura: number;
};

/**
 * Avisa cada vez que hay que recolocar por el teclado: al abrirse, al cambiar
 * de campo con él abierto, y al cerrarse (con `null`).
 *
 * El cambio de campo lo notifica CampoTexto desde su onFocus, porque Android no
 * emite ningún evento de teclado al saltar de un campo a otro.
 */
export function useTecladoEnfoque(alRecolocar: (estado: EstadoTeclado | null) => void) {
  const cbRef = useRef(alRecolocar);
  useEffect(() => { cbRef.current = alRecolocar; }, [alRecolocar]);

  useEffect(() => {
    let estado: EstadoTeclado | null = null;
    let espera: ReturnType<typeof setTimeout> | null = null;

    const programar = () => {
      if (!estado) return;
      if (espera) clearTimeout(espera);
      espera = setTimeout(() => cbRef.current(estado), ESPERA_MS);
    };

    const mostrar = Keyboard.addListener('keyboardDidShow', e => {
      estado = { borde: e.endCoordinates.screenY, altura: e.endCoordinates.height };
      programar();
    });

    const ocultar = Keyboard.addListener('keyboardDidHide', () => {
      estado = null;
      if (espera) { clearTimeout(espera); espera = null; }
      cbRef.current(null);
    });

    const bajaCampo = alCambiarCampo(programar);

    return () => {
      mostrar.remove();
      ocultar.remove();
      bajaCampo();
      if (espera) clearTimeout(espera);
    };
  }, []);
}
