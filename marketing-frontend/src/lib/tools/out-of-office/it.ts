import type { OooContent } from "@/lib/tools/out-of-office";

/** Il generatore di messaggi fuori sede in italiano, scritto a partire dalla pagina inglese. */
const it: OooContent = {
  meta: {
    title: "Generatore di messaggi fuori sede: esempi e modelli gratuiti",
    description:
      "Scrivi in pochi secondi la risposta automatica per l'email e uno stato per Slack o Teams, per ferie, malattia, trasferte e altro. Esempi e guida per Outlook e Gmail.",
  },
  eyebrow: "Strumento gratuito",
  updated: "Aggiornato il",
  title: "Generatore di <em>messaggi fuori sede.</em>",
  intro:
    "Indica perché sei assente, quando torni e chi può aiutare nel frattempo, e ottieni una risposta automatica per l'email e un breve stato per la chat del team, pronti da incollare. Più sotto: esempi per ogni situazione e come attivare il messaggio in Outlook, Gmail, Slack e Teams.",
  writer: {
    reason: "Motivo dell'assenza",
    reasons: { vacation: "Ferie", sick: "Malattia", travel: "Trasferta", parental: "Congedo parentale", holiday: "Festività" },
    back: "Di ritorno il",
    unknown: "Lascia vuoto se non lo sai ancora.",
    name: "Il tuo nome",
    contact: "Chi contattare invece",
    email: "La sua email",
    optional: "(facoltativo)",
    tone: "Tono",
    tones: { professional: "Formale", friendly: "Cordiale", short: "Breve" },
    emailTitle: "Risposta automatica email",
    statusTitle: "Stato per Slack, Teams o TinyFloor",
    statusNote: "Al massimo 100 caratteri, così entra in uno stato di Slack.",
    copy: "Copia",
    copied: "Copiato",
  },
  sections: [
    {
      title: "Esempi di messaggi fuori sede",
      body: [
        "Ogni buon messaggio fuori sede dice tre cose: che sei assente, quando tornerai e chi contattare se non si può aspettare. Ecco come suona nelle situazioni più comuni; il generatore qui sopra scrive la stessa cosa con le tue date e i tuoi nomi.",
      ],
      items: [
        {
          title: "Ferie",
          detail: "Ferie annuali",
          body: "\"Grazie per il messaggio. Sono in ferie e fuori sede fino a lunedì 2 novembre. Risponderò al mio rientro. Per questioni urgenti, contatti Ana Lima (ana@example.com).\"",
        },
        {
          title: "Malattia",
          detail: "Breve e riservato",
          body: "\"Grazie per il messaggio. Oggi sono fuori sede e risponderò appena possibile. Per questioni urgenti, contatti Ana Lima.\" Dire che stai male è facoltativo; non devi spiegazioni a nessuno.",
        },
        {
          title: "Trasferta o conferenza",
          detail: "Più lento, non assente",
          body: "\"Grazie per il messaggio! Sono in trasferta di lavoro fino a giovedì 5 novembre e controllo l'email meno del solito. Ti rispondo al mio rientro. Se non può aspettare, Ana Lima può aiutarti.\"",
        },
        {
          title: "Congedo parentale",
          detail: "Assenza lunga",
          body: "\"Grazie per il messaggio. Sono in congedo parentale fino al 2 febbraio e non controllerò l'email. Per qualsiasi questione sui miei progetti, contatti Ana Lima (ana@example.com), che mi sostituisce.\" Per un'assenza lunga, indica una persona, non solo una data.",
        },
        {
          title: "Festività",
          detail: "Per tutto il team",
          body: "\"Grazie per il messaggio. I nostri uffici sono chiusi per la festività fino a martedì 3 novembre. Risponderemo al nostro rientro.\"",
        },
        {
          title: "La versione breve",
          detail: "Per i colleghi",
          body: "\"In ferie fino al 3 novembre. Urgente? Scrivi ad Ana Lima.\" Dentro la tua azienda, più breve di solito è meglio.",
        },
      ],
    },
    {
      title: "Come impostare il messaggio fuori sede in Outlook",
      body: [
        "Nel nuovo Outlook e in Outlook sul web, apri le Impostazioni (l'icona a ingranaggio), vai su Account e poi su Risposte automatiche. Attiva le risposte automatiche, spunta l'opzione per inviarle solo in un determinato periodo, imposta data di inizio e di fine e incolla il messaggio. Puoi scrivere un messaggio diverso per chi è fuori dalla tua organizzazione, ed è una buona idea: i colleghi hanno bisogno di meno spiegazioni dei clienti.",
        "Nel classico Outlook per Windows, vai su File e poi su Risposte automatiche e inserisci gli stessi dati. Se imposti una data di fine, Outlook disattiva le risposte da solo, quindi non devi ricordarti di farlo.",
      ],
    },
    {
      title: "Come impostare il messaggio fuori sede in Gmail",
      body: [
        "In Gmail, fai clic sull'ingranaggio e poi su Visualizza tutte le impostazioni. Nella scheda Generali, scorri fino a Risposta automatica, attivala, imposta il primo e l'ultimo giorno, aggiungi un oggetto come \"Fuori sede fino al 3 novembre\", incolla il messaggio e fai clic su Salva modifiche in fondo alla pagina.",
        "Gmail invia la risposta automatica una sola volta a ogni persona in un periodo di quattro giorni, non a ogni messaggio, quindi chi scrive due volte non la riceve due volte. Puoi anche scegliere di inviarla solo ai tuoi contatti, o solo a chi è nella tua organizzazione con un account di lavoro.",
      ],
    },
    {
      title: "Fuori sede su Slack e Microsoft Teams",
      body: [
        "Le chat di team non inviano risposte automatiche, quindi è uno stato a fare il lavoro: compare accanto al tuo nome ovunque qualcuno provi a scriverti. Su Slack, fai clic sulla tua foto profilo, scegli Aggiorna il tuo stato, aggiungi un'emoji e una riga breve come \"🌴 In ferie fino al 3 nov\", e impostalo perché si cancelli al tuo rientro. Mettere in pausa le notifiche per le stesse date tiene tranquillo anche il telefono.",
        "In Microsoft Teams, fai clic sulla tua foto profilo e scegli Imposta messaggio di stato. Scrivi il messaggio e imposta quando deve sparire. Nella stessa finestra c'è un link per pianificare il fuori sede, che attiva insieme la risposta automatica di Outlook e lo stato di Teams. Lo stato del generatore qui sopra è abbastanza breve per entrambi.",
      ],
    },
    {
      title: "Cosa deve contenere un buon messaggio fuori sede",
      items: [
        { title: "Quando torni", body: "Una data, non \"la prossima settimana\". Se non la sai ancora, scrivi che risponderai appena rientri." },
        { title: "Chi può aiutare", body: "Un nome, e un'email se è qualcuno fuori dalla conversazione. Chiediglielo prima: a nessuno piace scoprire da un cliente che ti sta sostituendo." },
        { title: "Non troppi dettagli", body: "\"Fuori sede\" basta. Dove sei e perché non riguarda nessuno, e una meta delle vacanze in una risposta automatica dice a degli sconosciuti che casa tua è vuota." },
        { title: "Niente promesse che non manterrai", body: "\"Risponderò al mio rientro\" va bene. \"Risponderò a ogni email\" dopo due settimane di assenza di solito non è vero." },
        { title: "Disattivalo", body: "Imposta una data di fine in Outlook o Gmail, e un orario di scadenza per lo stato in chat, così nessuno legge che sei assente il giorno in cui torni." },
      ],
    },
  ],
  fit: {
    title: "Le assenze, integrate nell'ufficio",
    body: "In TinyFloor, un ufficio virtuale per piccoli team, una nota di stato come \"🌴 In ferie fino a lunedì\" resta sul tuo nome, così il team lo sa prima di provare a contattarti, e si cancella da sola il giorno stesso. Funziona in una scheda del browser, gratis fino a 3 persone e 29 $ al mese per tutto il team.",
    cta: "Prova l'ufficio demo",
  },
  faqTitle: "Domande <em>frequenti.</em>",
  faq: [
    {
      q: "Cosa deve dire un messaggio fuori sede?",
      a: "Che sei assente, quando tornerai e chi contattare in caso di urgenza. Per esempio: \"Sono fuori sede fino a lunedì 2 novembre. Per questioni urgenti, contatti Ana Lima.\"",
    },
    {
      q: "Come imposto il messaggio fuori sede in Outlook?",
      a: "Nel nuovo Outlook o in Outlook sul web: Impostazioni, Account, Risposte automatiche. Nel classico Outlook per Windows: File, Risposte automatiche. Attivale, imposta le date e incolla il messaggio.",
    },
    {
      q: "Come imposto il messaggio fuori sede in Gmail?",
      a: "Fai clic sull'ingranaggio, Visualizza tutte le impostazioni, e nella scheda Generali attiva la Risposta automatica. Imposta date, oggetto e messaggio, poi fai clic su Salva modifiche.",
    },
    {
      q: "Devo dire perché sono fuori sede?",
      a: "No. \"Fuori sede\" basta. Dire che sei in ferie è comune e va benissimo, ma non devi mai dare dettagli, soprattutto se stai male.",
    },
    {
      q: "Com'è un messaggio fuori sede formale?",
      a: "\"Grazie per il messaggio. Sono fuori sede fino a lunedì 2 novembre e risponderò al mio rientro. Per questioni urgenti, contatti Ana Lima (ana@example.com).\"",
    },
    {
      q: "Questo generatore di messaggi fuori sede è gratuito?",
      a: "Sì, e funziona interamente nel tuo browser: nomi, date ed email che scrivi non vengono mai inviati da nessuna parte. Copia il messaggio in Outlook, Gmail, Slack o Teams.",
    },
  ],
};

export default it;
