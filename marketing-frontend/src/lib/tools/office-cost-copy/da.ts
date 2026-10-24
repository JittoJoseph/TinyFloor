import type { OfficeCostsContent } from "@/lib/tools/office-costs";

const da: OfficeCostsContent = {
  meta: {
    title: "Prisberegner for virtuelle kontorer: hvad 10 værktøjer koster dit team",
    description:
      "Angiv, hvor stort dit team er, og se, hvad Gather, SoWork, Spot, Kumospace, WorkAdventure, SpatialChat, Roam, oVice, Sococo og TinyFloor koster om måneden, med års- eller månedsbetaling, ifølge hver enkelt produkts prisside.",
  },
  eyebrow: "Gratis værktøjer",
  updated: "Priser tjekket",
  title: "Hvad et virtuelt kontor <em>koster dit team.</em>",
  intro:
    "De fleste virtuelle kontorer tager betaling per person, nogle få per rum eller per kontor, og gratisplanerne stopper ved forskellige størrelser. Angiv, hvor mange I er på teamet, og se, hvad hvert af ti værktøjer koster om måneden, billigst først.",
  calculator: {
    people: "Personer på teamet",
    count: "{count} personer",
    billing: { yearly: "Årlig betaling", monthly: "Månedlig betaling" },
    product: "Produkt",
    free: "Gratisplan",
    price: "Betalt plan",
    perMonth: "{amount} om måneden",
    perYear: "{amount} om året",
    only: { yearly: "kun årligt", monthly: "kun månedligt" },
    noFree: "Ingen gratisplan",
    fits: "Gratis i denne størrelse",
    upTo: "Op til {count} personer",
    pricingPage: "Prisside",
    basis: {
      office: "Én pris for kontoret",
      member: "Per medlem",
      activeMember: "Per aktivt medlem",
      space: "Per rum",
      seat: "Per plads, mindst 10",
    },
    limits: {
      everyFeature: "alle funktioner",
      thirtyMinutes: "møder på 30 minutter",
      oneFloor: "én etage",
      atOnce: "samtidig",
      twoHours: "2 timer om dagen",
      preRelease: "forhåndsversion, uden support",
    },
    summary: "For {count} personer koster planer per person {low} til {high} om måneden. TinyFloor koster {tinyfloor}.",
    summaryLarge: "For {count} personer koster planer per person {low} til {high} om måneden.",
  },
  sections: [
    {
      title: "Sådan tager virtuelle kontorer betaling",
      body: ["På fire måder, og hvilken et værktøj bruger, afgør mere end listeprisen, hvad et voksende team betaler."],
      items: [
        {
          title: "Per medlem",
          detail: "Gather, SoWork, Spot, Kumospace, WorkAdventure, SpatialChat",
          body: "Du betaler for alle med en konto, hver måned, uanset om de kommer ind eller ej. Regningen vokser med hver ansættelse: et team på 10 betaler dobbelt så meget som et på 5.",
        },
        {
          title: "Per aktivt medlem",
          detail: "Roam",
          body: "Du betaler for dem, der brugte det den måned. En på orlov koster intet, men de fleste teams er aktive hver måned, så i praksis virker det som per medlem.",
        },
        {
          title: "Per rum eller pladspakke",
          detail: "oVice, Sococo",
          body: "Du betaler for et rum beregnet til et vist antal personer, eller for en mindste pakke pladser. Billigt, hvis teamet fylder det, dyrt, hvis ikke: Sococo tager betaling for 10 pladser, selvom I er 4.",
        },
        {
          title: "Én pris for kontoret",
          detail: "TinyFloor",
          body: "Én pris uanset hvor mange I er, op til den størrelse planen tager. Det koster intet at tilføje nogen, så ingen skal afgøre, om en freelancer er en plads værd.",
        },
      ],
    },
    {
      title: "Årlig eller månedlig betaling",
      body: [
        "De fleste værktøjer per person giver 10 til 20 % rabat for at betale et år forud: Gather koster 12 $ per medlem med årlig betaling og 15 $ med månedlig. Det er en forpligtelse for et år for et team, hvis størrelse kan ændre sig, og rabatten forsvinder, hvis I stopper efter tre måneder.",
        "Nogle tager kun betaling på én måde: Roam og TinyFloor månedligt, Sococo årligt. Beregneren viser dem til den pris, de har, og siger det.",
      ],
    },
  ],
  table: {
    title: "Hvad et team på 5, 10 eller 15 betaler om måneden",
    body: [
      "De samme priser ved tre almindelige størrelser, med årlig betaling hvor værktøjet tilbyder det, fordi det er den laveste pris. Gratisplaner tæller ikke med her; beregneren ovenfor viser, hvilke der passer.",
    ],
    product: "Produkt",
    note: "Priser i amerikanske dollar uden moms, fra hvert produkts prisside. Sococo tager betaling for mindst 10 pladser; oVice går fra Entry-S til Entry-M ved omkring 10 faste medlemmer.",
  },
  after: [
    {
      title: "Når en gratisplan er nok",
      body: [
        "En gratisplan, der rummer hele teamet, slår enhver betalt plan, så tjek grænserne før prisen. SoWorks dækker 10 medlemmer, men afslutter hvert møde efter 30 minutter. WorkAdventures dækker 10 personer online samtidig. SpatialChats giver 12 personer to timers møder om dagen, hvilket rækker til et ugentligt møde, men ikke til et kontor, der er åbent hele dagen. Kumospaces dækker 5 medlemmer på én etage, og TinyFloors 3 personer med alle funktioner. oVices gratisplan kører på en forhåndsversion uden support.",
      ],
    },
    {
      title: "Hvad prisen ikke viser",
      items: [
        {
          title: "Hvad planen indeholder",
          body: "Den billigste plan er ikke altid den, I ville bruge. SoWork Basic har to mødeoptagelser; optagelser og AI-noter er i Premium til 12 $ per medlem. Gather har optagelse og transskription. TinyFloor har hverken optagelser eller AI-noter.",
        },
        {
          title: "Gæster",
          body: "Kunder og freelancere, der kigger forbi af og til, kan tælle som medlemmer i nogle værktøjer. Gather og oVice lader jer invitere gæster uden at betale for dem; tjek det, før I tilføjer folk, der kun er på besøg.",
        },
        { title: "Moms", body: "Alle priser her er uden moms. Afhængigt af hvor I er, lægges moms eller salgsskat til ved betalingen." },
        {
          title: "Prøveperioder",
          body: "Gather og Spot har en prøveperiode på 30 dage, Roam og oVice 14 dage, SoWork 7 dage. Prøveperioden viser, om teamet vil bruge det; prisen, om I bliver ved med at betale.",
        },
      ],
    },
    {
      title: "Sådan tjekkede vi",
      body: [
        "Hver pris kommer fra produktets egen prisside, linket i beregneren, læst i den måned, der står øverst. Vi bruger den plan, et lille team ville købe til et kontor, der er åbent hele dagen, ikke planer til events eller store virksomheder. Hvor en side kun angiver én betalingsperiode, viser vi den. Priser ændrer sig, så tjek prissiden, før du køber; vi tjekker igen med nogle måneders mellemrum.",
      ],
    },
  ],
  fit: {
    title: "Én pris for hele teamet",
    body: "TinyFloor er et kontor i browseren til små teams: du går hen til nogen for at snakke, med mødelokale, chat og skærmdeling. Det er gratis for op til 3 personer og derefter 29 $ om måneden for hele teamet, uanset hvor mange I er. Det har ingen optagelser eller AI-noter; har I brug for dem, passer Gather eller SoWork Premium bedre.",
    cta: "Prøv demokontoret",
  },
  faqTitle: "Ofte stillede <em>spørgsmål.</em>",
  faq: [
    {
      q: "Hvad koster et virtuelt kontor om måneden?",
      a: "For et team på 10 med en betalt plan 29 $ til 195 $ om måneden afhængigt af værktøjet: TinyFloor koster 29 $ for hele kontoret, værktøjer per person koster fra 48 $ (Spot Basic, årlig betaling) til 195 $ (Roam).",
    },
    {
      q: "Hvad er det billigste virtuelle kontor til et lille team?",
      a: "En gratisplan, der passer: SoWorks dækker 10 medlemmer med møder på 30 minutter, WorkAdventures 10 personer samtidig, Kumospaces 5 medlemmer og TinyFloors 3 personer. Derover er TinyFloor, til 29 $ om måneden for hele teamet, den laveste betalte pris fra 7 personer og op.",
    },
    {
      q: "Er Gather gratis?",
      a: "Nej. Gather stoppede sin gratisplan i 2025. Efter en prøveperiode på 30 dage koster det 12 $ per medlem om måneden med årlig betaling eller 15 $ med månedlig, så et team på 10 betaler 120 $ til 150 $ om måneden.",
    },
    {
      q: "Er pris per person eller fast pris bedst?",
      a: "Per person er billigst for et team på 2 eller 3, hvor prisen per hoved er lille. Fast pris vinder, når teamet vokser, og det koster aldrig mere, når I tilføjer en freelancer eller en nyansat.",
    },
    {
      q: "Er moms inkluderet i priserne på virtuelle kontorer?",
      a: "Nej. Priserne på værktøjernes prissider, og her, er uden moms; moms eller salgsskat lægges til ved betalingen afhængigt af, hvor I er.",
    },
  ],
};

export default da;
