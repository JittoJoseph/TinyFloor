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
| `account_signed_in`, `guest_session_started` | | |
| `profile_introduced` | | A new account got past saying who it is, to its first door. |
| `office_created` | `office_id` | |
| `invite_opened` | | The invite dialog opened; against `invite_sent`, whether it loses people. |
| `invite_sent` | `channel` (link, message, email, share) | Does the maker bring the team? |
| `office_invite_accepted` | `office_id` | A teammate arrived. |
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
