import type { StandupContent } from "@/lib/tools/standup";

/** Skabelonen til daily standup på dansk, skrevet ud fra den engelske side. */
const da: StandupContent = {
  meta: {
    title: "Skabelon til daily standup: gratis dagsorden og async standup",
    description:
      "Lav en dagsorden til jeres daily standup, tilpasset teamets størrelse, eller en skabelon til asynkron standup i Slack eller Teams. Gratis, med tre sæt spørgsmål.",
  },
  eyebrow: "Gratis værktøj",
  updated: "Opdateret",
  title: "Skabelon til <em>daily standup.</em>",
  intro:
    "En god daily standup tager cirka et minut pr. person og slutter med, at alle ved, hvad der sker, og hvem der sidder fast. Vælg, hvor stort teamet er, og hvordan I mødes, på et opkald, på skrift eller langs tavlen, og få en dagsorden med de rigtige tider eller en skabelon til teamchatten.",
  builder: {
    team: "Teamets størrelse",
    people: "{count} personer",
    format: "Hvordan I mødes",
    formats: { live: "På et opkald", async: "På skrift (asynkront)", board: "Langs tavlen" },
    questions: "Spørgsmål",
    sets: [
      { key: "classic", label: "Klassiske", questions: ["Hvad lavede du i går?", "Hvad skal du lave i dag?", "Er der noget, der står i vejen?"] },
      { key: "focus", label: "Fokus", questions: ["Hvad er din vigtigste prioritet i dag?", "Hvad kan stoppe den?", "Hvem har du brug for hjælp fra?"] },
      { key: "progress", label: "Fremdrift", questions: ["Hvad er rykket fremad?", "Hvad er det næste?", "Er der risici, vi bør kende til?"] },
    ],
    icebreaker: "Start med en isbryder på et minut",
    minutes: "{count} minutter",
    agenda: "Dagsorden",
    template: "Skabelon til opslag",
    copy: "Kopiér",
    copied: "Kopieret",
    lines: {
      open: "Start: begynd til tiden, også selvom nogen er forsinket",
      icebreaker: "Isbryder: et hurtigt spørgsmål, én sætning hver",
      round: "Runde: alle svarer, cirka et minut hver",
      column: "{column}: hvad sidder fast, hvad er det næste",
      blockers: "Forhindringer: aftal, hvem der hjælper, og tal sammen bagefter",
      close: "Afslutning: det, alle skal vide",
    },
    columns: ["Blokeret", "Til review", "I gang", "Næste"],
    note: {
      live: "Cirka et minut pr. person, lidt mindre i et større team, plus et minut til at åbne og afslutte. Højst et kvarter: længere end det er det et møde, ikke en standup.",
      async: "Bed alle om at poste inden samme klokkeslæt hver morgen i deres egen tidszone, læse hinandens opdateringer og svare i en tråd på alt, der sidder fast.",
      board: "Gå tavlen igennem fra højre: først det arbejde, der er tættest på at være færdigt, så teamet gør ting færdige, før det starter nye. Fem minutter plus cirka et pr. person.",
    },
  },
  sections: [
    {
      title: "Hvad en daily standup er til",
      body: [
        "En daily standup er et kort møde, som regel i starten af dagen, hvor alle på teamet fortæller, hvad de arbejder på, og om noget står i vejen. Den kommer fra agile softwareteams, hvor den også kaldes daily scrum, men den virker for ethvert lille team, hvis arbejde afhænger af hinandens.",
        "Det er ikke en statusrapport til lederen. Pointen er, at teamet ser dagen sammen: hvem der laver hvad, hvor to opgaver mødes, og hvem der har brug for hjælp. Hvis en standup hjælper nogen videre, var den det værd; hvis den er en runde oplæsninger, ingen lytter til, var den ikke.",
      ],
    },
    {
      title: "Tre måder at holde den på",
      items: [
        {
          title: "På et opkald",
          detail: "Klassikeren",
          body: "Alle logger på samtidig og svarer på skift på de samme tre spørgsmål. Bedst til teams i tidszoner tæt på hinanden, der kan lide at se hinanden én gang om dagen. Hold det til cirka et minut pr. person.",
        },
        {
          title: "På skrift",
          detail: "Asynkron standup",
          body: "Alle poster deres svar i teamchatten inden et fast klokkeslæt og læser de andres. Bedst til teams på tværs af tidszoner eller teams, der allerede har mange møder. Samtalen forsvinder, så gør det til en vane at svare på alt, der sidder fast.",
        },
        {
          title: "Langs tavlen",
          detail: "Arbejdet først, personerne bagefter",
          body: "I stedet for at gå personerne igennem går I opgavetavlen igennem kolonne for kolonne, startende med det arbejde, der er tættest på at være færdigt. Bedst til teams med en fyldt tavle, hvor spørgsmålet er, hvad der sidder fast, snarere end hvad alle har lavet.",
        },
      ],
    },
    {
      title: "De tre standup-spørgsmål",
      body: [
        "De klassiske tre er, hvad du lavede i går, hvad du skal lave i dag, og om noget står i vejen. De virker, men de lægger op til en liste over alt, man har rørt ved. Hvis jeres standups trækker ud, så prøv et skarpere sæt:",
      ],
      items: [
        {
          title: "Klassiske",
          body: "Hvad lavede du i går? Hvad skal du lave i dag? Er der noget, der står i vejen? Kendt af alle og fint til et nyt team.",
        },
        {
          title: "Fokus",
          body: "Hvad er din vigtigste prioritet i dag? Hvad kan stoppe den? Hvem har du brug for hjælp fra? Kortere svar, og det sidste spørgsmål gør forhindringer til konkrete forespørgsler.",
        },
        {
          title: "Fremdrift",
          body: "Hvad er rykket fremad? Hvad er det næste? Nogen risici? Handler om arbejdet frem for personen og passer godt til at gå tavlen igennem.",
        },
      ],
    },
    {
      title: "En dagsorden til daily standup, minut for minut",
      body: [
        "For et team på seks på et opkald tager en standup cirka otte minutter. Start til tiden, også selvom nogen er forsinket: at vente lærer alle at komme for sent. Gå så rundt i en fast rækkefølge, den folk vises i på skærmen eller alfabetisk, så ingen spekulerer på, hvornår det er deres tur.",
        "Når nogen nævner et problem, så løs det ikke i standuppen. Notér, hvem der kan hjælpe, og aftal at tale sammen lige bagefter, kun med dem, der skal være med. Den ene vane holder en standup under ti minutter. Slut af med at spørge, om der er noget, alle skal vide, og afslut opkaldet.",
      ],
      table: {
        head: ["Teamets størrelse", "På et opkald", "Langs tavlen"],
        rows: [
          ["3 personer", "5 minutter", "8 minutter"],
          ["6 personer", "8 minutter", "11 minutter"],
          ["8 personer", "10 minutter", "13 minutter"],
          ["12 personer", "11 minutter", "15 minutter"],
          ["15 personer", "14 minutter", "15 minutter"],
        ],
        note: "Udregnet på samme måde som værktøjet ovenfor: cirka et minut pr. person (tre kvarter minut ved mere end otte personer) plus to til at åbne og afslutte, og aldrig mere end femten.",
      },
    },
    {
      title: "Sådan holder du en asynkron standup",
      body: [
        "En asynkron standup er de samme tre spørgsmål, besvaret på skrift. Vælg en kanal og et tidspunkt, for eksempel kl. 10 i hver persons egen tidszone, og bed alle om at poste deres svar som én besked, med skabelonen ovenfor, så de er nemme at skimme.",
        "To ting får det til at virke. For det første: læs hinandens opdateringer; en asynkron standup, ingen læser, er en dagbog. For det andet: svar samme dag i en tråd på alt, der sidder fast. Nogle teams holder også ét kort opkald om ugen, så de stadig ser hinanden.",
      ],
    },
    {
      title: "Typiske fejl ved standuppen",
      items: [
        { title: "Den bliver til problemløsning", body: "Nogen nævner et problem, og tre personer begynder at løse det. Notér det, aftal, hvem der taler sammen bagefter, og gå videre." },
        { title: "Den er en rapport til lederen", body: "Hvis alle kigger på teamlederen, mens de taler, er standuppen for den forkerte person. Tal til teamet." },
        { title: "For mange personer", body: "Over cirka tolv personer lytter ingen til alle. Del op i mindre standups efter projekt eller arbejdsspor." },
        { title: "At starte for sent", body: "Fem minutters ventetid på den sidste koster alle andre fem minutter, hver dag. Start til tiden." },
        { title: "At sige \"ingen forhindringer\" hver dag", body: "Hvis ingen nogensinde sidder fast, så stil et skarpere spørgsmål: \"Hvad kan stoppe din prioritet i dag?\" finder som regel noget." },
      ],
    },
  ],
  fit: {
    title: "Hold standuppen på etagen",
    body: "TinyFloor er et virtuelt kontor til små teams: du kan se, hvem der sidder ved sit skrivebord, og standuppen er en tur ned til mødelokalet i stedet for endnu et link. Bagefter går du hen til den, der sidder fast. Det kører i en browserfane, gratis for op til 3 personer og 29 $ om måneden for hele teamet.",
    cta: "Prøv demokontoret",
  },
  faqTitle: "Ofte stillede <em>spørgsmål.</em>",
  faq: [
    {
      q: "Hvad er de tre spørgsmål til en daily standup?",
      a: "Hvad lavede du i går? Hvad skal du lave i dag? Er der noget, der står i vejen? En skarpere version: Hvad er din vigtigste prioritet i dag? Hvad kan stoppe den? Hvem har du brug for hjælp fra?",
    },
    {
      q: "Hvor lang skal en daily standup være?",
      a: "Cirka et minut pr. person plus et minut eller to til at åbne og afslutte: omkring otte minutter for et team på seks. Højst et kvarter.",
    },
    {
      q: "Hvad er en skabelon til daily standup?",
      a: "En fast dagsorden til mødet eller et beskedformat til en skriftlig standup: de samme tre spørgsmål i samme rækkefølge hver dag, så opdateringer er hurtige at give og nemme at skimme.",
    },
    {
      q: "Hvad er en asynkron standup?",
      a: "En standup på skrift: alle poster deres svar på de tre spørgsmål i teamchatten inden et fast klokkeslæt og læser de andres. Den passer til teams på tværs af tidszoner.",
    },
    {
      q: "Er daily standup kun for scrumteams?",
      a: "Nej. Den kommer fra agile softwareteams, hvor den kaldes daily scrum, men ethvert lille team, hvis arbejde afhænger af hinandens, kan bruge den.",
    },
    {
      q: "Er dette værktøj til daily standup gratis?",
      a: "Ja, og det kører helt i din browser: intet af det, du vælger, sendes nogen steder hen. Kopiér dagsordenen eller skabelonen til din kalenderinvitation eller teamchatten.",
    },
  ],
};

export default da;
