import type { OfficeCostsContent } from "@/lib/tools/office-costs";

const it: OfficeCostsContent = {
  meta: {
    title: "Calcolatore di costi dell’ufficio virtuale: quanto costano 9 strumenti al tuo team",
    description:
      "Inserisci quante persone ha il tuo team e scopri quanto costano al mese Gather, SoWork, Kumospace, WorkAdventure, SpatialChat, Roam, oVice, Sococo e TinyFloor, con fatturazione annuale o mensile, secondo la pagina prezzi di ciascuno.",
  },
  eyebrow: "Strumenti gratuiti",
  updated: "Prezzi verificati il",
  title: "Quanto costa un ufficio virtuale <em>al tuo team.</em>",
  intro:
    "La maggior parte degli uffici virtuali fa pagare a persona, alcuni a spazio o a ufficio, e i piani gratuiti si fermano a dimensioni diverse. Inserisci quante persone ci sono nel tuo team per vedere quanto costa al mese ciascuno di nove strumenti, dal più economico.",
  calculator: {
    people: "Persone nel team",
    count: "{count} persone",
    billing: { yearly: "Fatturazione annuale", monthly: "Fatturazione mensile" },
    product: "Prodotto",
    free: "Piano gratuito",
    price: "Piano a pagamento",
    perMonth: "{amount} al mese",
    perYear: "{amount} all’anno",
    only: { yearly: "solo annuale", monthly: "solo mensile" },
    noFree: "Nessun piano gratuito",
    fits: "Gratis a questa dimensione",
    upTo: "Fino a {count} persone",
    pricingPage: "Pagina prezzi",
    basis: {
      office: "Un prezzo per l’ufficio",
      member: "A membro",
      activeMember: "A membro attivo",
      space: "A spazio",
      seat: "A postazione, minimo 10",
    },
    limits: {
      everyFeature: "tutte le funzioni",
      thirtyMinutes: "riunioni da 30 minuti",
      oneFloor: "un piano",
      atOnce: "in contemporanea",
      twoHours: "2 ore al giorno",
      preRelease: "versione preliminare, senza assistenza",
    },
    summary: "Per {count} persone, i piani a persona vanno da {low} a {high} al mese. TinyFloor costa {tinyfloor}.",
    summaryLarge: "Per {count} persone, i piani a persona vanno da {low} a {high} al mese.",
  },
  sections: [
    {
      title: "Come fanno pagare gli uffici virtuali",
      body: ["In quattro modi, e quello che usa uno strumento decide quanto paga un team che cresce più del prezzo in vetrina."],
      items: [
        {
          title: "A membro",
          detail: "Gather, SoWork, Kumospace, WorkAdventure, SpatialChat",
          body: "Paghi per chiunque abbia un account, ogni mese, che entri o no. Il conto cresce a ogni assunzione: un team di 10 paga il doppio di uno di 5.",
        },
        {
          title: "A membro attivo",
          detail: "Roam",
          body: "Paghi per chi l’ha usato quel mese. Chi è in ferie non costa nulla, ma la maggior parte dei team è attiva ogni mese, quindi in pratica funziona come a membro.",
        },
        {
          title: "A spazio o a blocco di postazioni",
          detail: "oVice, Sococo",
          body: "Paghi uno spazio pensato per un certo numero di persone, o un blocco minimo di postazioni. Conveniente se il tuo team lo riempie, caro se no: Sococo fa pagare 10 postazioni anche se siete in 4.",
        },
        {
          title: "Un prezzo per l’ufficio",
          detail: "TinyFloor",
          body: "Un solo prezzo qualunque sia il numero di persone, fino alla dimensione che il piano accoglie. Aggiungere qualcuno non costa nulla, quindi nessuno deve decidere se un collaboratore esterno vale una postazione.",
        },
      ],
    },
    {
      title: "Fatturazione annuale o mensile",
      body: [
        "La maggior parte degli strumenti a persona sconta dal 10 al 20% a chi paga un anno in anticipo: Gather costa 12 $ a membro con fatturazione annuale e 15 $ con quella mensile. È un impegno di un anno per un team la cui dimensione può cambiare, e lo sconto si perde se smettete dopo tre mesi.",
        "Alcuni fatturano in un solo modo: Roam e TinyFloor al mese, Sococo all’anno. Il calcolatore li mostra al prezzo che hanno e lo indica.",
      ],
    },
  ],
  table: {
    title: "Quanto paga al mese un team di 5, 10 o 15",
    body: [
      "Gli stessi prezzi in tre dimensioni comuni, con fatturazione annuale dove lo strumento la offre, perché è il prezzo più basso. I piani gratuiti qui non contano; il calcolatore sopra mostra quali bastano.",
    ],
    product: "Prodotto",
    note: "Prezzi in dollari statunitensi IVA esclusa, dalla pagina prezzi di ciascun prodotto. Sococo fa pagare almeno 10 postazioni; oVice passa da Entry-S a Entry-M oltre circa 10 membri abituali.",
  },
  after: [
    {
      title: "Quando basta un piano gratuito",
      body: [
        "Un piano gratuito in cui sta tutto il team batte qualsiasi piano a pagamento, quindi guarda i limiti prima del prezzo. Quello di SoWork copre 10 membri ma chiude ogni riunione dopo 30 minuti. Quello di WorkAdventure copre 10 persone collegate in contemporanea. Quello di SpatialChat dà a 12 persone due ore di riunioni al giorno, che bastano per un incontro settimanale, non per un ufficio aperto tutto il giorno. Quello di Kumospace copre 5 membri su un piano, e quello di TinyFloor 3 persone con tutte le funzioni. Il piano gratuito di oVice gira su una versione preliminare senza assistenza.",
      ],
    },
    {
      title: "Cosa il prezzo non mostra",
      items: [
        {
          title: "Cosa c’è nel piano",
          body: "Il piano più economico non è sempre quello che usereste. SoWork Basic ha due registrazioni di riunioni; registrazioni e note con IA sono in Premium, a 12 $ a membro. Gather include registrazione e trascrizione. TinyFloor non ha registrazioni né note con IA.",
        },
        {
          title: "Ospiti",
          body: "Clienti e collaboratori che passano ogni tanto possono contare come membri in alcuni strumenti. Gather e oVice permettono di invitare ospiti senza pagarli; controlla prima di aggiungere chi viene solo in visita.",
        },
        { title: "Tasse", body: "Tutti i prezzi qui sono IVA esclusa. A seconda di dove vi trovate, l’IVA o l’imposta sulle vendite si aggiunge al pagamento." },
        {
          title: "Prove gratuite",
          body: "Gather ha una prova di 30 giorni, Roam e oVice di 14, SoWork di 7. La prova ti dice se il team lo userà; il prezzo, se continuerete a pagare.",
        },
      ],
    },
    {
      title: "Come abbiamo verificato",
      body: [
        "Ogni prezzo viene dalla pagina prezzi del prodotto stesso, collegata nel calcolatore, letta nel mese indicato in alto. Usiamo il piano che un piccolo team comprerebbe per un ufficio aperto tutto il giorno, non piani per eventi o aziendali. Dove una pagina indica un solo periodo di fatturazione, mostriamo quello. I prezzi cambiano, quindi controlla la pagina prezzi prima di acquistare; noi ricontrolliamo ogni pochi mesi.",
      ],
    },
  ],
  fit: {
    title: "Un prezzo per tutto il team",
    body: "TinyFloor è un ufficio nel browser per piccoli team: vai da qualcuno per parlare, c’è una sala riunioni, la chat e la condivisione dello schermo. È gratis fino a 3 persone, poi costa 29 $ al mese per tutto il team, in quanti che siate. Non ha registrazioni né note con IA; se vi servono, Gather o SoWork Premium fanno più al caso vostro.",
    cta: "Prova l’ufficio demo",
  },
  faqTitle: "Domande <em>frequenti.</em>",
  faq: [
    {
      q: "Quanto costa un ufficio virtuale al mese?",
      a: "Per un team di 10 con un piano a pagamento, da 29 $ a 195 $ al mese a seconda dello strumento: TinyFloor costa 29 $ per tutto l’ufficio, gli strumenti a persona vanno da 54 $ (SoWork Basic, fatturazione annuale) a 195 $ (Roam).",
    },
    {
      q: "Qual è l’ufficio virtuale più economico per un piccolo team?",
      a: "Un piano gratuito che basti: quello di SoWork copre 10 membri con riunioni da 30 minuti, quello di WorkAdventure 10 persone in contemporanea, quello di Kumospace 5 membri e quello di TinyFloor 3 persone. Oltre, TinyFloor, a 29 $ al mese per tutto il team, è il prezzo a pagamento più basso da 6 persone in su.",
    },
    {
      q: "Gather è gratis?",
      a: "No. Gather ha eliminato il piano gratuito nel 2025. Dopo una prova di 30 giorni costa 12 $ a membro al mese con fatturazione annuale o 15 $ con quella mensile, quindi un team di 10 paga da 120 $ a 150 $ al mese.",
    },
    {
      q: "Meglio un prezzo a persona o un prezzo fisso?",
      a: "A persona costa meno per un team di 2 o 3, dove il prezzo a testa è basso. Il prezzo fisso vince man mano che il team cresce, e non costa mai di più quando aggiungete un collaboratore o una nuova assunzione.",
    },
    {
      q: "I prezzi degli uffici virtuali includono le tasse?",
      a: "No. I prezzi sulle pagine prezzi degli strumenti, e qui, sono IVA esclusa; l’IVA o l’imposta sulle vendite si aggiunge al pagamento a seconda di dove vi trovate.",
    },
  ],
};

export default it;
