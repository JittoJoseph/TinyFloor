import type { TimeZonesContent } from "@/lib/tools/time-zones";

const no: TimeZonesContent = {
  meta: {
    title: "Møteplanlegger på tvers av tidssoner: finn de felles timene til teamet",
    description:
      "Legg til by og arbeidstid for hver person i teamet, og se når alle jobber samtidig, eller tidspunktet som passer flest når ingen tid passer alle. Tar hensyn til sommertid og halvtimer, som i India.",
  },
  eyebrow: "Gratis verktøy",
  updated: "Oppdatert",
  title: "Når arbeidstidene i teamet <em>overlapper.</em>",
  intro:
    "Legg til by og arbeidstid for hver person. Planleggeren viser timene der alle jobber samtidig, i hver persons egen tid, og når ingen time passer alle, den som passer flest. Den regner med dagens tidsforskjeller, så sommertiden er med.",
  planner: {
    zone: "Tidssone",
    hours: "Arbeidstid",
    remove: "Fjern",
    add: "Legg til person",
    addMine: "Legg til min tidssone",
    timesIn: "Tider i {city}",
    working: "Jobber",
    all: "Alle",
    everyone: "Alle jobber {from}–{to}, tid i {city}.",
    best: "Ingen tid passer alle. {from}–{to}, tid i {city}, passer {count} av {total}.",
    nobody: "Arbeidstidene overlapper ikke.",
    eachLocal: "I hver persons tid:",
  },
  sections: [
    {
      title: "Hvor mye overlapp et team trenger",
      body: [
        "Mindre enn man tror. To til fire felles timer om dagen holder til en standup, til spørsmålene som går raskere å stille enn å skrive, og til et møte når det trengs. Alt annet kan skje skriftlig, i hver persons egen arbeidstid.",
        "Det som svir, er ingen overlapp i det hele tatt, eller overlapp som bare finnes fordi noen jobber klokka 7 eller 22 hver dag. Hvis planleggeren bare viser felles tid i kanten av noens dag, er det den personen som betaler for teamets møter.",
      ],
    },
    {
      title: "Finn et rettferdig møtetidspunkt",
      items: [
        {
          title: "Møtes innenfor de felles timene",
          body: "Legg standupen og faste møter i tidsrommet planleggeren viser, og hold resten av de felles timene fri til raske spørsmål. Felles tid er det knappeste et spredt team har.",
        },
        {
          title: "Bytt på det dårlige tidspunktet",
          body: "Når det eneste mulige tidspunktet er tidlig for noen og sent for andre, bytt uke for uke, så det ikke alltid er de samme som logger på om kvelden.",
        },
        {
          title: "Færre og kortere møter",
          body: "En standup på 15 minutter passer i nesten all overlapp; et møte på en time gjør det sjelden. Spør om møtet kunne vært en skriftlig oppdatering før dere leter etter et tidspunkt.",
        },
        {
          title: "Skriv ned resultatet",
          body: "Den som ikke kunne være med, skal kunne ta igjen på to minutter: noen linjer om hva som ble bestemt og hvem som gjør hva, lagt der teamet allerede leser.",
        },
        {
          title: "Vis arbeidstiden din",
          body: "Legg arbeidstiden din inn i kalenderen og statusen, så ingen må regne ut om det er et godt tidspunkt å spørre deg om noe.",
        },
      ],
    },
    {
      title: "Når det ikke finnes overlapp",
      items: [
        { title: "Skriftlige standuper", body: "Hver person skriver i starten av dagen sin hva de har gjort, hva som kommer nå og hva som står i veien. De andre leser det i starten av sin." },
        { title: "To mindre møter", body: "Del teamet etter region til direktemøter, med én person i begge eller delte notater, så det viktige når fram til begge sider." },
        { title: "Overlevering på slutten av dagen", body: "Når den enes kveld er den andres morgen, lar et kort notat på slutten av dagen arbeidet gå videre mens den første sover." },
        { title: "Én felles time i uka", body: "Selv et team uten daglig overlapp kan finne én time i uka der alle strekker seg litt, og bytte på hvem som strekker seg mest." },
      ],
    },
    {
      title: "Sommertid flytter overlappen",
      body: [
        "Klokka stilles på ulike datoer på ulike steder, så teamets felles timer kan flytte seg en time i noen uker hver vår og høst. USA bytter den andre søndagen i mars og den første i november, Europa den siste søndagen i mars og oktober. Australia, New Zealand og Chile bytter motsatt, i sin egen vår. India, Kina, Japan, Brasil og Mexico bytter ikke i det hele tatt.",
        "Planleggeren regner ut tidsforskjellen for hver by for i dag, så sjekk igjen rundt de datoene hvis overlappen i teamet er trang.",
      ],
    },
    {
      title: "Slik regner den",
      body: [
        "Den deler dagen opp i halvtimer i den første personens tid, regner ut hva klokka er for alle andre med tidssonedataene i nettleseren din, og teller hvem som er innenfor arbeidstiden sin. Halvtimer trengs for India, som ligger fem og en halv time foran UTC. Arbeidstider over midnatt, som klokka 22 til 6, fungerer også, og alt kjører i nettleseren din.",
      ],
    },
  ],
  fit: {
    title: "Få mer ut av de felles timene",
    body: "TinyFloor er et virtuelt kontor for små team. I timene dere deler, er alle som er inne i samme etasje, og et spørsmål er en tur bort til noens pult i stedet for en samtale som må planlegges. Det er gratis for opptil 3 personer og 29 $ i måneden for hele teamet.",
    cta: "Prøv demokontoret",
  },
  faqTitle: "Vanlige <em>spørsmål.</em>",
  faq: [
    {
      q: "Hvordan finner jeg et møtetidspunkt på tvers av tidssoner?",
      a: "Skriv ned by og arbeidstid for hver person, og finn halvtimene der alle jobber samtidig. Planleggeren over gjør det for opptil 12 personer og viser resultatet i hver persons egen tid.",
    },
    {
      q: "Hvor mange timers overlapp trenger et team som jobber eksternt?",
      a: "To til fire timer om dagen er nok for de fleste team: nok til en standup, raske spørsmål og et møte nå og da. Resten av arbeidet kan skrives og gjøres i hver persons egen tid.",
    },
    {
      q: "Hva er et rettferdig møtetidspunkt på tvers av tidssoner?",
      a: "Et som ligger innenfor alles arbeidstid. Finnes det ikke, bytt på det tidlige eller sene tidspunktet uke for uke, så det ikke alltid er de samme som tar det.",
    },
    {
      q: "Hva om teamet mitt ikke har noen overlapp?",
      a: "Jobb skriftlig: skriftlige standuper i starten av hver persons dag, et overleveringsnotat til slutt og direktemøter delt etter region. De fleste team finner likevel én felles time i uka.",
    },
    {
      q: "Tar planleggeren hensyn til sommertid?",
      a: "Ja. Den bruker tidsforskjellen for hver by i dag fra nettleserens tidssonedata, så sommertiden er med. Sjekk igjen i slutten av mars og oktober, når klokka stilles på ulike datoer.",
    },
  ],
};

export default no;
