/**
 * Calendario Completo de Efemérides Nacionales, Jurídicas y Festivas de Venezuela
 * Plataforma KANT - Román & Delgado
 */

export interface Efemeride {
  id: string;
  mes: number; // 1-12
  dia: number; // 1-31
  titulo: string;
  categoria: 'patria' | 'juridica' | 'festiva' | 'profesional' | 'cultural' | 'religiosa';
  icono: string;
  esFeriado?: boolean;
  descripcion: string;
  mensajeKant: string;
  colorTema?: string;
}

export const EFEMERIDES_VENEZUELA: Efemeride[] = [
  // ==================== ENERO ====================
  {
    id: 'ene-01',
    mes: 1,
    dia: 1,
    titulo: 'Año Nuevo',
    categoria: 'festiva',
    icono: '🎆',
    esFeriado: true,
    descripcion: 'Inicio del Año Calendario. Feriado Nacional de paz, unión familiar y nuevos proyectos.',
    mensajeKant: '¡Feliz Año Nuevo a toda la familia Román & Delgado! 🎆 Que este año esté lleno de victorias legales y prosperidad.',
    colorTema: 'amber'
  },
  {
    id: 'ene-06',
    mes: 1,
    dia: 6,
    titulo: 'Día de Reyes y Día del Deporte',
    categoria: 'cultural',
    icono: '👑',
    descripcion: 'Celebración tradicional de los Reyes Magos y homenaje nacional al deporte venezolano.',
    mensajeKant: '¡Feliz Día de Reyes! 👑 Tradición y constancia en cada meta que nos propongamos.',
    colorTema: 'yellow'
  },
  {
    id: 'ene-14',
    mes: 1,
    dia: 14,
    titulo: 'Procesión de la Divina Pastora',
    categoria: 'religiosa',
    icono: '🕊️',
    descripcion: 'Multitudinaria peregrinación en el estado Lara, una de las mayores manifestaciones de fe de Venezuela y Latinoamérica.',
    mensajeKant: 'Que la Divina Pastora bendiga los hogares y el trabajo honesto de nuestro equipo. 🕊️',
    colorTema: 'blue'
  },
  {
    id: 'ene-15',
    mes: 1,
    dia: 15,
    titulo: 'Día del Maestro en Venezuela',
    categoria: 'profesional',
    icono: '📚',
    descripcion: 'Homenaje a los educadores venezolanos en conmemoración de la fundación de la Sociedad Venezolana de Maestros de Instrucción Primaria (1932).',
    mensajeKant: '¡Honor a los maestros venezolanos! 📚 La educación y el conocimiento son los cimientos de la justicia.',
    colorTema: 'indigo'
  },
  {
    id: 'ene-23',
    mes: 1,
    dia: 23,
    titulo: 'Día de la Democracia (Caída de la Dictadura de 1958)',
    categoria: 'patria',
    icono: '🇻🇪',
    descripcion: 'Conmemoración del derrocamiento de la dictadura militar de Marcos Pérez Jiménez y la restitución del orden civil en Venezuela.',
    mensajeKant: 'El 23 de Enero nos recuerda el valor de la libertad civil y el Estado de Derecho en Venezuela. 🇻🇪',
    colorTema: 'red'
  },

  // ==================== FEBRERO ====================
  {
    id: 'feb-04',
    mes: 2,
    dia: 4,
    titulo: 'Día de la Dignidad Nacional',
    categoria: 'patria',
    icono: '🎖️',
    descripcion: 'Fecha cívico-militar en la historia contemporánea de Venezuela.',
    mensajeKant: 'Día histórico en el calendario venezolano. 🇻🇪',
    colorTema: 'red'
  },
  {
    id: 'feb-12',
    mes: 2,
    dia: 12,
    titulo: 'Batalla de La Victoria & Día de la Juventud',
    categoria: 'patria',
    icono: '⚡',
    esFeriado: false,
    descripcion: 'Homenaje a José Félix Ribas y a los jóvenes universitarios y seminaristas que defendieron la República en 1814: «No podemos optar entre vencer o morir, ¡necesario es vencer!».',
    mensajeKant: '¡Feliz Día de la Juventud! ⚡ Con la fuerza de José Félix Ribas: ¡necesario es vencer!',
    colorTema: 'amber'
  },
  {
    id: 'feb-14',
    mes: 2,
    dia: 14,
    titulo: 'Día del Amor y la Amistad (San Valentín)',
    categoria: 'festiva',
    icono: '❤️',
    descripcion: 'Celebración universal del cariño, la lealtad, el compañerismo y los buenos vínculos.',
    mensajeKant: '¡Feliz San Valentín! ❤️ El perrito Kant les manda mucho cariño a todo el equipo de Román & Delgado.',
    colorTema: 'rose'
  },

  // ==================== MARZO ====================
  {
    id: 'mar-08',
    mes: 3,
    dia: 8,
    titulo: 'Día Internacional de la Mujer',
    categoria: 'cultural',
    icono: '🌸',
    descripcion: 'Reconocimiento mundial a la lucha por la igualdad, los derechos y el liderazgo fundamental de las mujeres.',
    mensajeKant: '¡Feliz Día de la Mujer! 🌸 Nuestro mayor respeto y admiración a todas las abogadas y colaboradoras de la firma.',
    colorTema: 'purple'
  },
  {
    id: 'mar-10',
    mes: 3,
    dia: 10,
    titulo: 'Día del Médico en Venezuela',
    categoria: 'profesional',
    icono: '🩺',
    descripcion: 'Homenaje al natalicio del Dr. José María Vargas (1786), insigne médico, rector universitario y presidente civil de la República.',
    mensajeKant: 'Homenaje al sabio Dr. José María Vargas y a todos los médicos venezolanos. 🩺',
    colorTema: 'cyan'
  },
  {
    id: 'mar-19',
    mes: 3,
    dia: 19,
    titulo: 'Día de San José & Fiestas de Elorza',
    categoria: 'cultural',
    icono: '🌾',
    descripcion: 'Festividad patronal de San José y celebración cumbre del folclore y la música llanera en Elorza, estado Apure.',
    mensajeKant: '¡19 de Marzo, fiesta en Elorza y San José! 🌾 Orgullo por nuestras raíces y folclore llanero.',
    colorTema: 'emerald'
  },

  // ==================== ABRIL ====================
  {
    id: 'abr-19',
    mes: 4,
    dia: 19,
    titulo: 'Primer Paso hacia la Independencia (19 de Abril de 1810)',
    categoria: 'patria',
    icono: '🇻🇪',
    esFeriado: true,
    descripcion: 'Feriado Nacional. El Cabildo de Caracas desconoce la autoridad colonial y da el grito fundacional de la soberanía venezolana.',
    mensajeKant: '¡19 de Abril! 🇻🇪 Conmemoramos el grito fundacional de nuestra libertad y soberanía.',
    colorTema: 'yellow'
  },
  {
    id: 'abr-22',
    mes: 4,
    dia: 22,
    titulo: 'Día Internacional de la Madre Tierra',
    categoria: 'cultural',
    icono: '🌍',
    descripcion: 'Concienciación global para proteger el medio ambiente, los ecosistemas y la sostenibilidad del planeta.',
    mensajeKant: 'Cuidemos nuestro planeta y nuestros hermosos paisajes venezolanos. 🌍🐾',
    colorTema: 'emerald'
  },
  {
    id: 'abr-23',
    mes: 4,
    dia: 23,
    titulo: 'Día Mundial del Libro y del Idioma Español',
    categoria: 'cultural',
    icono: '📖',
    descripcion: 'Homenaje universal a la literatura en honor a Miguel de Cervantes y la lengua castellana, instrumento vital del derecho.',
    mensajeKant: 'Las palabras precisas y los libros son las armas más nobles del buen jurista. 📖⚖️',
    colorTema: 'amber'
  },

  // ==================== MAYO ====================
  {
    id: 'may-01',
    mes: 5,
    dia: 1,
    titulo: 'Día Internacional del Trabajador',
    categoria: 'profesional',
    icono: '💼',
    esFeriado: true,
    descripcion: 'Feriado Nacional. Reivindicación de los derechos laborales y reconocimiento al esfuerzo de la clase trabajadora.',
    mensajeKant: '¡Feliz Día del Trabajador! 💼 Nuestro reconocimiento a todo el equipo que hace posible la excelencia de Román & Delgado.',
    colorTema: 'blue'
  },
  {
    id: 'may-03',
    mes: 5,
    dia: 3,
    titulo: 'Día de la Cruz de Mayo',
    categoria: 'cultural',
    icono: '🌺',
    descripcion: 'Tradición cultural y religiosa venezolana para agradecer la llegada de las lluvias y pedir fertilidad en las cosechas.',
    mensajeKant: 'Cantos de velorio y flores para la Cruz de Mayo, hermosa tradición de nuestro país. 🌺',
    colorTema: 'rose'
  },

  // ==================== JUNIO ====================
  {
    id: 'jun-05',
    mes: 6,
    dia: 5,
    titulo: 'Día Mundial del Medio Ambiente',
    categoria: 'cultural',
    icono: '🌿',
    descripcion: 'Llamado a la conservación de la biodiversidad, parques nacionales y recursos naturales de Venezuela.',
    mensajeKant: 'Cuidemos la imponente naturaleza de Venezuela: desde el Ávila hasta Canaima. 🌿',
    colorTema: 'emerald'
  },
  {
    id: 'jun-23',
    mes: 6,
    dia: 23,
    titulo: 'DÍA NACIONAL DEL ABOGADO EN VENEZUELA ⚖️',
    categoria: 'juridica',
    icono: '⚖️',
    esFeriado: false,
    descripcion: 'Homenaje a los profesionales del Derecho en honor al natalicio de Don Cristóbal Hurtado de Mendoza (1772), primer Presidente de la República y eminente jurista patriota.',
    mensajeKant: '⚖️ ¡FELIZ DÍA DEL ABOGADO! Un saludo y homenaje muy especial a todo el equipo jurídico de Román & Delgado. ¡Guardianes de la justicia y el derecho!',
    colorTema: 'amber'
  },
  {
    id: 'jun-24',
    mes: 6,
    dia: 24,
    titulo: 'Batalla de Carabobo (1821) & Día del Ejército',
    categoria: 'patria',
    icono: '⚔️',
    esFeriado: true,
    descripcion: 'Feriado Nacional. Victoria militar decisiva del Libertador Simón Bolívar que selló la independencia política de Venezuela.',
    mensajeKant: '¡Gloria a los héroes de Carabobo! ⚔️ La gesta que selló nuestra independencia definitiva.',
    colorTema: 'red'
  },
  {
    id: 'jun-27',
    mes: 6,
    dia: 27,
    titulo: 'Día Nacional del Periodista',
    categoria: 'profesional',
    icono: '📰',
    descripcion: 'Conmemoración del primer número del Correo del Orinoco fundado por Simón Bolívar en 1818.',
    mensajeKant: '¡Feliz Día del Periodista! 📰 La verdad, la libertad de expresión y la ética enriquecen a la sociedad.',
    colorTema: 'slate'
  },

  // ==================== JULIO ====================
  {
    id: 'jul-05',
    mes: 7,
    dia: 5,
    titulo: 'Día de la Independencia de Venezuela (5 de Julio de 1811)',
    categoria: 'patria',
    icono: '🇻🇪',
    esFeriado: true,
    descripcion: 'Feriado Nacional. Firma del Acta de la Declaración de Independencia por el Supremo Congreso de Venezuela. Día de la Fuerza Armada.',
    mensajeKant: '¡5 de Julio, Día de la Patria! 🇻🇪 Celebramos con orgullo la firma de nuestra Independencia Nacional.',
    colorTema: 'yellow'
  },
  {
    id: 'jul-24',
    mes: 7,
    dia: 24,
    titulo: 'Natalicio del Libertador Simón Bolívar (1783)',
    categoria: 'patria',
    icono: '⭐',
    esFeriado: true,
    descripcion: 'Feriado Nacional. Nacimiento en Caracas de Simón José Antonio de la Santísima Trinidad Bolívar y Palacios, Padre de la Patria.',
    mensajeKant: '«El título de Libertador es superior a todos los que ha recibido el orgullo humano». ¡Viva Bolívar! ⭐🇻🇪',
    colorTema: 'amber'
  },

  // ==================== AGOSTO ====================
  {
    id: 'ago-03',
    mes: 8,
    dia: 3,
    titulo: 'Día de la Bandera Nacional',
    categoria: 'patria',
    icono: '🚩',
    descripcion: 'Conmemoración de la fecha en que Francisco de Miranda izó por primera vez el tricolor nacional en La Vela de Coro (1806).',
    mensajeKant: '¡Amarillo, azul y rojo con ocho estrellas! Honramos nuestro tricolor patrio en La Vela de Coro. 🚩',
    colorTema: 'yellow'
  },
  {
    id: 'ago-20',
    mes: 8,
    dia: 20,
    titulo: 'Día Nacional del Bombero',
    categoria: 'profesional',
    icono: '🚒',
    descripcion: 'Reconocimiento a los hombres y mujeres del fuego que entregan su vida por salvar a la ciudadanía.',
    mensajeKant: 'Honor y gratitud a nuestros valientes bomberos en toda Venezuela. 🚒🐾',
    colorTema: 'red'
  },

  // ==================== SEPTIEMBRE ====================
  {
    id: 'sep-08',
    mes: 9,
    dia: 8,
    titulo: 'Día de la Virgen del Valle & Fundación de Maracaibo',
    categoria: 'religiosa',
    icono: '⛵',
    descripcion: 'Festividad de Vallita, patrona del Oriente venezolano, de los pescadores y de la Armada. También se conmemora la fundación de Maracaibo (1529).',
    mensajeKant: '¡Bendición de nuestra amada Virgen del Valle para todos en Oriente y toda Venezuela! ⛵🕊️',
    colorTema: 'blue'
  },
  {
    id: 'sep-11',
    mes: 9,
    dia: 11,
    titulo: 'Día de la Virgen de Coromoto (Patrona de Venezuela)',
    categoria: 'religiosa',
    icono: '👑',
    descripcion: 'Celebración solemne de Nuestra Señora de Coromoto, declarada celestial patrona de Venezuela por el Papa Pío XII en 1942.',
    mensajeKant: 'Bajo el manto protector de la Virgen de Coromoto, Patrona de toda Venezuela. 👑🇻🇪',
    colorTema: 'amber'
  },
  {
    id: 'sep-21',
    mes: 9,
    dia: 21,
    titulo: 'Día Internacional de la Paz',
    categoria: 'cultural',
    icono: '🕊️',
    descripcion: 'Jornada global impulsada por la ONU para fortalecer los ideales de paz, resolución pacífica de conflictos y justicia.',
    mensajeKant: 'La verdadera justicia engendra la paz social. ¡Feliz Día Internacional de la Paz! 🕊️⚖️',
    colorTema: 'cyan'
  },
  {
    id: 'sep-27',
    mes: 9,
    dia: 27,
    titulo: 'Día Mundial del Turismo',
    categoria: 'cultural',
    icono: '🏖️',
    descripcion: 'Promoción del patrimonio geográfico y cultural. Venezuela: país de playas, selvas, llanos y nieves andinas.',
    mensajeKant: 'Desde Mochima hasta Los Roques y Mérida: ¡qué orgullo nuestro hermoso país! 🏖️⛰️',
    colorTema: 'emerald'
  },
  {
    id: 'sep-30',
    mes: 9,
    dia: 30,
    titulo: 'Día Internacional de la Traducción y del Derecho Comparado',
    categoria: 'cultural',
    icono: '🌐',
    descripcion: 'Celebración de los puentes lingüísticos y la comunicación jurídica transfronteriza en la festividad de San Jerónimo.',
    mensajeKant: 'Comunicación, rigor y precisión técnica en cada documento y trámite legal. 🌐🐾',
    colorTema: 'indigo'
  },

  // ==================== OCTUBRE ====================
  {
    id: 'oct-01',
    mes: 10,
    dia: 1,
    titulo: 'Día Nacional del Cacao Venezolano',
    categoria: 'cultural',
    icono: '🍫',
    descripcion: 'Homenaje al cacao fino de aroma venezolano (Chuao, Carenero, Sur del Lago), reconocido entre los mejores del planeta.',
    mensajeKant: '¡Orgullo nacional! El cacao venezolano es el mejor del mundo. Un gustito dulce para la oficina. 🍫☕',
    colorTema: 'amber'
  },
  {
    id: 'oct-04',
    mes: 10,
    dia: 4,
    titulo: 'Día Mundial de los Animales (San Francisco de Asís)',
    categoria: 'festiva',
    icono: '🐶',
    descripcion: 'Celebración de la fauna y los derechos de los animales. ¡Día especial para la mascota Kant!',
    mensajeKant: '¡Guau! 🐶 Hoy es mi día y el de todos mis amigos peludos. ¡Cuidemos y protejamos a los animales!',
    colorTema: 'emerald'
  },
  {
    id: 'oct-12',
    mes: 10,
    dia: 12,
    titulo: 'Día de la Resistencia Indígena',
    categoria: 'patria',
    icono: '🏹',
    esFeriado: true,
    descripcion: 'Feriado Nacional. Conmemoración de las raíces ancestrales, lenguas y cultura de los pueblos originarios de Venezuela.',
    mensajeKant: 'Reconocimiento y dignidad para nuestros pueblos indígenas y raíces ancestrales. 🏹🇻🇪',
    colorTema: 'red'
  },
  {
    id: 'oct-19',
    mes: 10,
    dia: 19,
    titulo: 'Día Mundial contra el Cáncer de Mama',
    categoria: 'cultural',
    icono: '🎀',
    descripcion: 'Jornada de sensibilización sobre la prevención, el diagnóstico temprano y el apoyo a las pacientes.',
    mensajeKant: '¡La prevención salva vidas! Nuestro apoyo y lazo rosa en la lucha contra el cáncer de mama. 🎀',
    colorTema: 'rose'
  },
  {
    id: 'oct-24',
    mes: 10,
    dia: 24,
    titulo: 'Natalicio del General Rafael Urdaneta & Día de las Naciones Unidas',
    categoria: 'patria',
    icono: '🎖️',
    descripcion: 'Homenaje al prócer zuliano «El Brillante» Rafael Urdaneta y fundación de la ONU (1945).',
    mensajeKant: 'Recordamos la lealtad y rectitud del General Rafael Urdaneta, prócer zuliano de la patria. 🎖️',
    colorTema: 'blue'
  },
  {
    id: 'oct-26',
    mes: 10,
    dia: 26,
    titulo: 'Natalicio del Dr. José Gregorio Hernández (1864)',
    categoria: 'religiosa',
    icono: '🩺',
    descripcion: 'Nacimiento del «Médico de los Pobres» en Isnotú, estado Trujillo. Gran benefactor, científico y beato venerado en toda Venezuela.',
    mensajeKant: 'Celebramos la bondad, ciencia y fe del Beato Dr. José Gregorio Hernández, orgullo venezolano. 🩺🕊️',
    colorTema: 'slate'
  },
  {
    id: 'oct-28',
    mes: 10,
    dia: 28,
    titulo: 'Día del Ingeniero en Venezuela & Natalicio de Simón Rodríguez',
    categoria: 'profesional',
    icono: '📐',
    descripcion: 'Fundación del Colegio de Ingenieros de Venezuela en 1861 y homenaje al maestro del Libertador, Simón Rodríguez (Samuel Robinson).',
    mensajeKant: '«O inventamos o erramos». ¡Feliz día a todos los ingenieros y al gran maestro Simón Rodríguez! 📐',
    colorTema: 'indigo'
  },
  {
    id: 'oct-31',
    mes: 10,
    dia: 31,
    titulo: 'Noche de Halloween / Víspera de Todos los Santos 🎃',
    categoria: 'festiva',
    icono: '🎃',
    descripcion: 'Celebración festiva de disfraces, calabazas y dulces compartidos. ¡Kant se pone su disfraz!',
    mensajeKant: '🎃 ¡Boo! ¡Feliz Halloween a todo el equipo! Cuidado con los fantasmas procesales y que no falten los dulces en la oficina. 🍬🐾',
    colorTema: 'amber'
  },

  // ==================== NOVIEMBRE ====================
  {
    id: 'nov-01',
    mes: 11,
    dia: 1,
    titulo: 'Día de Todos los Santos',
    categoria: 'religiosa',
    icono: '✨',
    descripcion: 'Tradición para recordar a todos los santos y mártires que han servido a la humanidad con virtud.',
    mensajeKant: 'Día de reflexión y buenos valores en comunidad. ✨',
    colorTema: 'yellow'
  },
  {
    id: 'nov-02',
    mes: 11,
    dia: 2,
    titulo: 'Día de los Fieles Difuntos',
    categoria: 'religiosa',
    icono: '🕯️',
    descripcion: 'Jornada solemne para honrar la memoria y el legado de nuestros seres queridos que partieron.',
    mensajeKant: 'Recordamos con amor y respeto a quienes dejaron una huella imborrable en nuestras vidas. 🕯️',
    colorTema: 'slate'
  },
  {
    id: 'nov-18',
    mes: 11,
    dia: 18,
    titulo: 'Día de la Virgen de Chiquinquirá (La Chinita)',
    categoria: 'religiosa',
    icono: '🥁',
    descripcion: 'La fiesta mariana más alegre de Venezuela: amanecer gaitero, devoción zuliana y el inicio formal de la Navidad en el país.',
    mensajeKant: '¡Ay qué molleja de fiesta! ¡Feliz día de La Chinita! Que repiquen las gaitas zulianas y comience la Navidad. 🥁🇻🇪',
    colorTema: 'amber'
  },
  {
    id: 'nov-25',
    mes: 11,
    dia: 25,
    titulo: 'Día de la Eliminación de la Violencia contra la Mujer',
    categoria: 'juridica',
    icono: '⚖️',
    descripcion: 'Compromiso del Derecho y la sociedad venezolana en defensa de la vida, libertad y dignidad de las mujeres.',
    mensajeKant: 'Cero tolerancia a la violencia. La justicia y la ley protegen a nuestras mujeres. ⚖️💜',
    colorTema: 'purple'
  },

  // ==================== DICIEMBRE ====================
  {
    id: 'dic-08',
    mes: 12,
    dia: 8,
    titulo: 'Día de la Inmaculada Concepción',
    categoria: 'religiosa',
    icono: '🕊️',
    descripcion: 'Festividad cristiana y patrona de diversas ciudades venezolanas como Mérida.',
    mensajeKant: 'Aires navideños y bendiciones para todos en este inicio decembrino. 🕊️🎄',
    colorTema: 'blue'
  },
  {
    id: 'dic-10',
    mes: 12,
    dia: 10,
    titulo: 'Día Internacional de los Derechos Humanos',
    categoria: 'juridica',
    icono: '📜',
    descripcion: 'Proclamación de la Declaración Universal de los Derechos Humanos (1948). Eje medular de la labor jurídica.',
    mensajeKant: '«Todos los seres humanos nacen libres e iguales en dignidad y derechos». Principio rector de la justicia. 📜⚖️',
    colorTema: 'blue'
  },
  {
    id: 'dic-11',
    mes: 12,
    dia: 11,
    titulo: 'Día Nacional del Juez en Venezuela',
    categoria: 'juridica',
    icono: '👨‍⚖️',
    descripcion: 'Reconocimiento a los administradores de justicia en los tribunales de la República.',
    mensajeKant: 'Saludo institucional en el Día del Juez: probidad, imparcialidad y apego estricto a la Carta Magna. 👨‍⚖️⚖️',
    colorTema: 'amber'
  },
  {
    id: 'dic-17',
    mes: 12,
    dia: 17,
    titulo: 'Duelo Nacional: Muerte del Libertador Simón Bolívar (1830)',
    categoria: 'patria',
    icono: '🏴',
    descripcion: 'Conmemoración solemne del paso a la inmortalidad del Padre de la Patria en San Pedro Alejandrino, Santa Marta.',
    mensajeKant: 'A las 1:07 p.m. partió el Libertador Simón Bolívar. Recordamos su última proclama: «Si mi muerte contribuye a la unión, yo bajaré tranquilo al sepulcro». 🏴🇻🇪',
    colorTema: 'slate'
  },
  {
    id: 'dic-24',
    mes: 12,
    dia: 24,
    titulo: 'Nochebuena & Víspera de Navidad 🎄',
    categoria: 'festiva',
    icono: '🎄',
    esFeriado: true,
    descripcion: 'Tradición venezolana: hallacas, pan de jamón, ensalada de gallina y unión familiar esperando al Niño Jesús.',
    mensajeKant: '¡Feliz Nochebuena! 🎄 Que no falten las hallacas, el pan de jamón ni el amor en cada mesa. ¡Un abrazo de Kant! 🐾🎁',
    colorTema: 'red'
  },
  {
    id: 'dic-25',
    mes: 12,
    dia: 25,
    titulo: 'Navidad 🎁',
    categoria: 'festiva',
    icono: '🎁',
    esFeriado: true,
    descripcion: 'Feriado Nacional. Nacimiento del Niño Jesús, entrega de regalos y júbilo en los hogares venezolanos.',
    mensajeKant: '¡Feliz Navidad a toda la firma Román & Delgado! Paz, dicha y alegría en sus hogares. 🎁⭐',
    colorTema: 'emerald'
  },
  {
    id: 'dic-31',
    mes: 12,
    dia: 31,
    titulo: 'Fin de Año & Despedida del Año Viejo 🍾',
    categoria: 'festiva',
    icono: '🍾',
    descripcion: 'Tradición de las 12 uvas, lentejas, maletas y el cañonazo celebrando el cierre exitoso del año.',
    mensajeKant: '¡Cañonazo y Feliz Año! 🍾 Gracias por cada logro juntos este año. ¡Vamos por más triunfos en el año venidero!',
    colorTema: 'amber'
  }
];

/**
 * Obtiene la efeméride correspondiente al día especificado (o día de hoy)
 */
export function getEfemerideDelDia(targetDate: Date = new Date()): Efemeride | null {
  const mes = targetDate.getMonth() + 1; // 1-12
  const dia = targetDate.getDate(); // 1-31

  const match = EFEMERIDES_VENEZUELA.find(e => e.mes === mes && e.dia === dia);
  return match || null;
}

/**
 * Obtiene las próximas efemérides en los siguientes N días (por defecto 30 días)
 */
export function getProximasEfemerides(targetDate: Date = new Date(), diasLimite: number = 30): Array<Efemeride & { diasFaltantes: number; fechaStr: string }> {
  const currentMonth = targetDate.getMonth() + 1;
  const currentDay = targetDate.getDate();
  const currentYear = targetDate.getFullYear();

  const results: Array<Efemeride & { diasFaltantes: number; fechaStr: string }> = [];

  for (const e of EFEMERIDES_VENEZUELA) {
    let year = currentYear;
    // Si la fecha ya pasó este año, se calcula para el próximo año
    if (e.mes < currentMonth || (e.mes === currentMonth && e.dia < currentDay)) {
      year += 1;
    }

    const eventDate = new Date(year, e.mes - 1, e.dia);
    const diffTime = eventDate.getTime() - targetDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays >= 0 && diffDays <= diasLimite) {
      const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
      results.push({
        ...e,
        diasFaltantes: diffDays,
        fechaStr: `${e.dia} de ${monthNames[e.mes - 1]}`
      });
    }
  }

  return results.sort((a, b) => a.diasFaltantes - b.diasFaltantes);
}

/**
 * Retorna las efemérides de un mes específico (1-12)
 */
export function getEfemeridesPorMes(mes: number): Efemeride[] {
  return EFEMERIDES_VENEZUELA
    .filter(e => e.mes === mes)
    .sort((a, b) => a.dia - b.dia);
}
