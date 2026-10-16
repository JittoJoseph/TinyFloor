import type { OfficeCostsContent } from "@/lib/tools/office-costs";

const no: OfficeCostsContent = {
  meta: {
    title: "Priskalkulator for virtuelle kontor: hva 9 verktøy koster teamet ditt",
    description:
      "Skriv inn hvor stort teamet ditt er, og se hva Gather, SoWork, Kumospace, WorkAdventure, SpatialChat, Roam, oVice, Sococo og TinyFloor koster i måneden, med års- eller månedsbetaling, ifølge prissiden til hver enkelt.",
  },
  eyebrow: "Gratis verktøy",
  updated: "Priser sjekket",
  title: "Hva et virtuelt kontor <em>koster teamet ditt.</em>",
  intro:
    "De fleste virtuelle kontor tar betalt per person, noen få per rom eller per kontor, og gratisplanene stopper ved ulike størrelser. Skriv inn hvor mange dere er i teamet for å se hva hvert av ni verktøy koster i måneden, billigst først.",
  calculator: {
    people: "Personer i teamet",
    count: "{count} personer",
    billing: { yearly: "Årlig betaling", monthly: "Månedlig betaling" },
    product: "Produkt",
    free: "Gratisplan",
    price: "Betalt plan",
    perMonth: "{amount} i måneden",
    perYear: "{amount} i året",
    only: { yearly: "bare årlig", monthly: "bare månedlig" },
    noFree: "Ingen gratisplan",
    fits: "Gratis i denne størrelsen",
    upTo: "Opptil {count} personer",
    pricingPage: "Prisside",
    basis: {
      office: "Én pris for kontoret",
      member: "Per medlem",
      activeMember: "Per aktivt medlem",
      space: "Per rom",
      seat: "Per plass, minst 10",
    },
    limits: {
      everyFeature: "alle funksjoner",
      thirtyMinutes: "møter på 30 minutter",
      oneFloor: "én etasje",
      atOnce: "samtidig",
      twoHours: "2 timer om dagen",
      preRelease: "forhåndsversjon, uten støtte",
    },
    summary: "For {count} personer koster planer per person {low} til {high} i måneden. TinyFloor koster {tinyfloor}.",
    summaryLarge: "For {count} personer koster planer per person {low} til {high} i måneden.",
  },
  sections: [
    {
      title: "Slik tar virtuelle kontor betalt",
      body: ["På fire måter, og hvilken et verktøy bruker, avgjør mer enn listeprisen hva et voksende team betaler."],
      items: [
        {
          title: "Per medlem",
          detail: "Gather, SoWork, Kumospace, WorkAdventure, SpatialChat",
          body: "Du betaler for alle med en konto, hver måned, enten de kommer inn eller ikke. Regningen vokser med hver ansettelse: et team på 10 betaler dobbelt så mye som et på 5.",
        },
        {
          title: "Per aktivt medlem",
          detail: "Roam",
          body: "Du betaler for dem som brukte det den måneden. Den som har permisjon, koster ingenting, men de fleste team er aktive hver måned, så i praksis fungerer det som per medlem.",
        },
        {
          title: "Per rom eller plasspakke",
          detail: "oVice, Sococo",
          body: "Du betaler for et rom beregnet for et visst antall personer, eller for en minstepakke plasser. Billig hvis teamet fyller det, dyrt hvis ikke: Sococo tar betalt for 10 plasser selv om dere er 4.",
        },
        {
          title: "Én pris for kontoret",
          detail: "TinyFloor",
          body: "Én pris uansett hvor mange dere er, opp til størrelsen planen tar. Det koster ingenting å legge til noen, så ingen må avgjøre om en frilanser er verdt en plass.",
        },
      ],
    },
    {
      title: "Årlig eller månedlig betaling",
      body: [
        "De fleste verktøy per person gir 10 til 20 % rabatt for å betale et år på forskudd: Gather koster 12 $ per medlem med årlig betaling og 15 $ med månedlig. Det er en forpliktelse for et år for et team der størrelsen kan endre seg, og rabatten er borte hvis dere slutter etter tre måneder.",
        "Noen tar bare betalt på én måte: Roam og TinyFloor månedlig, Sococo årlig. Kalkulatoren viser dem med prisen de har, og sier det.",
      ],
    },
  ],
  table: {
    title: "Hva et team på 5, 10 eller 15 betaler i måneden",
    body: [
      "De samme prisene ved tre vanlige størrelser, med årlig betaling der verktøyet tilbyr det, siden det er den laveste prisen. Gratisplaner telles ikke her; kalkulatoren over viser hvilke som passer.",
    ],
    product: "Produkt",
    note: "Priser i amerikanske dollar uten avgifter, fra prissiden til hvert produkt. Sococo tar betalt for minst 10 plasser; oVice går fra Entry-S til Entry-M ved rundt 10 faste medlemmer.",
  },
  after: [
    {
      title: "Når en gratisplan er nok",
      body: [
        "En gratisplan som rommer hele teamet, slår enhver betalt plan, så sjekk grensene før prisen. SoWorks dekker 10 medlemmer, men avslutter hvert møte etter 30 minutter. WorkAdventures dekker 10 personer pålogget samtidig. SpatialChats gir 12 personer to timer med møter om dagen, nok til et ukentlig møte, men ikke til et kontor som er åpent hele dagen. Kumospaces dekker 5 medlemmer i én etasje, og TinyFloors 3 personer med alle funksjoner. oVices gratisplan kjører på en forhåndsversjon uten støtte.",
      ],
    },
    {
      title: "Hva prisen ikke viser",
      items: [
        {
          title: "Hva planen inneholder",
          body: "Den billigste planen er ikke alltid den dere ville brukt. SoWork Basic har to møteopptak; opptak og AI-notater finnes i Premium til 12 $ per medlem. Gather har opptak og transkripsjon. TinyFloor har verken opptak eller AI-notater.",
        },
        {
          title: "Gjester",
          body: "Kunder og frilansere som stikker innom av og til, kan telle som medlemmer i noen verktøy. Gather og oVice lar dere invitere gjester uten å betale for dem; sjekk før dere legger til folk som bare er på besøk.",
        },
        { title: "Avgifter", body: "Alle prisene her er uten avgifter. Avhengig av hvor dere er, legges merverdiavgift eller salgsskatt til ved betaling." },
        {
          title: "Prøveperioder",
          body: "Gather har en prøveperiode på 30 dager, Roam og oVice 14 dager, SoWork 7 dager. Prøveperioden viser om teamet vil bruke det; prisen om dere vil fortsette å betale.",
        },
      ],
    },
    {
      title: "Slik sjekket vi",
      body: [
        "Hver pris kommer fra produktets egen prisside, lenket i kalkulatoren, lest i måneden som står øverst. Vi bruker planen et lite team ville kjøpt for et kontor som er åpent hele dagen, ikke planer for arrangementer eller store bedrifter. Der en side bare oppgir én betalingsperiode, viser vi den. Priser endres, så sjekk prissiden før du kjøper; vi sjekker på nytt med noen måneders mellomrom.",
      ],
    },
  ],
  fit: {
    title: "Én pris for hele teamet",
    body: "TinyFloor er et kontor i nettleseren for små team: du går bort til noen for å snakke, med møterom, chat og skjermdeling. Det er gratis for opptil 3 personer og deretter 29 $ i måneden for hele teamet, uansett hvor mange dere er. Det har ingen opptak eller AI-notater; trenger dere det, passer Gather eller SoWork Premium bedre.",
    cta: "Prøv demokontoret",
  },
  faqTitle: "Vanlige <em>spørsmål.</em>",
  faq: [
    {
      q: "Hva koster et virtuelt kontor i måneden?",
      a: "For et team på 10 med en betalt plan 29 $ til 195 $ i måneden avhengig av verktøyet: TinyFloor koster 29 $ for hele kontoret, verktøy per person koster fra 54 $ (SoWork Basic, årlig betaling) til 195 $ (Roam).",
    },
    {
      q: "Hva er det billigste virtuelle kontoret for et lite team?",
      a: "En gratisplan som passer: SoWorks dekker 10 medlemmer med møter på 30 minutter, WorkAdventures 10 personer samtidig, Kumospaces 5 medlemmer og TinyFloors 3 personer. Over det er TinyFloor, til 29 $ i måneden for hele teamet, den laveste betalte prisen fra 6 personer og oppover.",
    },
    {
      q: "Er Gather gratis?",
      a: "Nei. Gather avviklet gratisplanen sin i 2025. Etter en prøveperiode på 30 dager koster det 12 $ per medlem i måneden med årlig betaling eller 15 $ med månedlig, så et team på 10 betaler 120 $ til 150 $ i måneden.",
    },
    {
      q: "Er pris per person eller fast pris best?",
      a: "Per person er billigst for et team på 2 eller 3, der prisen per hode er liten. Fast pris vinner når teamet vokser, og det koster aldri mer når dere legger til en frilanser eller en nyansatt.",
    },
    {
      q: "Er avgifter inkludert i prisene på virtuelle kontor?",
      a: "Nei. Prisene på verktøyenes prissider, og her, er uten avgifter; merverdiavgift eller salgsskatt legges til ved betaling avhengig av hvor dere er.",
    },
  ],
};

export default no;
