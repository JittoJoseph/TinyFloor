import type { OooContent } from "@/lib/tools/out-of-office";

/** Generatorn för frånvaromeddelanden på svenska, skriven utifrån den engelska sidan. */
const sv: OooContent = {
  meta: {
    title: "Frånvaromeddelande: gratis generator, mallar och exempel",
    description:
      "Skriv ditt frånvaromeddelande på några sekunder: ett autosvar för mejlen och en status för Slack eller Teams, för semester, sjukdom, tjänsteresa med mera.",
  },
  eyebrow: "Gratis verktyg",
  updated: "Uppdaterad",
  title: "Generator för <em>frånvaromeddelanden.</em>",
  intro:
    "Ange varför du är borta, när du är tillbaka och vem som kan hjälpa till under tiden, så får du ett autosvar för mejlen och en kort status för teamchatten, redo att klistra in. Nedanför: exempel för alla situationer, och hur du slår på det i Outlook, Gmail, Slack och Teams.",
  writer: {
    reason: "Varför du är borta",
    reasons: { vacation: "Semester", sick: "Sjuk", travel: "Tjänsteresa", parental: "Föräldraledig", holiday: "Helgdag" },
    back: "Tillbaka",
    unknown: "Lämna tomt om du inte vet än.",
    name: "Ditt namn",
    contact: "Vem man kan kontakta i stället",
    email: "Personens e-post",
    optional: "(valfritt)",
    tone: "Ton",
    tones: { professional: "Formell", friendly: "Vänlig", short: "Kort" },
    emailTitle: "Autosvar för mejlen",
    statusTitle: "Status för Slack, Teams eller TinyFloor",
    statusNote: "Högst 100 tecken, så att den får plats i en Slack-status.",
    copy: "Kopiera",
    copied: "Kopierad",
  },
  sections: [
    {
      title: "Exempel på frånvaromeddelanden",
      body: [
        "Varje bra frånvaromeddelande säger tre saker: att du är borta, när du är tillbaka och vem man kan kontakta om det inte kan vänta. Så här låter det i de vanligaste situationerna; generatorn ovan skriver samma sak med dina datum och namn.",
      ],
      items: [
        {
          title: "Semester",
          detail: "Årlig semester",
          body: "\"Tack för ditt mejl. Jag har semester och är tillbaka måndag 2 november. Jag svarar på ditt meddelande när jag är tillbaka. Vid brådskande ärenden, kontakta Ana Lima (ana@example.com).\"",
        },
        {
          title: "Sjuk",
          detail: "Kort och privat",
          body: "\"Tack för ditt mejl. Jag är inte på kontoret idag och svarar så snart jag är tillbaka. Vid brådskande ärenden, kontakta Ana Lima.\" Att du är sjuk behöver du inte skriva; du är inte skyldig någon detaljerna.",
        },
        {
          title: "Tjänsteresa eller konferens",
          detail: "Långsammare, inte borta",
          body: "\"Tack för ditt meddelande! Jag är på tjänsteresa till och med torsdag 5 november och läser mejl mer sällan än vanligt. Jag hör av mig när jag är tillbaka. Om det inte kan vänta kan Ana Lima hjälpa dig.\"",
        },
        {
          title: "Föräldraledighet",
          detail: "Lång frånvaro",
          body: "\"Tack för ditt mejl. Jag är föräldraledig till 2 februari och läser inte mejl under den tiden. För frågor om mina projekt, kontakta Ana Lima (ana@example.com), som ersätter mig.\" Vid lång frånvaro: ange en person, inte bara ett datum.",
        },
        {
          title: "Helgdag",
          detail: "För hela teamet",
          body: "\"Tack för ditt mejl. Vårt kontor är stängt på grund av helgdagen och öppnar igen tisdag 3 november. Vi svarar på ditt meddelande när vi är tillbaka.\"",
        },
        {
          title: "Den korta",
          detail: "För kollegor",
          body: "\"Ledig till 3 november. Brådskande? Kontakta Ana Lima.\" Inom ditt eget företag är kortare oftast bättre.",
        },
        {
          title: "Jul och nyår",
          detail: "Ledighet över helgerna",
          body: "\"Tack för ditt mejl. Jag är ledig över helgerna och är tillbaka måndag 4 januari. Jag svarar på ditt meddelande när jag är tillbaka. Vid brådskande ärenden, kontakta Ana Lima (ana@example.com). Önskar dig ett gott nytt år.\"",
        },
        {
          title: "En halvdag",
          detail: "Tillbaka samma dag",
          body: "\"Tack för ditt mejl. Jag är inte på kontoret i eftermiddag och svarar i morgon bitti.\" Om du bara är borta några timmar räcker det ofta med en status i chatten.",
        },
        {
          title: "För kunder",
          detail: "Utanför ditt företag",
          body: "\"Tack för att du kontaktar oss. Jag är inte på kontoret förrän måndag 2 november. För beställningar och support, skriv till support@example.com, där vårt team svarar inom en arbetsdag.\" Outlook kan ställas in så att detta meddelande bara skickas till personer utanför din organisation.",
        },
        {
          title: "Sista dagen på företaget",
          detail: "Slutar för gott",
          body: "\"Tack för ditt mejl. Jag har nu slutat på Example Ltd. För allt som rör mina arbetsuppgifter, kontakta Ana Lima (ana@example.com), som tar över.\" Företag brukar behålla ett sådant här autosvar på en slutad medarbetares e-postadress under några månader.",
        },
      ],
    },
    {
      title: "Så ställer du in frånvaromeddelande i Outlook",
      body: [
        "I nya Outlook och Outlook på webben öppnar du Inställningar (kugghjulet), går till Konto och sedan Automatiska svar. Slå på automatiska svar, kryssa i att de bara ska skickas under en viss tidsperiod, välj start- och slutdatum och klistra in ditt meddelande. Du kan skriva ett annat meddelande till personer utanför organisationen, vilket är en bra idé: kollegor behöver mindre förklaring än kunder.",
        "I klassiska Outlook för Windows går du till Arkiv och sedan Automatiska svar, och fyller i samma uppgifter. Om du anger ett slutdatum stänger Outlook av svaren själv, så du behöver inte komma ihåg det.",
        "I Outlook för Mac går du till Verktyg och sedan Automatiska svar. I Outlook-appen på en iPhone eller Android-telefon trycker du på din profilbild, sedan på kugghjulet för Inställningar, väljer ditt arbetskonto och trycker på Automatiska svar. Oavsett vilken du använder sparas svaret på ditt konto, så om du slår på det på ett ställe aktiveras det överallt.",
      ],
    },
    {
      title: "Så ställer du in frånvaromeddelande i Gmail",
      body: [
        "Klicka på kugghjulet i Gmail och sedan på Visa alla inställningar. På fliken Allmänt scrollar du ned till autosvaret vid frånvaro, slår på det, väljer första och sista dag, lägger till en ämnesrad som \"Frånvarande till 3 november\", klistrar in ditt meddelande och klickar på Spara ändringar längst ned.",
        "Gmail skickar autosvaret en gång per person under en fyradagarsperiod, inte på varje meddelande, så den som skriver två gånger får det inte två gånger. Du kan också välja att bara skicka det till dina kontakter, eller bara till personer i din organisation på ett jobbkonto.",
      ],
    },
    {
      title: "Frånvaro i Slack och Microsoft Teams",
      body: [
        "Teamchattar skickar inga autosvar, så en status gör jobbet i stället: den syns bredvid ditt namn överallt där folk försöker skriva till dig. I Slack klickar du på din profilbild, väljer Update your status (uppdatera status), lägger till en emoji och en kort rad som \"🌴 Semester till 3 nov.\" och ställer in att den rensas när du är tillbaka. Pausa aviseringar för samma dagar, så blir telefonen också tyst.",
        "I Microsoft Teams klickar du på din profilbild och väljer Ange statusmeddelande. Skriv ditt meddelande och välj när det ska rensas. I samma dialog finns en länk för att schemalägga frånvaro, som slår på både ditt autosvar i Outlook och din status i Teams. Statusen från generatorn ovan är kort nog för båda.",
      ],
    },
    {
      title: "Vad ett bra frånvaromeddelande innehåller",
      items: [
        { title: "När du är tillbaka", body: "Ett datum, inte \"nästa vecka\". Om du inte vet än, skriv att du svarar så snart du är tillbaka." },
        { title: "Vem som kan hjälpa till", body: "Ett namn, och en e-postadress om det är någon utanför konversationen. Fråga personen först; ingen vill få veta av en kund att de är ersättare." },
        { title: "Inte för många detaljer", body: "\"Inte på kontoret\" räcker. Var du är och varför angår ingen, och ett semestermål i ett autosvar berättar för främlingar att ditt hem står tomt." },
        { title: "Inga löften du inte håller", body: "\"Jag svarar när jag är tillbaka\" är bra. \"Jag svarar på alla mejl\" efter två veckors ledighet stämmer sällan." },
        { title: "Stäng av det", body: "Ange ett slutdatum i Outlook eller Gmail, och en tid då chattstatusen rensas, så att ingen får höra att du är borta samma dag som du är tillbaka." },
      ],
    },
  ],
  fit: {
    title: "Frånvaro, inbyggt i kontoret",
    body: "I TinyFloor, ett virtuellt kontor för små team, syns en statusnotis som \"🌴 Semester till måndag\" vid ditt namn, så att teamet vet innan de försöker nå dig, och den rensas av sig själv på dagen. Det körs i en webbläsarflik, gratis för upp till 3 personer och 29 $ i månaden för hela teamet.",
    cta: "Prova demokontoret",
  },
  faqTitle: "Vanliga <em>frågor.</em>",
  faq: [
    {
      q: "Vad ska ett frånvaromeddelande innehålla?",
      a: "Att du är borta, när du är tillbaka och vem man kan kontakta om det är brådskande. Till exempel: \"Jag är tillbaka måndag 2 november. Vid brådskande ärenden, kontakta Ana Lima.\"",
    },
    {
      q: "Hur ställer jag in frånvaromeddelande i Outlook?",
      a: "I nya Outlook eller Outlook på webben: Inställningar, Konto, Automatiska svar. I klassiska Outlook för Windows: Arkiv, Automatiska svar. Slå på det, välj datum och klistra in ditt meddelande.",
    },
    {
      q: "Hur ställer jag in frånvaromeddelande i Gmail?",
      a: "Klicka på kugghjulet, Visa alla inställningar, och slå på autosvaret vid frånvaro på fliken Allmänt. Välj datum, ämnesrad och meddelande, och klicka sedan på Spara ändringar.",
    },
    {
      q: "Ska jag skriva varför jag är borta?",
      a: "Nej. \"Inte på kontoret\" räcker. Att skriva att du har semester är vanligt och helt okej, men du behöver aldrig ge detaljer, särskilt inte om du är sjuk.",
    },
    {
      q: "Hur ser ett formellt frånvaromeddelande ut?",
      a: "\"Tack för ditt mejl. Jag är inte på kontoret och är tillbaka måndag 2 november. Jag svarar på ditt meddelande när jag är tillbaka. Vid brådskande ärenden, kontakta Ana Lima (ana@example.com).\"",
    },
    {
      q: "Är den här generatorn för frånvaromeddelanden gratis?",
      a: "Ja, och den körs helt i din webbläsare: namnen, datumen och e-postadresserna du skriver skickas aldrig någonstans. Kopiera meddelandet till Outlook, Gmail, Slack eller Teams.",
    },
    {
      q: "Vad betyder OOO?",
      a: "OOO står för \"out of office\" (inte på kontoret). Man brukar skriva det i kalendrar, statusar i chatten och ämnesrader i mejl, som till exempel \"OOO till måndag\", för att visa att man är borta och inte svarar direkt.",
    },
    {
      q: "Är automatiska svar samma sak som ett frånvaromeddelande?",
      a: "Ja. Automatiska svar är vad Outlook kallar sitt frånvaromeddelande, och Gmail kallar det autosvar vid frånvaro. De skickar alla ett svar till personer som skriver till dig medan du är borta.",
    },
    {
      q: "Hur ställer jag in frånvaromeddelande i Teams?",
      a: "Klicka på din profilbild, välj Ange statusmeddelande och sedan Schemalägg frånvaro. Slå på automatiska svar, skriv ditt meddelande och ställ in datumen. Teams visar dig som frånvarande, och Outlook skickar samma meddelande till alla som mejlar dig.",
    },
    {
      q: "Hur ställer jag in frånvaromeddelande i Outlook på mobilen?",
      a: "I Outlook-appen trycker du på din profilbild, sedan på kugghjulet för Inställningar, väljer ditt arbetskonto och trycker på Automatiska svar. Slå på det, skriv ditt meddelande och ställ in datumen.",
    },
  ],
};

export default sv;
