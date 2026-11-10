// Rutinas de entrenamiento. Este archivo es la fuente de verdad: Claude lo edita
// cuando pides un cambio y la app lo recoge al abrirse.
// "warmup": nº de series de calentamiento (las primeras) incluidas en "sets".
window.ROUTINES_VERSION = '2026-11-10k';
window.ROUTINES = [
  {
    id: 'd1',
    name: 'Día 1',
    short: 'Pecho, hombro y tríceps',
    exercises: [
      { name: 'Press de banca inclinado (mancuerna)', sets: 5, warmup: 2, reps: '7-12', rest: 120 },
      { name: 'Mariposa (Pec Deck)', sets: 3, reps: '5-15', rest: 90 },
      { name: 'Cables cruzados (de arriba abajo)', sets: 4, reps: '8-15', rest: 90 },
      { name: 'Elevación frontal con barra (cable)', sets: 3, reps: '10', rest: 90 },
      { name: 'Elevación lateral (cable)', sets: 3, reps: '8-12', rest: 90 },
      { name: 'Jalón de tríceps con barra V (polea)', sets: 3, reps: '7-16', rest: 90 },
      { name: 'Extensión de tríceps por encima de la cabeza (cable)', sets: 3, reps: '10-12', rest: 90 },
      { name: 'Abdominal corto con cable', sets: 3, reps: '12-15', rest: 60 }
    ]
  },
  {
    id: 'd2',
    name: 'Día 2',
    short: 'Espalda y bíceps',
    exercises: [
      { name: 'Jalón al pecho (cable)', sets: 5, warmup: 2, reps: '8-12', rest: 120 },
      { name: 'Remo sentado (máquina)', sets: 3, reps: '11-14', rest: 120 },
      { name: 'Jalón al pecho a un brazo', sets: 3, reps: '9-14', rest: 90 },
      { name: 'Encogimiento de hombros (mancuerna)', sets: 3, reps: '12', rest: 90 },
      { name: 'Curl predicador (máquina)', sets: 3, reps: '6-14', rest: 90 },
      { name: 'Curl martillo (mancuerna)', sets: 3, reps: '10-13', rest: 75 },
      { name: 'Curl de bíceps inclinado (mancuerna)', sets: 3, reps: '9-11', rest: 60 }
    ]
  },
  {
    id: 'd3',
    name: 'Día 3',
    short: 'Pierna',
    exercises: [
      { name: 'Extensión de pierna', sets: 6, warmup: 2, reps: '9-12', rest: 90 },
      { name: 'Press de piernas', sets: 4, reps: '8-10', rest: 150 },
      { name: 'Curl de pierna acostado (máquina)', sets: 5, reps: '8-12', rest: 90 },
      { name: 'Abducción de cadera (máquina)', sets: 2, reps: '10-12', rest: 75 },
      { name: 'Aducción de cadera (máquina)', sets: 2, reps: '10-12', rest: 75 },
      { name: 'Empuje de cadera (máquina)', sets: 4, reps: '8-11', rest: 120 },
      { name: 'Pantorrilla en prensa, puntas hacia fuera', sets: 3, reps: '10-15', rest: 75 },
      { name: 'Pantorrilla en prensa, puntas hacia dentro', sets: 3, reps: '9-15', rest: 75 }
    ]
  },
  {
    id: 'd4',
    name: 'Día 4',
    short: 'Pecho, hombro y tríceps',
    exercises: [
      { name: 'Press de banca inclinado (mancuerna)', sets: 5, warmup: 2, reps: '8-12', rest: 120 },
      { name: 'Aperturas en polea de abajo arriba', sets: 3, reps: '10-15', rest: 90 },
      { name: 'Aperturas inversas en polea', sets: 4, reps: '12-20', rest: 75 },
      { name: 'Elevación lateral (cable)', sets: 4, reps: '10-15', rest: 75 },
      { name: 'Jalón de tríceps con cuerda', sets: 3, reps: '10-15', rest: 75 },
      { name: 'Extensión de tríceps por encima de la cabeza (cable)', sets: 3, reps: '10-12', rest: 90 },
      { name: 'Abdominal (máquina)', sets: 3, reps: '12-15', rest: 60 }
    ]
  },
  {
    id: 'd5',
    name: 'Día 5',
    short: 'Espalda y brazos',
    exercises: [
      { name: 'Jalón al pecho agarre invertido (cable)', sets: 6, warmup: 2, reps: '8-12', rest: 120 },
      { name: 'Remo inclinado (barra)', sets: 4, reps: '9-11', rest: 120 },
      { name: 'Encogimiento de hombros (mancuerna)', sets: 3, reps: '10-12', rest: 90 },
      { name: 'Curl martillo (mancuerna)', sets: 3, reps: '8-12', rest: 75 },
      { name: 'Curl de bíceps inclinado (mancuerna)', sets: 3, reps: '8-12', rest: 75 },
      { name: 'Curl de bíceps (mancuerna)', sets: 3, reps: '8-10', rest: 75 },
      { name: 'Curl de muñeca (polea alta)', sets: 3, reps: '8-15', rest: 60 }
    ]
  }
];
