import type { SantaContent } from "@/lib/tools/secret-santa";

/** The Secret Santa generator in Dutch, written from the English page. */
const nl: SantaContent = {
  meta: {
    title: "Lootjes trekken online: gratis, zonder e-mail of account",
    description: "Trek binnen een paar seconden online lootjes voor Secret Santa en stuur iedereen een persoonlijke link die laat zien voor wie ze een cadeau kopen. Gratis, zonder e-mail of account, en gemaakt voor teams die op afstand werken.",
  },
  eyebrow: "Gratis tool",
  updated: "Bijgewerkt op",
  title: "Lootjes trekken <em>online.</em>",
  intro: "Vul de namen in, trek de lootjes en stuur iedereen een eigen persoonlijke link. Deze laat zien voor wie diegene een cadeau koopt, zonder dat de rest het ziet. Geen e-mails, geen accounts, en het werkt ook voor teams die over verschillende landen verspreid zijn. Daaronder: hoe je online lootjes trekt voor bijvoorbeeld Sinterklaas, de spelregels en cadeau-ideeën voor collega's.",
  drawer: {
    names: "Namen",
    namesHint: "Eén per regel, minimaal drie. Voeg jezelf toe als je meedoet.",
    budget: "Budget",
    date: "Datum cadeau-uitwisseling",
    optional: "(optioneel)",
    draw: "Lootjes trekken",
    redraw: "Opnieuw trekken",
    redrawNote: "Opnieuw trekken maakt nieuwe links. Stuur alleen de nieuwste.",
    tooFew: "Voeg minimaal drie namen toe.",
    duplicate: "Twee mensen hebben dezelfde naam. Voeg een initiaal toe zodat iedereen de eigen link kan vinden.",
    linksTitle: "Persoonlijke links",
    linksNote: "Stuur iedereen een eigen link, in een persoonlijk bericht. Als ze de link openen, zien ze voor wie ze kopen.",
    copy: "Link kopiëren",
    copied: "Gekopieerd",
    copyAll: "Alle links kopiëren",
    allIntro: "Lootjes trekken: open alleen de link met jouw naam.",
    revealTitle: "Hoi {name}, jij hebt het lootje getrokken van…",
    show: "Naam tonen",
    lookAway: "Zorg dat er niemand meekijkt op je scherm.",
    budgetLabel: "Budget",
    dateLabel: "De uitwisseling",
    keepSecret: "Houd het geheim tot de uitwisseling.",
    own: "Trek lootjes voor je eigen groep",
  },
  sections: [
    {
      title: "Hoe werkt online lootjes trekken voor Secret Santa of Sinterklaas",
      items: [
        {
          title: "Verzamel de namen",
          body: "Vraag wie er mee wil doen. Meedoen moet op het werk vrijwillig zijn: lootjes trekken waar mensen toe worden gedwongen is voor niemand leuk.",
        },
        {
          title: "Bepaal een budget en een datum",
          body: "Eén bedrag vooraf, zodat niemand drie keer zoveel uitgeeft als degene die een cadeautje voor hen koopt. De datum is de dag waarop de cadeautjes worden opengemaakt.",
        },
        { title: "Trek de lootjes", body: "Typ de namen hierboven en trek de lootjes. Iedereen krijgt een naam, en niemand trekt zichzelf." },
        {
          title: "Stuur de links",
          body: "Stuur iedereen een eigen link via een chatbericht of e-mail. De organisator kan ook meedoen: je ziet wel de links, maar niet wie wie heeft getrokken.",
        },
        {
          title: "Maak de cadeaus samen open",
          body: "Tijdens een videogesprek of op het feestje, één voor één, waarbij iedereen raadt wie hun Secret Santa was.",
        },
      ],
    },
    {
      title: "Lootjes trekken met een team op afstand",
      body: [
        "Als het team in verschillende steden of landen werkt, moeten de cadeaus worden verzonden. De makkelijkste optie zijn digitale cadeaus: een cadeaubon, een e-book, een maand van een streamingdienst of een donatie in iemands naam. Als mensen liever iets tastbaars sturen, kan de organisator de thuisadressen privé verzamelen en elk adres alleen doorgeven aan de persoon die het nodig heeft. Iedereen kan ook bestellen bij een webshop die in het juiste land bezorgt.",
        "Maak de cadeaus samen open tijdens een videogesprek, idealiter als onderdeel van een eindejaarsfeest. Onze [ideeën voor een virtueel eindejaarsfeest](/guides/virtual-holiday-party-ideas) bevatten een programma en spelletjes voor erbij.",
      ],
    },
    {
      title: "Spelregels voor lootjes trekken",
      items: [
        {
          title: "Houd je aan het budget",
          body: "Eronder is prima, eroverheen is ongemakkelijk. Het budget is juist het idee: een klein cadeau, met zorg uitgekozen.",
        },
        { title: "Houd het geheim", body: "Vertel aan niemand wie je hebt getrokken totdat de cadeaus zijn opengemaakt, en vraag anderen niet wie zij hebben." },
        { title: "Houd het geschikt voor op het werk", body: "Niets te persoonlijks, en niets waarmee je iemand in verlegenheid brengt tegenover collega's." },
        { title: "Deel een wens", body: "Als mensen een korte wens delen in de teamchat, zoals „Ik wil graag een goed boek”, hoeft niemand te raden." },
        { title: "Maak het optioneel", body: "Sommige mensen vieren het niet, of willen dat niet. Ze zijn nog steeds welkom op het feest." },
      ],
    },
    {
      title: "Cadeau-ideeën voor lootjes trekken met collega's",
      body: [
        "Ideeën die makkelijk te versturen zijn en binnen de meeste budgetten passen:",
      ],
      items: [
        { title: "Koffie of thee", detail: "Onder de € 20", body: "Een zak koffiebonen van een goede lokale branderij, of een theepakket." },
        { title: "Een boek", detail: "Onder de € 20", body: "Iets waar je dit jaar dol op was, met een briefje erbij waarom." },
        { title: "Een bureauplant", detail: "Onder de € 25", body: "Klein, moeilijk dood te krijgen en leuk om naar te kijken tijdens videogesprekken." },
        { title: "Een cadeaubon", detail: "Elk budget", body: "Voor een boekhandel, koffieketen of maaltijdbezorger waar ze wonen." },
        { title: "Een mooi notitieboek", detail: "Onder de € 20", body: "Handig voor iedereen die nog dingen opschrijft." },
        { title: "Een maandabonnement op iets", detail: "Onder € 15", body: "Een abonnement op muziek, luisterboeken of streaming, verzonden als cadeaucode." },
        { title: "Een puzzel of spel", detail: "Onder € 25", body: "Iets voor de avonden, of voor het hele gezin." },
        {
          title: "Iets uit je eigen stad",
          detail: "Onder € 20",
          body: "Lokale lekkernijen of iets kleins dat alleen in jouw omgeving gemaakt wordt. Teams op afstand zijn er dol op.",
        },
      ],
    },
  ],
  fit: {
    title: "Samen de cadeautjes uitpakken",
    body: "TinyFloor is een virtueel kantoor voor kleine teams. Pak de cadeautjes uit in de vergaderruimte met video en schermdelen, en blijf daarna gezellig napraten aan jullie bureaus, net als op een echt feestje. Het is gratis tot 3 mensen en $ 29 per maand voor het hele team.",
    cta: "Probeer het demokantoor",
  },
  faqTitle: "Veelgestelde <em>vragen.</em>",
  faq: [
    {
      q: "Hoe werkt deze generator voor lootjes trekken voor Sinterklaas of Secret Santa?",
      a: "Vul de namen in, trek de lootjes en stuur iedereen de link met hun naam. Als ze die openen, zien ze voor wie ze een cadeau kopen, met het budget en de datum als je die hebt ingesteld.",
    },
    {
      q: "Hebben mensen een e-mailadres of account nodig?",
      a: "Nee. Er is geen registratie en er wordt niets gemaild: je verstuurt de links zelf, via chat, e-mail of een bericht.",
    },
    {
      q: "Kan de organisator ook meedoen?",
      a: "Ja. De organisator ziet de links, maar niet wie wie heeft getrokken. Voeg dus je eigen naam toe en open alleen je eigen link.",
    },
    { q: "Kan iemand zijn eigen naam trekken?", a: "Nee. Iedereen krijgt iemand anders, en iedereen wordt door precies één persoon getrokken." },
    {
      q: "Hoe doe je aan lootjes trekken met een team op afstand?",
      a: "Trek online lootjes, stuur iedereen een persoonlijke link, spreek een budget af en kies voor digitale cadeaus of verzamel de adressen privé. Open de cadeaus daarna samen tijdens een videogesprek.",
    },
    {
      q: "Wat is een goed budget voor lootjes trekken op het werk?",
      a: "Iets wat iedereen kan betalen zonder erover na te denken, vaak 15 tot 30 euro. Noem één bedrag in de uitnodiging, zodat de cadeaus gelijkwaardig voelen.",
    },
    {
      q: "Is deze generator voor lootjes trekken gratis?",
      a: "Ja, zonder limiet op het aantal mensen. Het draait in je browser, en de namen worden alleen meegestuurd in de links die je verstuurt.",
    },
  ],
};

export default nl;
