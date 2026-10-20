import type { OooContent } from "@/lib/tools/out-of-office";

/** Der Abwesenheitsnotiz-Generator auf Deutsch, aus der englischen Seite geschrieben. */
const de: OooContent = {
  meta: {
    title: "Abwesenheitsnotiz Generator: kostenlose Vorlagen und Beispiele",
    description:
      "Schreib deine Abwesenheitsnotiz in Sekunden: automatische Antwort per E-Mail und Status für Slack oder Teams, für Urlaub, Krankheit und Dienstreise. Mit Beispielen.",
  },
  eyebrow: "Kostenloses Tool",
  updated: "Aktualisiert am",
  title: "Abwesenheitsnotiz <em>Generator.</em>",
  intro:
    "Gib an, warum du weg bist, wann du zurück bist und wer in der Zwischenzeit hilft, und du bekommst eine automatische E-Mail-Antwort und einen kurzen Status für euren Team-Chat, fertig zum Einfügen. Darunter: Beispiele für jede Situation und wie du die Abwesenheitsnotiz in Outlook, Gmail, Slack und Teams einschaltest.",
  writer: {
    reason: "Warum du weg bist",
    reasons: { vacation: "Urlaub", sick: "Krank", travel: "Dienstreise", parental: "Elternzeit", holiday: "Feiertag" },
    back: "Zurück am",
    unknown: "Leer lassen, wenn du es noch nicht weißt.",
    name: "Dein Name",
    contact: "Wer stattdessen hilft",
    email: "Deren E-Mail",
    optional: "(optional)",
    tone: "Ton",
    tones: { professional: "Förmlich", friendly: "Freundlich", short: "Kurz" },
    emailTitle: "Automatische E-Mail-Antwort",
    statusTitle: "Status für Slack, Teams oder TinyFloor",
    statusNote: "Höchstens 100 Zeichen, damit er in einen Slack-Status passt.",
    copy: "Kopieren",
    copied: "Kopiert",
  },
  sections: [
    {
      title: "Beispiele für Abwesenheitsnotizen",
      body: [
        "Jede gute Abwesenheitsnotiz sagt drei Dinge: dass du nicht da bist, wann du zurück bist und an wen man sich wenden kann, wenn es nicht warten kann. So klingt das in den häufigsten Situationen; der Generator oben schreibt dasselbe mit deinen Daten und Namen.",
      ],
      items: [
        {
          title: "Urlaub",
          detail: "Jahresurlaub",
          body: "„Vielen Dank für Ihre Nachricht. Ich bin derzeit im Urlaub. Ab Montag, 2. November, bin ich wieder da und beantworte Ihre Nachricht. In dringenden Fällen wenden Sie sich bitte an Ana Lima (ana@example.com).“",
        },
        {
          title: "Krankheit",
          detail: "Kurz und privat",
          body: "„Vielen Dank für Ihre Nachricht. Ich bin heute nicht im Büro und melde mich, sobald ich zurück bin. In dringenden Fällen wenden Sie sich bitte an Ana Lima.“ Ob du sagst, dass du krank bist, ist deine Sache; Details schuldest du niemandem.",
        },
        {
          title: "Dienstreise oder Konferenz",
          detail: "Langsamer, nicht weg",
          body: "„Danke für die Nachricht! Ich bin bis Donnerstag, 5. November, auf Dienstreise und lese E-Mails seltener als sonst. Ich melde mich, wenn ich zurück bin. Wenn es nicht warten kann, hilft Ana Lima weiter.“",
        },
        {
          title: "Elternzeit",
          detail: "Lange Abwesenheit",
          body: "„Vielen Dank für Ihre Nachricht. Ich bin bis zum 2. Februar in Elternzeit und lese in dieser Zeit keine E-Mails. Bei Fragen zu meinen Projekten wenden Sie sich bitte an Ana Lima (ana@example.com), die mich vertritt.“ Nenn bei einer langen Abwesenheit eine Person, nicht nur ein Datum.",
        },
        {
          title: "Feiertag",
          detail: "Für das ganze Team",
          body: "„Vielen Dank für Ihre Nachricht. Unser Büro ist wegen des Feiertags bis Dienstag, 3. November, geschlossen. Wir antworten Ihnen, sobald wir wieder da sind.“",
        },
        {
          title: "Die kurze Version",
          detail: "Für Kolleginnen und Kollegen",
          body: "„Ich bin bis 3. November im Urlaub. Dringend? Bitte an Ana Lima wenden.“ Innerhalb der eigenen Firma ist kürzer meist besser.",
        },
      ],
    },
    {
      title: "Abwesenheitsnotiz in Outlook einrichten",
      body: [
        "Im neuen Outlook und in Outlook im Web öffnest du die Einstellungen (das Zahnrad), gehst zu Konten und dann zu Automatische Antworten. Schalte die automatischen Antworten ein, setz das Häkchen, dass sie nur in einem bestimmten Zeitraum gesendet werden, wähle Start- und Enddatum und füge deinen Text ein. Für Personen außerhalb deiner Organisation kannst du einen eigenen Text schreiben, was sinnvoll ist: Kolleginnen und Kollegen brauchen weniger Erklärung als Kundschaft.",
        "Im klassischen Outlook für Windows gehst du auf Datei und dann auf Automatische Antworten und trägst dieselben Angaben ein. Wenn du ein Enddatum setzt, schaltet Outlook die Antworten von selbst ab, du musst also nicht daran denken.",
      ],
    },
    {
      title: "Abwesenheitsnotiz in Gmail einrichten",
      body: [
        "Klick in Gmail auf das Zahnrad und dann auf Alle Einstellungen aufrufen. Scroll auf dem Tab Allgemein nach unten zu Abwesenheitsnotiz, schalte sie ein, wähle den ersten und letzten Tag, gib einen Betreff ein wie „Abwesend bis 3. November“, füge deinen Text ein und klick unten auf Änderungen speichern.",
        "Gmail schickt die automatische Antwort jeder Person nur einmal innerhalb von vier Tagen, nicht auf jede Nachricht, wer also zweimal schreibt, bekommt sie nicht doppelt. Du kannst sie auch nur an deine Kontakte schicken lassen oder, bei einem Arbeitskonto, nur an Personen in deiner Organisation.",
      ],
    },
    {
      title: "Abwesenheit in Slack und Microsoft Teams",
      body: [
        "Team-Chats verschicken keine automatischen Antworten, deshalb übernimmt ein Status die Aufgabe: Er steht neben deinem Namen, überall, wo dir jemand schreiben will. Klick in Slack auf dein Profilbild, wähle Status aktualisieren, füge ein Emoji und eine kurze Zeile wie „🌴 Im Urlaub bis 3. Nov.“ hinzu und lass ihn löschen, wenn du zurück bist. Wenn du für dieselben Tage die Benachrichtigungen pausierst, bleibt auch dein Handy still.",
        "Klick in Microsoft Teams auf dein Profilbild und wähle Statusmeldung festlegen. Gib deine Nachricht ein und lege fest, wann sie gelöscht werden soll. Im selben Dialog gibt es einen Link, um eine Abwesenheit zu planen; damit schaltest du deine Outlook-Antwort und deinen Teams-Status zusammen ein. Der Status aus dem Generator oben ist für beides kurz genug.",
      ],
    },
    {
      title: "Was in eine gute Abwesenheitsnotiz gehört",
      items: [
        { title: "Wann du zurück bist", body: "Ein Datum, nicht „nächste Woche“. Wenn du es noch nicht weißt, schreib, dass du dich meldest, sobald du zurück bist." },
        { title: "Wer helfen kann", body: "Ein Name und eine E-Mail, wenn die Person nicht im Gespräch ist. Frag sie vorher; niemand erfährt gern von der Kundschaft, dass er gerade vertritt." },
        { title: "Nicht zu viele Details", body: "„Nicht im Büro“ reicht. Wo du bist und warum, geht niemanden etwas an, und ein Urlaubsziel in einer automatischen Antwort verrät Fremden, dass deine Wohnung leer steht." },
        { title: "Keine Versprechen, die du nicht hältst", body: "„Ich melde mich nach meiner Rückkehr“ ist in Ordnung. „Ich beantworte jede E-Mail“ nach zwei Wochen Urlaub stimmt meistens nicht." },
        { title: "Wieder ausschalten", body: "Setz in Outlook oder Gmail ein Enddatum und für deinen Chat-Status eine Uhrzeit zum Löschen, damit niemand an deinem ersten Tag zurück liest, dass du weg bist." },
      ],
    },
  ],
  fit: {
    title: "Abwesenheit, direkt im Büro eingebaut",
    body: "In TinyFloor, einem virtuellen Büro für kleine Teams, steht eine Statusnotiz wie „🌴 Im Urlaub bis Montag“ an deinem Namen, damit das Team es weiß, bevor es dich zu erreichen versucht, und sie löscht sich am Tag selbst. Es läuft in einem Browser-Tab, kostenlos für bis zu 3 Personen und 29 $ im Monat für das ganze Team.",
    cta: "Das Demo-Büro ausprobieren",
  },
  faqTitle: "Häufige <em>Fragen.</em>",
  faq: [
    {
      q: "Was sollte in einer Abwesenheitsnotiz stehen?",
      a: "Dass du nicht da bist, wann du zurück bist und an wen man sich in dringenden Fällen wenden kann. Zum Beispiel: „Ich bin bis Montag, 2. November, nicht im Büro. In dringenden Fällen wenden Sie sich bitte an Ana Lima.“",
    },
    {
      q: "Wie richte ich eine Abwesenheitsnotiz in Outlook ein?",
      a: "Im neuen Outlook oder in Outlook im Web: Einstellungen, Konten, Automatische Antworten. Im klassischen Outlook für Windows: Datei, Automatische Antworten. Einschalten, Zeitraum festlegen und Text einfügen.",
    },
    {
      q: "Wie richte ich eine Abwesenheitsnotiz in Gmail ein?",
      a: "Klick auf das Zahnrad, dann auf Alle Einstellungen aufrufen, und schalte auf dem Tab Allgemein die Abwesenheitsnotiz ein. Zeitraum, Betreff und Text eingeben und auf Änderungen speichern klicken.",
    },
    {
      q: "Sollte ich schreiben, warum ich abwesend bin?",
      a: "Nein. „Nicht im Büro“ reicht. Zu schreiben, dass du im Urlaub bist, ist üblich und in Ordnung, aber Details musst du nie nennen, schon gar nicht bei Krankheit.",
    },
    {
      q: "Wie klingt eine förmliche Abwesenheitsnotiz?",
      a: "„Vielen Dank für Ihre Nachricht. Ich bin bis Montag, 2. November, nicht im Büro und beantworte Ihre E-Mail nach meiner Rückkehr. In dringenden Fällen wenden Sie sich bitte an Ana Lima (ana@example.com).“",
    },
    {
      q: "Ist dieser Abwesenheitsnotiz-Generator kostenlos?",
      a: "Ja, und er läuft komplett in deinem Browser: Die Namen, Daten und E-Mail-Adressen, die du eingibst, werden nirgendwohin gesendet. Kopiere den Text in Outlook, Gmail, Slack oder Teams.",
    },
  ],
};

export default de;
