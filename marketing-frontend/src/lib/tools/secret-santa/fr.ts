import type { SantaContent } from "@/lib/tools/secret-santa";

/** The Secret Santa generator in French, written from the English page. */
const fr: SantaContent = {
  meta: {
    title: "Secret Santa : tirage au sort en ligne gratuit, sans e-mail ni inscription",
    description: "Faites le tirage au sort de votre Secret Santa en quelques secondes et envoyez à chacun un lien privé indiquant à qui offrir son cadeau. Gratuit, sans e-mail ni compte, et conçu pour les équipes à distance.",
  },
  eyebrow: "Outil gratuit",
  updated: "Mis à jour",
  title: "Tirage au sort <em>Secret Santa.</em>",
  intro: "Saisissez les noms des participants, lancez le tirage au sort et envoyez à chacun son lien privé : il indique à qui offrir son cadeau, sans révéler les autres choix. Sans e-mail ni compte, idéal pour les équipes réparties dans plusieurs pays. Plus bas : comment organiser un Secret Santa en ligne, les règles du jeu et des idées de cadeaux pour vos collègues.",
  drawer: {
    names: "Noms",
    namesHint: "Un par ligne, au moins trois. Ajoutez-vous si vous participez.",
    budget: "Budget",
    date: "Date de l'échange",
    optional: "(facultatif)",
    draw: "Lancer le tirage au sort",
    redraw: "Refaire le tirage",
    redrawNote: "Refaire le tirage génère de nouveaux liens. Envoyez uniquement les plus récents.",
    tooFew: "Ajoutez au moins trois noms.",
    duplicate: "Deux personnes ont le même nom. Ajoutez une initiale pour que chacun puisse trouver son propre lien.",
    linksTitle: "Liens privés",
    linksNote: "Envoyez à chaque personne son propre lien, dans un message individuel. En l'ouvrant, elle découvrira pour qui elle doit acheter un cadeau.",
    copy: "Copier le lien",
    copied: "Copié",
    copyAll: "Copier tous les liens",
    allIntro: "Secret Santa : ouvrez uniquement le lien qui porte votre nom.",
    revealTitle: "Bonjour {name}, vous êtes le Secret Santa de…",
    show: "Afficher le nom",
    lookAway: "Assurez-vous que personne ne regarde votre écran.",
    budgetLabel: "Budget",
    dateLabel: "Échange",
    keepSecret: "Gardez le secret jusqu'à l'échange.",
    own: "Tirez les noms au sort pour votre groupe",
  },
  sections: [
    {
      title: "Comment organiser un Secret Santa en ligne",
      items: [
        {
          title: "Rassemblez les noms",
          body: "Demandez qui souhaite participer. Au travail, la participation doit être facultative : un Secret Santa imposé n'est amusant pour personne.",
        },
        {
          title: "Fixez un budget et une date",
          body: "Un montant unique, annoncé dès le départ, pour que personne ne dépense trois fois plus que la personne qui lui fait un cadeau. La date est celle de l'ouverture des cadeaux.",
        },
        {
          title: "Tirez les noms au sort",
          body: "Saisissez les noms ci-dessus et lancez le tirage. Tout le monde se voit attribuer quelqu'un, et personne ne se pioche soi-même.",
        },
        {
          title: "Envoyer les liens",
          body: "Envoyez à chaque personne son propre lien par message privé ou par e-mail. L'organisateur peut aussi participer : vous voyez les liens, mais pas qui a tiré qui au sort.",
        },
        {
          title: "Ouvrir les cadeaux ensemble",
          body: "En visioconférence ou lors de la fête, chacun son tour, pendant que tout le monde essaie de deviner qui était son Secret Santa.",
        },
      ],
    },
    {
      title: "Secret Santa avec une équipe à distance",
      body: [
        "Quand l'équipe travaille dans des villes ou des pays différents, les cadeaux doivent voyager. La solution la plus simple est d'offrir des cadeaux numériques : une carte cadeau, un livre numérique, un mois d'abonnement à un service de streaming ou un don au nom de la personne. Si les participants préfèrent envoyer un vrai cadeau, l'organisateur peut collecter les adresses postales de manière confidentielle et ne transmettre chacune qu'à la personne qui en a besoin, ou chacun peut commander sur un site qui livre dans le pays concerné.",
        "Ouvrez les cadeaux ensemble lors d'un appel, idéalement dans le cadre d'une fête de fin d'année. Nos [idées de fête de fin d'année virtuelle](/guides/virtual-holiday-party-ideas) proposent un programme et des jeux pour l'accompagner.",
      ],
    },
    {
      title: "Les règles du Secret Santa",
      items: [
        {
          title: "Respecter le budget",
          body: "Dépenser moins ne pose pas de problème, mais dépasser le budget est délicat. C'est tout l'intérêt du budget : un petit cadeau, choisi avec soin.",
        },
        {
          title: "Garder le secret",
          body: "Ne dites à personne qui vous avez tiré au sort avant l'ouverture des cadeaux, et ne demandez pas aux autres qui ils ont tiré.",
        },
        { title: "Restez adapté au cadre professionnel", body: "Rien de personnel, rien qui puisse embarrasser quelqu'un devant ses collègues." },
        {
          title: "Partagez un souhait",
          body: "Si chacun ajoute un court souhait sur le chat de l'équipe, comme « J'aimerais un bon livre », personne n'aura à deviner.",
        },
        { title: "Rendez-le facultatif", body: "Certaines personnes ne fêtent pas Noël, ou n'en ont pas envie. Elles restent les bienvenues à la fête." },
      ],
    },
    {
      title: "Idées de cadeaux de Secret Santa pour des collègues",
      body: [
        "Des idées faciles à transporter et adaptées à la plupart des budgets :",
      ],
      items: [
        { title: "Du café ou du thé", detail: "Moins de 20 €", body: "Un sachet d'un bon torréfacteur local, ou un assortiment de thés." },
        { title: "Un livre", detail: "Moins de 20 €", body: "Quelque chose que vous avez aimé cette année, avec un petit mot pour expliquer pourquoi." },
        { title: "Une plante de bureau", detail: "Moins de 25 €", body: "Petite, facile à entretenir et agréable à regarder pendant les appels." },
        {
          title: "Une carte-cadeau",
          detail: "Quel que soit le budget",
          body: "Pour une librairie, un café ou un service de livraison de repas près de chez eux.",
        },
        { title: "Un joli carnet", detail: "Moins de 20 €", body: "Utile pour tous ceux qui aiment encore écrire sur papier." },
        {
          title: "Un mois d'abonnement à quelque chose",
          detail: "Moins de 15 €",
          body: "Un abonnement de musique, de livre audio ou de streaming, envoyé sous forme de code cadeau.",
        },
        { title: "Un puzzle ou un jeu", detail: "Moins de 25 €", body: "Quelque chose pour les soirées, ou pour toute la famille." },
        {
          title: "Quelque chose de votre ville",
          detail: "Moins de 20 €",
          body: "Des douceurs locales ou une spécialité de chez vous. Les équipes à distance adorent ça.",
        },
      ],
    },
  ],
  fit: {
    title: "Ouvrir les cadeaux ensemble",
    body: "TinyFloor est un bureau virtuel pour les petites équipes. Ouvrez les cadeaux dans la salle de réunion avec la vidéo et le partage d'écran, puis restez discuter à vos bureaux, comme lors d'une vraie fête. C'est gratuit jusqu'à 3 personnes et 29 $ par mois pour toute l'équipe.",
    cta: "Essayer le bureau de démo",
  },
  faqTitle: "Questions <em>fréquentes.</em>",
  faq: [
    {
      q: "Comment fonctionne ce générateur de Secret Santa ?",
      a: "Saisissez les noms, effectuez le tirage au sort et envoyez à chaque personne le lien associé à son nom. En l'ouvrant, elle découvrira à qui elle doit offrir un cadeau, ainsi que le budget et la date si vous les avez définis.",
    },
    {
      q: "Les participants ont-ils besoin d'une adresse e-mail ou d'un compte ?",
      a: "Non. Il n'y a pas d'inscription et rien n'est envoyé par e-mail : vous envoyez vous-même les liens, dans une messagerie, par e-mail ou par SMS.",
    },
    {
      q: "L'organisateur peut-il participer ?",
      a: "Oui. L'organisateur voit les liens, mais pas qui a tiré qui. Ajoutez votre propre nom et n'ouvrez que votre lien.",
    },
    {
      q: "Quelqu'un peut-il tirer son propre nom ?",
      a: "Non. Chaque personne se voit attribuer quelqu'un d'autre, et chaque personne est attribuée à un seul Secret Santa.",
    },
    {
      q: "Comment organiser un Secret Santa avec une équipe à distance ?",
      a: "Tirez les noms au sort en ligne, envoyez à chacun un lien privé, convenez d'un budget et choisissez des cadeaux numériques ou collectez les adresses en privé. Ouvrez ensuite les cadeaux ensemble lors d'un appel vidéo.",
    },
    {
      q: "Quel est le bon budget pour un Secret Santa au travail ?",
      a: "Un montant que tout le monde peut dépenser sans y penser, souvent de 15 à 30 €. Indiquez un montant précis dans l'invitation pour que les cadeaux soient équitables.",
    },
    {
      q: "Ce générateur de Secret Santa est-il gratuit ?",
      a: "Oui, sans limite de participants. Il fonctionne dans votre navigateur, et les noms ne circulent que dans les liens que vous envoyez.",
    },
  ],
};

export default fr;
