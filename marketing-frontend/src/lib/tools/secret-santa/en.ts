import type { SantaContent } from "@/lib/tools/secret-santa";

/** The Secret Santa generator, in English: the page the other languages are written from. */
const en: SantaContent = {
  meta: {
    title: "Secret Santa Generator: Free Name Draw, No Email or Sign-Up",
    description:
      "Draw names for Secret Santa in seconds and send everyone a private link that shows who they're buying for. Free, no emails or accounts, and made for teams that work remotely.",
  },
  eyebrow: "Free tool",
  updated: "Updated",
  title: "Secret Santa <em>generator.</em>",
  intro:
    "Type everyone's names, draw, and send each person their own private link: it shows who they're buying for and nobody else's pick. No emails, no accounts, and it works for a team spread across countries. Below it: how to run Secret Santa online, the rules, and gift ideas for colleagues.",
  drawer: {
    names: "Names",
    namesHint: "One per line, at least three. Add yourself if you're taking part.",
    budget: "Budget",
    date: "Exchange date",
    optional: "(optional)",
    draw: "Draw names",
    redraw: "Draw again",
    redrawNote: "Drawing again makes new links. Send only the newest ones.",
    tooFew: "Add at least three names.",
    duplicate: "Two people have the same name. Add an initial so everyone can find their own link.",
    linksTitle: "Private links",
    linksNote: "Send each person their own link, in a message to them alone. Opening it shows who they're buying for.",
    copy: "Copy link",
    copied: "Copied",
    copyAll: "Copy all links",
    allIntro: "Secret Santa: open only the link with your name.",
    revealTitle: "Hi {name}, you're the Secret Santa for…",
    show: "Show the name",
    lookAway: "Make sure nobody is looking at your screen.",
    budgetLabel: "Budget",
    dateLabel: "Exchange",
    keepSecret: "Keep it a secret until the exchange.",
    own: "Draw names for your own group",
  },
  sections: [
    {
      title: "How to do Secret Santa online",
      items: [
        { title: "Collect the names", body: "Ask who wants to take part. Joining should be optional at work: a Secret Santa people are pushed into isn't much fun for anyone." },
        { title: "Set a budget and a date", body: "One number, said up front, so nobody spends three times as much as the person buying for them. The date is when the gifts are opened." },
        { title: "Draw the names", body: "Type the names above and draw. Everyone gets someone, and nobody gets themselves." },
        { title: "Send the links", body: "Send each person their own link in a direct message or email. The organiser can take part too: you see the links, not who drew whom." },
        { title: "Open the gifts together", body: "On a video call or at the party, one at a time, with everyone guessing who their Secret Santa was." },
      ],
    },
    {
      title: "Secret Santa with a remote team",
      body: [
        "When the team works from different cities, or different countries, the gifts have to travel. The simplest way is digital gifts: a gift card, an e-book, a month of a streaming service, a donation in the person's name. If people would rather send something real, the organiser can collect home addresses privately and pass each one only to the person who needs it, or everyone can order from a shop that delivers in each country.",
        "Open the gifts together on a call, ideally as part of an end-of-year party. Our [virtual holiday party ideas](/guides/virtual-holiday-party-ideas) have an agenda and games to go around it.",
      ],
    },
    {
      title: "Secret Santa rules",
      items: [
        { title: "Stick to the budget", body: "Under is fine, over is awkward. The budget is the point: a small gift, chosen with care." },
        { title: "Keep it secret", body: "Don't tell anyone who you drew until the gifts are opened, and don't ask others who they got." },
        { title: "Keep it suitable for work", body: "Nothing personal, nothing that could embarrass someone in front of colleagues." },
        { title: "Share a wish", body: "If people add a short wish to the team chat, such as \"I'd love a good book\", nobody has to guess." },
        { title: "Make it optional", body: "Some people don't celebrate, or don't want to. They're still welcome at the party." },
      ],
    },
    {
      title: "Secret Santa gift ideas for colleagues",
      body: ["Ideas that travel well and suit most budgets:"],
      items: [
        { title: "Coffee or tea", detail: "Under $20", body: "A bag from a good local roaster, or a tea sampler." },
        { title: "A book", detail: "Under $20", body: "Something you loved this year, with a note saying why." },
        { title: "A desk plant", detail: "Under $25", body: "Small, hard to kill, and nice to look at during calls." },
        { title: "A gift card", detail: "Any budget", body: "For a bookshop, a café chain or food delivery where they live." },
        { title: "A nice notebook", detail: "Under $20", body: "Useful for anyone who still writes things down." },
        { title: "A month of something", detail: "Under $15", body: "A music, audiobook or streaming subscription, sent as a gift code." },
        { title: "A puzzle or game", detail: "Under $25", body: "Something for the evenings, or for the whole family." },
        { title: "Something from your city", detail: "Under $20", body: "Local sweets or a small thing only your place makes. Remote teams love these." },
      ],
    },
  ],
  fit: {
    title: "Open the gifts together",
    body: "TinyFloor is a virtual office for small teams. Open the gifts in the meeting room with video and screen sharing, then stay and talk at your desks afterwards, the way you would at a real party. It's free for up to 3 people and $29 a month for the whole team.",
    cta: "Try the demo office",
  },
  faqTitle: "Common <em>questions.</em>",
  faq: [
    {
      q: "How does this Secret Santa generator work?",
      a: "Type the names, draw, and send each person the link with their name. Opening it shows who they're buying for, with the budget and date if you set them.",
    },
    {
      q: "Do people need an email address or an account?",
      a: "No. There's no sign-up and nothing is emailed: you send the links yourself, in a chat, an email or a text message.",
    },
    {
      q: "Can the organiser take part?",
      a: "Yes. The organiser sees the links, not who drew whom, so add your own name and open only your own link.",
    },
    {
      q: "Can someone draw their own name?",
      a: "No. Every person is given someone else, and every person is given to exactly one Secret Santa.",
    },
    {
      q: "How do you do Secret Santa with a remote team?",
      a: "Draw names online, send everyone a private link, agree on a budget, and choose digital gifts or collect addresses privately. Then open the gifts together on a video call.",
    },
    {
      q: "What's a good Secret Santa budget at work?",
      a: "Something everyone can afford without thinking about it, often $15 to $30. Say one number in the invitation so gifts feel even.",
    },
    {
      q: "Is this Secret Santa generator free?",
      a: "Yes, with no limit on the number of people. It runs in your browser, and the names only travel in the links you send.",
    },
  ],
};

export default en;
