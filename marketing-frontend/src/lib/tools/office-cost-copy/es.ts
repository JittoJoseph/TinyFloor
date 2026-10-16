import type { OfficeCostsContent } from "@/lib/tools/office-costs";

const es: OfficeCostsContent = {
  meta: {
    title: "Calculadora de coste de oficina virtual: lo que 9 herramientas cuestan a tu equipo",
    description:
      "Indica el tamaño de tu equipo y mira cuánto cuestan al mes Gather, SoWork, Kumospace, WorkAdventure, SpatialChat, Roam, oVice, Sococo y TinyFloor, con pago anual o mensual, según la página de precios de cada uno.",
  },
  eyebrow: "Herramientas gratis",
  updated: "Precios revisados el",
  title: "Lo que una oficina virtual <em>cuesta a tu equipo.</em>",
  intro:
    "La mayoría de las oficinas virtuales cobran por persona, algunas por espacio o por oficina, y los planes gratuitos se quedan en tamaños distintos. Indica cuántas personas hay en tu equipo para ver cuánto cuesta al mes cada una de nueve herramientas, de la más barata a la más cara.",
  calculator: {
    people: "Personas en el equipo",
    count: "{count} personas",
    billing: { yearly: "Pago anual", monthly: "Pago mensual" },
    product: "Producto",
    free: "Plan gratuito",
    price: "Plan de pago",
    perMonth: "{amount} al mes",
    perYear: "{amount} al año",
    only: { yearly: "solo anual", monthly: "solo mensual" },
    noFree: "Sin plan gratuito",
    fits: "Gratis con este tamaño",
    upTo: "Hasta {count} personas",
    pricingPage: "Página de precios",
    basis: {
      office: "Un precio por la oficina",
      member: "Por miembro",
      activeMember: "Por miembro activo",
      space: "Por espacio",
      seat: "Por puesto, mínimo 10",
    },
    limits: {
      everyFeature: "todas las funciones",
      thirtyMinutes: "reuniones de 30 minutos",
      oneFloor: "una planta",
      atOnce: "a la vez",
      twoHours: "2 horas al día",
      preRelease: "versión preliminar, sin soporte",
    },
    summary: "Para {count} personas, los planes por persona van de {low} a {high} al mes. TinyFloor cuesta {tinyfloor}.",
    summaryLarge: "Para {count} personas, los planes por persona van de {low} a {high} al mes.",
  },
  sections: [
    {
      title: "Cómo cobran las oficinas virtuales",
      body: ["De cuatro maneras, y la que usa cada herramienta decide lo que paga un equipo que crece más que el precio de portada."],
      items: [
        {
          title: "Por miembro",
          detail: "Gather, SoWork, Kumospace, WorkAdventure, SpatialChat",
          body: "Pagas por todas las personas con cuenta, cada mes, entren o no. La factura crece con cada contratación: un equipo de 10 paga el doble que uno de 5.",
        },
        {
          title: "Por miembro activo",
          detail: "Roam",
          body: "Pagas por quien lo usó ese mes. Alguien de baja no cuesta nada, pero la mayoría de los equipos están activos todos los meses, así que en la práctica funciona como por miembro.",
        },
        {
          title: "Por espacio o por bloque de puestos",
          detail: "oVice, Sococo",
          body: "Pagas por un espacio pensado para cierto número de personas, o por un bloque mínimo de puestos. Barato si tu equipo lo llena, caro si no: Sococo cobra 10 puestos aunque seáis 4.",
        },
        {
          title: "Un precio por la oficina",
          detail: "TinyFloor",
          body: "Un solo precio sea cual sea el número de personas, hasta el tamaño que admite el plan. Añadir a alguien no cuesta nada, así que nadie tiene que decidir si un colaborador externo merece un puesto.",
        },
      ],
    },
    {
      title: "Pago anual o mensual",
      body: [
        "La mayoría de las herramientas por persona descuentan entre un 10 y un 20% por pagar un año por adelantado: Gather cuesta 12 $ por miembro con pago anual y 15 $ con pago mensual. Es un compromiso de un año para un equipo cuyo tamaño puede cambiar, y el descuento se pierde si lo dejáis a los tres meses.",
        "Algunas solo cobran de una forma: Roam y TinyFloor cobran al mes, Sococo al año. La calculadora las muestra con el precio que tienen y lo indica.",
      ],
    },
  ],
  table: {
    title: "Lo que paga al mes un equipo de 5, 10 o 15",
    body: [
      "Los mismos precios en tres tamaños habituales, con pago anual donde la herramienta lo ofrece, porque es el precio más bajo. Los planes gratuitos no cuentan aquí; la calculadora de arriba muestra cuáles sirven.",
    ],
    product: "Producto",
    note: "Precios en dólares estadounidenses sin impuestos, según la página de precios de cada producto. Sococo cobra 10 puestos como mínimo; oVice pasa de Entry-S a Entry-M a partir de unos 10 miembros habituales.",
  },
  after: [
    {
      title: "Cuándo basta un plan gratuito",
      body: [
        "Un plan gratuito en el que cabe todo tu equipo gana a cualquiera de pago, así que mira los límites antes que el precio. El de SoWork cubre 10 miembros pero corta cada reunión a los 30 minutos. El de WorkAdventure cubre 10 personas conectadas a la vez. El de SpatialChat da a 12 personas dos horas de reunión al día, que sirve para una sesión semanal, no para una oficina abierta todo el día. El de Kumospace cubre 5 miembros en una planta, y el de TinyFloor 3 personas con todas las funciones. El plan gratuito de oVice funciona sobre una versión preliminar sin soporte.",
      ],
    },
    {
      title: "Lo que el precio no muestra",
      items: [
        {
          title: "Lo que incluye el plan",
          body: "El plan más barato no siempre es el que usaríais. SoWork Basic tiene dos grabaciones de reuniones; las grabaciones y las notas con IA están en Premium, a 12 $ por miembro. Gather incluye grabación y transcripción. TinyFloor no tiene grabaciones ni notas con IA.",
        },
        {
          title: "Invitados",
          body: "Clientes y colaboradores que entran de vez en cuando pueden contar como miembros en algunas herramientas. Gather y oVice permiten invitar a visitantes sin pagar por ellos; compruébalo antes de añadir a quien solo pasa de visita.",
        },
        { title: "Impuestos", body: "Todos los precios de aquí son sin impuestos. Según dónde estéis, el IVA o el impuesto sobre ventas se añade al pagar." },
        {
          title: "Pruebas",
          body: "Gather tiene una prueba de 30 días, Roam y oVice de 14, SoWork de 7. La prueba te dice si el equipo lo va a usar; el precio, si vais a seguir pagando.",
        },
      ],
    },
    {
      title: "Cómo lo comprobamos",
      body: [
        "Cada precio sale de la página de precios del propio producto, enlazada en la calculadora, leída en el mes que aparece arriba. Usamos el plan que compraría un equipo pequeño para una oficina abierta todo el día, no planes de eventos ni de empresa. Cuando una página da un solo periodo de pago, mostramos ese. Los precios cambian, así que revisa la página de precios antes de comprar; nosotros los revisamos cada pocos meses.",
      ],
    },
  ],
  fit: {
    title: "Un precio para todo el equipo",
    body: "TinyFloor es una oficina en el navegador para equipos pequeños: te acercas a alguien para hablar, hay sala de reuniones, chat y pantalla compartida. Es gratis hasta 3 personas y 29 $ al mes para todo el equipo a partir de ahí, seáis los que seáis. No tiene grabaciones ni notas con IA; si las necesitáis, Gather o SoWork Premium os irán mejor.",
    cta: "Prueba la oficina de demostración",
  },
  faqTitle: "Preguntas <em>frecuentes.</em>",
  faq: [
    {
      q: "¿Cuánto cuesta una oficina virtual al mes?",
      a: "Para un equipo de 10 con un plan de pago, de 29 $ a 195 $ al mes según la herramienta: TinyFloor cuesta 29 $ por toda la oficina, y las herramientas por persona van de 54 $ (SoWork Basic, pago anual) a 195 $ (Roam).",
    },
    {
      q: "¿Cuál es la oficina virtual más barata para un equipo pequeño?",
      a: "Un plan gratuito que os sirva: el de SoWork cubre 10 miembros con reuniones de 30 minutos, el de WorkAdventure 10 personas a la vez, el de Kumospace 5 miembros y el de TinyFloor 3 personas. A partir de ahí, TinyFloor, a 29 $ al mes por todo el equipo, es el precio de pago más bajo desde 6 personas.",
    },
    {
      q: "¿Gather es gratis?",
      a: "No. Gather eliminó su plan gratuito en 2025. Tras una prueba de 30 días cuesta 12 $ por miembro al mes con pago anual o 15 $ con pago mensual, así que un equipo de 10 paga de 120 $ a 150 $ al mes.",
    },
    {
      q: "¿Es mejor el precio por persona o el precio fijo?",
      a: "Por persona sale más barato para un equipo de 2 o 3, donde el precio por cabeza es pequeño. El precio fijo gana a medida que el equipo crece, y nunca te cobra más por añadir a un colaborador o a una nueva incorporación.",
    },
    {
      q: "¿Los precios de las oficinas virtuales incluyen impuestos?",
      a: "No. Los precios de las páginas de precios de las herramientas, y los de aquí, son sin impuestos; el IVA o el impuesto sobre ventas se añade al pagar según dónde estéis.",
    },
  ],
};

export default es;
