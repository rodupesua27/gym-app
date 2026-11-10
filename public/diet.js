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
      kcal: 770, p: 30, min: 10,
      ingredients: ['140 g de pan', '2 lonchas de pavo (25 g)', 'Mantequilla', '2 huevos', '1 plátano', 'Café'],
      steps: 'Huevos a la plancha en la sartén (3-4 min). Monta el bocadillo con mantequilla y pavo. Plátano y café aparte.'
    },
    {
      id: 'd2', slot: 'desayuno', short: 'Tostadas y yogur', name: 'Pan con mantequilla y mermelada, yogur con proteína y plátano',
      kcal: 828, p: 23, min: 3,
      ingredients: ['140 g de pan', 'Mantequilla', 'Mermelada de fresa', '1 yogur de fresa', '5 g de proteína (chocolate)', '1 plátano', 'Café'],
      steps: 'Sin cocinar. Para el día sin hambre o sin tiempo.',
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
      id: 'n2', slot: 'cena', short: 'Bocadillo y tortilla', name: 'Bocadillo de pavo, queso y guacamole, y tortilla de 3 huevos',
      kcal: 851, p: 44, min: 8,
      ingredients: ['140 g de pan', '2 lonchas de pavo (25 g)', '30 g de queso', 'Guacamole: ½ aguacate, zumo de ½ limón, sal y pimienta', '3 huevos'],
      steps: 'Guacamole: machaca el aguacate con el limón, sal y pimienta (3 min). Tortilla de 3 huevos en la sartén, 4 min. Bocadillo con pavo, queso y guacamole.'
    },
    {
      id: 'n3', slot: 'cena', short: 'Arroz y atún', name: 'Arroz con atún y huevos',
      kcal: 740, p: 60, min: 12,
      ingredients: ['200 g de arroz cocido', '2 latas de atún', '2 huevos', 'Tomate frito'],
      steps: 'Arroz en el microondas. Huevos fritos en la sartén. Mezcla con el atún y el tomate frito.',
      note: 'Con atún máximo 1-2 comidas por semana (2-4 latas).'
    },
    {
      id: 'n4', slot: 'cena', short: 'Pasta con bacon y nata', name: 'Pasta con bacon, nata para cocinar y queso',
      kcal: 1030, p: 35, min: 12,
      ingredients: ['100 g de pasta seca', '50 g de bacon en tiras', '100 ml de nata para cocinar', '60 g de queso rallado'],
      steps: 'Pasta en el microondas (tiempo del paquete +2 min). Bacon en la sartén 5-6 min, sin aceite. Añade la nata y caliéntala 2 min, echa el queso y remueve hasta que se funda. Mezcla con la pasta.',
      note: 'Muy calórica: mejor en un día de entreno duro, y ese día quita el aceite de otras comidas.'
    }
  ]
};
