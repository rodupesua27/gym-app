// Rutinas de entrenamiento. Este archivo es la fuente de verdad: Claude lo edita
// cuando pides un cambio y la app lo recoge al abrirse.
// Orden = semana de lunes a domingo. "cardio": bloques de cinta/comba que se muestran en la sesión.
// "warmup": nº de series de calentamiento (las primeras) incluidas en "sets".
window.ROUTINES_VERSION = '2026-11-12r';
window.ROUTINES = [
  {
    id: 'd1',
    day: 'Lunes',
    name: 'Día 1',
    short: 'Pecho, hombro y tríceps',
    exercises: [
      { name: 'Press de banca inclinado (mancuerna)', alt: ["Aperturas en polea de abajo arriba"], sets: 5, warmup: 2, reps: '7-12', rest: 120 },
      { name: 'Mariposa (Pec Deck)', sets: 3, reps: '5-15', rest: 90 },
      { name: 'Cables cruzados (de arriba abajo)', sets: 4, reps: '8-15', rest: 90 },
      { name: 'Elevación frontal con barra (cable)', alt: ["Elevación lateral y frontal con mancuerna", "Rotación externa en polea"], sets: 3, reps: '10', rest: 90 },
      { name: 'Elevación lateral (cable)', alt: ["Elevación lateral sentado en polea", "Pájaro en polea (deltoides posterior)"], sets: 3, reps: '8-12', rest: 90 },
      { name: 'Jalón de tríceps con barra V (polea)', sets: 3, reps: '7-16', rest: 90 },
      { name: 'Extensión de tríceps por encima de la cabeza (cable)', alt: ["Patada de tríceps con mancuerna"], sets: 3, reps: '10-12', rest: 90 }
    ]
  },
  {
    id: 'd2',
    day: 'Martes',
    name: 'Día 2',
    short: 'Espalda y bíceps',
    exercises: [
      { name: 'Jalón al pecho (cable)', sets: 5, warmup: 2, reps: '8-12', rest: 120 },
      { name: 'Remo sentado (máquina)', alt: ["Face pull en polea"], sets: 3, reps: '11-14', rest: 120 },
      { name: 'Jalón al pecho a un brazo', sets: 3, reps: '9-14', rest: 90 },
      { name: 'Encogimiento de hombros (mancuerna)', sets: 3, reps: '12', rest: 90 },
      { name: 'Curl predicador (máquina)', sets: 3, reps: '6-14', rest: 90 },
      { name: 'Curl martillo (mancuerna)', sets: 3, reps: '10-13', rest: 75 },
      { name: 'Curl de bíceps inclinado (mancuerna)', sets: 3, reps: '9-11', rest: 60 }
    ]
  },
  {
    id: 'd3',
    day: 'Miércoles',
    name: 'Día 3',
    short: 'Pierna',
    exercises: [
      { name: 'Extensión de pierna', sets: 6, warmup: 2, reps: '9-12', rest: 90 },
      { name: 'Press de piernas', sets: 4, reps: '8-10', rest: 150 },
      { name: 'Curl de pierna acostado (máquina)', sets: 5, reps: '8-12', rest: 90 },
      { name: 'Abducción de cadera (máquina)', sets: 2, reps: '10-12', rest: 75 },
      { name: 'Aducción de cadera (máquina)', sets: 2, reps: '10-12', rest: 75 },
      { name: 'Empuje de cadera (máquina)', sets: 2, reps: '8-11', rest: 120 },
      { name: 'Pantorrilla en prensa, puntas hacia fuera', sets: 3, reps: '10-15', rest: 75 },
      { name: 'Pantorrilla en prensa, puntas hacia dentro', sets: 3, reps: '9-15', rest: 75 }
    ]
  },
  {
    id: 'c1',
    day: 'Jueves',
    badge: '4',
    name: 'Día 4',
    short: 'Cardio 1 · abdomen, cinta y comba',
    cardio: {
      title: 'Cinta zona 2 + comba por intervalos',
      min: 58,
      tip: 'Primero el abdomen y después el cardio. Cinta: ritmo en el que puedas hablar en frases completas; si va bien, sube a 7 % de inclinación, pero nunca subas velocidad e inclinación a la vez. Comba: salta lo que puedas y, si fallas, retomas y sigues.',
      blocks: [
        { name: 'Cinta · calentamiento', min: 5, desc: '4 km/h · 3 % de inclinación' },
        { name: 'Cinta · parte principal', min: 25, desc: '5,5 km/h · 6 % de inclinación' },
        { name: 'Cinta · vuelta a la calma', min: 5, desc: '4 km/h · 0 % de inclinación' },
        { name: 'Comba · 12 rondas', min: 18, desc: '30 s de comba (o lo que aguantes) + 60 s andando' },
        { name: 'Comba · vuelta a la calma', min: 5, desc: 'Andar y estirar' }
      ]
    },
    exercises: [
      { name: 'Abdominal corto con cable', sets: 5, warmup: 2, reps: '12-15', rest: 60 },
      { name: 'Elevación de piernas tumbado', sets: 3, reps: '10-15', rest: 60 },
      { name: 'Plancha', sets: 3, reps: '30-45 s', rest: 60 }
    ]
  },
  {
    id: 'd4',
    day: 'Viernes',
    badge: '5',
    name: 'Día 5',
    short: 'Pecho, hombro y tríceps',
    exercises: [
      { name: 'Press de banca inclinado (mancuerna)', alt: ["Aperturas en polea de abajo arriba"], sets: 5, warmup: 2, reps: '8-12', rest: 120 },
      { name: 'Aperturas en polea de abajo arriba', sets: 3, reps: '10-15', rest: 90 },
      { name: 'Aperturas inversas en polea', alt: ["Pájaro en polea (deltoides posterior)"], sets: 4, reps: '12-20', rest: 75 },
      { name: 'Elevación lateral (cable)', alt: ["Elevación lateral sentado en polea", "Pájaro en polea (deltoides posterior)"], sets: 4, reps: '10-15', rest: 75 },
      { name: 'Jalón de tríceps con cuerda', sets: 3, reps: '10-15', rest: 75 },
      { name: 'Extensión de tríceps por encima de la cabeza (cable)', alt: ["Patada de tríceps con mancuerna"], sets: 3, reps: '10-12', rest: 90 }
    ]
  },
  {
    id: 'd5',
    day: 'Sábado',
    badge: '6',
    name: 'Día 6',
    short: 'Espalda y brazos',
    exercises: [
      { name: 'Jalón al pecho agarre invertido (cable)', sets: 6, warmup: 2, reps: '8-12', rest: 120 },
      { name: 'Remo inclinado (barra)', alt: ["Face pull en polea"], sets: 4, reps: '9-11', rest: 120 },
      { name: 'Encogimiento de hombros (mancuerna)', sets: 3, reps: '10-12', rest: 90 },
      { name: 'Curl martillo (mancuerna)', sets: 3, reps: '8-12', rest: 75 },
      { name: 'Curl de bíceps inclinado (mancuerna)', sets: 3, reps: '8-12', rest: 75 },
      { name: 'Curl de bíceps (mancuerna)', sets: 3, reps: '8-10', rest: 75 },
      { name: 'Curl de muñeca (polea alta)', sets: 3, reps: '8-15', rest: 60 }
    ]
  },
  {
    id: 'c2',
    day: 'Domingo',
    badge: '7',
    name: 'Día 7',
    short: 'Cardio 2 · abdomen, cinta y comba',
    cardio: {
      title: 'Cinta zona 2 + comba por intervalos',
      min: 58,
      tip: 'Primero el abdomen y después el cardio. Cinta: ritmo en el que puedas hablar en frases completas; si va bien, sube a 7 % de inclinación, pero nunca subas velocidad e inclinación a la vez. Comba: salta lo que puedas y, si fallas, retomas y sigues.',
      blocks: [
        { name: 'Cinta · calentamiento', min: 5, desc: '4 km/h · 3 % de inclinación' },
        { name: 'Cinta · parte principal', min: 25, desc: '5,5 km/h · 6 % de inclinación' },
        { name: 'Cinta · vuelta a la calma', min: 5, desc: '4 km/h · 0 % de inclinación' },
        { name: 'Comba · 12 rondas', min: 18, desc: '30 s de comba (o lo que aguantes) + 60 s andando' },
        { name: 'Comba · vuelta a la calma', min: 5, desc: 'Andar y estirar' }
      ]
    },
    exercises: [
      { name: 'Abdominal (máquina)', sets: 5, warmup: 2, reps: '12-15', rest: 60 },
      { name: 'Crunch inverso', sets: 3, reps: '12-15', rest: 60 },
      { name: 'Dead bug', sets: 3, reps: '10 por lado', rest: 60 }
    ]
  }
];

// Series y repeticiones propias de cada ejercicio alternativo (hipertrofia, hombro delicado).
window.ALT_PLAN = {
  'Aperturas en polea de abajo arriba': { sets: 3, reps: '10-15', rest: 75 },
  'Elevación lateral y frontal con mancuerna': { sets: 3, reps: '12-15', rest: 60 },
  'Rotación externa en polea': { sets: 2, reps: '15-20', rest: 45 },
  'Elevación lateral sentado en polea': { sets: 3, reps: '10-15', rest: 75 },
  'Pájaro en polea (deltoides posterior)': { sets: 3, reps: '12-20', rest: 60 },
  'Patada de tríceps con mancuerna': { sets: 3, reps: '12-15', rest: 60 },
  'Face pull en polea': { sets: 3, reps: '12-20', rest: 60 }
};
