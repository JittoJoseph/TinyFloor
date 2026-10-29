import type { StandupContent } from "@/lib/tools/standup";

/** Mallen för daily standup på svenska, skriven utifrån den engelska sidan. */
const sv: StandupContent = {
  meta: {
    title: "Mall för daily standup: gratis agenda och asynkron standup",
    description:
      "Skapa en agenda för daily standup anpassad efter teamets storlek, eller en mall för asynkron standup i Slack eller Teams. Gratis, med tre frågeuppsättningar.",
  },
  eyebrow: "Gratis verktyg",
  updated: "Uppdaterad",
  title: "Mall för <em>daily standup.</em>",
  intro:
    "En bra daily standup tar ungefär en minut per person och slutar med att alla vet vad som händer och vem som har kört fast. Välj hur stort teamet är och hur ni träffas, i ett samtal, i skrift eller längs tavlan, och få en agenda med rätt tider, eller en mall att posta i teamchatten.",
  builder: {
    team: "Teamets storlek",
    people: "{count} personer",
    format: "Hur ni träffas",
    formats: { live: "I ett samtal", async: "I skrift (asynkront)", board: "Längs tavlan" },
    questions: "Frågor",
    sets: [
      { key: "classic", label: "Klassiska", questions: ["Vad gjorde du igår?", "Vad ska du göra idag?", "Står något i vägen?"] },
      { key: "focus", label: "Fokus", questions: ["Vad är din viktigaste prioritet idag?", "Vad kan stoppa den?", "Vem behöver du hjälp av?"] },
      { key: "progress", label: "Framsteg", questions: ["Vad har gått framåt?", "Vad händer härnäst?", "Finns det risker vi borde känna till?"] },
    ],
    icebreaker: "Börja med en isbrytare på en minut",
    minutes: "{count} minuter",
    agenda: "Agenda",
    template: "Mall att posta",
    copy: "Kopiera",
    copied: "Kopierad",
    lines: {
      open: "Start: börja i tid, även om någon är sen",
      icebreaker: "Isbrytare: en snabb fråga, en mening var",
      round: "Runda: alla svarar, ungefär en minut var",
      column: "{column}: vad som har fastnat, vad som kommer härnäst",
      blockers: "Hinder: bestäm vem som hjälper till, och prata efteråt",
      close: "Avslut: sådant alla behöver veta",
    },
    columns: ["Blockerat", "Granskas", "Pågår", "Nästa"],
    note: {
      live: "Ungefär en minut per person, lite mindre i ett större team, plus en minut för att öppna och avsluta. Högst femton minuter: längre än så är det ett möte, inte en standup.",
      async: "Be alla posta före samma klockslag varje morgon i sin egen tidszon, läsa varandras uppdateringar och svara i en tråd på allt som har fastnat.",
      board: "Gå igenom tavlan från höger: först det arbete som är närmast klart, så att teamet gör färdigt innan det börjar på nytt. Fem minuter plus ungefär en per person.",
    },
  },
  sections: [
    {
      title: "Vad en daily standup är till för",
      body: [
        "En daily standup är ett kort möte, oftast i början av dagen, där alla i teamet berättar vad de jobbar med och om något står i vägen. Den kommer från agila mjukvaruteam, där den också kallas daily scrum, men fungerar för alla små team vars arbete hänger ihop.",
        "Den är ingen statusrapport till chefen. Poängen är att teamet ser dagen framför sig tillsammans: vem som gör vad, var två uppgifter möts och vem som behöver hjälp. Om en standup hjälper någon vidare var den värd det; om den är en runda uppläsningar som ingen lyssnar på var den inte det.",
      ],
    },
    {
      title: "Tre sätt att köra den",
      items: [
        {
          title: "I ett samtal",
          detail: "Klassikern",
          body: "Alla ansluter samtidigt och svarar i tur och ordning på samma tre frågor. Bäst för team i närliggande tidszoner som gillar att ses en gång om dagen. Håll det till ungefär en minut per person.",
        },
        {
          title: "I skrift",
          detail: "Asynkron standup",
          body: "Alla postar sina svar i teamchatten före ett bestämt klockslag och läser de andras. Bäst för team i olika tidszoner, eller team som redan har många möten. Samtalet försvinner, så gör det till en vana att svara på allt som har fastnat.",
        },
        {
          title: "Längs tavlan",
          detail: "Arbetet först, personerna sedan",
          body: "I stället för att gå laget runt går ni igenom uppgiftstavlan kolumn för kolumn, med början i det arbete som är närmast klart. Bäst för team med en full tavla, där frågan är vad som har fastnat snarare än vad alla har gjort.",
        },
      ],
    },
    {
      title: "De tre standupfrågorna",
      body: [
        "De tre klassiska är vad du gjorde igår, vad du ska göra idag och om något står i vägen. De fungerar, men de bjuder in till en lista över allt man har rört vid. Om era standups drar ut på tiden, prova en skarpare uppsättning:",
      ],
      items: [
        {
          title: "Klassiska",
          body: "Vad gjorde du igår? Vad ska du göra idag? Står något i vägen? Bekanta för alla och bra för ett nytt team.",
        },
        {
          title: "Fokus",
          body: "Vad är din viktigaste prioritet idag? Vad kan stoppa den? Vem behöver du hjälp av? Kortare svar, och den sista frågan gör hinder till konkreta förfrågningar.",
        },
        {
          title: "Framsteg",
          body: "Vad har gått framåt? Vad händer härnäst? Några risker? Handlar om arbetet snarare än personen, och passar bra längs tavlan.",
        },
      ],
    },
    {
      title: "En agenda för daily standup, minut för minut",
      body: [
        "För ett team på sex personer i ett samtal tar en standup ungefär åtta minuter. Börja i tid, även om någon är sen: att vänta lär alla att komma sent. Gå sedan laget runt i en fast ordning, den som folk syns i på skärmen eller i bokstavsordning, så att ingen undrar när det är deras tur.",
        "När någon tar upp ett problem, lös det inte i standupen. Notera vem som kan hjälpa till och kom överens om att prata direkt efteråt, bara med dem som behöver vara med. Den enda vanan håller en standup under tio minuter. Avsluta med att fråga om det finns något alla behöver veta, och avsluta samtalet.",
      ],
      table: {
        head: ["Teamets storlek", "I ett samtal", "Längs tavlan"],
        rows: [
          ["3 personer", "5 minuter", "8 minuter"],
          ["6 personer", "8 minuter", "11 minuter"],
          ["8 personer", "10 minuter", "13 minuter"],
          ["12 personer", "11 minuter", "15 minuter"],
          ["15 personer", "14 minuter", "15 minuter"],
        ],
        note: "Beräknat på samma sätt som verktyget ovan: ungefär en minut per person (tre kvarts minut för fler än åtta personer) plus två för att öppna och avsluta, och aldrig mer än femton.",
      },
    },
    {
      title: "Så kör du en asynkron standup",
      body: [
        "En asynkron standup är samma tre frågor, besvarade i skrift. Välj en kanal och en tid, till exempel kl. 10 i var och ens egen tidszon, och be alla posta sina svar som ett enda meddelande, med mallen ovan så att de är lätta att skumma.",
        "Två saker får det att fungera. För det första: läs varandras uppdateringar; en asynkron standup som ingen läser är en dagbok. För det andra: svara i en tråd på allt som har fastnat, samma dag. Vissa team behåller också ett kort samtal i veckan, så att de fortfarande ses.",
      ],
    },
    {
      title: "Vanliga misstag på standupen",
      items: [
        { title: "Den blir problemlösning", body: "Någon tar upp ett problem och tre personer börjar lösa det. Notera det, bestäm vem som pratar efteråt och gå vidare." },
        { title: "Den blir en rapport till chefen", body: "Om alla tittar på teamledaren när de pratar är standupen till för fel person. Prata med teamet." },
        { title: "För många personer", body: "Fler än ungefär tolv personer, och ingen lyssnar på alla. Dela upp i mindre standups per projekt eller arbetsflöde." },
        { title: "Börja sent", body: "Att vänta fem minuter på den sista personen kostar alla andra fem minuter, varje dag. Börja i tid." },
        { title: "Att säga \"inga hinder\" varje dag", body: "Om ingen någonsin har kört fast, ställ en skarpare fråga: \"Vad kan stoppa din prioritet idag?\" brukar hitta något." },
      ],
    },
  ],
  fit: {
    title: "Håll standupen på våningen",
    body: "TinyFloor är ett virtuellt kontor för distansteam: du ser vem som sitter vid sitt skrivbord, och standupen är en promenad till mötesrummet i stället för ännu en länk. Efteråt går du fram till den som har kört fast. Det körs i en webbläsarflik, gratis för upp till 3 personer och 29 $ i månaden för hela teamet.",
    cta: "Prova demokontoret",
  },
  faqTitle: "Vanliga <em>frågor.</em>",
  faq: [
    {
      q: "Vilka är de tre frågorna på en daily standup?",
      a: "Vad gjorde du igår? Vad ska du göra idag? Står något i vägen? En skarpare version: Vad är din viktigaste prioritet idag? Vad kan stoppa den? Vem behöver du hjälp av?",
    },
    {
      q: "Hur lång ska en daily standup vara?",
      a: "Ungefär en minut per person, plus en eller två minuter för att öppna och avsluta: runt åtta minuter för ett team på sex. Högst femton minuter.",
    },
    {
      q: "Vad är en mall för daily standup?",
      a: "En fast agenda för mötet, eller ett meddelandeformat för en skriftlig standup: samma tre frågor i samma ordning varje dag, så att uppdateringar går snabbt att ge och är lätta att skumma.",
    },
    {
      q: "Vad är en asynkron standup?",
      a: "En standup i skrift: alla postar sina svar på de tre frågorna i teamchatten före ett bestämt klockslag och läser de andras. Den passar team i olika tidszoner.",
    },
    {
      q: "Är daily standup bara för scrumteam?",
      a: "Nej. Den kommer från agila mjukvaruteam, där den kallas daily scrum, men alla små team vars arbete hänger ihop kan använda den.",
    },
    {
      q: "Är det här verktyget för daily standup gratis?",
      a: "Ja, och det körs helt i din webbläsare: inget av det du väljer skickas någonstans. Kopiera agendan eller mallen till din kalenderinbjudan eller teamchatt.",
    },
  ],
};

export default sv;
