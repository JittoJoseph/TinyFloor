import type { OooContent } from "@/lib/tools/out-of-office";

/** De afwezigheidsberichtgenerator in het Nederlands, geschreven vanuit de Engelse pagina. */
const nl: OooContent = {
  meta: {
    title: "Afwezigheidsbericht maken: gratis generator en voorbeelden",
    description:
      "Schrijf je afwezigheidsbericht in seconden: een automatisch antwoord en een status voor Slack of Teams, voor vakantie, ziekte of een werkreis. Met voorbeelden.",
  },
  eyebrow: "Gratis tool",
  updated: "Bijgewerkt op",
  title: "Afwezigheidsbericht <em>generator.</em>",
  intro:
    "Geef aan waarom je weg bent, wanneer je terug bent en wie in de tussentijd kan helpen, en krijg een automatisch e-mailantwoord en een korte status voor je teamchat, klaar om te plakken. Daaronder: voorbeeldberichten voor elke situatie, en hoe je het aanzet in Outlook, Gmail, Slack en Teams.",
  writer: {
    reason: "Waarom je weg bent",
    reasons: { vacation: "Vakantie", sick: "Ziek", travel: "Werkreis", parental: "Ouderschapsverlof", holiday: "Feestdag" },
    back: "Terug op",
    unknown: "Laat leeg als je het nog niet weet.",
    name: "Je naam",
    contact: "Wie je in plaats daarvan kunnen benaderen",
    email: "Diens e-mail",
    optional: "(optioneel)",
    tone: "Toon",
    tones: { professional: "Zakelijk", friendly: "Vriendelijk", short: "Kort" },
    emailTitle: "Automatisch e-mailantwoord",
    statusTitle: "Status voor Slack, Teams of TinyFloor",
    statusNote: "Maximaal 100 tekens, zodat het in een Slack-status past.",
    copy: "Kopiëren",
    copied: "Gekopieerd",
  },
  sections: [
    {
      title: "Voorbeelden van afwezigheidsberichten",
      body: [
        "Elk goed afwezigheidsbericht zegt drie dingen: dat je weg bent, wanneer je terug bent en wie mensen kunnen benaderen als het niet kan wachten. Zo klinkt dat in de meest voorkomende situaties; de generator hierboven schrijft hetzelfde met jouw data en namen.",
      ],
      items: [
        {
          title: "Vakantie",
          detail: "Jaarlijks verlof",
          body: "\"Bedankt voor uw e-mail. Ik ben met vakantie en vanaf maandag 2 november weer op kantoor. Ik reageer op uw bericht zodra ik terug ben. Voor dringende zaken kunt u contact opnemen met Ana Lima (ana@example.com).\"",
        },
        {
          title: "Ziek",
          detail: "Kort en privé",
          body: "\"Bedankt voor uw e-mail. Ik ben vandaag afwezig en reageer zodra ik terug ben. Voor dringende zaken kunt u contact opnemen met Ana Lima.\" Zeggen dat je ziek bent is niet nodig; je bent niemand details verschuldigd.",
        },
        {
          title: "Werkreis of congres",
          detail: "Trager, niet weg",
          body: "\"Bedankt voor je bericht! Ik ben tot donderdag 5 november op werkreis en lees mijn mail minder vaak dan normaal. Ik kom erop terug als ik terug ben. Kan het niet wachten, dan helpt Ana Lima je verder.\"",
        },
        {
          title: "Ouderschapsverlof",
          detail: "Lange afwezigheid",
          body: "\"Bedankt voor uw e-mail. Ik ben met ouderschapsverlof tot 2 februari en lees in die tijd geen e-mail. Voor vragen over mijn projecten kunt u terecht bij Ana Lima (ana@example.com), die mij vervangt.\" Noem bij een lange afwezigheid een persoon, niet alleen een datum.",
        },
        {
          title: "Feestdag",
          detail: "Voor het hele team",
          body: "\"Bedankt voor uw e-mail. Ons kantoor is gesloten vanwege de feestdag en vanaf dinsdag 3 november weer open. We reageren op uw bericht zodra we terug zijn.\"",
        },
        {
          title: "De korte versie",
          detail: "Voor collega's",
          body: "\"Ik ben met verlof tot 3 november. Dringend? Neem contact op met Ana Lima.\" Binnen je eigen bedrijf is korter meestal beter.",
        },
        {
          title: "Kerst en Nieuwjaar",
          detail: "Eindejaarsverlof",
          body: "\"Bedankt voor uw e-mail. Ik ben vanwege de feestdagen afwezig en vanaf maandag 4 januari weer op kantoor. Ik reageer op uw bericht zodra ik terug ben. Voor dringende zaken kunt u contact opnemen met Ana Lima (ana@example.com). Ik wens u een gelukkig nieuwjaar.\"",
        },
        {
          title: "Halve dag",
          detail: "Dezelfde dag terug",
          body: "\"Bedankt voor je e-mail. Ik ben vanmiddag afwezig en reageer morgenochtend.\" Als je maar een paar uur weg bent, is een chatstatus vaak al genoeg.",
        },
        {
          title: "Voor klanten",
          detail: "Buiten je organisatie",
          body: "\"Bedankt voor uw bericht. Ik ben afwezig tot maandag 2 november. Voor bestellingen en support kunt u mailen naar support@example.com, waar het team binnen één werkdag reageert.\" Outlook kan dit bericht alleen naar mensen buiten je organisatie sturen.",
        },
        {
          title: "Laatste werkdag",
          detail: "Definitief vertrek",
          body: "\"Bedankt voor uw e-mail. Ik heb Example Ltd inmiddels verlaten. Voor lopende zaken kunt u contact opnemen met Ana Lima (ana@example.com), die het van mij overneemt.\" Bedrijven laten zo'n automatisch antwoord meestal nog een paar maanden aanstaan op het adres van een vertrokken medewerker.",
        },
      ],
    },
    {
      title: "Een afwezigheidsbericht instellen in Outlook",
      body: [
        "Open in de nieuwe Outlook en Outlook op het web de Instellingen (het tandwiel), ga naar Account en dan naar Automatische antwoorden. Zet automatische antwoorden aan, vink aan dat ze alleen in een bepaalde periode worden verstuurd, kies je begin- en einddatum en plak je bericht. Je kunt een ander bericht schrijven voor mensen buiten je organisatie, en dat is een goed idee: collega's hebben minder uitleg nodig dan klanten.",
        "Ga in de klassieke Outlook voor Windows naar Bestand en dan naar Automatische antwoorden, en vul dezelfde gegevens in. Als je een einddatum instelt, zet Outlook de antwoorden zelf uit, dus je hoeft er niet aan te denken.",
        "Ga in Outlook voor Mac naar Extra en dan naar Automatische antwoorden. Tik in de Outlook-app op een iPhone of Android-telefoon op je profielfoto, daarna op het tandwiel voor Instellingen, kies je werkaccount en tik op Automatische antwoorden. Welke versie je ook gebruikt, het antwoord wordt opgeslagen in je account. Als je het dus op de ene plek aanzet, staat het overal aan.",
      ],
    },
    {
      title: "Een afwezigheidsbericht instellen in Gmail",
      body: [
        "Klik in Gmail op het tandwiel en dan op Alle instellingen bekijken. Scrol op het tabblad Algemeen naar Afwezigheidsassistent, zet hem aan, kies de eerste en laatste dag, voeg een onderwerp toe zoals \"Afwezig tot 3 november\", plak je bericht en klik onderaan op Wijzigingen opslaan.",
        "Gmail stuurt het automatische antwoord één keer per persoon binnen vier dagen, niet op elk bericht, dus wie twee keer mailt, krijgt het niet twee keer. Je kunt het ook alleen naar je contacten laten gaan, of bij een werkaccount alleen naar mensen in je organisatie.",
      ],
    },
    {
      title: "Afwezig in Slack en Microsoft Teams",
      body: [
        "Teamchats sturen geen automatische antwoorden, dus een status doet het werk: die staat naast je naam, overal waar mensen je een bericht proberen te sturen. Klik in Slack op je profielfoto, kies Update your status (je status bijwerken), voeg een emoji en een korte regel toe zoals \"🌴 Met vakantie tot 3 nov\", en laat hem verdwijnen als je terug bent. Als je voor dezelfde dagen meldingen pauzeert, blijft ook je telefoon stil.",
        "Klik in Microsoft Teams op je profielfoto en kies Statusbericht instellen. Typ je bericht en stel in wanneer het moet verdwijnen. In hetzelfde venster staat een link om afwezigheid te plannen, die je automatische antwoord in Outlook en je Teams-status tegelijk aanzet. De status uit de generator hierboven is kort genoeg voor allebei.",
      ],
    },
    {
      title: "Wat een goed afwezigheidsbericht bevat",
      items: [
        { title: "Wanneer je terug bent", body: "Een datum, niet \"volgende week\". Weet je het nog niet, zeg dan dat je reageert zodra je terug bent." },
        { title: "Wie kan helpen", body: "Een naam, en een e-mailadres als het iemand buiten het gesprek is. Vraag het eerst; niemand hoort graag van een klant dat hij je vervangt." },
        { title: "Niet te veel details", body: "\"Afwezig\" is genoeg. Waar je bent en waarom gaat niemand iets aan, en een vakantiebestemming in een automatisch antwoord vertelt vreemden dat je huis leeg staat." },
        { title: "Geen beloftes die je niet nakomt", body: "\"Ik reageer zodra ik terug ben\" is prima. \"Ik beantwoord elke e-mail\" na twee weken weg klopt meestal niet." },
        { title: "Zet het weer uit", body: "Stel een einddatum in in Outlook of Gmail, en een eindtijd voor je chatstatus, zodat niemand op je eerste dag terug te horen krijgt dat je weg bent." },
      ],
    },
  ],
  fit: {
    title: "Afwezigheid, ingebouwd in het kantoor",
    body: "In TinyFloor, een virtueel kantoor voor remote teams, staat een statusnotitie als “🌴 Met vakantie tot maandag” bij je naam, zodat het team het weet voordat ze je proberen te bereiken, en hij verdwijnt vanzelf op de dag zelf. Het draait in een browsertab, gratis tot 3 mensen en $ 29 per maand voor het hele team.",
    cta: "Probeer het demokantoor",
  },
  faqTitle: "Veelgestelde <em>vragen.</em>",
  faq: [
    {
      q: "Wat zet je in een afwezigheidsbericht?",
      a: "Dat je weg bent, wanneer je terug bent en wie mensen kunnen benaderen als het dringend is. Bijvoorbeeld: \"Ik ben afwezig tot maandag 2 november. Voor dringende zaken kunt u contact opnemen met Ana Lima.\"",
    },
    {
      q: "Hoe stel ik een afwezigheidsbericht in in Outlook?",
      a: "In de nieuwe Outlook of Outlook op het web: Instellingen, Account, Automatische antwoorden. In de klassieke Outlook voor Windows: Bestand, Automatische antwoorden. Zet het aan, kies de data en plak je bericht.",
    },
    {
      q: "Hoe stel ik een afwezigheidsbericht in in Gmail?",
      a: "Klik op het tandwiel, Alle instellingen bekijken, en zet op het tabblad Algemeen de Afwezigheidsassistent aan. Kies de data, een onderwerp en je bericht, en klik op Wijzigingen opslaan.",
    },
    {
      q: "Moet ik zeggen waarom ik afwezig ben?",
      a: "Nee. \"Afwezig\" is genoeg. Zeggen dat je met vakantie bent is gebruikelijk en prima, maar je hoeft nooit details te geven, zeker niet als je ziek bent.",
    },
    {
      q: "Hoe ziet een zakelijk afwezigheidsbericht eruit?",
      a: "\"Bedankt voor uw e-mail. Ik ben afwezig tot maandag 2 november en reageer op uw bericht zodra ik terug ben. Voor dringende zaken kunt u contact opnemen met Ana Lima (ana@example.com).\"",
    },
    {
      q: "Is deze afwezigheidsberichtgenerator gratis?",
      a: "Ja, en hij draait volledig in je browser: de namen, data en e-mailadressen die je typt, worden nergens naartoe gestuurd. Kopieer het bericht naar Outlook, Gmail, Slack of Teams.",
    },
    {
      q: "Wat betekent OOO?",
      a: "OOO staat voor 'out of office'. Mensen schrijven het in agenda's, chatstatussen en onderwerpen van e-mails, zoals \"OOO tot maandag\", om aan te geven dat ze er niet zijn en niet meteen reageren.",
    },
    {
      q: "Is een automatisch antwoord hetzelfde als een afwezigheidsbericht?",
      a: "Ja. Automatische antwoorden is hoe Outlook een afwezigheidsbericht noemt, en Gmail noemt het de afwezigheidsassistent. Ze sturen allemaal één antwoord naar mensen die je mailen terwijl je weg bent.",
    },
    {
      q: "Hoe stel ik een afwezigheidsbericht in in Teams?",
      a: "Klik op je profielfoto, kies Statusbericht instellen en daarna Afwezigheid plannen. Zet automatische antwoorden aan, schrijf je bericht en kies de data. Teams geeft aan dat je afwezig bent, en Outlook stuurt hetzelfde bericht naar iedereen die je mailt.",
    },
    {
      q: "Hoe stel ik een afwezigheidsbericht in in Outlook op mijn telefoon?",
      a: "Tik in de Outlook-app op je profielfoto, daarna op het tandwiel voor Instellingen, kies je werkaccount en tik op Automatische antwoorden. Zet het aan, schrijf je bericht en kies de data.",
    },
  ],
};

export default nl;
