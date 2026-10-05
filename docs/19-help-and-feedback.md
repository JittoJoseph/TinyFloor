# 19. Help and feedback

A conversation between an office and the TinyFloor team, opened from inside
the app. It runs on D1 tables and a few API routes. Clients poll for new
messages. It needs no sockets or Durable Objects.

## Who talks to whom

- **An office has one conversation, shared by everyone in it.** Anyone there
  can read it and add to it. The dialog says so: "Only people in {office} and
  the TinyFloor team see this."
- **In the demo office, each visitor has their own.** Strangers mix there, so
  nobody sees anyone else's. Guests can write too.

## For the people in the office

- A quiet "?" sits at the foot of the rail, above leave and settings. On a
  phone, it's "Help and feedback" in your menu. Nothing else in the office
  mentions it: an office belongs to its team.
- **Before anything is said,** the dialog is one roomy box. Enter is a new
  line, and Ctrl or ⌘ with Enter sends.
- **After that, it's a chat.** Messages show newest at the bottom: yours on
  the right, the team's marked as the TinyFloor team, and teammates' with
  their names. A small composer sits underneath; Enter sends and Shift+Enter
  adds a new line.
- **Unread.** Once you have taken part (written, or opened the dialog with a
  conversation in it), new messages from the team or a teammate since you
  last looked count as unread. The count shows on the "?". On a phone, it
  shows on the menu item, with a dot on your face. People who never used it
  get no count, so it stays out of their way. Opening the dialog reads them.
- **Polling.** The conversation is read every 6 seconds while the dialog is
  open, and every 2 minutes while it's closed. It's read again on coming back
  to the tab, and only while the tab is in view.
- **Context.** Each message carries the page, the language, the screen size,
  the browser, the country, and a link to that moment in the PostHog
  recording (when PostHog is on).
- **Limit.** 30 messages an hour per person.

## For the team

- **Discord.** Every message from an office or a visitor goes to the team's
  Discord, through the realtime worker's existing webhook (`helpMessage`,
  like `officeCreated`). The embed has the office, who wrote it and from
  where, the text (up to 1,500 characters), and a link to the admin page.
- **Admin → Help.** It opens on "Waiting on us": open conversations where the
  last word is theirs. The tab shows that count. "All" shows everything.
  Each conversation shows who said what, their email, and the context under
  each of their messages.
- **Actions.** Reply (Ctrl+Enter), Reply and mark done, Mark done, or Not
  done. Anything new from the office opens a conversation again.
- **What's kept.** A conversation keeps its office's name and each writer's
  name and email as they were. It outlives a closed office or a guest's
  account. Conversations marked done and quiet for a year are deleted by the
  daily clean-up.

## Where it lives

- `worker-api/migrations/0014_help_threads.sql`: `help_threads`,
  `help_messages` and `help_reads`. 0013 was the first version and only ever
  held test data.
- `worker-api/src/help.ts`: `/v1/help` for the office side, and
  `/v1/admin/help` for the team.
- `worker-realtime/src/discord.ts` and `admin.ts`: the Discord message.
- `frontend-nextjs/src/lib/help.ts` holds the conversation and the unread
  count. `components/app/HelpDialog.tsx` is the dialog. `AppShell` mounts the
  dialog and the rail button, and `YouMenu` has the phone menu item.
- `app/[locale]/(app)/admin/Help.tsx`: the admin tab.
