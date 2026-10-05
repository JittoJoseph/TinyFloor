# 19. Help and feedback

Issues raised with the TinyFloor team from inside the app, as tickets in
Chat. It needs only D1 tables and a few API routes: there are no sockets and
no Durable Objects, and clients ask for news now and then.

## For the people in the office

- **Raising an issue.** The "?" at the foot of the rail, above leave and
  settings, opens a small card beside it. On a phone, "Help and feedback" in
  your menu opens the card above the bottom bar.
  - The card has no backdrop and opens at once.
  - It has one box: Enter makes a new line, and Ctrl or ⌘ with Enter sends.
  - Escape or a click elsewhere puts it away and keeps what you typed.
- **Where the ticket goes.** Sending opens the new ticket in Chat, under
  "TinyFloor support" at the bottom of the sidebar. The ticket is named after
  the first line of what you wrote.
- **What a ticket looks like.** It's an ordinary conversation:
  - The team's answers sit under the TinyFloor mark, with no colour of their
    own.
  - The composer has no image or emoji buttons.
  - The header shows Open or Closed.
- **Who sees it.**
  - In an office, everyone there sees the office's tickets in Chat and can add
    to them. The card and the ticket both say so.
  - In the demo office, where strangers mix, a ticket is its opener's alone.
  - An office can have several tickets open at once.
- **Unread.** Once you have opened a ticket, anything new in it from the team
  or a teammate counts as unread. The count shows on the ticket in the
  sidebar and adds to Chat's count on the rail. People who never opened a
  ticket get no count for it.
- **Closing.** When the team closes a ticket, it says so and takes no more
  messages. It stays in Chat until you have read the last of it, then it goes.
  To raise the problem again, open a new ticket.
- **How often it's read.**
  - An open ticket: every 5 seconds.
  - The ticket list, while Chat is open: every 15 seconds.
  - The ticket list, otherwise: every 2 minutes, and on coming back to the
    tab.
  - Nothing is read while the tab is out of view.
- **Context.** Each message carries the page, the language, the screen size,
  the browser, the country, and a link to that moment in the PostHog
  recording (when PostHog is on). Limit: 30 messages an hour per person.

## For the team

- **Discord.** Everything people write goes to the team's Discord, through
  the realtime worker's existing webhook (`helpMessage`, like
  `officeCreated`).
  - A new ticket is "New in Help: {office}"; a reply in one is "Help:
    {office}".
  - Each post has who wrote it, from where, the text (up to 1,500 characters)
    and a link to the admin page.
- **Admin → Help is an inbox.**
  - The left column lists every office with tickets. Demo office visitors are
    listed by name, and offices that have since closed are listed too. Those
    with unread messages come first, with their count, and the tab shows the
    total.
  - Picking an office shows its tickets, open ones first. Each ticket is a
    conversation, with where each message came from and "New" on what you
    hadn't read. Opening an office marks everything in it read.
- **Answering.** Reply (Ctrl+Enter), Reply and close, Close issue, or Reopen.
  A reply counts as unread in their Chat.
- **What's kept.** A ticket keeps its office's name and each writer's name and
  email as they were. It outlives a closed office or a guest's account. The
  daily clean-up deletes tickets a year after they were closed.

## Where it lives

- `worker-api/migrations/0015_help_tickets.sql`: `help_tickets`,
  `help_messages` and `help_reads`. 0013 and 0014 were earlier versions and
  only ever held test data.
- `worker-api/src/help.ts`: `/v1/help` for the office side, and
  `/v1/admin/help` for the team.
- `worker-realtime/src/discord.ts` and `admin.ts`: the Discord message.
- In `frontend-nextjs/src`:
  - `lib/help.ts`: the tickets, the one on screen, and the unread count.
  - `components/app/HelpCompose.tsx`: the card. AppShell mounts it.
  - `components/app/HelpTicket.tsx`: a ticket in Chat, built from Chat's own
    `Conversation` and `Composer`.
  - `ChatView`: the "TinyFloor support" section.
  - `app/[locale]/(app)/admin/Help.tsx`: the inbox.
