import { useEffect, useRef } from 'react';
import { Keyboard, TextInput } from 'react-native';


const INTERVALO_MS = 250;

const ESPERA_MS = 80;

export type EstadoTeclado = {
  /** Coordenada Y donde empieza el teclado en pantalla. */
  borde: number;
  /** Alto del teclado. */
  altura: number;
};


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
