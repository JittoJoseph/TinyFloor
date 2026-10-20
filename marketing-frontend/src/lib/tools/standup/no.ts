import type { StandupContent } from "@/lib/tools/standup";

/** Malen for daily standup på norsk, skrevet ut fra den engelske siden. */
const no: StandupContent = {
  meta: {
    title: "Mal for daily standup: gratis agenda og asynkron standup",
    description:
      "Lag en agenda for daily standup tilpasset teamets størrelse, eller en mal for asynkron standup i Slack eller Teams. Gratis, med tre sett spørsmål og en veiledning.",
  },
  eyebrow: "Gratis verktøy",
  updated: "Oppdatert",
  title: "Mal for <em>daily standup.</em>",
  intro:
    "En god daily standup tar omtrent ett minutt per person og ender med at alle vet hva som skjer og hvem som står fast. Velg hvor stort teamet er og hvordan dere møtes, i en samtale, skriftlig eller langs tavlen, og få en agenda med riktig tid, eller en mal å poste i teamchatten.",
  builder: {
    team: "Teamstørrelse",
    people: "{count} personer",
    format: "Hvordan dere møtes",
    formats: { live: "I en samtale", async: "Skriftlig (asynkront)", board: "Langs tavlen" },
    questions: "Spørsmål",
    sets: [
      { key: "classic", label: "Klassiske", questions: ["Hva gjorde du i går?", "Hva skal du gjøre i dag?", "Står noe i veien?"] },
      { key: "focus", label: "Fokus", questions: ["Hva er din viktigste prioritet i dag?", "Hva kan stoppe den?", "Hvem trenger du hjelp fra?"] },
      { key: "progress", label: "Fremdrift", questions: ["Hva har gått fremover?", "Hva er det neste?", "Er det risikoer vi bør vite om?"] },
    ],
    icebreaker: "Start med en isbryter på ett minutt",
    minutes: "{count} minutter",
    agenda: "Agenda",
    template: "Mal å poste",
    copy: "Kopier",
    copied: "Kopiert",
    lines: {
      open: "Start: begynn presis, selv om noen er sent ute",
      icebreaker: "Isbryter: ett raskt spørsmål, én setning hver",
      round: "Runde: alle svarer, omtrent ett minutt hver",
      column: "{column}: hva står fast, hva er det neste",
      blockers: "Hindringer: avtal hvem som hjelper, og snakk etterpå",
      close: "Avslutning: det alle trenger å vite",
    },
    columns: ["Blokkert", "Til gjennomgang", "Pågår", "Neste"],
    note: {
      live: "Omtrent ett minutt per person, litt mindre i et større team, pluss ett minutt til å åpne og avslutte. Maks et kvarter: lenger enn det er det et møte, ikke en standup.",
      async: "Be alle poste innen samme klokkeslett hver morgen i sin egen tidssone, lese hverandres oppdateringer og svare i en tråd på alt som står fast.",
      board: "Gå gjennom tavlen fra høyre: først arbeidet som er nærmest ferdig, så teamet gjør ting ferdig før det begynner på noe nytt. Fem minutter pluss omtrent ett per person.",
    },
  },
  sections: [
    {
      title: "Hva en daily standup er til",
      body: [
        "En daily standup er et kort møte, vanligvis i starten av dagen, der alle på teamet forteller hva de jobber med og om noe står i veien. Den kommer fra smidige programvareteam, der den også kalles daily scrum, men den fungerer for alle små team der arbeidet henger sammen.",
        "Det er ingen statusrapport til lederen. Poenget er at teamet ser dagen sammen: hvem som gjør hva, hvor to oppgaver møtes og hvem som trenger hjelp. Hvis en standup hjelper noen videre, var den verdt det; hvis den er en runde med opplesninger ingen lytter til, var den ikke det.",
      ],
    },
    {
      title: "Tre måter å holde den på",
      items: [
        {
          title: "I en samtale",
          detail: "Klassikeren",
          body: "Alle kobler seg på samtidig og svarer etter tur på de samme tre spørsmålene. Best for team i nærliggende tidssoner som liker å se hverandre én gang om dagen. Hold det til omtrent ett minutt per person.",
        },
        {
          title: "Skriftlig",
          detail: "Asynkron standup",
          body: "Alle poster svarene sine i teamchatten innen et fast klokkeslett og leser de andres. Best for team på tvers av tidssoner, eller team som allerede har mange møter. Samtalen forsvinner, så gjør det til en vane å svare på alt som står fast.",
        },
        {
          title: "Langs tavlen",
          detail: "Arbeidet først, personene etterpå",
          body: "I stedet for å gå laget rundt går dere gjennom oppgavetavlen kolonne for kolonne, fra arbeidet som er nærmest ferdig. Best for team med en full tavle, der spørsmålet er hva som står fast, ikke hva alle har gjort.",
        },
      ],
    },
    {
      title: "De tre standup-spørsmålene",
      body: [
        "De tre klassiske er hva du gjorde i går, hva du skal gjøre i dag og om noe står i veien. De fungerer, men de inviterer til en liste over alt man har vært innom. Hvis standupene deres drar ut, prøv et skarpere sett:",
      ],
      items: [
        {
          title: "Klassiske",
          body: "Hva gjorde du i går? Hva skal du gjøre i dag? Står noe i veien? Kjent for alle og fint for et nytt team.",
        },
        {
          title: "Fokus",
          body: "Hva er din viktigste prioritet i dag? Hva kan stoppe den? Hvem trenger du hjelp fra? Kortere svar, og det siste spørsmålet gjør hindringer om til konkrete forespørsler.",
        },
        {
          title: "Fremdrift",
          body: "Hva har gått fremover? Hva er det neste? Noen risikoer? Handler om arbeidet, ikke personen, og passer godt langs tavlen.",
        },
      ],
    },
    {
      title: "En agenda for daily standup, minutt for minutt",
      body: [
        "For et team på seks i en samtale tar en standup omtrent åtte minutter. Begynn presis, selv om noen er sent ute: å vente lærer alle å komme for sent. Gå så laget rundt i fast rekkefølge, slik folk vises på skjermen eller alfabetisk, så ingen lurer på når det er deres tur.",
        "Når noen nevner et problem, ikke løs det i standupen. Noter hvem som kan hjelpe, og avtal å snakke rett etterpå, bare med dem som trenger å være med. Den ene vanen holder en standup under ti minutter. Avslutt med å spørre om det er noe alle trenger å vite, og avslutt samtalen.",
      ],
      table: {
        head: ["Teamstørrelse", "I en samtale", "Langs tavlen"],
        rows: [
          ["3 personer", "5 minutter", "8 minutter"],
          ["6 personer", "8 minutter", "11 minutter"],
          ["8 personer", "10 minutter", "13 minutter"],
          ["12 personer", "11 minutter", "15 minutter"],
          ["15 personer", "14 minutter", "15 minutter"],
        ],
        note: "Regnet ut slik verktøyet over gjør det: omtrent ett minutt per person (tre kvarter minutt med flere enn åtte personer) pluss to til å åpne og avslutte, og aldri mer enn femten.",
      },
    },
    {
      title: "Slik holder du en asynkron standup",
      body: [
        "En asynkron standup er de samme tre spørsmålene, besvart skriftlig. Velg en kanal og et tidspunkt, for eksempel kl. 10 i hver persons egen tidssone, og be alle poste svarene sine som én melding, med malen over, så de er lette å skumlese.",
        "To ting får det til å fungere. For det første: les hverandres oppdateringer; en asynkron standup ingen leser, er en dagbok. For det andre: svar i en tråd på alt som står fast, samme dag. Noen team beholder i tillegg én kort samtale i uken, så de fortsatt ser hverandre.",
      ],
    },
    {
      title: "Vanlige feil på standupen",
      items: [
        { title: "Den blir problemløsning", body: "Noen tar opp et problem, og tre personer begynner å løse det. Noter det, avtal hvem som snakker etterpå, og gå videre." },
        { title: "Den er en rapport til lederen", body: "Hvis alle ser på teamlederen mens de snakker, er standupen for feil person. Snakk til teamet." },
        { title: "For mange personer", body: "Over omtrent tolv personer lytter ingen til alle. Del opp i mindre standuper etter prosjekt eller arbeidsstrøm." },
        { title: "Å starte sent", body: "Fem minutter med venting på den siste koster alle andre fem minutter, hver dag. Begynn presis." },
        { title: "Å si \"ingen hindringer\" hver dag", body: "Hvis ingen noen gang står fast, still et skarpere spørsmål: \"Hva kan stoppe prioriteten din i dag?\" finner som regel noe." },
      ],
    },
  ],
  fit: {
    title: "Hold standupen i etasjen",
    body: "TinyFloor er et virtuelt kontor for små team: du ser hvem som sitter ved pulten sin, og standupen er en tur bort til møterommet i stedet for enda en lenke. Etterpå går du bort til den som står fast. Det kjører i en nettleserfane, gratis for opptil 3 personer og 29 $ i måneden for hele teamet.",
    cta: "Prøv demokontoret",
  },
  faqTitle: "Vanlige <em>spørsmål.</em>",
  faq: [
    {
      q: "Hva er de tre spørsmålene på en daily standup?",
      a: "Hva gjorde du i går? Hva skal du gjøre i dag? Står noe i veien? En skarpere versjon: Hva er din viktigste prioritet i dag? Hva kan stoppe den? Hvem trenger du hjelp fra?",
    },
    {
      q: "Hvor lang bør en daily standup være?",
      a: "Omtrent ett minutt per person, pluss ett eller to minutter til å åpne og avslutte: rundt åtte minutter for et team på seks. Maks et kvarter.",
    },
    {
      q: "Hva er en mal for daily standup?",
      a: "En fast agenda for møtet, eller et meldingsformat for en skriftlig standup: de samme tre spørsmålene i samme rekkefølge hver dag, så oppdateringer er raske å gi og lette å skumlese.",
    },
    {
      q: "Hva er en asynkron standup?",
      a: "En standup gjort skriftlig: alle poster svarene sine på de tre spørsmålene i teamchatten innen et fast klokkeslett og leser de andres. Den passer for team på tvers av tidssoner.",
    },
    {
      q: "Er daily standup bare for scrumteam?",
      a: "Nei. Den kommer fra smidige programvareteam, der den kalles daily scrum, men alle små team der arbeidet henger sammen, kan bruke den.",
    },
    {
      q: "Er dette verktøyet for daily standup gratis?",
      a: "Ja, og det kjører helt i nettleseren din: ingenting av det du velger, sendes noe sted. Kopier agendaen eller malen inn i kalenderinvitasjonen eller teamchatten.",
    },
  ],
};

export default no;
