import type { IcebreakersContent } from "@/lib/tools/icebreakers";

/** Idee per "Due verità e una bugia", in italiano, scritte a partire dalla lista inglese. */
const it: IcebreakersContent = {
  groups: [
    {
      key: "skills",
      label: "Abilità",
      title: "Idee per due verità e una bugia sulle abilità",
      when: "Cose che sai o non sai fare. Facili da inventare e difficili da indovinare, perché chiunque potrebbe aver imparato qualsiasi cosa.",
      questions: [
        "So risolvere il cubo di Rubik.",
        "Scrivo senza guardare la tastiera più velocemente di quanto la maggior parte delle persone parli.",
        "So fare il giocoliere con tre palline.",
        "So fischiare con le dita.",
        "Ho imparato da solo a suonare uno strumento con i video online.",
        "So elencare tutte le capitali d'Europa.",
        "Non ho mai imparato ad andare in bicicletta.",
        "So disegnare un ritratto decente in cinque minuti.",
        "So dire \"ciao\" in più di dieci lingue.",
        "So cucinare un piatto alla perfezione e nient'altro.",
        "So fare la verticale.",
        "Una volta ho vinto una gara di ortografia a scuola.",
        "So recitare a memoria la prima pagina di un libro.",
        "Non so nuotare.",
        "Riesco a toccarmi il naso con la lingua.",
        "So lavorare a maglia.",
        "So leggere la musica ma non so suonare niente.",
        "Riesco ad addormentarmi ovunque in meno di un minuto.",
      ],
    },
    {
      key: "experiences",
      label: "Esperienze",
      title: "Idee per due verità e una bugia su cose che hai fatto",
      when: "Piccole storie che sembrano improbabili. Le migliori sono vere, e il team è sicuro che siano la bugia.",
      questions: [
        "Sono stato in diretta in televisione.",
        "Una volta mi sono perso in una città per un giorno intero.",
        "Ho corso una mezza maratona.",
        "Ho incontrato una persona famosa e l'ho riconosciuta solo dopo.",
        "Sono andato a un concerto da solo.",
        "Una volta ho dormito in aeroporto.",
        "Ho visto l'aurora boreale.",
        "Durante una recita scolastica ho dimenticato tutte le battute.",
        "Ho scalato una montagna di oltre 3.000 metri.",
        "Una volta ho vinto un premio a una lotteria a cui non ricordo di aver partecipato.",
        "Sono andato a dorso di cammello.",
        "Sono rimasto bloccato in ascensore per più di un'ora.",
        "Una volta ho mangiato una cosa così piccante che ho dovuto alzarmi da tavola.",
        "Ho montato un mobile senza istruzioni, e regge.",
        "Sono stato a un matrimonio dove non conoscevo nessuno.",
        "Una volta sono stato un anno intero senza comprare vestiti nuovi.",
        "Mi sono esibito su un palco davanti a più di cento persone.",
        "Sono rimasto sveglio per più di 24 ore.",
      ],
    },
    {
      key: "work",
      label: "Lavoro",
      title: "Idee per due verità e una bugia sul lavoro",
      when: "Sui lavori che hai fatto e su come lavori. Ottime per un team nuovo, perché tutti scoprono qualcosa del percorso degli altri.",
      questions: [
        "Il mio primo lavoro è stato in un ristorante.",
        "Una volta ho risposto a tutta l'azienda per sbaglio.",
        "Ho lavorato in tre paesi diversi.",
        "Ho fatto un lavoro in cui dovevo indossare un costume.",
        "Non ho mai trovato un lavoro tramite un annuncio.",
        "Una volta mi sono addormentato durante una riunione.",
        "Ho cambiato completamente carriera almeno una volta.",
        "Il mio primo computer è più vecchio di alcune persone in questa call.",
        "Una volta ho fatto un colloquio di lavoro in macchina.",
        "Ho fatto il turno di notte.",
        "Ho studiato qualcosa che non c'entra niente con il mio lavoro.",
        "Ho fatto una presentazione senza slide perché il portatile si era spento.",
        "Ho lavorato in un'azienda con più di 10.000 persone.",
        "Una volta ho mandato un'email alla persona sbagliata ed è finita meglio del previsto.",
        "Ho lavorato da più di dieci città diverse.",
        "Conservo tutti i quaderni che ho usato al lavoro.",
      ],
    },
    {
      key: "habits",
      label: "Cibo e abitudini",
      title: "Idee per due verità e una bugia su cibo e abitudini",
      when: "Cose di tutti i giorni. Niente in gioco e sorprendentemente difficili da indovinare, quindi ottime per un giro veloce.",
      questions: [
        "Non ho mai bevuto una tazza di caffè.",
        "Faccio la stessa colazione tutti i giorni.",
        "Non mi piace il cioccolato.",
        "Metto il sale sulla frutta.",
        "Mi sveglio prima delle 6 senza sveglia.",
        "Non ho mai visto nemmeno un film di una famosa saga.",
        "Tengo il telefono sempre in silenzioso.",
        "Ho mangiato insetti di proposito.",
        "Non sopporto il rumore di chi mastica una gomma.",
        "Di un libro leggo prima l'ultima pagina.",
        "Ho più di 50 piante.",
        "Non mi sono mai rotto un osso.",
        "Do un nome alle mie piante.",
        "Ho guardato la stessa serie dall'inizio alla fine più di cinque volte.",
        "Dormo con i calzini.",
        "Non sono mai salito sulle montagne russe.",
      ],
    },
  ],
  meta: {
    title: "Due verità e una bugia: 68 idee per il lavoro e i team da remoto",
    description:
      "68 idee per due verità e una bugia al lavoro, su abilità, esperienze, lavori e abitudini, più come giocare in videochiamata o in chat. Estraine una a caso.",
  },
  eyebrow: "Strumento gratuito",
  updated: "Aggiornato il",
  title: "Due verità e una bugia: <em>idee per il lavoro.</em>",
  intro:
    "Due verità e una bugia è il gioco di squadra più semplice che ci sia: ognuno dice tre cose su di sé, e gli altri indovinano quale è inventata. La parte difficile è trovarne di buone su due piedi. Ecco 68 idee da prendere, adattare o trasformare nella tua bugia, e come giocare con un team da remoto.",
  picker: { all: "Tutte", another: "Un'altra idea", copy: "Copia", copied: "Copiata", of: "di" },
  howTo: [
    {
      title: "Come giocare a due verità e una bugia al lavoro",
      items: [
        {
          title: "Dai a tutti un minuto per prepararsi",
          detail: "O mandalo prima",
          body: "Pensare a tre frasi su due piedi è difficile. Chiedi a tutti di scrivere le loro prima della riunione, o dai un minuto e indica le idee di questa pagina.",
        },
        {
          title: "Dire tutte e tre, in qualsiasi ordine",
          detail: "Senza tradirsi",
          body: "Ognuno dice le sue tre frasi. La bugia non dovrebbe essere sempre l'ultima, e le verità funzionano meglio quando sembrano improbabili.",
        },
        {
          title: "Tutti indovinano insieme",
          detail: "Poi la rivelazione",
          body: "In videochiamata, chiedi a tutti di scrivere 1, 2 o 3 nella chat nello stesso momento, così nessuno segue la prima risposta. Poi la persona svela la bugia e racconta la storia dietro una delle verità.",
        },
        {
          title: "Tenere il punteggio, o no",
          detail: "Cinque persone in circa dieci minuti",
          body: "Un punto per ogni risposta giusta, e un punto a chi parla per ogni persona ingannata. Con un team più grande, fate giocare qualcuno a ogni riunione invece di tutti insieme.",
        },
      ],
    },
    {
      title: "Giocare con un team da remoto",
      body: [
        "In call, la chat è tua amica: indovinare tutti insieme rende il gioco giusto e veloce. Chiedi a ciascuno di scrivere le tre frasi nella chat come elenco numerato, così nessuno deve ricordarle mentre ascolta.",
        "Per un team su più fusi orari, giocate nella chat del team, nell'arco di un giorno o di una settimana. Ognuno pubblica le tre frasi in un messaggio con tre reazioni, una per frase; tutti votano quando sono online, e la rivelazione arriva la mattina dopo. È un bel modo per accogliere chi arriva: le sue due verità e una bugia il primo giorno dicono al team più di una presentazione.",
      ],
    },
  ],
  rules: [
    {
      title: "Cosa rende buone le frasi di due verità e una bugia",
      items: [
        {
          title: "Le verità sembrano inventate",
          body: "\"Sono stato in diretta in televisione\" è un'ottima verità perché nessuno ci crede. \"Mi piace la pizza\" rovina il gioco.",
        },
        {
          title: "La bugia sembra vera",
          body: "Scegli qualcosa che avresti potuto fare, dallo stesso tipo di vita delle tue verità. Una bugia troppo esagerata si scopre subito.",
        },
        {
          title: "Niente di privato",
          body: "Resta su abilità, esperienze, lavoro e abitudini. Famiglia, salute, relazioni e soldi non c'entrano con un gioco al lavoro, nemmeno come bugia.",
        },
        {
          title: "Brevi da ricordare",
          body: "Una frase ciascuna. La storia può venire dopo la rivelazione, per chi vuole sentirla.",
        },
      ],
    },
    {
      title: "Come le abbiamo scelte",
      body: [
        "Le abbiamo scritte per team al lavoro e raggruppate per argomento: abilità, esperienze, lavoro, cibo e abitudini. Ognuna potrebbe essere vera per qualcuno, nessuna chiede di condividere qualcosa di privato, e nessuna presuppone molti soldi o viaggi. Usale così come sono, cambia un dettaglio per renderne una vera per te, o tienine una come bugia.",
      ],
    },
  ],
  fit: {
    title: "Giocatelo sul piano",
    body: "TinyFloor è un ufficio virtuale per piccoli team: vedi chi è alla scrivania, ti avvicini per parlare e vi ritrovate in sala riunioni per lo standup, un gioco o entrambi. Funziona in una scheda del browser, gratis fino a 3 persone e 29 $ al mese per tutto il team.",
    cta: "Prova l'ufficio demo",
  },
  faqTitle: "Domande <em>frequenti.</em>",
  faq: [
    {
      q: "Quali sono buone idee per due verità e una bugia al lavoro?",
      a: "Frasi su abilità, esperienze, lavori e abitudini, in cui le verità sorprendono e la bugia sembra credibile: \"Sono stato in diretta in televisione\", \"Il mio primo lavoro è stato in un ristorante\", \"So risolvere il cubo di Rubik\".",
    },
    {
      q: "Come si gioca a due verità e una bugia?",
      a: "Ognuno dice tre frasi su di sé, due vere e una falsa. Gli altri indovinano quale è la bugia, poi chi ha parlato la svela.",
    },
    {
      q: "Come si gioca a due verità e una bugia su Zoom o Teams?",
      a: "Ognuno scrive le sue tre frasi nella chat come elenco numerato, tutti scrivono la loro risposta nello stesso momento, poi si svela. Cinque persone richiedono circa dieci minuti.",
    },
    {
      q: "Cosa evitare in due verità e una bugia al lavoro?",
      a: "Tutto ciò che riguarda famiglia, relazioni, salute o soldi, e qualsiasi cosa che qualcuno potrebbe non voler condividere. Resta su abilità, esperienze, lavoro e abitudini quotidiane.",
    },
    {
      q: "Quanto dura due verità e una bugia?",
      a: "Circa due minuti a persona, quindi dieci minuti per cinque persone. Con un team più grande, fate giocare qualcuno a ogni riunione, o giocate nella chat del team nell'arco di una settimana.",
    },
  ],
};

export default it;
