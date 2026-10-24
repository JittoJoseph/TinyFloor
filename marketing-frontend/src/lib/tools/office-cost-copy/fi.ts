import type { OfficeCostsContent } from "@/lib/tools/office-costs";

const fi: OfficeCostsContent = {
  meta: {
    title: "Virtuaalitoimiston hintalaskuri: mitä 10 työkalua maksaa tiimillesi",
    description:
      "Syötä tiimisi koko ja näe, mitä Gather, SoWork, Spot, Kumospace, WorkAdventure, SpatialChat, Roam, oVice, Sococo ja TinyFloor maksavat kuukaudessa vuosi- tai kuukausilaskutuksella, kunkin oman hintasivun mukaan.",
  },
  eyebrow: "Ilmaiset työkalut",
  updated: "Hinnat tarkistettu",
  title: "Mitä virtuaalitoimisto <em>maksaa tiimillesi.</em>",
  intro:
    "Useimmat virtuaalitoimistot laskuttavat henkeä kohden, muutamat tilaa tai toimistoa kohden, ja ilmaisversiot loppuvat eri kokoihin. Syötä tiiminne koko, niin näet, mitä kukin kymmenestä työkalusta maksaa kuukaudessa, halvin ensin.",
  calculator: {
    people: "Henkilöitä tiimissä",
    count: "{count} henkilöä",
    billing: { yearly: "Vuosilaskutus", monthly: "Kuukausilaskutus" },
    product: "Tuote",
    free: "Ilmaisversio",
    price: "Maksullinen versio",
    perMonth: "{amount} kuukaudessa",
    perYear: "{amount} vuodessa",
    only: { yearly: "vain vuosittain", monthly: "vain kuukausittain" },
    noFree: "Ei ilmaisversiota",
    fits: "Ilmainen tällä koolla",
    upTo: "Enintään {count} henkilöä",
    pricingPage: "Hintasivu",
    basis: {
      office: "Yksi hinta toimistolle",
      member: "Jäsentä kohden",
      activeMember: "Aktiivista jäsentä kohden",
      space: "Tilaa kohden",
      seat: "Paikkaa kohden, vähintään 10",
    },
    limits: {
      everyFeature: "kaikki ominaisuudet",
      thirtyMinutes: "30 minuutin palaverit",
      oneFloor: "yksi kerros",
      atOnce: "yhtä aikaa",
      twoHours: "2 tuntia päivässä",
      preRelease: "esiversio, ei tukea",
    },
    summary: "{count} hengen tiimille henkeä kohden laskutettavat versiot maksavat {low}–{high} kuukaudessa. TinyFloor maksaa {tinyfloor}.",
    summaryLarge: "{count} hengen tiimille henkeä kohden laskutettavat versiot maksavat {low}–{high} kuukaudessa.",
  },
  sections: [
    {
      title: "Miten virtuaalitoimistot laskuttavat",
      body: ["Neljällä tavalla, ja se, mitä tapaa työkalu käyttää, ratkaisee kasvavan tiimin laskun enemmän kuin listahinta."],
      items: [
        {
          title: "Jäsentä kohden",
          detail: "Gather, SoWork, Spot, Kumospace, WorkAdventure, SpatialChat",
          body: "Maksat jokaisesta, jolla on tili, joka kuukausi, tuli hän paikalle tai ei. Lasku kasvaa jokaisen rekrytoinnin myötä: 10 hengen tiimi maksaa kaksinkertaisesti 5 hengen tiimiin verrattuna.",
        },
        {
          title: "Aktiivista jäsentä kohden",
          detail: "Roam",
          body: "Maksat niistä, jotka käyttivät sitä kuukauden aikana. Lomalla oleva ei maksa mitään, mutta useimmat tiimit ovat aktiivisia joka kuukausi, joten käytännössä se toimii kuin jäsenhinta.",
        },
        {
          title: "Tilaa tai paikkapakettia kohden",
          detail: "oVice, Sococo",
          body: "Maksat tilasta, joka on mitoitettu tietylle määrälle ihmisiä, tai vähimmäispaketista paikkoja. Edullista, jos tiimi täyttää sen, kallista, jos ei: Sococo laskuttaa 10 paikkaa, vaikka teitä olisi 4.",
        },
        {
          title: "Yksi hinta toimistolle",
          detail: "TinyFloor",
          body: "Yksi hinta riippumatta henkilömäärästä, siihen kokoon asti, jonka versio kattaa. Jonkun lisääminen ei maksa mitään, joten kenenkään ei tarvitse miettiä, onko freelancer paikan arvoinen.",
        },
      ],
    },
    {
      title: "Vuosi- vai kuukausilaskutus",
      body: [
        "Useimmat henkeä kohden laskuttavat työkalut antavat 10–20 % alennusta, kun maksaa vuoden etukäteen: Gather maksaa 12 $ jäseneltä vuosilaskutuksella ja 15 $ kuukausilaskutuksella. Se on vuoden sitoumus tiimille, jonka koko voi muuttua, ja alennus menetetään, jos lopetatte kolmen kuukauden jälkeen.",
        "Jotkin laskuttavat vain yhdellä tavalla: Roam ja TinyFloor kuukausittain, Sococo vuosittain. Laskuri näyttää ne sillä hinnalla, joka niillä on, ja kertoo sen.",
      ],
    },
  ],
  table: {
    title: "Mitä 5, 10 tai 15 hengen tiimi maksaa kuukaudessa",
    body: [
      "Samat hinnat kolmella tavallisella koolla, vuosilaskutuksella siellä, missä työkalu sitä tarjoaa, koska se on edullisempi hinta. Ilmaisversioita ei lasketa tähän; yllä oleva laskuri näyttää, mitkä sopivat.",
    ],
    product: "Tuote",
    note: "Hinnat Yhdysvaltain dollareina ilman veroja, kunkin tuotteen hintasivulta. Sococo laskuttaa vähintään 10 paikkaa; oVice vaihtuu Entry-S:stä Entry-M:ään noin 10 vakituisen jäsenen jälkeen.",
  },
  after: [
    {
      title: "Kun ilmaisversio riittää",
      body: [
        "Ilmaisversio, johon koko tiimi mahtuu, voittaa minkä tahansa maksullisen, joten katso rajat ennen hintaa. SoWorkin kattaa 10 jäsentä, mutta jokainen palaveri päättyy 30 minuutin kohdalla. WorkAdventuren kattaa 10 henkeä yhtä aikaa verkossa. SpatialChatin antaa 12 hengelle kaksi tuntia palavereja päivässä, mikä riittää viikkopalaveriin mutta ei koko päivän auki olevaan toimistoon. Kumospacen kattaa 5 jäsentä yhdessä kerroksessa, ja TinyFloorin 3 henkeä kaikilla ominaisuuksilla. oVicen ilmaisversio toimii esiversiossa ilman tukea.",
      ],
    },
    {
      title: "Mitä hinta ei kerro",
      items: [
        {
          title: "Mitä versioon kuuluu",
          body: "Halvin versio ei aina ole se, jota käyttäisitte. SoWork Basicissa on kaksi palaveritallennetta; tallenteet ja tekoälymuistiinpanot ovat Premiumissa, 12 $ jäseneltä. Gatherissa on tallennus ja litterointi. TinyFloorissa ei ole tallenteita eikä tekoälymuistiinpanoja.",
        },
        {
          title: "Vieraat",
          body: "Asiakkaat ja freelancerit, jotka käyvät silloin tällöin, voivat joissain työkaluissa laskea jäseniksi. Gather ja oVice antavat kutsua vieraita maksamatta heistä; tarkista ennen kuin lisäätte ihmisiä, jotka vain käyvät kylässä.",
        },
        { title: "Verot", body: "Kaikki hinnat tässä ovat ilman veroja. Sijainnistanne riippuen arvonlisävero tai myyntivero lisätään maksaessa." },
        {
          title: "Kokeilujaksot",
          body: "Gatherissa ja Spotissa on 30 päivän kokeilu, Roamissa ja oVicessa 14 päivää, SoWorkissa 7 päivää. Kokeilu kertoo, käyttääkö tiimi sitä; hinta, jatkatteko maksamista.",
        },
      ],
    },
    {
      title: "Miten tarkistimme",
      body: [
        "Jokainen hinta on tuotteen omalta hintasivulta, joka on linkitetty laskurissa, ja luettu ylhäällä mainittuna kuukautena. Käytämme versiota, jonka pieni tiimi ostaisi koko päivän auki olevaan toimistoon, emme tapahtuma- tai yritysversioita. Jos sivu kertoo vain yhden laskutusjakson, näytämme sen. Hinnat muuttuvat, joten tarkista hintasivu ennen ostamista; me tarkistamme uudelleen muutaman kuukauden välein.",
      ],
    },
  ],
  fit: {
    title: "Yksi hinta koko tiimille",
    body: "TinyFloor on selaimessa toimiva toimisto pienille tiimeille: kävelet jonkun luo juttelemaan, ja mukana on neuvotteluhuone, chat ja näytönjako. Se on ilmainen enintään 3 hengelle ja sen jälkeen 29 $ kuukaudessa koko tiimiltä, oli teitä kuinka monta tahansa. Siinä ei ole tallenteita eikä tekoälymuistiinpanoja; jos tarvitsette niitä, Gather tai SoWork Premium sopii paremmin.",
    cta: "Kokeile demotoimistoa",
  },
  faqTitle: "Usein <em>kysyttyä.</em>",
  faq: [
    {
      q: "Mitä virtuaalitoimisto maksaa kuukaudessa?",
      a: "10 hengen tiimille maksullisella versiolla 29–195 $ kuukaudessa työkalusta riippuen: TinyFloor maksaa 29 $ koko toimistolta, henkeä kohden laskuttavat työkalut 48 $:sta (Spot Basic, vuosilaskutus) 195 $:iin (Roam).",
    },
    {
      q: "Mikä on halvin virtuaalitoimisto pienelle tiimille?",
      a: "Ilmaisversio, joka riittää: SoWorkin kattaa 10 jäsentä 30 minuutin palavereilla, WorkAdventuren 10 henkeä yhtä aikaa, Kumospacen 5 jäsentä ja TinyFloorin 3 henkeä. Sen jälkeen TinyFloor, 29 $ kuukaudessa koko tiimiltä, on edullisin maksullinen hinta 7 hengestä ylöspäin.",
    },
    {
      q: "Onko Gather ilmainen?",
      a: "Ei. Gather lopetti ilmaisversionsa vuonna 2025. 30 päivän kokeilun jälkeen se maksaa 12 $ jäseneltä kuukaudessa vuosilaskutuksella tai 15 $ kuukausilaskutuksella, joten 10 hengen tiimi maksaa 120–150 $ kuukaudessa.",
    },
    {
      q: "Kumpi on parempi, hinta per henkilö vai kiinteä hinta?",
      a: "Hinta per henkilö on halvempi 2 tai 3 hengen tiimille, jossa hinta per pää on pieni. Kiinteä hinta voittaa tiimin kasvaessa, eikä se koskaan maksa enempää, kun lisäätte freelancerin tai uuden työntekijän.",
    },
    {
      q: "Sisältävätkö virtuaalitoimistojen hinnat veron?",
      a: "Eivät. Työkalujen hintasivujen hinnat, ja täällä olevat, ovat ilman veroja; arvonlisävero tai myyntivero lisätään maksaessa sijainnistanne riippuen.",
    },
  ],
};

export default fi;
