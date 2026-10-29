import type { OooContent } from "@/lib/tools/out-of-office";

/** The out-of-office message generator, in English: the page the other languages are written from. */
const en: OooContent = {
  meta: {
    title: "Out of Office Message: Free Generator, Examples and Outlook Setup",
    description:
      "Write an out of office message in seconds, with examples for holidays, Christmas, sick days and maternity leave, and how to set automatic replies in Outlook, Gmail and Teams.",
  },
  eyebrow: "Free tool",
  updated: "Updated",
  title: "Out of office <em>message generator.</em>",
  intro:
    "Say why you're away, when you're back and who can help in the meantime, and get an email auto-reply and a short status for your team chat, ready to paste. Below it: example messages for every situation, and how to turn one on in Outlook, Gmail, Slack and Teams.",
  writer: {
    reason: "Why you're away",
    reasons: { vacation: "Holiday", sick: "Sick day", travel: "Work trip", parental: "Parental leave", holiday: "Public holiday" },
    back: "Back on",
    unknown: "Leave it empty if you're not sure yet.",
    name: "Your name",
    contact: "Who to contact instead",
    email: "Their email",
    optional: "(optional)",
    tone: "Tone",
    tones: { professional: "Professional", friendly: "Friendly", short: "Short" },
    emailTitle: "Email auto-reply",
    statusTitle: "Status for Slack, Teams or TinyFloor",
    statusNote: "Up to 100 characters, so it fits a Slack status.",
    copy: "Copy",
    copied: "Copied",
  },
  sections: [
    {
      title: "Out of office message examples",
      body: [
        "Every good out of office message says three things: that you're away, when you'll be back, and who to contact if it can't wait. Here's how that reads in the most common situations; the generator above writes the same thing with your dates and names.",
      ],
      items: [
        {
          title: "Holiday",
          detail: "Annual leave",
          body: "\"Thank you for your email. I'm currently out of the office on annual leave until Monday 2 November. I'll respond to your message when I return. For anything urgent, please contact Ana Lima (ana@example.com).\"",
        },
        {
          title: "Sick day",
          detail: "Short and private",
          body: "\"Thank you for your email. I'm out of the office today and will reply as soon as I'm back. For anything urgent, please contact Ana Lima.\" Saying you're unwell is optional; you never owe anyone the details.",
        },
        {
          title: "Work trip or conference",
          detail: "Slow, not gone",
          body: "\"Thanks for your message! I'm travelling for work until Thursday 5 November and checking email less than usual. I'll get back to you when I'm back. If it can't wait, Ana Lima can help.\"",
        },
        {
          title: "Maternity or parental leave",
          detail: "Long absence",
          body: "\"Thank you for your email. I'm on parental leave until 2 February and won't be checking email. For anything about my projects, please contact Ana Lima (ana@example.com), who's covering for me.\" For a long absence, give a person, not just a date.",
        },
        {
          title: "Public holiday",
          detail: "For the whole team",
          body: "\"Thank you for your email. Our office is closed for the public holiday until Tuesday 3 November. We'll reply to your message when we're back.\"",
        },
        {
          title: "The short one",
          detail: "For colleagues",
          body: "\"I'm on leave until 3 November. Urgent? Contact Ana Lima.\" Inside your own company, shorter is usually better.",
        },
        {
          title: "Christmas and New Year",
          detail: "End-of-year break",
          body: "\"Thank you for your email. I'm out of the office for the holidays and back on Monday 4 January. I'll reply to your message when I return. For anything urgent, please contact Ana Lima (ana@example.com). Wishing you a happy new year.\"",
        },
        {
          title: "Half a day",
          detail: "Back the same day",
          body: "\"Thanks for your email. I'm out of the office this afternoon and will reply tomorrow morning.\" For a few hours away, a chat status is often enough on its own.",
        },
        {
          title: "For customers",
          detail: "Outside your company",
          body: "\"Thank you for contacting us. I'm out of the office until Monday 2 November. For orders and support, please write to support@example.com, where the team replies within one working day.\" Outlook can send this one only to people outside your organisation.",
        },
        {
          title: "Last day at the company",
          detail: "Leaving for good",
          body: "\"Thank you for your email. I've now left Example Ltd. For anything I was working on, please contact Ana Lima (ana@example.com), who's taking over.\" Companies usually keep a reply like this on a leaver's address for a few months.",
        },
      ],
    },
    {
      title: "How to set an out of office message in Outlook",
      body: [
        "In the new Outlook and Outlook on the web (Microsoft 365), open Settings (the gear icon), go to Account, then Automatic replies. Turn automatic replies on, tick the option to send them only during a time period, set your start and end dates, and paste your message. You can write a different message for people outside your organisation, which is a good idea: colleagues need less explanation than customers.",
        "In classic Outlook for Windows, go to File, then Automatic Replies, and fill in the same details. Outlook switches the replies off by itself at the end date if you set one, so you don't need to remember to come back to it.",
        "In Outlook for Mac, go to Tools, then Automatic Replies. In the Outlook app on an iPhone or Android phone, tap your profile picture, then the Settings gear, choose your work account and tap Automatic replies. Whichever you use, the reply is stored with your account, so turning it on in one place turns it on everywhere.",
      ],
    },
    {
      title: "How to set an out of office message in Gmail",
      body: [
        "In Gmail, click the gear icon, then See all settings. On the General tab, scroll down to Vacation responder, switch it on, set the first and last day, add a subject such as \"Out of office until 3 November\", paste your message, and click Save changes at the bottom.",
        "Gmail sends the auto-reply once to each person in a four-day period, not to every message, so people who write twice won't get it twice. You can also choose to send it only to people in your contacts, or only to people in your organisation on a work account.",
      ],
    },
    {
      title: "Out of office in Slack and Microsoft Teams",
      body: [
        "Team chat doesn't send auto-replies, so a status does the job instead: it shows next to your name wherever people try to message you. In Slack, click your profile picture, choose Update your status, add an emoji and a short line like \"🌴 On holiday until 3 Nov\", and set it to clear when you're back. Pausing notifications for the same dates keeps your phone quiet too.",
        "In Microsoft Teams, click your profile picture and choose Set status message. Type your message and set when it should clear. The same dialog has a link to schedule out of office, which turns on your Outlook auto-reply and your Teams status together. The status from the generator above is short enough for both.",
      ],
    },
    {
      title: "What a good out of office message includes",
      items: [
        { title: "When you're back", body: "A date, not \"next week\". If you don't know yet, say you'll reply as soon as you're back." },
        { title: "Who can help", body: "A name, and an email if it's someone outside the conversation. Ask them first; nobody likes finding out they're covering from a customer." },
        { title: "Not too much detail", body: "\"Out of the office\" is enough. Where you are and why are nobody's business, and a holiday destination in an auto-reply tells strangers your home is empty." },
        { title: "No promises you won't keep", body: "\"I'll reply when I'm back\" is fine. \"I'll reply to every email\" after two weeks away usually isn't true." },
        { title: "Turn it off", body: "Set an end date in Outlook or Gmail, and a clear time on your chat status, so nobody is told you're away the day you're back." },
      ],
    },
  ],
  fit: {
    title: "Away notes, built into the office",
    body: "In TinyFloor, a virtual office for remote teams, a status note like \"🌴 On holiday until Monday\" sits on your name, so the team knows before they try to reach you, and it clears itself on the day. It runs in a browser tab, free for up to 3 people and $29 a month for the whole team.",
    cta: "Try the demo office",
  },
  faqTitle: "Common <em>questions.</em>",
  faq: [
    {
      q: "What should an out of office message say?",
      a: "That you're away, when you'll be back, and who to contact if it's urgent. For example: \"I'm out of the office until Monday 2 November. For anything urgent, please contact Ana Lima.\"",
    },
    {
      q: "How do I set an out of office message in Outlook?",
      a: "In the new Outlook or Outlook on the web: Settings, Account, Automatic replies. In classic Outlook for Windows: File, Automatic Replies. Turn it on, set the dates and paste your message.",
    },
    {
      q: "How do I set an out of office message in Gmail?",
      a: "Click the gear icon, See all settings, and on the General tab turn on Vacation responder. Set the dates, a subject and your message, then click Save changes.",
    },
    {
      q: "Should I say why I'm out of office?",
      a: "No. \"Out of the office\" is enough. Saying you're on holiday is common and fine, but you never need to give details, especially about being unwell.",
    },
    {
      q: "What's a professional out of office message?",
      a: "\"Thank you for your email. I'm currently out of the office until Monday 2 November and will respond when I return. For anything urgent, please contact Ana Lima (ana@example.com).\"",
    },
    {
      q: "Is this out of office generator free?",
      a: "Yes, and it runs entirely in your browser: the names, dates and emails you type are never sent anywhere. Copy the message into Outlook, Gmail, Slack or Teams.",
    },
    {
      q: "What does OOO mean?",
      a: "OOO stands for out of office. People write it in calendars, chat statuses and email subjects, as in \"OOO until Monday\", to say they're away and won't reply straight away.",
    },
    {
      q: "Is an automatic reply the same as an out of office message?",
      a: "Yes. Automatic replies is what Outlook calls its out of office message, and Gmail calls it the vacation responder. They all send one reply to people who write while you're away.",
    },
    {
      q: "How do I set out of office in Teams?",
      a: "Click your profile picture, choose Set status message, then Schedule out of office. Turn on automatic replies, write your message and set the dates. Teams shows you as out of office, and Outlook sends the same message to anyone who emails you.",
    },
    {
      q: "How do I set out of office in Outlook on my phone?",
      a: "In the Outlook app, tap your profile picture, then the Settings gear, choose your work account and tap Automatic replies. Switch it on, write your message and set the dates.",
    },
  ],
};

export default en;
