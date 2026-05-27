export type NivelCEFR = 'A1' | 'A2' | 'B1' | 'B2';

export type PlacementQuestion = {
  id: string;
  nivel: NivelCEFR;
  enunciado: string;
  opciones: string[];
  respuesta_correcta: number;
};

export const PLACEMENT_LEVELS: NivelCEFR[] = ['A1', 'A2', 'B1', 'B2'];

export const PLACEMENT_QUESTIONS: PlacementQuestion[] = [
  //A1
  {
    id: 'a1-1',
    nivel: 'A1',
    enunciado: 'She ___ a teacher.',
    opciones: ['am', 'is', 'are', 'be'],
    respuesta_correcta: 1,
  },
  {
    id: 'a1-2',
    nivel: 'A1',
    enunciado: 'I have two ___.',
    opciones: ['cat', 'cats', 'cates', 'caties'],
    respuesta_correcta: 1,
  },
  {
    id: 'a1-3',
    nivel: 'A1',
    enunciado: 'Where ___ you from?',
    opciones: ['is', 'am', 'are', 'do'],
    respuesta_correcta: 2,
  },
  {
    id: 'a1-4',
    nivel: 'A1',
    enunciado: '"What time ___ it?"  —  "It\'s three o\'clock."',
    opciones: ['are', 'is', 'be', 'do'],
    respuesta_correcta: 1,
  },

  //A2
  {
    id: 'a2-1',
    nivel: 'A2',
    enunciado: 'Yesterday I ___ to the supermarket with my mother.',
    opciones: ['go', 'goes', 'went', 'going'],
    respuesta_correcta: 2,
  },
  {
    id: 'a2-2',
    nivel: 'A2',
    enunciado: 'She is taller ___ her brother.',
    opciones: ['that', 'than', 'then', 'from'],
    respuesta_correcta: 1,
  },
  {
    id: 'a2-3',
    nivel: 'A2',
    enunciado: 'I\'m ___ to visit my grandmother tomorrow.',
    opciones: ['go', 'going', 'went', 'gone'],
    respuesta_correcta: 1,
  },
  {
    id: 'a2-4',
    nivel: 'A2',
    enunciado: 'He ___ get up early on Sundays — he loves to sleep in.',
    opciones: ['don\'t', 'doesn\'t', 'isn\'t', 'aren\'t'],
    respuesta_correcta: 1,
  },

  //B1
  {
    id: 'b1-1',
    nivel: 'B1',
    enunciado: 'I ___ never been to Japan, but I\'d love to go.',
    opciones: ['has', 'have', 'had', 'having'],
    respuesta_correcta: 1,
  },
  {
    id: 'b1-2',
    nivel: 'B1',
    enunciado: 'If it rains tomorrow, we ___ stay at home.',
    opciones: ['would', 'will', 'was', 'are'],
    respuesta_correcta: 1,
  },
  {
    id: 'b1-3',
    nivel: 'B1',
    enunciado: 'You ___ wear a helmet when riding a bike — it\'s safer.',
    opciones: ['should', 'would', 'will', 'did'],
    respuesta_correcta: 0,
  },
  {
    id: 'b1-4',
    nivel: 'B1',
    enunciado: 'She told me she ___ tired after the long trip.',
    opciones: ['is', 'was', 'be', 'were'],
    respuesta_correcta: 1,
  },

  //B2
  {
    id: 'b2-1',
    nivel: 'B2',
    enunciado: 'If I ___ rich, I would travel the world.',
    opciones: ['am', 'was', 'were', 'be'],
    respuesta_correcta: 2,
  },
  {
    id: 'b2-2',
    nivel: 'B2',
    enunciado: 'This novel ___ by millions of readers around the world.',
    opciones: ['reads', 'is read', 'reading', 'read'],
    respuesta_correcta: 1,
  },
  {
    id: 'b2-3',
    nivel: 'B2',
    enunciado: 'He couldn\'t ___ up with his neighbour\'s loud music any longer.',
    opciones: ['put', 'give', 'come', 'look'],
    respuesta_correcta: 0,
  },
  {
    id: 'b2-4',
    nivel: 'B2',
    enunciado: 'Had I known about the meeting, I ___ attended.',
    opciones: ['would', 'would have', 'had', 'have'],
    respuesta_correcta: 1,
  },
];


export function calcularNivel(
  respuestas: Record<string, number>,
): NivelCEFR {
  let nivelFinal: NivelCEFR = 'A1';

  for (const nivel of PLACEMENT_LEVELS) {
    const preguntasNivel = PLACEMENT_QUESTIONS.filter(p => p.nivel === nivel);
    if (preguntasNivel.length === 0) continue;

    const aciertos = preguntasNivel.filter(
      p => respuestas[p.id] === p.respuesta_correcta,
    ).length;
    const ratio = aciertos / preguntasNivel.length;

    if (ratio >= 0.6) {
      nivelFinal = nivel;
    } else {
      break;
    }
  }

  return nivelFinal;
}

export const NIVEL_DESCRIPCION: Record<NivelCEFR, { titulo: string; descripcion: string }> = {
  A1: {
    titulo: 'Principiante',
    descripcion: 'Puedes presentarte, hacer preguntas básicas sobre datos personales (dónde vives, qué tienes) y entender frases muy simples.',
  },
  A2: {
    titulo: 'Elemental',
    descripcion: 'Manejas situaciones cotidianas: compras, lugares, trabajo. Comprendes oraciones y expresiones de uso frecuente.',
  },
  B1: {
    titulo: 'Intermedio',
    descripcion: 'Entiendes los puntos principales de textos claros. Puedes desenvolverte en la mayoría de situaciones al viajar y describir experiencias.',
  },
  B2: {
    titulo: 'Intermedio Alto',
    descripcion: 'Comprendes ideas principales de textos complejos. Te comunicas con fluidez y naturalidad con hablantes nativos sin esfuerzo.',
  },
};
