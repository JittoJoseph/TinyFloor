import type { StandupContent } from "@/lib/tools/standup";

/** Die Daily-Standup-Vorlage auf Deutsch, aus der englischen Seite geschrieben. */
const de: StandupContent = {
  meta: {
    title: "Daily Standup Vorlage: Agenda und Async-Standup kostenlos",
    description:
      "Erstelle eine Agenda fürs Daily Standup, passend zur Größe deines Teams, oder eine Async-Vorlage für Slack oder Teams. Kostenlos, mit drei Fragensets und Anleitung.",
  },
  eyebrow: "Kostenloses Tool",
  updated: "Aktualisiert am",
  title: "Daily Standup <em>Vorlage.</em>",
  intro:
    "Ein gutes Daily Standup dauert etwa eine Minute pro Person, und danach weiß jede und jeder, was ansteht und wer feststeckt. Wähle die Größe deines Teams und wie ihr euch trefft, im Call, schriftlich oder am Board entlang, und du bekommst eine passend getaktete Agenda oder eine Vorlage für euren Team-Chat.",
  builder: {
    team: "Teamgröße",
    people: "{count} Personen",
    format: "Wie ihr euch trefft",
    formats: { live: "Im Call", async: "Schriftlich (async)", board: "Am Board entlang" },
    questions: "Fragen",
    sets: [
      { key: "classic", label: "Klassisch", questions: ["Was hast du gestern gemacht?", "Was machst du heute?", "Steht dir etwas im Weg?"] },
      { key: "focus", label: "Fokus", questions: ["Was ist heute deine wichtigste Aufgabe?", "Was könnte sie aufhalten?", "Von wem brauchst du Hilfe?"] },
      { key: "progress", label: "Fortschritt", questions: ["Was ist vorangekommen?", "Was kommt als Nächstes?", "Gibt es Risiken, die wir kennen sollten?"] },
    ],
    icebreaker: "Mit einem Ein-Minuten-Icebreaker beginnen",
    minutes: "{count} Minuten",
    agenda: "Agenda",
    template: "Vorlage zum Posten",
    copy: "Kopieren",
    copied: "Kopiert",
    lines: {
      open: "Start: pünktlich anfangen, auch wenn jemand fehlt",
      icebreaker: "Icebreaker: eine kurze Frage, ein Satz pro Person",
      round: "Runde: alle antworten, etwa eine Minute pro Person",
      column: "{column}: was hängt, was kommt als Nächstes",
      blockers: "Blocker: klären, wer hilft, und danach besprechen",
      close: "Abschluss: was alle wissen müssen",
    },
    columns: ["Blockiert", "Im Review", "In Arbeit", "Als Nächstes"],
    note: {
      live: "Etwa eine Minute pro Person, in einem größeren Team etwas weniger, plus eine Minute für Start und Abschluss. Höchstens fünfzehn Minuten: Alles darüber ist ein Meeting, kein Standup.",
      async: "Bitte alle, jeden Morgen bis zur selben Uhrzeit in ihrer eigenen Zeitzone zu posten, die Updates der anderen zu lesen und bei Blockern im Thread zu antworten.",
      board: "Geht das Board von rechts nach links durch: zuerst die Arbeit, die fast fertig ist, damit das Team Dinge abschließt, bevor es Neues anfängt. Fünf Minuten plus etwa eine pro Person.",
    },
  },
  sections: [
    {
      title: "Wofür ein Daily Standup da ist",
      body: [
        "Ein Daily Standup ist ein kurzes Meeting, meist zu Beginn des Tages, in dem alle im Team sagen, woran sie arbeiten und ob ihnen etwas im Weg steht. Es kommt aus agilen Softwareteams, wo es auch Daily Scrum heißt, funktioniert aber für jedes kleine Team, dessen Arbeit voneinander abhängt.",
        "Es ist kein Statusbericht für die Führungskraft. Es geht darum, dass das Team den Tag gemeinsam vor Augen hat: wer was macht, wo sich zwei Aufgaben berühren und wer Hilfe braucht. Wenn ein Standup jemanden weiterbringt, hat es sich gelohnt; wenn es eine Runde Vorträge ist, bei der niemand zuhört, nicht.",
      ],
    },
    {
      title: "Drei Arten, es zu machen",
      items: [
        {
          title: "Im Call",
          detail: "Der Klassiker",
          body: "Alle kommen zur selben Zeit dazu und beantworten nacheinander dieselben drei Fragen. Am besten für Teams in ähnlichen Zeitzonen, die sich gern einmal am Tag sehen. Etwa eine Minute pro Person.",
        },
        {
          title: "Schriftlich",
          detail: "Async-Standup",
          body: "Alle posten ihre Antworten bis zu einer festen Uhrzeit in den Team-Chat und lesen die der anderen. Am besten für Teams über Zeitzonen hinweg oder mit ohnehin vielen Meetings. Das Gespräch fällt weg, also gewöhnt euch an, auf jeden Blocker zu antworten.",
        },
        {
          title: "Am Board entlang",
          detail: "Erst die Arbeit, dann die Personen",
          body: "Statt reihum durch die Personen geht ihr Spalte für Spalte durch das Board, beginnend bei der Arbeit, die fast fertig ist. Am besten für Teams mit vollem Board, bei denen die Frage ist, was hängt, und nicht, was jede Person gemacht hat.",
        },
      ],
    },
    {
      title: "Die drei Standup-Fragen",
      body: [
        "Die klassischen drei lauten: Was hast du gestern gemacht, was machst du heute, und steht dir etwas im Weg? Sie funktionieren, verleiten aber dazu, alles aufzuzählen, was man angefasst hat. Wenn eure Standups zu lang werden, probiert ein schärferes Set:",
      ],
      items: [
        {
          title: "Klassisch",
          body: "Was hast du gestern gemacht? Was machst du heute? Steht dir etwas im Weg? Allen vertraut und gut für ein neues Team.",
        },
        {
          title: "Fokus",
          body: "Was ist heute deine wichtigste Aufgabe? Was könnte sie aufhalten? Von wem brauchst du Hilfe? Kürzere Antworten, und die letzte Frage macht aus Blockern konkrete Bitten.",
        },
        {
          title: "Fortschritt",
          body: "Was ist vorangekommen? Was kommt als Nächstes? Gibt es Risiken? Es geht um die Arbeit statt um die Person, das passt gut zum Board.",
        },
      ],
    },
    {
      title: "Eine Daily-Standup-Agenda, Minute für Minute",
      body: [
        "Für ein Team von sechs Personen im Call dauert ein Standup etwa acht Minuten. Fangt pünktlich an, auch wenn jemand fehlt: Wer wartet, bringt allen bei, zu spät zu kommen. Geht dann in fester Reihenfolge herum, so wie die Leute auf dem Bildschirm erscheinen oder alphabetisch, damit niemand rätselt, wann er dran ist.",
        "Wenn jemand ein Problem anspricht, löst es nicht im Standup. Haltet fest, wer helfen kann, und sprecht direkt danach, nur mit den Leuten, die es betrifft. Allein diese Gewohnheit hält ein Standup unter zehn Minuten. Fragt zum Schluss, ob es etwas gibt, das alle wissen müssen, und beendet den Call.",
      ],
      table: {
        head: ["Teamgröße", "Im Call", "Am Board entlang"],
        rows: [
          ["3 Personen", "5 Minuten", "8 Minuten"],
          ["6 Personen", "8 Minuten", "11 Minuten"],
          ["8 Personen", "10 Minuten", "13 Minuten"],
          ["12 Personen", "11 Minuten", "15 Minuten"],
          ["15 Personen", "14 Minuten", "15 Minuten"],
        ],
        note: "So berechnet wie im Tool oben: etwa eine Minute pro Person (eine Dreiviertelminute ab mehr als acht Personen) plus zwei für Start und Abschluss, und nie mehr als fünfzehn.",
      },
    },
    {
      title: "Ein Async-Standup durchführen",
      body: [
        "Ein Async-Standup sind dieselben drei Fragen, schriftlich beantwortet. Legt einen Kanal und eine Uhrzeit fest, etwa 10 Uhr in der jeweils eigenen Zeitzone, und bittet alle, ihre Antworten als eine Nachricht zu posten, mit der Vorlage oben, damit man sie schnell überfliegen kann.",
        "Zwei Dinge sorgen dafür, dass es funktioniert. Erstens: Lest die Updates der anderen; ein Async-Standup, das niemand liest, ist ein Tagebuch. Zweitens: Antwortet noch am selben Tag im Thread auf jeden Blocker. Manche Teams behalten zusätzlich einen kurzen Call pro Woche, damit man sich trotzdem sieht.",
      ],
    },
    {
      title: "Typische Fehler im Standup",
      items: [
        { title: "Es wird zur Problemlösung", body: "Jemand spricht ein Problem an, und drei Leute fangen an, es zu lösen. Notieren, klären, wer danach spricht, weitermachen." },
        { title: "Es ist ein Bericht an die Führungskraft", body: "Wenn alle beim Reden die Teamleitung anschauen, ist das Standup für die falsche Person. Sprecht mit dem Team." },
        { title: "Zu viele Leute", body: "Ab etwa zwölf Personen hört niemand mehr allen zu. Teilt euch in kleinere Standups nach Projekt oder Arbeitsbereich auf." },
        { title: "Zu spät anfangen", body: "Fünf Minuten auf die letzte Person zu warten, kostet alle anderen fünf Minuten, jeden Tag. Fangt pünktlich an." },
        { title: "Jeden Tag „keine Blocker“", body: "Wenn nie jemand blockiert ist, stellt eine schärfere Frage: „Was könnte deine wichtigste Aufgabe heute aufhalten?“ findet meistens etwas." },
      ],
    },
  ],
  fit: {
    title: "Macht euer Standup auf der Fläche",
    body: "TinyFloor ist ein virtuelles Büro für Remote-Teams: Du siehst, wer am Schreibtisch sitzt, und zum Standup geht ihr in den Besprechungsraum statt auf einen weiteren Link. Danach gehst du zu der Person, die feststeckt. Es läuft in einem Browser-Tab, kostenlos für bis zu 3 Personen und 29 $ im Monat für das ganze Team.",
    cta: "Das Demo-Büro ausprobieren",
  },
  faqTitle: "Häufige <em>Fragen.</em>",
  faq: [
    {
      q: "Was sind die drei Fragen im Daily Standup?",
      a: "Was hast du gestern gemacht? Was machst du heute? Steht dir etwas im Weg? Eine schärfere Version: Was ist heute deine wichtigste Aufgabe? Was könnte sie aufhalten? Von wem brauchst du Hilfe?",
    },
    {
      q: "Wie lange sollte ein Daily Standup dauern?",
      a: "Etwa eine Minute pro Person plus ein, zwei Minuten für Start und Abschluss: rund acht Minuten für ein Team von sechs. Höchstens fünfzehn Minuten.",
    },
    {
      q: "Was ist eine Daily-Standup-Vorlage?",
      a: "Eine feste Agenda für das Meeting oder ein Nachrichtenformat für ein schriftliches Standup: jeden Tag dieselben drei Fragen in derselben Reihenfolge, damit Updates schnell gegeben und leicht zu überfliegen sind.",
    },
    {
      q: "Was ist ein Async-Standup?",
      a: "Ein Standup in schriftlicher Form: Alle posten ihre Antworten auf die drei Fragen bis zu einer festen Uhrzeit in den Team-Chat und lesen die der anderen. Es passt zu Teams über Zeitzonen hinweg.",
    },
    {
      q: "Ist ein Daily Standup nur etwas für Scrum-Teams?",
      a: "Nein. Es kommt aus agilen Softwareteams, wo es Daily Scrum heißt, aber jedes kleine Team, dessen Arbeit voneinander abhängt, kann es nutzen.",
    },
    {
      q: "Ist dieses Daily-Standup-Tool kostenlos?",
      a: "Ja, und es läuft komplett in deinem Browser: Nichts, was du auswählst, wird irgendwohin gesendet. Kopiere die Agenda oder Vorlage in deine Kalendereinladung oder euren Team-Chat.",
    },
  ],
};

export default de;
