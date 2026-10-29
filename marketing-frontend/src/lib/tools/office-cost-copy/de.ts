import type { OfficeCostsContent } from "@/lib/tools/office-costs";

const de: OfficeCostsContent = {
  meta: {
    title: "Kostenrechner für virtuelle Büros: Was 10 Tools dein Team kosten",
    description:
      "Gib die Größe deines Teams ein und sieh, was Gather, SoWork, Spot, Kumospace, WorkAdventure, SpatialChat, Roam, oVice, Sococo und TinyFloor im Monat kosten, bei jährlicher oder monatlicher Abrechnung, laut der Preisseite jedes Anbieters.",
  },
  eyebrow: "Kostenlose Tools",
  updated: "Preise geprüft am",
  title: "Was ein virtuelles Büro <em>dein Team kostet.</em>",
  intro:
    "Die meisten virtuellen Büros rechnen pro Person ab, einige pro Raum oder pro Büro, und die kostenlosen Pläne enden bei unterschiedlichen Größen. Gib ein, wie viele Leute in deinem Team sind, und sieh, was jedes von zehn Tools im Monat kostet, das günstigste zuerst.",
  calculator: {
    people: "Personen im Team",
    count: "{count} Personen",
    billing: { yearly: "Jährliche Abrechnung", monthly: "Monatliche Abrechnung" },
    product: "Produkt",
    free: "Kostenloser Plan",
    price: "Bezahlter Plan",
    perMonth: "{amount} im Monat",
    perYear: "{amount} im Jahr",
    only: { yearly: "nur jährlich", monthly: "nur monatlich" },
    noFree: "Kein kostenloser Plan",
    fits: "Kostenlos in dieser Größe",
    upTo: "Bis zu {count} Personen",
    pricingPage: "Preisseite",
    basis: {
      office: "Ein Preis für das Büro",
      member: "Pro Mitglied",
      activeMember: "Pro aktivem Mitglied",
      space: "Pro Raum",
      seat: "Pro Platz, mindestens 10",
    },
    limits: {
      everyFeature: "alle Funktionen",
      thirtyMinutes: "30-Minuten-Meetings",
      oneFloor: "eine Etage",
      atOnce: "gleichzeitig",
      twoHours: "2 Stunden am Tag",
      preRelease: "Vorabversion, ohne Support",
    },
    summary: "Für {count} Personen kosten Pläne pro Person {low} bis {high} im Monat. TinyFloor kostet {tinyfloor}.",
    summaryLarge: "Für {count} Personen kosten Pläne pro Person {low} bis {high} im Monat.",
  },
  sections: [
    {
      title: "Wie virtuelle Büros abrechnen",
      body: ["Auf vier Arten, und welche ein Tool nutzt, entscheidet stärker als der Listenpreis, was ein wachsendes Team zahlt."],
      items: [
        {
          title: "Pro Mitglied",
          detail: "Gather, SoWork, Spot, Kumospace, WorkAdventure, SpatialChat",
          body: "Du zahlst jeden Monat für alle mit einem Konto, ob sie reinkommen oder nicht. Die Rechnung wächst mit jeder Einstellung: Ein Team von 10 zahlt doppelt so viel wie eines von 5.",
        },
        {
          title: "Pro aktivem Mitglied",
          detail: "Roam",
          body: "Du zahlst für die Leute, die es in dem Monat genutzt haben. Wer im Urlaub ist, kostet nichts, aber die meisten Teams sind jeden Monat aktiv, also läuft es in der Praxis wie pro Mitglied.",
        },
        {
          title: "Pro Raum oder Platzpaket",
          detail: "oVice, Sococo",
          body: "Du zahlst für einen Raum, der für eine bestimmte Zahl von Leuten gedacht ist, oder für ein Mindestpaket an Plätzen. Günstig, wenn dein Team ihn füllt, teuer, wenn nicht: Sococo berechnet 10 Plätze, auch wenn ihr zu viert seid.",
        },
        {
          title: "Ein Preis für das Büro",
          detail: "TinyFloor",
          body: "Ein Preis, egal wie viele ihr seid, bis zu der Größe, die der Plan aufnimmt. Jemanden hinzuzufügen kostet nichts, also muss niemand entscheiden, ob eine Freelancerin einen Platz wert ist.",
        },
      ],
    },
    {
      title: "Jährliche oder monatliche Abrechnung",
      body: [
        "Die meisten Tools pro Person geben 10 bis 20 % Rabatt, wenn man ein Jahr im Voraus zahlt: Gather kostet 12 $ pro Mitglied bei jährlicher und 15 $ bei monatlicher Abrechnung. Das ist eine Bindung für ein Jahr bei einem Team, dessen Größe sich ändern kann, und der Rabatt ist weg, wenn ihr nach drei Monaten aufhört.",
        "Manche rechnen nur auf eine Art ab: Roam und TinyFloor monatlich, Sococo jährlich. Der Rechner zeigt sie mit dem Preis, den sie haben, und sagt dazu, welcher es ist.",
      ],
    },
  ],
  table: {
    title: "Was ein Team von 5, 10 oder 15 im Monat zahlt",
    body: [
      "Dieselben Preise bei drei üblichen Größen, jährlich abgerechnet, wo das Tool es anbietet, weil das der niedrigere Preis ist. Kostenlose Pläne zählen hier nicht; der Rechner oben zeigt, welche passen.",
    ],
    product: "Produkt",
    note: "Preise in US-Dollar ohne Steuern, von der Preisseite jedes Produkts. Sococo berechnet mindestens 10 Plätze; oVice wechselt ab etwa 10 regelmäßigen Mitgliedern von Entry-S zu Entry-M.",
  },
  after: [
    {
      title: "Wann ein kostenloser Plan reicht",
      body: [
        "Ein kostenloser Plan, in den euer ganzes Team passt, schlägt jeden bezahlten, also prüf die Grenzen vor dem Preis. Der von SoWork deckt 10 Mitglieder ab, beendet aber jedes Meeting nach 30 Minuten. Der von WorkAdventure deckt 10 Personen gleichzeitig online ab. Der von SpatialChat gibt 12 Personen zwei Stunden Meetings am Tag, was für eine wöchentliche Runde reicht, nicht für ein Büro, das den ganzen Tag offen ist. Der von Kumospace deckt 5 Mitglieder auf einer Etage ab, der von TinyFloor 3 Personen mit allen Funktionen. Der kostenlose Plan von oVice läuft auf einer Vorabversion ohne Support.",
      ],
    },
    {
      title: "Was der Preis nicht zeigt",
      items: [
        {
          title: "Was im Plan steckt",
          body: "Der günstigste Plan ist nicht immer der, den ihr nutzen würdet. SoWork Basic hat zwei Meeting-Aufnahmen; Aufnahmen und KI-Notizen gibt es in Premium für 12 $ pro Mitglied. Gather enthält Aufnahme und Transkription. TinyFloor hat keine Aufnahmen und keine KI-Notizen.",
        },
        {
          title: "Gäste",
          body: "Kunden und Freelancer, die ab und zu vorbeikommen, zählen bei manchen Tools als Mitglieder. Gather und oVice lassen euch Gäste einladen, ohne für sie zu zahlen; prüft das, bevor ihr Leute hinzufügt, die nur zu Besuch sind.",
        },
        { title: "Steuern", body: "Alle Preise hier sind ohne Steuern. Je nachdem, wo ihr sitzt, kommt beim Bezahlen Mehrwert- oder Umsatzsteuer dazu." },
        {
          title: "Testphasen",
          body: "Gather und Spot haben eine Testphase von 30 Tagen, Roam und oVice 14 Tage, SoWork 7 Tage. Die Testphase zeigt, ob das Team es nutzt; der Preis, ob ihr weiter zahlt.",
        },
      ],
    },
    {
      title: "Wie wir geprüft haben",
      body: [
        "Jeder Preis stammt von der Preisseite des Produkts selbst, im Rechner verlinkt, gelesen in dem Monat, der oben steht. Wir nehmen den Plan, den ein kleines Team für ein Büro kaufen würde, das den ganzen Tag offen ist, keine Event- oder Enterprise-Pläne. Wo eine Seite nur einen Abrechnungszeitraum nennt, zeigen wir diesen. Preise ändern sich, also prüf die Preisseite vor dem Kauf; wir prüfen alle paar Monate neu.",
      ],
    },
  ],
  fit: {
    title: "Ein Preis für das ganze Team",
    body: "TinyFloor ist ein Büro im Browser für Remote-Teams: Du gehst zu jemandem hin, um zu reden, dazu ein Besprechungsraum, Chat und Bildschirmfreigabe. Es ist kostenlos für bis zu 3 Personen und kostet danach 29 $ im Monat für das ganze Team, egal wie viele ihr seid. Es hat keine Aufnahmen und keine KI-Notizen; wenn ihr die braucht, passen Gather oder SoWork Premium besser.",
    cta: "Demo-Büro ausprobieren",
  },
  faqTitle: "Häufige <em>Fragen.</em>",
  faq: [
    {
      q: "Was kostet ein virtuelles Büro im Monat?",
      a: "Für ein Team von 10 mit einem bezahlten Plan 29 $ bis 195 $ im Monat, je nach Tool: TinyFloor kostet 29 $ für das ganze Büro, Tools pro Person reichen von 48 $ (Spot Basic, jährlich) bis 195 $ (Roam).",
    },
    {
      q: "Was ist das günstigste virtuelle Büro für ein kleines Team?",
      a: "Ein kostenloser Plan, der passt: Der von SoWork deckt 10 Mitglieder mit 30-Minuten-Meetings ab, der von WorkAdventure 10 Personen gleichzeitig, der von Kumospace 5 Mitglieder und der von TinyFloor 3 Personen. Darüber ist TinyFloor mit 29 $ im Monat für das ganze Team ab 7 Personen der niedrigste bezahlte Preis.",
    },
    {
      q: "Ist Gather kostenlos?",
      a: "Nein. Gather hat seinen kostenlosen Plan 2025 eingestellt. Nach einer Testphase von 30 Tagen kostet es 12 $ pro Mitglied im Monat bei jährlicher oder 15 $ bei monatlicher Abrechnung, ein Team von 10 zahlt also 120 $ bis 150 $ im Monat.",
    },
    {
      q: "Ist ein Preis pro Person oder ein Festpreis besser?",
      a: "Pro Person ist für ein Team von 2 oder 3 günstiger, weil der Preis pro Kopf klein ist. Ein Festpreis gewinnt, wenn das Team wächst, und er kostet nie mehr, wenn eine Freelancerin oder eine neue Kollegin dazukommt.",
    },
    {
      q: "Sind die Preise für virtuelle Büros inklusive Steuern?",
      a: "Nein. Die Preise auf den Preisseiten der Tools, und hier, sind ohne Steuern; Mehrwert- oder Umsatzsteuer kommt beim Bezahlen dazu, je nachdem, wo ihr sitzt.",
    },
  ],
};

export default de;
