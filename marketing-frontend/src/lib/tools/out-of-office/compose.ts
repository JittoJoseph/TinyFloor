/**
 * Out-of-office messages, written from what someone picks (lib/tools/out-of-office):
 * an email auto-reply and a chat status short enough for Slack, Teams or a
 * TinyFloor status note. Each language writes its own sentences rather than
 * filling one set of blanks, since word order and politeness differ.
 */
export type OooReason = "vacation" | "sick" | "travel" | "parental" | "holiday";
export type OooTone = "professional" | "friendly" | "short";

export interface OooInput {
  reason: OooReason;
  tone: OooTone;
  /** YYYY-MM-DD, or empty when they don't know yet. */
  back: string;
  name: string;
  contact: string;
  email: string;
}

export interface OooMessage {
  email: string;
  status: string;
}

/** A chat status stays within what Slack shows (100 characters). */
export const STATUS_MAX = 100;

/** The date as people say it: "Monday 3 November" in the email, "3 Nov" in a status. */
function dates(locale: string, back: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(back)) return null;
  // Midday UTC, so the day doesn't slip in any time zone.
  const day = new Date(`${back}T12:00:00Z`);
  return {
    long: new Intl.DateTimeFormat(locale, { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(day),
    short: new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", timeZone: "UTC" }).format(day),
  };
}

const lines = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join("\n\n");

function fitStatus(full: string, without: string) {
  return full.length <= STATUS_MAX ? full : without.slice(0, STATUS_MAX);
}

const EMOJI: Record<OooReason, string> = { vacation: "🌴", sick: "🤒", travel: "✈️", parental: "🍼", holiday: "🎉" };

function en(input: OooInput): OooMessage {
  const date = dates("en-GB", input.back);
  const who = input.contact.trim();
  const mail = input.email.trim();
  const name = input.name.trim();
  const reach = who ? (mail ? `${who} (${mail})` : who) : mail;
  const away: Record<OooReason, Record<OooTone, string>> = {
    vacation: {
      professional: "Thank you for your email. I'm currently out of the office on annual leave",
      friendly: "Thanks for your message! I'm on holiday and away from my email",
      short: "I'm on leave",
    },
    sick: {
      professional: "Thank you for your email. I'm out of the office due to illness",
      friendly: "Thanks for getting in touch. I'm off sick at the moment",
      short: "I'm off sick",
    },
    travel: {
      professional: "Thank you for your email. I'm travelling for work with limited access to email",
      friendly: "Thanks for your message! I'm travelling for work and checking email less than usual",
      short: "I'm travelling for work",
    },
    parental: {
      professional: "Thank you for your email. I'm currently on parental leave",
      friendly: "Thanks for your message! I'm on parental leave",
      short: "I'm on parental leave",
    },
    holiday: {
      professional: "Thank you for your email. Our office is closed for the public holiday",
      friendly: "Thanks for your message! We're closed for the public holiday",
      short: "We're closed for the public holiday",
    },
  };
  const until = date ? ` until ${date.long}` : "";
  const reply = {
    professional: date ? "I'll respond to your message when I return." : "I'll respond to your message as soon as I'm back.",
    friendly: date ? "I'll get back to you when I'm back." : "I'll get back to you as soon as I can.",
    short: "I'll reply when I'm back.",
  }[input.tone];
  const urgent = reach && {
    professional: `For anything urgent, please contact ${reach}.`,
    friendly: `If it can't wait, ${reach} can help.`,
    short: `Urgent? Contact ${reach}.`,
  }[input.tone];
  const greeting = { professional: "Hello,", friendly: "Hi,", short: "" }[input.tone];
  const signOff = { professional: name ? `Kind regards,\n${name}` : "Kind regards", friendly: name ? `Thanks,\n${name}` : "Thanks", short: name }[input.tone];
  const email = lines(greeting, `${away[input.reason][input.tone]}${until}. ${reply}`, urgent, signOff);

  const label: Record<OooReason, string> = {
    vacation: "On holiday",
    sick: "Off sick",
    travel: "Travelling for work, slow to reply",
    parental: "On parental leave",
    holiday: "Public holiday",
  };
  const base = `${EMOJI[input.reason]} ${label[input.reason]}${date ? ` until ${date.short}` : ", back soon"}`;
  return { email, status: fitStatus(reach ? `${base} · urgent: ${who || mail}` : base, base) };
}

function pt(input: OooInput): OooMessage {
  const date = dates("pt-BR", input.back);
  const who = input.contact.trim();
  const mail = input.email.trim();
  const name = input.name.trim();
  const reach = who ? (mail ? `${who} (${mail})` : who) : mail;
  const away: Record<OooReason, Record<OooTone, string>> = {
    vacation: {
      professional: "Obrigado pelo seu e-mail. Estou de férias e fora do escritório",
      friendly: "Obrigado pela mensagem! Estou de férias e longe do e-mail",
      short: "Estou de férias",
    },
    sick: {
      professional: "Obrigado pelo seu e-mail. Estou afastado por motivo de saúde",
      friendly: "Obrigado pelo contato. Estou doente e afastado no momento",
      short: "Estou afastado por motivo de saúde",
    },
    travel: {
      professional: "Obrigado pelo seu e-mail. Estou em viagem a trabalho, com acesso limitado ao e-mail",
      friendly: "Obrigado pela mensagem! Estou viajando a trabalho e olhando o e-mail menos que o normal",
      short: "Estou em viagem a trabalho",
    },
    parental: {
      professional: "Obrigado pelo seu e-mail. Estou de licença-maternidade/paternidade",
      friendly: "Obrigado pela mensagem! Estou de licença-maternidade/paternidade",
      short: "Estou de licença",
    },
    holiday: {
      professional: "Obrigado pelo seu e-mail. Nosso escritório está fechado por causa do feriado",
      friendly: "Obrigado pela mensagem! Estamos fechados por causa do feriado",
      short: "Estamos fechados por causa do feriado",
    },
  };
  const until = date ? ` até ${date.long}` : "";
  const reply = {
    professional: date ? "Responderei sua mensagem quando retornar." : "Responderei sua mensagem assim que retornar.",
    friendly: date ? "Respondo quando voltar." : "Respondo assim que puder.",
    short: "Respondo quando voltar.",
  }[input.tone];
  const urgent = reach && {
    professional: `Em caso de urgência, entre em contato com ${reach}.`,
    friendly: `Se não puder esperar, ${reach} pode ajudar.`,
    short: `Urgente? Fale com ${reach}.`,
  }[input.tone];
  const greeting = { professional: "Olá,", friendly: "Oi,", short: "" }[input.tone];
  const signOff = { professional: name ? `Atenciosamente,\n${name}` : "Atenciosamente", friendly: name ? `Obrigado,\n${name}` : "Obrigado", short: name }[input.tone];
  const email = lines(greeting, `${away[input.reason][input.tone]}${until}. ${reply}`, urgent, signOff);

  const label: Record<OooReason, string> = {
    vacation: "De férias",
    sick: "Afastado por saúde",
    travel: "Em viagem a trabalho, posso demorar a responder",
    parental: "De licença",
    holiday: "Feriado",
  };
  const base = `${EMOJI[input.reason]} ${label[input.reason]}${date ? ` até ${date.short}` : ", volto logo"}`;
  return { email, status: fitStatus(reach ? `${base} · urgente: ${who || mail}` : base, base) };
}

function es(input: OooInput): OooMessage {
  const date = dates("es-ES", input.back);
  const who = input.contact.trim();
  const mail = input.email.trim();
  const name = input.name.trim();
  const reach = who ? (mail ? `${who} (${mail})` : who) : mail;
  const away: Record<OooReason, Record<OooTone, string>> = {
    vacation: {
      professional: "Gracias por tu correo. Estoy de vacaciones y fuera de la oficina",
      friendly: "¡Gracias por tu mensaje! Estoy de vacaciones y lejos del correo",
      short: "Estoy de vacaciones",
    },
    sick: {
      professional: "Gracias por tu correo. Estoy de baja por enfermedad",
      friendly: "Gracias por escribir. Estoy de baja por enfermedad",
      short: "Estoy de baja",
    },
    travel: {
      professional: "Gracias por tu correo. Estoy de viaje de trabajo, con acceso limitado al correo",
      friendly: "¡Gracias por tu mensaje! Estoy de viaje de trabajo y miro el correo menos de lo habitual",
      short: "Estoy de viaje de trabajo",
    },
    parental: {
      professional: "Gracias por tu correo. Estoy de baja por maternidad/paternidad",
      friendly: "¡Gracias por tu mensaje! Estoy de baja por maternidad/paternidad",
      short: "Estoy de baja por maternidad/paternidad",
    },
    holiday: {
      professional: "Gracias por tu correo. Nuestra oficina está cerrada por el día festivo",
      friendly: "¡Gracias por tu mensaje! Estamos cerrados por el día festivo",
      short: "Estamos cerrados por festivo",
    },
  };
  const until = date ? ` hasta el ${date.long}` : "";
  const reply = {
    professional: date ? "Responderé a tu mensaje a mi regreso." : "Responderé a tu mensaje en cuanto vuelva.",
    friendly: date ? "Te respondo cuando vuelva." : "Te respondo en cuanto pueda.",
    short: "Respondo cuando vuelva.",
  }[input.tone];
  const urgent = reach && {
    professional: `Para cualquier asunto urgente, contacta con ${reach}.`,
    friendly: `Si no puede esperar, ${reach} te puede ayudar.`,
    short: `¿Urgente? Contacta con ${reach}.`,
  }[input.tone];
  const greeting = { professional: "Hola:", friendly: "¡Hola!", short: "" }[input.tone];
  const signOff = { professional: name ? `Un saludo,\n${name}` : "Un saludo", friendly: name ? `Gracias,\n${name}` : "Gracias", short: name }[input.tone];
  const email = lines(greeting, `${away[input.reason][input.tone]}${until}. ${reply}`, urgent, signOff);

  const label: Record<OooReason, string> = {
    vacation: "De vacaciones",
    sick: "De baja",
    travel: "De viaje de trabajo, puedo tardar en responder",
    parental: "De baja por maternidad/paternidad",
    holiday: "Festivo",
  };
  const base = `${EMOJI[input.reason]} ${label[input.reason]}${date ? ` hasta el ${date.short}` : ", vuelvo pronto"}`;
  return { email, status: fitStatus(reach ? `${base} · urgente: ${who || mail}` : base, base) };
}

const WRITERS: Record<string, (input: OooInput) => OooMessage> = { en, pt, es };

export const composeOoo = (locale: string, input: OooInput): OooMessage => (WRITERS[locale] ?? en)(input);
