# 06. The app's design system

Everything a signed-in person or a lobby visitor sees — the dashboard, the door,
the office shell, the floor's chrome, chat, people, settings, sign-in — moves to
one design system. The landing pages keep theirs for now.

The current look (warm grey Braun panels, Nunito, letter avatars, rows that run
the width of the screen) reads as a prototype. The goal is a product that feels
made: quiet surfaces, one accent used sparingly, motion that explains what
happened, and people who look like people.

## Principles

1. **Content decides the layout.** A name is twenty characters; it gets a chip,
   not a 1200px row. Lists of people are grids of cards or columns of pills.
   Messages get a readable measure. Nothing stretches because the screen did.
2. **One accent, spent on meaning.** Tangerine marks the unread, the focused,
   the live. Primary actions are ink on canvas, not coloured.
3. **Chrome recedes, the floor and the conversation lead.** Surfaces are one
   step off the canvas, hairline borders, no drop shadows except on things that
   float.
4. **Motion is feedback.** Springs on press, a pill that glides to the active
   item, panels that grow out of their trigger. Nothing loops, and
   `prefers-reduced-motion` turns movement into fades.
5. **Light, dark, and system by default.** Every colour is a token; no
   component knows which theme it is in.

## What it is built from

| Layer | Choice | Weight |
|---|---|---|
| Styling | Tailwind 4 utilities on theme tokens | no runtime |
| Components | [beUI](https://beui.dev) free components, copied in through its shadcn registry and owned from then on | only what we use |
| Motion | `motion` (the library beUI is built on) | ~30 KB gz, app routes only |
| Class merging | `clsx` + `tailwind-merge` (`cn()`) | ~5 KB |
| Icons | `lucide-react`, per icon | as now |
| Font | Geist (via `next/font`), app routes only | self-hosted |

No beUI Pro. The free registry covers what an app needs — buttons, tooltip,
tabs, switch, input, checkbox, menus, popover, modal, drawer, bottom sheet,
toast stack, dock, command palette, message and composer primitives — and every
one of them needs only `motion`, `clsx`, `tailwind-merge` and `lucide-react`.

Components land in `src/components/motion/` exactly as the registry ships them,
restyled onto our tokens. Our own composites (avatar, person chip, shell) live
in `src/components/ui/` and `src/components/app/`. The landing pages import none
of it, so they carry none of the weight.

## Tokens

Defined once in `globals.css` as CSS variables, exposed to Tailwind with
`@theme inline`, swapped by a `.dark` class on `<html>`.

| Token | Light | Dark | Used for |
|---|---|---|---|
| `canvas` | `#fafaf9` | `#0e0e10` | the page |
| `rail` | `#f1f1ef` | `#09090b` | the rail and the app frame |
| `surface` | `#ffffff` | `#161618` | columns, cards, panels |
| `raised` | `#f4f4f3` | `#1e1e21` | inputs, hovered rows, chips |
| `line` | `black / 8%` | `white / 8%` | every border |
| `ink` | `#18181b` | `#ededef` | text, primary buttons |
| `muted` | `#63636b` | `#a1a1aa` | secondary text |
| `faint` | `#9d9da5` | `#6b6b73` | timestamps, placeholders |
| `accent` | `#ff5a1f` | `#ff6a33` | unread, focus, live |
| `ok` / `warn` / `bad` | green / amber / red | brighter in dark | presence and states |

Type: Geist, 13px for dense UI, 14px for reading (messages), 15/20/28px for
headings. Radii: `full` for buttons, chips and people pills; `2xl` for cards and
panels; `xl` for inputs.

### Theme

`system` by default, `light` and `dark` by choice, stored in `localStorage`
(`tf-theme`). A four-line script in the app layout sets the class before first
paint, so there is no flash. The choice lives in the avatar menu. Only the app
routes apply it; the landing pages stay light until they get the same treatment.

## People have faces, and we store none of them

No uploads, no avatar URLs, no stored colours. Every person's face is generated
on every client from their **user id**, which every person has (guests too) and
which never changes:

- A hash of the id picks a base hue and two neighbours 25–60° away, and three
  positions for soft radial blooms.
- The orb is layered CSS gradients — three blooms over a base, a specular
  highlight top-left and a soft inner shadow bottom-right — so it reads as a
  fluid sphere, not a flat linear gradient.
- Same id, same orb, on every screen of every person. Nothing to fetch, nothing
  to cache, nothing to delete when an account goes.

Presence sits on the orb as a dot ringed in the surface colour: green on the
floor, amber away, nothing when gone. Offices get the same treatment as a
rounded square, seeded by the office id, so the rail's office mark is never a
letter.

**Where people appear, they appear as pills or cards**, following the reference:
orb, name, optional second line, optional trailing control — compact, never
full width.

## The shell

```
desktop                                   phone
┌────┬────────────┬─────────────────────┐  ┌─────────────────────┐
│ ◉  │ context    │                     │  │                     │
│ ▦  │ column     │      the view       │  │   the view, or the  │
│ 💬 │ (260px)    │                     │  │   column, full size │
│ 👥 │            │                     │  │                     │
│    ├────────────┤                     │  ├─────────────────────┤
│ ◐  │ presence   │                     │  │ ▦   💬   👥   ◐     │
└────┴────────────┴─────────────────────┘  └─────────────────────┘
```

- **Rail (64px):** office mark (switcher menu), Floor, Chat, People; you at the
  bottom (status, theme, office settings, account, all offices, sign out).
  Tooltips on every icon; a pill glides to the active one.
- **The same shell runs the public lobby.** Floor, Chat (the lobby's live
  conversation, with the image button saying images come with a paid office),
  People (who is here now). Your menu offers an account instead of settings.
- **Phones:** the rail becomes a bottom dock with the same destinations; the
  column is the screen and a picked item pushes over it.

### The floor

The map gets the whole view. Floating chrome only:

- top left, a chip: connection state and a stack of who is here — press it for
  the people panel;
- top right, **Invite**;
- bottom centre, the dock: mic, camera, and — only in a call — screen share,
  speaker and hang up; then devices.

In an office the floor has no separate chat: the rail's Chat is the chat, and a
new message shows as a toast over the floor that opens it. In the lobby the
floor's live chat *is* the Chat view.

### Chat (Slack's vocabulary, none of its cost)

- Column: office header with its menu, **Jump to…** (⌘K), *Channels*
  (collapsible, new channel), *Direct messages* listing **every member**, even
  ones you have never written to — people with recent messages first, then
  everyone else alphabetically — each with face and presence, bold when unread,
  a count when there is one. An **Invite people** row at the end.
- Header: `# channel` or the person, members' faces, count.
- Messages: the channel intro at the top ("This is the very beginning of
  #general"), day dividers (Today, Yesterday, dates), a *New* divider at the
  first unread, grouped runs under one face and name, hover actions (react,
  copy), reaction pills with counts, yours highlighted; click a face or name for
  a profile card with **Message**.
- Composer: bordered box, `Message #general`, Enter sends, Shift+Enter breaks,
  image button (paid offices), a jump-to-latest button when scrolled up.
- Presence comes from the floor we are already connected to — no extra socket,
  no typing indicators, nothing that costs a message per keystroke.

### People

Seats as a meter (`2 of 3 seats`), **Invite** as the primary action, then tabs:
*Members* as a grid of cards (face, name, role, email, where they are, Message,
admin menu), *Invitations*, *Guest links*.

### Dashboard

A greeting, then office cards: the floor thumbnail with a live "3 on the floor"
pill, name, members' faces, seats used, your role. A card to create an office
and one for the public lobby. The same top bar and menu as everywhere else.

### Doors and forms

Sign-in, the door (name, character, mic and camera), invitations, creating an
office: one centred panel on the canvas, the pixel preview as its header, the
same inputs and buttons as the app.

## Motion budget

| Where | What |
|---|---|
| Buttons, rail, dock | spring press, gliding active pill |
| Menus, popovers, tooltips | grow from the trigger, blur-fade |
| Dialogs, sheets | scale-in on desktop, drag-to-dismiss sheet on phones |
| Chat | new messages rise in; counts roll |
| Toasts | stack, swipe to dismiss |

Everything uses transform and opacity only, and honours reduced motion.

## Order of work

1. Tokens, theme switch, font, `cn()`, the face generator.
2. beUI primitives in, restyled.
3. The shell (office and lobby) and the floor chrome.
4. Chat, people, settings.
5. Dashboard, the door, sign-in, invitations, create.
6. Every view looked at in the browser at phone, tablet and desktop, light and
   dark, and reworked until it holds together.
