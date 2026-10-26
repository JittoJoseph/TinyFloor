import type { SantaContent } from "@/lib/tools/secret-santa";

/** The Secret Santa generator in Italian, written from the English page. */
const it: SantaContent = {
  meta: {
    title: "Secret Santa online: estrazione gratis, senza email né registrazione",
    description: "Esegui l'estrazione del Secret Santa in pochi secondi e invia a ciascuno un link privato che mostra a chi fare il regalo. Gratis, senza email né account, e pensato per i team che lavorano da remoto.",
  },
  eyebrow: "Strumento gratuito",
  updated: "Aggiornato il",
  title: "Secret Santa <em>online.</em>",
  intro: "Inserisci i nomi dei partecipanti, avvia l'estrazione e invia a ognuno il proprio link privato: mostrerà solo la persona a cui fare il regalo, senza svelare le altre associazioni. Senza email né account, funziona anche per i team distribuiti in tutto il mondo. Più sotto: come funziona il Secret Santa online, le regole e alcune idee regalo per i colleghi.",
  drawer: {
    names: "Nomi",
    namesHint: "Uno per riga, almeno tre. Aggiungi anche te se partecipi.",
    budget: "Budget",
    date: "Data dello scambio",
    optional: "(facoltativo)",
    draw: "Esegui l'estrazione",
    redraw: "Estrai di nuovo",
    redrawNote: "Rifare l'estrazione genera nuovi link. Invia solo quelli più recenti.",
    tooFew: "Aggiungi almeno tre nomi.",
    duplicate: "Ci sono due persone con lo stesso nome. Aggiungi un'iniziale così ognuno potrà trovare il proprio link.",
    linksTitle: "Link privati",
    linksNote: "Invia a ciascuna persona il proprio link, con un messaggio privato. Aprendolo scopriranno a chi devono fare il regalo.",
    copy: "Copia link",
    copied: "Copiato",
    copyAll: "Copia tutti i link",
    allIntro: "Secret Santa: apri solo il link con il tuo nome.",
    revealTitle: "Ciao {name}, sei il Secret Santa di…",
    show: "Mostra il nome",
    lookAway: "Assicurati che nessuno stia guardando il tuo schermo.",
    budgetLabel: "Budget",
    dateLabel: "Scambio",
    keepSecret: "Mantieni il segreto fino allo scambio.",
    own: "Estrai i nomi per il tuo gruppo",
  },
  sections: [
    {
      title: "Come funziona il Secret Santa online",
      items: [
        {
          title: "Raccogli i nomi",
          body: "Chiedi chi vuole partecipare. Al lavoro la partecipazione dovrebbe essere facoltativa: un Secret Santa forzato non è divertente per nessuno.",
        },
        {
          title: "Stabilisci un budget e una data",
          body: "Una cifra chiara fin da subito, così nessuno spenderà il triplo di chi deve fargli il regalo. La data indica il giorno in cui si apriranno i regali.",
        },
        { title: "Estrai i nomi", body: "Inserisci i nomi qui sopra ed effettua l'estrazione. Ognuno riceverà un nome e nessuno pescherà se stesso." },
        {
          title: "Invia i link",
          body: "Invia a ciascuna persona il proprio link con un messaggio diretto o via email. Anche chi organizza può partecipare: vedrai i link, non chi ha estratto chi.",
        },
        { title: "Aprite i regali insieme", body: "In videochiamata o alla festa, uno alla volta, cercando di indovinare chi sia il proprio Secret Santa." },
      ],
    },
    {
      title: "Secret Santa con un team da remoto",
      body: [
        "Quando il team lavora da città o paesi diversi, i regali devono viaggiare. La soluzione più semplice sono i regali digitali: una carta regalo, un e-book, un mese di un servizio di streaming o una donazione a nome della persona. Se invece si preferisce spedire qualcosa di fisico, chi organizza può raccogliere gli indirizzi di casa in privato e comunicarli solo a chi ne ha bisogno, oppure ognuno può ordinare da un negozio che effettua consegne nel paese del destinatario.",
        "Aprite i regali insieme durante una chiamata, idealmente come parte di una festa di fine anno. Le nostre [idee per feste virtuali di fine anno](/guides/virtual-holiday-party-ideas) includono un programma e dei giochi per l'occasione.",
      ],
    },
    {
      title: "Le regole del Secret Santa",
      items: [
        {
          title: "Rispetta il budget",
          body: "Spendere meno va bene, di più è fuori luogo. Il budget serve proprio a questo: un piccolo regalo, scelto con cura.",
        },
        {
          title: "Mantieni il segreto",
          body: "Non dire a nessuno chi hai estratto finché i regali non saranno aperti, e non chiedere agli altri chi hanno estratto.",
        },
        { title: "Scegli regali adatti al lavoro", body: "Niente di troppo personale o che possa imbarazzare qualcuno davanti ai colleghi." },
        {
          title: "Condividi un desiderio",
          body: "Se ognuno scrive un breve desiderio nella chat del team, come «Mi piacerebbe un buon libro», nessuno dovrà tirare a indovinare.",
        },
        { title: "Rendilo facoltativo", body: "Alcune persone non festeggiano o preferiscono non farlo. Sono comunque le benvenute alla festa." },
      ],
    },
    {
      title: "Idee regalo per il Secret Santa tra colleghi",
      body: [
        "Idee facili da spedire e adatte a quasi tutte le tasche:",
      ],
      items: [
        { title: "Caffè o tè", detail: "Sotto i 15 €", body: "Un pacchetto di caffè di una buona torrefazione locale o una selezione di tè." },
        { title: "Un libro", detail: "Sotto i 20 €", body: "Qualcosa che ti è piaciuto molto quest'anno, con un biglietto che spiega il perché." },
        { title: "Una pianta da scrivania", detail: "Sotto i 25 €", body: "Piccola, difficile da far morire e bella da vedere durante le chiamate." },
        {
          title: "Un buono regalo",
          detail: "Qualsiasi budget",
          body: "Per una libreria, una caffetteria o un servizio di consegna a domicilio nella zona in cui abita.",
        },
        { title: "Un bel taccuino", detail: "Sotto i 20 €", body: "Utile per chiunque scriva ancora le cose su carta." },
        {
          title: "Un mese di abbonamento a qualcosa",
          detail: "Sotto i 15 €",
          body: "Un abbonamento a musica, audiolibri o streaming, inviato come codice regalo.",
        },
        { title: "Un puzzle o un gioco", detail: "Sotto i 25 €", body: "Qualcosa per la sera o per tutta la famiglia." },
        {
          title: "Qualcosa della tua città",
          detail: "Sotto i 20 €",
          body: "Dolci locali o un piccolo oggetto tipico della tua zona. I team da remoto li adorano.",
        },
      ],
    },
  ],
  fit: {
    title: "Aprite i regali insieme",
    body: "TinyFloor è un ufficio virtuale per piccoli team. Aprite i regali nella sala riunioni con video e condivisione dello schermo, poi rimanete a chiacchierare alle vostre scrivanie, proprio come a una vera festa. È gratis fino a 3 persone e 29 $ al mese per tutto il team.",
    cta: "Prova l'ufficio demo",
  },
  faqTitle: "Domande <em>frequenti.</em>",
  faq: [
    {
      q: "Come funziona questo generatore di Secret Santa?",
      a: "Inserisci i nomi, fai l'estrazione e invia a ciascuno il link con il proprio nome. Aprendolo, ognuno vedrà a chi deve fare il regalo, con il budget e la data, se li hai impostati.",
    },
    {
      q: "Serve un indirizzo email o un account?",
      a: "No. Non c'è registrazione e non viene inviato nulla via email: invii tu i link, in chat, via email o con un messaggio.",
    },
    {
      q: "L'organizzatore può partecipare?",
      a: "Sì. L'organizzatore vede i link, non chi ha estratto chi, quindi aggiungi il tuo nome e apri solo il tuo link.",
    },
    { q: "Si può estrarre il proprio nome?", a: "No. A ogni persona viene assegnato qualcun altro, e ogni persona viene assegnata a un solo Secret Santa." },
    {
      q: "Come si fa il Secret Santa con un team da remoto?",
      a: "Fai l'estrazione online, invia a ciascuno un link privato, concorda un budget e scegli regali digitali o raccogli gli indirizzi in privato. Poi aprite i regali insieme in una videochiamata.",
    },
    {
      q: "Qual è un buon budget per il Secret Santa al lavoro?",
      a: "Una cifra che tutti possano spendere senza pensarci, spesso tra i 15 e i 30 €. Indica una cifra precisa nell'invito, così i regali avranno lo stesso valore.",
    },
    {
      q: "Questo generatore di Secret Santa è gratuito?",
      a: "Sì, senza limiti sul numero di persone. Funziona nel browser e i nomi viaggiano solo nei link che invii.",
    },
  ],
};

export default it;
