import type { OfficeCostsContent } from "@/lib/tools/office-costs";

const nl: OfficeCostsContent = {
  meta: {
    title: "Kostencalculator virtueel kantoor: wat 9 tools je team kosten",
    description:
      "Vul in hoe groot je team is en zie wat Gather, SoWork, Kumospace, WorkAdventure, SpatialChat, Roam, oVice, Sococo en TinyFloor per maand kosten, bij jaarlijkse of maandelijkse betaling, volgens de prijspagina van elk.",
  },
  eyebrow: "Gratis tools",
  updated: "Prijzen gecontroleerd op",
  title: "Wat een virtueel kantoor <em>je team kost.</em>",
  intro:
    "De meeste virtuele kantoren rekenen per persoon, een paar per ruimte of per kantoor, en de gratis abonnementen houden op bij verschillende groottes. Vul in hoeveel mensen er in je team zitten en zie wat elk van negen tools per maand kost, de goedkoopste eerst.",
  calculator: {
    people: "Mensen in het team",
    count: "{count} mensen",
    billing: { yearly: "Jaarlijks betalen", monthly: "Maandelijks betalen" },
    product: "Product",
    free: "Gratis abonnement",
    price: "Betaald abonnement",
    perMonth: "{amount} per maand",
    perYear: "{amount} per jaar",
    only: { yearly: "alleen jaarlijks", monthly: "alleen maandelijks" },
    noFree: "Geen gratis abonnement",
    fits: "Gratis bij deze grootte",
    upTo: "Tot {count} mensen",
    pricingPage: "Prijspagina",
    basis: {
      office: "Eén prijs voor het kantoor",
      member: "Per lid",
      activeMember: "Per actief lid",
      space: "Per ruimte",
      seat: "Per plek, minimaal 10",
    },
    limits: {
      everyFeature: "alle functies",
      thirtyMinutes: "meetings van 30 minuten",
      oneFloor: "één verdieping",
      atOnce: "tegelijk",
      twoHours: "2 uur per dag",
      preRelease: "voorlopige versie, zonder support",
    },
    summary: "Voor {count} mensen kosten abonnementen per persoon {low} tot {high} per maand. TinyFloor kost {tinyfloor}.",
    summaryLarge: "Voor {count} mensen kosten abonnementen per persoon {low} tot {high} per maand.",
  },
  sections: [
    {
      title: "Hoe virtuele kantoren rekenen",
      body: ["Op vier manieren, en welke een tool gebruikt bepaalt meer dan de vanafprijs wat een groeiend team betaalt."],
      items: [
        {
          title: "Per lid",
          detail: "Gather, SoWork, Kumospace, WorkAdventure, SpatialChat",
          body: "Je betaalt elke maand voor iedereen met een account, of ze nu binnenkomen of niet. De rekening groeit met elke nieuwe collega: een team van 10 betaalt het dubbele van een team van 5.",
        },
        {
          title: "Per actief lid",
          detail: "Roam",
          body: "Je betaalt voor de mensen die het die maand gebruikten. Wie met verlof is kost niets, maar de meeste teams zijn elke maand actief, dus in de praktijk werkt het als per lid.",
        },
        {
          title: "Per ruimte of per blok plekken",
          detail: "oVice, Sococo",
          body: "Je betaalt voor een ruimte die bedoeld is voor een aantal mensen, of voor een minimumblok plekken. Voordelig als je team die vult, duur als dat niet zo is: Sococo rekent 10 plekken, ook als jullie met z’n vieren zijn.",
        },
        {
          title: "Eén prijs voor het kantoor",
          detail: "TinyFloor",
          body: "Eén prijs, hoeveel mensen er ook zijn, tot de grootte die het abonnement toelaat. Iemand toevoegen kost niets, dus niemand hoeft te beslissen of een freelancer een plek waard is.",
        },
      ],
    },
    {
      title: "Jaarlijks of maandelijks betalen",
      body: [
        "De meeste tools per persoon geven 10 tot 20% korting als je een jaar vooruit betaalt: Gather kost $ 12 per lid bij jaarlijkse en $ 15 bij maandelijkse betaling. Dat is een verplichting van een jaar voor een team waarvan de grootte kan veranderen, en de korting is weg als jullie na drie maanden stoppen.",
        "Sommige rekenen maar op één manier: Roam en TinyFloor per maand, Sococo per jaar. De calculator toont die tegen de prijs die ze hebben en zegt dat erbij.",
      ],
    },
  ],
  table: {
    title: "Wat een team van 5, 10 of 15 per maand betaalt",
    body: [
      "Dezelfde prijzen bij drie gangbare groottes, jaarlijks betaald waar de tool dat aanbiedt, omdat dat de laagste prijs is. Gratis abonnementen tellen hier niet mee; de calculator hierboven laat zien welke passen.",
    ],
    product: "Product",
    note: "Prijzen in Amerikaanse dollars exclusief btw, van de prijspagina van elk product. Sococo rekent minimaal 10 plekken; oVice gaat vanaf ongeveer 10 vaste leden van Entry-S naar Entry-M.",
  },
  after: [
    {
      title: "Wanneer een gratis abonnement genoeg is",
      body: [
        "Een gratis abonnement waar je hele team in past, wint van elk betaald abonnement, dus kijk eerst naar de grenzen en dan naar de prijs. Dat van SoWork dekt 10 leden, maar stopt elke meeting na 30 minuten. Dat van WorkAdventure dekt 10 mensen tegelijk online. Dat van SpatialChat geeft 12 mensen twee uur meetings per dag, genoeg voor een wekelijks overleg, niet voor een kantoor dat de hele dag open is. Dat van Kumospace dekt 5 leden op één verdieping, en dat van TinyFloor 3 mensen met alle functies. Het gratis abonnement van oVice draait op een voorlopige versie zonder support.",
      ],
    },
    {
      title: "Wat de prijs niet laat zien",
      items: [
        {
          title: "Wat er in het abonnement zit",
          body: "Het goedkoopste abonnement is niet altijd het abonnement dat jullie zouden gebruiken. SoWork Basic heeft twee meetingopnames; opnames en AI-notities zitten in Premium, voor $ 12 per lid. Gather heeft opname en transcriptie. TinyFloor heeft geen opnames of AI-notities.",
        },
        {
          title: "Gasten",
          body: "Klanten en freelancers die af en toe binnenlopen, tellen bij sommige tools als lid. Gather en oVice laten je gasten uitnodigen zonder voor ze te betalen; controleer het voordat je mensen toevoegt die alleen op bezoek komen.",
        },
        { title: "Btw", body: "Alle prijzen hier zijn exclusief btw. Afhankelijk van waar jullie zitten, komt er bij het afrekenen btw of omzetbelasting bij." },
        {
          title: "Proefperiodes",
          body: "Gather heeft een proefperiode van 30 dagen, Roam en oVice 14 dagen, SoWork 7 dagen. De proefperiode vertelt je of het team het gaat gebruiken; de prijs of jullie blijven betalen.",
        },
      ],
    },
    {
      title: "Hoe we het controleerden",
      body: [
        "Elke prijs komt van de prijspagina van het product zelf, gelinkt in de calculator, gelezen in de maand die bovenaan staat. We gebruiken het abonnement dat een klein team zou kopen voor een kantoor dat de hele dag open is, geen abonnementen voor evenementen of grote bedrijven. Waar een pagina maar één betaalperiode noemt, tonen we die. Prijzen veranderen, dus kijk op de prijspagina voor je koopt; wij controleren het om de paar maanden opnieuw.",
      ],
    },
  ],
  fit: {
    title: "Eén prijs voor het hele team",
    body: "TinyFloor is een kantoor in de browser voor kleine teams: je loopt naar iemand toe om te praten, met een vergaderruimte, chat en schermdelen. Het is gratis tot 3 mensen en daarna $ 29 per maand voor het hele team, met hoeveel jullie ook zijn. Er zijn geen opnames of AI-notities; als jullie die nodig hebben, passen Gather of SoWork Premium beter.",
    cta: "Probeer het demokantoor",
  },
  faqTitle: "Veelgestelde <em>vragen.</em>",
  faq: [
    {
      q: "Wat kost een virtueel kantoor per maand?",
      a: "Voor een team van 10 met een betaald abonnement $ 29 tot $ 195 per maand, afhankelijk van de tool: TinyFloor kost $ 29 voor het hele kantoor, tools per persoon lopen van $ 54 (SoWork Basic, jaarlijks) tot $ 195 (Roam).",
    },
    {
      q: "Wat is het goedkoopste virtuele kantoor voor een klein team?",
      a: "Een gratis abonnement dat past: dat van SoWork dekt 10 leden met meetings van 30 minuten, dat van WorkAdventure 10 mensen tegelijk, dat van Kumospace 5 leden en dat van TinyFloor 3 mensen. Daarboven is TinyFloor, voor $ 29 per maand voor het hele team, vanaf 6 mensen de laagste betaalde prijs.",
    },
    {
      q: "Is Gather gratis?",
      a: "Nee. Gather stopte in 2025 met zijn gratis abonnement. Na een proefperiode van 30 dagen kost het $ 12 per lid per maand bij jaarlijkse of $ 15 bij maandelijkse betaling, dus een team van 10 betaalt $ 120 tot $ 150 per maand.",
    },
    {
      q: "Is een prijs per persoon of een vaste prijs beter?",
      a: "Per persoon is goedkoper voor een team van 2 of 3, waar de prijs per hoofd klein is. Een vaste prijs wint naarmate het team groeit, en kost nooit meer als je een freelancer of een nieuwe collega toevoegt.",
    },
    {
      q: "Zijn prijzen van virtuele kantoren inclusief btw?",
      a: "Nee. De prijzen op de prijspagina’s van de tools, en hier, zijn exclusief btw; btw of omzetbelasting komt er bij het afrekenen bij, afhankelijk van waar jullie zitten.",
    },
  ],
};

export default nl;
