import type { IcebreakersContent } from "@/lib/tools/icebreakers";

/** Ideas de "dos verdades y una mentira", en español. */
const es: IcebreakersContent = {
  groups: [
    {
      key: "skills",
      label: "Habilidades",
      title: "Ideas de dos verdades y una mentira sobre habilidades",
      when: "Cosas que sabes o no sabes hacer. Fáciles de inventar y difíciles de adivinar, porque cualquiera puede haber aprendido cualquier cosa.",
      questions: [
        "Sé resolver un cubo de Rubik.",
        "Escribo sin mirar el teclado más rápido de lo que mucha gente habla.",
        "Sé hacer malabares con tres pelotas.",
        "Sé silbar con los dedos.",
        "Aprendí a tocar un instrumento yo solo, con vídeos de internet.",
        "Me sé todas las capitales de Europa.",
        "Nunca aprendí a montar en bicicleta.",
        "Dibujo un retrato decente en cinco minutos.",
        "Sé decir \"hola\" en más de diez idiomas.",
        "Sé cocinar un plato perfecto y nada más.",
        "Sé hacer el pino.",
        "Una vez gané un concurso de deletreo.",
        "Me sé de memoria la primera página de un libro.",
        "No sé nadar.",
        "Puedo tocarme la nariz con la lengua.",
        "Sé hacer punto.",
        "Sé leer partituras, pero no toco nada.",
        "Me duermo en cualquier sitio en menos de un minuto.",
      ],
    },
    {
      key: "experiences",
      label: "Experiencias",
      title: "Ideas de dos verdades y una mentira sobre cosas que has hecho",
      when: "Pequeñas historias que suenan improbables. Las mejores son verdad y el equipo está seguro de que son la mentira.",
      questions: [
        "He salido en televisión en directo.",
        "Una vez me perdí en una ciudad durante un día entero.",
        "He corrido una media maratón.",
        "Conocí a una persona famosa y no la reconocí hasta después.",
        "He ido a un concierto solo.",
        "Una vez dormí en un aeropuerto.",
        "He visto la aurora boreal.",
        "Hice una obra de teatro en el colegio y olvidé todo mi texto.",
        "He subido una montaña de más de 3.000 metros.",
        "Una vez gané un premio en una rifa que ni recordaba haber comprado.",
        "He montado en camello.",
        "Me he quedado atrapado en un ascensor más de una hora.",
        "Una vez comí algo tan picante que tuve que levantarme de la mesa.",
        "He montado un mueble sin instrucciones, y aguantó.",
        "He ido a una boda donde no conocía a nadie.",
        "Una vez pasé un año entero sin comprar ropa nueva.",
        "He actuado en un escenario delante de más de cien personas.",
        "He estado despierto más de 24 horas seguidas.",
      ],
    },
    {
      key: "work",
      label: "Trabajo",
      title: "Ideas de dos verdades y una mentira sobre el trabajo",
      when: "Sobre trabajos que has tenido y cómo trabajas. Buenas para un equipo nuevo, porque todos descubren un poco de la trayectoria de los demás.",
      questions: [
        "Mi primer trabajo fue en un restaurante.",
        "Una vez respondí a toda la empresa sin querer.",
        "He trabajado en tres países distintos.",
        "Tuve un trabajo en el que tenía que llevar disfraz.",
        "Nunca he conseguido un trabajo por una oferta de empleo.",
        "Una vez me dormí en una reunión.",
        "He cambiado de carrera por completo al menos una vez.",
        "Mi primer ordenador es más viejo que algunas personas de esta llamada.",
        "Una vez hice una entrevista de trabajo dentro de un coche.",
        "He trabajado en turno de noche.",
        "Estudié algo que no tiene nada que ver con mi trabajo.",
        "He hecho una presentación sin diapositivas porque se me murió el portátil.",
        "He trabajado en una empresa de más de 10.000 personas.",
        "Una vez envié un correo a la persona equivocada y salió bien.",
        "He trabajado desde más de diez ciudades distintas.",
        "Guardo todas las libretas que he usado en el trabajo.",
      ],
    },
    {
      key: "habits",
      label: "Comida y hábitos",
      title: "Ideas de dos verdades y una mentira sobre comida y hábitos",
      when: "Cosas del día a día. Sin ningún riesgo y sorprendentemente difíciles de adivinar, lo que hace la ronda rápida.",
      questions: [
        "Nunca me he tomado una taza de café.",
        "Desayuno lo mismo todos los días.",
        "No me gusta el chocolate.",
        "Le pongo sal a la fruta.",
        "Me despierto antes de las 6 sin despertador.",
        "No he visto ninguna película de una saga famosa.",
        "Llevo el móvil en silencio todo el tiempo.",
        "He comido insectos a propósito.",
        "No soporto el ruido de mascar chicle.",
        "Leo primero la última página de un libro.",
        "Tengo más de 50 plantas.",
        "Nunca me he roto un hueso.",
        "Les pongo nombre a mis plantas.",
        "He visto la misma serie de principio a fin más de cinco veces.",
        "Duermo con calcetines.",
        "Nunca me he subido a una montaña rusa.",
      ],
    },
  ],
  meta: {
    title: "Dos Verdades y una Mentira: 68 Ideas para el Trabajo y Equipos Remotos",
    description:
      "68 ideas de dos verdades y una mentira para el trabajo, sobre habilidades, experiencias, empleos y hábitos, y cómo jugar en una videollamada o en el chat. Saca una al azar.",
  },
  eyebrow: "Herramienta gratis",
  updated: "Actualizado el",
  title: "Dos verdades y una mentira: <em>ideas para el trabajo.</em>",
  intro:
    "Dos verdades y una mentira es el juego de equipo más fácil que existe: cada persona dice tres cosas sobre sí misma y los demás adivinan cuál es inventada. Lo difícil es pensar en buenas frases en el momento. Aquí tienes 68 ideas para tomar prestadas, adaptar o convertir en tu mentira, y cómo jugar con un equipo remoto.",
  picker: { all: "Todas", another: "Otra idea", copy: "Copiar", copied: "Copiada", of: "de" },
  howTo: [
    {
      title: "Cómo jugar a dos verdades y una mentira en el trabajo",
      items: [
        {
          title: "Da a todos un minuto para prepararse",
          detail: "O pídelo antes",
          body: "Pensar tres frases en el momento cuesta. Pide que cada uno escriba las suyas antes de la reunión, o da un minuto y señala las ideas de esta página.",
        },
        {
          title: "Di las tres, en cualquier orden",
          detail: "Sin que se te note",
          body: "Cada persona dice sus tres frases. La mentira no tiene que ser siempre la última, y las verdades funcionan mejor cuando suenan improbables.",
        },
        {
          title: "Todos adivinan a la vez",
          detail: "Luego se revela",
          body: "En una videollamada, pide que todos escriban 1, 2 o 3 en el chat en el mismo momento, para que nadie siga a la primera respuesta. Luego la persona revela la mentira y cuenta la historia de una de las verdades.",
        },
        {
          title: "Lleva la puntuación, o no",
          detail: "Cinco personas en unos diez minutos",
          body: "Un punto por cada acierto, y un punto para quien habló por cada persona a la que engañó. Con un equipo más grande, haz unas pocas personas por reunión en lugar de todas a la vez.",
        },
      ],
    },
    {
      title: "Jugar con un equipo remoto",
      body: [
        "En una llamada, el chat ayuda mucho: las respuestas simultáneas hacen el juego justo y rápido. Pide que cada uno ponga sus tres frases en el chat como lista numerada, así nadie tiene que memorizarlas mientras escucha.",
        "Para un equipo en distintas zonas horarias, juega en el chat del equipo durante un día o una semana. Cada persona publica sus tres frases en un mensaje con tres reacciones, una por frase; cada uno vota cuando se conecta y la revelación llega a la mañana siguiente. Es una buena forma de dar la bienvenida a alguien nuevo: sus dos verdades y una mentira el primer día cuentan al equipo más que una presentación.",
      ],
    },
  ],
  rules: [
    {
      title: "Qué hace buenas las frases de dos verdades y una mentira",
      items: [
        {
          title: "Las verdades suenan inventadas",
          body: "\"He salido en televisión en directo\" es una gran verdad porque nadie se la cree. \"Me gusta la pizza\" delata el juego.",
        },
        {
          title: "La mentira suena verdad",
          body: "Elige algo que podrías haber hecho, del mismo tipo de vida que tus verdades. Una mentira demasiado exagerada es fácil de pillar.",
        },
        {
          title: "Nada personal",
          body: "Quédate en habilidades, experiencias, trabajo y hábitos. La familia, la salud, las relaciones y el dinero no pintan nada en un juego del trabajo, ni como mentira.",
        },
        {
          title: "Cortas para recordarlas",
          body: "Una frase cada una. La historia puede venir después de la revelación, para quien quiera oírla.",
        },
      ],
    },
    {
      title: "Cómo elegimos estas",
      body: [
        "Escribimos estas ideas para equipos de trabajo y las agrupamos por tema: habilidades, cosas que has hecho, trabajo, y comida y hábitos. Cada idea puede ser verdad para alguien, ninguna pide compartir nada personal y ninguna da por hecho mucho dinero o viajes. Úsalas tal cual, cambia un detalle para que una sea verdad para ti, o guarda una como tu mentira.",
      ],
    },
  ],
  fit: {
    title: "Juega en la oficina",
    body: "TinyFloor es una oficina virtual para equipos pequeños: ves quién está en su mesa, te acercas para hablar y os reunís en la sala de reuniones para la daily, un juego, o las dos cosas. Funciona en una pestaña del navegador, gratis para hasta 3 personas y 29 US$ al mes para todo el equipo.",
    cta: "Probar la oficina de demostración",
  },
  faqTitle: "Preguntas <em>frecuentes.</em>",
  faq: [
    {
      q: "¿Cuáles son buenas ideas de dos verdades y una mentira para el trabajo?",
      a: "Frases sobre habilidades, experiencias, empleos y hábitos, en las que las verdades suenan sorprendentes y la mentira suena creíble: \"He salido en televisión en directo\", \"Mi primer trabajo fue en un restaurante\", \"Sé resolver un cubo de Rubik\".",
    },
    {
      q: "¿Cómo se juega a dos verdades y una mentira?",
      a: "Cada persona dice tres frases sobre sí misma, dos verdaderas y una falsa. Los demás adivinan cuál es la mentira y luego quien habló la revela.",
    },
    {
      q: "¿Cómo se juega a dos verdades y una mentira en Zoom, Meet o Teams?",
      a: "Pide que cada persona publique sus tres frases en el chat como lista numerada, que todos escriban su respuesta en el mismo momento y luego se revela. Cinco personas llevan unos diez minutos.",
    },
    {
      q: "¿Qué conviene evitar en dos verdades y una mentira en el trabajo?",
      a: "Cualquier cosa sobre familia, relaciones, salud o dinero, y lo que alguien quizá no quiera contar. Quédate en habilidades, experiencias, trabajo y hábitos del día a día.",
    },
    {
      q: "¿Cuánto dura dos verdades y una mentira?",
      a: "Unos dos minutos por persona, así que diez minutos para cinco personas. Con un equipo más grande, haz unas pocas personas en cada reunión, o juega en el chat del equipo durante una semana.",
    },
  ],
};

export default es;
