import type { OooContent } from "@/lib/tools/out-of-office";

/** Le générateur de message d'absence en français, écrit à partir de la page anglaise. */
const fr: OooContent = {
  meta: {
    title: "Générateur de message d'absence : modèles et exemples gratuits",
    description:
      "Rédigez votre message d'absence en quelques secondes : réponse automatique par e-mail et statut Slack ou Teams, pour congés, maladie ou déplacement. Avec exemples.",
  },
  eyebrow: "Outil gratuit",
  updated: "Mis à jour le",
  title: "Générateur de <em>message d'absence.</em>",
  intro:
    "Indiquez pourquoi vous êtes absent, quand vous revenez et qui peut aider entre-temps, et obtenez une réponse automatique par e-mail et un court statut pour le chat de l'équipe, prêts à coller. Plus bas : des exemples pour chaque situation, et comment l'activer dans Outlook, Gmail, Slack et Teams.",
  writer: {
    reason: "Motif de l'absence",
    reasons: { vacation: "Congés", sick: "Maladie", travel: "Déplacement", parental: "Congé parental", holiday: "Jour férié" },
    back: "De retour le",
    unknown: "Laissez vide si vous ne savez pas encore.",
    name: "Votre nom",
    contact: "Personne à contacter",
    email: "Son e-mail",
    optional: "(facultatif)",
    tone: "Ton",
    tones: { professional: "Professionnel", friendly: "Chaleureux", short: "Court" },
    emailTitle: "Réponse automatique par e-mail",
    statusTitle: "Statut pour Slack, Teams ou TinyFloor",
    statusNote: "100 caractères au maximum, pour tenir dans un statut Slack.",
    copy: "Copier",
    copied: "Copié",
  },
  sections: [
    {
      title: "Exemples de messages d'absence",
      body: [
        "Tout bon message d'absence dit trois choses : que vous êtes absent, quand vous serez de retour, et qui contacter si ça ne peut pas attendre. Voici ce que ça donne dans les situations les plus courantes ; le générateur ci-dessus écrit la même chose avec vos dates et vos noms.",
      ],
      items: [
        {
          title: "Congés",
          detail: "Congés annuels",
          body: "« Bonjour, merci pour votre message. Je suis actuellement en congés et serai de retour le lundi 2 novembre. Je vous répondrai à mon retour. Pour toute urgence, vous pouvez contacter Ana Lima (ana@example.com). »",
        },
        {
          title: "Maladie",
          detail: "Court et discret",
          body: "« Bonjour, merci pour votre message. Je suis absent aujourd'hui et vous répondrai dès mon retour. Pour toute urgence, vous pouvez contacter Ana Lima. » Préciser que vous êtes malade est facultatif ; vous ne devez les détails à personne.",
        },
        {
          title: "Déplacement ou salon",
          detail: "Plus lent, pas absent",
          body: "« Merci pour votre message ! Je suis en déplacement professionnel jusqu'au jeudi 5 novembre et je consulte mes e-mails moins souvent que d'habitude. Je reviens vers vous à mon retour. Si ça ne peut pas attendre, Ana Lima peut vous aider. »",
        },
        {
          title: "Congé parental",
          detail: "Longue absence",
          body: "« Bonjour, merci pour votre message. Je suis en congé parental jusqu'au 2 février et ne consulte pas mes e-mails. Pour toute question sur mes projets, vous pouvez contacter Ana Lima (ana@example.com), qui assure le relais. » Pour une longue absence, donnez un nom, pas seulement une date.",
        },
        {
          title: "Jour férié",
          detail: "Pour toute l'équipe",
          body: "« Bonjour, merci pour votre message. Nos bureaux sont fermés pour le jour férié et rouvrent le mardi 3 novembre. Nous vous répondrons à notre retour. »",
        },
        {
          title: "La version courte",
          detail: "Pour les collègues",
          body: "« En congés, de retour le 3 novembre. Urgent ? Contactez Ana Lima. » Au sein de votre entreprise, plus c'est court, mieux c'est.",
        },
        {
          title: "Noël et Nouvel An",
          detail: "Congés de fin d'année",
          body: "« Bonjour, merci pour votre message. Je suis actuellement absent pour les fêtes de fin d'année et serai de retour le lundi 4 janvier. Je vous répondrai à mon retour. Pour toute urgence, vous pouvez contacter Ana Lima (ana@example.com). Je vous souhaite une très bonne année. »",
        },
        {
          title: "Demi-journée",
          detail: "Retour le jour même",
          body: "« Merci pour votre message. Je suis absent cet après-midi et vous répondrai demain matin. » Pour une absence de quelques heures, un simple statut de messagerie suffit souvent.",
        },
        {
          title: "Pour les clients",
          detail: "En dehors de l'entreprise",
          body: "« Bonjour, merci de nous avoir contactés. Je suis absent jusqu'au lundi 2 novembre. Pour toute commande ou demande d'assistance, merci d'écrire à support@example.com, où notre équipe vous répondra sous un jour ouvré. » Outlook peut envoyer ce message uniquement aux personnes extérieures à votre organisation.",
        },
        {
          title: "Dernier jour dans l'entreprise",
          detail: "Départ définitif",
          body: "« Bonjour, merci pour votre message. J'ai quitté l'entreprise Example Ltd. Pour toute question concernant mes dossiers, vous pouvez contacter Ana Lima (ana@example.com), qui assure le relais. » Les entreprises maintiennent généralement ce type de réponse sur l'adresse d'un collaborateur parti pendant quelques mois.",
        },
      ],
    },
    {
      title: "Configurer un message d'absence dans Outlook",
      body: [
        "Dans le nouvel Outlook et Outlook sur le web, ouvrez les Paramètres (l'engrenage), allez dans Compte, puis Réponses automatiques. Activez les réponses automatiques, cochez l'option pour ne les envoyer que pendant une période donnée, choisissez les dates de début et de fin, et collez votre message. Vous pouvez écrire un message différent pour les personnes extérieures à votre organisation, ce qui est une bonne idée : vos collègues ont besoin de moins d'explications que vos clients.",
        "Dans Outlook classique pour Windows, allez dans Fichier, puis Réponses automatiques, et remplissez les mêmes informations. Si vous avez fixé une date de fin, Outlook désactive les réponses tout seul, vous n'avez donc pas à y penser.",
        "Dans Outlook pour Mac, allez dans Outils, puis Réponses automatiques. Dans l'application Outlook sur iPhone ou Android, appuyez sur votre photo de profil, puis sur l'engrenage des Paramètres, choisissez votre compte professionnel et appuyez sur Réponses automatiques. Quelle que soit la méthode utilisée, la réponse est enregistrée sur votre compte : l'activer à un endroit l'active donc partout.",
      ],
    },
    {
      title: "Configurer un message d'absence dans Gmail",
      body: [
        "Dans Gmail, cliquez sur l'engrenage, puis sur Voir tous les paramètres. Dans l'onglet Général, descendez jusqu'à Réponse automatique, activez-la, choisissez le premier et le dernier jour, ajoutez un objet comme « Absent jusqu'au 3 novembre », collez votre message et cliquez sur Enregistrer les modifications en bas de la page.",
        "Gmail envoie la réponse automatique une seule fois par personne sur une période de quatre jours, pas à chaque message : quelqu'un qui écrit deux fois ne la reçoit pas deux fois. Vous pouvez aussi ne l'envoyer qu'à vos contacts, ou seulement aux membres de votre organisation sur un compte professionnel.",
      ],
    },
    {
      title: "Message d'absence dans Slack et Microsoft Teams",
      body: [
        "Les outils de chat n'envoient pas de réponses automatiques, c'est donc un statut qui fait le travail : il s'affiche à côté de votre nom partout où l'on essaie de vous écrire. Dans Slack, cliquez sur votre photo de profil, choisissez Mettre à jour votre statut, ajoutez un emoji et une courte ligne comme « 🌴 En congés jusqu'au 3 nov. », et réglez-le pour qu'il s'efface à votre retour. Suspendre les notifications sur les mêmes dates garde aussi votre téléphone silencieux.",
        "Dans Microsoft Teams, cliquez sur votre photo de profil et choisissez Définir un message d'état. Tapez votre message et indiquez quand il doit s'effacer. La même fenêtre propose un lien pour planifier une absence, qui active à la fois votre réponse automatique Outlook et votre statut Teams. Le statut du générateur ci-dessus est assez court pour les deux.",
      ],
    },
    {
      title: "Ce que contient un bon message d'absence",
      items: [
        { title: "Votre date de retour", body: "Une date, pas « la semaine prochaine ». Si vous ne la connaissez pas encore, dites que vous répondrez dès votre retour." },
        { title: "Qui peut aider", body: "Un nom, et un e-mail si la personne n'est pas dans la conversation. Prévenez-la d'abord : personne n'aime apprendre par un client qu'il assure le relais." },
        { title: "Pas trop de détails", body: "« Absent du bureau » suffit. Où vous êtes et pourquoi ne regarde personne, et une destination de vacances dans une réponse automatique indique à des inconnus que votre logement est vide." },
        { title: "Pas de promesses intenables", body: "« Je vous répondrai à mon retour » convient. « Je répondrai à chaque e-mail » après deux semaines d'absence est rarement vrai." },
        { title: "Pensez à le désactiver", body: "Fixez une date de fin dans Outlook ou Gmail, et une heure d'effacement pour votre statut, pour qu'on n'annonce pas votre absence le jour de votre retour." },
      ],
    },
  ],
  fit: {
    title: "Les absences, intégrées au bureau",
    body: "Dans TinyFloor, un bureau virtuel pour les équipes à distance, une note de statut comme « 🌴 En congés jusqu'à lundi » s'affiche sur votre nom, pour que l'équipe le sache avant d'essayer de vous joindre, et elle s'efface toute seule le jour venu. Il fonctionne dans un onglet du navigateur, gratuit jusqu'à 3 personnes et 29 $ par mois pour toute l'équipe.",
    cta: "Essayer le bureau de démo",
  },
  faqTitle: "Questions <em>fréquentes.</em>",
  faq: [
    {
      q: "Que doit dire un message d'absence ?",
      a: "Que vous êtes absent, quand vous serez de retour, et qui contacter en cas d'urgence. Par exemple : « Je suis absent jusqu'au lundi 2 novembre. Pour toute urgence, vous pouvez contacter Ana Lima. »",
    },
    {
      q: "Comment configurer un message d'absence dans Outlook ?",
      a: "Dans le nouvel Outlook ou Outlook sur le web : Paramètres, Compte, Réponses automatiques. Dans Outlook classique pour Windows : Fichier, Réponses automatiques. Activez-les, fixez les dates et collez votre message.",
    },
    {
      q: "Comment configurer un message d'absence dans Gmail ?",
      a: "Cliquez sur l'engrenage, Voir tous les paramètres, et dans l'onglet Général activez la Réponse automatique. Indiquez les dates, un objet et votre message, puis cliquez sur Enregistrer les modifications.",
    },
    {
      q: "Faut-il dire pourquoi on est absent ?",
      a: "Non. « Absent du bureau » suffit. Dire que vous êtes en congés est courant et tout à fait correct, mais vous n'avez jamais à donner de détails, surtout en cas de maladie.",
    },
    {
      q: "À quoi ressemble un message d'absence professionnel ?",
      a: "« Bonjour, merci pour votre message. Je suis actuellement absent et serai de retour le lundi 2 novembre. Je vous répondrai à mon retour. Pour toute urgence, vous pouvez contacter Ana Lima (ana@example.com). »",
    },
    {
      q: "Ce générateur de message d'absence est-il gratuit ?",
      a: "Oui, et il fonctionne entièrement dans votre navigateur : les noms, dates et e-mails que vous saisissez ne sont envoyés nulle part. Copiez le message dans Outlook, Gmail, Slack ou Teams.",
    },
    {
      q: "Que signifie OOO ?",
      a: "OOO est l'abréviation de « out of office » (absent du bureau). On l'utilise dans les calendriers, les statuts de messagerie et les objets d'e-mails, comme « OOO jusqu'à lundi », pour indiquer que l'on est absent et que l'on ne répondra pas immédiatement.",
    },
    {
      q: "Une réponse automatique est-elle la même chose qu'un message d'absence ?",
      a: "Oui. « Réponses automatiques » est le nom donné par Outlook au message d'absence, tandis que Gmail l'appelle « Réponse automatique ». Tous deux envoient une réponse aux personnes qui vous écrivent pendant votre absence.",
    },
    {
      q: "Comment configurer un message d'absence dans Teams ?",
      a: "Cliquez sur votre photo de profil, choisissez Définir le message de statut, puis Planifier l'absence du bureau. Activez les réponses automatiques, rédigez votre message et définissez les dates. Teams indique que vous êtes absent, et Outlook envoie le même message à tous ceux qui vous écrivent.",
    },
    {
      q: "Comment configurer un message d'absence dans Outlook sur mon téléphone ?",
      a: "Dans l'application Outlook, appuyez sur votre photo de profil, puis sur l'engrenage des Paramètres, choisissez votre compte professionnel et appuyez sur Réponses automatiques. Activez-les, rédigez votre message et définissez les dates.",
    },
  ],
};

export default fr;
