import type { TimeZonesContent } from "@/lib/tools/time-zones";

const da: TimeZonesContent = {
  meta: {
    title: "Mødeplanlægger på tværs af tidszoner: find remote-teamets fælles timer",
    description:
      "Tilføj by og arbejdstid for hver person på teamet, og se, hvornår alle arbejder på samme tid, eller det tidspunkt, der passer flest, når intet passer alle. Tager højde for sommertid og halve timer, som i Indien.",
  },
  eyebrow: "Gratis værktøjer",
  updated: "Opdateret",
  title: "Hvornår teamets arbejdstider <em>overlapper.</em>",
  intro:
    "Tilføj by og arbejdstid for hver person. Planlæggeren viser de timer, hvor alle arbejder på samme tid, i hver persons egen tid, og når ingen time passer alle, den, der passer flest. Den regner med dagens tidsforskelle, så sommertiden er med.",
  planner: {
    zone: "Tidszone",
    hours: "Arbejdstid",
    remove: "Fjern",
    add: "Tilføj person",
    addMine: "Tilføj min tidszone",
    timesIn: "Tider i {city}",
    working: "Arbejder",
    all: "Alle",
    everyone: "Alle arbejder {from}–{to}, tid i {city}.",
    best: "Intet tidspunkt passer alle. {from}–{to}, tid i {city}, passer {count} af {total}.",
    nobody: "Arbejdstiderne overlapper ikke.",
    eachLocal: "I hver persons tid:",
  },
  sections: [
    {
      title: "Hvor meget overlap et team har brug for",
      body: [
        "Mindre end man tror. To til fire fælles timer om dagen er nok til en standup, til de spørgsmål, der er hurtigere at stille end at skrive, og til et møde, når der er brug for det. Alt andet kan foregå skriftligt, i hver persons egen arbejdstid.",
        "Det, der gør ondt, er slet intet overlap, eller overlap, der kun findes, fordi nogen arbejder kl. 7 eller 22 hver dag. Hvis planlæggeren kun viser fælles tid i kanten af nogens dag, er det den person, der betaler for teamets møder.",
      ],
    },
    {
      title: "Find et fair mødetidspunkt",
      items: [
        {
          title: "Mødes inden for de fælles timer",
          body: "Læg standuppen og faste møder i det stykke, planlæggeren viser, og hold resten af de fælles timer fri til hurtige spørgsmål. Fælles tid er det knappeste, et spredt team har.",
        },
        {
          title: "Skift det dårlige tidspunkt",
          body: "Når det eneste mulige tidspunkt er tidligt for nogle og sent for andre, så skift uge for uge, så det ikke altid er de samme, der logger på om aftenen.",
        },
        {
          title: "Færre og kortere møder",
          body: "En standup på 15 minutter passer ind i næsten ethvert overlap; et møde på en time gør det sjældent. Spørg, om mødet kunne være en skriftlig opdatering, før I leder efter et tidspunkt.",
        },
        {
          title: "Skriv resultatet ned",
          body: "Den, der ikke kunne være med, skal kunne komme ajour på to minutter: et par linjer om, hvad der blev besluttet, og hvem der gør hvad, lagt der, hvor teamet allerede læser.",
        },
        {
          title: "Vis din arbejdstid",
          body: "Skriv din arbejdstid i kalenderen og din status, så ingen skal regne ud, om det er et godt tidspunkt at spørge dig om noget.",
        },
      ],
    },
    {
      title: "Når der ikke er noget overlap",
      items: [
        { title: "Skriftlige standups", body: "Hver person skriver i starten af sin dag, hvad de har lavet, hvad der kommer nu, og hvad der står i vejen. De andre læser det i starten af deres." },
        { title: "To mindre møder", body: "Del teamet efter region til livemøder, med én person med i begge eller delte noter, så det vigtige når frem til begge sider." },
        { title: "Overlevering sidst på dagen", body: "Når den enes aften er den andens morgen, lader en kort note sidst på dagen arbejdet fortsætte, mens den første sover." },
        { title: "Én fælles time om ugen", body: "Selv et team uden dagligt overlap kan finde én time om ugen, hvor alle strækker sig lidt, og skifte, hvem der strækker sig mest." },
      ],
    },
    {
      title: "Sommertid flytter overlappet",
      body: [
        "Uret stilles på forskellige datoer forskellige steder, så teamets fælles timer kan flytte sig en time i nogle uger hvert forår og efterår. USA skifter den anden søndag i marts og den første i november, Europa den sidste søndag i marts og oktober. Australien, New Zealand og Chile skifter omvendt, i deres eget forår. Indien, Kina, Japan, Brasilien og Mexico skifter slet ikke.",
        "Planlæggeren regner hver bys tidsforskel ud for i dag, så tjek igen omkring de datoer, hvis teamets overlap er stramt.",
      ],
    },
    {
      title: "Sådan regner den",
      body: [
        "Den deler dagen op i halve timer i den første persons tid, regner ud, hvad klokken er for alle andre med tidszonedataene i din browser, og tæller, hvem der er inden for deres arbejdstid. Halve timer er nødvendige for Indien, som er fem en halv time foran UTC. Arbejdstider over midnat, som kl. 22 til 6, virker også, og det hele kører i din browser.",
      ],
    },
  ],
  fit: {
    title: "Få mere ud af de fælles timer",
    body: "TinyFloor er et virtuelt kontor til små teams. I de timer, I deler, er alle, der er inde, på samme etage, og et spørgsmål er en tur hen til nogens skrivebord i stedet for et opkald, der skal planlægges. Det er gratis for op til 3 personer og 29 $ om måneden for hele teamet.",
    cta: "Prøv demokontoret",
  },
  faqTitle: "Ofte stillede <em>spørgsmål.</em>",
  faq: [
    {
      q: "Hvordan finder jeg et mødetidspunkt på tværs af tidszoner?",
      a: "Skriv hver persons by og arbejdstid ned, og find de halve timer, hvor alle arbejder på samme tid. Planlæggeren ovenfor gør det for op til 12 personer og viser resultatet i hver persons egen tid.",
    },
    {
      q: "Hvor mange timers overlap har et remote-team brug for?",
      a: "To til fire timer om dagen er nok for de fleste teams: nok til en standup, hurtige spørgsmål og et møde i ny og næ. Resten af arbejdet kan skrives og gøres i hver persons egen tid.",
    },
    {
      q: "Hvad er et fair mødetidspunkt på tværs af tidszoner?",
      a: "Et, der ligger inden for alles arbejdstid. Findes det ikke, så skift det tidlige eller sene tidspunkt uge for uge, så det ikke altid er de samme, der tager det.",
    },
    {
      q: "Hvad hvis mit team slet ikke har noget overlap?",
      a: "Arbejd skriftligt: skriftlige standups i starten af hver persons dag, en overleveringsnote til sidst og livemøder delt op efter region. De fleste teams kan stadig finde én fælles time om ugen.",
    },
    {
      q: "Tager planlæggeren højde for sommertid?",
      a: "Ja. Den bruger hver bys tidsforskel for i dag fra browserens tidszonedata, så sommertiden er med. Tjek igen sidst i marts og sidst i oktober, når uret stilles på forskellige datoer.",
    },
  ],
};

export default da;
