import type { SantaContent } from "@/lib/tools/secret-santa";

/** The Secret Santa generator in Danish, written from the English page. */
const da: SantaContent = {
  meta: {
    title: "Secret Santa generator: gratis lodtrækning uden e-mail og login",
    description: "Træk lod til Secret Santa på få sekunder, og send alle et privat link, der viser, hvem de skal købe gave til. Gratis, uden e-mail eller login, og skabt til teams, der arbejder på distancen.",
  },
  eyebrow: "Gratis værktøj",
  updated: "Opdateret",
  title: "Secret Santa <em>generator.</em>",
  intro: "Skriv alles navne, træk lod, og send hver person deres eget private link: det viser, hvem de skal købe gave til, og ingen andres valg. Ingen e-mail, ingen konto, og det fungerer for et team spredt over flere lande. Nedenfor: hvordan du holder Secret Santa online, reglerne og gaveidéer til kolleger.",
  drawer: {
    names: "Navne",
    namesHint: "Et pr. linje, mindst tre. Tilføj dig selv, hvis du deltager.",
    budget: "Budget",
    date: "Dato for gaveudveksling",
    optional: "(valgfrit)",
    draw: "Træk lod",
    redraw: "Træk lod igen",
    redrawNote: "En ny lodtrækning laver nye links. Send kun de nyeste.",
    tooFew: "Tilføj mindst tre navne.",
    duplicate: "To personer har det samme navn. Tilføj et forbogstav, så alle kan finde deres eget link.",
    linksTitle: "Private links",
    linksNote: "Send hver person deres eget link i en besked kun til dem. Når de åbner det, kan de se, hvem de skal købe gave til.",
    copy: "Kopiér link",
    copied: "Kopieret",
    copyAll: "Kopiér alle links",
    allIntro: "Secret Santa: åbn kun linket med dit eget navn.",
    revealTitle: "Hej {name}, du er Secret Santa for…",
    show: "Vis navnet",
    lookAway: "Sørg for, at der ikke er nogen, der kigger på din skærm.",
    budgetLabel: "Budget",
    dateLabel: "Gaveudveksling",
    keepSecret: "Hold det hemmeligt indtil gaveudvekslingen.",
    own: "Træk lod for din egen gruppe",
  },
  sections: [
    {
      title: "Sådan holder du Secret Santa online",
      items: [
        {
          title: "Saml navnene ind",
          body: "Spørg, hvem der vil være med. Det bør være frivilligt at deltage på arbejdet: en Secret Santa, som folk bliver tvunget med i, er ikke sjov for nogen.",
        },
        {
          title: "Sæt et budget og en dato",
          body: "Et fast beløb, der aftales på forhånd, så ingen bruger tre gange så meget som den, der køber gave til dem. Datoen er den dag, gaverne åbnes.",
        },
        { title: "Træk navnene", body: "Skriv navnene ovenfor og træk lod. Alle får tildelt en person, og ingen trækker sig selv." },
        {
          title: "Send linkene",
          body: "Send hver person deres eget link i en direkte besked eller en mail. Arrangøren kan også være med: du ser linkene, ikke hvem der har trukket hvem.",
        },
        { title: "Åbn gaverne sammen", body: "På et videoopkald eller til festen, én ad gangen, hvor alle gætter på, hvem deres Secret Santa var." },
      ],
    },
    {
      title: "Secret Santa med et remote team",
      body: [
        "Når teamet arbejder fra forskellige byer eller lande, skal gaverne sendes. Den nemmeste løsning er digitale gaver: et gavekort, en e-bog, en måneds streamingtjeneste eller en donation i personens navn. Hvis folk hellere vil sende noget fysisk, kan arrangøren indsamle hjemmeadresser privat og kun give dem til den, der skal bruge dem, eller alle kan bestille fra en butik, der leverer i det pågældende land.",
        "Åbn gaverne sammen på et opkald, ideelt set som en del af en juleafslutning. Vores [ideer til virtuelle julefester](/guides/virtual-holiday-party-ideas) har en dagsorden og lege til formålet.",
      ],
    },
    {
      title: "Regler for Secret Santa",
      items: [
        { title: "Overhold budgettet", body: "Under budgettet er fint, over er akavet. Budgettet er hele pointen: en lille gave, valgt med omhu." },
        { title: "Hold det hemmeligt", body: "Fortæl ikke nogen, hvem du har trukket, før gaverne er åbnet, og spørg ikke andre, hvem de har fået." },
        { title: "Hold det egnet til arbejdspladsen", body: "Intet personligt, og intet der kan gøre nogen forlegen over for kollegerne." },
        {
          title: "Del et ønske",
          body: "Hvis folk tilføjer et kort ønske i teamchatten, som f.eks. ”Jeg vil gerne have en god bog”, slipper alle for at gætte.",
        },
        { title: "Gør det valgfrit", body: "Nogle fejrer det ikke, eller har ikke lyst. De er stadig velkomne til festen." },
      ],
    },
    {
      title: "Gaveidéer til Secret Santa med kollegerne",
      body: [
        "Idéer der er nemme at tage med, og som passer til de fleste budgetter:",
      ],
      items: [
        { title: "Kaffe eller te", detail: "Under 150 kr.", body: "En pose bønner fra et godt lokalt risteri eller et udvalg af te." },
        { title: "En bog", detail: "Under 150 kr.", body: "Noget, du har været glad for i år, med en lille seddel, der forklarer hvorfor." },
        { title: "En plante til skrivebordet", detail: "Under 200 kr.", body: "Lille, svær at slå ihjel og pæn at se på under videoopkald." },
        { title: "Et gavekort", detail: "Valgfrit budget", body: "Til en boghandler, en cafékæde eller madlevering, der hvor de bor." },
        { title: "En pæn notesbog", detail: "Under 150 kr.", body: "Nyttig for alle, der stadig skriver ting ned." },
        { title: "En måneds abonnement på noget", detail: "Under 100 kr.", body: "Et abonnement på musik, lydbøger eller streaming, sendt som en gavekode." },
        { title: "Et puslespil eller et spil", detail: "Under 200 kr.", body: "Noget til aftenerne eller til hele familien." },
        {
          title: "Noget fra din by",
          detail: "Under 150 kr.",
          body: "Lokalt slik eller en lille ting, som man kun kan få, hvor du bor. Remote-teams elsker den slags.",
        },
      ],
    },
  ],
  fit: {
    title: "Åbn gaverne sammen",
    body: "TinyFloor er et virtuelt kontor til små teams. Åbn gaverne i mødelokalet med video og skærmdeling, og bliv bagefter for at snakke ved jeres skriveborde, ligesom I ville gøre til en rigtig fest. Det er gratis for op til 3 personer og 29 $ om måneden for hele teamet.",
    cta: "Prøv demokontoret",
  },
  faqTitle: "Ofte stillede <em>spørgsmål.</em>",
  faq: [
    {
      q: "Hvordan virker denne Secret Santa-generator?",
      a: "Indtast navnene, træk lod, og send hver person linket med deres navn. Når de åbner det, kan de se, hvem de skal købe gave til, samt budgettet og datoen, hvis du har angivet dem.",
    },
    {
      q: "Skal man have en e-mailadresse eller en konto?",
      a: "Nej. Der er ingen tilmelding, og intet bliver sendt på e-mail: du sender selv linkene i en chat, en e-mail eller en sms.",
    },
    { q: "Kan arrangøren være med?", a: "Ja. Arrangøren kan se linkene, men ikke hvem der trak hvem, så tilføj dit eget navn, og åbn kun dit eget link." },
    { q: "Kan man trække sit eget navn?", a: "Nej. Alle får tildelt en anden, og alle får tildelt præcis én Secret Santa." },
    {
      q: "Hvordan holder man Secret Santa med et remote team?",
      a: "Træk lod om navnene online, send alle et privat link, aftal et budget, og vælg digitale gaver eller indsaml adresser privat. Åbn derefter gaverne sammen over et videoopkald.",
    },
    {
      q: "Hvad er et godt Secret Santa-budget på arbejdet?",
      a: "Noget, alle har råd til uden at tænke over det, ofte 100 til 200 kr. Nævn ét beløb i invitationen, så gaverne føles ensartede.",
    },
    {
      q: "Er denne Secret Santa-generator gratis?",
      a: "Ja, helt uden grænser for antallet af deltagere. Den kører i din browser, og navnene sendes kun i de links, du sender.",
    },
  ],
};

export default da;
