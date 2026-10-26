import type { OooContent } from "@/lib/tools/out-of-office";

/** Generatoren til fraværsbeskeder på dansk, skrevet ud fra den engelske side. */
const da: OooContent = {
  meta: {
    title: "Fraværsbesked: gratis generator, skabeloner og eksempler",
    description:
      "Skriv din fraværsbesked på få sekunder: et autosvar til mailen og en status til Slack eller Teams, til ferie, sygdom, tjenesterejse og mere. Med eksempler.",
  },
  eyebrow: "Gratis værktøj",
  updated: "Opdateret",
  title: "Generator til <em>fraværsbeskeder.</em>",
  intro:
    "Skriv, hvorfor du er væk, hvornår du er tilbage, og hvem der kan hjælpe imens, og få et autosvar til mailen og en kort status til teamchatten, klar til at indsætte. Nedenfor: eksempler til enhver situation, og hvordan du slår det til i Outlook, Gmail, Slack og Teams.",
  writer: {
    reason: "Hvorfor du er væk",
    reasons: { vacation: "Ferie", sick: "Syg", travel: "Tjenesterejse", parental: "Barsel", holiday: "Helligdag" },
    back: "Tilbage",
    unknown: "Lad feltet stå tomt, hvis du ikke ved det endnu.",
    name: "Dit navn",
    contact: "Hvem man kan kontakte i stedet",
    email: "Vedkommendes mail",
    optional: "(valgfrit)",
    tone: "Tone",
    tones: { professional: "Formel", friendly: "Venlig", short: "Kort" },
    emailTitle: "Autosvar til mailen",
    statusTitle: "Status til Slack, Teams eller TinyFloor",
    statusNote: "Højst 100 tegn, så den passer til en Slack-status.",
    copy: "Kopiér",
    copied: "Kopieret",
  },
  sections: [
    {
      title: "Eksempler på fraværsbeskeder",
      body: [
        "Enhver god fraværsbesked siger tre ting: at du er væk, hvornår du er tilbage, og hvem man kan kontakte, hvis det ikke kan vente. Sådan lyder det i de mest almindelige situationer; generatoren ovenfor skriver det samme med dine datoer og navne.",
      ],
      items: [
        {
          title: "Ferie",
          detail: "Årlig ferie",
          body: "\"Tak for din mail. Jeg holder ferie og er tilbage mandag den 2. november. Jeg svarer på din henvendelse, når jeg er tilbage. I hastende sager kan du kontakte Ana Lima (ana@example.com).\"",
        },
        {
          title: "Syg",
          detail: "Kort og privat",
          body: "\"Tak for din mail. Jeg er ikke på kontoret i dag og svarer, så snart jeg er tilbage. I hastende sager kan du kontakte Ana Lima.\" Du behøver ikke skrive, at du er syg; du skylder ingen detaljerne.",
        },
        {
          title: "Tjenesterejse eller konference",
          detail: "Langsommere, ikke væk",
          body: "\"Tak for din besked! Jeg er på tjenesterejse til og med torsdag den 5. november og tjekker mail sjældnere end normalt. Jeg vender tilbage, når jeg er hjemme. Hvis det ikke kan vente, kan Ana Lima hjælpe.\"",
        },
        {
          title: "Barsel",
          detail: "Langt fravær",
          body: "\"Tak for din mail. Jeg er på barsel til 2. februar og læser ikke mail i den periode. Spørgsmål om mine projekter kan rettes til Ana Lima (ana@example.com), som dækker for mig.\" Ved langt fravær: angiv en person, ikke kun en dato.",
        },
        {
          title: "Helligdag",
          detail: "For hele teamet",
          body: "\"Tak for din mail. Vores kontor er lukket på grund af helligdagen og åbner igen tirsdag den 3. november. Vi svarer på din henvendelse, når vi er tilbage.\"",
        },
        {
          title: "Den korte",
          detail: "Til kolleger",
          body: "\"Fri til 3. november. Haster det? Kontakt Ana Lima.\" Inden for din egen virksomhed er kortere som regel bedre.",
        },
        {
          title: "Jul og nytår",
          detail: "Juleferie",
          body: "\"Tak for din mail. Jeg holder juleferie og er tilbage mandag den 4. januar. Jeg svarer på din henvendelse, når jeg er tilbage. I hastende sager kan du kontakte Ana Lima (ana@example.com). Godt nytår.\"",
        },
        {
          title: "En halv dag",
          detail: "Tilbage samme dag",
          body: "\"Tak for din mail. Jeg er ikke på kontoret i eftermiddag og svarer i morgen tidlig.\" Hvis du kun er væk i et par timer, er en statusbesked i chatten ofte nok i sig selv.",
        },
        {
          title: "Til kunder",
          detail: "Uden for din virksomhed",
          body: "\"Tak for din henvendelse. Jeg er ikke på kontoret og er tilbage mandag den 2. november. For bestillinger og support bedes du skrive til support@example.com, hvor teamet svarer inden for en arbejdsdag.\" Outlook kan indstilles til kun at sende denne besked til folk uden for din organisation.",
        },
        {
          title: "Sidste dag i virksomheden",
          detail: "Forlader virksomheden helt",
          body: "\"Tak for din mail. Jeg har nu forladt Example Ltd. For alt, hvad jeg arbejdede på, bedes du kontakte Ana Lima (ana@example.com), som tager over.\" Virksomheder beholder normalt et svar som dette på en fratrådt medarbejders mailadresse i et par måneder.",
        },
      ],
    },
    {
      title: "Sådan opretter du en fraværsbesked i Outlook",
      body: [
        "I nye Outlook og Outlook på nettet åbner du Indstillinger (tandhjulet), går til Konto og derefter Automatiske svar. Slå automatiske svar til, sæt flueben ved kun at sende dem i en bestemt periode, vælg start- og slutdato, og indsæt din besked. Du kan skrive en anden besked til folk uden for organisationen, og det er en god idé: kolleger har brug for mindre forklaring end kunder.",
        "I klassisk Outlook til Windows går du til Filer og derefter Automatiske svar og udfylder de samme oplysninger. Hvis du angiver en slutdato, slår Outlook selv svarene fra, så du behøver ikke huske det.",
        "I Outlook til Mac går du til Værktøjer og derefter Automatiske svar. I Outlook-appen på en iPhone eller Android-telefon trykker du på dit profilbillede, derefter på tandhjulet for Indstillinger, vælger din arbejdskonto og trykker på Automatiske svar. Uanset hvad du bruger, gemmes svaret på din konto, så når du slår det til ét sted, slås det til overalt.",
      ],
    },
    {
      title: "Sådan opretter du en fraværsbesked i Gmail",
      body: [
        "Klik på tandhjulet i Gmail og derefter på Se alle indstillinger. På fanen Generelt scroller du ned til autosvaret ved fravær, slår det til, vælger første og sidste dag, tilføjer et emne som \"Fraværende til 3. november\", indsætter din besked og klikker på Gem ændringer nederst.",
        "Gmail sender autosvaret én gang pr. person inden for fire dage, ikke på hver besked, så den, der skriver to gange, får det ikke to gange. Du kan også vælge kun at sende det til dine kontakter eller, på en arbejdskonto, kun til folk i din organisation.",
      ],
    },
    {
      title: "Fravær i Slack og Microsoft Teams",
      body: [
        "Teamchats sender ikke autosvar, så en status gør arbejdet i stedet: den vises ved dit navn overalt, hvor folk prøver at skrive til dig. I Slack klikker du på dit profilbillede, vælger Update your status (opdatér status), tilføjer en emoji og en kort linje som \"🌴 På ferie til 3. nov.\" og indstiller den til at forsvinde, når du er tilbage. Sæt notifikationer på pause for de samme dage, så er telefonen også stille.",
        "I Microsoft Teams klikker du på dit profilbillede og vælger Angiv statusmeddelelse. Skriv din besked, og vælg, hvornår den skal forsvinde. I samme dialog er der et link til at planlægge fravær, som slår både dit autosvar i Outlook og din Teams-status til på én gang. Statussen fra generatoren ovenfor er kort nok til begge.",
      ],
    },
    {
      title: "Hvad en god fraværsbesked indeholder",
      items: [
        { title: "Hvornår du er tilbage", body: "En dato, ikke \"i næste uge\". Hvis du ikke ved det endnu, så skriv, at du svarer, så snart du er tilbage." },
        { title: "Hvem der kan hjælpe", body: "Et navn og en mail, hvis det er en uden for samtalen. Spørg vedkommende først; ingen bryder sig om at høre fra en kunde, at de dækker for dig." },
        { title: "Ikke for mange detaljer", body: "\"Ikke på kontoret\" er nok. Hvor du er og hvorfor, rager ingen, og et feriemål i et autosvar fortæller fremmede, at dit hjem står tomt." },
        { title: "Ingen løfter, du ikke holder", body: "\"Jeg svarer, når jeg er tilbage\" er fint. \"Jeg svarer på alle mails\" efter to ugers fravær holder sjældent stik." },
        { title: "Slå det fra igen", body: "Angiv en slutdato i Outlook eller Gmail og et tidspunkt, hvor chatstatussen forsvinder, så ingen får at vide, at du er væk, den dag du er tilbage." },
      ],
    },
  ],
  fit: {
    title: "Fravær, bygget ind i kontoret",
    body: "I TinyFloor, et virtuelt kontor til små teams, står en statusnote som \"🌴 På ferie til mandag\" ved dit navn, så teamet ved det, før de prøver at fange dig, og den forsvinder af sig selv på dagen. Det kører i en browserfane, gratis for op til 3 personer og 29 $ om måneden for hele teamet.",
    cta: "Prøv demokontoret",
  },
  faqTitle: "Ofte stillede <em>spørgsmål.</em>",
  faq: [
    {
      q: "Hvad skal der stå i en fraværsbesked?",
      a: "At du er væk, hvornår du er tilbage, og hvem man kan kontakte, hvis det haster. For eksempel: \"Jeg er tilbage mandag den 2. november. I hastende sager kan du kontakte Ana Lima.\"",
    },
    {
      q: "Hvordan opretter jeg en fraværsbesked i Outlook?",
      a: "I nye Outlook eller Outlook på nettet: Indstillinger, Konto, Automatiske svar. I klassisk Outlook til Windows: Filer, Automatiske svar. Slå det til, vælg datoer, og indsæt din besked.",
    },
    {
      q: "Hvordan opretter jeg en fraværsbesked i Gmail?",
      a: "Klik på tandhjulet, Se alle indstillinger, og slå autosvaret ved fravær til på fanen Generelt. Vælg datoer, emne og besked, og klik så på Gem ændringer.",
    },
    {
      q: "Skal jeg skrive, hvorfor jeg er væk?",
      a: "Nej. \"Ikke på kontoret\" er nok. At skrive, at du holder ferie, er almindeligt og helt fint, men du behøver aldrig give detaljer, især ikke om sygdom.",
    },
    {
      q: "Hvordan ser en formel fraværsbesked ud?",
      a: "\"Tak for din mail. Jeg er ikke på kontoret og er tilbage mandag den 2. november. Jeg svarer på din henvendelse, når jeg er tilbage. I hastende sager kan du kontakte Ana Lima (ana@example.com).\"",
    },
    {
      q: "Er denne generator til fraværsbeskeder gratis?",
      a: "Ja, og den kører helt i din browser: de navne, datoer og mails, du skriver, sendes aldrig nogen steder hen. Kopiér beskeden til Outlook, Gmail, Slack eller Teams.",
    },
    {
      q: "Hvad betyder OOO?",
      a: "OOO står for \"out of office\" (ikke på kontoret). Folk skriver det i kalendere, statusbeskeder i chatten og i emnefeltet på mails, som f.eks. \"OOO til mandag\", for at fortælle, at de er væk og ikke svarer med det samme.",
    },
    {
      q: "Er et automatisk svar det samme som en fraværsbesked?",
      a: "Ja. Automatiske svar er det, Outlook kalder sin fraværsbesked, og Gmail kalder det autosvaret ved fravær. De sender alle et svar til folk, der skriver til dig, mens du er væk.",
    },
    {
      q: "Hvordan opretter jeg en fraværsbesked i Teams?",
      a: "Klik på dit profilbillede, vælg Indstil statusmeddelelse og derefter Planlæg fravær. Slå automatiske svar til, skriv din besked, og vælg datoerne. Teams viser dig som fraværende, og Outlook sender den samme besked til alle, der sender dig en mail.",
    },
    {
      q: "Hvordan opretter jeg en fraværsbesked i Outlook på min telefon?",
      a: "I Outlook-appen trykker du på dit profilbillede, derefter på tandhjulet for Indstillinger, vælger din arbejdskonto og trykker på Automatiske svar. Slå det til, skriv din besked, og vælg datoerne.",
    },
  ],
};

export default da;
