import type { StandupContent } from "@/lib/tools/standup";

/** The daily standup template, in English: the page the other languages are written from. */
const en: StandupContent = {
  meta: {
    title: "Daily Standup Template: Free Agenda and Async Builder",
    description:
      "Build a daily standup agenda timed for your team, or an async standup template to post in Slack or Teams. Free, with three question sets and a guide to running it.",
  },
  eyebrow: "Free tool",
  updated: "Updated",
  title: "Daily standup <em>template.</em>",
  intro:
    "A good daily standup takes about a minute a person and ends with everyone knowing what's happening and who's stuck. Pick your team's size and how you meet, on a call, in writing, or walking the board, and get an agenda timed to fit, or a template to post in your team chat.",
  builder: {
    team: "Team size",
    people: "{count} people",
    format: "How you meet",
    formats: { live: "On a call", async: "In writing (async)", board: "Walking the board" },
    questions: "Questions",
    sets: [
      { key: "classic", label: "Classic", questions: ["What did you do yesterday?", "What will you do today?", "Is anything in your way?"] },
      { key: "focus", label: "Focus", questions: ["What's your one priority today?", "What could stop it?", "Who do you need help from?"] },
      { key: "progress", label: "Progress", questions: ["What moved forward?", "What's next?", "Any risks we should know about?"] },
    ],
    icebreaker: "Start with a one-minute icebreaker",
    minutes: "{count} minutes",
    agenda: "Agenda",
    template: "Template to post",
    copy: "Copy",
    copied: "Copied",
    lines: {
      open: "Open: start on time, even if someone's late",
      icebreaker: "Icebreaker: one quick question, one sentence each",
      round: "Round: each person answers, about a minute each",
      column: "{column}: what's stuck, what's next",
      blockers: "Blockers: agree who'll help, and talk after",
      close: "Close: anything everyone needs to know",
    },
    columns: ["Blocked", "In review", "In progress", "Up next"],
    note: {
      live: "About a minute a person, a little less in a bigger team, plus a minute to open and close. Fifteen minutes at most: past that it's a meeting, not a standup.",
      async: "Ask everyone to post by the same time each morning in their own time zone, read each other's, and reply in a thread to anything blocked.",
      board: "Walk the board from the right: work nearest to done first, so the team finishes things before starting new ones. Five minutes plus about one a person.",
    },
  },
  sections: [
    {
      title: "What a daily standup is for",
      body: [
        "A daily standup is a short meeting, usually at the start of the day, where everyone on a team says what they're working on and whether anything is in their way. It comes from agile software teams, where it's also called the daily scrum, but it works for any small team that depends on each other's work.",
        "It isn't a status report for a manager. The point is for the team to see the day ahead together: who's doing what, where two pieces of work meet, and who needs help. If a standup leaves someone unblocked, it was worth it; if it's a round of recitals nobody listens to, it wasn't.",
      ],
    },
    {
      title: "Three ways to run it",
      items: [
        {
          title: "On a call",
          detail: "The classic",
          body: "Everyone joins at the same time and takes a turn answering the same three questions. Best for teams in close time zones who like to see each other once a day. Keep it to about a minute a person.",
        },
        {
          title: "In writing",
          detail: "Async standup",
          body: "Everyone posts their answers in the team chat by a set time, and reads the others'. Best for teams across time zones, or teams with a lot of meetings already. It loses the conversation, so make a habit of replying to anything blocked.",
        },
        {
          title: "Walking the board",
          detail: "Work first, people second",
          body: "Instead of going round the people, go through the task board, column by column, from the work nearest to done. Best for teams with a busy board, where the question is what's stuck rather than what everyone did.",
        },
      ],
    },
    {
      title: "The three standup questions",
      body: [
        "The classic three are what you did yesterday, what you'll do today and whether anything is in your way. They work, but they invite a list of everything someone touched. If your standups run long, try a sharper set:",
      ],
      items: [
        {
          title: "Classic",
          body: "What did you do yesterday? What will you do today? Is anything in your way? Familiar to everyone, and fine for a new team.",
        },
        {
          title: "Focus",
          body: "What's your one priority today? What could stop it? Who do you need help from? Shorter answers, and the last question turns blockers into asks.",
        },
        {
          title: "Progress",
          body: "What moved forward? What's next? Any risks? About the work rather than the person, and a good fit for walking the board.",
        },
      ],
    },
    {
      title: "A daily standup agenda, minute by minute",
      body: [
        "For a team of six on a call, a standup takes about eight minutes. Open on time, even if someone's late: waiting teaches everyone to be late. Then go round in a fixed order, the one people appear in on screen or alphabetical, so nobody wonders when it's their turn.",
        "When someone mentions a problem, don't solve it in the standup. Note who can help and agree to talk straight after, with just the people who need to be there. That one habit is what keeps a standup to ten minutes. Close by asking if there's anything everyone needs to know, then end the call.",
      ],
      table: {
        head: ["Team size", "On a call", "Walking the board"],
        rows: [
          ["3 people", "5 minutes", "8 minutes"],
          ["6 people", "8 minutes", "11 minutes"],
          ["8 people", "10 minutes", "13 minutes"],
          ["12 people", "11 minutes", "15 minutes"],
          ["15 people", "14 minutes", "15 minutes"],
        ],
        note: "Worked out the way the tool above does it: about a minute a person (three quarters of a minute past eight people) plus two to open and close, and never more than fifteen.",
      },
    },
    {
      title: "Running an async standup",
      body: [
        "An async standup is the same three questions, answered in writing. Pick a channel and a time, say 10am in each person's own time zone, and ask everyone to post their answers as one message, using the template above so they're easy to skim.",
        "Two things make it work. First, read the others' updates; an async standup nobody reads is a diary. Second, reply in a thread to anything blocked, the same day. Some teams keep one short call a week on top, so the team still sees each other.",
      ],
    },
    {
      title: "Common standup mistakes",
      items: [
        { title: "It turns into problem-solving", body: "Someone raises an issue and three people start fixing it. Note it, agree who'll talk after, and move on." },
        { title: "It's a report to the manager", body: "If everyone looks at the lead while they talk, the standup is for the wrong person. Talk to the team." },
        { title: "Too many people", body: "Past about twelve people, nobody listens to everyone. Split into smaller standups by project or by stream of work." },
        { title: "Starting late", body: "Waiting five minutes for the last person costs everyone else five minutes, every day. Start on time." },
        { title: "Saying 'no blockers' every day", body: "If nobody is ever blocked, ask a sharper question: \"What could stop your priority today?\" usually finds something." },
      ],
    },
  ],
  fit: {
    title: "Hold your standup on the floor",
    body: "TinyFloor is a virtual office for small teams: you see who's at their desk, and the standup is a walk to the meeting room rather than another link. After it, walk over to whoever's blocked. It runs in a browser tab, free for up to 3 people and $29 a month for the whole team.",
    cta: "Try the demo office",
  },
  faqTitle: "Common <em>questions.</em>",
  faq: [
    {
      q: "What are the three daily standup questions?",
      a: "What did you do yesterday? What will you do today? Is anything in your way? A sharper version: What's your one priority today? What could stop it? Who do you need help from?",
    },
    {
      q: "How long should a daily standup be?",
      a: "About a minute a person, plus a minute or two to open and close: around eight minutes for a team of six. Fifteen minutes at most.",
    },
    {
      q: "What is a daily standup template?",
      a: "A fixed agenda for the meeting, or a message format for a written standup: the same three questions, in the same order, every day, so updates are quick to give and easy to skim.",
    },
    {
      q: "What is an async standup?",
      a: "A standup done in writing: everyone posts their answers to the three questions in the team chat by a set time and reads the others'. It suits teams across time zones.",
    },
    {
      q: "Is a daily standup only for scrum teams?",
      a: "No. It comes from agile software teams, where it's called the daily scrum, but any small team whose work depends on each other's can use it.",
    },
    {
      q: "Is this daily standup tool free?",
      a: "Yes, and it runs entirely in your browser: nothing you choose is sent anywhere. Copy the agenda or template into your calendar invite or team chat.",
    },
  ],
};

export default en;
