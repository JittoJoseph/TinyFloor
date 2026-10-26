import type { SantaContent } from "@/lib/tools/secret-santa";

/** The Secret Santa generator in German, written from the English page. */
const de: SantaContent = {
  meta: {
    title: "Wichteln online: kostenlose Auslosung ohne E-Mail und Anmeldung",
    description: "Lose die Namen fürs Wichteln in Sekunden aus und schicke allen einen privaten Link, der zeigt, wen sie beschenken. Kostenlos, ohne E-Mail oder Anmeldung, und gemacht für Teams, die remote arbeiten.",
  },
  eyebrow: "Kostenloses Tool",
  updated: "Aktualisiert am",
  title: "Wichteln <em>online.</em>",
  intro: "Trage die Namen aller Personen ein, lose aus und schicke jedem einen eigenen privaten Link: Er zeigt, wen die Person beschenkt, und niemand sonst erfährt es. Ohne E-Mail, ohne Anmeldung und perfekt für Teams, die über verschiedene Länder verteilt sind. Darunter: wie Wichteln (oder Secret Santa) online funktioniert, die Regeln und Geschenkideen für Kollegen.",
  drawer: {
    names: "Namen",
    namesHint: "Einer pro Zeile, mindestens drei. Trage dich selbst ein, wenn du mitmachst.",
    budget: "Budget",
    date: "Wichteltermin",
    optional: "(optional)",
    draw: "Namen auslosen",
    redraw: "Neu auslosen",
    redrawNote: "Eine erneute Auslosung erstellt neue Links. Sende nur die neuesten.",
    tooFew: "Füge mindestens drei Namen hinzu.",
    duplicate: "Zwei Personen haben denselben Namen. Füge einen Anfangsbuchstaben hinzu, damit alle ihren eigenen Link finden.",
    linksTitle: "Private Links",
    linksNote: "Sende jeder Person ihren eigenen Link in einer privaten Nachricht. Das Öffnen zeigt, wen sie beschenken.",
    copy: "Link kopieren",
    copied: "Kopiert",
    copyAll: "Alle Links kopieren",
    allIntro: "Wichteln: Öffne nur den Link mit deinem Namen.",
    revealTitle: "Hallo {name}, du wichtelst für…",
    show: "Namen anzeigen",
    lookAway: "Stell sicher, dass niemand auf deinen Bildschirm schaut.",
    budgetLabel: "Budget",
    dateLabel: "Bescherung",
    keepSecret: "Halt es bis zur Bescherung geheim.",
    own: "Namen für die eigene Gruppe auslosen",
  },
  sections: [
    {
      title: "Wie Wichteln online funktioniert",
      items: [
        {
          title: "Namen sammeln",
          body: "Frag nach, wer mitmachen möchte. Die Teilnahme bei der Arbeit sollte freiwillig sein: Ein Wichteln, zu dem man gedrängt wird, macht niemandem Spaß.",
        },
        {
          title: "Leg ein Budget und ein Datum fest",
          body: "Ein Betrag, der im Voraus festgelegt wird, damit niemand dreimal so viel ausgibt wie die Person, die für einen selbst einkauft. Das Datum ist der Tag, an dem die Geschenke geöffnet werden.",
        },
        { title: "Namen auslosen", body: "Trag die Namen oben ein und lose aus. Jeder bekommt jemanden zugelost und niemand zieht sich selbst." },
        {
          title: "Verschicke die Links",
          body: "Schicke jeder Person ihren eigenen Link per Direktnachricht oder E-Mail. Wer organisiert, kann auch mitmachen: Du siehst zwar die Links, aber nicht, wer wen gezogen hat.",
        },
        { title: "Die Geschenke gemeinsam auspacken", body: "In einem Video-Call oder auf der Party, nacheinander, während alle raten, wer ihr Wichtel war." },
      ],
    },
    {
      title: "Wichteln im Remote-Team",
      body: [
        "Wenn das Team in verschiedenen Städten oder Ländern arbeitet, müssen die Geschenke reisen. Am einfachsten sind digitale Geschenke: ein Gutschein, ein E-Book, ein Monat für einen Streaming-Dienst oder eine Spende im Namen der Person. Wenn alle lieber etwas Echtes verschicken möchten, kann die organisierende Person die Privatadressen vertraulich sammeln und sie nur an die Person weitergeben, die sie benötigt. Alternativ können alle in einem Shop bestellen, der im jeweiligen Land liefert.",
        "Packt die Geschenke gemeinsam in einem Call aus, am besten im Rahmen einer Jahresabschlussfeier. Unsere [Ideen für virtuelle Weihnachtsfeiern](/guides/virtual-holiday-party-ideas) bieten einen Ablaufplan und passende Spiele dazu.",
      ],
    },
    {
      title: "Regeln fürs Wichteln",
      items: [
        {
          title: "Halte dich ans Budget",
          body: "Weniger ist völlig in Ordnung, mehr ist unangenehm. Das Budget ist der Sinn der Sache: ein kleines Geschenk, mit Sorgfalt ausgewählt.",
        },
        {
          title: "Behalte es für dich",
          body: "Verrate niemandem, wen du gezogen hast, bis die Geschenke ausgepackt sind, und frage auch die anderen nicht, wen sie gezogen haben.",
        },
        { title: "Es bürotauglich halten", body: "Nichts zu Persönliches, nichts, was jemanden vor den Kollegen in Verlegenheit bringen könnte." },
        {
          title: "Einen Wunsch äußern",
          body: "Wenn alle einen kurzen Wunsch im Team-Chat teilen, wie „Ich würde mich über ein gutes Buch freuen“, muss niemand raten.",
        },
        { title: "Die Teilnahme freiwillig halten", body: "Manche feiern nicht oder möchten nicht mitmachen. Auf der Party sind sie trotzdem willkommen." },
      ],
    },
    {
      title: "Wichtel-Geschenkideen für Kollegen",
      body: [
        "Ideen, die sich gut transportieren lassen und für fast jedes Budget passen:",
      ],
      items: [
        { title: "Kaffee oder Tee", detail: "Unter 15 €", body: "Eine Packung Kaffee aus einer guten lokalen Rösterei oder eine Tee-Auswahl." },
        { title: "Ein Buch", detail: "Unter 20 €", body: "Etwas, das du dieses Jahr geliebt hast, mit einer Notiz, warum." },
        { title: "Eine Schreibtischpflanze", detail: "Unter 25 €", body: "Klein, pflegeleicht und schön anzusehen bei Videoanrufen." },
        { title: "Ein Gutschein", detail: "Jedes Budget", body: "Für eine Buchhandlung, eine Café-Kette oder einen Lieferdienst an ihrem Wohnort." },
        { title: "Ein schönes Notizbuch", detail: "Unter 20 €", body: "Nützlich für alle, die noch Dinge aufschreiben." },
        { title: "Ein Monatsabo für etwas", detail: "Unter 15 €", body: "Ein Musik-, Hörbuch- oder Streaming-Abo, verschickt als Gutscheincode." },
        { title: "Ein Puzzle oder ein Spiel", detail: "Unter 25 €", body: "Etwas für die Abende oder für die ganze Familie." },
        {
          title: "Etwas aus deiner Stadt",
          detail: "Unter 20 €",
          body: "Lokale Süßigkeiten oder eine Kleinigkeit, die es nur bei dir gibt. Remote-Teams lieben so etwas.",
        },
      ],
    },
  ],
  fit: {
    title: "Die Geschenke gemeinsam auspacken",
    body: "TinyFloor ist ein virtuelles Büro für kleine Teams. Packt die Geschenke im Meetingraum mit Video und Bildschirmfreigabe aus und bleibt danach noch an euren Schreibtischen, um euch zu unterhalten, wie bei einer echten Feier. Es ist kostenlos für bis zu 3 Personen und 29 $ im Monat für das ganze Team.",
    cta: "Das Demo-Büro ausprobieren",
  },
  faqTitle: "Häufige <em>Fragen.</em>",
  faq: [
    {
      q: "Wie funktioniert dieser Wichtel-Generator (Secret Santa)?",
      a: "Trag die Namen ein, starte die Auslosung und schicke jeder Person den Link mit ihrem Namen. Wer den Link öffnet, sieht, wer beschenkt werden soll, sowie das Budget und das Datum, falls du welche festgelegt hast.",
    },
    {
      q: "Braucht man dafür eine E-Mail-Adresse oder ein Konto?",
      a: "Nein. Es ist keine Anmeldung nötig und es werden keine E-Mails verschickt. Du verschickst die Links selbst, zum Beispiel im Chat, per E-Mail oder als Messenger-Nachricht.",
    },
    {
      q: "Kann der Organisator selbst mitmachen?",
      a: "Ja. Der Organisator sieht zwar die Links, aber nicht, wer wen gezogen hat. Trag also einfach deinen eigenen Namen ein und öffne nur deinen eigenen Link.",
    },
    { q: "Kann man sich selbst ziehen?", a: "Nein. Jede Person bekommt jemand anderen zugewiesen, und jede Person hat genau einen Wichtel." },
    {
      q: "Wie funktioniert Wichteln in einem Remote-Team?",
      a: "Lose die Namen online aus, schicke allen einen privaten Link, einigt euch auf ein Budget und wählt digitale Geschenke oder sammelt die Adressen privat. Öffnet die Geschenke dann gemeinsam in einem Video-Call.",
    },
    {
      q: "Was ist ein gutes Budget fürs Wichteln im Team?",
      a: "Ein Betrag, den sich alle ohne langes Nachdenken leisten können, oft 15 bis 30 €. Nenne in der Einladung eine feste Summe, damit die Geschenke gleichwertig sind.",
    },
    {
      q: "Ist dieser Wichtel-Generator kostenlos?",
      a: "Ja, ohne Begrenzung der Teilnehmerzahl. Er läuft in deinem Browser und die Namen werden nur in den Links übertragen, die du verschickst.",
    },
  ],
};

export default de;
