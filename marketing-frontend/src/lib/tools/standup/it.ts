import type { StandupContent } from "@/lib/tools/standup";

/** Il template per il daily standup in italiano, scritto a partire dalla pagina inglese. */
const it: StandupContent = {
  meta: {
    title: "Template daily standup: agenda gratuita e standup asincrono",
    description:
      "Crea l'agenda del daily standup sui tempi del tuo team, o un template di standup asincrono da pubblicare su Slack o Teams. Gratis, con tre set di domande.",
  },
  eyebrow: "Strumento gratuito",
  updated: "Aggiornato il",
  title: "Template per il <em>daily standup.</em>",
  intro:
    "Un buon daily standup dura circa un minuto a persona e finisce con tutti che sanno cosa sta succedendo e chi è bloccato. Scegli quante persone siete e come vi incontrate, in call, per iscritto o scorrendo la board, e ottieni un'agenda con i tempi giusti, o un template da pubblicare nella chat del team.",
  builder: {
    team: "Dimensione del team",
    people: "{count} persone",
    format: "Come vi incontrate",
    formats: { live: "In call", async: "Per iscritto (asincrono)", board: "Scorrendo la board" },
    questions: "Domande",
    sets: [
      { key: "classic", label: "Classiche", questions: ["Cosa hai fatto ieri?", "Cosa farai oggi?", "C'è qualcosa che ti blocca?"] },
      { key: "focus", label: "Priorità", questions: ["Qual è la tua priorità di oggi?", "Cosa potrebbe fermarla?", "Di chi hai bisogno per un aiuto?"] },
      { key: "progress", label: "Avanzamento", questions: ["Cosa è andato avanti?", "Qual è il prossimo passo?", "Ci sono rischi che dovremmo conoscere?"] },
    ],
    icebreaker: "Inizia con un rompighiaccio di un minuto",
    minutes: "{count} minuti",
    agenda: "Agenda",
    template: "Template da pubblicare",
    copy: "Copia",
    copied: "Copiato",
    lines: {
      open: "Apertura: inizia in orario, anche se manca qualcuno",
      icebreaker: "Rompighiaccio: una domanda veloce, una frase a testa",
      round: "Giro: ognuno risponde, circa un minuto a testa",
      column: "{column}: cosa è fermo, cosa viene dopo",
      blockers: "Blocchi: decidete chi aiuta e parlatene dopo",
      close: "Chiusura: ciò che tutti devono sapere",
    },
    columns: ["Bloccato", "In revisione", "In corso", "Prossimo"],
    note: {
      live: "Circa un minuto a persona, un po' meno in un team più grande, più un minuto per aprire e chiudere. Quindici minuti al massimo: oltre, è una riunione, non uno standup.",
      async: "Chiedi a tutti di pubblicare entro la stessa ora ogni mattina, nel proprio fuso orario, di leggere gli aggiornamenti degli altri e di rispondere in un thread a ogni blocco.",
      board: "Scorri la board da destra: prima il lavoro più vicino alla fine, così il team chiude le cose prima di iniziarne di nuove. Cinque minuti più circa uno a persona.",
    },
  },
  sections: [
    {
      title: "A cosa serve il daily standup",
      body: [
        "Il daily standup è una riunione breve, di solito a inizio giornata, in cui ognuno nel team dice su cosa sta lavorando e se qualcosa lo blocca. Nasce nei team software agili, dove si chiama anche daily scrum, ma funziona per qualsiasi piccolo team in cui il lavoro di uno dipende da quello degli altri.",
        "Non è un report di stato per il responsabile. Lo scopo è che il team veda insieme la giornata: chi fa cosa, dove due attività si incrociano e chi ha bisogno di aiuto. Se uno standup sblocca qualcuno, è servito; se è un giro di recite che nessuno ascolta, no.",
      ],
    },
    {
      title: "Tre modi di farlo",
      items: [
        {
          title: "In call",
          detail: "Il classico",
          body: "Tutti si collegano alla stessa ora e rispondono a turno alle stesse tre domande. Ideale per team in fusi orari vicini a cui piace vedersi una volta al giorno. Circa un minuto a persona.",
        },
        {
          title: "Per iscritto",
          detail: "Standup asincrono",
          body: "Ognuno pubblica le proprie risposte nella chat del team entro un'ora fissa e legge quelle degli altri. Ideale per team su più fusi orari, o con già tante riunioni. Si perde la conversazione, quindi prendete l'abitudine di rispondere a ogni blocco.",
        },
        {
          title: "Scorrendo la board",
          detail: "Prima il lavoro, poi le persone",
          body: "Invece di fare il giro delle persone, scorrete la board delle attività colonna per colonna, partendo dal lavoro più vicino alla fine. Ideale per team con una board piena, dove la domanda è cosa è fermo più che cosa ha fatto ciascuno.",
        },
      ],
    },
    {
      title: "Le tre domande dello standup",
      body: [
        "Le tre classiche sono: cosa hai fatto ieri, cosa farai oggi e se c'è qualcosa che ti blocca. Funzionano, ma invitano a elencare tutto ciò che si è toccato. Se i vostri standup si allungano, provate un set più mirato:",
      ],
      items: [
        {
          title: "Classiche",
          body: "Cosa hai fatto ieri? Cosa farai oggi? C'è qualcosa che ti blocca? Familiari a tutti, e vanno bene per un team nuovo.",
        },
        {
          title: "Priorità",
          body: "Qual è la tua priorità di oggi? Cosa potrebbe fermarla? Di chi hai bisogno per un aiuto? Risposte più brevi, e l'ultima domanda trasforma i blocchi in richieste.",
        },
        {
          title: "Avanzamento",
          body: "Cosa è andato avanti? Qual è il prossimo passo? Ci sono rischi? Parlano del lavoro più che della persona, e si abbinano bene alla board.",
        },
      ],
    },
    {
      title: "Un'agenda per il daily standup, minuto per minuto",
      body: [
        "Per un team di sei persone in call, uno standup dura circa otto minuti. Iniziate in orario, anche se manca qualcuno: aspettare insegna a tutti ad arrivare tardi. Poi fate il giro in un ordine fisso, quello in cui le persone compaiono sullo schermo o alfabetico, così nessuno si chiede quando tocca a lui.",
        "Quando qualcuno solleva un problema, non risolvetelo nello standup. Annotate chi può aiutare e accordatevi per parlarne subito dopo, solo con le persone che servono. Questa sola abitudine tiene lo standup sotto i dieci minuti. Chiudete chiedendo se c'è qualcosa che tutti devono sapere, poi terminate la call.",
      ],
      table: {
        head: ["Dimensione del team", "In call", "Scorrendo la board"],
        rows: [
          ["3 persone", "5 minuti", "8 minuti"],
          ["6 persone", "8 minuti", "11 minuti"],
          ["8 persone", "10 minuti", "13 minuti"],
          ["12 persone", "11 minuti", "15 minuti"],
          ["15 persone", "14 minuti", "15 minuti"],
        ],
        note: "Calcolato come fa lo strumento qui sopra: circa un minuto a persona (tre quarti di minuto oltre le otto persone) più due per aprire e chiudere, e mai più di quindici.",
      },
    },
    {
      title: "Come fare uno standup asincrono",
      body: [
        "Uno standup asincrono sono le stesse tre domande, con risposte scritte. Scegliete un canale e un orario, per esempio le 10 nel fuso orario di ciascuno, e chiedete a tutti di pubblicare le risposte in un unico messaggio, con il template qui sopra, così si leggono al volo.",
        "Due cose lo fanno funzionare. Primo, leggete gli aggiornamenti degli altri: uno standup asincrono che nessuno legge è un diario. Secondo, rispondete in un thread a ogni blocco, in giornata. Alcuni team tengono anche una breve call a settimana, per continuare a vedersi.",
      ],
    },
    {
      title: "Errori comuni nello standup",
      items: [
        { title: "Diventa una sessione di problem solving", body: "Qualcuno solleva un problema e tre persone iniziano a risolverlo. Annotatelo, decidete chi ne parla dopo e andate avanti." },
        { title: "È un report al responsabile", body: "Se tutti guardano il responsabile mentre parlano, lo standup è per la persona sbagliata. Parlate al team." },
        { title: "Troppe persone", body: "Oltre una dozzina di persone, nessuno ascolta più tutti. Dividetevi in standup più piccoli per progetto o per flusso di lavoro." },
        { title: "Iniziare in ritardo", body: "Aspettare cinque minuti l'ultima persona costa cinque minuti a tutti gli altri, ogni giorno. Iniziate in orario." },
        { title: "Dire \"nessun blocco\" ogni giorno", body: "Se nessuno è mai bloccato, fate una domanda più mirata: \"Cosa potrebbe fermare la tua priorità di oggi?\" di solito trova qualcosa." },
      ],
    },
  ],
  fit: {
    title: "Fate lo standup sul piano",
    body: "TinyFloor è un ufficio virtuale per piccoli team: vedi chi è alla scrivania, e lo standup è due passi fino alla sala riunioni invece dell'ennesimo link. Dopo, raggiungi chi è bloccato. Funziona in una scheda del browser, gratis fino a 3 persone e 29 $ al mese per tutto il team.",
    cta: "Prova l'ufficio demo",
  },
  faqTitle: "Domande <em>frequenti.</em>",
  faq: [
    {
      q: "Quali sono le tre domande del daily standup?",
      a: "Cosa hai fatto ieri? Cosa farai oggi? C'è qualcosa che ti blocca? Una versione più mirata: Qual è la tua priorità di oggi? Cosa potrebbe fermarla? Di chi hai bisogno per un aiuto?",
    },
    {
      q: "Quanto deve durare un daily standup?",
      a: "Circa un minuto a persona, più un paio di minuti per aprire e chiudere: intorno agli otto minuti per un team di sei. Quindici minuti al massimo.",
    },
    {
      q: "Cos'è un template per il daily standup?",
      a: "Un'agenda fissa per la riunione, o un formato di messaggio per uno standup scritto: le stesse tre domande, nello stesso ordine, ogni giorno, così gli aggiornamenti sono veloci da dare e facili da leggere.",
    },
    {
      q: "Cos'è uno standup asincrono?",
      a: "Uno standup fatto per iscritto: ognuno pubblica le risposte alle tre domande nella chat del team entro un'ora fissa e legge quelle degli altri. È adatto ai team su più fusi orari.",
    },
    {
      q: "Il daily standup è solo per i team Scrum?",
      a: "No. Nasce nei team software agili, dove si chiama daily scrum, ma qualsiasi piccolo team il cui lavoro dipende da quello degli altri può usarlo.",
    },
    {
      q: "Questo strumento per il daily standup è gratuito?",
      a: "Sì, e funziona interamente nel tuo browser: niente di ciò che scegli viene inviato da nessuna parte. Copia l'agenda o il template nell'invito del calendario o nella chat del team.",
    },
  ],
};

export default it;
