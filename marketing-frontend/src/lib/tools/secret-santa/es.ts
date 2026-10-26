import type { SantaContent } from "@/lib/tools/secret-santa";

/** The Secret Santa generator in Spanish, written from the English page. */
const es: SantaContent = {
  meta: {
    title: "Amigo invisible online: sorteo gratis sin email ni registro",
    description: "Sortea los nombres para el amigo invisible en segundos y envía a cada persona un enlace privado que muestra a quién le regala. Gratis, sin correos ni cuentas, y pensado para equipos que trabajan en remoto.",
  },
  eyebrow: "Herramienta gratis",
  updated: "Actualizado el",
  title: "Sorteo de <em>amigo invisible.</em>",
  intro: "Escribe los nombres de todos, haz el sorteo y envía a cada persona su propio enlace privado: muestra a quién le regala y nadie más sabrá su resultado. Sin correos, sin cuentas y funciona para un equipo repartido por varios países. Abajo: cómo organizar el amigo invisible online, las reglas e ideas de regalos para compañeros.",
  drawer: {
    names: "Nombres",
    namesHint: "Uno por línea, mínimo tres. Añádete si también participas.",
    budget: "Presupuesto",
    date: "Fecha del intercambio",
    optional: "(opcional)",
    draw: "Sortear nombres",
    redraw: "Volver a sortear",
    redrawNote: "Volver a sortear genera enlaces nuevos. Envía solo los más recientes.",
    tooFew: "Añade al menos tres nombres.",
    duplicate: "Hay dos personas con el mismo nombre. Añade una inicial para que cada una encuentre su propio enlace.",
    linksTitle: "Enlaces privados",
    linksNote: "Envía a cada persona su propio enlace en un mensaje privado. Al abrirlo, verá a quién le regala.",
    copy: "Copiar enlace",
    copied: "Copiado",
    copyAll: "Copiar todos los enlaces",
    allIntro: "Amigo invisible: abre solo el enlace con tu nombre.",
    revealTitle: "Hola {name}, eres el amigo invisible de…",
    show: "Mostrar el nombre",
    lookAway: "Asegúrate de que nadie esté mirando tu pantalla.",
    budgetLabel: "Presupuesto",
    dateLabel: "Intercambio",
    keepSecret: "Mantenlo en secreto hasta el intercambio.",
    own: "Sortea los nombres de tu propio grupo",
  },
  sections: [
    {
      title: "Cómo hacer el amigo invisible online",
      items: [
        {
          title: "Reúne los nombres",
          body: "Pregunta quién quiere participar. En el trabajo, debería ser opcional: un amigo invisible obligatorio no es divertido para nadie.",
        },
        {
          title: "Define un presupuesto y una fecha",
          body: "Una cifra clara y de antemano, para que nadie gaste el triple que la persona que le regala. La fecha es el día en que se abren los regalos.",
        },
        { title: "Sortea los nombres", body: "Escribe los nombres arriba y haz el sorteo. A todo el mundo le tocará alguien y nadie se regalará a sí mismo." },
        {
          title: "Envía los enlaces",
          body: "Envía a cada persona su propio enlace por mensaje directo o correo. Quien organice también puede participar: verás los enlaces, pero no quién le ha tocado a quién.",
        },
        {
          title: "Abrid los regalos juntos",
          body: "En una videollamada o en la fiesta, de uno en uno, y que todos intenten adivinar quién era su amigo invisible.",
        },
      ],
    },
    {
      title: "Amigo invisible en un equipo remoto",
      body: [
        "Cuando el equipo trabaja desde distintas ciudades o países, los regalos tienen que viajar. La opción más sencilla son los regalos digitales: una tarjeta regalo, un libro electrónico, un mes de un servicio de streaming o una donación en nombre de esa persona. Si preferís enviar algo físico, quien organice puede recopilar las direcciones de forma privada y pasarle a cada participante solo la que necesite, o bien cada uno puede comprar en una tienda que haga envíos al país correspondiente.",
        "Abrid los regalos juntos en una llamada, a ser posible como parte de una fiesta de fin de año. Nuestras [ideas para fiestas virtuales](/guides/virtual-holiday-party-ideas) incluyen un programa y juegos para acompañar la ocasión.",
      ],
    },
    {
      title: "Reglas del amigo invisible",
      items: [
        {
          title: "Respeta el presupuesto",
          body: "Gastar menos está bien, pero pasarse es incómodo. El presupuesto es lo importante: un regalo pequeño, elegido con cariño.",
        },
        { title: "Mantén el secreto", body: "No le digas a nadie quién te ha tocado hasta que se abran los regalos, ni preguntes a los demás a quién tienen." },
        { title: "Que sea apto para el trabajo", body: "Nada personal ni que pueda avergonzar a alguien delante de sus compañeros." },
        {
          title: "Comparte un deseo",
          body: "Si cada uno pone un deseo corto en el chat del equipo, como «Me encantaría un buen libro», nadie tendrá que adivinar.",
        },
        { title: "Haz que sea opcional", body: "Hay personas que no lo celebran o que no quieren participar. Aun así, son bienvenidas a la fiesta." },
      ],
    },
    {
      title: "Ideas de regalos de amigo invisible para compañeros de trabajo",
      body: [
        "Ideas fáciles de enviar y que se adaptan a casi cualquier presupuesto:",
      ],
      items: [
        { title: "Café o té", detail: "Menos de 20 €", body: "Un paquete de café de un buen tostador local o una selección de tés." },
        { title: "Un libro", detail: "Menos de 20 €", body: "Algo que te haya gustado mucho este año, con una nota que explique por qué." },
        { title: "Una planta de escritorio", detail: "Menos de 25 €", body: "Pequeña, difícil de matar y agradable a la vista durante las videollamadas." },
        {
          title: "Una tarjeta regalo",
          detail: "Cualquier presupuesto",
          body: "Para una librería, una cadena de cafeterías o comida a domicilio de donde viva.",
        },
        { title: "Un cuaderno bonito", detail: "Menos de 20 €", body: "Útil para cualquiera que todavía escriba a mano." },
        {
          title: "Un mes de suscripción a algo",
          detail: "Menos de 15 €",
          body: "Una suscripción de música, audiolibros o streaming, enviada como código de regalo.",
        },
        { title: "Un puzle o un juego", detail: "Menos de 25 €", body: "Algo para las tardes o para toda la familia." },
        {
          title: "Algo de tu ciudad",
          detail: "Menos de 20 €",
          body: "Dulces locales o algún detalle que solo se haga en tu zona. A los equipos remotos les encantan estas cosas.",
        },
      ],
    },
  ],
  fit: {
    title: "Abrir los regalos juntos",
    body: "TinyFloor es una oficina virtual para equipos pequeños. Abrid los regalos en la sala de reuniones con vídeo y pantalla compartida, y luego quedaos a hablar en vuestros escritorios, como haríais en una fiesta real. Es gratis para hasta 3 personas y 29 US$ al mes para todo el equipo.",
    cta: "Probar la oficina de demostración",
  },
  faqTitle: "Preguntas <em>frecuentes.</em>",
  faq: [
    {
      q: "¿Cómo funciona este generador de amigo invisible?",
      a: "Escribe los nombres, haz el sorteo y envía a cada persona el enlace con su nombre. Al abrirlo verán a quién tienen que regalar, con el presupuesto y la fecha si los has puesto.",
    },
    {
      q: "¿Se necesita correo electrónico o una cuenta?",
      a: "No. No hay que registrarse y no se envía nada por correo: tú mismo envías los enlaces por chat, correo o mensaje de texto.",
    },
    {
      q: "¿Puede participar el organizador?",
      a: "Sí. El organizador ve los enlaces, pero no quién le ha tocado a quién, así que añade tu propio nombre y abre solo tu enlace.",
    },
    { q: "¿Le puede tocar a alguien su propio nombre?", a: "No. A cada persona le toca otra distinta, y cada persona tiene exactamente un amigo invisible." },
    {
      q: "¿Cómo se organiza el amigo invisible en un equipo remoto?",
      a: "Haz el sorteo online, envía a cada uno su enlace privado, acuerda un presupuesto y elige regalos digitales o recopila las direcciones de forma privada. Después, abrid los regalos juntos en una videollamada.",
    },
    {
      q: "¿Cuál es un buen presupuesto para el amigo invisible en el trabajo?",
      a: "Algo que todo el mundo pueda permitirse sin pensarlo, a menudo entre 15 y 30 €. Indica una cifra fija en la invitación para que los regalos sean parecidos.",
    },
    {
      q: "¿Es gratis este generador de amigo invisible?",
      a: "Sí, sin límite de personas. Funciona en el navegador y los nombres solo viajan en los enlaces que envías.",
    },
  ],
};

export default es;
