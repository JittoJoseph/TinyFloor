import type { SantaContent } from "@/lib/tools/secret-santa";

/** The Secret Santa generator in Finnish, written from the English page. */
const fi: SantaContent = {
  meta: {
    title: "Secret Santa -arvonta: ilmainen, ilman sähköpostia ja rekisteröitymistä",
    description: "Suorita Secret Santa -arvonta sekunneissa ja lähetä kaikille oma linkki, josta näkee lahjan saajan. Ilmainen, ilman sähköpostia tai rekisteröitymistä, suunniteltu etätiimeille.",
  },
  eyebrow: "Ilmainen työkalu",
  updated: "Päivitetty",
  title: "Secret Santa <em>-arvonta.</em>",
  intro: "Kirjoita osallistujien nimet, suorita arvonta ja lähetä jokaiselle oma henkilökohtainen linkki. Siitä näkee vain oman lahjan saajan, eikä kenenkään muun valintaa. Ei sähköposteja, ei käyttäjätilejä, ja se toimii eri maissa asuville tiimeille. Alempana: miten Secret Santa järjestetään verkossa, säännöt ja lahjaideoita kollegoille.",
  drawer: {
    names: "Nimet",
    namesHint: "Yksi nimi rivilleen, vähintään kolme. Lisää itsesi, jos olet mukana.",
    budget: "Budjetti",
    date: "Lahjojen jakopäivä",
    optional: "(valinnainen)",
    draw: "Suorita arvonta",
    redraw: "Arvo uudelleen",
    redrawNote: "Uusi arvonta luo uudet linkit. Lähetä vain uusimmat.",
    tooFew: "Lisää vähintään kolme nimeä.",
    duplicate: "Kahdella henkilöllä on sama nimi. Lisää alkukirjain, jotta kaikki löytävät oman linkkinsä.",
    linksTitle: "Yksityiset linkit",
    linksNote: "Lähetä jokaiselle oma linkki vain hänelle itselleen tarkoitetussa viestissä. Linkin avaaminen paljastaa, kenelle hän ostaa lahjan.",
    copy: "Kopioi linkki",
    copied: "Kopioitu",
    copyAll: "Kopioi kaikki linkit",
    allIntro: "Secret Santa: avaa vain linkki, jossa on oma nimesi.",
    revealTitle: "Hei {name}, olet Secret Santa henkilölle…",
    show: "Näytä nimi",
    lookAway: "Varmista, ettei kukaan katso näyttöäsi.",
    budgetLabel: "Budjetti",
    dateLabel: "Lahjojen vaihto",
    keepSecret: "Pidä se salaisuutena lahjojen vaihtoon asti.",
    own: "Arvo nimet omalle ryhmällesi",
  },
  sections: [
    {
      title: "Miten järjestää Secret Santa -arvonta netissä",
      items: [
        {
          title: "Kerää nimet",
          body: "Kysy, kuka haluaa osallistua. Osallistumisen pitäisi olla töissä vapaaehtoista: pakotettu Secret Santa ei ole kenellekään hauska.",
        },
        {
          title: "Aseta budjetti ja päivämäärä",
          body: "Yksi etukäteen sovittu summa, jotta kukaan ei käytä kolminkertaisesti rahaa verrattuna omaan lahjanantajaansa. Päivämäärä on päivä, jona lahjat avataan.",
        },
        { title: "Arvo nimet", body: "Kirjoita nimet yläpuolelle ja arvo. Jokainen saa jonkun, eikä kukaan saa itseään." },
        {
          title: "Lähetä linkit",
          body: "Lähetä jokaiselle oma linkki yksityisviestillä tai sähköpostitse. Järjestäjä voi myös osallistua: näet linkit, et sitä, kuka arpoi kenenkin.",
        },
        { title: "Avatkaa lahjat yhdessä", body: "Videopuhelussa tai juhlissa, yksi kerrallaan, ja kaikki arvaavat, kuka oli heidän Secret Santansa." },
      ],
    },
    {
      title: "Secret Santa etätiimin kanssa",
      body: [
        "Kun tiimi työskentelee eri kaupungeissa tai maissa, lahjojen on kuljettava perille. Helpoin tapa on digitaalinen lahja: lahjakortti, e-kirja, kuukausi suoratoistopalvelua tai lahjoitus saajan nimissä. Jos haluatte mieluummin lähettää jotain konkreettista, järjestäjä voi kerätä kotiosoitteet luottamuksellisesti ja antaa kunkin osoitteen vain sille, joka sitä tarvitsee. Vaihtoehtoisesti jokainen voi tilata kaupasta, joka toimittaa vastaanottajan maahan.",
        "Avatkaa lahjat yhdessä puhelussa, mieluiten osana loppuvuoden juhlia. [Ideamme virtuaalisiin pikkujouluihin](/guides/virtual-holiday-party-ideas) sisältävät valmiin ohjelman ja pelejä juhlan ympärille.",
      ],
    },
    {
      title: "Secret Santa -säännöt",
      items: [
        {
          title: "Pysy budjetissa",
          body: "Alle budjetin saa mennä, mutta sen ylittäminen on kiusallista. Budjetti on koko homman ydin: pieni lahja, joka on valittu huolella.",
        },
        { title: "Pidä salaisuus", body: "Älä kerro kenellekään, kenen nimen sait, ennen kuin lahjat on avattu, äläkä kysy muilta, kuka heille arvottiin." },
        { title: "Pidä se työpaikalle sopivana", body: "Ei mitään liian henkilökohtaista tai sellaista, mikä voisi nolata jonkun kollegojen edessä." },
        { title: "Kerro toiveesi", body: "Jos tiimin chattiin lisää lyhyen toiveen, kuten ”Haluaisin hyvän kirjan”, kenenkään ei tarvitse arvailla." },
        { title: "Tee siitä vapaaehtoista", body: "Kaikki eivät vietä juhlaa tai halua osallistua. He ovat silti tervetulleita juhliin." },
      ],
    },
    {
      title: "Secret Santa -lahjaideoita kollegoille",
      body: [
        "Ideoita, jotka on helppo kuljettaa ja jotka sopivat useimmille budjeteille:",
      ],
      items: [
        { title: "Kahvia tai teetä", detail: "Alle 20 €", body: "Kahvipussi hyvältä paikalliselta paahtimolta tai teelajitelma." },
        { title: "Kirja", detail: "Alle 20 €", body: "Jotain, mistä itse pidit tänä vuonna, ja viesti, jossa kerrot miksi." },
        { title: "Pöytäkasvi", detail: "Alle 25 €", body: "Pieni, vaikea tappaa ja mukava katseltava videopuheluiden aikana." },
        { title: "Lahjakortti", detail: "Mikä tahansa budjetti", body: "Kirjakauppaan, kahvilaketjuun tai ruoankuljetuspalveluun saajan kotipaikkakunnalla." },
        { title: "Laadukas muistikirja", detail: "Alle 20 €", body: "Hyödyllinen jokaiselle, joka kirjoittaa yhä asioita muistiin." },
        { title: "Kuukauden tilaus jotakin", detail: "Alle 15 €", body: "Musiikki-, äänikirja- tai suoratoistotilaus lahjakoodina." },
        { title: "Palapeli tai peli", detail: "Alle 25 €", body: "Jotain iltojen iloksi tai koko perheelle." },
        {
          title: "Jotain omasta kaupungistasi",
          detail: "Alle 20 €",
          body: "Paikallisia makeisia tai jokin pieni esine, jota saa vain sinun kotipaikkakunnaltasi. Etätiimit rakastavat näitä.",
        },
      ],
    },
  ],
  fit: {
    title: "Avatkaa lahjat yhdessä",
    body: "TinyFloor on pienten tiimien virtuaalitoimisto. Avatkaa lahjat kokoushuoneessa videon ja näytönjaon välityksellä, ja jääkää sen jälkeen juttelemaan työpöytienne ääreen aivan kuin oikeissa juhlissa. Se on ilmaiseksi enintään 3 hengelle ja 29 $ kuukaudessa koko tiimiltä.",
    cta: "Kokeile demotoimistoa",
  },
  faqTitle: "Usein <em>kysyttyä.</em>",
  faq: [
    {
      q: "Miten tämä Secret Santa -arvonta toimii?",
      a: "Kirjoita nimet, suorita arvonta ja lähetä kullekin henkilölle linkki, jossa on hänen nimensä. Linkin avaaminen näyttää, kenelle hän ostaa lahjan, sekä budjetin ja päivämäärän, jos olet asettanut ne.",
    },
    {
      q: "Tarvitseeko osallistujilla olla sähköpostiosoite tai käyttäjätili?",
      a: "Ei. Rekisteröitymistä ei vaadita eikä mitään lähetetä sähköpostitse: lähetät linkit itse chatissa, sähköpostilla tai tekstiviestillä.",
    },
    {
      q: "Voiko järjestäjä osallistua?",
      a: "Kyllä. Järjestäjä näkee linkit, mutta ei sitä, kuka sai kenenkin nimen. Lisää siis oma nimesi ja avaa vain oma linkkisi.",
    },
    { q: "Voiko joku arpoa oman nimensä?", a: "Ei. Jokaiselle arvotaan joku muu, ja jokaisella on tasan yksi Secret Santa." },
    {
      q: "Miten Secret Santa järjestetään etätiimille?",
      a: "Arvo nimet verkossa, lähetä kaikille yksityinen linkki, sovi budjetista ja valitse digitaalisia lahjoja tai kerää osoitteet yksityisesti. Avatkaa sitten lahjat yhdessä videopuhelussa.",
    },
    {
      q: "Mikä on hyvä Secret Santa -budjetti töissä?",
      a: "Sellainen, johon kaikilla on varaa sen suuremmin miettimättä, usein 15–30 €. Mainitse kutsussa yksi summa, jotta lahjat tuntuvat samanarvoisilta.",
    },
    {
      q: "Onko tämä Secret Santa -arvontakone ilmainen?",
      a: "Kyllä, eikä osallistujien määrää ole rajoitettu. Se toimii selaimessasi, ja nimet siirtyvät vain lähettämissäsi linkeissä.",
    },
  ],
};

export default fi;
