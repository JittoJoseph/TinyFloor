import type { OooContent } from "@/lib/tools/out-of-office";

/** Generatoren for fraværsmeldinger på norsk, skrevet ut fra den engelske siden. */
const no: OooContent = {
  meta: {
    title: "Fraværsmelding: gratis generator, maler og eksempler",
    description:
      "Skriv fraværsmeldingen din på sekunder: et autosvar på e-post og en status for Slack eller Teams, for ferie, sykdom, jobbreise og mer. Med eksempler.",
  },
  eyebrow: "Gratis verktøy",
  updated: "Oppdatert",
  title: "Generator for <em>fraværsmeldinger.</em>",
  intro:
    "Si hvorfor du er borte, når du er tilbake og hvem som kan hjelpe i mellomtiden, og få et autosvar på e-post og en kort status for teamchatten, klare til å lime inn. Nedenfor: eksempler for alle situasjoner, og hvordan du slår det på i Outlook, Gmail, Slack og Teams.",
  writer: {
    reason: "Hvorfor du er borte",
    reasons: { vacation: "Ferie", sick: "Syk", travel: "Jobbreise", parental: "Foreldrepermisjon", holiday: "Helligdag" },
    back: "Tilbake",
    unknown: "La feltet stå tomt hvis du ikke vet ennå.",
    name: "Navnet ditt",
    contact: "Hvem man kan kontakte i stedet",
    email: "Vedkommendes e-post",
    optional: "(valgfritt)",
    tone: "Tone",
    tones: { professional: "Formell", friendly: "Vennlig", short: "Kort" },
    emailTitle: "Autosvar på e-post",
    statusTitle: "Status for Slack, Teams eller TinyFloor",
    statusNote: "Maks 100 tegn, så den passer i en Slack-status.",
    copy: "Kopier",
    copied: "Kopiert",
  },
  sections: [
    {
      title: "Eksempler på fraværsmeldinger",
      body: [
        "Enhver god fraværsmelding sier tre ting: at du er borte, når du er tilbake og hvem man kan kontakte hvis det ikke kan vente. Slik høres det ut i de vanligste situasjonene; generatoren over skriver det samme med dine datoer og navn.",
      ],
      items: [
        {
          title: "Ferie",
          detail: "Årlig ferie",
          body: "\"Takk for e-posten. Jeg har ferie og er tilbake mandag 2. november. Jeg svarer på henvendelsen din når jeg er tilbake. Ved hastesaker, kontakt Ana Lima (ana@example.com).\"",
        },
        {
          title: "Syk",
          detail: "Kort og privat",
          body: "\"Takk for e-posten. Jeg er ikke på kontoret i dag og svarer så snart jeg er tilbake. Ved hastesaker, kontakt Ana Lima.\" Du trenger ikke skrive at du er syk; du skylder ingen detaljene.",
        },
        {
          title: "Jobbreise eller konferanse",
          detail: "Tregere, ikke borte",
          body: "\"Takk for meldingen! Jeg er på jobbreise til og med torsdag 5. november og sjekker e-post sjeldnere enn vanlig. Jeg tar kontakt når jeg er tilbake. Hvis det ikke kan vente, kan Ana Lima hjelpe.\"",
        },
        {
          title: "Foreldrepermisjon",
          detail: "Langt fravær",
          body: "\"Takk for e-posten. Jeg er i foreldrepermisjon til 2. februar og leser ikke e-post i denne perioden. Spørsmål om prosjektene mine kan rettes til Ana Lima (ana@example.com), som er stedfortreder for meg.\" Ved langt fravær: oppgi en person, ikke bare en dato.",
        },
        {
          title: "Helligdag",
          detail: "For hele teamet",
          body: "\"Takk for e-posten. Kontoret vårt er stengt på grunn av helligdagen og åpner igjen tirsdag 3. november. Vi svarer på henvendelsen din når vi er tilbake.\"",
        },
        {
          title: "Den korte",
          detail: "For kolleger",
          body: "\"Fri til 3. november. Haster det? Kontakt Ana Lima.\" Innad i din egen bedrift er kortere som regel bedre.",
        },
        {
          title: "Jul og nyttår",
          detail: "Juleferie",
          body: "\"Takk for e-posten. Jeg har ferie i forbindelse med høytiden og er tilbake mandag 4. januar. Jeg svarer på henvendelsen din når jeg er tilbake. Ved hastesaker, kontakt Ana Lima (ana@example.com). Ønsker deg et godt nytt år!\"",
        },
        {
          title: "En halv dag",
          detail: "Tilbake samme dag",
          body: "\"Takk for e-posten. Jeg er ikke på kontoret i ettermiddag og svarer i morgen tidlig.\" Hvis du bare er borte noen timer, holder det ofte med en statusmelding i chatten.",
        },
        {
          title: "For kunder",
          detail: "Utenfor organisasjonen",
          body: "\"Takk for at du kontakter oss. Jeg er ikke på kontoret og er tilbake mandag 2. november. For bestillinger og kundestøtte, skriv til support@example.com, der teamet svarer innen én virkedag.\" Outlook kan settes til å sende denne kun til personer utenfor organisasjonen.",
        },
        {
          title: "Siste dag i bedriften",
          detail: "Slutter for godt",
          body: "\"Takk for e-posten. Jeg har nå sluttet i Example Ltd. For spørsmål om prosjektene mine, vennligst kontakt Ana Lima (ana@example.com), som tar over etter meg.\" Bedrifter beholder vanligvis et slikt autosvar på e-posten til den som har sluttet i noen måneder.",
        },
      ],
    },
    {
      title: "Slik setter du opp fraværsmelding i Outlook",
      body: [
        "I nye Outlook og Outlook på nettet åpner du Innstillinger (tannhjulet), går til Konto og deretter Automatiske svar. Slå på automatiske svar, kryss av for at de bare skal sendes i en bestemt periode, velg start- og sluttdato, og lim inn meldingen din. Du kan skrive en egen melding til folk utenfor organisasjonen, og det er lurt: kolleger trenger mindre forklaring enn kunder.",
        "I klassisk Outlook for Windows går du til Fil og deretter Automatiske svar, og fyller inn de samme opplysningene. Hvis du setter en sluttdato, slår Outlook av svarene selv, så du trenger ikke huske det.",
        "I Outlook for Mac går du til Verktøy og deretter Automatiske svar. I Outlook-appen på iPhone eller Android-telefon trykker du på profilbildet ditt, deretter på tannhjulet for Innstillinger, velger jobbkontoen din og trykker på Automatiske svar. Uansett hva du bruker, lagres svaret på kontoen din, så hvis du slår det på ett sted, slås det på overalt.",
      ],
    },
    {
      title: "Slik setter du opp fraværsmelding i Gmail",
      body: [
        "Klikk på tannhjulet i Gmail og deretter på Se alle innstillingene. På fanen Generelt blar du ned til autosvaret ved fravær, slår det på, velger første og siste dag, legger til et emne som \"Borte til 3. november\", limer inn meldingen og klikker på Lagre endringene nederst.",
        "Gmail sender autosvaret én gang per person innenfor fire dager, ikke på hver melding, så den som skriver to ganger, får det ikke to ganger. Du kan også velge å bare sende det til kontaktene dine, eller, på en jobbkonto, bare til folk i organisasjonen din.",
      ],
    },
    {
      title: "Fravær i Slack og Microsoft Teams",
      body: [
        "Teamchatter sender ikke autosvar, så en status gjør jobben i stedet: den vises ved navnet ditt overalt der folk prøver å skrive til deg. I Slack klikker du på profilbildet ditt, velger Update your status (oppdater status), legger til en emoji og en kort linje som \"🌴 På ferie til 3. nov.\", og stiller den til å forsvinne når du er tilbake. Sett varsler på pause for de samme dagene, så er telefonen også stille.",
        "I Microsoft Teams klikker du på profilbildet ditt og velger Angi statusmelding. Skriv meldingen og velg når den skal forsvinne. I samme dialog finnes en lenke for å planlegge fravær, som slår på både autosvaret i Outlook og statusen i Teams samtidig. Statusen fra generatoren over er kort nok for begge.",
      ],
    },
    {
      title: "Hva en god fraværsmelding inneholder",
      items: [
        { title: "Når du er tilbake", body: "En dato, ikke \"neste uke\". Hvis du ikke vet ennå, skriv at du svarer så snart du er tilbake." },
        { title: "Hvem som kan hjelpe", body: "Et navn, og en e-postadresse hvis det er noen utenfor samtalen. Spør vedkommende først; ingen liker å høre fra en kunde at de er stedfortreder." },
        { title: "Ikke for mange detaljer", body: "\"Ikke på kontoret\" holder. Hvor du er og hvorfor, angår ingen, og et feriemål i et autosvar forteller fremmede at hjemmet ditt står tomt." },
        { title: "Ingen løfter du ikke holder", body: "\"Jeg svarer når jeg er tilbake\" er fint. \"Jeg svarer på alle e-poster\" etter to uker borte stemmer sjelden." },
        { title: "Slå det av igjen", body: "Sett en sluttdato i Outlook eller Gmail, og et tidspunkt da chatstatusen forsvinner, så ingen får høre at du er borte den dagen du er tilbake." },
      ],
    },
  ],
  fit: {
    title: "Fravær, bygget inn i kontoret",
    body: "I TinyFloor, et virtuelt kontor for små team, står et statusnotat som \"🌴 På ferie til mandag\" ved navnet ditt, så teamet vet det før de prøver å nå deg, og det forsvinner av seg selv på dagen. Det kjører i en nettleserfane, gratis for opptil 3 personer og 29 $ i måneden for hele teamet.",
    cta: "Prøv demokontoret",
  },
  faqTitle: "Vanlige <em>spørsmål.</em>",
  faq: [
    {
      q: "Hva bør stå i en fraværsmelding?",
      a: "At du er borte, når du er tilbake og hvem man kan kontakte hvis det haster. For eksempel: \"Jeg er tilbake mandag 2. november. Ved hastesaker, kontakt Ana Lima.\"",
    },
    {
      q: "Hvordan setter jeg opp fraværsmelding i Outlook?",
      a: "I nye Outlook eller Outlook på nettet: Innstillinger, Konto, Automatiske svar. I klassisk Outlook for Windows: Fil, Automatiske svar. Slå det på, velg datoer og lim inn meldingen.",
    },
    {
      q: "Hvordan setter jeg opp fraværsmelding i Gmail?",
      a: "Klikk på tannhjulet, Se alle innstillingene, og slå på autosvaret ved fravær på fanen Generelt. Velg datoer, emne og melding, og klikk så på Lagre endringene.",
    },
    {
      q: "Bør jeg skrive hvorfor jeg er borte?",
      a: "Nei. \"Ikke på kontoret\" holder. Å skrive at du har ferie er vanlig og helt greit, men du trenger aldri gi detaljer, særlig ikke om sykdom.",
    },
    {
      q: "Hvordan ser en formell fraværsmelding ut?",
      a: "\"Takk for e-posten. Jeg er ikke på kontoret og er tilbake mandag 2. november. Jeg svarer på henvendelsen din når jeg er tilbake. Ved hastesaker, kontakt Ana Lima (ana@example.com).\"",
    },
    {
      q: "Er denne generatoren for fraværsmeldinger gratis?",
      a: "Ja, og den kjører helt i nettleseren din: navnene, datoene og e-postadressene du skriver, sendes aldri noe sted. Kopier meldingen inn i Outlook, Gmail, Slack eller Teams.",
    },
    {
      q: "Hva betyr OOO?",
      a: "OOO står for «out of office» (ikke på kontoret). Folk skriver det i kalendere, statusmeldinger i chatten og emnefelt i e-poster, som for eksempel \"OOO til mandag\", for å si at de er borte og ikke svarer med en gang.",
    },
    {
      q: "Er automatisk svar det samme som en fraværsmelding?",
      a: "Ja. Automatiske svar er det Outlook kaller sin fraværsmelding, og Gmail kaller det autosvar ved fravær. Begge sender et svar til folk som skriver til deg mens du er borte.",
    },
    {
      q: "Hvordan setter jeg opp fraværsmelding i Teams?",
      a: "Klikk på profilbildet ditt, velg Angi statusmelding og deretter Planlegg fravær. Slå på automatiske svar, skriv meldingen din og velg datoer. Teams viser deg som fraværende, og Outlook sender den samme meldingen til alle som sender deg e-post.",
    },
    {
      q: "Hvordan setter jeg opp fraværsmelding i Outlook på mobilen?",
      a: "I Outlook-appen trykker du på profilbildet ditt, deretter på tannhjulet for Innstillinger, velger jobbkontoen din og trykker på Automatiske svar. Slå det på, skriv meldingen din og velg datoer.",
    },
  ],
};

export default no;
