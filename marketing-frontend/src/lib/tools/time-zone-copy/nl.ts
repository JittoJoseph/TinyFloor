import type { TimeZonesContent } from "@/lib/tools/time-zones";

const nl: TimeZonesContent = {
  meta: {
    title: "Vergaderplanner voor tijdzones: vind de gedeelde uren van je remote team",
    description:
      "Vul van iedereen in het team de stad en werktijden in en zie wanneer iedereen tegelijk werkt, of het tijdstip dat de meeste mensen uitkomt als geen enkel tijdstip iedereen uitkomt. Houdt rekening met zomertijd en halve uren, zoals in India.",
  },
  eyebrow: "Gratis tools",
  updated: "Bijgewerkt op",
  title: "Wanneer de werktijden van je team <em>overlappen.</em>",
  intro:
    "Vul van iedereen de stad en werktijden in. De planner toont de uren waarop iedereen tegelijk werkt, in ieders eigen tijd, en als geen uur iedereen uitkomt, het uur dat de meeste mensen uitkomt. Hij rekent met de tijdsverschillen van vandaag, dus zomertijd telt mee.",
  planner: {
    zone: "Tijdzone",
    hours: "Werktijden",
    remove: "Verwijderen",
    add: "Persoon toevoegen",
    addMine: "Mijn tijdzone toevoegen",
    timesIn: "Tijden in {city}",
    working: "Aan het werk",
    all: "Iedereen",
    everyone: "Iedereen werkt van {from} tot {to}, tijd in {city}.",
    best: "Geen tijdstip komt iedereen uit. Van {from} tot {to}, tijd in {city}, komt {count} van de {total} uit.",
    nobody: "De werktijden overlappen niet.",
    eachLocal: "In ieders eigen tijd:",
  },
  sections: [
    {
      title: "Hoeveel overlap een team nodig heeft",
      body: [
        "Minder dan je denkt. Twee tot vier gedeelde uren per dag zijn genoeg voor een standup, voor de vragen die sneller gesteld dan getypt zijn en voor een meeting als die nodig is. De rest kan schriftelijk, in ieders eigen werktijd.",
        "Wat pijn doet, is helemaal geen overlap, of overlap die alleen bestaat omdat iemand elke dag om 7 of 22 uur werkt. Als de planner gedeelde tijd alleen aan de rand van iemands dag laat zien, betaalt die persoon voor de meetings van het team.",
      ],
    },
    {
      title: "Een eerlijk tijdstip vinden",
      items: [
        {
          title: "Vergader binnen de gedeelde uren",
          body: "Zet de standup en terugkerende meetings in het stuk dat de planner laat zien, en houd de rest van de gedeelde uren vrij voor snelle vragen. Gedeelde tijd is het schaarste wat een verspreid team heeft.",
        },
        {
          title: "Rouleer het lastige tijdstip",
          body: "Als het enige mogelijke tijdstip vroeg is voor de een en laat voor de ander, wissel dan per week af, zodat niet altijd dezelfde mensen 's avonds inloggen.",
        },
        {
          title: "Minder en kortere meetings",
          body: "Een standup van 15 minuten past in bijna elke overlap; een meeting van een uur meestal niet. Vraag je af of een meeting ook een schriftelijke update kan zijn voordat je er een tijdstip voor zoekt.",
        },
        {
          title: "Schrijf de uitkomst op",
          body: "Wie er niet bij kon zijn, moet in twee minuten bij zijn: een paar regels over wat er besloten is en wie wat doet, geplaatst waar het team al leest.",
        },
        {
          title: "Laat je werktijden zien",
          body: "Zet je werktijden in je agenda en je status, zodat niemand hoeft uit te rekenen of het een goed moment is om je iets te vragen.",
        },
      ],
    },
    {
      title: "Als er geen overlap is",
      items: [
        { title: "Schriftelijke standups", body: "Iedereen schrijft aan het begin van zijn dag wat hij deed, wat er komt en waar hij op vastloopt. De anderen lezen het aan het begin van die van hen." },
        { title: "Twee kleinere meetings", body: "Splits het team voor live meetings per regio, met één persoon bij allebei, of gedeelde notities, om het belangrijkste over te brengen." },
        { title: "Overdracht aan het eind van de dag", body: "Als de avond van de een de ochtend van de ander is, laat een korte notitie aan het eind van de dag het werk doorgaan terwijl de eerste slaapt." },
        { title: "Eén gedeeld uur per week", body: "Zelfs een team zonder dagelijkse overlap kan één uur per week vinden waarin iedereen een beetje rekt, en rouleren wie het meest rekt." },
      ],
    },
    {
      title: "Zomertijd verschuift de overlap",
      body: [
        "De klok gaat op verschillende plekken op verschillende data om, dus de gedeelde uren van een team kunnen elk voorjaar en najaar een paar weken een uur verschuiven. De VS wisselen op de tweede zondag van maart en de eerste van november; Europa op de laatste zondag van maart en oktober. Australië, Nieuw-Zeeland en Chili wisselen andersom, in hun eigen voorjaar. India, China, Japan, Brazilië en Mexico wisselen niet.",
        "De planner rekent met het tijdsverschil van elke stad voor vandaag, dus kijk rond die data nog eens als de overlap in je team krap is.",
      ],
    },
    {
      title: "Hoe hij het uitrekent",
      body: [
        "Hij neemt de dag in halve uren in de tijd van de eerste persoon, rekent met de tijdzonegegevens van je browser uit hoe laat het voor ieder ander is, en telt wie binnen zijn werktijden valt. Halve uren zijn nodig voor India, dat vijfenhalf uur voorloopt op UTC. Werktijden over middernacht, zoals van 22 tot 6 uur, werken ook, en alles draait in je browser.",
      ],
    },
  ],
  fit: {
    title: "Haal meer uit de gedeelde uren",
    body: "TinyFloor is een virtueel kantoor voor remote teams. Tijdens de uren die jullie delen, is iedereen die er is op dezelfde verdieping, en een vraag is even naar iemands bureau lopen in plaats van een call inplannen. Het is gratis tot 3 mensen en $ 29 per maand voor het hele team.",
    cta: "Probeer het demokantoor",
  },
  faqTitle: "Veelgestelde <em>vragen.</em>",
  faq: [
    {
      q: "Hoe vind ik een vergadertijd over tijdzones heen?",
      a: "Noteer van iedereen de stad en werktijden en zoek de halve uren waarin iedereen tegelijk werkt. De planner hierboven doet dat voor maximaal 12 mensen en toont het resultaat in ieders eigen tijd.",
    },
    {
      q: "Hoeveel uur overlap heeft een remote team nodig?",
      a: "Twee tot vier uur per dag is genoeg voor de meeste teams: genoeg voor een standup, snelle vragen en af en toe een meeting. De rest van het werk kan schriftelijk, in ieders eigen werktijd.",
    },
    {
      q: "Wat is een eerlijk vergadertijdstip over tijdzones heen?",
      a: "Een tijdstip binnen ieders werktijden. Is dat er niet, rouleer het vroege of late tijdstip dan per week, zodat niet steeds dezelfden het krijgen.",
    },
    {
      q: "Wat als mijn team helemaal geen overlap heeft?",
      a: "Werk schriftelijk: schriftelijke standups aan het begin van ieders dag, een overdrachtsnotitie aan het eind en live meetings per regio. De meeste teams vinden toch nog één gedeeld uur per week.",
    },
    {
      q: "Houdt de planner rekening met zomertijd?",
      a: "Ja. Hij gebruikt het tijdsverschil van elke stad voor vandaag uit de tijdzonegegevens van je browser, dus zomertijd telt mee. Kijk eind maart en eind oktober nog eens, als de klok op verschillende data omgaat.",
    },
  ],
};

export default nl;
