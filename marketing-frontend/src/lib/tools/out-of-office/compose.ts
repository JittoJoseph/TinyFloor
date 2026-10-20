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

/**
 * The date as people say it: "Monday 3 November" in the email, "3 Nov" in a
 * status. Without the weekday where a sentence would have to decline it
 * (Polish "w środę", Russian "в среду"): "3 listopada" reads fine on its own.
 */
function dates(locale: string, back: string, weekday = true) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(back)) return null;
  // Midday UTC, so the day doesn't slip in any time zone.
  const day = new Date(`${back}T12:00:00Z`);
  return {
    long: new Intl.DateTimeFormat(locale, { weekday: weekday ? "long" : undefined, day: "numeric", month: "long", timeZone: "UTC" }).format(day),
    short: new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", timeZone: "UTC" }).format(day),
  };
}

const lines = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join("\n\n");

/** A sentence ending in a short date: "2 nov" needs a full stop, "2. Nov." has one. */
const stop = (text: string) => (text.endsWith(".") ? text : `${text}.`);

function fitStatus(full: string, without: string) {
  return full.length <= STATUS_MAX ? full : without.slice(0, STATUS_MAX);
}

/** Who's away and who covers, trimmed: "Ana Lima (ana@example.com)" when there's both. */
function people(input: OooInput) {
  const who = input.contact.trim();
  const mail = input.email.trim();
  return { who, mail, name: input.name.trim(), reach: who ? (mail ? `${who} (${mail})` : who) : mail };
}

/** The status, with who to reach when it fits. */
function withUrgent(base: string, urgent: string, { who, mail, reach }: ReturnType<typeof people>) {
  return fitStatus(reach ? `${base} · ${urgent}: ${who || mail}` : base, base);
}

/** The date as Japanese, Chinese and Korean emails write it: "11月2日（月）", "11월 2일(월)". */
function withWeekday(locale: string, back: string, open: string, close: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(back)) return null;
  const day = new Date(`${back}T12:00:00Z`);
  const date = new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", timeZone: "UTC" }).format(day);
  const weekday = new Intl.DateTimeFormat(locale, { weekday: "short", timeZone: "UTC" }).format(day);
  return `${date}${open}${weekday}${close}`;
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

function de(input: OooInput): OooMessage {
  const date = dates("de-DE", input.back);
  const p = people(input);
  const we = input.reason === "holiday";
  const away: Record<OooReason, Record<OooTone, string>> = {
    vacation: {
      professional: "vielen Dank für Ihre Nachricht. Ich bin derzeit im Urlaub und nicht im Büro.",
      friendly: "danke für die Nachricht! Ich bin gerade im Urlaub und lese keine E-Mails.",
      short: "Ich bin im Urlaub.",
    },
    sick: {
      professional: "vielen Dank für Ihre Nachricht. Ich bin krankheitsbedingt nicht im Büro.",
      friendly: "danke für die Nachricht. Ich bin gerade krank und nicht erreichbar.",
      short: "Ich bin krank.",
    },
    travel: {
      professional: "vielen Dank für Ihre Nachricht. Ich bin auf Dienstreise und nur eingeschränkt per E-Mail erreichbar.",
      friendly: "danke für die Nachricht! Ich bin auf Dienstreise und lese E-Mails seltener als sonst.",
      short: "Ich bin auf Dienstreise.",
    },
    parental: {
      professional: "vielen Dank für Ihre Nachricht. Ich bin derzeit in Elternzeit.",
      friendly: "danke für die Nachricht! Ich bin gerade in Elternzeit.",
      short: "Ich bin in Elternzeit.",
    },
    holiday: {
      professional: "vielen Dank für Ihre Nachricht. Unser Büro ist wegen des Feiertags geschlossen.",
      friendly: "danke für die Nachricht! Wir haben wegen des Feiertags geschlossen.",
      short: "Wir haben wegen des Feiertags geschlossen.",
    },
  };
  // "Ab Montag, 2. November, bin ich wieder da": the date is the day they're back.
  const reply = {
    professional: date
      ? `Ab ${date.long}, ${we ? "sind wir wieder da und melden uns" : "bin ich wieder da und melde mich"} dann bei Ihnen.`
      : `${we ? "Wir melden uns" : "Ich melde mich"} bei Ihnen, sobald ${we ? "wir zurück sind" : "ich zurück bin"}.`,
    friendly: date
      ? `Ab ${date.long}, ${we ? "sind wir wieder da und melden uns" : "bin ich wieder da und melde mich"} dann.`
      : `${we ? "Wir melden uns" : "Ich melde mich"}, so schnell es geht.`,
    short: date ? stop(`Zurück am ${date.short}`) : `${we ? "Wir antworten" : "Ich antworte"}, sobald ${we ? "wir zurück sind" : "ich zurück bin"}.`,
  }[input.tone];
  const urgent = p.reach && {
    professional: `In dringenden Fällen wenden Sie sich bitte an ${p.reach}.`,
    friendly: `Wenn es nicht warten kann, hilft ${p.reach} gern weiter.`,
    short: `Dringend? Bitte an ${p.reach} wenden.`,
  }[input.tone];
  const greeting = { professional: "Guten Tag,", friendly: "Hallo,", short: "" }[input.tone];
  const signOff = {
    professional: p.name ? `Mit freundlichen Grüßen\n${p.name}` : "Mit freundlichen Grüßen",
    friendly: p.name ? `Viele Grüße\n${p.name}` : "Viele Grüße",
    short: p.name,
  }[input.tone];
  const email = lines(greeting, `${away[input.reason][input.tone]} ${reply}`, urgent, signOff);

  const label: Record<OooReason, string> = {
    vacation: "Im Urlaub",
    sick: "Krank",
    travel: "Auf Dienstreise, antworte verzögert",
    parental: "In Elternzeit",
    holiday: "Feiertag",
  };
  const base = `${EMOJI[input.reason]} ${label[input.reason]}${date ? `, zurück am ${date.short}` : ", bald zurück"}`;
  return { email, status: withUrgent(base, "dringend", p) };
}

function fr(input: OooInput): OooMessage {
  const date = dates("fr-FR", input.back);
  const p = people(input);
  const we = input.reason === "holiday";
  const away: Record<OooReason, Record<OooTone, string>> = {
    vacation: {
      professional: "Merci pour votre message. Je suis actuellement en congés.",
      friendly: "Merci pour votre message ! Je suis en vacances et loin de mes e-mails.",
      short: "Je suis en congés.",
    },
    sick: {
      professional: "Merci pour votre message. Je suis actuellement en arrêt maladie.",
      friendly: "Merci pour votre message. Je suis en arrêt maladie en ce moment.",
      short: "Je suis en arrêt maladie.",
    },
    travel: {
      professional: "Merci pour votre message. Je suis en déplacement professionnel, avec un accès limité à mes e-mails.",
      friendly: "Merci pour votre message ! Je suis en déplacement et je consulte mes e-mails moins souvent que d'habitude.",
      short: "Je suis en déplacement.",
    },
    parental: {
      professional: "Merci pour votre message. Je suis actuellement en congé parental.",
      friendly: "Merci pour votre message ! Je suis en congé parental.",
      short: "Je suis en congé parental.",
    },
    holiday: {
      professional: "Merci pour votre message. Nos bureaux sont fermés pour le jour férié.",
      friendly: "Merci pour votre message ! Nous sommes fermés pour le jour férié.",
      short: "Nous sommes fermés pour le jour férié.",
    },
  };
  const reply = {
    professional: date
      ? we
        ? `Nous serons de retour le ${date.long} et vous répondrons à ce moment-là.`
        : `Je serai de retour le ${date.long} et vous répondrai à ce moment-là.`
      : we
        ? "Nous vous répondrons dès notre retour."
        : "Je vous répondrai dès mon retour.",
    friendly: date
      ? `${we ? "Nous revenons" : "Je reviens"} le ${date.long} et ${we ? "nous vous répondons" : "je vous réponds"} à ce moment-là.`
      : `${we ? "Nous vous répondons" : "Je vous réponds"} dès que possible.`,
    short: date ? stop(`De retour le ${date.short}`) : `Réponse dès ${we ? "notre" : "mon"} retour.`,
  }[input.tone];
  const urgent = p.reach && {
    professional: `Pour toute urgence, vous pouvez contacter ${p.reach}.`,
    friendly: `Si ça ne peut pas attendre, ${p.reach} peut vous aider.`,
    short: `Urgent ? Contactez ${p.reach}.`,
  }[input.tone];
  const greeting = { professional: "Bonjour,", friendly: "Bonjour,", short: "" }[input.tone];
  const signOff = {
    professional: p.name ? `Cordialement,\n${p.name}` : "Cordialement",
    friendly: p.name ? `À bientôt,\n${p.name}` : "À bientôt",
    short: p.name,
  }[input.tone];
  const email = lines(greeting, `${away[input.reason][input.tone]} ${reply}`, urgent, signOff);

  const label: Record<OooReason, string> = {
    vacation: "En congés",
    sick: "En arrêt maladie",
    travel: "En déplacement, réponses plus lentes",
    parental: "En congé parental",
    holiday: "Jour férié",
  };
  const base = `${EMOJI[input.reason]} ${label[input.reason]}${date ? `, de retour le ${date.short}` : ", de retour bientôt"}`;
  return { email, status: withUrgent(base, "urgent", p) };
}

function it(input: OooInput): OooMessage {
  const date = dates("it-IT", input.back);
  const p = people(input);
  const we = input.reason === "holiday";
  const away: Record<OooReason, Record<OooTone, string>> = {
    vacation: {
      professional: "grazie per il messaggio. Sono in ferie e fuori sede.",
      friendly: "grazie per il messaggio! Sono in ferie e non controllo l'email.",
      short: "Sono in ferie.",
    },
    sick: {
      professional: "grazie per il messaggio. Sono assente per malattia.",
      friendly: "grazie per avermi scritto. Al momento sono in malattia.",
      short: "Sono in malattia.",
    },
    travel: {
      professional: "grazie per il messaggio. Sono in trasferta di lavoro, con accesso limitato all'email.",
      friendly: "grazie per il messaggio! Sono in trasferta e controllo l'email meno del solito.",
      short: "Sono in trasferta.",
    },
    parental: {
      professional: "grazie per il messaggio. Sono in congedo parentale.",
      friendly: "grazie per il messaggio! Sono in congedo parentale.",
      short: "Sono in congedo parentale.",
    },
    holiday: {
      professional: "grazie per il messaggio. I nostri uffici sono chiusi per la festività.",
      friendly: "grazie per il messaggio! Siamo chiusi per la festività.",
      short: "Siamo chiusi per la festività.",
    },
  };
  const reply = {
    professional: date
      ? we
        ? `Saremo di nuovo in ufficio ${date.long} e risponderemo al più presto.`
        : `Sarò di nuovo in ufficio ${date.long} e risponderò al più presto.`
      : we
        ? "Risponderemo al messaggio al nostro rientro."
        : "Risponderò al messaggio al mio rientro.",
    friendly: date
      ? we
        ? `Riapriamo ${date.long} e rispondiamo appena possibile.`
        : `Torno ${date.long} e rispondo appena posso.`
      : we
        ? "Rispondiamo appena possibile."
        : "Rispondo appena posso.",
    short: date ? stop(`${we ? "Riapriamo" : "Rientro"} il ${date.short}`) : `${we ? "Rispondiamo" : "Rispondo"} al rientro.`,
  }[input.tone];
  const urgent = p.reach && {
    professional: `Per questioni urgenti, può contattare ${p.reach}.`,
    friendly: `Se non può aspettare, ${p.reach} può aiutarti.`,
    short: `Urgente? Scrivi a ${p.reach}.`,
  }[input.tone];
  const greeting = { professional: "Buongiorno,", friendly: "Ciao,", short: "" }[input.tone];
  const signOff = {
    professional: p.name ? `Cordiali saluti,\n${p.name}` : "Cordiali saluti",
    friendly: p.name ? `A presto,\n${p.name}` : "A presto",
    short: p.name,
  }[input.tone];
  const email = lines(greeting, `${away[input.reason][input.tone]} ${reply}`, urgent, signOff);

  const label: Record<OooReason, string> = {
    vacation: "In ferie",
    sick: "In malattia",
    travel: "In trasferta, rispondo con ritardo",
    parental: "In congedo parentale",
    holiday: "Festività",
  };
  const base = `${EMOJI[input.reason]} ${label[input.reason]}${date ? `, ${we ? "riapriamo" : "rientro"} il ${date.short}` : `, ${we ? "riapriamo" : "rientro"} a breve`}`;
  return { email, status: withUrgent(base, "urgenze", p) };
}

function nl(input: OooInput): OooMessage {
  const date = dates("nl-NL", input.back);
  const p = people(input);
  const we = input.reason === "holiday";
  const away: Record<OooReason, Record<OooTone, string>> = {
    vacation: {
      professional: "Bedankt voor uw e-mail. Ik ben met vakantie en niet op kantoor.",
      friendly: "Bedankt voor je bericht! Ik ben met vakantie en lees even geen mail.",
      short: "Ik ben met vakantie.",
    },
    sick: {
      professional: "Bedankt voor uw e-mail. Ik ben wegens ziekte afwezig.",
      friendly: "Bedankt voor je bericht. Ik ben op dit moment ziek.",
      short: "Ik ben ziek.",
    },
    travel: {
      professional: "Bedankt voor uw e-mail. Ik ben op werkreis en beperkt bereikbaar per e-mail.",
      friendly: "Bedankt voor je bericht! Ik ben op werkreis en lees mijn mail minder vaak dan normaal.",
      short: "Ik ben op werkreis.",
    },
    parental: {
      professional: "Bedankt voor uw e-mail. Ik ben met ouderschapsverlof.",
      friendly: "Bedankt voor je bericht! Ik ben met ouderschapsverlof.",
      short: "Ik ben met ouderschapsverlof.",
    },
    holiday: {
      professional: "Bedankt voor uw e-mail. Ons kantoor is gesloten vanwege de feestdag.",
      friendly: "Bedankt voor je bericht! We zijn gesloten vanwege de feestdag.",
      short: "We zijn gesloten vanwege de feestdag.",
    },
  };
  const reply = {
    professional: date
      ? we
        ? `Vanaf ${date.long} zijn we weer open en reageren we op uw bericht.`
        : `Vanaf ${date.long} ben ik weer aanwezig en reageer ik op uw bericht.`
      : we
        ? "We reageren op uw bericht zodra we terug zijn."
        : "Ik reageer op uw bericht zodra ik terug ben.",
    friendly: date
      ? we
        ? `Vanaf ${date.long} zijn we er weer en reageren we dan.`
        : `Vanaf ${date.long} ben ik er weer en reageer ik dan.`
      : we
        ? "We komen er zo snel mogelijk op terug."
        : "Ik kom er zo snel mogelijk op terug.",
    short: date
      ? stop(`${we ? "Weer open op" : "Terug op"} ${date.short}`)
      : we
        ? "We reageren zodra we terug zijn."
        : "Ik reageer zodra ik terug ben.",
  }[input.tone];
  const urgent = p.reach && {
    professional: `Voor dringende zaken kunt u contact opnemen met ${p.reach}.`,
    friendly: `Kan het niet wachten? Dan helpt ${p.reach} je verder.`,
    short: `Dringend? Neem contact op met ${p.reach}.`,
  }[input.tone];
  const greeting = { professional: "Goedendag,", friendly: "Hallo,", short: "" }[input.tone];
  const signOff = {
    professional: p.name ? `Met vriendelijke groet,\n${p.name}` : "Met vriendelijke groet",
    friendly: p.name ? `Groeten,\n${p.name}` : "Groeten",
    short: p.name,
  }[input.tone];
  const email = lines(greeting, `${away[input.reason][input.tone]} ${reply}`, urgent, signOff);

  const label: Record<OooReason, string> = {
    vacation: "Met vakantie",
    sick: "Ziek",
    travel: "Op werkreis, trager bereikbaar",
    parental: "Met ouderschapsverlof",
    holiday: "Feestdag",
  };
  const base = `${EMOJI[input.reason]} ${label[input.reason]}${date ? `, ${we ? "weer open op" : "terug op"} ${date.short}` : ", snel terug"}`;
  return { email, status: withUrgent(base, "dringend", p) };
}

function pl(input: OooInput): OooMessage {
  const date = dates("pl-PL", input.back, false);
  const p = people(input);
  const we = input.reason === "holiday";
  const away: Record<OooReason, Record<OooTone, string>> = {
    vacation: {
      professional: "dziękuję za wiadomość. Przebywam na urlopie.",
      friendly: "dzięki za wiadomość! Jestem na urlopie i nie zaglądam do maila.",
      short: "Jestem na urlopie.",
    },
    sick: {
      professional: "dziękuję za wiadomość. Przebywam na zwolnieniu lekarskim.",
      friendly: "dzięki za wiadomość. Jestem teraz na zwolnieniu.",
      short: "Jestem na zwolnieniu.",
    },
    travel: {
      professional: "dziękuję za wiadomość. Jestem w podróży służbowej i mam ograniczony dostęp do poczty.",
      friendly: "dzięki za wiadomość! Jestem w podróży służbowej i rzadziej niż zwykle zaglądam do maila.",
      short: "Jestem w delegacji.",
    },
    parental: {
      professional: "dziękuję za wiadomość. Przebywam na urlopie rodzicielskim.",
      friendly: "dzięki za wiadomość! Jestem na urlopie rodzicielskim.",
      short: "Jestem na urlopie rodzicielskim.",
    },
    holiday: {
      professional: "dziękujemy za wiadomość. Z powodu święta nasze biuro jest nieczynne.",
      friendly: "dzięki za wiadomość! Z powodu święta biuro jest zamknięte.",
      short: "Biuro nieczynne z powodu święta.",
    },
  };
  // A name can't be declined for the sentence it's in, so it follows a colon, or is the subject.
  const reply = {
    professional: date
      ? `${we ? "Wracamy" : "Wracam"} ${date.long} i wtedy ${we ? "odpowiemy" : "odpowiem"}.`
      : `${we ? "Odpowiemy" : "Odpowiem"} po powrocie.`,
    friendly: date
      ? `${we ? "Wracamy" : "Wracam"} ${date.long}, wtedy ${we ? "się odezwiemy" : "się odezwę"}.`
      : `${we ? "Odezwiemy się" : "Odezwę się"} najszybciej, jak to możliwe.`,
    short: date ? stop(`${we ? "Wracamy" : "Wracam"} ${date.short}`) : `${we ? "Odpowiemy" : "Odpowiem"} po powrocie.`,
  }[input.tone];
  const urgent = p.reach && {
    professional: `W pilnych sprawach kontakt: ${p.reach}.`,
    friendly: `Jeśli sprawa nie może czekać, pomoże ${p.reach}.`,
    short: `Pilne? Kontakt: ${p.reach}.`,
  }[input.tone];
  const greeting = { professional: "Dzień dobry,", friendly: "Cześć,", short: "" }[input.tone];
  const signOff = {
    professional: p.name ? `Z poważaniem\n${p.name}` : "Z poważaniem",
    friendly: p.name ? `Pozdrawiam\n${p.name}` : "Pozdrawiam",
    short: p.name,
  }[input.tone];
  const email = lines(greeting, `${away[input.reason][input.tone]} ${reply}`, urgent, signOff);

  const label: Record<OooReason, string> = {
    vacation: "Na urlopie",
    sick: "Na zwolnieniu",
    travel: "W delegacji, odpowiadam z opóźnieniem",
    parental: "Na urlopie rodzicielskim",
    holiday: "Święto",
  };
  const base = `${EMOJI[input.reason]} ${label[input.reason]}${date ? `, ${we ? "wracamy" : "wracam"} ${date.short}` : `, ${we ? "wracamy" : "wracam"} wkrótce`}`;
  return { email, status: withUrgent(base, "pilne", p) };
}

function sv(input: OooInput): OooMessage {
  const date = dates("sv-SE", input.back);
  const p = people(input);
  const we = input.reason === "holiday";
  const away: Record<OooReason, Record<OooTone, string>> = {
    vacation: {
      professional: "Tack för ditt mejl. Jag har semester och är inte på kontoret.",
      friendly: "Tack för ditt meddelande! Jag har semester och läser inte mejl.",
      short: "Jag har semester.",
    },
    sick: {
      professional: "Tack för ditt mejl. Jag är sjukskriven och inte på kontoret.",
      friendly: "Tack för att du hör av dig. Jag är sjuk just nu.",
      short: "Jag är sjuk.",
    },
    travel: {
      professional: "Tack för ditt mejl. Jag är på tjänsteresa och har begränsad tillgång till mejl.",
      friendly: "Tack för ditt meddelande! Jag är på tjänsteresa och läser mejl mer sällan än vanligt.",
      short: "Jag är på tjänsteresa.",
    },
    parental: {
      professional: "Tack för ditt mejl. Jag är föräldraledig.",
      friendly: "Tack för ditt meddelande! Jag är föräldraledig.",
      short: "Jag är föräldraledig.",
    },
    holiday: {
      professional: "Tack för ditt mejl. Vårt kontor är stängt på grund av helgdagen.",
      friendly: "Tack för ditt meddelande! Vi har stängt på grund av helgdagen.",
      short: "Vi har stängt på grund av helgdagen.",
    },
  };
  const subject = we ? "Vi" : "Jag";
  const reply = {
    professional: date ? `${subject} är tillbaka ${date.long} och svarar på ditt meddelande då.` : `${subject} svarar på ditt meddelande så snart ${we ? "vi" : "jag"} är tillbaka.`,
    friendly: date ? `${subject} är tillbaka ${date.long} och hör av ${we ? "oss" : "mig"} då.` : `${subject} hör av ${we ? "oss" : "mig"} så snart ${we ? "vi" : "jag"} kan.`,
    short: date ? stop(`Tillbaka ${date.short}`) : `${subject} svarar när ${we ? "vi" : "jag"} är tillbaka.`,
  }[input.tone];
  const urgent = p.reach && {
    professional: `Vid brådskande ärenden, kontakta ${p.reach}.`,
    friendly: `Om det inte kan vänta kan ${p.reach} hjälpa dig.`,
    short: `Brådskande? Kontakta ${p.reach}.`,
  }[input.tone];
  const greeting = { professional: "Hej,", friendly: "Hej!", short: "" }[input.tone];
  const signOff = {
    professional: p.name ? `Med vänliga hälsningar\n${p.name}` : "Med vänliga hälsningar",
    friendly: p.name ? `Hälsningar\n${p.name}` : "Hälsningar",
    short: p.name,
  }[input.tone];
  const email = lines(greeting, `${away[input.reason][input.tone]} ${reply}`, urgent, signOff);

  const label: Record<OooReason, string> = {
    vacation: "Semester",
    sick: "Sjuk",
    travel: "På tjänsteresa, svarar långsamt",
    parental: "Föräldraledig",
    holiday: "Helgdag",
  };
  const base = `${EMOJI[input.reason]} ${label[input.reason]}${date ? `, tillbaka ${date.short}` : ", tillbaka snart"}`;
  return { email, status: withUrgent(base, "brådskande", p) };
}

function da(input: OooInput): OooMessage {
  const date = dates("da-DK", input.back);
  const p = people(input);
  const we = input.reason === "holiday";
  const away: Record<OooReason, Record<OooTone, string>> = {
    vacation: {
      professional: "Tak for din mail. Jeg holder ferie og er ikke på kontoret.",
      friendly: "Tak for din besked! Jeg holder ferie og tjekker ikke mail.",
      short: "Jeg holder ferie.",
    },
    sick: {
      professional: "Tak for din mail. Jeg er sygemeldt og ikke på kontoret.",
      friendly: "Tak for din besked. Jeg er syg i øjeblikket.",
      short: "Jeg er syg.",
    },
    travel: {
      professional: "Tak for din mail. Jeg er på tjenesterejse og har begrænset adgang til mail.",
      friendly: "Tak for din besked! Jeg er på tjenesterejse og tjekker mail sjældnere end normalt.",
      short: "Jeg er på tjenesterejse.",
    },
    parental: {
      professional: "Tak for din mail. Jeg er på barsel.",
      friendly: "Tak for din besked! Jeg er på barsel.",
      short: "Jeg er på barsel.",
    },
    holiday: {
      professional: "Tak for din mail. Vores kontor er lukket på grund af helligdagen.",
      friendly: "Tak for din besked! Vi har lukket på grund af helligdagen.",
      short: "Vi har lukket på grund af helligdagen.",
    },
  };
  const subject = we ? "Vi" : "Jeg";
  const reply = {
    professional: date
      ? `${subject} er tilbage ${date.long} og svarer på din henvendelse til den tid.`
      : `${subject} svarer på din henvendelse, så snart ${we ? "vi" : "jeg"} er tilbage.`,
    friendly: date ? `${subject} er tilbage ${date.long} og svarer dig til den tid.` : `${subject} svarer dig, så snart ${we ? "vi" : "jeg"} kan.`,
    short: date ? stop(`Tilbage ${date.short}`) : `${subject} svarer, når ${we ? "vi" : "jeg"} er tilbage.`,
  }[input.tone];
  const urgent = p.reach && {
    professional: `I hastende sager kan du kontakte ${p.reach}.`,
    friendly: `Hvis det ikke kan vente, kan ${p.reach} hjælpe dig.`,
    short: `Haster det? Kontakt ${p.reach}.`,
  }[input.tone];
  const greeting = { professional: "Hej,", friendly: "Hej!", short: "" }[input.tone];
  const signOff = {
    professional: p.name ? `Med venlig hilsen\n${p.name}` : "Med venlig hilsen",
    friendly: p.name ? `Mange hilsner\n${p.name}` : "Mange hilsner",
    short: p.name,
  }[input.tone];
  const email = lines(greeting, `${away[input.reason][input.tone]} ${reply}`, urgent, signOff);

  const label: Record<OooReason, string> = {
    vacation: "På ferie",
    sick: "Syg",
    travel: "På tjenesterejse, svarer langsomt",
    parental: "På barsel",
    holiday: "Helligdag",
  };
  const base = `${EMOJI[input.reason]} ${label[input.reason]}${date ? `, tilbage ${date.short}` : ", tilbage snart"}`;
  return { email, status: withUrgent(base, "haster", p) };
}

function no(input: OooInput): OooMessage {
  const date = dates("nb-NO", input.back);
  const p = people(input);
  const we = input.reason === "holiday";
  const away: Record<OooReason, Record<OooTone, string>> = {
    vacation: {
      professional: "Takk for e-posten. Jeg har ferie og er ikke på kontoret.",
      friendly: "Takk for meldingen! Jeg har ferie og sjekker ikke e-post.",
      short: "Jeg har ferie.",
    },
    sick: {
      professional: "Takk for e-posten. Jeg er sykmeldt og ikke på kontoret.",
      friendly: "Takk for meldingen. Jeg er syk for øyeblikket.",
      short: "Jeg er syk.",
    },
    travel: {
      professional: "Takk for e-posten. Jeg er på jobbreise og har begrenset tilgang til e-post.",
      friendly: "Takk for meldingen! Jeg er på jobbreise og sjekker e-post sjeldnere enn vanlig.",
      short: "Jeg er på jobbreise.",
    },
    parental: {
      professional: "Takk for e-posten. Jeg er i foreldrepermisjon.",
      friendly: "Takk for meldingen! Jeg er i foreldrepermisjon.",
      short: "Jeg er i foreldrepermisjon.",
    },
    holiday: {
      professional: "Takk for e-posten. Kontoret vårt er stengt på grunn av helligdagen.",
      friendly: "Takk for meldingen! Vi har stengt på grunn av helligdagen.",
      short: "Vi har stengt på grunn av helligdagen.",
    },
  };
  const subject = we ? "Vi" : "Jeg";
  const reply = {
    professional: date
      ? `${subject} er tilbake ${date.long} og svarer på henvendelsen din da.`
      : `${subject} svarer på henvendelsen din så snart ${we ? "vi" : "jeg"} er tilbake.`,
    friendly: date ? `${subject} er tilbake ${date.long} og svarer deg da.` : `${subject} svarer deg så snart ${we ? "vi" : "jeg"} kan.`,
    short: date ? stop(`Tilbake ${date.short}`) : `${subject} svarer når ${we ? "vi" : "jeg"} er tilbake.`,
  }[input.tone];
  const urgent = p.reach && {
    professional: `Ved hastesaker, kontakt ${p.reach}.`,
    friendly: `Hvis det ikke kan vente, kan ${p.reach} hjelpe deg.`,
    short: `Haster det? Kontakt ${p.reach}.`,
  }[input.tone];
  const greeting = { professional: "Hei,", friendly: "Hei!", short: "" }[input.tone];
  const signOff = {
    professional: p.name ? `Med vennlig hilsen\n${p.name}` : "Med vennlig hilsen",
    friendly: p.name ? `Hilsen\n${p.name}` : "Hilsen",
    short: p.name,
  }[input.tone];
  const email = lines(greeting, `${away[input.reason][input.tone]} ${reply}`, urgent, signOff);

  const label: Record<OooReason, string> = {
    vacation: "På ferie",
    sick: "Syk",
    travel: "På jobbreise, svarer tregt",
    parental: "I foreldrepermisjon",
    holiday: "Helligdag",
  };
  const base = `${EMOJI[input.reason]} ${label[input.reason]}${date ? `, tilbake ${date.short}` : ", tilbake snart"}`;
  return { email, status: withUrgent(base, "haster", p) };
}

function fi(input: OooInput): OooMessage {
  const date = dates("fi-FI", input.back, false);
  const p = people(input);
  const we = input.reason === "holiday";
  const away: Record<OooReason, Record<OooTone, string>> = {
    vacation: {
      professional: "Kiitos viestistäsi. Olen lomalla enkä ole toimistolla.",
      friendly: "Kiitos viestistä! Olen lomalla enkä lue sähköpostia.",
      short: "Olen lomalla.",
    },
    sick: {
      professional: "Kiitos viestistäsi. Olen sairauden vuoksi poissa toimistolta.",
      friendly: "Kiitos viestistä. Olen tällä hetkellä sairaana.",
      short: "Olen sairaana.",
    },
    travel: {
      professional: "Kiitos viestistäsi. Olen työmatkalla ja pääsen lukemaan sähköpostia vain rajoitetusti.",
      friendly: "Kiitos viestistä! Olen työmatkalla ja luen sähköpostia tavallista harvemmin.",
      short: "Olen työmatkalla.",
    },
    parental: {
      professional: "Kiitos viestistäsi. Olen perhevapaalla.",
      friendly: "Kiitos viestistä! Olen perhevapaalla.",
      short: "Olen perhevapaalla.",
    },
    holiday: {
      professional: "Kiitos viestistäsi. Toimistomme on suljettu pyhäpäivän vuoksi.",
      friendly: "Kiitos viestistä! Olemme kiinni pyhäpäivän vuoksi.",
      short: "Olemme kiinni pyhäpäivän vuoksi.",
    },
  };
  // A name can't take the case a sentence would give it, so it stays the subject.
  const reply = {
    professional: date
      ? `${we ? "Palaamme" : "Palaan"} ${date.long} ja ${we ? "vastaamme" : "vastaan"} viestiisi silloin.`
      : `${we ? "Vastaamme viestiisi heti palattuamme" : "Vastaan viestiisi heti palattuani"}.`,
    friendly: date
      ? `${we ? "Palaamme" : "Palaan"} ${date.long} ja ${we ? "vastaamme" : "vastaan"} silloin.`
      : `${we ? "Vastaamme heti kun ehdimme" : "Vastaan heti kun ehdin"}.`,
    short: date ? stop(`${we ? "Palaamme" : "Palaan"} ${date.short}`) : `${we ? "Vastaamme palattuamme" : "Vastaan palattuani"}.`,
  }[input.tone];
  const urgent = p.reach && {
    professional: `Kiireellisissä asioissa yhteyshenkilö on ${p.reach}.`,
    friendly: `Jos asia ei voi odottaa, ${p.reach} auttaa.`,
    short: `Kiireellistä? Yhteyshenkilö: ${p.reach}.`,
  }[input.tone];
  const greeting = { professional: "Hei,", friendly: "Hei!", short: "" }[input.tone];
  const signOff = {
    professional: p.name ? `Ystävällisin terveisin\n${p.name}` : "Ystävällisin terveisin",
    friendly: p.name ? `Terveisin\n${p.name}` : "Terveisin",
    short: p.name,
  }[input.tone];
  const email = lines(greeting, `${away[input.reason][input.tone]} ${reply}`, urgent, signOff);

  const label: Record<OooReason, string> = {
    vacation: "Lomalla",
    sick: "Sairaana",
    travel: "Työmatkalla, vastaan hitaasti",
    parental: "Perhevapaalla",
    holiday: "Pyhäpäivä",
  };
  const back = we ? "palaamme" : "palaan";
  const base = `${EMOJI[input.reason]} ${label[input.reason]}${date ? `, ${back} ${date.short}` : `, ${back} pian`}`;
  return { email, status: withUrgent(base, "kiireelliset", p) };
}

function ru(input: OooInput): OooMessage {
  const date = dates("ru-RU", input.back, false);
  const p = people(input);
  const we = input.reason === "holiday";
  const away: Record<OooReason, Record<OooTone, string>> = {
    vacation: {
      professional: "Спасибо за письмо. Я в отпуске.",
      friendly: "Спасибо за сообщение! Я в отпуске и не проверяю почту.",
      short: "Я в отпуске.",
    },
    sick: {
      professional: "Спасибо за письмо. Я на больничном.",
      friendly: "Спасибо за сообщение. Я сейчас на больничном.",
      short: "Я на больничном.",
    },
    travel: {
      professional: "Спасибо за письмо. Я в командировке, доступ к почте ограничен.",
      friendly: "Спасибо за сообщение! Я в командировке и проверяю почту реже обычного.",
      short: "Я в командировке.",
    },
    parental: {
      professional: "Спасибо за письмо. Я в отпуске по уходу за ребёнком.",
      friendly: "Спасибо за сообщение! Я в отпуске по уходу за ребёнком.",
      short: "Я в декрете.",
    },
    holiday: {
      professional: "Спасибо за письмо. Наш офис закрыт в связи с праздником.",
      friendly: "Спасибо за сообщение! Мы не работаем в связи с праздником.",
      short: "Мы не работаем: праздник.",
    },
  };
  // First person present and future, so nothing depends on who's writing; the cover is the subject.
  const reply = {
    professional: date
      ? we
        ? `Мы вернёмся ${date.long} и ответим на ваше письмо.`
        : `Вернусь ${date.long} и отвечу на ваше письмо.`
      : we
        ? "Мы ответим на ваше письмо после возвращения."
        : "Отвечу на ваше письмо после возвращения.",
    friendly: date
      ? we
        ? `Вернёмся ${date.long} и сразу ответим.`
        : `Вернусь ${date.long} и сразу отвечу.`
      : we
        ? "Ответим, как только сможем."
        : "Отвечу, как только смогу.",
    short: date ? stop(`${we ? "Откроемся" : "Вернусь"} ${date.short}`) : `${we ? "Ответим" : "Отвечу"} после возвращения.`,
  }[input.tone];
  const urgent = p.reach && {
    professional: `По срочным вопросам вам поможет ${p.reach}.`,
    friendly: `Если дело не ждёт, поможет ${p.reach}.`,
    short: `Срочно? Контакт: ${p.reach}.`,
  }[input.tone];
  const greeting = { professional: "Здравствуйте!", friendly: "Добрый день!", short: "" }[input.tone];
  const signOff = {
    professional: p.name ? `С уважением,\n${p.name}` : "С уважением",
    friendly: p.name ? `Всего доброго,\n${p.name}` : "Всего доброго",
    short: p.name,
  }[input.tone];
  const email = lines(greeting, `${away[input.reason][input.tone]} ${reply}`, urgent, signOff);

  const label: Record<OooReason, string> = {
    vacation: "В отпуске",
    sick: "На больничном",
    travel: "В командировке, отвечаю с задержкой",
    parental: "В декрете",
    holiday: "Праздник",
  };
  const back = we ? "вернёмся" : "вернусь";
  const base = `${EMOJI[input.reason]} ${label[input.reason]}${date ? `, ${back} ${date.short}` : `, скоро ${back}`}`;
  return { email, status: withUrgent(base, "срочно", p) };
}

function ja(input: OooInput): OooMessage {
  const date = dates("ja-JP", input.back);
  const day = withWeekday("ja-JP", input.back, "（", "）");
  const p = people(input);
  const we = input.reason === "holiday";
  const away: Record<OooReason, Record<OooTone, string>> = {
    vacation: {
      professional: "誠に勝手ながら、休暇のため不在にしております。",
      friendly: "ただいま休暇中で、メールは見ていません。",
      short: "休暇中です。",
    },
    sick: {
      professional: "誠に勝手ながら、体調不良のため休みをいただいております。",
      friendly: "体調を崩していて、お休みしています。",
      short: "体調不良でお休みしています。",
    },
    travel: {
      professional: "出張のため不在にしており、メールの確認が遅れる場合がございます。",
      friendly: "出張中のため、メールの確認がいつもより遅くなります。",
      short: "出張中です。",
    },
    parental: {
      professional: "誠に勝手ながら、育児休業を取得しております。",
      friendly: "育児休業中です。",
      short: "育休中です。",
    },
    holiday: {
      professional: "誠に勝手ながら、祝日のため休業しております。",
      friendly: "祝日のためお休みしています。",
      short: "祝日のため休業中です。",
    },
  };
  const reply = {
    professional: day
      ? `${day}より${we ? "通常どおり営業し" : "業務に戻り"}、順次ご返信いたします。`
      : `${we ? "営業再開後" : "戻り次第"}、順次ご返信いたします。`,
    friendly: day ? `${day}${we ? "から営業します" : "に戻ります"}ので、それ以降にお返事します。` : `${we ? "営業再開後に" : "戻り次第"}お返事します。`,
    short: date ? `${date.short}${we ? "から営業します" : "に戻ります"}。` : `${we ? "営業再開後に" : "戻り次第"}返信します。`,
  }[input.tone];
  const urgent = p.reach && {
    professional: `お急ぎの場合は、${p.reach}までご連絡ください。`,
    friendly: `急ぎの場合は${p.reach}が対応します。`,
    short: `急ぎの場合は${p.reach}まで。`,
  }[input.tone];
  const greeting = { professional: "ご連絡ありがとうございます。", friendly: "メッセージありがとうございます！", short: "" }[input.tone];
  const signOff = {
    professional: p.name ? `よろしくお願いいたします。\n${p.name}` : "よろしくお願いいたします。",
    friendly: p.name ? `よろしくお願いします。\n${p.name}` : "よろしくお願いします。",
    short: p.name,
  }[input.tone];
  // No space between Japanese sentences.
  const email = lines(greeting, `${away[input.reason][input.tone]}${reply}`, urgent, signOff);

  const label: Record<OooReason, string> = {
    vacation: "休暇中",
    sick: "体調不良でお休み",
    travel: "出張中（返信が遅れます）",
    parental: "育休中",
    holiday: "祝日休業",
  };
  const when = date ? `${date.short}${we ? "から営業" : "に戻ります"}` : we ? "まもなく営業再開" : "まもなく戻ります";
  const base = `${EMOJI[input.reason]} ${label[input.reason]}・${when}`;
  return { email, status: withUrgent(base, "急ぎ", p) };
}

function ko(input: OooInput): OooMessage {
  const date = dates("ko-KR", input.back);
  const day = withWeekday("ko-KR", input.back, "(", ")");
  const p = people(input);
  const we = input.reason === "holiday";
  const away: Record<OooReason, Record<OooTone, string>> = {
    vacation: {
      professional: "메일 주셔서 감사합니다. 현재 휴가 중입니다.",
      friendly: "메시지 감사합니다! 지금 휴가 중이라 메일을 안 보고 있어요.",
      short: "휴가 중이에요.",
    },
    sick: {
      professional: "메일 주셔서 감사합니다. 병가로 부재중입니다.",
      friendly: "메시지 감사합니다. 몸이 좋지 않아 쉬고 있어요.",
      short: "병가 중이에요.",
    },
    travel: {
      professional: "메일 주셔서 감사합니다. 출장 중이라 메일 확인이 어렵습니다.",
      friendly: "메시지 감사합니다! 출장 중이라 메일 확인이 평소보다 늦어요.",
      short: "출장 중이에요.",
    },
    parental: {
      professional: "메일 주셔서 감사합니다. 현재 육아휴직 중입니다.",
      friendly: "메시지 감사합니다! 육아휴직 중이에요.",
      short: "육아휴직 중이에요.",
    },
    holiday: {
      professional: "메일 주셔서 감사합니다. 공휴일로 사무실이 휴무입니다.",
      friendly: "메시지 감사합니다! 공휴일이라 쉬고 있어요.",
      short: "공휴일 휴무예요.",
    },
  };
  // "에게" follows any name, so the cover is never the subject (이/가 would depend on the name).
  const reply = {
    professional: day
      ? we
        ? `${day}부터 정상 업무를 시작하며, 업무 재개 후 회신드리겠습니다.`
        : `${day}에 복귀하며, 복귀 후 순차적으로 회신드리겠습니다.`
      : we
        ? "업무 재개 후 회신드리겠습니다."
        : "복귀하는 대로 순차적으로 회신드리겠습니다.",
    friendly: day
      ? we
        ? `${day}부터 다시 일하니 그때 답장드릴게요.`
        : `${day}에 돌아오면 답장드릴게요.`
      : we
        ? "다시 일을 시작하면 답장드릴게요."
        : "돌아오는 대로 답장드릴게요.",
    short: date ? `${date.short}에 ${we ? "업무를 재개" : "복귀"}해요.` : we ? "업무 재개 후 답할게요." : "돌아오면 답할게요.",
  }[input.tone];
  const urgent = p.reach && {
    professional: `급한 용무는 ${p.reach}에게 연락 부탁드립니다.`,
    friendly: `급한 일이면 ${p.reach}에게 연락해 주세요.`,
    short: `급하면 ${p.reach}에게 연락 주세요.`,
  }[input.tone];
  const greeting = { professional: "안녕하세요.", friendly: "안녕하세요!", short: "" }[input.tone];
  const signOff = {
    professional: p.name ? `감사합니다.\n${p.name} 드림` : "감사합니다.",
    friendly: p.name ? `감사해요.\n${p.name}` : "감사해요.",
    short: p.name,
  }[input.tone];
  const email = lines(greeting, `${away[input.reason][input.tone]} ${reply}`, urgent, signOff);

  const label: Record<OooReason, string> = {
    vacation: "휴가 중",
    sick: "병가 중",
    travel: "출장 중, 답장이 늦어요",
    parental: "육아휴직 중",
    holiday: "공휴일 휴무",
  };
  const when = date ? `${date.short} ${we ? "업무 재개" : "복귀"}` : we ? "곧 업무 재개" : "곧 복귀";
  const base = `${EMOJI[input.reason]} ${label[input.reason]}, ${when}`;
  return { email, status: withUrgent(base, "급한 일", p) };
}

function zh(input: OooInput): OooMessage {
  const date = dates("zh-CN", input.back);
  const day = withWeekday("zh-CN", input.back, "（", "）");
  const p = people(input);
  const we = input.reason === "holiday";
  const away: Record<OooReason, Record<OooTone, string>> = {
    vacation: {
      professional: "感谢来信。我目前正在休假。",
      friendly: "谢谢你的消息！我正在休假，暂时不看邮件。",
      short: "休假中。",
    },
    sick: {
      professional: "感谢来信。我目前因病休假。",
      friendly: "谢谢你的消息。我身体不太舒服，正在休息。",
      short: "病假中。",
    },
    travel: {
      professional: "感谢来信。我目前在出差，查看邮件不太方便。",
      friendly: "谢谢你的消息！我在出差，看邮件会比平时少。",
      short: "出差中。",
    },
    parental: {
      professional: "感谢来信。我目前正在休育儿假。",
      friendly: "谢谢你的消息！我正在休育儿假。",
      short: "育儿假中。",
    },
    holiday: {
      professional: "感谢来信。因法定假日，我们暂停办公。",
      friendly: "谢谢你的消息！我们放假了。",
      short: "法定假日休息。",
    },
  };
  const reply = {
    professional: day
      ? we
        ? `我们将于${day}恢复正常工作，届时会尽快回复您。`
        : `我将于${day}返回，届时会尽快回复您。`
      : we
        ? "我们恢复工作后会尽快回复您。"
        : "我回来后会尽快回复您。",
    friendly: day ? `${we ? "我们" : "我"}${day}${we ? "恢复工作" : "回来"}，到时候再回复你。` : `${we ? "我们恢复工作" : "我回来"}后再回复你。`,
    short: date ? `${date.short}${we ? "恢复工作" : "回来"}。` : `${we ? "恢复工作" : "回来"}后回复。`,
  }[input.tone];
  const urgent = p.reach && {
    professional: `如有急事，请联系 ${p.reach}。`,
    friendly: `如果事情等不了，可以找 ${p.reach}。`,
    short: `急事请找 ${p.reach}。`,
  }[input.tone];
  const greeting = { professional: "您好，", friendly: "你好！", short: "" }[input.tone];
  const signOff = {
    professional: p.name ? `祝好\n${p.name}` : "祝好",
    friendly: p.name ? `谢谢\n${p.name}` : "谢谢",
    short: p.name,
  }[input.tone];
  // No space between Chinese sentences.
  const email = lines(greeting, `${away[input.reason][input.tone]}${reply}`, urgent, signOff);

  const label: Record<OooReason, string> = {
    vacation: "休假中",
    sick: "病假中",
    travel: "出差中，回复较慢",
    parental: "育儿假中",
    holiday: "法定假日",
  };
  const when = date ? `${date.short}${we ? "恢复工作" : "回来"}` : we ? "很快恢复工作" : "很快回来";
  const base = `${EMOJI[input.reason]} ${label[input.reason]}，${when}`;
  return { email, status: withUrgent(base, "急事", p) };
}

function he(input: OooInput): OooMessage {
  const date = dates("he-IL", input.back);
  const p = people(input);
  const we = input.reason === "holiday";
  // First-person future and nouns, which Hebrew doesn't inflect for the writer's gender.
  const away: Record<OooReason, Record<OooTone, string>> = {
    vacation: {
      professional: "תודה על פנייתך. אני בחופשה ומחוץ למשרד.",
      friendly: "תודה על ההודעה! אני בחופשה עכשיו.",
      short: "אני בחופשה.",
    },
    sick: {
      professional: "תודה על פנייתך. אני בחופשת מחלה.",
      friendly: "תודה על ההודעה. אני חולה כרגע.",
      short: "אני בחופשת מחלה.",
    },
    travel: {
      professional: "תודה על פנייתך. אני בנסיעת עבודה, עם גישה מוגבלת למייל.",
      friendly: "תודה על ההודעה! אני בנסיעת עבודה ועונה למיילים לאט מהרגיל.",
      short: "אני בנסיעת עבודה.",
    },
    parental: {
      professional: "תודה על פנייתך. אני בחופשת לידה.",
      friendly: "תודה על ההודעה! אני בחופשת לידה.",
      short: "אני בחופשת לידה.",
    },
    holiday: {
      professional: "תודה על פנייתך. המשרד שלנו סגור בשל החג.",
      friendly: "תודה על ההודעה! אנחנו סגורים בשל החג.",
      short: "סגורים בשל החג.",
    },
  };
  const reply = {
    professional: date
      ? we
        ? `נחזור לפעילות ב${date.long} ונשיב להודעתך בהקדם.`
        : `אחזור ב${date.long} ואשיב להודעתך בהקדם.`
      : we
        ? "נשיב להודעתך מיד כשנחזור."
        : "אשיב להודעתך מיד כשאחזור.",
    friendly: date ? `${we ? "נהיה" : "אהיה"} בחזרה ב${date.long} ו${we ? "נענה" : "אענה"} אז.` : we ? "נענה ברגע שנוכל." : "אענה ברגע שאוכל.",
    short: date ? stop(`${we ? "חוזרים לפעילות" : "בחזרה"} ב־${date.short}`) : we ? "נשיב כשנחזור." : "אשיב כשאחזור.",
  }[input.tone];
  const urgent = p.reach && {
    professional: `בעניינים דחופים אפשר לפנות אל ${p.reach}.`,
    friendly: `אם זה לא יכול לחכות, אפשר לפנות אל ${p.reach}.`,
    short: `דחוף? פנו אל ${p.reach}.`,
  }[input.tone];
  const greeting = { professional: "שלום,", friendly: "היי,", short: "" }[input.tone];
  const signOff = {
    professional: p.name ? `בברכה,\n${p.name}` : "בברכה",
    friendly: p.name ? `תודה,\n${p.name}` : "תודה",
    short: p.name,
  }[input.tone];
  const email = lines(greeting, `${away[input.reason][input.tone]} ${reply}`, urgent, signOff);

  const label: Record<OooReason, string> = {
    vacation: "בחופשה",
    sick: "בחופשת מחלה",
    travel: "בנסיעת עבודה, אענה באיחור",
    parental: "בחופשת לידה",
    holiday: "חג",
  };
  const when = date ? `${we ? "חוזרים" : "בחזרה"} ב־${date.short}` : we ? "חוזרים בקרוב" : "בחזרה בקרוב";
  const base = `${EMOJI[input.reason]} ${label[input.reason]}, ${when}`;
  return { email, status: withUrgent(base, "דחוף", p) };
}

function ar(input: OooInput): OooMessage {
  const date = dates("ar-u-nu-latn", input.back);
  const p = people(input);
  const we = input.reason === "holiday";
  const away: Record<OooReason, Record<OooTone, string>> = {
    vacation: {
      professional: "شكرًا لرسالتك. أنا في إجازة حاليًا.",
      friendly: "شكرًا لرسالتك! أنا في إجازة ولا أتفقد البريد.",
      short: "أنا في إجازة.",
    },
    sick: {
      professional: "شكرًا لرسالتك. أنا في إجازة مرضية حاليًا.",
      friendly: "شكرًا لتواصلك. أنا في إجازة مرضية حاليًا.",
      short: "أنا في إجازة مرضية.",
    },
    travel: {
      professional: "شكرًا لرسالتك. أنا في رحلة عمل، وإمكانية تفقد البريد لديّ محدودة.",
      friendly: "شكرًا لرسالتك! أنا في رحلة عمل وأتفقد البريد أقل من المعتاد.",
      short: "أنا في رحلة عمل.",
    },
    parental: {
      professional: "شكرًا لرسالتك. أنا في إجازة والدية حاليًا.",
      friendly: "شكرًا لرسالتك! أنا في إجازة والدية.",
      short: "أنا في إجازة والدية.",
    },
    holiday: {
      professional: "شكرًا لرسالتك. مكتبنا مغلق بمناسبة العطلة الرسمية.",
      friendly: "شكرًا لرسالتك! نحن في عطلة رسمية.",
      short: "مغلقون للعطلة الرسمية.",
    },
  };
  // First-person verbs, which Arabic doesn't inflect for the writer's gender.
  const reply = {
    professional: date
      ? we
        ? `نستأنف العمل يوم ${date.long} وسنرد على رسالتك حينها.`
        : `سأعود يوم ${date.long} وسأرد على رسالتك حينها.`
      : we
        ? "سنرد على رسالتك فور عودتنا."
        : "سأرد على رسالتك فور عودتي.",
    friendly: date
      ? we
        ? `نعود يوم ${date.long} ونرد عليك حينها.`
        : `سأعود يوم ${date.long} وأرد عليك حينها.`
      : we
        ? "سنرد عليك حين نستطيع."
        : "سأرد عليك حين أستطيع.",
    short: date ? `${we ? "نعود" : "أعود"} في ${date.short}.` : we ? "نرد بعد عودتنا." : "أرد بعد عودتي.",
  }[input.tone];
  const urgent = p.reach && {
    professional: `للأمور العاجلة، يرجى التواصل مع ${p.reach}.`,
    friendly: `إن لم يحتمل الأمر الانتظار، يمكن لـ ${p.reach} المساعدة.`,
    short: `أمر عاجل؟ تواصل مع ${p.reach}.`,
  }[input.tone];
  const greeting = { professional: "تحية طيبة،", friendly: "أهلًا،", short: "" }[input.tone];
  const signOff = {
    professional: p.name ? `مع أطيب التحيات،\n${p.name}` : "مع أطيب التحيات",
    friendly: p.name ? `شكرًا،\n${p.name}` : "شكرًا",
    short: p.name,
  }[input.tone];
  const email = lines(greeting, `${away[input.reason][input.tone]} ${reply}`, urgent, signOff);

  const label: Record<OooReason, string> = {
    vacation: "في إجازة",
    sick: "إجازة مرضية",
    travel: "في رحلة عمل، الرد أبطأ",
    parental: "إجازة والدية",
    holiday: "عطلة رسمية",
  };
  const when = date ? `${we ? "نعود" : "العودة"} في ${date.short}` : we ? "نعود قريبًا" : "العودة قريبًا";
  const base = `${EMOJI[input.reason]} ${label[input.reason]}، ${when}`;
  return { email, status: withUrgent(base, "للعاجل", p) };
}

const WRITERS: Record<string, (input: OooInput) => OooMessage> = { en, pt, es, de, fr, it, nl, pl, sv, da, no, fi, ru, ja, ko, zh, he, ar };

export const composeOoo = (locale: string, input: OooInput): OooMessage => (WRITERS[locale] ?? en)(input);
