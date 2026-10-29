import type { StandupContent } from "@/lib/tools/standup";

/** Het daily-standup-template in het Nederlands, geschreven vanuit de Engelse pagina. */
const nl: StandupContent = {
  meta: {
    title: "Daily standup template: gratis agenda en async standup",
    description:
      "Maak een agenda voor je daily standup, afgestemd op je team, of een async standup-template voor Slack of Teams. Gratis, met drie vragensets en een handleiding.",
  },
  eyebrow: "Gratis tool",
  updated: "Bijgewerkt op",
  title: "Daily standup <em>template.</em>",
  intro:
    "Een goede daily standup duurt ongeveer een minuut per persoon, en daarna weet iedereen wat er speelt en wie vastzit. Kies hoe groot je team is en hoe jullie samenkomen, in een call, op schrift of langs het bord, en krijg een agenda met de juiste timing, of een template om in de teamchat te zetten.",
  builder: {
    team: "Teamgrootte",
    people: "{count} personen",
    format: "Hoe jullie samenkomen",
    formats: { live: "In een call", async: "Op schrift (async)", board: "Langs het bord" },
    questions: "Vragen",
    sets: [
      { key: "classic", label: "Klassiek", questions: ["Wat heb je gisteren gedaan?", "Wat ga je vandaag doen?", "Zit er iets in de weg?"] },
      { key: "focus", label: "Focus", questions: ["Wat is vandaag je belangrijkste prioriteit?", "Wat kan dat tegenhouden?", "Van wie heb je hulp nodig?"] },
      { key: "progress", label: "Voortgang", questions: ["Wat is er opgeschoten?", "Wat is de volgende stap?", "Zijn er risico's die we moeten weten?"] },
    ],
    icebreaker: "Begin met een icebreaker van een minuut",
    minutes: "{count} minuten",
    agenda: "Agenda",
    template: "Template om te posten",
    copy: "Kopiëren",
    copied: "Gekopieerd",
    lines: {
      open: "Start: begin op tijd, ook als iemand later is",
      icebreaker: "Icebreaker: één korte vraag, één zin per persoon",
      round: "Ronde: iedereen antwoordt, ongeveer een minuut per persoon",
      column: "{column}: wat zit vast, wat komt er nu",
      blockers: "Blokkades: spreek af wie helpt en bespreek het daarna",
      close: "Afsluiting: wat iedereen moet weten",
    },
    columns: ["Geblokkeerd", "In review", "Bezig", "Volgende"],
    note: {
      live: "Ongeveer een minuut per persoon, iets minder in een groter team, plus een minuut om te openen en af te sluiten. Hooguit een kwartier: daarboven is het een meeting, geen standup.",
      async: "Vraag iedereen om elke ochtend vóór hetzelfde tijdstip in hun eigen tijdzone te posten, elkaars updates te lezen en in een thread te reageren op alles wat vastzit.",
      board: "Loop het bord van rechts af: eerst het werk dat het dichtst bij klaar is, zodat het team dingen afmaakt voordat het nieuwe begint. Vijf minuten plus ongeveer één per persoon.",
    },
  },
  sections: [
    {
      title: "Waar een daily standup voor is",
      body: [
        "Een daily standup is een korte meeting, meestal aan het begin van de dag, waarin iedereen in het team zegt waar hij of zij aan werkt en of er iets in de weg zit. Hij komt uit agile softwareteams, waar hij ook daily scrum heet, maar werkt voor elk klein team waarvan het werk van elkaar afhangt.",
        "Het is geen statusrapport voor de manager. Het doel is dat het team samen de dag overziet: wie doet wat, waar twee taken elkaar raken en wie hulp nodig heeft. Als een standup iemand verder helpt, was hij het waard; als het een rondje voordrachten is waar niemand naar luistert, niet.",
      ],
    },
    {
      title: "Drie manieren om het te doen",
      items: [
        {
          title: "In een call",
          detail: "De klassieker",
          body: "Iedereen sluit tegelijk aan en beantwoordt om de beurt dezelfde drie vragen. Het best voor teams in dicht bij elkaar liggende tijdzones die elkaar graag één keer per dag zien. Houd het op ongeveer een minuut per persoon.",
        },
        {
          title: "Op schrift",
          detail: "Async standup",
          body: "Iedereen zet zijn antwoorden vóór een vast tijdstip in de teamchat en leest die van de anderen. Het best voor teams verspreid over tijdzones, of teams die al veel meetings hebben. Het gesprek valt weg, dus maak er een gewoonte van te reageren op alles wat vastzit.",
        },
        {
          title: "Langs het bord",
          detail: "Eerst het werk, dan de mensen",
          body: "In plaats van de mensen langs te gaan, loop je kolom voor kolom het takenbord door, te beginnen bij het werk dat het dichtst bij klaar is. Het best voor teams met een vol bord, waar de vraag is wat vastzit in plaats van wat iedereen heeft gedaan.",
        },
      ],
    },
    {
      title: "De drie standupvragen",
      body: [
        "De klassieke drie zijn wat je gisteren hebt gedaan, wat je vandaag gaat doen en of er iets in de weg zit. Ze werken, maar ze nodigen uit tot een lijst van alles wat iemand heeft aangeraakt. Lopen je standups uit, probeer dan een scherpere set:",
      ],
      items: [
        {
          title: "Klassiek",
          body: "Wat heb je gisteren gedaan? Wat ga je vandaag doen? Zit er iets in de weg? Bekend bij iedereen, en prima voor een nieuw team.",
        },
        {
          title: "Focus",
          body: "Wat is vandaag je belangrijkste prioriteit? Wat kan dat tegenhouden? Van wie heb je hulp nodig? Kortere antwoorden, en de laatste vraag maakt van blokkades concrete verzoeken.",
        },
        {
          title: "Voortgang",
          body: "Wat is er opgeschoten? Wat is de volgende stap? Risico's? Over het werk in plaats van de persoon, en een goede match met langs het bord lopen.",
        },
      ],
    },
    {
      title: "Een daily standup-agenda, minuut voor minuut",
      body: [
        "Voor een team van zes in een call duurt een standup ongeveer acht minuten. Begin op tijd, ook als iemand later is: wachten leert iedereen om te laat te komen. Ga daarna in een vaste volgorde rond, zoals mensen op het scherm staan of op alfabet, zodat niemand zich afvraagt wanneer hij aan de beurt is.",
        "Als iemand een probleem noemt, los het dan niet op in de standup. Noteer wie kan helpen en spreek af om het direct daarna te bespreken, alleen met de mensen die erbij moeten zijn. Die ene gewoonte houdt een standup onder de tien minuten. Sluit af door te vragen of er iets is wat iedereen moet weten, en beëindig de call.",
      ],
      table: {
        head: ["Teamgrootte", "In een call", "Langs het bord"],
        rows: [
          ["3 personen", "5 minuten", "8 minuten"],
          ["6 personen", "8 minuten", "11 minuten"],
          ["8 personen", "10 minuten", "13 minuten"],
          ["12 personen", "11 minuten", "15 minuten"],
          ["15 personen", "14 minuten", "15 minuten"],
        ],
        note: "Berekend zoals de tool hierboven het doet: ongeveer een minuut per persoon (driekwart minuut boven de acht personen) plus twee om te openen en af te sluiten, en nooit meer dan vijftien.",
      },
    },
    {
      title: "Een async standup houden",
      body: [
        "Een async standup is dezelfde drie vragen, op schrift beantwoord. Kies een kanaal en een tijdstip, bijvoorbeeld 10 uur in ieders eigen tijdzone, en vraag iedereen om zijn antwoorden in één bericht te zetten, met het template hierboven zodat ze makkelijk te scannen zijn.",
        "Twee dingen laten het werken. Ten eerste: lees elkaars updates; een async standup die niemand leest, is een dagboek. Ten tweede: reageer dezelfde dag in een thread op alles wat vastzit. Sommige teams houden daarnaast één korte call per week, zodat ze elkaar toch blijven zien.",
      ],
    },
    {
      title: "Veelgemaakte fouten in de standup",
      items: [
        { title: "Hij wordt een probleemoplossessie", body: "Iemand noemt een probleem en drie mensen beginnen het op te lossen. Noteer het, spreek af wie er daarna over praat en ga door." },
        { title: "Het is een verslag aan de manager", body: "Als iedereen tijdens het praten naar de teamleider kijkt, is de standup voor de verkeerde persoon. Praat met het team." },
        { title: "Te veel mensen", body: "Boven de twaalf mensen luistert niemand meer naar iedereen. Splits op in kleinere standups per project of werkstroom." },
        { title: "Te laat beginnen", body: "Vijf minuten wachten op de laatste persoon kost alle anderen vijf minuten, elke dag. Begin op tijd." },
        { title: "Elke dag 'geen blokkades' zeggen", body: "Als niemand ooit vastzit, stel dan een scherpere vraag: \"Wat kan je prioriteit van vandaag tegenhouden?\" vindt meestal wel iets." },
      ],
    },
  ],
  fit: {
    title: "Houd je standup op de verdieping",
    body: "TinyFloor is een virtueel kantoor voor remote teams: je ziet wie aan zijn bureau zit, en de standup is een wandeling naar de vergaderruimte in plaats van nog een link. Loop daarna naar wie vastzit. Het draait in een browsertab, gratis tot 3 mensen en $ 29 per maand voor het hele team.",
    cta: "Probeer het demokantoor",
  },
  faqTitle: "Veelgestelde <em>vragen.</em>",
  faq: [
    {
      q: "Wat zijn de drie vragen van de daily standup?",
      a: "Wat heb je gisteren gedaan? Wat ga je vandaag doen? Zit er iets in de weg? Een scherpere versie: Wat is vandaag je belangrijkste prioriteit? Wat kan dat tegenhouden? Van wie heb je hulp nodig?",
    },
    {
      q: "Hoe lang moet een daily standup duren?",
      a: "Ongeveer een minuut per persoon, plus een of twee minuten om te openen en af te sluiten: rond de acht minuten voor een team van zes. Hooguit een kwartier.",
    },
    {
      q: "Wat is een daily standup-template?",
      a: "Een vaste agenda voor de meeting, of een berichtformat voor een geschreven standup: elke dag dezelfde drie vragen in dezelfde volgorde, zodat updates snel te geven en makkelijk te scannen zijn.",
    },
    {
      q: "Wat is een async standup?",
      a: "Een standup op schrift: iedereen zet zijn antwoorden op de drie vragen vóór een vast tijdstip in de teamchat en leest die van de anderen. Hij past bij teams verspreid over tijdzones.",
    },
    {
      q: "Is een daily standup alleen voor scrumteams?",
      a: "Nee. Hij komt uit agile softwareteams, waar hij daily scrum heet, maar elk klein team waarvan het werk van elkaar afhangt, kan hem gebruiken.",
    },
    {
      q: "Is deze daily standup-tool gratis?",
      a: "Ja, en hij draait volledig in je browser: niets van wat je kiest wordt ergens naartoe gestuurd. Kopieer de agenda of het template naar je agenda-uitnodiging of teamchat.",
    },
  ],
};

export default nl;
