import type { OooContent } from "@/lib/tools/out-of-office";

/** El generador de mensajes de fuera de la oficina, en español. */
const es: OooContent = {
  meta: {
    title: "Generador de Mensaje de Fuera de la Oficina: Ejemplos y Plantillas",
    description:
      "Escribe un mensaje de fuera de la oficina en segundos: respuesta automática de correo y estado para Slack o Teams, para vacaciones, bajas, viajes de trabajo y más. Ejemplos y cómo activarlo en Outlook y Gmail.",
  },
  eyebrow: "Herramienta gratis",
  updated: "Actualizado el",
  title: "Generador de mensaje <em>de fuera de la oficina.</em>",
  intro:
    "Di por qué no estás, cuándo vuelves y quién puede ayudar mientras tanto, y obtén una respuesta automática de correo y un estado corto para el chat del equipo, listos para pegar. Debajo: ejemplos de mensajes para cada situación y cómo activarlo en Outlook, Gmail, Slack y Teams.",
  writer: {
    reason: "Por qué no estás",
    reasons: { vacation: "Vacaciones", sick: "Baja por enfermedad", travel: "Viaje de trabajo", parental: "Baja por maternidad/paternidad", holiday: "Día festivo" },
    back: "Vuelves el",
    unknown: "Déjalo vacío si aún no lo sabes.",
    name: "Tu nombre",
    contact: "A quién contactar en tu lugar",
    email: "Su correo",
    optional: "(opcional)",
    tone: "Tono",
    tones: { professional: "Profesional", friendly: "Cercano", short: "Corto" },
    emailTitle: "Respuesta automática de correo",
    statusTitle: "Estado para Slack, Teams o TinyFloor",
    statusNote: "Hasta 100 caracteres, para que quepa en el estado de Slack.",
    copy: "Copiar",
    copied: "Copiado",
  },
  sections: [
    {
      title: "Ejemplos de mensajes de fuera de la oficina",
      body: [
        "Todo buen mensaje de fuera de la oficina dice tres cosas: que no estás, cuándo vuelves y a quién contactar si no puede esperar. Así queda en las situaciones más comunes; el generador de arriba escribe lo mismo con tus fechas y nombres.",
      ],
      items: [
        {
          title: "Vacaciones",
          detail: "Fuera unos días",
          body: "\"Gracias por tu correo. Estoy de vacaciones y fuera de la oficina hasta el lunes, 2 de noviembre. Responderé a tu mensaje a mi regreso. Para cualquier asunto urgente, contacta con Ana Lima (ana@ejemplo.com).\"",
        },
        {
          title: "Baja por enfermedad",
          detail: "Corto y discreto",
          body: "\"Gracias por tu correo. Hoy estoy fuera de la oficina y responderé en cuanto vuelva. Para cualquier asunto urgente, contacta con Ana Lima.\" Decir que estás enfermo es opcional; nunca le debes los detalles a nadie.",
        },
        {
          title: "Viaje de trabajo o congreso",
          detail: "Más lento, no ausente",
          body: "\"¡Gracias por tu mensaje! Estoy de viaje de trabajo hasta el jueves, 5 de noviembre, y miro el correo menos de lo habitual. Te respondo cuando vuelva. Si no puede esperar, Ana Lima te puede ayudar.\"",
        },
        {
          title: "Baja por maternidad o paternidad",
          detail: "Ausencia larga",
          body: "\"Gracias por tu correo. Estoy de baja hasta el 2 de febrero y no voy a mirar el correo. Para cualquier tema de mis proyectos, contacta con Ana Lima (ana@ejemplo.com), que me sustituye.\" En una ausencia larga, indica una persona, no solo una fecha.",
        },
        {
          title: "Día festivo",
          detail: "Para todo el equipo",
          body: "\"Gracias por tu correo. Nuestra oficina está cerrada por el día festivo hasta el martes, 3 de noviembre. Responderemos a tu mensaje a nuestro regreso.\"",
        },
        {
          title: "El corto",
          detail: "Para compañeros",
          body: "\"Estoy de vacaciones hasta el 3 de noviembre. ¿Urgente? Contacta con Ana Lima.\" Dentro de tu propia empresa, cuanto más corto, mejor.",
        },
        {
          title: "Navidad y Año Nuevo",
          detail: "Vacaciones de fin de año",
          body: "\"Gracias por tu correo. Estoy fuera de la oficina por vacaciones y vuelvo el lunes, 4 de enero. Responderé a tu mensaje a mi regreso. Para cualquier asunto urgente, contacta con Ana Lima (ana@ejemplo.com). Te deseo un feliz año nuevo.\"",
        },
        {
          title: "Medio día",
          detail: "De vuelta el mismo día",
          body: "\"Gracias por tu correo. Esta tarde estoy fuera de la oficina y responderé mañana por la mañana.\" Para ausencias de unas pocas horas, a menudo basta con poner un estado en el chat.",
        },
        {
          title: "Para clientes",
          detail: "Fuera de tu empresa",
          body: "\"Gracias por ponerte en contacto con nosotros. Estoy fuera de la oficina hasta el lunes, 2 de noviembre. Para pedidos y soporte técnico, escribe a soporte@ejemplo.com, donde el equipo te responderá en un plazo de un día laborable.\" Outlook puede enviar este mensaje solo a personas de fuera de tu organización.",
        },
        {
          title: "Último día en la empresa",
          detail: "Salida definitiva",
          body: "\"Gracias por tu correo. Ya no trabajo en Ejemplo S.L. Para cualquier asunto en el que estuviera trabajando, contacta con Ana Lima (ana@ejemplo.com), que se hace cargo de mis tareas.\" Las empresas suelen mantener una respuesta como esta en la dirección de la persona que se va durante unos meses.",
        },
      ],
    },
    {
      title: "Cómo poner un mensaje de fuera de la oficina en Outlook",
      body: [
        "En el nuevo Outlook y en Outlook en la web, abre Configuración (el icono del engranaje), ve a Cuentas y luego a Respuestas automáticas. Activa las respuestas automáticas, marca la opción de enviarlas solo durante un período, pon las fechas de inicio y fin y pega tu mensaje. Puedes escribir un mensaje distinto para quien está fuera de tu organización, y conviene hacerlo: los compañeros necesitan menos explicación que los clientes.",
        "En Outlook clásico para Windows, ve a Archivo y luego a Respuestas automáticas, y rellena los mismos datos. Si pones una fecha de fin, Outlook desactiva las respuestas solo, así que no tienes que acordarte de volver.",
        "En Outlook para Mac, ve a Herramientas y luego a Respuestas automáticas. En la aplicación de Outlook para iPhone o Android, toca tu foto de perfil, luego el engranaje de Configuración, elige tu cuenta de trabajo y toca Respuestas automáticas. Uses la que uses, la respuesta se guarda en tu cuenta, por lo que activarla en un sitio la activa en todas partes.",
      ],
    },
    {
      title: "Cómo poner una respuesta automática en Gmail",
      body: [
        "En Gmail, haz clic en el icono del engranaje y luego en Ver todos los ajustes. En la pestaña General, baja hasta Respuesta automática, actívala, pon el primer y el último día, un asunto como \"Fuera de la oficina hasta el 3 de noviembre\", pega el mensaje y haz clic en Guardar cambios, al final de la página.",
        "Gmail envía la respuesta automática una vez a cada persona en un período de cuatro días, no con cada mensaje, así que quien escriba dos veces no la recibe dos veces. También puedes enviarla solo a tus contactos o, en una cuenta de trabajo, solo a gente de tu organización.",
      ],
    },
    {
      title: "Fuera de la oficina en Slack y Microsoft Teams",
      body: [
        "El chat del equipo no envía respuestas automáticas, así que un estado hace ese papel: aparece junto a tu nombre cada vez que alguien intenta escribirte. En Slack, haz clic en tu foto, elige Actualiza tu estado, pon un emoji y una línea corta como \"🌴 De vacaciones hasta el 3 nov\" y haz que se borre cuando vuelvas. Pausar las notificaciones en las mismas fechas deja también el móvil en silencio.",
        "En Microsoft Teams, haz clic en tu foto y elige Establecer mensaje de estado. Escribe el mensaje y elige cuándo debe borrarse. En la misma ventana hay un enlace para programar la ausencia, que activa a la vez la respuesta automática de Outlook y el estado de Teams. El estado del generador de arriba es lo bastante corto para los dos.",
      ],
    },
    {
      title: "Qué incluye un buen mensaje de fuera de la oficina",
      items: [
        { title: "Cuándo vuelves", body: "Una fecha, no \"la semana que viene\". Si aún no lo sabes, di que responderás en cuanto vuelvas." },
        { title: "Quién puede ayudar", body: "Un nombre, y un correo si es alguien ajeno a la conversación. Avísale antes; a nadie le gusta enterarse por un cliente de que te sustituye." },
        { title: "Sin demasiados detalles", body: "\"Fuera de la oficina\" basta. Dónde estás y por qué no le importan a nadie, y el destino de tus vacaciones en una respuesta automática avisa a desconocidos de que tu casa está vacía." },
        { title: "Sin promesas que no vas a cumplir", body: "\"Responderé cuando vuelva\" está bien. \"Responderé a todos los correos\" después de dos semanas fuera casi nunca es verdad." },
        { title: "Desactívalo", body: "Pon una fecha de fin en Outlook o Gmail y una hora para que se borre el estado del chat, para que nadie lea que no estás el día que vuelves." },
      ],
    },
  ],
  fit: {
    title: "Notas de ausencia, ya dentro de la oficina",
    body: "En TinyFloor, una oficina virtual para equipos remotos, una nota como «🌴 De vacaciones hasta el lunes» va junto a tu nombre, para que el equipo lo sepa antes de intentar hablar contigo, y se borra sola ese día. Funciona en una pestaña del navegador, gratis para hasta 3 personas y 29 US$ al mes para todo el equipo.",
    cta: "Probar la oficina de demostración",
  },
  faqTitle: "Preguntas <em>frecuentes.</em>",
  faq: [
    {
      q: "¿Qué debe decir un mensaje de fuera de la oficina?",
      a: "Que no estás, cuándo vuelves y a quién contactar si es urgente. Por ejemplo: \"Estoy fuera de la oficina hasta el lunes, 2 de noviembre. Para cualquier asunto urgente, contacta con Ana Lima.\"",
    },
    {
      q: "¿Cómo pongo un mensaje de fuera de la oficina en Outlook?",
      a: "En el nuevo Outlook o en Outlook en la web: Configuración, Cuentas, Respuestas automáticas. En Outlook clásico para Windows: Archivo, Respuestas automáticas. Actívalo, pon las fechas y pega tu mensaje.",
    },
    {
      q: "¿Cómo pongo una respuesta automática en Gmail?",
      a: "Haz clic en el engranaje, Ver todos los ajustes, y en la pestaña General activa la Respuesta automática. Pon las fechas, un asunto y tu mensaje, y haz clic en Guardar cambios.",
    },
    {
      q: "¿Tengo que decir por qué no estoy?",
      a: "No. \"Fuera de la oficina\" basta. Decir que estás de vacaciones es habitual y está bien, pero nunca tienes que dar detalles, sobre todo de salud.",
    },
    {
      q: "¿Cuál es un ejemplo de mensaje de fuera de la oficina profesional?",
      a: "\"Gracias por tu correo. Estoy fuera de la oficina hasta el lunes, 2 de noviembre, y responderé a mi regreso. Para cualquier asunto urgente, contacta con Ana Lima (ana@ejemplo.com).\"",
    },
    {
      q: "¿Este generador es gratis?",
      a: "Sí, y funciona entero en tu navegador: los nombres, fechas y correos que escribes nunca se envían a ningún sitio. Copia el mensaje en Outlook, Gmail, Slack o Teams.",
    },
    {
      q: "¿Qué significa OOO?",
      a: "OOO son las siglas en inglés de \"out of office\" (fuera de la oficina). Se suele escribir en calendarios, estados de chat y asuntos de correo, como en \"OOO hasta el lunes\", para indicar que estás ausente y no vas a responder de inmediato.",
    },
    {
      q: "¿Es lo mismo una respuesta automática que un mensaje de fuera de la oficina?",
      a: "Sí. Respuestas automáticas es como llama Outlook a su mensaje de fuera de la oficina, y Gmail lo llama Respuesta automática. Todos ellos envían una respuesta a las personas que te escriben mientras estás fuera.",
    },
    {
      q: "¿Cómo pongo el mensaje de fuera de la oficina en Teams?",
      a: "Haz clic en tu foto de perfil, elige Definir mensaje de estado y luego Programar fuera de la oficina. Activa las respuestas automáticas, escribe tu mensaje y pon las fechas. Teams mostrará que estás fuera de la oficina y Outlook enviará el mismo mensaje a cualquiera que te escriba un correo.",
    },
    {
      q: "¿Cómo pongo el mensaje de fuera de la oficina en Outlook en el móvil?",
      a: "En la aplicación de Outlook, toca tu foto de perfil, luego el engranaje de Configuración, elige tu cuenta de trabajo y toca Respuestas automáticas. Actívalo, escribe tu mensaje y pon las fechas.",
    },
  ],
};

export default es;
