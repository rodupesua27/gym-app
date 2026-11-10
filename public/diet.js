// Dieta. Fuente de verdad: Claude la edita cuando pides un cambio.
// Todo se hace con sartén y microondas, cocinando cada día. Cifras aproximadas.
window.DIET_TARGET = { kcal: 2900, protein: 120 };
window.DIET = {
  slots: [
    { id: 'desayuno', name: 'Desayuno' },
    { id: 'comida', name: 'Comida' },
    { id: 'cena', name: 'Cena' }
  ],
  options: [
    {
      id: 'd1', slot: 'desayuno', short: 'Bocadillo', name: 'Bocadillo de pavo y huevos',
      kcal: 816, p: 34, min: 10,
      ingredients: ['150 g de pan', '2 lonchas de pavo', 'Mantequilla', '2 huevos', '1 plátano', 'Café'],
      steps: 'Huevos a la plancha en la sartén (3-4 min). Monta el bocadillo con mantequilla y pavo. Plátano y café aparte.'
    },
    {
      id: 'd2', slot: 'desayuno', short: 'Tostadas y yogur', name: 'Pan con mantequilla y mermelada, yogur con proteína y plátano',
      kcal: 855, p: 24, min: 3,
      ingredients: ['150 g de pan', 'Mantequilla', 'Mermelada de fresa', '1 yogur de fresa', '5 g de proteína HSN Evobasic de chocolate (≈ 4 g de proteína)', '1 plátano', 'Café'],
      steps: 'Sin cocinar. Para el día sin hambre o sin tiempo. Mezcla los 5 g de proteína con una cucharada de yogur hasta que no queden grumos y añade el resto.',
      note: 'Sigue algo baja en proteína: compénsalo en la comida y la cena.'
    },
    {
      id: 'c1', slot: 'comida', short: 'Arroz y pollo', name: 'Arroz con pollo y aguacate',
      kcal: 650, p: 45, min: 15,
      ingredients: ['150 g de arroz cocido', '150-180 g de pechuga de pollo', '½ aguacate', 'Lechuga (opcional)', '1 cucharada de aceite de oliva'],
      steps: 'Pollo en tiras finas en la sartén con aceite, 6-8 min: así queda jugoso y no seco. Arroz en el microondas (bolsa lista o 1 parte de arroz por 2 de agua, 10-12 min).'
    },
    {
      id: 'c2', slot: 'comida', short: 'Pasta y atún', name: 'Pasta con atún y tomate frito',
      kcal: 750, p: 58, min: 12,
      ingredients: ['100 g de pasta seca', '2 latas de atún', '100 g de tomate frito', '1 cucharada de aceite de oliva'],
      steps: 'Pasta en el microondas: bol grande, agua cubriéndola y el tiempo del paquete +2 min. Escurre y mezcla con el atún y el tomate frito.',
      note: 'Con atún máximo 1-2 comidas por semana (2-4 latas).'
    },
    {
      id: 'c3', slot: 'comida', short: 'Wrap de pollo', name: 'Wrap de pollo con queso y aguacate',
      kcal: 850, p: 60, min: 12,
      ingredients: ['2 tortillas de trigo grandes', '150 g de pechuga de pollo', '30 g de queso', '½ aguacate'],
      steps: 'Pollo en tiras finas en la sartén, 6-8 min. Calienta las tortillas 20 s en el microondas, rellena y enrolla.'
    },
    {
      id: 'n1', slot: 'cena', short: 'Pasta y ternera', name: 'Pasta con ternera, tomate frito y queso',
      kcal: 910, p: 50, min: 15,
      ingredients: ['120 g de pasta seca', '150 g de ternera picada', '100 g de tomate frito', '30 g de queso', 'Orégano'],
      steps: 'Pasta en el microondas (tiempo del paquete +2 min). Ternera picada en la sartén 6-8 min, añade el tomate frito. Mezcla y cubre con queso.'
    },
    {
      id: 'n2', slot: 'cena', short: 'Tortilla y guacamole', name: 'Tortilla de 3 huevos con pan, queso y guacamole',
      kcal: 725, p: 36, min: 8,
      ingredients: ['3 huevos', '100 g de pan', '30 g de queso', 'Guacamole: ½ aguacate, zumo de ½ limón, sal y pimienta'],
      steps: 'Guacamole: machaca el aguacate con el limón, sal y pimienta (3 min). Tortilla con el queso dentro en la sartén, 4 min.'
    },
    {
      id: 'n3', slot: 'cena', short: 'Arroz y atún', name: 'Arroz con atún y huevos',
      kcal: 740, p: 60, min: 12,
      ingredients: ['200 g de arroz cocido', '2 latas de atún', '2 huevos', 'Tomate frito'],
      steps: 'Arroz en el microondas. Huevos fritos en la sartén. Mezcla con el atún y el tomate frito.',
      note: 'Con atún máximo 1-2 comidas por semana (2-4 latas).'
    }
  ]
};
