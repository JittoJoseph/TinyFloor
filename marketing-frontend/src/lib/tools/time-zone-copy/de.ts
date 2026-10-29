import type { TimeZonesContent } from "@/lib/tools/time-zones";

const de: TimeZonesContent = {
  meta: {
    title: "Meetingplaner für Zeitzonen: gemeinsame Arbeitszeit im Remote-Team finden",
    description:
      "Trag für jede Person im Team Stadt und Arbeitszeit ein und sieh, wann alle gleichzeitig arbeiten, oder die Zeit, die den meisten passt, wenn keine allen passt. Berücksichtigt Sommerzeit und halbe Stunden wie in Indien.",
  },
  eyebrow: "Kostenlose Tools",
  updated: "Aktualisiert am",
  title: "Wann sich die Arbeitszeiten deines Teams <em>überschneiden.</em>",
  intro:
    "Trag für jede Person Stadt und Arbeitszeit ein. Der Planer zeigt die Stunden, in denen alle gleichzeitig arbeiten, in der Zeit jeder Person, und wenn keine Stunde allen passt, die, die den meisten passt. Er rechnet mit den Zeitverschiebungen von heute, die Sommerzeit ist also eingerechnet.",
  planner: {
    zone: "Zeitzone",
    hours: "Arbeitszeit",
    remove: "Entfernen",
    add: "Person hinzufügen",
    addMine: "Meine Zeitzone hinzufügen",
    timesIn: "Zeiten in {city}",
    working: "Arbeitet",
    all: "Alle",
    everyone: "Alle arbeiten von {from} bis {to} Uhr, Zeit in {city}.",
    best: "Keine Zeit passt allen. Von {from} bis {to} Uhr, Zeit in {city}, passt es {count} von {total}.",
    nobody: "Die Arbeitszeiten überschneiden sich nicht.",
    eachLocal: "In der Zeit jeder Person:",
  },
  sections: [
    {
      title: "Wie viel Überschneidung ein Team braucht",
      body: [
        "Weniger, als man denkt. Zwei bis vier gemeinsame Stunden am Tag reichen für ein Daily, für die Fragen, die schneller gestellt als getippt sind, und für ein Meeting, wenn eins nötig ist. Alles andere kann schriftlich laufen, in der Arbeitszeit jeder Person.",
        "Weh tut es, wenn es gar keine Überschneidung gibt, oder nur, weil jemand jeden Tag um 7 oder um 22 Uhr arbeitet. Zeigt der Planer gemeinsame Zeit nur am Rand von jemandes Tag, zahlt diese Person für die Meetings des Teams.",
      ],
    },
    {
      title: "Eine faire Meetingzeit finden",
      items: [
        {
          title: "In der gemeinsamen Zeit treffen",
          body: "Legt das Daily und die wiederkehrenden Meetings in den Abschnitt, den der Planer zeigt, und haltet den Rest der gemeinsamen Zeit für kurze Fragen frei. Gemeinsame Zeit ist das Knappste, was ein verteiltes Team hat.",
        },
        {
          title: "Den unbequemen Termin rotieren",
          body: "Wenn die einzige mögliche Zeit für die einen früh und für die anderen spät ist, wechselt Woche für Woche ab, damit nicht immer dieselben abends online kommen.",
        },
        {
          title: "Weniger und kürzere Meetings",
          body: "Ein Daily von 15 Minuten passt in fast jede Überschneidung, ein Meeting von einer Stunde meist nicht. Fragt, ob ein Meeting auch ein schriftliches Update sein könnte, bevor ihr einen Termin dafür sucht.",
        },
        {
          title: "Das Ergebnis aufschreiben",
          body: "Wer nicht dabei sein konnte, sollte in zwei Minuten auf dem Stand sein: ein paar Zeilen dazu, was entschieden wurde und wer was macht, dort gepostet, wo das Team ohnehin liest.",
        },
        {
          title: "Die eigene Arbeitszeit zeigen",
          body: "Trag deine Arbeitszeit in Kalender und Status ein, damit niemand ausrechnen muss, ob gerade ein guter Moment für eine Frage an dich ist.",
        },
      ],
    },
    {
      title: "Wenn es keine Überschneidung gibt",
      items: [
        { title: "Schriftliche Dailys", body: "Jede Person schreibt zu Beginn ihres Tages, was sie gemacht hat, was als Nächstes kommt und was sie blockiert. Die anderen lesen es zu Beginn ihres Tages." },
        { title: "Zwei kleinere Meetings", body: "Teilt das Team für Live-Meetings nach Region auf, mit einer Person in beiden oder geteilten Notizen, damit das Wichtige auf beiden Seiten ankommt." },
        { title: "Übergabe am Ende des Tages", body: "Wenn der Abend der einen der Morgen der anderen ist, lässt eine kurze Notiz am Ende des Tages die Arbeit weiterlaufen, während die erste Person schläft." },
        { title: "Eine gemeinsame Stunde pro Woche", body: "Selbst ein Team ohne tägliche Überschneidung findet eine Stunde pro Woche, in der sich alle ein wenig strecken, und rotiert, wer sich am meisten streckt." },
      ],
    },
    {
      title: "Die Sommerzeit verschiebt die Überschneidung",
      body: [
        "Die Uhren werden an verschiedenen Orten an verschiedenen Tagen umgestellt, deshalb kann sich die gemeinsame Zeit eines Teams jedes Frühjahr und jeden Herbst für ein paar Wochen um eine Stunde verschieben. Die USA stellen am zweiten Sonntag im März und am ersten im November um, Europa am letzten Sonntag im März und im Oktober. Australien, Neuseeland und Chile stellen umgekehrt um, in ihrem eigenen Frühling. Indien, China, Japan, Brasilien und Mexiko stellen gar nicht um.",
        "Der Planer berechnet die Zeitverschiebung jeder Stadt für heute; prüf ihn also um diese Termine herum noch einmal, wenn die Überschneidung in deinem Team knapp ist.",
      ],
    },
    {
      title: "Wie er rechnet",
      body: [
        "Er nimmt den Tag in halben Stunden in der Zeit der ersten Person, rechnet mit den Zeitzonendaten deines Browsers aus, wie spät es für alle anderen ist, und zählt, wer gerade in seiner Arbeitszeit ist. Halbe Stunden sind für Indien wichtig, das UTC fünfeinhalb Stunden voraus ist. Arbeitszeiten über Mitternacht, etwa von 22 bis 6 Uhr, funktionieren auch, und alles läuft in deinem Browser.",
      ],
    },
  ],
  fit: {
    title: "Mach die gemeinsamen Stunden wertvoll",
    body: "TinyFloor ist ein virtuelles Büro für Remote-Teams. In den Stunden, die ihr teilt, sind alle, die da sind, auf derselben Fläche, und eine Frage ist ein Gang zu jemandes Schreibtisch statt eines Calls, den man planen muss. Es ist kostenlos für bis zu 3 Personen und kostet 29 $ im Monat für das ganze Team.",
    cta: "Demo-Büro ausprobieren",
  },
  faqTitle: "Häufige <em>Fragen.</em>",
  faq: [
    {
      q: "Wie finde ich eine Meetingzeit über Zeitzonen hinweg?",
      a: "Schreib Stadt und Arbeitszeit jeder Person auf und such die halben Stunden, in denen alle gleichzeitig arbeiten. Der Planer oben macht das für bis zu 12 Personen und zeigt das Ergebnis in der Zeit jeder Person.",
    },
    {
      q: "Wie viele gemeinsame Stunden braucht ein Remote-Team?",
      a: "Zwei bis vier Stunden am Tag reichen den meisten Teams: genug für ein Daily, kurze Fragen und gelegentlich ein Meeting. Der Rest der Arbeit kann schriftlich und in der eigenen Arbeitszeit passieren.",
    },
    {
      q: "Was ist eine faire Meetingzeit über Zeitzonen hinweg?",
      a: "Eine, die in der Arbeitszeit aller liegt. Gibt es keine, rotiert den frühen oder späten Termin Woche für Woche, damit ihn nicht immer dieselben übernehmen.",
    },
    {
      q: "Was, wenn sich die Arbeitszeiten in meinem Team gar nicht überschneiden?",
      a: "Arbeitet schriftlich: schriftliche Dailys zu Beginn des Tages jeder Person, eine Übergabenotiz am Ende und Live-Meetings nach Region aufgeteilt. Die meisten Teams finden trotzdem eine gemeinsame Stunde pro Woche.",
    },
    {
      q: "Berücksichtigt der Planer die Sommerzeit?",
      a: "Ja. Er nutzt die Zeitverschiebung jeder Stadt für heute aus den Zeitzonendaten deines Browsers, die Sommerzeit ist also eingerechnet. Prüf ihn Ende März und Ende Oktober noch einmal, wenn die Uhren an verschiedenen Tagen umgestellt werden.",
    },
  ],
};

export default de;
