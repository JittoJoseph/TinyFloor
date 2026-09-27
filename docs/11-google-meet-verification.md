# 11. Google Meet: what's built, and getting it verified

Built on 27 September 2026. The Meetings view is a new place on the rail; the
meeting table on the floor is unchanged (see `10-calls-and-meetings.md` for
where this is heading).

## What it does

- **Meetings** on the office's rail (`/office/:id/meetings`): the office's
  Google Meet room, **Join** (opens Meet in its own tab, the same tab each
  time), **Copy link**, and who is in the meeting right now, refreshed every
  15 seconds while the page is open.
- An admin makes the room. The first time, Google's popup asks for one
  permission, `meetings.space.created`, on top of what they gave at sign-in.
  It is never asked at sign-in, and members never need it.
- If the box is unticked, Google gives no refresh token, the permission is taken
  back at myaccount.google.com, or Meet refuses the token: our copy is dropped
  and the page asks again, with the reason.
- Who is in the room is read with the grant of the admin who made it, and only
  while they are still in the office. When they leave, or take the permission
  back, the page says so and offers admins **Make a new room**.
- Admins can replace or remove the room. The permission line at the foot of the
  page shows the connected Google account and **Take it back** (deletes it here,
  revokes it at Google).

## How it's built

| Piece | Where |
|---|---|
| Routes, Google token and Meet calls | `worker-api/src/meet.ts` |
| Token sealing (AES-256-GCM, `GOOGLE_TOKEN_KEY`) | `worker-api/src/crypto.ts` |
| Tables `google_grants`, `meeting_rooms` | `worker-api/migrations/0007_google_meet.sql` |
| Tests (20, fake Google) | `worker-api/test/meet.test.ts` |
| The view | `frontend-nextjs/src/components/app/MeetingsView.tsx` |
| Strings, all 18 languages | `messages/*.json` → `office.meetings`, `shell.meetings` |
| Privacy policy, "Google user data" | `frontend-nextjs/src/components/legal/privacy.tsx` |

| Route | Who |
|---|---|
| `GET /v1/me/google/meet` | account: is Meet allowed, as which Google account |
| `POST /v1/me/google/meet {code}` | account: keep the grant from Google's popup |
| `DELETE /v1/me/google/meet` | account: take it back, here and at Google |
| `GET /v1/offices/:id/meeting` | member: the room, who is in it (or why we can't tell), your grant |
| `POST /v1/offices/:id/meeting {replace?}` | admin: make the room, or a new one in its place |
| `DELETE /v1/offices/:id/meeting` | admin: remove it |

Who is in a room is cached for 15 seconds per office in Cloudflare's cache, so
a busy office costs Google one read per 15 seconds, not one per member.

**Never change `GOOGLE_TOKEN_KEY` casually.** Every stored grant is sealed with
it. If it changes, grants can't be opened: each admin is asked to allow Google
Meet again (handled, tested), but everyone has to do it.

## Set up already

- [x] Google Meet REST API enabled in the `tinyfloor` Cloud project
- [x] Scope `meetings.space.created` added under Data access
- [x] Branding: name, logo, home page, privacy, terms, `tinyfloor.com`; verified and published
- [x] Publishing status: **In production**
- [x] `tinyfloor.com` verified in Search Console (same Google account as the project)
- [x] One OAuth client, one secret, on live, preview and local
- [x] `GOOGLE_TOKEN_KEY` set on `tinyfloor-api` and `tinyfloor-api-preview` (each its own)
- [x] Privacy policy: "Google user data" section with the Limited Use statement

## Shipping it

1. Merge to `dev`: Workers Builds deploys preview and runs migration `0007`.
   Try it on preview.tinyfloor.com.
2. Merge to `master`: live, and migration `0007` on the live database.
3. Record the video on **www.tinyfloor.com** (below), upload it to YouTube as
   unlisted, and submit.

Until Google approves, admins see an "unverified app" screen when they allow
Meet, and at most 100 Google accounts can grant it. Sign-in is unaffected.

## The submission

Cloud console → Google Auth Platform → Verification centre → **Prepare for
verification**. It asks for a justification per sensitive scope, one video
link, and anything else for the reviewer.

### Scope justification (`meetings.space.created`)

> TinyFloor is a virtual office for remote teams. Each office has a Meetings
> page where its members see the office's meeting room and who is in it right
> now. An office admin can make that room a Google Meet: when they click "Make
> a Google Meet room", we request this scope and call spaces.create to create
> one Meet space for the office, whose link every member can join from. While
> the page is open we call conferenceRecords.list and
> conferenceRecords.participants.list for that space only, to show members the
> display names of the people currently in the meeting.
>
> We need nothing broader: this scope reaches only spaces our app created,
> which is exactly the one room per office we make. We do not read the admin's
> other meetings, calendar or any other Google data, and we never access
> meeting audio, video, chat, recordings or transcripts. Tokens are encrypted
> at rest; participant names are not stored (cached up to 15 seconds). The
> admin can revoke the permission from the Meetings page at any time, which
> deletes the tokens and revokes them at Google.

### Additional info for the reviewer

> Anyone can create an account at https://www.tinyfloor.com (Sign in with
> Google, or email). To see the scope in use: sign in, click "Make your
> office", open "Meetings" in the left rail, click "Make a Google Meet room",
> and grant the permission. The room's link appears with "Join the meeting";
> join it in Meet and, within 15 seconds, you appear under "In the meeting
> now". "Take it back" at the foot of the page revokes the permission. The
> privacy policy's "Google user data" section is at
> https://www.tinyfloor.com/privacy#google.

### The demo video (about 2–3 minutes)

Google wants the real app, the consent screen in English with the app name,
the **client ID visible in the address bar** during consent, and every use of
the scope. Record in a browser with the address bar showing, in English.

1. **The app.** www.tinyfloor.com home page, then signed in: your office on
   the floor. Say what TinyFloor is in one line.
2. **Where it's used.** Click **Meetings** in the rail. Show the empty room and
   the line "Google will ask you to let TinyFloor create Meet rooms for you".
3. **Consent.** Click **Make a Google Meet room**. In Google's popup, pick the
   account, then pause on the consent screen: show the app name TinyFloor, the
   permission text, and the popup's address bar with `client_id=523187100801-
   n4t184tjomdgrcf41u6k57egldkbf72k.apps.googleusercontent.com` (click into
   the address bar or zoom so it can be read). Tick the box and Continue.
4. **Create.** The room appears: its meet.google.com link, "Made by you".
   (This is `spaces.create`.)
5. **Read.** Click **Join the meeting**, join in the Meet tab (with a second
   account or phone too, if you can). Back in TinyFloor, wait for "In the
   meeting now" to list the people. (This is the participants read.) Leave
   Meet and show the list emptying.
6. **Control.** At the foot of the page show "Google Meet permission: allowed,
   as ..." and click **Take it back**; show it now says "not allowed".
7. **Policy.** Open www.tinyfloor.com/privacy#google and scroll through the
   Google user data section, ending on Limited Use.

Google usually replies by email to the contact address within a few days,
sometimes asking for a clearer video. Reply in that same thread.
