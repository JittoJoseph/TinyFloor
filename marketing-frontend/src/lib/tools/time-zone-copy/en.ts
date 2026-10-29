import type { TimeZonesContent } from "@/lib/tools/time-zones";

const en: TimeZonesContent = {
  meta: {
    title: "Time Zone Meeting Planner for Remote Teams: Find Your Overlap",
    description:
      "Add each teammate's city and working hours to see when everyone's working at once, or the time that suits the most people when no time suits everyone. Counts summer time, in half hours for zones like India's.",
  },
  eyebrow: "Free tools",
  updated: "Updated",
  title: "When your team's hours <em>overlap.</em>",
  intro:
    "Add each person's city and working hours. The planner shows the hours everyone is working at once, in each person's own time, and when no hour suits everyone, the one that suits the most. It uses today's offsets, so summer time is counted.",
  planner: {
    zone: "Time zone",
    hours: "Working hours",
    remove: "Remove",
    add: "Add a person",
    addMine: "Add my time zone",
    timesIn: "Times in {city}",
    working: "Working",
    all: "Everyone",
    everyone: "Everyone is working {from}–{to}, {city} time.",
    best: "No time suits everyone. {from}–{to}, {city} time, suits {count} of {total}.",
    nobody: "Nobody's working hours overlap.",
    eachLocal: "In each person's time:",
  },
  sections: [
    {
      title: "How much overlap a team needs",
      body: [
        "Less than you'd think. Two to four shared hours a day is enough for a standup, the questions that are faster to ask than to type, and a meeting when one is needed. Everything else can happen in writing, in each person's own hours.",
        "What hurts is no overlap at all, or overlap that only exists because someone is working at 7am or 10pm every day. If the planner shows a shared stretch only at the edge of someone's day, that person is paying for the team's meetings.",
      ],
    },
    {
      title: "Finding a fair meeting time",
      items: [
        {
          title: "Meet inside the shared hours",
          body: "Put the standup and recurring meetings in the stretch the planner shows, and keep the rest of the shared hours free for quick questions. Shared time is the scarcest thing a distributed team has.",
        },
        {
          title: "Rotate the bad slot",
          body: "When the only time that works is early for some and late for others, alternate it week by week, so the same people aren't always the ones logging on at night.",
        },
        {
          title: "Fewer, shorter meetings",
          body: "A 15-minute standup fits into almost any overlap; an hour-long meeting usually doesn't. Ask whether a meeting could be a written update before you look for a time for it.",
        },
        {
          title: "Write the outcome down",
          body: "Whoever couldn't make it should be able to catch up in two minutes: a few lines on what was decided and who's doing what, posted where the team already reads.",
        },
        {
          title: "Show your hours",
          body: "Put your working hours in your calendar and your status, so nobody has to work out whether it's a good time to ask you something.",
        },
      ],
    },
    {
      title: "When there's no overlap",
      items: [
        {
          title: "Written standups",
          body: "Each person posts what they did, what's next and what's in the way at the start of their day. The others read it at the start of theirs.",
        },
        {
          title: "Two smaller meetings",
          body: "Split the team by region for live meetings, with one person in both, or the notes shared, to carry what matters across.",
        },
        {
          title: "Hand over at the end of the day",
          body: "When one person's evening is another's morning, a short note at the end of the day lets work move on while the first person sleeps.",
        },
        {
          title: "One shared hour a week",
          body: "Even a team with no daily overlap can find one hour a week where everyone stretches a little, and rotate who stretches most.",
        },
      ],
    },
    {
      title: "Summer time moves the overlap",
      body: [
        "Clocks change on different dates in different places, so a team's shared hours can shift by an hour for a few weeks each spring and autumn. The US changes on the second Sunday in March and the first in November; Europe on the last Sunday in March and October. Australia, New Zealand and Chile change the other way round, in their own spring. India, China, Japan, Brazil and Mexico don't change at all.",
        "The planner works out each city's offset for today, so check it again around those dates if your team's overlap is tight.",
      ],
    },
    {
      title: "How it works it out",
      body: [
        "It takes the day in half hours of the first person's time, works out what time each half hour is for everyone else using the time zone data in your browser, and counts who's within their working hours. Half hours matter for India, which is five and a half hours ahead of UTC. Hours that run past midnight, like 10pm to 6am, work too, and it all runs in your browser.",
      ],
    },
  ],
  fit: {
    title: "Make the shared hours count",
    body: "TinyFloor is a virtual office for remote teams. During the hours you share, everyone who's in is on the same floor, and a question is a walk over to someone's desk instead of a call to schedule. It's free for up to 3 people and $29 a month for the whole team.",
    cta: "Try the demo office",
  },
  faqTitle: "Common <em>questions.</em>",
  faq: [
    {
      q: "How do I find a meeting time across time zones?",
      a: "List each person's city and working hours, then look for the half hours where everyone is working at once. The planner above does it for up to 12 people and shows the result in each person's own time.",
    },
    {
      q: "How many hours of overlap does a remote team need?",
      a: "Two to four hours a day is plenty for most teams: enough for a standup, quick questions and the occasional meeting. The rest of the work can be written and done in each person's own hours.",
    },
    {
      q: "What's a fair meeting time across time zones?",
      a: "One inside everyone's working hours. If there isn't one, rotate the early or late slot week by week so the same people don't always take it.",
    },
    {
      q: "What if my team has no overlapping hours?",
      a: "Work in writing: written standups at the start of each person's day, a hand-over note at the end of it, and split live meetings by region. Most teams can still find one shared hour a week.",
    },
    {
      q: "Does the planner count daylight saving time?",
      a: "Yes. It uses each city's offset for today from your browser's time zone data, so summer time is counted. Check again around late March and late October, when clocks change on different dates.",
    },
  ],
};

export default en;
