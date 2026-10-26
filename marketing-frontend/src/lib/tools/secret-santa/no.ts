import type { SantaContent } from "@/lib/tools/secret-santa";

/** The Secret Santa generator in Norwegian Bokmål, written from the English page. */
const no: SantaContent = {
  meta: {
    title: "Secret Santa generator på norsk: gratis trekning uten e-post",
    description: "Trekk navn til Secret Santa på sekunder og send alle en privat lenke som viser hvem de skal kjøpe gave til. Gratis, uten e-post eller kontoer, og laget for team som jobber eksternt.",
  },
  eyebrow: "Gratis verktøy",
  updated: "Oppdatert",
  title: "Secret Santa <em>generator.</em>",
  intro: "Skriv inn alles navn, trekk, og send hver person deres egen private lenke: den viser hvem de skal kjøpe gave til, og ingen andres valg. Ingen e-post, ingen kontoer, og det fungerer for team spredt over flere land. Nedenfor: hvordan du arrangerer Secret Santa på nett, reglene og gaveideer til kolleger.",
  drawer: {
    names: "Navn",
    namesHint: "Ett per linje, minst tre. Legg til deg selv hvis du skal være med.",
    budget: "Budsjett",
    date: "Dato for gaveutveksling",
    optional: "(valgfritt)",
    draw: "Trekk navn",
    redraw: "Trekk på nytt",
    redrawNote: "En ny trekning lager nye lenker. Send bare de nyeste.",
    tooFew: "Legg til minst tre navn.",
    duplicate: "To personer har samme navn. Legg til en forbokstav så alle finner sin egen lenke.",
    linksTitle: "Private lenker",
    linksNote: "Send hver person sin egen lenke, i en privat melding. Når de åpner den, ser de hvem de skal kjøpe gave til.",
    copy: "Kopier lenke",
    copied: "Kopiert",
    copyAll: "Kopier alle lenker",
    allIntro: "Secret Santa: åpne bare lenken med navnet ditt.",
    revealTitle: "Hei {name}, du er Secret Santa for…",
    show: "Vis navnet",
    lookAway: "Pass på at ingen ser på skjermen din.",
    budgetLabel: "Budsjett",
    dateLabel: "Gaveutveksling",
    keepSecret: "Hold det hemmelig frem til gaveutvekslingen.",
    own: "Trekk navn for din egen gruppe",
  },
  sections: [
    {
      title: "Slik gjør du Secret Santa på nettet",
      items: [
        {
          title: "Samle inn navnene",
          body: "Spør hvem som vil være med. Det bør være valgfritt å delta på jobb: en Secret Santa folk føler seg tvunget med på, er ikke særlig gøy for noen.",
        },
        {
          title: "Sett et budsjett og en dato",
          body: "Én sum, bestemt på forhånd, så ingen bruker tre ganger så mye som den som kjøper til dem. Datoen er når gavene skal åpnes.",
        },
        { title: "Trekk navnene", body: "Skriv inn navnene ovenfor og trekk. Alle får tildelt noen, og ingen trekker seg selv." },
        {
          title: "Send lenkene",
          body: "Send hver person deres egen lenke i en direktemelding eller e-post. Arrangøren kan også være med: du ser lenkene, ikke hvem som trakk hvem.",
        },
        { title: "Åpne gavene sammen", body: "På en videosamtale eller på festen, én etter én, der alle gjetter hvem deres Secret Santa var." },
      ],
    },
    {
      title: "Secret Santa med et eksternt team",
      body: [
        "Når teamet jobber fra forskjellige byer eller land, må gavene sendes. Den enkleste måten er digitale gaver: et gavekort, en e-bok, en måned med en strømmetjeneste eller en donasjon i personens navn. Hvis folk heller vil sende noe fysisk, kan arrangøren samle inn hjemmeadresser privat og bare gi hver adresse til den som trenger den, eller alle kan bestille fra en butikk som leverer i det aktuelle landet.",
        "Åpne gavene sammen på en videosamtale, gjerne som en del av en juleavslutning. Våre [ideer til virtuelle julebord](/guides/virtual-holiday-party-ideas) har en agenda og selskapsleker dere kan bruke.",
      ],
    },
    {
      title: "Regler for Secret Santa",
      items: [
        { title: "Hold deg til budsjettet", body: "Under er greit, over blir kleint. Budsjettet er hele poenget: en liten gave, valgt med omhu." },
        { title: "Hold det hemmelig", body: "Ikke fortell noen hvem du trakk før gavene er åpnet, og ikke spør andre hvem de fikk." },
        { title: "Hold det passende for jobben", body: "Ingenting personlig, ingenting som kan gjøre noen flau foran kolleger." },
        { title: "Del et ønske", body: "Hvis folk legger til et kort ønske i teamchatten, som «Jeg ønsker meg en god bok», slipper noen å gjette." },
        { title: "Gjør det valgfritt", body: "Noen feirer ikke, eller har ikke lyst. De er fortsatt velkomne på festen." },
      ],
    },
    {
      title: "Secret Santa-gaveideer til kolleger",
      body: [
        "Ideer som er enkle å sende og passer de fleste budsjetter:",
      ],
      items: [
        { title: "Kaffe eller te", detail: "Under 200 kr", body: "En pose fra et godt lokalt brenneri, eller et utvalg av te." },
        { title: "En bok", detail: "Under 200 kr", body: "Noe du likte godt i år, med en lapp som forklarer hvorfor." },
        { title: "En skrivebordsplante", detail: "Under 250 kr", body: "Liten, vanskelig å ta livet av, og fin å se på under videosamtaler." },
        { title: "Et gavekort", detail: "Uansett budsjett", body: "Til en bokhandel, en kafékjede eller matlevering der de bor." },
        { title: "En fin notatbok", detail: "Under 200 kr", body: "Nyttig for alle som fortsatt skriver ting ned." },
        { title: "En måned med noe", detail: "Under 150 kr", body: "Et musikk-, lydbok- eller strømmeabonnement, sendt som gavekode." },
        { title: "Et puslespill eller spill", detail: "Under 250 kr", body: "Noe til kveldene, eller for hele familien." },
        { title: "Noe fra byen din", detail: "Under 200 kr", body: "Lokalt godteri eller en liten ting som bare lages der du bor. Distanseteam elsker slikt." },
      ],
    },
  ],
  fit: {
    title: "Åpne gavene sammen",
    body: "TinyFloor er et virtuelt kontor for små team. Åpne gavene i møterommet med video og skjermdeling, og bli igjen for å prate ved skrivebordene etterpå, akkurat som på en ekte fest. Det er gratis for opptil 3 personer og 29 $ i måneden for hele teamet.",
    cta: "Prøv demokontoret",
  },
  faqTitle: "Vanlige <em>spørsmål.</em>",
  faq: [
    {
      q: "Hvordan fungerer denne Secret Santa-generatoren?",
      a: "Skriv inn navnene, trekk, og send hver person lenken med navnet sitt. Når de åpner den, ser de hvem de skal kjøpe til, samt budsjett og dato hvis du har lagt inn det.",
    },
    {
      q: "Trenger man e-postadresse eller konto?",
      a: "Nei. Det er ingen registrering og ingenting sendes på e-post. Du sender lenkene selv, i en chat, en e-post eller en SMS.",
    },
    { q: "Kan arrangøren være med?", a: "Ja. Arrangøren ser lenkene, ikke hvem som trakk hvem. Legg til ditt eget navn og åpne bare din egen lenke." },
    { q: "Kan man trekke sitt eget navn?", a: "Nei. Alle får tildelt en annen person, og alle blir gitt til nøyaktig én Secret Santa." },
    {
      q: "Hvordan gjør man Secret Santa med et distribuert team?",
      a: "Trekk navn på nettet, send alle en privat lenke, bli enige om et budsjett, og velg digitale gaver eller samle inn adresser privat. Åpne deretter gavene sammen i en videosamtale.",
    },
    {
      q: "Hva er et passende Secret Santa-budsjett på jobb?",
      a: "Noe alle har råd til uten å tenke over det, ofte 150 til 300 kr. Oppgi ett beløp i invitasjonen, slik at gavene føles likeverdige.",
    },
    {
      q: "Er denne Secret Santa-generatoren gratis?",
      a: "Ja, uten noen begrensning på antall personer. Den kjører i nettleseren din, og navnene sendes bare i lenkene du sender.",
    },
  ],
};

export default no;
