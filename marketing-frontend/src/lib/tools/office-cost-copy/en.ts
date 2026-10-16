import type { OfficeCostsContent } from "@/lib/tools/office-costs";

const en: OfficeCostsContent = {
  meta: {
    title: "Virtual Office Cost Calculator: What 9 Tools Cost Your Team",
    description:
      "Enter your team's size and see what Gather, SoWork, Kumospace, WorkAdventure, SpatialChat, Roam, oVice, Sococo and TinyFloor cost a month, billed yearly or monthly, from each one's own pricing page.",
  },
  eyebrow: "Free tools",
  updated: "Prices checked",
  title: "What a virtual office <em>costs your team.</em>",
  intro:
    "Most virtual offices charge per person, a few per space or per office, and the free plans stop at different sizes. Enter how many people are on your team to see what each of nine tools costs a month, cheapest first.",
  calculator: {
    people: "People on the team",
    count: "{count} people",
    billing: { yearly: "Billed yearly", monthly: "Billed monthly" },
    product: "Product",
    free: "Free plan",
    price: "Paid plan",
    perMonth: "{amount} a month",
    perYear: "{amount} a year",
    only: { yearly: "yearly only", monthly: "monthly only" },
    noFree: "No free plan",
    fits: "Free at this size",
    upTo: "Up to {count} people",
    pricingPage: "Pricing page",
    basis: {
      office: "One price for the office",
      member: "Per member",
      activeMember: "Per active member",
      space: "Per space",
      seat: "Per seat, 10 at least",
    },
    limits: {
      everyFeature: "every feature",
      thirtyMinutes: "30-minute meetings",
      oneFloor: "one floor",
      atOnce: "at once",
      twoHours: "2 hours a day",
      preRelease: "pre-release, no support",
    },
    summary: "For {count} people, per-person plans run from {low} to {high} a month. TinyFloor is {tinyfloor}.",
    summaryLarge: "For {count} people, per-person plans run from {low} to {high} a month.",
  },
  sections: [
    {
      title: "How virtual offices are priced",
      body: [
        "Four ways, and which one a tool uses decides what a growing team pays more than the headline price does.",
      ],
      items: [
        {
          title: "Per member",
          detail: "Gather, SoWork, Kumospace, WorkAdventure, SpatialChat",
          body: "You pay for everyone with an account, every month, whether they come in or not. The bill grows with every hire: a team of 10 pays twice what a team of 5 pays.",
        },
        {
          title: "Per active member",
          detail: "Roam",
          body: "You pay for the people who used it that month. Someone on leave costs nothing, but most teams are active every month, so in practice it works like per member.",
        },
        {
          title: "Per space or per seat block",
          detail: "oVice, Sococo",
          body: "You pay for a space sized for a number of people, or for a minimum block of seats. Cheap if your team fills it, expensive if it doesn't: Sococo charges for 10 seats even if you're 4.",
        },
        {
          title: "One price for the office",
          detail: "TinyFloor",
          body: "One price whatever the headcount, up to the size the plan takes. Adding someone costs nothing, so nobody has to decide whether a contractor is worth a seat.",
        },
      ],
    },
    {
      title: "Yearly or monthly billing",
      body: [
        "Most per-person tools take 10 to 20% off for paying a year ahead: Gather is $12 a member billed yearly and $15 monthly. That's a year's commitment for a team whose size may change, and the discount is gone if you leave after three months.",
        "Some only bill one way: Roam and TinyFloor bill monthly, Sococo yearly. The calculator shows those at the price they have and says so.",
      ],
    },
  ],
  table: {
    title: "What a team of 5, 10 or 15 pays a month",
    body: [
      "The same prices at three common sizes, billed yearly where the tool offers it, since that's the lower price. Free plans aren't counted here; the calculator above shows which ones fit.",
    ],
    product: "Product",
    note: "Prices in US dollars before tax, from each product's own pricing page. Sococo charges for 10 seats at least; oVice moves from Entry-S to Entry-M past about 10 regular members.",
  },
  after: [
    {
      title: "When a free plan is enough",
      body: [
        "A free plan that fits your whole team beats any paid one, so check the limits before the price. SoWork's covers 10 members but ends every meeting at 30 minutes. WorkAdventure's covers 10 people online at once. SpatialChat's gives 12 people two hours of meetings a day, which suits a weekly session, not an office that's open all day. Kumospace's covers 5 members on one floor, and TinyFloor's 3 people with every feature. oVice's free plan runs on a pre-release version without support.",
      ],
    },
    {
      title: "What the price doesn't show",
      items: [
        {
          title: "What's in the plan",
          body: "The cheapest plan isn't always the one you'd use. SoWork Basic has two meeting recordings; recordings and AI notes are in Premium at $12 a member. Gather includes recordings and transcription. TinyFloor has no recordings or AI notes.",
        },
        {
          title: "Guests",
          body: "Clients and contractors who drop in now and then may count as members on some tools. Gather and oVice let you invite guests without paying for them; check before you add people who only visit.",
        },
        {
          title: "Tax",
          body: "Every price here is before tax. Depending on where you are, VAT or sales tax is added at checkout.",
        },
        {
          title: "Trials",
          body: "Gather has a 30-day trial, Roam and oVice 14 days, SoWork 7 days. A trial tells you whether the team will use it; the price tells you whether you'll keep paying.",
        },
      ],
    },
    {
      title: "How we checked",
      body: [
        "Every price comes from the product's own pricing page, linked in the calculator, read in the month shown at the top. We use the plan a small team would buy for an office that's open all day, not event or enterprise plans. Where a page gives only one billing period, we show that one. Prices change, so check the pricing page before you buy; we recheck every few months.",
      ],
    },
  ],
  fit: {
    title: "One price for the whole team",
    body: "TinyFloor is a browser office for small teams: walk up to someone to talk, a meeting room, chat and screen sharing. It's free for up to 3 people and $29 a month for the whole team after that, however many of you there are. It has no recordings or AI notes, so if you need those, Gather or SoWork Premium will suit you better.",
    cta: "Try the demo office",
  },
  faqTitle: "Common <em>questions.</em>",
  faq: [
    {
      q: "How much does a virtual office cost a month?",
      a: "For a team of 10 on a paid plan, $29 to $195 a month depending on the tool: TinyFloor is $29 for the whole office, per-person tools run from $54 (SoWork Basic, billed yearly) to $195 (Roam).",
    },
    {
      q: "What is the cheapest virtual office for a small team?",
      a: "A free plan that fits: SoWork's covers 10 members with 30-minute meetings, WorkAdventure's 10 people at once, Kumospace's 5 members and TinyFloor's 3 people. Past that, TinyFloor at $29 a month for the whole team is the lowest paid price from 6 people up.",
    },
    {
      q: "Is Gather free?",
      a: "No. Gather ended its free plan in 2025. After a 30-day trial it costs $12 a member a month billed yearly or $15 monthly, so a team of 10 pays $120 to $150 a month.",
    },
    {
      q: "Is per-person or flat pricing better?",
      a: "Per person is cheaper for a team of 2 or 3, where the price per head is small. Flat pricing wins as the team grows, and it never charges you more for adding a contractor or a new hire.",
    },
    {
      q: "Do virtual office prices include tax?",
      a: "No. The prices on the tools' pricing pages, and here, are before tax; VAT or sales tax is added at checkout depending on where you are.",
    },
  ],
};

export default en;
