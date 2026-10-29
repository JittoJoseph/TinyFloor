import type { StandupContent } from "@/lib/tools/standup";

/** La plantilla de daily (reunión diaria), en español. */
const es: StandupContent = {
  meta: {
    title: "Plantilla de Daily (Reunión Diaria): Agenda y Versión Asíncrona Gratis",
    description:
      "Arma la agenda de la daily con el tiempo justo para tu equipo, o una plantilla de daily asíncrona para publicar en Slack o Teams. Gratis, con tres juegos de preguntas y una guía.",
  },
  eyebrow: "Herramienta gratis",
  updated: "Actualizado el",
  title: "Plantilla de <em>daily.</em>",
  intro:
    "Una buena daily dura más o menos un minuto por persona y termina con todos sabiendo qué está pasando y quién está atascado. Elige el tamaño del equipo y cómo os reunís, en una llamada, por escrito o recorriendo el tablero, y obtén una agenda con el tiempo justo, o una plantilla para publicar en el chat del equipo.",
  builder: {
    team: "Tamaño del equipo",
    people: "{count} personas",
    format: "Cómo os reunís",
    formats: { live: "En una llamada", async: "Por escrito (asíncrona)", board: "Recorriendo el tablero" },
    questions: "Preguntas",
    sets: [
      { key: "classic", label: "Clásicas", questions: ["¿Qué hiciste ayer?", "¿Qué vas a hacer hoy?", "¿Hay algo que te bloquee?"] },
      { key: "focus", label: "Foco", questions: ["¿Cuál es tu prioridad de hoy?", "¿Qué podría impedirla?", "¿A quién necesitas pedir ayuda?"] },
      { key: "progress", label: "Avance", questions: ["¿Qué avanzó?", "¿Qué sigue?", "¿Algún riesgo que debamos conocer?"] },
    ],
    icebreaker: "Empezar con un rompehielos de un minuto",
    minutes: "{count} minutos",
    agenda: "Agenda",
    template: "Plantilla para publicar",
    copy: "Copiar",
    copied: "Copiado",
    lines: {
      open: "Apertura: empieza a la hora, aunque alguien llegue tarde",
      icebreaker: "Rompehielos: una pregunta rápida, una frase cada uno",
      round: "Ronda: cada persona responde, un minuto cada una, más o menos",
      column: "{column}: qué está atascado, qué sigue",
      blockers: "Bloqueos: acordad quién ayudará y hablad después",
      close: "Cierre: algo que todos deban saber",
    },
    columns: ["Bloqueado", "En revisión", "En curso", "Siguiente"],
    note: {
      live: "Más o menos un minuto por persona, algo menos en un equipo grande, más un minuto para abrir y cerrar. Quince minutos como mucho: si pasa de ahí, es una reunión, no una daily.",
      async: "Pide que todos publiquen a la misma hora cada mañana, en su propia zona horaria, que lean las actualizaciones de los demás y respondan en un hilo a cualquier bloqueo.",
      board: "Recorre el tablero de derecha a izquierda: primero lo más cerca de terminar, para que el equipo acabe cosas antes de empezar otras. Cinco minutos más uno por persona, aproximadamente.",
    },
  },
  sections: [
    {
      title: "Para qué sirve la daily",
      body: [
        "La daily (o reunión diaria, también llamada stand-up) es una reunión corta, normalmente al empezar el día, en la que cada persona del equipo dice en qué está trabajando y si algo se lo impide. Viene de los equipos ágiles de software, donde se llama daily scrum, pero funciona para cualquier equipo pequeño en el que el trabajo de uno depende del de otro.",
        "No es un informe para el jefe. La idea es que el equipo vea el día en conjunto: quién hace qué, dónde se cruzan dos trabajos y quién necesita ayuda. Si la daily desbloqueó a alguien, mereció la pena; si fue una ronda de recitales que nadie escucha, no.",
      ],
    },
    {
      title: "Tres formas de hacerla",
      items: [
        {
          title: "En una llamada",
          detail: "La clásica",
          body: "Todos se conectan a la misma hora y cada uno responde a las mismas tres preguntas. Ideal para equipos en zonas horarias cercanas a los que les gusta verse una vez al día. Mantenla en un minuto por persona, más o menos.",
        },
        {
          title: "Por escrito",
          detail: "Daily asíncrona",
          body: "Cada persona publica sus respuestas en el chat del equipo antes de una hora fijada y lee las de los demás. Ideal para equipos en distintas zonas horarias, o con demasiadas reuniones. Se pierde la conversación, así que acostumbraos a responder a cualquier bloqueo.",
        },
        {
          title: "Recorriendo el tablero",
          detail: "Primero el trabajo, luego las personas",
          body: "En lugar de hacer la ronda por personas, recorre el tablero de tareas columna por columna, empezando por lo más cerca de terminar. Ideal para equipos con un tablero con mucho movimiento, donde la pregunta es qué está atascado, no qué hizo cada uno.",
        },
      ],
    },
    {
      title: "Las tres preguntas de la daily",
      body: [
        "Las tres clásicas son qué hiciste ayer, qué vas a hacer hoy y si algo te bloquea. Funcionan, pero invitan a una lista de todo lo que la persona tocó. Si tus dailies se alargan, prueba un juego más directo:",
      ],
      items: [
        {
          title: "Clásicas",
          body: "¿Qué hiciste ayer? ¿Qué vas a hacer hoy? ¿Hay algo que te bloquee? Todo el mundo las conoce, y van bien para un equipo nuevo.",
        },
        {
          title: "Foco",
          body: "¿Cuál es tu prioridad de hoy? ¿Qué podría impedirla? ¿A quién necesitas pedir ayuda? Respuestas más cortas, y la última pregunta convierte los bloqueos en peticiones.",
        },
        {
          title: "Avance",
          body: "¿Qué avanzó? ¿Qué sigue? ¿Algún riesgo? Sobre el trabajo, no sobre la persona, y encajan con recorrer el tablero.",
        },
      ],
    },
    {
      title: "Agenda de la daily, minuto a minuto",
      body: [
        "Para un equipo de seis en una llamada, la daily dura unos ocho minutos. Empieza a la hora, aunque alguien llegue tarde: esperar enseña a todos a llegar tarde. Luego haz la ronda en un orden fijo, el de la pantalla o el alfabético, para que nadie se pregunte cuándo le toca.",
        "Cuando alguien mencione un problema, no lo resuelvas en la daily. Apunta quién puede ayudar y quedad en hablar justo después, solo con quien tenga que estar. Ese hábito es lo que mantiene la daily en diez minutos. Cierra preguntando si hay algo que todos deban saber y termina la llamada.",
      ],
      table: {
        head: ["Tamaño del equipo", "En una llamada", "Recorriendo el tablero"],
        rows: [
          ["3 personas", "5 minutos", "8 minutos"],
          ["6 personas", "8 minutos", "11 minutos"],
          ["8 personas", "10 minutos", "13 minutos"],
          ["12 personas", "11 minutos", "15 minutos"],
          ["15 personas", "14 minutos", "15 minutos"],
        ],
        note: "Calculado como lo hace la herramienta de arriba: más o menos un minuto por persona (tres cuartos de minuto a partir de ocho personas) más dos para abrir y cerrar, y nunca más de quince.",
      },
    },
    {
      title: "Cómo hacer una daily asíncrona",
      body: [
        "Una daily asíncrona son las mismas tres preguntas, respondidas por escrito. Elige un canal y una hora, por ejemplo las 10 en la zona horaria de cada uno, y pide que todos publiquen sus respuestas en un solo mensaje, usando la plantilla de arriba para que sea fácil de leer.",
        "Dos cosas hacen que funcione. Primero, leer las actualizaciones de los demás; una daily asíncrona que nadie lee es un diario. Segundo, responder en un hilo a cualquier bloqueo, el mismo día. Algunos equipos mantienen además una llamada corta a la semana, para seguir viéndose.",
      ],
    },
    {
      title: "Errores comunes en la daily",
      items: [
        { title: "Se convierte en resolver problemas", body: "Alguien plantea un problema y tres personas se ponen a arreglarlo. Apúntalo, acordad quién habla después y seguid." },
        { title: "Es un informe para el jefe", body: "Si todos miran al líder mientras hablan, la daily es para la persona equivocada. Habla al equipo." },
        { title: "Demasiada gente", body: "A partir de unas doce personas, nadie escucha a todos. Divide en dailies más pequeñas por proyecto o línea de trabajo." },
        { title: "Empezar tarde", body: "Esperar cinco minutos a la última persona cuesta cinco minutos a todos los demás, cada día. Empieza a la hora." },
        { title: "Decir \"sin bloqueos\" todos los días", body: "Si nunca nadie está atascado, haz una pregunta más directa: \"¿Qué podría impedir tu prioridad de hoy?\" suele encontrar algo." },
      ],
    },
  ],
  fit: {
    title: "Haz la daily en la oficina",
    body: "TinyFloor es una oficina virtual para equipos remotos: ves quién está en su mesa, y la daily es un paseo hasta la sala de reuniones en vez de otro enlace. Después, acércate a quien esté atascado. Funciona en una pestaña del navegador, gratis para hasta 3 personas y 29 US$ al mes para todo el equipo.",
    cta: "Probar la oficina de demostración",
  },
  faqTitle: "Preguntas <em>frecuentes.</em>",
  faq: [
    {
      q: "¿Cuáles son las tres preguntas de la daily?",
      a: "¿Qué hiciste ayer? ¿Qué vas a hacer hoy? ¿Hay algo que te bloquee? Una versión más directa: ¿Cuál es tu prioridad de hoy? ¿Qué podría impedirla? ¿A quién necesitas pedir ayuda?",
    },
    {
      q: "¿Cuánto debe durar una daily?",
      a: "Más o menos un minuto por persona, más uno o dos para abrir y cerrar: unos ocho minutos para un equipo de seis. Quince como mucho.",
    },
    {
      q: "¿Qué es una plantilla de daily?",
      a: "Una agenda fija para la reunión, o un formato de mensaje para la daily por escrito: las mismas tres preguntas, en el mismo orden, cada día, para que las actualizaciones sean rápidas de dar y fáciles de leer.",
    },
    {
      q: "¿Qué es una daily asíncrona?",
      a: "Una daily hecha por escrito: cada persona publica sus respuestas a las tres preguntas en el chat del equipo antes de una hora fijada y lee las de los demás. Va bien para equipos en distintas zonas horarias.",
    },
    {
      q: "¿La daily es solo para equipos scrum?",
      a: "No. Viene de los equipos ágiles de software, donde se llama daily scrum, pero cualquier equipo pequeño en el que el trabajo de uno depende del de otro puede usarla.",
    },
    {
      q: "¿Esta herramienta de daily es gratis?",
      a: "Sí, y funciona entera en tu navegador: nada de lo que eliges se envía a ningún sitio. Copia la agenda o la plantilla en la invitación del calendario o en el chat del equipo.",
    },
  ],
};

export default es;
