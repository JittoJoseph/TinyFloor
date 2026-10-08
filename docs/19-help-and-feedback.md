# 19. Help and feedback

A ticket with the TinyFloor team, raised from inside the app and answered in
Chat. It needs only D1 tables and a few API routes: there are no sockets and
no Durable Objects, and clients ask for news now and then.

## One ticket at a time

- **An office has at most one open ticket.** Everyone in the office shares it
  and can add to it.
- **In the demo office,** where strangers mix, each visitor has their own.
- **Two unique indexes** keep it to one open ticket per office and per
  visitor. If two people write at once, both messages land in the same
  ticket.
- **When the team closes a ticket,** it leaves their Chat. The next message
  anyone writes opens a new one.

## For the people in the office

- **The "?" on the rail.** It sits at the foot of the rail, above leave and
  settings. On a phone, the same thing is "Help and feedback" in your menu.
  - **With no ticket open:** it opens a small card beside the rail (above the
    bottom bar on a phone). There's no backdrop, and Escape or a click
    elsewhere puts it away.
  - **The card:** one box, where Enter is a new line and Ctrl or ⌘ with Enter
    sends. It says who will see the ticket.
  - **With a ticket open:** it goes straight to the ticket in Chat.
- **The ticket in Chat.** It's "TinyFloor support", one row pinned to the
  bottom of the sidebar, below the channels and direct messages, and shown
  only while a ticket is open.
  - It's an ordinary conversation. The team's answers sit under the TinyFloor
    mark, with no colour of their own.
  - The composer has words only, and the header says Open or Closed.
- **Closed while you're on it:** it says so and takes nothing more. Leave it
  and it's gone.
- **Unread.** New messages from the team or a teammate count once you have
  had the ticket on screen. The count shows on the row and adds to Chat's
  count on the rail. Having the ticket on screen is what reads it.
- **Told at once.** When the team answers or closes a ticket, the API asks
  the realtime worker (over the existing binding, `helpChanged`) to say
  `help_changed` on the office's chat socket. For a demo office visitor, it
  goes only to their own sockets in the lobby's chat. The message carries
  nothing; the app reads the ticket again from the API, so the count shows
  within a second, like office chat. A teammate writing in the ticket does
  the same for the rest of the office.
- **Read now and then as well,** in case that word was missed while the
  socket was down.
  - The ticket on screen: every 5 seconds.
  - The open ticket, while Chat is open: every 15 seconds.
  - Otherwise: every 2 minutes, and on coming back to the tab.
  - Nothing is read while the tab is out of view.
- **Limit:** 30 messages an hour per person.

## For the team

- **Discord.** Everything people write goes to the team's Discord, through the
  realtime worker's existing webhook (`helpMessage`, like `officeCreated`).
  - A new ticket posts as "New in Help: {office}"; more in an open one posts
    as "Help: {office}".
  - Each post has who wrote it, from where, the text, and a link to the admin
    page.
- **Admin → Help.**
  - **Open and Closed.** Each tab lists tickets, the latest first, with the
    office, the last message and how many messages you haven't read. The Help
    tab shows the unread total.
  - **Picking a ticket** shows it beside the list. The header has who opened
    it, their email and when. It also shows, once, where the ticket was opened
    from: the browser, the screen, the language, the country, and a PostHog
    button to the recording of that moment.
  - **Opening a ticket reads it.** What was new stays marked "New" while it's
    open.
- **Answering.** Reply (Ctrl+Enter). Closing a ticket is out of the way, in
  the "⋯" menu, and asks first. Closed tickets are read-only.
- **What's kept.** A ticket keeps its office's name and its opener's name and
  email as they were, so it outlives a closed office or a guest's account. The
  daily clean-up deletes tickets a year after they were closed.

## Where it lives

- `worker-api/migrations/0013_help.sql`: `help_tickets`, `help_messages` and
  `help_reads`. Where the ticket was opened from is kept on the ticket, not on
  each message.
- `worker-api/src/help.ts` has the routes:
  - `GET /v1/help`: the open ticket where you are.
  - `POST /v1/help`: adds to the open ticket, or opens one.
  - `GET /v1/help/:id`: reads a ticket.
  - `/v1/admin/help`: the team's routes.
- `worker-realtime/src/discord.ts` and `admin.ts`: the Discord message.
- In `app-frontend/src`:
  - `lib/help.ts`: the open ticket, the one on screen, and its count.
  - `components/app/HelpCompose.tsx`: the card, mounted by AppShell.
  - `components/app/HelpTicket.tsx`: the ticket in Chat (at
    `/chat/~support`), built from Chat's own `Conversation` and `Composer`.
  - `app/[locale]/(app)/admin/Help.tsx`: the admin tab; closing a ticket is in its "⋯" menu and asks first.
