import type { TimeZonesContent } from "@/lib/tools/time-zones";

const es: TimeZonesContent = {
  meta: {
    title: "Planificador de reuniones por zona horaria para equipos remotos",
    description:
      "Añade la ciudad y el horario de cada persona del equipo para ver cuándo trabajan todos a la vez, o la hora que conviene a más gente cuando ninguna conviene a todos. Tiene en cuenta el horario de verano y las medias horas, como en la India.",
  },
  eyebrow: "Herramientas gratis",
  updated: "Actualizado el",
  title: "Cuándo coinciden los horarios <em>de tu equipo.</em>",
  intro:
    "Añade la ciudad y el horario de trabajo de cada persona. El planificador muestra las horas en que todos trabajan a la vez, en la hora de cada uno, y, cuando ninguna hora conviene a todos, la que conviene a más gente. Usa las diferencias horarias de hoy, así que el horario de verano cuenta.",
  planner: {
    zone: "Zona horaria",
    hours: "Horario de trabajo",
    remove: "Quitar",
    add: "Añadir persona",
    addMine: "Añadir mi zona horaria",
    timesIn: "Horas en {city}",
    working: "Trabajando",
    all: "Todos",
    everyone: "Todos trabajan de {from} a {to}, hora de {city}.",
    best: "Ninguna hora conviene a todos. De {from} a {to}, hora de {city}, conviene a {count} de {total}.",
    nobody: "Los horarios de trabajo no coinciden.",
    eachLocal: "En la hora de cada persona:",
  },
  sections: [
    {
      title: "Cuánto solapamiento necesita un equipo",
      body: [
        "Menos de lo que parece. De dos a cuatro horas en común al día bastan para una reunión diaria, para las preguntas que es más rápido hacer que escribir y para una reunión cuando haga falta. Todo lo demás puede ir por escrito, en el horario de cada uno.",
        "Lo que duele es no tener ninguna hora en común, o tenerla solo porque alguien trabaja a las 7 o a las 22 todos los días. Si el planificador muestra un tramo en común solo en el borde del día de alguien, esa persona está pagando las reuniones del equipo.",
      ],
    },
    {
      title: "Cómo encontrar una hora justa",
      items: [
        {
          title: "Reuníos dentro de las horas en común",
          body: "Poned la reunión diaria y las recurrentes en el tramo que muestra el planificador, y dejad el resto de las horas en común libre para preguntas rápidas. El tiempo compartido es lo más escaso que tiene un equipo distribuido.",
        },
        {
          title: "Rotad la hora mala",
          body: "Cuando la única hora posible es temprano para unos y tarde para otros, alternadla semana a semana, para que no sean siempre los mismos quienes se conectan de noche.",
        },
        {
          title: "Menos reuniones, y más cortas",
          body: "Una reunión diaria de 15 minutos cabe en casi cualquier solapamiento; una de una hora, normalmente no. Preguntad si una reunión podría ser una actualización por escrito antes de buscarle hora.",
        },
        {
          title: "Dejad escrito el resultado",
          body: "Quien no pudo ir debería ponerse al día en dos minutos: unas líneas con lo que se decidió y quién hace qué, publicadas donde el equipo ya lee.",
        },
        {
          title: "Muestra tu horario",
          body: "Pon tu horario de trabajo en el calendario y en tu estado, para que nadie tenga que calcular si es buen momento para preguntarte algo.",
        },
      ],
    },
    {
      title: "Cuando no hay horas en común",
      items: [
        { title: "Reuniones diarias por escrito", body: "Cada persona publica qué hizo, qué viene después y qué la bloquea al empezar su día. Los demás lo leen al empezar el suyo." },
        { title: "Dos reuniones más pequeñas", body: "Dividid el equipo por región para las reuniones en directo, con una persona en ambas, o las notas compartidas, para llevar lo importante de un lado a otro." },
        { title: "Traspaso al final del día", body: "Cuando la noche de una persona es la mañana de otra, una nota breve al final del día deja que el trabajo avance mientras la primera duerme." },
        { title: "Una hora en común a la semana", body: "Incluso un equipo sin solapamiento diario puede encontrar una hora a la semana en la que todos se estiren un poco, rotando quién se estira más." },
      ],
    },
    {
      title: "El horario de verano mueve el solapamiento",
      body: [
        "Los relojes cambian en fechas distintas según el lugar, así que las horas en común de un equipo pueden moverse una hora durante unas semanas cada primavera y otoño. Estados Unidos cambia el segundo domingo de marzo y el primero de noviembre; Europa, el último domingo de marzo y de octubre. Australia, Nueva Zelanda y Chile cambian al revés, en su propia primavera. India, China, Japón, Brasil y México no cambian.",
        "El planificador calcula la diferencia horaria de cada ciudad para hoy, así que vuelve a mirarlo cerca de esas fechas si el solapamiento de tu equipo es justo.",
      ],
    },
    {
      title: "Cómo lo calcula",
      body: [
        "Toma el día, en medias horas, en la hora de la primera persona, calcula qué hora es para cada una de las demás con los datos de zonas horarias de tu navegador y cuenta quién está dentro de su horario. Las medias horas importan para la India, que va cinco horas y media por delante del UTC. Los horarios que pasan de medianoche, como de 22:00 a 6:00, también funcionan, y todo se calcula en tu navegador.",
      ],
    },
  ],
  fit: {
    title: "Aprovecha las horas en común",
    body: "TinyFloor es una oficina virtual para equipos pequeños. En las horas que compartís, todos los que están conectados están en la misma planta, y una pregunta es acercarse a la mesa de alguien en lugar de programar una llamada. Es gratis hasta 3 personas y 29 $ al mes para todo el equipo.",
    cta: "Prueba la oficina de demostración",
  },
  faqTitle: "Preguntas <em>frecuentes.</em>",
  faq: [
    {
      q: "¿Cómo encuentro una hora de reunión entre zonas horarias?",
      a: "Apunta la ciudad y el horario de cada persona y busca las medias horas en que todos trabajan a la vez. El planificador de arriba lo hace para hasta 12 personas y muestra el resultado en la hora de cada una.",
    },
    {
      q: "¿Cuántas horas en común necesita un equipo remoto?",
      a: "De dos a cuatro horas al día bastan para la mayoría de los equipos: suficiente para una reunión diaria, preguntas rápidas y alguna reunión de vez en cuando. El resto del trabajo puede hacerse por escrito, en el horario de cada uno.",
    },
    {
      q: "¿Cuál es una hora justa para una reunión entre zonas horarias?",
      a: "Una que esté dentro del horario de todos. Si no la hay, rotad la hora temprana o tardía semana a semana para que no la cojan siempre los mismos.",
    },
    {
      q: "¿Y si mi equipo no tiene ninguna hora en común?",
      a: "Trabajad por escrito: reuniones diarias escritas al empezar el día de cada uno, una nota de traspaso al terminarlo y reuniones en directo divididas por región. La mayoría de los equipos aún pueden encontrar una hora en común a la semana.",
    },
    {
      q: "¿El planificador tiene en cuenta el horario de verano?",
      a: "Sí. Usa la diferencia horaria de cada ciudad para hoy, con los datos de zonas horarias de tu navegador, así que el horario de verano cuenta. Vuelve a mirarlo a finales de marzo y de octubre, cuando los relojes cambian en fechas distintas.",
    },
  ],
};

export default es;
