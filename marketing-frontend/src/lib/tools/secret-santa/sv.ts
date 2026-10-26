import type { SantaContent } from "@/lib/tools/secret-santa";

/** The Secret Santa generator in Swedish, written from the English page. */
const sv: SantaContent = {
  meta: {
    title: "Secret Santa-lottning online: gratis, utan e-post och konto",
    description: "Lotta Secret Santa på några sekunder och skicka en privat länk till alla som visar vem de ska köpa till. Gratis, utan e-post eller konton, och skapat för team som jobbar på distans.",
  },
  eyebrow: "Gratis verktyg",
  updated: "Uppdaterad",
  title: "Secret Santa-<em>lottning.</em>",
  intro: "Skriv in allas namn, lotta och skicka en egen privat länk till varje person: den visar vem de ska köpa till och ingen annans val. Inga e-postadresser, inga konton, och det fungerar för team utspridda i olika länder. Nedanför: hur du kör Secret Santa online, reglerna och presenttips till kollegor.",
  drawer: {
    names: "Namn",
    namesHint: "Ett per rad, minst tre. Lägg till dig själv om du är med.",
    budget: "Budget",
    date: "Datum för utdelning",
    optional: "(valfritt)",
    draw: "Lotta namn",
    redraw: "Lotta om",
    redrawNote: "En ny lottning skapar nya länkar. Skicka bara de senaste.",
    tooFew: "Lägg till minst tre namn.",
    duplicate: "Två personer har samma namn. Lägg till en initial så att alla hittar sin egen länk.",
    linksTitle: "Privata länkar",
    linksNote: "Skicka varje person sin egen länk, i ett meddelande till bara dem. När de öppnar den ser de vem de ska köpa till.",
    copy: "Kopiera länk",
    copied: "Kopierad",
    copyAll: "Kopiera alla länkar",
    allIntro: "Secret Santa: öppna bara länken med ditt namn.",
    revealTitle: "Hej {name}, du är Secret Santa för…",
    show: "Visa namnet",
    lookAway: "Se till att ingen tittar på din skärm.",
    budgetLabel: "Budget",
    dateLabel: "Julklappsbyte",
    keepSecret: "Håll det hemligt fram till julklappsbytet.",
    own: "Lotta namn för din egen grupp",
  },
  sections: [
    {
      title: "Så gör du Secret Santa online",
      items: [
        {
          title: "Samla in namnen",
          body: "Fråga vilka som vill vara med. Att delta bör vara valfritt på jobbet: en Secret Santa som folk tvingas in i är inte rolig för någon.",
        },
        {
          title: "Bestäm en budget och ett datum",
          body: "En siffra som bestäms i förväg, så att ingen lägger tre gånger så mycket som personen som köper till dem. Datumet är när paketen öppnas.",
        },
        { title: "Lotta namnen", body: "Skriv in namnen ovan och dra. Alla får någon, och ingen får sig själv." },
        {
          title: "Skicka länkarna",
          body: "Skicka varje person deras egen länk i ett direktmeddelande eller mejl. Organisatören kan också vara med: du ser länkarna, inte vem som lottades med vem.",
        },
        { title: "Öppna julklapparna tillsammans", body: "På ett videosamtal eller på festen, en i taget, där alla får gissa vem som var deras Secret Santa." },
      ],
    },
    {
      title: "Secret Santa med ett distansteam",
      body: [
        "När teamet arbetar från olika städer eller olika länder måste julklapparna skickas. Det enklaste sättet är digitala presenter: ett presentkort, en e-bok, en månad av en streamingtjänst eller en donation i personens namn. Om folk hellre vill skicka något fysiskt kan organisatören samla in hemadresser privat och bara ge varje adress till den som behöver den, eller så kan alla beställa från en butik som levererar i respektive land.",
        "Öppna julklapparna tillsammans i ett samtal, helst som en del av en avslutningsfest för året. Våra [idéer för virtuella julfester](/guides/virtual-holiday-party-ideas) innehåller ett schema och lekar som passar till.",
      ],
    },
    {
      title: "Regler för Secret Santa",
      items: [
        { title: "Håll dig till budgeten", body: "Under går bra, över blir stelt. Budgeten är hela poängen: en liten julklapp, vald med omsorg." },
        { title: "Håll det hemligt", body: "Berätta inte för någon vem du fick förrän julklapparna har öppnats, och fråga inte andra vem de fick." },
        { title: "Håll det lämpligt för jobbet", body: "Inget för personligt, och inget som kan göra någon generad inför kollegorna." },
        { title: "Dela en önskan", body: "Om alla skriver en kort önskan i teamchatten, som ”Jag önskar mig en bra bok”, slipper folk gissa." },
        { title: "Gör det valfritt", body: "Vissa firar inte, eller vill inte vara med. De är ändå välkomna på festen." },
      ],
    },
    {
      title: "Secret Santa-presenttips till kollegorna",
      body: [
        "Idéer som är enkla att ta med och som passar de flesta budgetar:",
      ],
      items: [
        { title: "Kaffe eller te", detail: "Under 200 kr", body: "En påse kaffe från ett lokalt rosteri, eller ett urval av goda teer." },
        { title: "En bok", detail: "Under 200 kr", body: "Något du själv gillade i år, med en lapp som förklarar varför." },
        { title: "En skrivbordsväxt", detail: "Under 250 kr", body: "Liten, svår att ta död på och fin att titta på under videosamtal." },
        { title: "Ett presentkort", detail: "Vilken budget som helst", body: "Till en bokhandel, en cafékedja eller matleverans där de bor." },
        { title: "En fin anteckningsbok", detail: "Under 200 kr", body: "Användbar för alla som fortfarande skriver saker för hand." },
        { title: "En månad av något", detail: "Under 150 kr", body: "En prenumeration på musik, ljudböcker eller streaming, skickad som en presentkod." },
        { title: "Ett pussel eller spel", detail: "Under 250 kr", body: "Något för kvällarna, eller för hela familjen." },
        {
          title: "Något från din stad",
          detail: "Under 200 kr",
          body: "Lokalt godis eller en liten sak som bara tillverkas där du bor. Distansteam älskar sådant.",
        },
      ],
    },
  ],
  fit: {
    title: "Öppna julklapparna tillsammans",
    body: "TinyFloor är ett virtuellt kontor för små team. Öppna julklapparna i mötesrummet med video och skärmdelning, och stanna sedan kvar och prata vid era skrivbord efteråt, precis som på en riktig fest. Det är gratis för upp till 3 personer och 29 $ i månaden för hela teamet.",
    cta: "Prova demokontoret",
  },
  faqTitle: "Vanliga <em>frågor.</em>",
  faq: [
    {
      q: "Hur fungerar den här Secret Santa-generatorn?",
      a: "Skriv in namnen, gör lottningen och skicka länken med personens namn till var och en. När de öppnar den ser de vem de ska köpa till, samt budget och datum om du har angett det.",
    },
    {
      q: "Behöver man en e-postadress eller ett konto?",
      a: "Nej. Det krävs ingen registrering och inget skickas med e-post: du skickar länkarna själv, i en chatt, ett mejl eller ett sms.",
    },
    {
      q: "Kan organisatören vara med?",
      a: "Ja. Organisatören ser länkarna, inte vem som lottades till vem, så lägg till ditt eget namn och öppna bara din egen länk.",
    },
    { q: "Kan man dra sitt eget namn?", a: "Nej. Alla får någon annan, och alla tilldelas exakt en Secret Santa." },
    {
      q: "Hur gör man Secret Santa med ett distansteam?",
      a: "Gör lottningen online, skicka en privat länk till alla, kom överens om en budget och välj digitala presenter eller samla in adresser privat. Öppna sedan presenterna tillsammans under ett videosamtal.",
    },
    {
      q: "Vad är en bra Secret Santa-budget på jobbet?",
      a: "Något som alla har råd med utan att behöva tänka på det, ofta 150 till 300 kr. Ange en specifik summa i inbjudan så att presenterna känns jämna.",
    },
    {
      q: "Är den här Secret Santa-generatorn gratis?",
      a: "Ja, helt utan gräns för antalet personer. Den körs i din webbläsare, och namnen följer bara med i länkarna du skickar.",
    },
  ],
};

export default sv;
