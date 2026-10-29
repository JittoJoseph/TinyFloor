import type { TimeZonesContent } from "@/lib/tools/time-zones";

const fr: TimeZonesContent = {
  meta: {
    title: "Planificateur de réunions par fuseau horaire pour équipes à distance",
    description:
      "Ajoutez la ville et les horaires de chaque membre de l’équipe pour voir quand tout le monde travaille en même temps, ou l’heure qui convient au plus grand nombre quand aucune ne convient à tous. Tient compte de l’heure d’été et des demi-heures, comme en Inde.",
  },
  eyebrow: "Outils gratuits",
  updated: "Mis à jour le",
  title: "Quand les horaires de votre équipe <em>se recoupent.</em>",
  intro:
    "Ajoutez la ville et les horaires de travail de chaque personne. Le planificateur montre les heures où tout le monde travaille en même temps, dans l’heure de chacun, et, quand aucune heure ne convient à tous, celle qui convient au plus grand nombre. Il utilise les décalages d’aujourd’hui : l’heure d’été est donc prise en compte.",
  planner: {
    zone: "Fuseau horaire",
    hours: "Horaires de travail",
    remove: "Retirer",
    add: "Ajouter une personne",
    addMine: "Ajouter mon fuseau",
    timesIn: "Heures à {city}",
    working: "Au travail",
    all: "Tout le monde",
    everyone: "Tout le monde travaille de {from} à {to}, heure de {city}.",
    best: "Aucune heure ne convient à tous. De {from} à {to}, heure de {city}, convient à {count} sur {total}.",
    nobody: "Les horaires de travail ne se recoupent pas.",
    eachLocal: "Dans l’heure de chacun :",
  },
  sections: [
    {
      title: "De combien de temps commun une équipe a besoin",
      body: [
        "Moins qu’on ne croit. Deux à quatre heures communes par jour suffisent pour un point quotidien, pour les questions plus rapides à poser qu’à écrire et pour une réunion quand il en faut une. Le reste peut se faire par écrit, dans les horaires de chacun.",
        "Ce qui fait mal, c’est de n’avoir aucune heure commune, ou d’en avoir seulement parce que quelqu’un travaille à 7 h ou à 22 h tous les jours. Si le planificateur montre un créneau commun seulement au bord de la journée de quelqu’un, c’est cette personne qui paie pour les réunions de l’équipe.",
      ],
    },
    {
      title: "Trouver une heure de réunion équitable",
      items: [
        {
          title: "Se réunir dans les heures communes",
          body: "Placez le point quotidien et les réunions récurrentes dans le créneau que montre le planificateur, et gardez le reste des heures communes libre pour les questions rapides. Le temps partagé est ce qu’une équipe répartie a de plus rare.",
        },
        {
          title: "Faire tourner le mauvais créneau",
          body: "Quand la seule heure possible est tôt pour les uns et tard pour les autres, alternez semaine après semaine, pour que ce ne soient pas toujours les mêmes qui se connectent le soir.",
        },
        {
          title: "Moins de réunions, et plus courtes",
          body: "Un point quotidien de 15 minutes tient dans presque n’importe quel recoupement ; une réunion d’une heure, en général non. Demandez-vous si une réunion pourrait être une mise à jour écrite avant de lui chercher un créneau.",
        },
        {
          title: "Écrire ce qui a été décidé",
          body: "Qui n’a pas pu venir doit pouvoir se mettre à jour en deux minutes : quelques lignes sur ce qui a été décidé et qui fait quoi, publiées là où l’équipe lit déjà.",
        },
        {
          title: "Afficher ses horaires",
          body: "Indiquez vos horaires de travail dans votre agenda et votre statut, pour que personne n’ait à calculer si c’est le bon moment pour vous poser une question.",
        },
      ],
    },
    {
      title: "Quand il n’y a aucune heure commune",
      items: [
        { title: "Des points quotidiens écrits", body: "Chacun publie ce qu’il a fait, ce qui vient ensuite et ce qui le bloque au début de sa journée. Les autres le lisent au début de la leur." },
        { title: "Deux réunions plus petites", body: "Séparez l’équipe par région pour les réunions en direct, avec une personne présente aux deux, ou des notes partagées, pour faire passer l’essentiel d’un côté à l’autre." },
        { title: "Un passage de relais en fin de journée", body: "Quand le soir de l’un est le matin de l’autre, une courte note en fin de journée laisse le travail avancer pendant que le premier dort." },
        { title: "Une heure commune par semaine", body: "Même une équipe sans recoupement quotidien peut trouver une heure par semaine où chacun fait un petit effort, en faisant tourner qui en fait le plus." },
      ],
    },
    {
      title: "L’heure d’été déplace le recoupement",
      body: [
        "Les horloges changent à des dates différentes selon les pays, donc les heures communes d’une équipe peuvent se décaler d’une heure pendant quelques semaines chaque printemps et chaque automne. Les États-Unis changent le deuxième dimanche de mars et le premier de novembre ; l’Europe le dernier dimanche de mars et d’octobre. L’Australie, la Nouvelle-Zélande et le Chili changent à l’inverse, au cours de leur propre printemps. L’Inde, la Chine, le Japon, le Brésil et le Mexique ne changent pas.",
        "Le planificateur calcule le décalage de chaque ville pour aujourd’hui : revérifiez autour de ces dates si le recoupement de votre équipe est serré.",
      ],
    },
    {
      title: "Comment il calcule",
      body: [
        "Il prend la journée, par demi-heures, dans l’heure de la première personne, calcule l’heure qu’il est pour chacune des autres avec les données de fuseaux horaires de votre navigateur, et compte qui est dans ses horaires de travail. Les demi-heures comptent pour l’Inde, en avance de cinq heures et demie sur l’UTC. Les horaires qui passent minuit, comme de 22 h à 6 h, fonctionnent aussi, et tout se fait dans votre navigateur.",
      ],
    },
  ],
  fit: {
    title: "Tirez parti des heures communes",
    body: "TinyFloor est un bureau virtuel pour les équipes à distance. Pendant les heures que vous partagez, toutes les personnes présentes sont au même étage, et une question, c’est aller jusqu’au bureau de quelqu’un plutôt que de caler un appel. Il est gratuit jusqu’à 3 personnes et coûte 29 $ par mois pour toute l’équipe.",
    cta: "Essayer le bureau de démo",
  },
  faqTitle: "Questions <em>fréquentes.</em>",
  faq: [
    {
      q: "Comment trouver une heure de réunion entre plusieurs fuseaux horaires ?",
      a: "Notez la ville et les horaires de chaque personne, puis cherchez les demi-heures où tout le monde travaille en même temps. Le planificateur ci-dessus le fait pour jusqu’à 12 personnes et montre le résultat dans l’heure de chacune.",
    },
    {
      q: "De combien d’heures communes une équipe à distance a-t-elle besoin ?",
      a: "Deux à quatre heures par jour suffisent à la plupart des équipes : assez pour un point quotidien, des questions rapides et une réunion de temps en temps. Le reste du travail peut se faire par écrit, dans les horaires de chacun.",
    },
    {
      q: "Quelle est une heure de réunion équitable entre fuseaux horaires ?",
      a: "Une heure comprise dans les horaires de tous. S’il n’y en a pas, faites tourner le créneau tôt ou tard semaine après semaine, pour que ce ne soient pas toujours les mêmes qui le prennent.",
    },
    {
      q: "Et si mon équipe n’a aucune heure commune ?",
      a: "Travaillez par écrit : des points quotidiens écrits au début de la journée de chacun, une note de passage de relais à la fin et des réunions en direct séparées par région. La plupart des équipes trouvent quand même une heure commune par semaine.",
    },
    {
      q: "Le planificateur tient-il compte de l’heure d’été ?",
      a: "Oui. Il utilise le décalage de chaque ville pour aujourd’hui, d’après les données de fuseaux horaires de votre navigateur, donc l’heure d’été est prise en compte. Revérifiez fin mars et fin octobre, quand les horloges changent à des dates différentes.",
    },
  ],
};

export default fr;
