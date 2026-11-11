// Dieta. Fuente de verdad: Claude la edita cuando pides un cambio.
// Todo se hace con sartén y microondas, cocinando cada día.
// kc / pr: kcal y proteína de cada ingrediente (misma posición que "ingredients").
// Datos de etiqueta del usuario: Lidl (pan, pollo, yogur y queso Milbona, nata, huevos M), Real Valle (pavo), Tastino (tortillas), Nixe (atún), Hacendado (tomate frito), mayonesa (613 kcal/100 g).
// Estimaciones: mantequilla (sin datos), ternera picada, aguacate, yogur Milbona de 125 g (dato del usuario), plátano de Canarias (Ministerio), azúcar del café, peso de cada huevo M (55 g).
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
      min: 10,
      ingredients: ['140 g de pan Lidl (bocadillo)', '2 lonchas de pavo Real Valle (25 g)', 'Mantequilla (10 g)', '2 huevos M', '1 plátano de Canarias', 'Café con leche desnatada sin lactosa (250 ml: mitad leche, mitad café) + 2 cucharillas de azúcar'],
      kc: [379, 20, 72, 158, 99, 75], pr: [11, 4, 0, 14, 1, 4],
      steps: 'Huevos a la plancha en la sartén (3-4 min). Monta el bocadillo con mantequilla y pavo. Plátano y café aparte.'
    },
    {
      id: 'd2', slot: 'desayuno', short: 'Tostadas y yogur', name: 'Pan con mantequilla y mermelada, yogur con proteína y plátano',
      min: 3,
      ingredients: ['140 g de pan Lidl (bocadillo)', 'Mantequilla (10 g)', 'Mermelada de fresa (20 g)', '1 yogur Milbona griego fresa (125 g)', '5 g de proteína HSN chocolate', '1 plátano de Canarias', 'Café con leche desnatada sin lactosa (250 ml: mitad leche, mitad café) + 2 cucharillas de azúcar'],
      kc: [379, 72, 10, 151, 20, 99, 75], pr: [11, 0, 0, 3, 4, 1, 4],
      steps: 'Sin cocinar. Para el día sin hambre o sin tiempo.',
      note: 'Sigue algo baja en proteína: compénsalo en la comida y la cena.'
    },
    {
      id: 'c1', slot: 'comida', short: 'Arroz y pollo', name: 'Arroz con pollo y aguacate',
      min: 15,
      ingredients: ['60 g de arroz seco (≈150 g cocido)', '160 g de pechuga de pollo Lidl', '½ aguacate', 'Lechuga (opcional)', '1 cucharada de aceite de oliva'],
      kc: [208, 165, 160, 0, 120], pr: [4, 38, 2, 0, 0],
      steps: 'Pollo en tiras finas en la sartén con aceite, 6-8 min: así queda jugoso y no seco. Arroz en el microondas (bolsa lista o 1 parte de arroz por 2 de agua, 10-12 min).'
    },
    {
      id: 'c2', slot: 'comida', short: 'Pasta y atún', name: 'Pasta con atún y tomate frito',
      min: 12,
      ingredients: ['100 g de pasta seca', '2 latas de atún Nixe al natural (80 g escurrido c/u)', '100 g de tomate frito Hacendado', '1 cucharada de aceite de oliva'],
      kc: [349, 178, 81, 120], pr: [12, 42, 1, 0],
      steps: 'Pasta en el microondas: bol grande, agua cubriéndola y el tiempo del paquete +2 min. Escurre y mezcla con el atún y el tomate frito.',
      note: 'Con atún máximo 1-2 comidas por semana (2-4 latas).'
    },
    {
      id: 'c3', slot: 'comida', short: 'Wrap de pollo', name: 'Wrap de pollo con queso y aguacate',
      min: 12,
      ingredients: ['2 tortillas de trigo Tastino (40 g c/u)', '150 g de pechuga de pollo Lidl', '30 g de queso Gouda Milbona', '½ aguacate', '1 cucharada de mayonesa por tortilla (2 en total, 30 g)'],
      kc: [96, 155, 113, 160, 184], pr: [3, 36, 7, 2, 0],
      steps: 'Pollo en tiras finas en la sartén, 6-8 min. Calienta las tortillas 20 s en el microondas, rellena y enrolla.'
    },
    {
      id: 'n1', slot: 'cena', short: 'Pasta y ternera', name: 'Pasta con ternera, tomate frito y queso',
      min: 15,
      ingredients: ['120 g de pasta seca', '150 g de ternera picada', '100 g de tomate frito Hacendado', '30 g de queso Gouda Milbona', 'Orégano'],
      kc: [419, 270, 81, 113, 0], pr: [14, 30, 1, 7, 0],
      steps: 'Pasta en el microondas (tiempo del paquete +2 min). Ternera picada en la sartén 6-8 min, añade el tomate frito. Mezcla y cubre con queso.'
    },
    {
      id: 'n2', slot: 'cena', short: 'Bocadillo y tortilla', name: 'Bocadillo de pavo, queso y guacamole, y tortilla de 3 huevos',
      min: 8,
      ingredients: ['140 g de pan Lidl (bocadillo)', '2 lonchas de pavo Real Valle (25 g)', '30 g de queso Gouda Milbona', 'Guacamole: ½ aguacate, zumo de ½ limón, sal y pimienta', '3 huevos M'],
      kc: [379, 20, 113, 160, 237], pr: [11, 4, 7, 2, 21],
      steps: 'Guacamole: machaca el aguacate con el limón, sal y pimienta (3 min). Tortilla de 3 huevos en la sartén, 4 min. Bocadillo con pavo, queso y guacamole.'
    },
    {
      id: 'n3', slot: 'cena', short: 'Arroz y atún', name: 'Arroz con atún y huevos',
      min: 12,
      ingredients: ['67 g de arroz seco (≈200 g cocido)', '2 latas de atún Nixe al natural (80 g escurrido c/u)', '2 huevos M', 'Tomate frito Hacendado (100 g)'],
      kc: [232, 178, 158, 81], pr: [5, 42, 14, 1],
      steps: 'Arroz en el microondas. Huevos fritos en la sartén. Mezcla con el atún y el tomate frito.',
      note: 'Con atún máximo 1-2 comidas por semana (2-4 latas).'
    },
    {
      id: 'n4', slot: 'cena', short: 'Pasta con bacon y nata', name: 'Pasta con bacon, nata para cocinar y queso',
      min: 12,
      ingredients: ['85 g de pasta seca (1 vaso mediano)', '125 g de bacon en tiras (1 bote entero)', '80 ml de nata para cocinar', '40 g de queso Gouda Milbona rallado'],
      kc: [297, 361, 131, 150], pr: [10, 19, 2, 10],
      steps: 'Pasta en el microondas (tiempo del paquete +2 min). Bacon en la sartén 5-6 min, sin aceite. Añade la nata y caliéntala 2 min, echa el queso y remueve hasta que se funda. Mezcla con la pasta.',
      note: 'Calórica: mejor en un día de entreno duro, y ese día quita el aceite de otras comidas.'
    }
  ]
};
// Totales por opción: suma de sus ingredientes (los desmarcados se restan en la app).
window.DIET.options.forEach(o => {
  o.kcal = o.kc.reduce((a, b) => a + b, 0);
  o.p = o.pr.reduce((a, b) => a + b, 0);
});
