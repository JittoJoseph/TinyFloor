# 19. Help and feedback

How someone in an office or the demo office tells the TinyFloor team that
something isn't working, and how the team answers.

## For the person sending it

- A quiet "?" at the foot of the rail, above leave and settings. On a phone
  it's "Help and feedback" in your menu. Nothing else in the office mentions
  it: an office belongs to its team.
- One roomy box. Enter is a new line; Ctrl or ⌘ with Enter sends. The dialog
  says plainly that only the TinyFloor team sees it, not the office.
- What goes with it, so nobody has to describe their setup: the page, the
  office, the language, the screen size, the browser, the country, and a link
  to the PostHog recording of that moment (when PostHog is on).
- Under the box: what you've sent, each with the team's replies and a line
  to add more. A report stays there while it's open. Once it's closed, it
  stays until you've seen it closed, then it goes.
- A team reply puts a dot on the "?" (and on the menu item on a phone). The
  reports are read when you walk in and when you come back to the tab, at
  most once a minute. Opening the dialog marks them seen.
- Each report is private to the person who sent it. Others in the office
  never see it.
- Limits: 10 reports a day and 30 follow-ups an hour, per person.

## For the team

- Admin, Reports tab. The tab shows how many are open. Each report shows
  who sent it, their email, the office, the conversation so far, and the
  context. "Waiting on us" marks open reports where the last message is
  theirs.
- Reply (they see it in Help and feedback), Reply and close, Close, or Reopen.
- A report keeps the sender's name, email and office name as they were. If a
  guest's account goes or the office closes, the report stays.
- Closed reports are deleted a year after closing (the daily clean-up).

## Where it lives

- `worker-api/migrations/0013_reports.sql`: `reports` and `report_messages`.
  The report itself is the first message.
- `worker-api/src/reports.ts`: `/v1/reports` for the sender, and
  `/v1/admin/reports` for the team.
- `frontend-nextjs/src/lib/help.ts`: the dialog's state and the dot.
  `components/app/HelpDialog.tsx`: the dialog. `AppShell` mounts the dialog
  and the rail button. `YouMenu` holds the phone menu item.
- `app/[locale]/(app)/admin/Reports.tsx`: the admin tab.
