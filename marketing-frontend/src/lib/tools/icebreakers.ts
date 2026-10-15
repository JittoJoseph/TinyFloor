import type { GuideSection } from "@/lib/guides";

/**
 * Icebreaker questions for work (docs/search.md): a free tool for whoever runs
 * a remote team's meetings, in English only for now, so every language's copy
 * of the page points search engines at this one (like the legal pages).
 * Every question can be answered in a sentence, and none asks about family,
 * health, money, politics or religion, or assumes someone travels or drinks.
 */
export const ICEBREAKERS_PATH = "/tools/icebreaker-questions";
export const ICEBREAKERS_UPDATED = "2026-10-15";

export interface IcebreakerGroup {
  key: string;
  label: string;
  /** The section's heading in the full list, and when to use this kind of question. */
  title: string;
  when: string;
  questions: string[];
}

export const ICEBREAKER_GROUPS: IcebreakerGroup[] = [
  {
    key: "quick",
    label: "Quick",
    title: "Quick questions for a standup",
    when: "Answered in a word or a sentence, so the whole team can go round in a minute before the updates.",
    questions: [
      "What's one thing you're looking forward to this week?",
      "What's the best thing you ate this week?",
      "Coffee, tea, or something else to start the day?",
      "What can you see from your desk right now?",
      "What did you do last weekend that you'd do again?",
      "What song have you had on repeat lately?",
      "What's one small win from yesterday?",
      "Morning person or night person?",
      "What's the last thing you learned that surprised you?",
      "If today had a theme song, what would it be?",
      "What's one app you couldn't work without?",
      "What's on your desk that has nothing to do with work?",
      "What's the weather like where you are?",
      "What's a show or book you'd recommend right now?",
      "What's your go-to snack while working?",
      "Sunrise or sunset?",
      "What's one thing that made you smile this morning?",
      "What are you having for lunch today?",
      "Which emoji do you use most at work?",
      "What's the next trip you're planning, even a short one?",
      "Cats, dogs, or neither?",
      "What's one word for how your week is going?",
      "What's a habit you're trying to build?",
      "What's the tab you always have open in your browser?",
      "What's something you bought recently that you love?",
      "What's your favourite way to take a short break?",
      "What's the best piece of advice you've had this year?",
      "If you could add one day to the week, what would you do with it?",
      "What's a hobby you'd like to pick up?",
      "What's the first thing you do when you log off?",
    ],
  },
  {
    key: "know",
    label: "Getting to know you",
    title: "Questions for getting to know a new teammate",
    when: "For someone's first week, or a team that has just come together. A little more to say, still nothing private.",
    questions: [
      "Where did you grow up, and what's one thing people should know about it?",
      "What was your first job?",
      "What's something you're good at that has nothing to do with work?",
      "What's a skill you'd love to learn in the next year?",
      "What did you want to be when you were a kid?",
      "What's a place you've lived that shaped you?",
      "What's the best concert, game or show you've been to?",
      "What's a book that changed how you think?",
      "What's a dish from where you grew up that everyone should try?",
      "What's something on your bucket list?",
      "What's a small thing that makes a day good for you?",
      "Which languages do you speak, or wish you did?",
      "What's the most interesting place you've been to?",
      "What's a tradition you love?",
      "What's something people are surprised to learn about you?",
      "What's your favourite way to spend a free afternoon?",
      "If you could have dinner with anyone, past or present, who would it be?",
      "What's a podcast or channel you'd recommend?",
      "What's a project outside work you're proud of?",
      "What's your favourite season, and why?",
      "What's a game you're secretly very good at?",
      "What's a film you can watch again and again?",
      "What's the best gift you've ever given?",
      "What's something you've changed your mind about?",
      "What would your perfect weekend look like?",
    ],
  },
  {
    key: "remote",
    label: "Remote work",
    title: "Questions about remote work",
    when: "For distributed teams: everyone has an answer, and the answers often turn into tips worth sharing.",
    questions: [
      "What does your workspace look like today?",
      "What's the best thing about working remotely for you?",
      "What's one thing you miss about working in an office, if anything?",
      "What's your best tip for ending the workday on time?",
      "Where's the most unusual place you've worked from?",
      "What helps you focus when you work from home?",
      "Who keeps you company while you work: a pet, a plant, the kettle?",
      "What's one tool that made remote work easier for you?",
      "How do you take a proper break when you work from home?",
      "What does your morning look like before you start work?",
      "What's your best time-zone mix-up story?",
      "What's your favourite background sound for working?",
      "If you could work from anywhere for a month, where would it be?",
      "What's one remote work habit you'd recommend to a new teammate?",
      "What's the best thing in your workspace that you didn't plan?",
      "How do you know it's time to step away from the screen?",
      "What's a meeting habit you wish everyone had?",
      "What do you like to do at lunch when you work from home?",
      "Camera on or camera off, and why?",
      "What's one thing that would make our online meetings better?",
    ],
  },
  {
    key: "growth",
    label: "Work and growth",
    title: "Questions about work and growth",
    when: "For retros, one-to-ones and the end of a project, when a team has time to look back.",
    questions: [
      "What's something you learned at work this month?",
      "What's a piece of work you're proud of from this quarter?",
      "Who on the team helped you recently, and how?",
      "What's a skill you're working on right now?",
      "What part of your job gives you the most energy?",
      "What's a mistake you learned the most from?",
      "What would make next week go well for you?",
      "What's one thing we should stop doing as a team?",
      "What's a small change that would make your work easier?",
      "What's the most useful feedback you've received?",
      "What's something you'd like to teach the team?",
      "What did you do this week that nobody saw but mattered?",
      "What's a question you wish people asked you more at work?",
      "What does a great day at work look like for you?",
      "What's one thing you'd like to try that you haven't yet?",
      "What's a decision you made recently that you're glad about?",
      "Who outside the team do you learn from?",
      "What would you tell yourself on your first day here?",
      "What's a goal you have for the next three months?",
      "What's one thing the team did well this week?",
    ],
  },
  {
    key: "either",
    label: "This or that",
    title: "This or that",
    when: "The fastest of all: pick one, no explanation needed, though there usually is one.",
    questions: [
      "Beach or mountains?",
      "Early start or late finish?",
      "Text or call?",
      "Books or podcasts?",
      "Sweet or savoury breakfast?",
      "Summer or winter?",
      "City break or nature trip?",
      "Plan everything or go with the flow?",
      "Mac, Windows or Linux?",
      "Dark mode or light mode?",
      "To-do list on paper or in an app?",
      "Pizza or tacos?",
      "Headphones or speakers?",
      "Film at home or at the cinema?",
      "Tabs or spaces?",
      "Board games or video games?",
      "Stairs or lift?",
      "Cook at home or eat out?",
      "Window seat or aisle seat?",
      "Read the book or watch the film?",
      "Hot drink or cold drink?",
      "Puzzles or sport?",
      "Inbox zero or inbox chaos?",
      "Walk or bike?",
      "Sunrise walk or late-night walk?",
    ],
  },
];

export const ICEBREAKER_COUNT = ICEBREAKER_GROUPS.reduce((sum, group) => sum + group.questions.length, 0);

export const ICEBREAKERS_COPY = {
  meta: {
    title: `${ICEBREAKER_COUNT} Icebreaker Questions for Work (Standups, Meetings, New Teammates)`,
    description: `${ICEBREAKER_COUNT} icebreaker questions for work, sorted by how much time you have: quick ones for standups, getting-to-know-you questions for new teammates, remote work and retro questions. Pick one at random or browse them all.`,
  },
  eyebrow: "Free tools",
  title: "Icebreaker questions <em>for work.</em>",
  intro: `${ICEBREAKER_COUNT} questions for a standup, a team meeting or a new teammate's first week, sorted by how much time you have. Draw one at random below or browse the whole list. Each can be answered in a sentence, and all of them are safe to ask a colleague.`,
  picker: { all: "All", another: "Another question", copy: "Copy", copied: "Copied", of: "{group} · {count} questions" },
  howTo: [
    {
      title: "How to run an icebreaker in a remote meeting",
      items: [
        {
          title: "Keep it to a minute or two",
          detail: "Before the agenda",
          body: "One question, everyone answers in a sentence, then the meeting starts. Any longer and it stops being a warm-up and becomes the meeting.",
        },
        {
          title: "Go round in a fixed order",
          detail: "Nobody put on the spot",
          body: "Use the order on screen, or alphabetical, so people know when their turn is coming. Let anyone pass without a reason.",
        },
        {
          title: "Answer first yourself",
          detail: "Set the length",
          body: "Whoever runs the meeting answers first, briefly. It shows how long an answer should be, and that a light answer is fine.",
        },
        {
          title: "Match the question to the meeting",
          detail: "Quick, personal or reflective",
          body: "A daily standup needs a quick question; a new teammate's first week, a getting-to-know-you one; a retro, a question about the work itself.",
        },
      ],
    },
  ] satisfies GuideSection[],
  rules: [
    {
      title: "What makes a good work icebreaker",
      items: [
        { title: "Answerable in a sentence", body: "If it needs a story, it belongs in a social, not at the start of a meeting." },
        {
          title: "Nothing private",
          body: "Leave out family, relationships, health, money, politics and religion. People share those when they want to, not because a meeting asked.",
        },
        {
          title: "Everyone can answer",
          body: "\"Where did you go on holiday?\" leaves out whoever didn't go anywhere. \"Where would you go for a month?\" doesn't.",
        },
        { title: "Passing is always fine", body: "An icebreaker that someone dreads has the opposite effect. Make it easy to say \"pass\"." },
      ],
    },
    {
      title: "How we picked these",
      body: [
        "We wrote these for remote teams, with the rules above: every question can be answered in a sentence, none asks about family, health, money, politics or religion, and none assumes someone travels, drinks or lives a particular way. They're grouped by how much time a meeting has, from a one-word \"this or that\" to questions for a retro. We add to the list as we find good ones.",
      ],
    },
  ] satisfies GuideSection[],
  fit: {
    title: "Run your standup on the floor",
    body: "TinyFloor is a virtual office for small teams: you see who's at their desk, walk over to talk, and gather in the meeting room for the standup, icebreaker and all. It runs in a browser tab, free for up to 3 people and $29 a month for the whole team.",
    cta: "Try the demo office",
  },
  faq: [
    {
      q: "What is a good icebreaker question for work?",
      a: "One everyone can answer in a sentence without sharing anything private, like \"What's one thing you're looking forward to this week?\" or \"What's a hobby you'd like to pick up?\"",
    },
    {
      q: "How long should an icebreaker take in a meeting?",
      a: "A minute or two for a standup or a regular meeting: one question, one sentence each. Save longer questions for a new teammate's first week, a retro or a team social.",
    },
    {
      q: "What are good icebreaker questions for a daily standup?",
      a: "Quick ones with one-word or one-sentence answers: \"Morning person or night person?\", \"What's one small win from yesterday?\" or \"What's one word for how your week is going?\"",
    },
    {
      q: "Which icebreaker questions should you avoid at work?",
      a: "Anything about family, relationships, health, money, politics or religion, and questions that assume something not everyone has, like a recent holiday.",
    },
    {
      q: "How do you do icebreakers in a virtual meeting?",
      a: "Share the question at the start, go round in the order people appear on screen, answer first yourself to show the length, and let anyone pass.",
    },
  ],
};
