import type { TimeZonesContent } from "@/lib/tools/time-zones";

const it: TimeZonesContent = {
  meta: {
    title: "Pianificatore di riunioni tra fusi orari per team da remoto",
    description:
      "Aggiungi città e orario di lavoro di ogni persona del team per vedere quando lavorano tutti insieme, o l’ora che va bene a più persone quando nessuna va bene a tutti. Tiene conto dell’ora legale e delle mezz’ore, come in India.",
  },
  eyebrow: "Strumenti gratuiti",
  updated: "Aggiornato il",
  title: "Quando gli orari del tuo team <em>si sovrappongono.</em>",
  intro:
    "Aggiungi città e orario di lavoro di ogni persona. Il pianificatore mostra le ore in cui lavorano tutti insieme, nell’ora di ciascuno, e, quando nessuna ora va bene a tutti, quella che va bene a più persone. Usa i fusi orari di oggi, quindi l’ora legale è inclusa.",
  planner: {
    zone: "Fuso orario",
    hours: "Orario di lavoro",
    remove: "Rimuovi",
    add: "Aggiungi una persona",
    addMine: "Aggiungi il mio fuso",
    timesIn: "Orari a {city}",
    working: "Al lavoro",
    all: "Tutti",
    everyone: "Tutti lavorano dalle {from} alle {to}, ora di {city}.",
    best: "Nessun orario va bene a tutti. Dalle {from} alle {to}, ora di {city}, va bene a {count} su {total}.",
    nobody: "Gli orari di lavoro non si sovrappongono.",
    eachLocal: "Nell’ora di ciascuno:",
  },
  sections: [
    {
      title: "Quanta sovrapposizione serve a un team",
      body: [
        "Meno di quanto si pensi. Da due a quattro ore in comune al giorno bastano per una riunione quotidiana, per le domande più veloci da fare a voce che da scrivere e per una riunione quando serve. Tutto il resto può passare per iscritto, nell’orario di ciascuno.",
        "Il problema è non avere nessuna ora in comune, o averla solo perché qualcuno lavora alle 7 o alle 22 ogni giorno. Se il pianificatore mostra un tratto in comune solo al limite della giornata di qualcuno, è quella persona a pagare per le riunioni del team.",
      ],
    },
    {
      title: "Trovare un orario equo",
      items: [
        {
          title: "Riunirsi nelle ore in comune",
          body: "Mettete la riunione quotidiana e quelle ricorrenti nel tratto che mostra il pianificatore, e lasciate il resto delle ore in comune libero per le domande veloci. Il tempo condiviso è la cosa più scarsa che ha un team distribuito.",
        },
        {
          title: "Far ruotare l’orario scomodo",
          body: "Quando l’unico orario possibile è presto per alcuni e tardi per altri, alternatelo di settimana in settimana, così non sono sempre gli stessi a collegarsi la sera.",
        },
        {
          title: "Meno riunioni, e più brevi",
          body: "Una riunione quotidiana di 15 minuti entra in quasi ogni sovrapposizione; una di un’ora di solito no. Chiedetevi se una riunione potrebbe essere un aggiornamento scritto prima di cercarle un orario.",
        },
        {
          title: "Mettere per iscritto l’esito",
          body: "Chi non c’era deve potersi aggiornare in due minuti: poche righe su cosa si è deciso e chi fa cosa, pubblicate dove il team legge già.",
        },
        {
          title: "Mostrare il proprio orario",
          body: "Metti il tuo orario di lavoro nel calendario e nello stato, così nessuno deve calcolare se è il momento giusto per chiederti qualcosa.",
        },
      ],
    },
    {
      title: "Quando non c’è sovrapposizione",
      items: [
        { title: "Riunioni quotidiane scritte", body: "Ognuno pubblica cosa ha fatto, cosa viene dopo e cosa lo blocca all’inizio della sua giornata. Gli altri lo leggono all’inizio della loro." },
        { title: "Due riunioni più piccole", body: "Dividete il team per area geografica per le riunioni dal vivo, con una persona presente in entrambe, o le note condivise, per portare l’essenziale da una parte all’altra." },
        { title: "Passaggio di consegne a fine giornata", body: "Quando la sera di uno è la mattina di un altro, una breve nota a fine giornata fa andare avanti il lavoro mentre il primo dorme." },
        { title: "Un’ora in comune a settimana", body: "Anche un team senza sovrapposizione quotidiana può trovare un’ora a settimana in cui tutti fanno un piccolo sforzo, facendo ruotare chi ne fa di più." },
      ],
    },
    {
      title: "L’ora legale sposta la sovrapposizione",
      body: [
        "Gli orologi cambiano in date diverse nei diversi paesi, quindi le ore in comune di un team possono spostarsi di un’ora per qualche settimana ogni primavera e autunno. Gli Stati Uniti cambiano la seconda domenica di marzo e la prima di novembre; l’Europa l’ultima domenica di marzo e di ottobre. Australia, Nuova Zelanda e Cile cambiano al contrario, nella loro primavera. India, Cina, Giappone, Brasile e Messico non cambiano.",
        "Il pianificatore calcola il fuso di ogni città per oggi, quindi ricontrollalo intorno a quelle date se la sovrapposizione del tuo team è stretta.",
      ],
    },
    {
      title: "Come fa il calcolo",
      body: [
        "Prende la giornata, a mezz’ore, nell’ora della prima persona, calcola che ora è per ciascuna delle altre con i dati dei fusi orari del tuo browser e conta chi è nel proprio orario di lavoro. Le mezz’ore contano per l’India, avanti di cinque ore e mezza rispetto all’UTC. Gli orari che superano la mezzanotte, come dalle 22 alle 6, funzionano anche loro, e tutto gira nel tuo browser.",
      ],
    },
  ],
  fit: {
    title: "Sfrutta le ore in comune",
    body: "TinyFloor è un ufficio virtuale per team da remoto. Nelle ore che condividete, tutti quelli presenti sono sullo stesso piano, e una domanda è andare alla scrivania di qualcuno invece di fissare una chiamata. È gratis fino a 3 persone e costa 29 $ al mese per tutto il team.",
    cta: "Prova l’ufficio demo",
  },
  faqTitle: "Domande <em>frequenti.</em>",
  faq: [
    {
      q: "Come trovo un orario di riunione tra fusi orari diversi?",
      a: "Annota città e orario di lavoro di ogni persona e cerca le mezz’ore in cui lavorano tutti insieme. Il pianificatore qui sopra lo fa per un massimo di 12 persone e mostra il risultato nell’ora di ciascuna.",
    },
    {
      q: "Quante ore in comune servono a un team da remoto?",
      a: "Da due a quattro ore al giorno bastano alla maggior parte dei team: abbastanza per una riunione quotidiana, domande veloci e qualche riunione ogni tanto. Il resto del lavoro può essere scritto e fatto nell’orario di ciascuno.",
    },
    {
      q: "Qual è un orario equo per una riunione tra fusi orari?",
      a: "Uno che rientri nell’orario di lavoro di tutti. Se non c’è, fate ruotare l’orario presto o tardi di settimana in settimana, così non tocca sempre agli stessi.",
    },
    {
      q: "E se il mio team non ha nessuna ora in comune?",
      a: "Lavorate per iscritto: riunioni quotidiane scritte all’inizio della giornata di ciascuno, una nota di passaggio di consegne alla fine e riunioni dal vivo divise per area. La maggior parte dei team trova comunque un’ora in comune a settimana.",
    },
    {
      q: "Il pianificatore tiene conto dell’ora legale?",
      a: "Sì. Usa il fuso di ogni città per oggi, dai dati dei fusi orari del tuo browser, quindi l’ora legale è inclusa. Ricontrolla a fine marzo e a fine ottobre, quando gli orologi cambiano in date diverse.",
    },
  ],
};

export default it;
