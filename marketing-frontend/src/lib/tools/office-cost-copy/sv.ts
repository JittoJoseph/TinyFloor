import type { OfficeCostsContent } from "@/lib/tools/office-costs";

const sv: OfficeCostsContent = {
  meta: {
    title: "Priskalkylator för virtuella kontor: vad 10 verktyg kostar ditt team",
    description:
      "Ange hur stort ditt team är och se vad Gather, SoWork, Spot, Kumospace, WorkAdventure, SpatialChat, Roam, oVice, Sococo och TinyFloor kostar i månaden, med års- eller månadsbetalning, enligt varje produkts egen prissida.",
  },
  eyebrow: "Gratis verktyg",
  updated: "Priser kontrollerade",
  title: "Vad ett virtuellt kontor <em>kostar ditt team.</em>",
  intro:
    "De flesta virtuella kontor tar betalt per person, några per rum eller per kontor, och gratisplanerna slutar vid olika storlekar. Ange hur många ni är i teamet för att se vad vart och ett av tio verktyg kostar i månaden, billigast först.",
  calculator: {
    people: "Personer i teamet",
    count: "{count} personer",
    billing: { yearly: "Årsbetalning", monthly: "Månadsbetalning" },
    product: "Produkt",
    free: "Gratisplan",
    price: "Betalplan",
    perMonth: "{amount} i månaden",
    perYear: "{amount} om året",
    only: { yearly: "bara årsvis", monthly: "bara månadsvis" },
    noFree: "Ingen gratisplan",
    fits: "Gratis i den här storleken",
    upTo: "Upp till {count} personer",
    pricingPage: "Prissida",
    basis: {
      office: "Ett pris för kontoret",
      member: "Per medlem",
      activeMember: "Per aktiv medlem",
      space: "Per rum",
      seat: "Per plats, minst 10",
    },
    limits: {
      everyFeature: "alla funktioner",
      thirtyMinutes: "möten på 30 minuter",
      oneFloor: "en våning",
      atOnce: "samtidigt",
      twoHours: "2 timmar om dagen",
      preRelease: "förhandsversion, utan support",
    },
    summary: "För {count} personer kostar planer per person {low} till {high} i månaden. TinyFloor kostar {tinyfloor}.",
    summaryLarge: "För {count} personer kostar planer per person {low} till {high} i månaden.",
  },
  sections: [
    {
      title: "Hur virtuella kontor tar betalt",
      body: ["På fyra sätt, och vilket ett verktyg använder avgör mer än listpriset vad ett växande team betalar."],
      items: [
        {
          title: "Per medlem",
          detail: "Gather, SoWork, Spot, Kumospace, WorkAdventure, SpatialChat",
          body: "Du betalar för alla med ett konto, varje månad, oavsett om de kommer in eller inte. Räkningen växer med varje anställning: ett team på 10 betalar dubbelt så mycket som ett på 5.",
        },
        {
          title: "Per aktiv medlem",
          detail: "Roam",
          body: "Du betalar för dem som använde det den månaden. Den som är ledig kostar inget, men de flesta team är aktiva varje månad, så i praktiken fungerar det som per medlem.",
        },
        {
          title: "Per rum eller platspaket",
          detail: "oVice, Sococo",
          body: "Du betalar för ett rum avsett för ett visst antal personer, eller för ett minsta paket platser. Billigt om teamet fyller det, dyrt om inte: Sococo tar betalt för 10 platser även om ni är 4.",
        },
        {
          title: "Ett pris för kontoret",
          detail: "TinyFloor",
          body: "Ett pris oavsett hur många ni är, upp till den storlek planen tar. Att lägga till någon kostar inget, så ingen behöver avgöra om en konsult är värd en plats.",
        },
      ],
    },
    {
      title: "Års- eller månadsbetalning",
      body: [
        "De flesta verktyg per person ger 10 till 20 % rabatt om man betalar ett år i förväg: Gather kostar 12 $ per medlem med årsbetalning och 15 $ med månadsbetalning. Det är ett års åtagande för ett team vars storlek kan ändras, och rabatten är borta om ni slutar efter tre månader.",
        "Vissa tar bara betalt på ett sätt: Roam och TinyFloor månadsvis, Sococo årsvis. Kalkylatorn visar dem med det pris de har och säger det.",
      ],
    },
  ],
  table: {
    title: "Vad ett team på 5, 10 eller 15 betalar i månaden",
    body: [
      "Samma priser vid tre vanliga storlekar, med årsbetalning där verktyget erbjuder det, eftersom det är det lägre priset. Gratisplaner räknas inte här; kalkylatorn ovan visar vilka som passar.",
    ],
    product: "Produkt",
    note: "Priser i amerikanska dollar exklusive skatt, från varje produkts prissida. Sococo tar betalt för minst 10 platser; oVice går från Entry-S till Entry-M vid ungefär 10 fasta medlemmar.",
  },
  after: [
    {
      title: "När en gratisplan räcker",
      body: [
        "En gratisplan som rymmer hela teamet slår alla betalplaner, så kolla gränserna före priset. SoWorks täcker 10 medlemmar men avslutar varje möte efter 30 minuter. WorkAdventures täcker 10 personer online samtidigt. SpatialChats ger 12 personer två timmars möten om dagen, vilket räcker för ett veckomöte men inte för ett kontor som är öppet hela dagen. Kumospaces täcker 5 medlemmar på en våning, och TinyFloors 3 personer med alla funktioner. oVices gratisplan körs på en förhandsversion utan support.",
      ],
    },
    {
      title: "Vad priset inte visar",
      items: [
        {
          title: "Vad som ingår i planen",
          body: "Den billigaste planen är inte alltid den ni skulle använda. SoWork Basic har två mötesinspelningar; inspelningar och AI-anteckningar finns i Premium, för 12 $ per medlem. Gather har inspelning och transkribering. TinyFloor har varken inspelningar eller AI-anteckningar.",
        },
        {
          title: "Gäster",
          body: "Kunder och konsulter som tittar in ibland kan räknas som medlemmar i vissa verktyg. Gather och oVice låter er bjuda in gäster utan att betala för dem; kolla innan ni lägger till personer som bara hälsar på.",
        },
        { title: "Skatt", body: "Alla priser här är exklusive skatt. Beroende på var ni finns läggs moms eller försäljningsskatt till i kassan." },
        {
          title: "Provperioder",
          body: "Gather och Spot har en provperiod på 30 dagar, Roam och oVice 14 dagar, SoWork 7 dagar. Provperioden visar om teamet kommer att använda det; priset om ni kommer att fortsätta betala.",
        },
      ],
    },
    {
      title: "Hur vi kontrollerade",
      body: [
        "Varje pris kommer från produktens egen prissida, länkad i kalkylatorn, läst den månad som står överst. Vi använder planen ett litet team skulle köpa för ett kontor som är öppet hela dagen, inte planer för evenemang eller stora företag. Där en sida bara anger en betalperiod visar vi den. Priser ändras, så kolla prissidan innan du köper; vi kontrollerar igen med några månaders mellanrum.",
      ],
    },
  ],
  fit: {
    title: "Ett pris för hela teamet",
    body: "TinyFloor är ett kontor i webbläsaren för små team: du går fram till någon för att prata, med mötesrum, chatt och skärmdelning. Det är gratis för upp till 3 personer och sedan 29 $ i månaden för hela teamet, hur många ni än är. Det har inga inspelningar eller AI-anteckningar; behöver ni det passar Gather eller SoWork Premium bättre.",
    cta: "Prova demokontoret",
  },
  faqTitle: "Vanliga <em>frågor.</em>",
  faq: [
    {
      q: "Vad kostar ett virtuellt kontor i månaden?",
      a: "För ett team på 10 med en betalplan 29 $ till 195 $ i månaden beroende på verktyg: TinyFloor kostar 29 $ för hela kontoret, verktyg per person kostar från 48 $ (Spot Basic, årsbetalning) till 195 $ (Roam).",
    },
    {
      q: "Vilket är det billigaste virtuella kontoret för ett litet team?",
      a: "En gratisplan som räcker: SoWorks täcker 10 medlemmar med möten på 30 minuter, WorkAdventures 10 personer samtidigt, Kumospaces 5 medlemmar och TinyFloors 3 personer. Därutöver är TinyFloor, för 29 $ i månaden för hela teamet, det lägsta betalpriset från 6 personer och uppåt.",
    },
    {
      q: "Är Gather gratis?",
      a: "Nej. Gather slutade med sin gratisplan 2025. Efter en provperiod på 30 dagar kostar det 12 $ per medlem i månaden med årsbetalning eller 15 $ med månadsbetalning, så ett team på 10 betalar 120 $ till 150 $ i månaden.",
    },
    {
      q: "Är pris per person eller fast pris bättre?",
      a: "Per person är billigare för ett team på 2 eller 3, där priset per huvud är litet. Fast pris vinner när teamet växer, och det kostar aldrig mer när ni lägger till en konsult eller en nyanställd.",
    },
    {
      q: "Ingår skatt i priserna för virtuella kontor?",
      a: "Nej. Priserna på verktygens prissidor, och här, är exklusive skatt; moms eller försäljningsskatt läggs till i kassan beroende på var ni finns.",
    },
  ],
};

export default sv;
