import type { OfficeCostsContent } from "@/lib/tools/office-costs";

const fr: OfficeCostsContent = {
  meta: {
    title: "Calculateur de coût de bureau virtuel : ce que 9 outils coûtent à votre équipe",
    description:
      "Indiquez la taille de votre équipe et voyez ce que Gather, SoWork, Kumospace, WorkAdventure, SpatialChat, Roam, oVice, Sococo et TinyFloor coûtent par mois, en facturation annuelle ou mensuelle, d’après la page de tarifs de chacun.",
  },
  eyebrow: "Outils gratuits",
  updated: "Prix vérifiés le",
  title: "Ce qu’un bureau virtuel <em>coûte à votre équipe.</em>",
  intro:
    "La plupart des bureaux virtuels facturent par personne, quelques-uns par espace ou par bureau, et les offres gratuites s’arrêtent à des tailles différentes. Indiquez combien de personnes compte votre équipe pour voir ce que coûte chacun de neuf outils par mois, du moins cher au plus cher.",
  calculator: {
    people: "Personnes dans l’équipe",
    count: "{count} personnes",
    billing: { yearly: "Facturation annuelle", monthly: "Facturation mensuelle" },
    product: "Produit",
    free: "Offre gratuite",
    price: "Offre payante",
    perMonth: "{amount} par mois",
    perYear: "{amount} par an",
    only: { yearly: "annuel uniquement", monthly: "mensuel uniquement" },
    noFree: "Pas d’offre gratuite",
    fits: "Gratuit à cette taille",
    upTo: "Jusqu’à {count} personnes",
    pricingPage: "Page de tarifs",
    basis: {
      office: "Un prix pour le bureau",
      member: "Par membre",
      activeMember: "Par membre actif",
      space: "Par espace",
      seat: "Par siège, 10 minimum",
    },
    limits: {
      everyFeature: "toutes les fonctions",
      thirtyMinutes: "réunions de 30 minutes",
      oneFloor: "un étage",
      atOnce: "en même temps",
      twoHours: "2 heures par jour",
      preRelease: "préversion, sans support",
    },
    summary: "Pour {count} personnes, les offres par personne vont de {low} à {high} par mois. TinyFloor coûte {tinyfloor}.",
    summaryLarge: "Pour {count} personnes, les offres par personne vont de {low} à {high} par mois.",
  },
  sections: [
    {
      title: "Comment les bureaux virtuels facturent",
      body: ["De quatre façons, et celle qu’un outil utilise décide de ce que paie une équipe qui grandit, plus que le prix affiché."],
      items: [
        {
          title: "Par membre",
          detail: "Gather, SoWork, Kumospace, WorkAdventure, SpatialChat",
          body: "Vous payez pour toutes les personnes qui ont un compte, chaque mois, qu’elles viennent ou non. La facture grandit à chaque recrutement : une équipe de 10 paie deux fois plus qu’une équipe de 5.",
        },
        {
          title: "Par membre actif",
          detail: "Roam",
          body: "Vous payez pour les personnes qui l’ont utilisé dans le mois. Quelqu’un en congé ne coûte rien, mais la plupart des équipes sont actives tous les mois, donc en pratique cela revient au prix par membre.",
        },
        {
          title: "Par espace ou par lot de sièges",
          detail: "oVice, Sococo",
          body: "Vous payez un espace prévu pour un certain nombre de personnes, ou un lot minimum de sièges. Avantageux si votre équipe le remplit, cher sinon : Sococo facture 10 sièges même si vous êtes 4.",
        },
        {
          title: "Un prix pour le bureau",
          detail: "TinyFloor",
          body: "Un seul prix quel que soit l’effectif, jusqu’à la taille que l’offre accepte. Ajouter quelqu’un ne coûte rien, donc personne n’a à décider si un freelance vaut un siège.",
        },
      ],
    },
    {
      title: "Facturation annuelle ou mensuelle",
      body: [
        "La plupart des outils par personne accordent 10 à 20 % de remise pour un an payé d’avance : Gather coûte 12 $ par membre en facturation annuelle et 15 $ en mensuelle. C’est un engagement d’un an pour une équipe dont la taille peut changer, et la remise est perdue si vous arrêtez au bout de trois mois.",
        "Certains ne facturent que d’une façon : Roam et TinyFloor au mois, Sococo à l’année. Le calculateur les affiche au prix qu’ils ont et le précise.",
      ],
    },
  ],
  table: {
    title: "Ce que paie par mois une équipe de 5, 10 ou 15",
    body: [
      "Les mêmes prix pour trois tailles courantes, en facturation annuelle quand l’outil la propose, puisque c’est le prix le plus bas. Les offres gratuites ne sont pas comptées ici ; le calculateur ci-dessus montre celles qui conviennent.",
    ],
    product: "Produit",
    note: "Prix en dollars américains hors taxes, d’après la page de tarifs de chaque produit. Sococo facture 10 sièges au minimum ; oVice passe d’Entry-S à Entry-M au-delà d’environ 10 membres réguliers.",
  },
  after: [
    {
      title: "Quand une offre gratuite suffit",
      body: [
        "Une offre gratuite qui couvre toute votre équipe vaut mieux que n’importe quelle offre payante, alors regardez les limites avant le prix. Celle de SoWork couvre 10 membres mais coupe chaque réunion à 30 minutes. Celle de WorkAdventure couvre 10 personnes connectées en même temps. Celle de SpatialChat donne à 12 personnes deux heures de réunion par jour, ce qui convient à une séance hebdomadaire, pas à un bureau ouvert toute la journée. Celle de Kumospace couvre 5 membres sur un étage, et celle de TinyFloor 3 personnes avec toutes les fonctions. L’offre gratuite d’oVice tourne sur une préversion sans support.",
      ],
    },
    {
      title: "Ce que le prix ne montre pas",
      items: [
        {
          title: "Ce que contient l’offre",
          body: "L’offre la moins chère n’est pas toujours celle que vous utiliseriez. SoWork Basic comprend deux enregistrements de réunion ; les enregistrements et les notes par IA sont dans Premium, à 12 $ par membre. Gather inclut l’enregistrement et la transcription. TinyFloor n’a ni enregistrements ni notes par IA.",
        },
        {
          title: "Invités",
          body: "Les clients et freelances qui passent de temps en temps peuvent compter comme membres sur certains outils. Gather et oVice permettent d’inviter des visiteurs sans payer pour eux ; vérifiez avant d’ajouter des personnes qui ne font que passer.",
        },
        { title: "Taxes", body: "Tous les prix ici sont hors taxes. Selon votre pays, la TVA ou la taxe de vente s’ajoute au paiement." },
        {
          title: "Essais",
          body: "Gather propose un essai de 30 jours, Roam et oVice de 14 jours, SoWork de 7 jours. L’essai vous dit si l’équipe va s’en servir ; le prix, si vous allez continuer à payer.",
        },
      ],
    },
    {
      title: "Comment nous avons vérifié",
      body: [
        "Chaque prix vient de la page de tarifs du produit lui-même, liée dans le calculateur, consultée le mois indiqué en haut. Nous prenons l’offre qu’une petite équipe achèterait pour un bureau ouvert toute la journée, pas les offres événements ou entreprise. Quand une page ne donne qu’une période de facturation, nous affichons celle-là. Les prix changent : vérifiez la page de tarifs avant d’acheter ; nous revérifions tous les quelques mois.",
      ],
    },
  ],
  fit: {
    title: "Un prix pour toute l’équipe",
    body: "TinyFloor est un bureau dans le navigateur pour les petites équipes : vous allez vers quelqu’un pour lui parler, avec une salle de réunion, un chat et le partage d’écran. Il est gratuit jusqu’à 3 personnes, puis coûte 29 $ par mois pour toute l’équipe, quel que soit votre nombre. Il n’a ni enregistrements ni notes par IA ; si vous en avez besoin, Gather ou SoWork Premium vous conviendront mieux.",
    cta: "Essayer le bureau de démo",
  },
  faqTitle: "Questions <em>fréquentes.</em>",
  faq: [
    {
      q: "Combien coûte un bureau virtuel par mois ?",
      a: "Pour une équipe de 10 sur une offre payante, de 29 $ à 195 $ par mois selon l’outil : TinyFloor coûte 29 $ pour tout le bureau, les outils par personne vont de 54 $ (SoWork Basic, facturation annuelle) à 195 $ (Roam).",
    },
    {
      q: "Quel est le bureau virtuel le moins cher pour une petite équipe ?",
      a: "Une offre gratuite qui convient : celle de SoWork couvre 10 membres avec des réunions de 30 minutes, celle de WorkAdventure 10 personnes en même temps, celle de Kumospace 5 membres et celle de TinyFloor 3 personnes. Au-delà, TinyFloor, à 29 $ par mois pour toute l’équipe, est le prix payant le plus bas à partir de 6 personnes.",
    },
    {
      q: "Gather est-il gratuit ?",
      a: "Non. Gather a supprimé son offre gratuite en 2025. Après un essai de 30 jours, il coûte 12 $ par membre et par mois en facturation annuelle ou 15 $ en mensuelle, donc une équipe de 10 paie de 120 $ à 150 $ par mois.",
    },
    {
      q: "Vaut-il mieux un prix par personne ou un prix fixe ?",
      a: "Le prix par personne revient moins cher pour une équipe de 2 ou 3, où le prix par tête est faible. Le prix fixe l’emporte quand l’équipe grandit, et il ne coûte jamais plus quand vous ajoutez un freelance ou une nouvelle recrue.",
    },
    {
      q: "Les prix des bureaux virtuels incluent-ils les taxes ?",
      a: "Non. Les prix des pages de tarifs des outils, et ceux d’ici, sont hors taxes ; la TVA ou la taxe de vente s’ajoute au paiement selon votre pays.",
    },
  ],
};

export default fr;
