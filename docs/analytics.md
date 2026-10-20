# Analytics: what we measure in PostHog, and what we never see

PostHog project 626446 (us.posthog.com). Set up 12 October 2026. The code is
`web-shared/src/lib/analytics.ts`; this is what isn't obvious from it.

## The one number

**Teams together: offices where three or more people were on the floor on the
same day.** Retention in a team tool is a team property (`product.md`): one
person trying an empty floor leaves; a team that's moved in stays. Everything
on the TinyFloor dashboard leads to or explains that number.

## Events

Few on purpose; each answers a question. Inside an office every event also
carries `place: office`, `office_id` and `office_plan`, so questions can be
asked about teams, not only people. In the demo office, `place: lobby`.

| Event | Properties | Answers |
|---|---|---|
| `account_signed_up` | `sign_in_method` (google, google_one_tap, password) | Who's new, and how they came in. A Google sign-in that creates an account counts here, not as a sign-in. |
| `account_signed_in` | | |
| `demo_cta_clicked` | `placement` (hero, closing, faq, guide, tool, nav, footer, page) | A link into the demo office was clicked on the marketing site, and where on the page. The first step of the demo's funnel. |
| `door_viewed` | `door` (demo, introduce, invite), `step` on invites | Someone reached a door: the demo office's, a new account's first one, or an invitation's. Once per door. |
| `door_name_entered` | `door` (introduce, invite), `name` (suggested, typed) | Past the name step of a two-step door. The demo's door has one step, so it has none. |
| `guest_session_started` | `door`, `name` (suggested, remembered, typed), `character` (offered, chosen) | Walked in at the demo office's door, and whether they kept the name and character it offered. |
| `door_failed` | `door`, `reason` | The demo door couldn't let them in (the bot check, the network, too many tries). |
| `profile_introduced` | `character` (offered, chosen) | A new account got past saying who it is, to its first door. |
| `office_created` | `office_id` | |
| `invite_opened` | | The invite dialog opened; against `invite_sent`, whether it loses people. |
| `invite_sent` | `channel` (link, message, email, share) | Does the maker bring the team? |
| `office_invite_accepted` | `office_id`, `character` (offered, chosen, account) | A teammate arrived. |
| `office_joined_by_domain` | `office_id`, `members` | A colleague found their team's office by their work email and walked in, without the link. |
| `office_join_requested` | `office_id`, `members` | They found it, but its admins let people in: they asked. |
| `floor_entered` | `people_here`, `load_ms` | Who shows up, and to whom. The base of the one number. `load_ms` is the wait from the floor being asked for to it showing. |
| `floor_abandoned` | `waited_ms` | Left before the floor ever showed. Missed if PostHog hadn't loaded yet (it loads once the page is idle). |
| `floor_failed` | `reason` (full, replaced, closed, revoked, signedOut, notFound) | The room turned them away. |
| `call_connected`, `meeting_joined` | `people_here` on meetings | Do people actually talk? |
| `desk_claimed`, `wave_sent` | | Are desks and waves used? |
| `message_sent` | `kind` (dm, channel), `picture` | Is chat used? Never the words. |
| `upgrade_opened` | `reason` (full, hours, trial, plans) | The Pro offer was shown, and what brought it up. |
| `checkout_opened`, `plan_bought` | `from` (create, billing, upgrade:<why it opened>) | Where buying starts, and whether it finishes. |

## What recordings show, and what they hide

Session recordings show the pages as people see them, so we can watch where
someone gets stuck. Hidden: everything typed into a field, and anything marked
`data-ph-mask` (message text, emails, the invite link, help tickets, every
admin page) or `ph-no-capture` (chat pictures). An invite link is a key to an
office, so its code is also scrubbed from every URL PostHog keeps. The floor
itself is a canvas, recorded as two small frames a second (the whiteboard,
also a canvas, never is). Until 12 October the whole app was masked, which made recordings useless.

## Keeping test traffic out

Every event carries `environment` (production, preview, development, from the
hostname). The project's "Filter out internal and test users" is on by default
and keeps only the live hosts (`$host` is www or app.tinyfloor.com), plus the
"Internal / Test users" cohort. Local development never reports its errors:
they're mid-edit noise, and they used to fill Error tracking and Discord.

## Errors

Error tracking alerts Discord (#tiny-posthog) when an error is new or comes
back after being resolved. Two found from it and fixed on 12 October:

- **Chrome's "Translate this page" crashed React** (a reader in Turkish on the
  sign-in page): it swaps text nodes, and React then fails to remove a node
  that moved. Patched in `web-shared/src/shell/instrumentation-client.ts`
  (facebook/react#11538).
- **Browsers without WebRTC** (Safari in Lockdown Mode) crashed on joining a
  meeting; they now get a message.

## Where people stop (first read, 15 October)

The "Funnel: where people stop" dashboard follows one person from the site to
a team that pays. Counted from 12 October, when the team events began:

- **The site to the app is the biggest leak.** Over 30 days, 528 people saw
  the site and 26 opened the app (5%); since 12 October, 39 and 17.
- **The demo office's door loses most of its visitors.** 127 reached it in
  30 days and 37 walked in (29%); since 12 October, 17 and 8. Everyone who
  walked in reached the floor.
- **Office floors that never showed** (3 of 12) were seconds-long visits with
  no other events, more like link previews than a broken floor;
  `floor_abandoned` now says how long anyone waited.
- **Invites:** 3 people opened an invite link, 1 joined.

## Ad blockers

On 15 October an ad blocker in a team member's Chrome was hiding them
entirely: it blocked events to `us.i.posthog.com/i/v0/e/` and any file named
`posthog-recorder.js`, wherever it was served from, but let PostHog's flags
and other scripts through. Visitors running one were invisible the same way.

So both sites reach PostHog through their own address, `/tf/...`, which the
middleware passes on to PostHog with the visitor's IP (so their country stays
theirs) and none of our cookies (`web-shared/src/lib/edge.ts`). There's no
separate service for it. The recorder is bundled with the analytics code
rather than fetched by that name. Next's trailing-slash redirect is off,
because PostHog's paths end in `/`; the middleware strips slashes from every
other address instead. A laptop still talks to PostHog directly.

## The demo office's door, one step (20 October)

Of the people who reached the demo office's door, 29% walked in, and every
one of them reached the floor: the door was the leak, not the floor. It asked
for a name, then a character. Now a name is enough: someone new walks in as
a character picked at random, someone back as the one they had, and choosing
is a link under the button. It also said "Nobody inside yet, be the first",
which made an empty office sound like a failure; it says it's quiet, so you
can look around. Watch the door's walk-in rate against the 29%.

## The demo door, one press; and the onboarding funnels (20 October)

The demo office's door now offers everything: a name (a common American
first name, with a die for another, or the one they used last time) and a
character picked at random, shown beside the name and a tap away from
choosing. One press and they're on the floor. A separate character step
would only add a press for something already chosen, so it stays a choice,
not a step. Offices still ask for a real name and a character, the
character pre-picked at random, so a team that presses straight through
doesn't arrive as eight of the same one. The button each of these doors
wants pressed, and the demo office's button on the home page, has a glare
crossing it every few seconds.

Each way in now has a funnel, on the Onboarding dashboard in PostHog:

- **Demo office, site to floor:** `demo_cta_clicked` → `door_viewed` (demo)
  → `guest_session_started` (demo) → `floor_entered` (lobby), within an hour.
- **Demo door:** the same without the click, for everyone who reached the
  door however they came.
- **New account:** `account_signed_up` → `door_viewed` (introduce) →
  `door_name_entered` → `profile_introduced` → `floor_entered` (office),
  within a day.
- **Invite link:** `door_viewed` (invite) → `door_name_entered` (optional:
  people with an account skip it) → `office_invite_accepted` →
  `floor_entered` (office).

Outcome events that already existed are the last step of each door rather
than a new "pressed the button" event beside them, so nothing is counted
twice. `demo_cta_clicked` is one listener for the whole marketing site, so a
new link into the demo office is counted without anyone remembering to. In
development it doesn't reach PostHog: events sent after the page's first
ones were refused (503) when the browser went to PostHog directly; the live
and preview sites go through the relay.
