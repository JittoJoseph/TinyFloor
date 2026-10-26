import type { OooContent } from "@/lib/tools/out-of-office";

/** Poissaoloviestin generaattori suomeksi, kirjoitettu englanninkielisen sivun pohjalta. */
const fi: OooContent = {
  meta: {
    title: "Poissaoloviesti ja lomavastaaja: ilmainen generaattori",
    description:
      "Kirjoita poissaoloviesti sekunneissa: automaattinen vastaus sähköpostiin ja tila Slackiin tai Teamsiin lomalle, sairauslomalle tai työmatkalle.",
  },
  eyebrow: "Ilmainen työkalu",
  updated: "Päivitetty",
  title: "Poissaoloviestin <em>generaattori.</em>",
  intro:
    "Kerro, miksi olet poissa, milloin palaat ja kuka auttaa sillä välin, niin saat automaattisen vastauksen sähköpostiin ja lyhyen tilan tiimin chattiin valmiina liitettäviksi. Alempana: esimerkkiviestit joka tilanteeseen ja ohjeet niiden käyttöönottoon Outlookissa, Gmailissa, Slackissa ja Teamsissa.",
  writer: {
    reason: "Poissaolon syy",
    reasons: { vacation: "Loma", sick: "Sairaana", travel: "Työmatka", parental: "Perhevapaa", holiday: "Pyhäpäivä" },
    back: "Paluupäivä",
    unknown: "Jätä tyhjäksi, jos et vielä tiedä.",
    name: "Nimesi",
    contact: "Keneen voi olla yhteydessä",
    email: "Hänen sähköpostinsa",
    optional: "(valinnainen)",
    tone: "Sävy",
    tones: { professional: "Asiallinen", friendly: "Ystävällinen", short: "Lyhyt" },
    emailTitle: "Automaattinen vastaus sähköpostiin",
    statusTitle: "Tila Slackiin, Teamsiin tai TinyFlooriin",
    statusNote: "Enintään 100 merkkiä, jotta se mahtuu Slackin tilaan.",
    copy: "Kopioi",
    copied: "Kopioitu",
  },
  sections: [
    {
      title: "Esimerkkejä poissaoloviesteistä",
      body: [
        "Jokainen hyvä poissaoloviesti kertoo kolme asiaa: että olet poissa, milloin palaat ja keneen voi olla yhteydessä, jos asia ei voi odottaa. Näin se kuulostaa yleisimmissä tilanteissa; yllä oleva generaattori kirjoittaa saman sinun päivämäärilläsi ja nimilläsi.",
      ],
      items: [
        {
          title: "Loma",
          detail: "Vuosiloma",
          body: "\"Kiitos viestistäsi. Olen lomalla ja palaan toimistolle maanantaina 2. marraskuuta. Vastaan viestiisi palattuani. Kiireellisissä asioissa ota yhteyttä Ana Limaan (ana@example.com).\"",
        },
        {
          title: "Sairaana",
          detail: "Lyhyesti ja yksityisesti",
          body: "\"Kiitos viestistäsi. Olen tänään poissa toimistolta ja vastaan heti palattuani. Kiireellisissä asioissa ota yhteyttä Ana Limaan.\" Sairaudesta ei tarvitse kertoa; et ole kenellekään velkaa yksityiskohtia.",
        },
        {
          title: "Työmatka tai konferenssi",
          detail: "Hitaampi, ei poissa",
          body: "\"Kiitos viestistä! Olen työmatkalla torstaihin 5. marraskuuta asti ja luen sähköpostia tavallista harvemmin. Palaan asiaan, kun olen takaisin. Jos asia ei voi odottaa, Ana Lima auttaa.\"",
        },
        {
          title: "Perhevapaa",
          detail: "Pitkä poissaolo",
          body: "\"Kiitos viestistäsi. Olen perhevapaalla 2. helmikuuta asti enkä lue sähköpostia sinä aikana. Projekteihini liittyvissä asioissa ota yhteyttä sijaiseeni Ana Limaan (ana@example.com).\" Pitkässä poissaolossa kerro henkilö, älä pelkkää päivämäärää.",
        },
        {
          title: "Pyhäpäivä",
          detail: "Koko tiimille",
          body: "\"Kiitos viestistäsi. Toimistomme on suljettu pyhäpäivän vuoksi ja avautuu taas tiistaina 3. marraskuuta. Vastaamme viestiisi palattuamme.\"",
        },
        {
          title: "Lyhyt versio",
          detail: "Työkavereille",
          body: "\"Lomalla 3.11. asti. Kiireellistä? Ota yhteyttä Ana Limaan.\" Oman yrityksen sisällä lyhyempi on yleensä parempi.",
        },
        {
          title: "Joulu ja uusi vuosi",
          detail: "Vuodenvaihteen loma",
          body: "\"Kiitos viestistäsi. Olen lomalla pyhien ajan ja palaan toimistolle maanantaina 4. tammikuuta. Vastaan viestiisi palattuani. Kiireellisissä asioissa ota yhteyttä Ana Limaan (ana@example.com). Toivotan hyvää uutta vuotta.\"",
        },
        {
          title: "Puoli päivää",
          detail: "Takaisin samana päivänä",
          body: "\"Kiitos viestistäsi. Olen poissa toimistolta tämän iltapäivän ja vastaan huomisaamuna.\" Muutaman tunnin poissaololle pelkkä chat-tila riittää usein yksistään.",
        },
        {
          title: "Asiakkaille",
          detail: "Organisaation ulkopuolisille",
          body: "\"Kiitos yhteydenotostasi. Olen poissa toimistolta maanantaihin 2. marraskuuta asti. Tilauksiin ja tukeen liittyvissä asioissa kirjoita osoitteeseen support@example.com, josta tiimimme vastaa yhden työpäivän kuluessa.\" Outlookissa tämän viestin voi lähettää vain organisaation ulkopuolisille.",
        },
        {
          title: "Viimeinen työpäivä",
          detail: "Työsuhteen päättyminen",
          body: "\"Kiitos viestistäsi. Olen lopettanut työt Example Ltd:ssä. Kaikissa hoitamissani asioissa ota yhteyttä Ana Limaan (ana@example.com), joka ottaa vastuun tehtävistäni.\" Yritykset pitävät tällaista vastausta yleensä lähteneen työntekijän osoitteessa muutaman kuukauden ajan.",
        },
      ],
    },
    {
      title: "Näin asetat poissaoloviestin Outlookissa",
      body: [
        "Avaa uudessa Outlookissa ja Outlookin verkkoversiossa Asetukset (rataskuvake), siirry kohtaan Tili ja sitten Automaattiset vastaukset. Ota automaattiset vastaukset käyttöön, valitse, että ne lähetetään vain tiettynä ajanjaksona, aseta alku- ja loppupäivä ja liitä viestisi. Voit kirjoittaa organisaatiosi ulkopuolisille eri viestin, ja se kannattaa: työkaverit tarvitsevat vähemmän selityksiä kuin asiakkaat.",
        "Perinteisessä Outlookissa Windowsille valitse Tiedosto ja sitten Automaattiset vastaukset ja täytä samat tiedot. Jos asetat loppupäivän, Outlook poistaa vastaukset käytöstä itse, joten sitä ei tarvitse muistaa.",
        "Valitse Outlook for Macissa Työkalut ja sitten Automaattiset vastaukset. iPhonen tai Android-puhelimen Outlook-sovelluksessa napauta profiilikuvaasi, sitten Asetukset-rataskuvaketta, valitse työtilisi ja napauta Automaattiset vastaukset. Käytitpä kumpaa tahansa, vastaus tallennetaan tilillesi, joten sen ottaminen käyttöön yhdessä paikassa ottaa sen käyttöön kaikkialla.",
      ],
    },
    {
      title: "Näin asetat lomavastaajan Gmailissa",
      body: [
        "Napsauta Gmailissa ratasta ja sitten Näytä kaikki asetukset. Vieritä Yleiset-välilehdellä alas lomavastaajaan, ota se käyttöön, aseta ensimmäinen ja viimeinen päivä, lisää aihe, kuten \"Poissa 3.11. asti\", liitä viestisi ja napsauta sivun alareunasta Tallenna muutokset.",
        "Gmail lähettää automaattisen vastauksen kullekin ihmiselle kerran neljän päivän aikana, ei jokaiseen viestiin, joten kahdesti kirjoittava ei saa sitä kahdesti. Voit myös lähettää sen vain yhteystiedoillesi tai työtilillä vain organisaatiosi jäsenille.",
      ],
    },
    {
      title: "Poissaolo Slackissa ja Microsoft Teamsissa",
      body: [
        "Tiimien chatit eivät lähetä automaattisia vastauksia, joten tila hoitaa saman asian: se näkyy nimesi vieressä kaikkialla, missä sinulle yritetään kirjoittaa. Napsauta Slackissa profiilikuvaasi, valitse Update your status (päivitä tila), lisää emoji ja lyhyt rivi, kuten \"🌴 Lomalla 3.11. asti\", ja aseta se poistumaan, kun palaat. Kun keskeytät ilmoitukset samoiksi päiviksi, myös puhelin pysyy hiljaa.",
        "Napsauta Microsoft Teamsissa profiilikuvaasi ja valitse Määritä tilaviesti. Kirjoita viestisi ja valitse, milloin se poistuu. Samassa ikkunassa on linkki poissaolon ajoittamiseen, joka ottaa käyttöön sekä Outlookin automaattisen vastauksen että Teamsin tilan. Yllä olevan generaattorin tila on tarpeeksi lyhyt molempiin.",
      ],
    },
    {
      title: "Mitä hyvässä poissaoloviestissä on",
      items: [
        { title: "Milloin palaat", body: "Päivämäärä, ei \"ensi viikolla\". Jos et vielä tiedä, kerro vastaavasi heti palattuasi." },
        { title: "Kuka voi auttaa", body: "Nimi ja sähköposti, jos kyseessä on joku keskustelun ulkopuolinen. Kysy häneltä ensin; kukaan ei halua kuulla asiakkaalta olevansa sijainen." },
        { title: "Ei liikaa yksityiskohtia", body: "\"Poissa toimistolta\" riittää. Missä olet ja miksi, ei kuulu kenellekään, ja lomakohde automaattisessa vastauksessa kertoo vieraille, että kotisi on tyhjillään." },
        { title: "Ei lupauksia, joita et pidä", body: "\"Vastaan palattuani\" on hyvä. \"Vastaan jokaiseen sähköpostiin\" kahden viikon poissaolon jälkeen ei yleensä pidä paikkaansa." },
        { title: "Muista poistaa se", body: "Aseta Outlookissa tai Gmailissa loppupäivä ja chatin tilalle poistumisaika, ettei kukaan kuule poissaolostasi paluupäivänäsi." },
      ],
    },
  ],
  fit: {
    title: "Poissaolot rakennettuna toimistoon",
    body: "TinyFloorissa, pienten tiimien virtuaalitoimistossa, tilaviesti kuten \"🌴 Lomalla maanantaihin asti\" näkyy nimesi kohdalla, joten tiimi tietää asian ennen kuin yrittää tavoittaa sinua, ja se poistuu itsestään oikeana päivänä. Se toimii selaimen välilehdessä, ilmaiseksi enintään 3 hengelle ja 29 $ kuukaudessa koko tiimiltä.",
    cta: "Kokeile demotoimistoa",
  },
  faqTitle: "Usein <em>kysyttyä.</em>",
  faq: [
    {
      q: "Mitä poissaoloviestissä pitäisi lukea?",
      a: "Että olet poissa, milloin palaat ja keneen voi olla yhteydessä kiireellisissä asioissa. Esimerkiksi: \"Olen poissa toimistolta ja palaan maanantaina 2. marraskuuta. Kiireellisissä asioissa ota yhteyttä Ana Limaan.\"",
    },
    {
      q: "Miten asetan poissaoloviestin Outlookissa?",
      a: "Uudessa Outlookissa tai verkkoversiossa: Asetukset, Tili, Automaattiset vastaukset. Perinteisessä Outlookissa Windowsille: Tiedosto, Automaattiset vastaukset. Ota käyttöön, aseta päivämäärät ja liitä viestisi.",
    },
    {
      q: "Miten asetan lomavastaajan Gmailissa?",
      a: "Napsauta ratasta, Näytä kaikki asetukset, ja ota Yleiset-välilehdellä lomavastaaja käyttöön. Aseta päivämäärät, aihe ja viesti ja napsauta Tallenna muutokset.",
    },
    {
      q: "Pitääkö kertoa, miksi on poissa?",
      a: "Ei. \"Poissa toimistolta\" riittää. Lomasta kertominen on tavallista ja täysin ok, mutta yksityiskohtia ei tarvitse koskaan antaa, varsinkaan sairaudesta.",
    },
    {
      q: "Millainen on asiallinen poissaoloviesti?",
      a: "\"Kiitos viestistäsi. Olen poissa toimistolta ja palaan maanantaina 2. marraskuuta. Vastaan viestiisi palattuani. Kiireellisissä asioissa ota yhteyttä Ana Limaan (ana@example.com).\"",
    },
    {
      q: "Onko tämä poissaoloviestin generaattori ilmainen?",
      a: "On, ja se toimii kokonaan selaimessasi: kirjoittamiasi nimiä, päivämääriä ja sähköposteja ei lähetetä minnekään. Kopioi viesti Outlookiin, Gmailiin, Slackiin tai Teamsiin.",
    },
    {
      q: "Mitä OOO tarkoittaa?",
      a: "OOO on lyhenne englanninkielisistä sanoista \"out of office\" (poissa toimistolta). Sitä käytetään kalentereissa, chat-tiloissa ja sähköpostien aiheissa (kuten \"OOO maanantaihin asti\") kertomaan, että henkilö on poissa eikä vastaa heti.",
    },
    {
      q: "Onko automaattinen vastaus sama asia kuin poissaoloviesti?",
      a: "Kyllä. Outlookissa poissaoloviestiä kutsutaan automaattiseksi vastaukseksi ja Gmailissa lomavastaajaksi. Ne kaikki lähettävät yhden vastauksen ihmisille, jotka kirjoittavat sinulle poissaolosi aikana.",
    },
    {
      q: "Miten asetan poissaoloviestin Teamsissa?",
      a: "Napsauta profiilikuvaasi, valitse Aseta tilaviesti ja sitten Ajoita poissaolo. Ota automaattiset vastaukset käyttöön, kirjoita viestisi ja aseta päivämäärät. Teams näyttää sinut poissaolevana, ja Outlook lähettää saman viestin kaikille, jotka lähettävät sinulle sähköpostia.",
    },
    {
      q: "Miten asetan poissaoloviestin puhelimen Outlookissa?",
      a: "Napauta Outlook-sovelluksessa profiilikuvaasi, sitten Asetukset-rataskuvaketta, valitse työtilisi ja napauta Automaattiset vastaukset. Ota se käyttöön, kirjoita viestisi ja aseta päivämäärät.",
    },
  ],
};

export default fi;
