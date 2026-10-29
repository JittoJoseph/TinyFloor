import type { StandupContent } from "@/lib/tools/standup";

/** Daily-palaverin pohja suomeksi, kirjoitettu englanninkielisen sivun pohjalta. */
const fi: StandupContent = {
  meta: {
    title: "Daily-palaverin pohja: ilmainen asialista ja kirjallinen daily",
    description:
      "Tee daily-palaverille asialista, joka on mitoitettu tiimisi koolle, tai pohja kirjalliseen dailyyn Slackiin tai Teamsiin. Ilmainen, kolme kysymyssarjaa ja ohjeet.",
  },
  eyebrow: "Ilmainen työkalu",
  updated: "Päivitetty",
  title: "Daily-palaverin <em>pohja.</em>",
  intro:
    "Hyvä daily vie noin minuutin henkeä kohden, ja sen jälkeen kaikki tietävät, mitä on tekeillä ja kuka on jumissa. Valitse tiimin koko ja tapa, jolla kokoonnutte, puhelussa, kirjallisesti tai taulun äärellä, niin saat oikein ajoitetun asialistan tai pohjan, jonka voit julkaista tiimin chatissa.",
  builder: {
    team: "Tiimin koko",
    people: "{count} henkeä",
    format: "Miten kokoonnutte",
    formats: { live: "Puhelussa", async: "Kirjallisesti (asynkroninen)", board: "Taulun äärellä" },
    questions: "Kysymykset",
    sets: [
      { key: "classic", label: "Klassiset", questions: ["Mitä teit eilen?", "Mitä teet tänään?", "Onko jokin esteenä?"] },
      { key: "focus", label: "Fokus", questions: ["Mikä on tärkein prioriteettisi tänään?", "Mikä voisi estää sen?", "Keneltä tarvitset apua?"] },
      { key: "progress", label: "Eteneminen", questions: ["Mikä eteni?", "Mitä seuraavaksi?", "Onko riskejä, joista meidän pitäisi tietää?"] },
    ],
    icebreaker: "Aloita minuutin jäänmurtajalla",
    minutes: "{count} minuuttia",
    agenda: "Asialista",
    template: "Julkaistava pohja",
    copy: "Kopioi",
    copied: "Kopioitu",
    lines: {
      open: "Aloitus: aloita ajallaan, vaikka joku myöhästyisi",
      icebreaker: "Jäänmurtaja: yksi nopea kysymys, yksi lause kultakin",
      round: "Kierros: jokainen vastaa, noin minuutti kukin",
      column: "{column}: mikä on jumissa, mitä seuraavaksi",
      blockers: "Esteet: sopikaa, kuka auttaa, ja jutelkaa jälkeenpäin",
      close: "Lopetus: asiat, jotka kaikkien pitää tietää",
    },
    columns: ["Jumissa", "Katselmoinnissa", "Työn alla", "Seuraavaksi"],
    note: {
      live: "Noin minuutti henkeä kohden, vähän vähemmän isommassa tiimissä, plus minuutti aloitukseen ja lopetukseen. Enintään vartti: sitä pidempi on palaveri, ei daily.",
      async: "Pyydä kaikkia julkaisemaan vastauksensa joka aamu samaan kellonaikaan omalla aikavyöhykkeellään, lukemaan muiden päivitykset ja vastaamaan ketjuun kaikkeen, mikä on jumissa.",
      board: "Käykää taulu läpi oikealta: ensin lähimpänä valmista oleva työ, jotta tiimi saa asiat valmiiksi ennen kuin aloittaa uusia. Viisi minuuttia plus noin minuutti henkeä kohden.",
    },
  },
  sections: [
    {
      title: "Mihin daily-palaveria tarvitaan",
      body: [
        "Daily eli päivittäinen lyhyt palaveri pidetään yleensä aamulla, ja siinä jokainen tiimiläinen kertoo, mitä on tekemässä ja onko jokin esteenä. Se on peräisin ketteristä ohjelmistotiimeistä, joissa sitä kutsutaan myös daily scrumiksi, mutta se sopii mille tahansa pienelle tiimille, jonka työt riippuvat toisistaan.",
        "Se ei ole tilannekatsaus esihenkilölle. Tarkoitus on, että tiimi näkee päivän yhdessä: kuka tekee mitä, missä kaksi työtä kohtaavat ja kuka tarvitsee apua. Jos daily auttaa jonkun eteenpäin, se kannatti; jos se on lausuntakierros, jota kukaan ei kuuntele, se ei kannattanut.",
      ],
    },
    {
      title: "Kolme tapaa pitää daily",
      items: [
        {
          title: "Puhelussa",
          detail: "Klassikko",
          body: "Kaikki liittyvät samaan aikaan ja vastaavat vuorollaan samoihin kolmeen kysymykseen. Paras tiimeille, jotka ovat lähellä toisiaan aikavyöhykkeissä ja haluavat nähdä toisensa kerran päivässä. Pitäkää se noin minuutissa henkeä kohden.",
        },
        {
          title: "Kirjallisesti",
          detail: "Asynkroninen daily",
          body: "Jokainen julkaisee vastauksensa tiimin chatissa sovittuun kellonaikaan mennessä ja lukee muiden vastaukset. Paras tiimeille eri aikavyöhykkeillä tai tiimeille, joilla on jo valmiiksi paljon palavereja. Keskustelu jää pois, joten tehkää tavaksi vastata kaikkeen, mikä on jumissa.",
        },
        {
          title: "Taulun äärellä",
          detail: "Ensin työ, sitten ihmiset",
          body: "Sen sijaan että kierrätte ihmiset, käykää tehtävätaulu läpi sarake kerrallaan aloittaen työstä, joka on lähimpänä valmista. Paras tiimeille, joiden taulu on täynnä ja joissa kysymys on, mikä on jumissa, eikä se, mitä kukin on tehnyt.",
        },
      ],
    },
    {
      title: "Dailyn kolme kysymystä",
      body: [
        "Klassiset kolme ovat: mitä teit eilen, mitä teet tänään ja onko jokin esteenä. Ne toimivat, mutta houkuttelevat luettelemaan kaiken, mihin on koskenut. Jos dailynne venyvät, kokeilkaa terävämpää sarjaa:",
      ],
      items: [
        {
          title: "Klassiset",
          body: "Mitä teit eilen? Mitä teet tänään? Onko jokin esteenä? Tuttuja kaikille ja hyviä uudelle tiimille.",
        },
        {
          title: "Fokus",
          body: "Mikä on tärkein prioriteettisi tänään? Mikä voisi estää sen? Keneltä tarvitset apua? Lyhyempiä vastauksia, ja viimeinen kysymys tekee esteistä konkreettisia pyyntöjä.",
        },
        {
          title: "Eteneminen",
          body: "Mikä eteni? Mitä seuraavaksi? Onko riskejä? Työstä eikä ihmisestä, joten sopii hyvin taulun läpikäyntiin.",
        },
      ],
    },
    {
      title: "Daily-palaverin asialista minuutti minuutilta",
      body: [
        "Kuuden hengen tiimiltä puhelussa daily vie noin kahdeksan minuuttia. Aloittakaa ajallaan, vaikka joku myöhästyisi: odottaminen opettaa kaikki myöhästelemään. Kiertäkää sitten kiinteässä järjestyksessä, ruudun järjestyksessä tai aakkosjärjestyksessä, ettei kenenkään tarvitse arvailla, milloin on oma vuoro.",
        "Kun joku mainitsee ongelman, älkää ratkaisko sitä dailyssa. Kirjatkaa, kuka voi auttaa, ja sopikaa juttelevanne heti perään vain niiden kanssa, joita asia koskee. Pelkästään tämä tapa pitää dailyn alle kymmenessä minuutissa. Lopuksi kysykää, onko jotain, mitä kaikkien pitää tietää, ja lopettakaa puhelu.",
      ],
      table: {
        head: ["Tiimin koko", "Puhelussa", "Taulun äärellä"],
        rows: [
          ["3 henkeä", "5 minuuttia", "8 minuuttia"],
          ["6 henkeä", "8 minuuttia", "11 minuuttia"],
          ["8 henkeä", "10 minuuttia", "13 minuuttia"],
          ["12 henkeä", "11 minuuttia", "15 minuuttia"],
          ["15 henkeä", "14 minuuttia", "15 minuuttia"],
        ],
        note: "Laskettu samoin kuin yllä olevassa työkalussa: noin minuutti henkeä kohden (kolme varttia minuutista yli kahdeksan hengen tiimissä) plus kaksi aloitukseen ja lopetukseen, eikä koskaan yli viidentoista.",
      },
    },
    {
      title: "Näin pidät asynkronisen dailyn",
      body: [
        "Asynkroninen daily on samat kolme kysymystä kirjallisesti vastattuna. Valitkaa kanava ja kellonaika, esimerkiksi klo 10 kunkin omalla aikavyöhykkeellä, ja pyytäkää kaikkia julkaisemaan vastauksensa yhtenä viestinä yllä olevalla pohjalla, jotta ne on helppo silmäillä.",
        "Kaksi asiaa saa sen toimimaan. Ensinnäkin lukekaa toistenne päivitykset; asynkroninen daily, jota kukaan ei lue, on päiväkirja. Toiseksi vastatkaa ketjuun kaikkeen, mikä on jumissa, samana päivänä. Jotkin tiimit pitävät lisäksi yhden lyhyen puhelun viikossa, jotta näkevät yhä toisensa.",
      ],
    },
    {
      title: "Tavallisimmat virheet dailyssa",
      items: [
        { title: "Siitä tulee ongelmanratkaisua", body: "Joku nostaa esiin ongelman, ja kolme ihmistä alkaa ratkaista sitä. Kirjatkaa se, sopikaa, kuka juttelee jälkeenpäin, ja jatkakaa." },
        { title: "Se on raportti esihenkilölle", body: "Jos kaikki katsovat puhuessaan tiiminvetäjää, daily on väärälle ihmiselle. Puhukaa tiimille." },
        { title: "Liikaa ihmisiä", body: "Yli kymmenkunta henkeä, eikä kukaan enää kuuntele kaikkia. Jakakaa pienempiin dailyihin projektin tai työvirran mukaan." },
        { title: "Myöhässä aloittaminen", body: "Viiden minuutin odotus viimeistä ihmistä varten maksaa kaikille muille viisi minuuttia, joka päivä. Aloittakaa ajallaan." },
        { title: "\"Ei esteitä\" joka päivä", body: "Jos kukaan ei ole koskaan jumissa, kysykää terävämmin: \"Mikä voisi estää tämänpäiväisen prioriteettisi?\" löytää yleensä jotain." },
      ],
    },
  ],
  fit: {
    title: "Pidä aamupalaveri kerroksessa",
    body: "TinyFloor on virtuaalitoimisto etätiimeille: näet, kuka istuu työpisteellään, ja daily on kävely neuvotteluhuoneeseen eikä taas yksi linkki. Sen jälkeen kävelet sen luo, joka on jumissa. Se toimii selaimen välilehdessä, ilmaiseksi enintään 3 hengelle ja 29 $ kuukaudessa koko tiimiltä.",
    cta: "Kokeile demotoimistoa",
  },
  faqTitle: "Usein <em>kysyttyä.</em>",
  faq: [
    {
      q: "Mitkä ovat dailyn kolme kysymystä?",
      a: "Mitä teit eilen? Mitä teet tänään? Onko jokin esteenä? Terävämpi versio: Mikä on tärkein prioriteettisi tänään? Mikä voisi estää sen? Keneltä tarvitset apua?",
    },
    {
      q: "Kuinka pitkä daily-palaverin pitäisi olla?",
      a: "Noin minuutti henkeä kohden plus minuutti tai kaksi aloitukseen ja lopetukseen: kuuden hengen tiimillä noin kahdeksan minuuttia. Enintään vartti.",
    },
    {
      q: "Mikä on daily-palaverin pohja?",
      a: "Palaverin vakioasialista tai viestimuoto kirjalliselle dailylle: samat kolme kysymystä samassa järjestyksessä joka päivä, jotta päivitykset on nopea antaa ja helppo silmäillä.",
    },
    {
      q: "Mikä on asynkroninen daily?",
      a: "Kirjallisesti pidetty daily: jokainen julkaisee vastauksensa kolmeen kysymykseen tiimin chatissa sovittuun kellonaikaan mennessä ja lukee muiden vastaukset. Sopii tiimeille eri aikavyöhykkeillä.",
    },
    {
      q: "Onko daily vain scrum-tiimeille?",
      a: "Ei. Se on peräisin ketteristä ohjelmistotiimeistä, joissa sitä kutsutaan daily scrumiksi, mutta mikä tahansa pieni tiimi, jonka työt riippuvat toisistaan, voi käyttää sitä.",
    },
    {
      q: "Onko tämä daily-työkalu ilmainen?",
      a: "On, ja se toimii kokonaan selaimessasi: mitään valitsemaasi ei lähetetä minnekään. Kopioi asialista tai pohja kalenterikutsuun tai tiimin chattiin.",
    },
  ],
};

export default fi;
