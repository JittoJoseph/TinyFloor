import type { TimeZonesContent } from "@/lib/tools/time-zones";

const fi: TimeZonesContent = {
  meta: {
    title: "Aikavyöhykkeiden palaverisuunnittelija: etätiimin yhteiset tunnit",
    description:
      "Lisää jokaisen tiimiläisen kaupunki ja työaika, niin näet, milloin kaikki työskentelevät yhtä aikaa, tai ajan, joka sopii useimmille, kun mikään aika ei sovi kaikille. Huomioi kesäajan ja puolen tunnin aikaerot, kuten Intiassa.",
  },
  eyebrow: "Ilmaiset työkalut",
  updated: "Päivitetty",
  title: "Milloin tiimin työajat <em>osuvat yhteen.</em>",
  intro:
    "Lisää jokaisen kaupunki ja työaika. Suunnittelija näyttää tunnit, jolloin kaikki työskentelevät yhtä aikaa, jokaisen omassa ajassa, ja kun mikään tunti ei sovi kaikille, sen, joka sopii useimmille. Se laskee tämän päivän aikaeroilla, joten kesäaika on mukana.",
  planner: {
    zone: "Aikavyöhyke",
    hours: "Työaika",
    remove: "Poista",
    add: "Lisää henkilö",
    addMine: "Lisää oma aikavyöhyke",
    timesIn: "Ajat: {city}",
    working: "Töissä",
    all: "Kaikki",
    everyone: "Kaikki ovat töissä {from}–{to} ({city}).",
    best: "Mikään aika ei sovi kaikille. {from}–{to} ({city}) sopii {count}/{total} henkilölle.",
    nobody: "Työajat eivät osu yhteen.",
    eachLocal: "Jokaisen omassa ajassa:",
  },
  sections: [
    {
      title: "Kuinka paljon yhteistä aikaa tiimi tarvitsee",
      body: [
        "Vähemmän kuin luulisi. Kahdesta neljään yhteistä tuntia päivässä riittää aamupalaveriin, kysymyksiin, jotka on nopeampi kysyä kuin kirjoittaa, ja palaveriin silloin kun sitä tarvitaan. Kaikki muu voi tapahtua kirjallisesti, kunkin omalla työajalla.",
        "Pahinta on, jos yhteistä aikaa ei ole lainkaan, tai sitä on vain siksi, että joku tekee töitä joka päivä kello 7 tai 22. Jos suunnittelija näyttää yhteistä aikaa vain jonkun päivän reunalla, se henkilö maksaa tiimin palaverit.",
      ],
    },
    {
      title: "Reilun palaveriajan löytäminen",
      items: [
        {
          title: "Kokoontukaa yhteisillä tunneilla",
          body: "Laittakaa aamupalaveri ja toistuvat palaverit suunnittelijan näyttämälle jaksolle, ja pitäkää loput yhteisistä tunneista vapaina nopeille kysymyksille. Yhteinen aika on hajautetun tiimin niukin resurssi.",
        },
        {
          title: "Kierrättäkää huonoa aikaa",
          body: "Kun ainoa mahdollinen aika on aikainen joillekin ja myöhäinen toisille, vuorotelkaa viikoittain, jotta samat ihmiset eivät aina kirjaudu illalla.",
        },
        {
          title: "Vähemmän ja lyhyempiä palavereja",
          body: "15 minuutin aamupalaveri mahtuu lähes mihin tahansa yhteiseen aikaan, tunnin palaveri yleensä ei. Kysykää, voisiko palaverin korvata kirjallisella päivityksellä, ennen kuin etsitte sille aikaa.",
        },
        {
          title: "Kirjatkaa lopputulos",
          body: "Poissa olleen pitää päästä kärryille kahdessa minuutissa: muutama rivi siitä, mitä päätettiin ja kuka tekee mitä, julkaistuna siellä, missä tiimi jo lukee.",
        },
        {
          title: "Näytä työaikasi",
          body: "Merkitse työaikasi kalenteriin ja tilaasi, jotta kenenkään ei tarvitse laskea, onko nyt hyvä hetki kysyä sinulta jotain.",
        },
      ],
    },
    {
      title: "Kun yhteistä aikaa ei ole",
      items: [
        { title: "Kirjalliset aamupalaverit", body: "Jokainen kirjoittaa päivänsä alussa, mitä teki, mitä seuraavaksi ja mikä on esteenä. Muut lukevat sen oman päivänsä alussa." },
        { title: "Kaksi pienempää palaveria", body: "Jakakaa tiimi alueittain livepalavereihin niin, että yksi henkilö on molemmissa tai muistiinpanot jaetaan, jotta olennainen kulkee puolelta toiselle." },
        { title: "Luovutus päivän päätteeksi", body: "Kun toisen ilta on toisen aamu, lyhyt muistiinpano päivän lopussa antaa työn edetä sillä aikaa, kun ensimmäinen nukkuu." },
        { title: "Yksi yhteinen tunti viikossa", body: "Myös tiimi ilman päivittäistä yhteistä aikaa voi löytää viikosta tunnin, jolloin kaikki joustavat vähän, ja kierrättää sitä, kuka joustaa eniten." },
      ],
    },
    {
      title: "Kesäaika siirtää yhteistä aikaa",
      body: [
        "Kelloja siirretään eri paikoissa eri päivinä, joten tiimin yhteiset tunnit voivat siirtyä tunnilla muutamaksi viikoksi joka kevät ja syksy. Yhdysvallat siirtyy maaliskuun toisena ja marraskuun ensimmäisenä sunnuntaina, Eurooppa maaliskuun ja lokakuun viimeisenä sunnuntaina. Australia, Uusi-Seelanti ja Chile siirtyvät päinvastoin, omana keväänään. Intia, Kiina, Japani, Brasilia ja Meksiko eivät siirrä kelloja lainkaan.",
        "Suunnittelija laskee jokaisen kaupungin aikaeron tälle päivälle, joten tarkista uudelleen näiden päivien tienoilla, jos tiiminne yhteinen aika on tiukka.",
      ],
    },
    {
      title: "Miten se laskee",
      body: [
        "Se jakaa päivän puolen tunnin jaksoihin ensimmäisen henkilön ajassa, laskee selaimesi aikavyöhyketiedoilla, paljonko kello on kaikilla muilla, ja laskee, ketkä ovat työajallaan. Puolet tunnit tarvitaan Intiaa varten, joka on viisi ja puoli tuntia UTC:tä edellä. Keskiyön yli menevät työajat, kuten 22–6, toimivat myös, ja kaikki laskenta tapahtuu selaimessasi.",
      ],
    },
  ],
  fit: {
    title: "Ota yhteisistä tunneista kaikki irti",
    body: "TinyFloor on virtuaalitoimisto pienille tiimeille. Yhteisinä tunteina kaikki paikalla olevat ovat samassa kerroksessa, ja kysymys on käynti jonkun työpisteellä eikä sovittava puhelu. Se on ilmainen enintään 3 hengelle ja 29 $ kuukaudessa koko tiimiltä.",
    cta: "Kokeile demotoimistoa",
  },
  faqTitle: "Usein <em>kysyttyä.</em>",
  faq: [
    {
      q: "Miten löydän palaveriajan eri aikavyöhykkeiden välillä?",
      a: "Kirjaa jokaisen kaupunki ja työaika ja etsi ne puolen tunnin jaksot, jolloin kaikki ovat töissä yhtä aikaa. Yllä oleva suunnittelija tekee sen enintään 12 hengelle ja näyttää tuloksen jokaisen omassa ajassa.",
    },
    {
      q: "Kuinka monta yhteistä tuntia etätiimi tarvitsee?",
      a: "Kahdesta neljään tuntia päivässä riittää useimmille tiimeille: tarpeeksi aamupalaveriin, nopeisiin kysymyksiin ja satunnaiseen palaveriin. Muu työ voidaan tehdä kirjallisesti, kunkin omalla ajalla.",
    },
    {
      q: "Mikä on reilu palaveriaika eri aikavyöhykkeillä?",
      a: "Sellainen, joka osuu kaikkien työaikaan. Jos sellaista ei ole, kierrättäkää aikaista tai myöhäistä aikaa viikoittain, jotta samat ihmiset eivät aina ota sitä.",
    },
    {
      q: "Entä jos tiimillämme ei ole lainkaan yhteistä aikaa?",
      a: "Työskennelkää kirjallisesti: kirjalliset aamupalaverit kunkin päivän alussa, luovutusmuistiinpano lopussa ja livepalaverit alueittain. Useimmat tiimit löytävät silti yhden yhteisen tunnin viikossa.",
    },
    {
      q: "Huomioiko suunnittelija kesäajan?",
      a: "Kyllä. Se käyttää jokaisen kaupungin tämän päivän aikaeroa selaimen aikavyöhyketiedoista, joten kesäaika on mukana. Tarkista uudelleen maaliskuun ja lokakuun lopussa, kun kelloja siirretään eri päivinä.",
    },
  ],
};

export default fi;
