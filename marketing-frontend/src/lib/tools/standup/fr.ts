import type { StandupContent } from "@/lib/tools/standup";

/** Le modèle de daily meeting en français, écrit à partir de la page anglaise. */
const fr: StandupContent = {
  meta: {
    title: "Modèle de daily meeting : ordre du jour et stand-up async gratuits",
    description:
      "Créez l'ordre du jour de votre daily meeting, calé sur la taille de l'équipe, ou un modèle de stand-up écrit à poster dans Slack ou Teams. Gratuit, avec un guide.",
  },
  eyebrow: "Outil gratuit",
  updated: "Mis à jour le",
  title: "Modèle de <em>daily meeting.</em>",
  intro:
    "Un bon daily meeting prend environ une minute par personne, et à la fin chacun sait ce qui se passe et qui est bloqué. Choisissez la taille de votre équipe et la façon dont vous vous réunissez, en visio, par écrit ou en parcourant le tableau, et obtenez un ordre du jour minuté, ou un modèle à poster dans le chat de l'équipe.",
  builder: {
    team: "Taille de l'équipe",
    people: "{count} personnes",
    format: "Comment vous vous réunissez",
    formats: { live: "En visio", async: "Par écrit (async)", board: "En parcourant le tableau" },
    questions: "Questions",
    sets: [
      { key: "classic", label: "Classiques", questions: ["Qu'as-tu fait hier ?", "Que vas-tu faire aujourd'hui ?", "Est-ce que quelque chose te bloque ?"] },
      { key: "focus", label: "Priorité", questions: ["Quelle est ta priorité du jour ?", "Qu'est-ce qui pourrait l'empêcher ?", "De qui as-tu besoin ?"] },
      { key: "progress", label: "Avancement", questions: ["Qu'est-ce qui a avancé ?", "Quelle est la suite ?", "Des risques à connaître ?"] },
    ],
    icebreaker: "Commencer par un brise-glace d'une minute",
    minutes: "{count} minutes",
    agenda: "Ordre du jour",
    template: "Modèle à poster",
    copy: "Copier",
    copied: "Copié",
    lines: {
      open: "Ouverture : commencer à l'heure, même s'il manque quelqu'un",
      icebreaker: "Brise-glace : une question rapide, une phrase chacun",
      round: "Tour de table : chacun répond, environ une minute",
      column: "{column} : ce qui bloque, ce qui vient ensuite",
      blockers: "Blocages : décider qui aide, et en parler après",
      close: "Clôture : ce que tout le monde doit savoir",
    },
    columns: ["Bloqué", "En revue", "En cours", "À faire"],
    note: {
      live: "Environ une minute par personne, un peu moins dans une grande équipe, plus une minute pour ouvrir et clore. Quinze minutes au maximum : au-delà, c'est une réunion, pas un daily.",
      async: "Demandez à chacun de poster avant la même heure chaque matin, dans son propre fuseau, de lire les messages des autres et de répondre en fil à tout blocage.",
      board: "Parcourez le tableau de droite à gauche : d'abord ce qui est le plus près d'être terminé, pour que l'équipe finisse avant de commencer autre chose. Cinq minutes plus environ une par personne.",
    },
  },
  sections: [
    {
      title: "À quoi sert un daily meeting",
      body: [
        "Le daily meeting, ou stand-up meeting, est une réunion courte, en général en début de journée, où chaque membre de l'équipe dit sur quoi il travaille et si quelque chose le bloque. Il vient des équipes logicielles agiles, où on l'appelle aussi daily scrum, mais il convient à toute petite équipe dont le travail dépend de celui des autres.",
        "Ce n'est pas un reporting pour le manager. Le but est que l'équipe voie la journée ensemble : qui fait quoi, où deux sujets se croisent, et qui a besoin d'aide. Si un daily débloque quelqu'un, il a servi ; si c'est un tour de récitations que personne n'écoute, non.",
      ],
    },
    {
      title: "Trois façons de le faire",
      items: [
        {
          title: "En visio",
          detail: "Le classique",
          body: "Tout le monde se connecte en même temps et répond à tour de rôle aux trois mêmes questions. Idéal pour les équipes sur des fuseaux proches qui aiment se voir une fois par jour. Comptez environ une minute par personne.",
        },
        {
          title: "Par écrit",
          detail: "Stand-up asynchrone",
          body: "Chacun poste ses réponses dans le chat de l'équipe avant une heure fixe, et lit celles des autres. Idéal pour les équipes réparties sur plusieurs fuseaux, ou déjà chargées en réunions. On perd la conversation, alors prenez l'habitude de répondre à tout blocage.",
        },
        {
          title: "En parcourant le tableau",
          detail: "Le travail d'abord, les personnes ensuite",
          body: "Au lieu de faire le tour des personnes, parcourez le tableau des tâches, colonne par colonne, en partant du travail le plus près d'être terminé. Idéal pour les équipes au tableau chargé, où la question est ce qui bloque plutôt que ce que chacun a fait.",
        },
      ],
    },
    {
      title: "Les trois questions du daily",
      body: [
        "Les trois classiques : qu'as-tu fait hier, que vas-tu faire aujourd'hui, et est-ce que quelque chose te bloque ? Elles marchent, mais elles invitent à énumérer tout ce qu'on a touché. Si vos dailies s'éternisent, essayez une série plus précise :",
      ],
      items: [
        {
          title: "Classiques",
          body: "Qu'as-tu fait hier ? Que vas-tu faire aujourd'hui ? Est-ce que quelque chose te bloque ? Connues de tous, et très bien pour une nouvelle équipe.",
        },
        {
          title: "Priorité",
          body: "Quelle est ta priorité du jour ? Qu'est-ce qui pourrait l'empêcher ? De qui as-tu besoin ? Des réponses plus courtes, et la dernière question transforme les blocages en demandes.",
        },
        {
          title: "Avancement",
          body: "Qu'est-ce qui a avancé ? Quelle est la suite ? Des risques ? Centrées sur le travail plutôt que sur la personne, elles vont bien avec le tableau.",
        },
      ],
    },
    {
      title: "Un ordre du jour de daily, minute par minute",
      body: [
        "Pour une équipe de six en visio, un daily prend environ huit minutes. Commencez à l'heure, même s'il manque quelqu'un : attendre apprend à tout le monde à arriver en retard. Faites ensuite le tour dans un ordre fixe, celui de l'écran ou l'ordre alphabétique, pour que personne ne se demande quand vient son tour.",
        "Quand quelqu'un évoque un problème, ne le résolvez pas pendant le daily. Notez qui peut aider et convenez d'en parler juste après, avec seulement les personnes concernées. Cette seule habitude garde un daily sous les dix minutes. Terminez en demandant s'il y a quelque chose que tout le monde doit savoir, puis raccrochez.",
      ],
      table: {
        head: ["Taille de l'équipe", "En visio", "En parcourant le tableau"],
        rows: [
          ["3 personnes", "5 minutes", "8 minutes"],
          ["6 personnes", "8 minutes", "11 minutes"],
          ["8 personnes", "10 minutes", "13 minutes"],
          ["12 personnes", "11 minutes", "15 minutes"],
          ["15 personnes", "14 minutes", "15 minutes"],
        ],
        note: "Calculé comme dans l'outil ci-dessus : environ une minute par personne (trois quarts de minute au-delà de huit personnes) plus deux pour ouvrir et clore, et jamais plus de quinze.",
      },
    },
    {
      title: "Mener un stand-up asynchrone",
      body: [
        "Un stand-up asynchrone, ce sont les trois mêmes questions, avec des réponses écrites. Choisissez un canal et une heure, par exemple 10 h dans le fuseau de chacun, et demandez à tout le monde de poster ses réponses en un seul message, avec le modèle ci-dessus pour qu'elles se lisent d'un coup d'œil.",
        "Deux choses le font fonctionner. D'abord, lisez les messages des autres : un stand-up asynchrone que personne ne lit, c'est un journal intime. Ensuite, répondez en fil à tout blocage, le jour même. Certaines équipes gardent en plus une courte visio par semaine, pour continuer à se voir.",
      ],
    },
    {
      title: "Les erreurs fréquentes du daily",
      items: [
        { title: "Il tourne à la résolution de problèmes", body: "Quelqu'un soulève un sujet et trois personnes se mettent à le régler. Notez-le, décidez qui en parle après, et passez à la suite." },
        { title: "C'est un compte rendu au manager", body: "Si tout le monde regarde le responsable en parlant, le daily s'adresse à la mauvaise personne. Parlez à l'équipe." },
        { title: "Trop de monde", body: "Au-delà d'une douzaine de personnes, plus personne n'écoute tout le monde. Faites plusieurs petits dailies, par projet ou par flux de travail." },
        { title: "Commencer en retard", body: "Attendre cinq minutes la dernière personne coûte cinq minutes à tous les autres, chaque jour. Commencez à l'heure." },
        { title: "Dire « pas de blocage » tous les jours", body: "Si personne n'est jamais bloqué, posez une question plus précise : « Qu'est-ce qui pourrait empêcher ta priorité du jour ? » trouve en général quelque chose." },
      ],
    },
  ],
  fit: {
    title: "Faites votre daily sur l'étage",
    body: "TinyFloor est un bureau virtuel pour les petites équipes : vous voyez qui est à son poste, et le daily, c'est quelques pas jusqu'à la salle de réunion plutôt qu'un lien de plus. Ensuite, allez voir la personne bloquée. Il fonctionne dans un onglet du navigateur, gratuit jusqu'à 3 personnes et 29 $ par mois pour toute l'équipe.",
    cta: "Essayer le bureau de démo",
  },
  faqTitle: "Questions <em>fréquentes.</em>",
  faq: [
    {
      q: "Quelles sont les trois questions du daily meeting ?",
      a: "Qu'as-tu fait hier ? Que vas-tu faire aujourd'hui ? Est-ce que quelque chose te bloque ? Une version plus précise : Quelle est ta priorité du jour ? Qu'est-ce qui pourrait l'empêcher ? De qui as-tu besoin ?",
    },
    {
      q: "Combien de temps doit durer un daily meeting ?",
      a: "Environ une minute par personne, plus une ou deux minutes pour ouvrir et clore : autour de huit minutes pour une équipe de six. Quinze minutes au maximum.",
    },
    {
      q: "Qu'est-ce qu'un modèle de daily meeting ?",
      a: "Un ordre du jour fixe pour la réunion, ou un format de message pour un stand-up écrit : les trois mêmes questions, dans le même ordre, chaque jour, pour que les points soient rapides à donner et faciles à lire.",
    },
    {
      q: "Qu'est-ce qu'un stand-up asynchrone ?",
      a: "Un daily fait par écrit : chacun poste ses réponses aux trois questions dans le chat de l'équipe avant une heure fixe et lit celles des autres. Il convient aux équipes réparties sur plusieurs fuseaux.",
    },
    {
      q: "Le daily meeting est-il réservé aux équipes Scrum ?",
      a: "Non. Il vient des équipes logicielles agiles, où on l'appelle daily scrum, mais toute petite équipe dont le travail dépend de celui des autres peut l'utiliser.",
    },
    {
      q: "Cet outil de daily meeting est-il gratuit ?",
      a: "Oui, et il fonctionne entièrement dans votre navigateur : rien de ce que vous choisissez n'est envoyé nulle part. Copiez l'ordre du jour ou le modèle dans votre invitation ou le chat de l'équipe.",
    },
  ],
};

export default fr;
