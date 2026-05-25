// Demo content used when ANTHROPIC_API_KEY is missing or placeholder.
// Returns shape-compatible payloads with the live AI services so the
// frontend renders + the PDF builder works exactly the same.

const pick = (arr, n) => {
  const c = [...arr];
  for (let i = c.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [c[i], c[j]] = [c[j], c[i]];
  }
  return c.slice(0, n);
};

// ── Cambridge English ───────────────────────────────────────
const CAMBRIDGE_QUESTIONS = {
  A2: [
    { type: 'multiple_choice', question: 'My sister ___ to school by bus every day.', options: ['go', 'goes', 'going', 'gone'], answer: 'goes', explanation: 'Third person singular present simple.', points: 1 },
    { type: 'fill_blanks', question: "I usually ___ (have) breakfast at 7 a.m.", answer: 'have', explanation: 'Present simple, first person.', points: 1 },
    { type: 'true_false', question: '"There is many books on the table" is correct.', answer: 'False', explanation: 'Use "are many" with countable plurals.', points: 1 },
    { type: 'multiple_choice', question: 'Where ___ you born?', options: ['was', 'were', 'are', 'is'], answer: 'were', explanation: 'Past simple of "be" with you.', points: 1 },
    { type: 'fill_blanks', question: "She ___ (not / like) coffee in the morning.", answer: "doesn't like", explanation: 'Negative present simple.', points: 1 },
  ],
  B1: [
    { type: 'multiple_choice', question: 'If it ___ tomorrow, we will stay at home.', options: ['rains', 'rained', 'will rain', 'is raining'], answer: 'rains', explanation: 'First conditional uses present simple in the if-clause.', points: 1 },
    { type: 'fill_blanks', question: "I have ___ (live) in Madrid since 2018.", answer: 'lived', explanation: 'Present perfect with "since".', points: 1 },
    { type: 'key_word_transformation', question: 'It started raining two hours ago. (BEEN) — It ___ two hours.', answer: 'has been raining for', explanation: 'Present perfect continuous + duration.', points: 2 },
    { type: 'multiple_choice', question: 'She ___ to London three times this year.', options: ['has gone', 'went', 'had gone', 'goes'], answer: 'has gone', explanation: 'Present perfect with frequency adverb.', points: 1 },
    { type: 'open_cloze', question: 'I am looking forward ___ seeing you again.', answer: 'to', explanation: 'Look forward to + gerund.', points: 1 },
    { type: 'error_correction', question: 'I am [agree] with your idea.', answer: 'agree', explanation: 'Use "I agree" not "I am agree".', points: 1 },
  ],
  B2: [
    { type: 'multiple_choice', question: 'If she ___ harder, she would have passed the exam.', options: ['had studied', 'studied', 'has studied', 'would study'], answer: 'had studied', explanation: 'Third conditional — unreal past situation.', points: 1 },
    { type: 'key_word_transformation', question: 'They cancelled the match because of the rain. (CALLED) — The match ___ the rain.', answer: 'was called off because of', explanation: 'Phrasal verb "call off" in passive.', points: 2 },
    { type: 'word_formation', question: 'Her ___ (inspire) speech moved the audience.', answer: 'inspirational', explanation: 'Adjective form of "inspire".', points: 1 },
    { type: 'multiple_choice', question: 'I wish I ___ more time to read.', options: ['have', 'had', 'will have', 'have had'], answer: 'had', explanation: 'I wish + past simple for present unreal wishes.', points: 1 },
    { type: 'open_cloze', question: 'Despite ___ tired, she finished the marathon.', answer: 'being', explanation: 'Despite + gerund.', points: 1 },
  ],
  C1: [
    { type: 'word_formation', question: 'The new policy is highly ___ (controversy).', answer: 'controversial', explanation: 'Adjective from "controversy".', points: 1 },
    { type: 'key_word_transformation', question: 'You should not have told him. (BETTER) — You ___ told him.', answer: 'had better not have', explanation: 'Past regret with "had better".', points: 2 },
    { type: 'multiple_choice', question: 'Hardly ___ when the phone rang.', options: ['I had sat down', 'had I sat down', 'I sat down', 'did I sit down'], answer: 'had I sat down', explanation: 'Inversion after negative adverb "hardly".', points: 1 },
    { type: 'open_cloze', question: 'Were ___ to ask me, I would tell the truth.', answer: 'you', explanation: 'Inversion in conditionals.', points: 1 },
  ],
  A1: [
    { type: 'multiple_choice', question: 'My name ___ Ana.', options: ['am', 'is', 'are', 'be'], answer: 'is', explanation: 'Third person singular of "to be".', points: 1 },
    { type: 'fill_blanks', question: "I ___ (have) two brothers.", answer: 'have', explanation: 'Present simple, first person.', points: 1 },
    { type: 'true_false', question: 'The plural of "child" is "childs".', answer: 'False', explanation: 'The plural of "child" is "children".', points: 1 },
  ],
  C2: [
    { type: 'word_formation', question: 'His ___ (bear) attitude during the crisis was admirable.', answer: 'forbearing', explanation: 'Advanced derivative.', points: 1 },
    { type: 'key_word_transformation', question: 'No matter what happens, I will support you. (COME) — ___, I will support you.', answer: 'Come what may', explanation: 'Idiomatic expression.', points: 2 },
  ],
};

const cambridgeExam = ({ level, topic, totalQuestions = 10 }) => {
  const pool = CAMBRIDGE_QUESTIONS[level] || CAMBRIDGE_QUESTIONS.B1;
  let questions = [];
  while (questions.length < totalQuestions) {
    questions = questions.concat(pick(pool, Math.min(pool.length, totalQuestions - questions.length)));
  }
  questions = questions.slice(0, totalQuestions).map((q, i) => ({
    ...q,
    id: `demo_${level}_${i}`,
    source: 'demo',
  }));
  return {
    level,
    topic: topic || 'General English',
    totalQuestions: questions.length,
    questions,
    generatedAt: new Date().toISOString(),
    dbCount: 0,
    aiCount: 0,
    demoMode: true,
  };
};

const cambridgeDynamics = ({ level, topic, count = 3, duration = 15, types = ['speaking'] }) => {
  const ACTIVITIES = [
    {
      title: 'The Job Interview',
      type: 'speaking',
      typeLabel: 'Speaking Activity',
      grouping: 'pairs',
      description: 'Students role-play a simulated job interview to practice present perfect and work vocabulary.',
      objective: 'Practise present perfect and formal register in a realistic context.',
      steps: [
        'Pair up students: one is the interviewer, the other the candidate.',
        'Give candidates 2 minutes to prepare a short improvised CV.',
        'Hold the interview for 5 minutes with prepared questions.',
        'Swap roles and repeat the process.',
        'Whole-class debrief with funniest/most surprising answers.',
      ],
      materials: ['Role cards', 'Timer', 'Sample CV templates'],
    },
    {
      title: 'Picture Description Race',
      type: 'speaking',
      typeLabel: 'Speaking Activity',
      grouping: 'groups of 3-4',
      description: 'Quick-fire image descriptions targeting present continuous and prepositions of place.',
      objective: 'Build fluency in describing visual scenes.',
      steps: [
        'Show one image to a student per group; the rest cannot see it.',
        'They must describe the image in 60 seconds.',
        'Group members guess what is happening and where.',
        'Reveal image. Correct mistakes together.',
        'Rotate roles every round.',
      ],
      materials: ['10–15 printed images', 'Stopwatch'],
    },
    {
      title: 'Vocabulary Mind Map',
      type: 'vocabulary',
      typeLabel: 'Vocabulary Activity',
      grouping: 'whole class then individual',
      description: 'Collaborative mind-mapping around a topic to expand active vocabulary.',
      objective: 'Activate and expand topic-specific vocabulary.',
      steps: [
        'Write the topic in the centre of the board.',
        'Brainstorm related words as a class (first branches).',
        'Students add sub-branches in pairs (synonyms, collocations, opposites).',
        'Each student copies and personalises their map.',
        'Use the map as a writing prompt for a 100-word paragraph.',
      ],
      materials: ['Board', 'Coloured markers', 'A4 paper'],
    },
    {
      title: 'Grammar Auction',
      type: 'grammar',
      typeLabel: 'Grammar Activity',
      grouping: 'teams of 4',
      description: 'Teams "buy" grammatically correct sentences from a pool of mixed examples.',
      objective: 'Spot common grammatical errors at the target level.',
      steps: [
        'Hand out a list of 12 sentences (some correct, some with errors).',
        'Each team has £1,000 to bid on the sentences they think are correct.',
        'Auction: highest bidder gets the sentence.',
        'Reveal correct/incorrect — winners are teams with most correct sentences.',
        'Discuss the errors with the whole class.',
      ],
      materials: ['Sentence list', 'Fake money or chips'],
    },
  ];
  return pick(ACTIVITIES, Math.min(count, ACTIVITIES.length)).map((a) => ({
    ...a,
    duration,
    level,
    topic: topic || 'general',
  }));
};

const cambridgePresentation = ({ sourceText, level }) => {
  const slides = [
    { title: 'Introducción', bullets: ['Idea principal del texto', `Nivel: ${level || 'B1'}`, 'Objetivos de la sesión'] },
    { title: 'Contexto', bullets: ['Quién, qué, cuándo, dónde, por qué', 'Vocabulario clave', 'Imágenes de apoyo'] },
    { title: 'Conceptos clave', bullets: ['Punto 1 con cita del texto', 'Punto 2 con ejemplo', 'Punto 3 con conexión actual'] },
    { title: 'Actividad guiada', bullets: ['Pregunta detonante', 'Trabajo en parejas (5 min)', 'Puesta en común'] },
    { title: 'Cierre', bullets: ['Resumen en 3 frases', 'Tarea para casa', 'Mini-quiz oral'] },
  ];
  return {
    title: 'Presentación demo',
    slides,
    notebookLM: {
      summary: `Resumen automático de un texto de ${sourceText.length} caracteres.`,
      keyConcepts: ['concepto 1', 'concepto 2', 'concepto 3'],
      questions: ['¿Cuál es la idea central?', '¿Qué evidencia la apoya?', '¿Qué postura toma el autor?'],
    },
    demoMode: true,
  };
};

// ── Lengua Castellana ───────────────────────────────────────
const lenguaExercises = ({ type, level, topic, count = 5 }) => {
  const POOL = {
    ortografia: [
      { content: 'Pon la tilde donde corresponda: "El medico examino al paciente despues de la consulta."', answer: 'El médico examinó al paciente después de la consulta.', explanation: 'Acentuación de pretérito indefinido y palabras esdrújulas.' },
      { content: 'Completa con b o v: "ha___er", "tu___o", "ad___ertir".', answer: 'haber, tuvo, advertir', explanation: 'Reglas básicas de uso de b/v.' },
      { content: 'Coloca las comas: "Madrid capital de España tiene millones de habitantes".', answer: 'Madrid, capital de España, tiene millones de habitantes.', explanation: 'Aposición explicativa entre comas.' },
      { content: 'Acentúa: "examen", "examenes", "facil", "faciles".', answer: 'examen, exámenes, fácil, fáciles', explanation: 'Esdrújulas siempre llevan tilde; llanas con tilde si terminan en consonante distinta de n/s.' },
    ],
    sintaxis: [
      { content: 'Analiza la oración: "El alumno aplicado estudia cada tarde en la biblioteca."', answer: 'Sujeto: SN "El alumno aplicado". Predicado: SV "estudia cada tarde en la biblioteca". CCT: cada tarde. CCL: en la biblioteca.', explanation: 'Identificación de sujeto, predicado y complementos circunstanciales.' },
      { content: 'Indica función de "a su madre": "Pedro escribió una carta a su madre."', answer: 'Complemento Indirecto.', explanation: 'Sustituible por "le".' },
    ],
    morfologia: [
      { content: 'Conjuga el presente de subjuntivo del verbo "haber".', answer: 'haya, hayas, haya, hayamos, hayáis, hayan', explanation: 'Verbo irregular del modo subjuntivo.' },
      { content: 'Indica categoría: "rápidamente", "amistad", "aquel", "veintidós".', answer: 'adverbio, sustantivo, demostrativo, numeral', explanation: 'Clasificación de palabras por categoría.' },
    ],
    comprension: [
      { content: 'Tras leer el texto, indica la idea principal en una frase.', answer: 'Respuesta libre — debe sintetizar la tesis del autor.', explanation: 'Comprensión global.' },
      { content: '¿Qué intención tiene el autor al usar la palabra "evidente"?', answer: 'Reforzar la objetividad de su afirmación.', explanation: 'Análisis del léxico valorativo.' },
    ],
    redaccion: [
      { content: 'Redacta una carta formal de queja a una empresa de telefonía (mín. 150 palabras). Usa: registro formal, tres argumentos, fórmula de cortesía.', answer: 'Estructura: encabezado, exposición, argumentos, petición, despedida.', explanation: 'Texto argumentativo formal.' },
      { content: 'Escribe un texto descriptivo (120 palabras) sobre tu rincón favorito. Incluye 3 adjetivos sensoriales.', answer: 'Adjetivos sensoriales: cálido, fragante, silencioso (ejemplos).', explanation: 'Texto descriptivo subjetivo.' },
    ],
    dictado: [
      { content: 'El próximo miércoles iremos de excursión al Museo del Prado, donde veremos obras de Velázquez y Goya.', answer: 'Atención a tildes (próximo, miércoles, veremos) y mayúsculas (Museo del Prado, Velázquez, Goya).', explanation: 'Foco: tildes y nombres propios.' },
    ],
  };
  const pool = POOL[type] || POOL.ortografia;
  let exercises = [];
  while (exercises.length < count) exercises = exercises.concat(pool);
  exercises = exercises.slice(0, count).map((e, i) => ({
    number: i + 1,
    title: `Ejercicio ${i + 1}`,
    instructions: e.instructions || 'Lee atentamente y responde.',
    content: e.content,
    answer: e.answer,
    explanation: e.explanation,
    difficulty: 'medio',
    points: 2,
  }));
  // Adapt to renderExam shape (questions[])
  return {
    type,
    level,
    topic,
    exercises,
    questions: exercises.map((e) => ({
      type: 'open',
      question: e.content,
      answer: e.answer,
      explanation: e.explanation,
      points: e.points,
    })),
    teacherNotes: 'Modo demo: contenido pre-cargado. Con la API key activa se generan ejercicios variados con IA.',
    demoMode: true,
  };
};

const lenguaEssay = ({ text }) => ({
  totalScore: 7,
  maxScore: 10,
  grade: 'Notable',
  score: 7,
  summary: 'Redacción bien estructurada con ideas claras. Atención a la acentuación y a la cohesión entre párrafos.',
  categories: {
    contenido: { score: 3, maxScore: 4, feedback: 'Las ideas se presentan con claridad y se desarrollan con ejemplos.' },
    estructura: { score: 2, maxScore: 2, feedback: 'Introducción, desarrollo y conclusión bien delimitados.' },
    vocabulario: { score: 1, maxScore: 2, feedback: 'Vocabulario adecuado pero algo repetitivo. Usa sinónimos.' },
    ortografia: { score: 1, maxScore: 2, feedback: 'Algunas tildes omitidas y dos comas mal colocadas.' },
  },
  errors: [
    { category: 'ortografia', original: 'habia', correction: 'había', note: 'Tilde en pretérito imperfecto.' },
    { category: 'puntuacion', original: 'sin embargo se enfadó', correction: 'sin embargo, se enfadó', note: 'Coma tras nexo adversativo.' },
    { category: 'lexico', original: 'cosa', correction: 'situación / aspecto', note: 'Evitar comodines.' },
  ],
  strengths: ['Buena estructura de párrafos', 'Argumentos claros con ejemplos', 'Conexión adecuada entre ideas'],
  improvements: ['Revisar acentuación', 'Variar el vocabulario', 'Reforzar la conclusión con una idea de cierre'],
  overallFeedback: 'Buen trabajo general. Con un repaso ortográfico y mayor variedad léxica subirías a Sobresaliente.',
  correctedText: text ? text.slice(0, 600) + (text.length > 600 ? '…' : '') : 'Texto corregido se mostrará aquí.',
  demoMode: true,
});

const lenguaSyntax = ({ sentence }) => ({
  sentence: sentence || 'El alumno estudia mucho.',
  type: 'enunciativa afirmativa',
  subject: { text: 'El alumno', type: 'SN', nucleus: 'alumno', determinant: 'El', function: 'Sujeto' },
  predicate: {
    text: 'estudia mucho',
    type: 'SV',
    nucleus: 'estudia',
    verbType: 'intransitivo',
    complements: [{ text: 'mucho', function: 'CC de Cantidad' }],
  },
  morphologicalAnalysis: [
    { word: 'El', category: 'artículo', gender: 'masculino', number: 'singular' },
    { word: 'alumno', category: 'sustantivo', gender: 'masculino', number: 'singular' },
    { word: 'estudia', category: 'verbo', tiempo: 'presente indicativo', persona: '3ª singular' },
    { word: 'mucho', category: 'adverbio', tipo: 'cantidad' },
  ],
  teacherNotes: 'Análisis sintáctico básico de oración simple.',
  // shape compat for feedback PDF
  summary: 'Oración simple enunciativa afirmativa con predicado intransitivo.',
  strengths: [
    'Sujeto identificado: SN "El alumno"',
    'Núcleo verbal: estudia (3ª persona singular, presente indicativo)',
    'CC de Cantidad: mucho',
  ],
  improvements: [],
  demoMode: true,
});

const lenguaCommentary = ({ text, level, type }) => ({
  title: 'Guía de comentario de texto',
  level,
  intro: 'Esta guía orienta el comentario crítico del texto, organizado por bloques pedagógicos.',
  sections: [
    { title: 'Localización', body: `Texto ${type || 'literario'} de extensión media. Identifica autor, época y género.` },
    { title: 'Tema', body: 'Idea central del fragmento sintetizada en una sola frase.' },
    { title: 'Estructura', bullets: ['Introducción/exposición', 'Desarrollo argumentativo o narrativo', 'Conclusión o desenlace'] },
    { title: 'Forma', body: 'Análisis de recursos retóricos: metáforas, símiles, paralelismos, hipérbatos.' },
    { title: 'Contenido', body: 'Relación de ideas con el tema y postura del autor frente al asunto tratado.' },
    { title: 'Valoración personal', body: 'Argumento razonado sobre la actualidad o relevancia del texto.' },
  ],
  questions: [
    '¿Qué tesis defiende el autor?',
    '¿Qué recursos refuerzan esa tesis?',
    '¿Cómo se relaciona el texto con su contexto histórico-cultural?',
    '¿Qué huella deja el texto en el lector contemporáneo?',
  ],
  demoMode: true,
});

const lenguaDynamics = ({ count = 3, level, topic }) =>
  pick(
    [
      {
        title: 'El periodista incógnito',
        type: 'speaking',
        typeLabel: 'Expresión oral',
        grouping: 'parejas',
        description: 'Entrevistas en pareja con preguntas sorpresa para practicar tipologías textuales.',
        objective: 'Diferenciar registro formal e informal en una entrevista.',
        steps: [
          'Reparte tarjetas con personajes (alcalde, deportista, científico).',
          'En parejas, uno entrevista; el otro responde en personaje.',
          'Cambian de rol cada 5 minutos.',
          'Puesta en común: identificar marcas de registro formal.',
        ],
        materials: ['Tarjetas de personaje', 'Cronómetro'],
      },
      {
        title: 'Detector de gazapos',
        type: 'grammar',
        typeLabel: 'Gramática',
        grouping: 'grupos de 3',
        description: 'Cazar errores ortográficos y de concordancia en titulares de prensa reales.',
        objective: 'Aplicar normas ortográficas y de concordancia.',
        steps: [
          'Reparte 10 titulares (5 con error, 5 correctos).',
          'Cada grupo identifica errores y propone corrección.',
          'Defensa razonada ante la clase.',
          'Sumar puntos por aciertos.',
        ],
        materials: ['Titulares impresos', 'Pizarra'],
      },
      {
        title: 'Cadena narrativa',
        type: 'writing',
        typeLabel: 'Expresión escrita',
        grouping: 'grupos de 4',
        description: 'Escritura colaborativa de un microrrelato pasando el papel cada minuto.',
        objective: 'Trabajar coherencia y cohesión en narrativa breve.',
        steps: [
          'Cada grupo escribe la primera frase del relato.',
          'A los 60 s pasan el papel al siguiente; añaden otra frase.',
          'Tras 5 rondas se lee el resultado.',
          'Análisis: ¿hay coherencia? ¿qué conectores faltan?',
        ],
        materials: ['Folio por grupo', 'Cronómetro'],
      },
    ],
    Math.min(count, 3)
  ).map((a) => ({ ...a, duration: 20, level, topic }));

// ── Matemáticas ─────────────────────────────────────────────
const matematicasProblems = ({ level, topic, difficulty, count = 5 }) => {
  const POOL = {
    operaciones_basicas: [
      { statement: 'Un autobús lleva 47 personas. En la siguiente parada se bajan 18 y suben 25. ¿Cuántas personas viajan ahora?', steps: ['Personas tras bajada: 47 − 18 = 29', 'Personas tras subida: 29 + 25 = 54'], answer: '54 personas' },
      { statement: 'Compras 4 cuadernos a 2,50 € y 3 bolígrafos a 1,20 €. ¿Cuánto pagas?', steps: ['Cuadernos: 4 × 2,50 = 10,00 €', 'Bolígrafos: 3 × 1,20 = 3,60 €', 'Total: 10,00 + 3,60 = 13,60 €'], answer: '13,60 €' },
    ],
    fracciones: [
      { statement: 'Un pastel se divide en 8 partes. María come 3 partes y Luis come 2. ¿Qué fracción del pastel queda?', steps: ['Comen: 3/8 + 2/8 = 5/8', 'Queda: 1 − 5/8 = 3/8'], answer: '3/8 del pastel' },
    ],
    algebra: [
      { statement: 'Resuelve la ecuación: 3(x − 2) + 5 = 2x + 4', steps: ['Distribuir: 3x − 6 + 5 = 2x + 4', 'Agrupar: 3x − 1 = 2x + 4', 'Despejar: 3x − 2x = 4 + 1', 'x = 5'], answer: 'x = 5' },
      { statement: 'Halla los valores de x e y: x + y = 10, x − y = 4', steps: ['Sumando ambas: 2x = 14 → x = 7', 'Sustituyendo: 7 + y = 10 → y = 3'], answer: 'x = 7, y = 3' },
    ],
    ecuaciones: [
      { statement: 'Resuelve: x² − 5x + 6 = 0', steps: ['Factorizar: (x − 2)(x − 3) = 0', 'x − 2 = 0 → x = 2', 'x − 3 = 0 → x = 3'], answer: 'x = 2 ó x = 3' },
    ],
    geometria: [
      { statement: 'Un rectángulo mide 12 m de largo y 7 m de ancho. Calcula su perímetro y su área.', steps: ['Perímetro: 2 · (12 + 7) = 38 m', 'Área: 12 · 7 = 84 m²'], answer: 'P = 38 m, A = 84 m²' },
      { statement: 'Calcula el volumen de un cubo de arista 5 cm.', steps: ['V = a³ = 5³', 'V = 125 cm³'], answer: '125 cm³' },
    ],
    funciones: [
      { statement: 'Dada f(x) = 2x − 3, calcula f(0), f(3) y f(−2).', steps: ['f(0) = 2·0 − 3 = −3', 'f(3) = 2·3 − 3 = 3', 'f(−2) = 2·(−2) − 3 = −7'], answer: 'f(0) = −3, f(3) = 3, f(−2) = −7' },
    ],
    estadistica: [
      { statement: 'Notas de 5 alumnos: 6, 8, 7, 9, 5. Calcula media, mediana y moda.', steps: ['Media: (6+8+7+9+5)/5 = 35/5 = 7', 'Ordenadas: 5, 6, 7, 8, 9 → mediana = 7', 'Moda: no hay (cada valor aparece una sola vez)'], answer: 'Media 7, mediana 7, sin moda' },
    ],
  };
  const list = POOL[topic] || POOL.algebra;
  let problems = [];
  while (problems.length < count) problems = problems.concat(list);
  problems = problems.slice(0, count).map((p, i) => ({
    number: i + 1,
    statement: p.statement,
    steps: p.steps,
    answer: p.answer,
    points: 2,
    estimatedMinutes: 5,
    difficulty: difficulty || 'medio',
    curriculumLink: `Real Decreto 217/2022 — ${level}`,
  }));
  return {
    topic,
    level,
    difficulty,
    problems,
    teacherNotes: 'Modo demo: problemas pre-cargados. Con la API key activa la IA generará variantes infinitas.',
    commonMistakes: ['Olvidar el orden de operaciones', 'Errores de signo al transponer términos', 'Confundir perímetro y área'],
    demoMode: true,
  };
};

const matematicasSeries = ({ topic, level, difficulty, count = 20 }) => {
  // Generate a graded list of arithmetic exercises by topic
  const generators = {
    operaciones_basicas: () => {
      const a = 2 + Math.floor(Math.random() * 18);
      const b = 2 + Math.floor(Math.random() * 18);
      const op = ['+', '−', '×'][Math.floor(Math.random() * 3)];
      const ans = op === '+' ? a + b : op === '−' ? a - b : a * b;
      return { exercise: `${a} ${op} ${b} =`, answer: String(ans) };
    },
    fracciones: () => {
      const a = 1 + Math.floor(Math.random() * 5);
      const b = 2 + Math.floor(Math.random() * 4);
      const c = 1 + Math.floor(Math.random() * 5);
      return { exercise: `${a}/${b} + ${c}/${b} =`, answer: `${a + c}/${b}` };
    },
    algebra: () => {
      const a = 1 + Math.floor(Math.random() * 9);
      const b = -10 + Math.floor(Math.random() * 20);
      return { exercise: `${a}x + ${b} = 0`, answer: `x = ${(-b / a).toFixed(2)}` };
    },
    ecuaciones: () => {
      const r1 = -5 + Math.floor(Math.random() * 11);
      const r2 = -5 + Math.floor(Math.random() * 11);
      return { exercise: `x² − ${r1 + r2}x + ${r1 * r2} = 0`, answer: `x = ${r1} ó x = ${r2}` };
    },
  };
  const gen = generators[topic] || generators.operaciones_basicas;
  const series = Array.from({ length: count }, (_, i) => ({
    number: i + 1,
    ...gen(),
    difficulty: i < count / 3 ? 'basico' : i < (2 * count) / 3 ? 'medio' : 'avanzado',
  }));
  return {
    topic,
    level,
    difficulty,
    series,
    problems: series.map((s) => ({ statement: s.exercise, answer: s.answer })),
    instructions: 'Resuelve respetando la jerarquía de operaciones. Incluye unidades cuando proceda.',
    timeEstimate: `${count * 2} minutos`,
    demoMode: true,
  };
};

const matematicasOcr = () => ({
  totalScore: 7.5,
  maxScore: 10,
  score: 7.5,
  summary: 'Buen planteamiento general; revisa el manejo de signos y la sustitución final.',
  exercises: [
    { number: 1, isCorrect: true, partialCredit: 1, maxPoints: 1, errors: [], feedback: 'Correcto. Buen uso de la propiedad distributiva.' },
    { number: 2, isCorrect: false, partialCredit: 0.5, maxPoints: 1, errors: [{ step: 'paso 3', description: 'Error de signo al transponer −5', correction: '+5x − 10 = 0' }], feedback: 'Buena estrategia, pero error de signo en el paso 3.' },
    { number: 3, isCorrect: true, partialCredit: 1, maxPoints: 1, errors: [], feedback: 'Resolución correcta y bien estructurada.' },
  ],
  errors: [{ category: 'signos', original: '−5 → −5', correction: '−5 → +5', note: 'Al pasar al otro miembro cambia el signo.' }],
  strengths: ['Planteamiento ordenado', 'Cálculos aritméticos correctos', 'Respuesta con unidades'],
  improvements: ['Cuidado con los signos al transponer', 'Verifica la sustitución final'],
  overallFeedback: 'Buen trabajo general. Repasa transposición de términos.',
  demoMode: true,
});

// ── Conocimiento del Medio ──────────────────────────────────
const medioSheet = ({ topic, grade }) => ({
  title: `Ficha temática — ${topic}`,
  level: `${grade}º Primaria`,
  intro: `Esta ficha trabaja el tema "${topic}" para ${grade}º de Primaria con contenido alineado al currículo LOMLOE.`,
  sections: [
    { title: 'Concepto clave', body: `El tema "${topic}" estudia los fenómenos, procesos y elementos que lo caracterizan, sus causas y sus consecuencias.` },
    { title: 'Datos importantes', bullets: ['Definición precisa con vocabulario adecuado a la edad', 'Tres ejemplos cotidianos del entorno cercano', 'Relación con experiencias previas del alumnado'] },
    { title: 'Curiosidades', bullets: ['Dato sorprendente que conecta con su vida diaria', 'Pregunta abierta para despertar interés', 'Conexión con otros temas vistos en clase'] },
    { title: 'Vocabulario', bullets: ['Término 1 — definición sencilla', 'Término 2 — definición sencilla', 'Término 3 — definición sencilla'] },
  ],
  questions: [
    `¿Qué es ${topic} con tus propias palabras?`,
    'Dibuja y explica un ejemplo que hayas observado.',
    `¿Qué relación tiene ${topic} con el medio ambiente?`,
    'Comenta con un compañero qué te ha sorprendido más.',
  ],
  demoMode: true,
});

const medioQuiz = ({ topic, grade, count = 10 }) => {
  const QUESTIONS = [
    { type: 'multiple_choice', question: '¿Cuántos planetas tiene el Sistema Solar?', options: ['6', '7', '8', '9'], answer: '8', explanation: 'Desde 2006 Plutón es planeta enano.' },
    { type: 'true_false', question: 'El agua hierve a 100 °C al nivel del mar.', answer: 'True', explanation: 'Punto de ebullición a 1 atm.' },
    { type: 'multiple_choice', question: '¿Cuál es el órgano principal del sistema respiratorio?', options: ['Corazón', 'Pulmones', 'Hígado', 'Riñones'], answer: 'Pulmones', explanation: 'Responsables del intercambio gaseoso.' },
    { type: 'true_false', question: 'Los reptiles son animales de sangre caliente.', answer: 'False', explanation: 'Son ectotermos: dependen de la temperatura externa.' },
    { type: 'multiple_choice', question: '¿Qué planta es un árbol de hoja caduca?', options: ['Pino', 'Roble', 'Encina', 'Olivo'], answer: 'Roble', explanation: 'Pierde las hojas en otoño.' },
    { type: 'multiple_choice', question: '¿Qué capa de la Tierra contiene el aire que respiramos?', options: ['Hidrosfera', 'Atmósfera', 'Litosfera', 'Geosfera'], answer: 'Atmósfera', explanation: 'Es la capa gaseosa.' },
    { type: 'true_false', question: 'El Sol es una estrella.', answer: 'True', explanation: 'Estrella tipo G2V de la Vía Láctea.' },
    { type: 'multiple_choice', question: '¿Qué hueso es el más largo del cuerpo humano?', options: ['Húmero', 'Tibia', 'Fémur', 'Cúbito'], answer: 'Fémur', explanation: 'Hueso del muslo.' },
    { type: 'true_false', question: 'La Luna emite luz propia.', answer: 'False', explanation: 'Refleja la luz del Sol.' },
    { type: 'multiple_choice', question: '¿Qué animal es un mamífero?', options: ['Tortuga', 'Águila', 'Delfín', 'Salmón'], answer: 'Delfín', explanation: 'Aunque vive en el mar, respira por pulmones y amamanta.' },
  ];
  let questions = [];
  while (questions.length < count) questions = questions.concat(QUESTIONS);
  questions = questions.slice(0, count).map((q, i) => ({ ...q, number: i + 1, points: 1 }));
  return {
    topic,
    grade,
    questions,
    totalPoints: count,
    demoMode: true,
  };
};

const medioDynamics = ({ count = 3, level, topic }) =>
  pick(
    [
      {
        title: 'Pequeños científicos: ¿flota o se hunde?',
        type: 'experiment',
        typeLabel: 'Experimento',
        grouping: 'parejas',
        description: 'Predicción y prueba con objetos cotidianos para introducir la idea de densidad.',
        objective: 'Formular hipótesis y compararlas con observaciones.',
        steps: [
          'Cada pareja recoge 5 objetos pequeños del aula.',
          'Antes de probar, predicen si flota o se hunde y por qué.',
          'Sumergen los objetos en un recipiente con agua.',
          'Registran resultados en tabla y comparan con las predicciones.',
          'Puesta en común: ¿qué propiedades influyen?',
        ],
        materials: ['Recipiente con agua', '5 objetos por pareja', 'Hoja de registro'],
      },
      {
        title: 'Maqueta del Sistema Solar',
        type: 'discovery',
        typeLabel: 'Descubrimiento guiado',
        grouping: 'grupos de 4',
        description: 'Construcción colaborativa de una maqueta a escala con datos reales.',
        objective: 'Comprender el orden, tamaño relativo y distancias del Sistema Solar.',
        steps: [
          'Cada grupo investiga 2 planetas (orden, diámetro, distancia al Sol).',
          'Calculan la escala adecuada al espacio del aula.',
          'Modelan los planetas con plastilina o pelotas.',
          'Colocan los planetas en su posición y exponen.',
        ],
        materials: ['Plastilina', 'Cinta métrica', 'Cartulinas'],
      },
      {
        title: 'El periodista del clima',
        type: 'discovery',
        typeLabel: 'Investigación',
        grouping: 'individual',
        description: 'Cada alumno actúa como hombre/mujer del tiempo durante una semana.',
        objective: 'Registrar e interpretar datos meteorológicos sencillos.',
        steps: [
          'Asignar a cada alumno un día de la semana.',
          'Recogen temperatura, viento, precipitación y nubes.',
          'Presentan el parte del tiempo de su día (1 minuto).',
          'Comparan tendencias semanales en pizarra.',
        ],
        materials: ['Termómetro', 'Hoja de registro', 'Mapa del aula'],
      },
    ],
    Math.min(count, 3)
  ).map((a) => ({ ...a, duration: 25, level, topic }));

// ── OCR (Cambridge exam image) ──────────────────────────────
const ocrCorrection = ({ certification, level }) => ({
  score: 17,
  grade: 17,
  maxScore: 20,
  maxGrade: 20,
  certification,
  level,
  summary: `Examen ${certification || 'PET'} corregido. Puntuación 17/20. Buen dominio gramatical, pero presta atención a errores de cohesión.`,
  strengths: ['Vocabulario amplio y preciso', 'Estructuras gramaticales variadas', 'Buena legibilidad de la caligrafía'],
  improvements: ['Cohesión entre párrafos', 'Uso de conectores avanzados', 'Cierre de la redacción más contundente'],
  errors: [
    { category: 'grammar', original: 'I have went', correction: 'I have gone', note: 'Past participle of "go".' },
    { category: 'spelling', original: 'recieve', correction: 'receive', note: 'Regla "i before e except after c".' },
    { category: 'punctuation', original: 'However the', correction: 'However, the', note: 'Coma tras conector.' },
  ],
  demoMode: true,
});

module.exports = {
  cambridgeExam,
  cambridgeDynamics,
  cambridgePresentation,
  lenguaExercises,
  lenguaEssay,
  lenguaSyntax,
  lenguaCommentary,
  lenguaDynamics,
  matematicasProblems,
  matematicasSeries,
  matematicasOcr,
  medioSheet,
  medioQuiz,
  medioDynamics,
  ocrCorrection,
};
