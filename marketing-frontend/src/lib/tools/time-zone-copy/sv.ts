import type { TimeZonesContent } from "@/lib/tools/time-zones";

const sv: TimeZonesContent = {
  meta: {
    title: "Mötesplanerare för tidszoner: hitta distansteamets gemensamma timmar",
    description:
      "Lägg till stad och arbetstid för varje person i teamet och se när alla arbetar samtidigt, eller tiden som passar flest när ingen tid passar alla. Räknar med sommartid och halvtimmar, som i Indien.",
  },
  eyebrow: "Gratis verktyg",
  updated: "Uppdaterad",
  title: "När teamets arbetstider <em>överlappar.</em>",
  intro:
    "Lägg till stad och arbetstid för varje person. Planeraren visar timmarna då alla arbetar samtidigt, i var och ens egen tid, och när ingen timme passar alla, den som passar flest. Den räknar med dagens tidsskillnader, så sommartiden är med.",
  planner: {
    zone: "Tidszon",
    hours: "Arbetstid",
    remove: "Ta bort",
    add: "Lägg till person",
    addMine: "Lägg till min tidszon",
    timesIn: "Tider i {city}",
    working: "Arbetar",
    all: "Alla",
    everyone: "Alla arbetar {from}–{to}, tid i {city}.",
    best: "Ingen tid passar alla. {from}–{to}, tid i {city}, passar {count} av {total}.",
    nobody: "Arbetstiderna överlappar inte.",
    eachLocal: "I var och ens tid:",
  },
  sections: [
    {
      title: "Hur mycket överlapp ett team behöver",
      body: [
        "Mindre än man tror. Två till fyra gemensamma timmar om dagen räcker för en standup, för frågorna som går fortare att ställa än att skriva och för ett möte när det behövs. Allt annat kan ske skriftligt, på var och ens egen arbetstid.",
        "Det som svider är inget överlapp alls, eller överlapp som bara finns för att någon jobbar klockan 7 eller 22 varje dag. Om planeraren visar gemensam tid bara i kanten av någons dag är det den personen som betalar för teamets möten.",
      ],
    },
    {
      title: "Hitta en rättvis mötestid",
      items: [
        {
          title: "Mötas inom de gemensamma timmarna",
          body: "Lägg standupen och återkommande möten i det spann planeraren visar, och håll resten av de gemensamma timmarna fria för snabba frågor. Gemensam tid är det knappaste ett utspritt team har.",
        },
        {
          title: "Rotera den obekväma tiden",
          body: "När den enda möjliga tiden är tidig för några och sen för andra, växla vecka för vecka så att det inte alltid är samma personer som loggar in på kvällen.",
        },
        {
          title: "Färre och kortare möten",
          body: "En standup på 15 minuter ryms i nästan vilket överlapp som helst; ett möte på en timme oftast inte. Fråga om mötet kunde vara en skriftlig uppdatering innan ni letar tid för det.",
        },
        {
          title: "Skriv ner resultatet",
          body: "Den som inte kunde vara med ska kunna komma ikapp på två minuter: några rader om vad som beslutades och vem som gör vad, postade där teamet redan läser.",
        },
        {
          title: "Visa dina arbetstider",
          body: "Lägg in din arbetstid i kalendern och statusen, så att ingen behöver räkna ut om det är ett bra tillfälle att fråga dig något.",
        },
      ],
    },
    {
      title: "När det inte finns något överlapp",
      items: [
        { title: "Skriftliga standups", body: "Var och en skriver i början av sin dag vad de gjort, vad som kommer härnäst och vad som står i vägen. De andra läser det i början av sin." },
        { title: "Två mindre möten", body: "Dela teamet efter region för livemöten, med en person i båda eller delade anteckningar, så att det viktiga når båda sidor." },
        { title: "Överlämning i slutet av dagen", body: "När ens kväll är någon annans morgon låter en kort anteckning i slutet av dagen arbetet gå vidare medan den första sover." },
        { title: "En gemensam timme i veckan", body: "Även ett team utan dagligt överlapp kan hitta en timme i veckan då alla tänjer lite, och rotera vem som tänjer mest." },
      ],
    },
    {
      title: "Sommartiden flyttar överlappet",
      body: [
        "Klockan ställs om på olika datum på olika platser, så teamets gemensamma timmar kan flytta en timme under några veckor varje vår och höst. USA byter den andra söndagen i mars och den första i november, Europa den sista söndagen i mars och oktober. Australien, Nya Zeeland och Chile byter tvärtom, under sin egen vår. Indien, Kina, Japan, Brasilien och Mexiko byter inte alls.",
        "Planeraren räknar ut varje stads tidsskillnad för i dag, så kolla igen runt de datumen om teamets överlapp är snävt.",
      ],
    },
    {
      title: "Hur den räknar",
      body: [
        "Den delar upp dagen i halvtimmar i den första personens tid, räknar ut vad klockan är för alla andra med tidszonsdatan i din webbläsare och räknar vilka som är inom sin arbetstid. Halvtimmar behövs för Indien, som ligger fem och en halv timme före UTC. Arbetstider över midnatt, som 22 till 6, fungerar också, och allt körs i din webbläsare.",
      ],
    },
  ],
  fit: {
    title: "Få ut mer av de gemensamma timmarna",
    body: "TinyFloor är ett virtuellt kontor för små team. Under timmarna ni delar är alla som är inne på samma våning, och en fråga är en promenad till någons skrivbord i stället för ett samtal att boka. Det är gratis för upp till 3 personer och 29 $ i månaden för hela teamet.",
    cta: "Prova demokontoret",
  },
  faqTitle: "Vanliga <em>frågor.</em>",
  faq: [
    {
      q: "Hur hittar jag en mötestid över tidszoner?",
      a: "Skriv upp varje persons stad och arbetstid och leta efter halvtimmarna då alla arbetar samtidigt. Planeraren ovan gör det för upp till 12 personer och visar resultatet i var och ens tid.",
    },
    {
      q: "Hur många timmars överlapp behöver ett distansteam?",
      a: "Två till fyra timmar om dagen räcker för de flesta team: tillräckligt för en standup, snabba frågor och ett möte ibland. Resten av arbetet kan skrivas och göras på var och ens egen tid.",
    },
    {
      q: "Vad är en rättvis mötestid över tidszoner?",
      a: "En som ligger inom allas arbetstid. Finns ingen, rotera den tidiga eller sena tiden vecka för vecka så att inte samma personer alltid tar den.",
    },
    {
      q: "Vad gör vi om teamet inte har något överlapp?",
      a: "Arbeta skriftligt: skriftliga standups i början av var och ens dag, en överlämning i slutet och livemöten uppdelade efter region. De flesta team hittar ändå en gemensam timme i veckan.",
    },
    {
      q: "Räknar planeraren med sommartid?",
      a: "Ja. Den använder varje stads tidsskillnad för i dag från webbläsarens tidszonsdata, så sommartiden är med. Kolla igen i slutet av mars och oktober, när klockan ställs om på olika datum.",
    },
  ],
};

export default sv;
