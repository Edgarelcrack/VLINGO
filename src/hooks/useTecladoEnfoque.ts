import { useEffect, useRef } from 'react';
import { Keyboard, TextInput } from 'react-native';

/**
 * Cambiar de un campo a otro con el teclado ya abierto no emite ningún evento,
 * así que vigilamos cuál está enfocado para poder recolocar también entonces.
 */
const INTERVALO_MS = 250;

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
 * Es la base común del ajuste: quien lo use mide el campo enfocado y decide si
 * lo sube o hace scroll.
 */
export function useTecladoEnfoque(alRecolocar: (estado: EstadoTeclado | null) => void) {
  const cbRef = useRef(alRecolocar);
  useEffect(() => { cbRef.current = alRecolocar; }, [alRecolocar]);

  useEffect(() => {
    let estado: EstadoTeclado | null = null;
    let campoPrevio: unknown = null;
    let intervalo: ReturnType<typeof setInterval> | null = null;
    let espera: ReturnType<typeof setTimeout> | null = null;

    const pararVigilancia = () => {
      if (intervalo) { clearInterval(intervalo); intervalo = null; }
      if (espera)    { clearTimeout(espera);    espera = null; }
    };

    const mostrar = Keyboard.addListener('keyboardDidShow', e => {
      estado = { borde: e.endCoordinates.screenY, altura: e.endCoordinates.height };
      campoPrevio = TextInput.State.currentlyFocusedInput?.() ?? null;

      if (espera) clearTimeout(espera);
      espera = setTimeout(() => cbRef.current(estado), ESPERA_MS);

      if (!intervalo) {
        intervalo = setInterval(() => {
          const actual = TextInput.State.currentlyFocusedInput?.() ?? null;
          if (actual && actual !== campoPrevio) {
            campoPrevio = actual;
            cbRef.current(estado);
          }
        }, INTERVALO_MS);
      }
    });

    const ocultar = Keyboard.addListener('keyboardDidHide', () => {
      estado = null;
      campoPrevio = null;
      pararVigilancia();
      cbRef.current(null);
    });

    return () => {
      mostrar.remove();
      ocultar.remove();
      pararVigilancia();
    };
  }, []);
}
