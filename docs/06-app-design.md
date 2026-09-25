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

Defined once in `app/ui.css` as CSS variables, exposed to Tailwind with
`@theme inline`, swapped by a `.dark` class on `<html>`. The names are the
shadcn ones beUI is written against, so its components drop in unchanged, plus
a few of our own.

| Token | Light | Dark | Used for |
|---|---|---|---|
| `background` | `#fafaf8` | `#0f0f10` | the page, columns |
| `rail` | `#f0f0ec` | `#09090a` | the rail and the frame around the view |
| `card` | `#ffffff` | `#161617` | the view, cards, panels |
| `popover` | `#ffffff` | `#1b1b1d` | menus, profile cards |
| `muted` | `#f2f2ef` | `#202022` | hovered rows, chips, quiet fills |
| `border` / `border-strong` | ink at 9% / 18% | white at 8% / 16% | every hairline |
| `foreground` | `#1a1a18` | `#ededeb` | text, primary buttons |
| `muted-foreground` | `#6b6b65` | `#a0a09a` | secondary text |
| `faint` | `#a3a39c` | `#6a6a65` | timestamps, placeholders |
| `brand` | `#ff5a1f` | `#ff6b35` | unread, focus rings, the logo's live tile |
| `ok` / `warn` / `destructive` | green / amber / red | brighter in dark | presence and states |

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
│ 💬 │ (280px)    │                     │  │   column, full size │
│ 👥 │            │                     │  │                     │
│    ├────────────┤                     │  ├─────────────────────┤
│ ◐  │ presence   │                     │  │ ▦   💬   👥   ◐     │
└────┴────────────┴─────────────────────┘  └─────────────────────┘
```

- **Rail (72px):** office mark (switcher menu), Floor, Chat, People; Leave,
  Settings and you at the foot. Icons are Phosphor's (imported one file each), outlined
  at rest and filled where you are, with a small spring as they fill; a bar at
  the rail's edge glides between them. While a view's presence dock is on
  screen, the rail leaves your face out, so you are never shown twice.
- **The same shell runs the public lobby,** with every element an office has:
  channels (#general, #introductions, #feedback), *Add a channel*, direct
  messages, the image button and drag and drop. What only an office can do is
  still there, marked with a lock, and says so with an offer to make one. The
  lobby adds one destination, **Your office**, a page whose only job is to get
  a visitor to make an office of their own.
- **Phones:** the rail becomes a bottom dock with the same destinations; the
  column is the screen and a picked item pushes over it.

### The floor

The map gets the whole view. Floating chrome only:

- top left, a chip: connection state and a stack of who is here — press it for
  the people panel;
- top right, **Invite** — in the public lobby only; an office invites from
  People, where the chip's people list also points;
- bottom centre, the dock: the mic, then settings. In a call it adds the
  camera and screen share (off until you switch them on, and quiet while off:
  filled when on, never red when off), the speaker and hanging up.

The floor has no separate chat, in an office or in the lobby: the rail's Chat
is the chat, and a new message shows as a toast over the floor that opens it.

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
admin menu), and *Invitations*. An office is its members' alone: nobody visits
on a link, and an invite link makes a member.

### Dashboard

A greeting, then office cards: the floor thumbnail with a live "3 on the floor"
pill, name, members' faces, seats used, your role. A card to create an office
and one for the public lobby. The same top bar and menu as everywhere else.

### Calls

A call is a conversation, the way Slack's huddles are: it starts with voice,
and the camera and a shared screen are there to switch on when there is
something to see. Nothing about video is limited; it is simply never on by
itself.

- **Walking up to someone** shows their card beside them: face with presence,
  name, how they are (Available, Busy…), a quiet *Message*, and one bold
  **Call** pill with a phone. Already talking to them, the pill becomes a small
  green *On your call*.
- **The camera starts off in every call** and turns off when the call ends; it
  is not remembered. The microphone is. Only someone who switches their camera
  on sends video, and only while it is on. Meeting tables work the same way.
- **While nobody shows anything, a call is a strip** at the top of the floor:
  each person's face and name, an orange ring while they speak, a mic-off
  mark. The video cards (16:9, click to enlarge) appear only once a camera or
  a screen is on.
- **The ring, on both ends,** is in the bezel (below), laid over every view so
  it finds you in chat or settings too, and never blocking what you were doing:
  - *Being called*: the caller's face with a green pulse and "Calling you" on
    the bezel, their name in bold, and **Decline** and a green **Answer** set in
    the panel. Top centre on a desktop, a sheet from the bottom on a phone.
    Escape declines. Answering from another view keeps you there; the call
    band in the presence dock has the camera, screen and hang up.
  - *Calling*: a bezel pill with their face (a soft ripple), "Calling…" and
    their name, and a red hang up, at the top centre, where the strip appears
    once they pick up (under the floor's chips on a phone).
  - *How it ended*, for a moment, in the same pill: **Declined**, **Busy right
    now** or **No answer** to the caller; **Missed call** with **Message** to
    whoever missed it.

### Doors, rings and the bezel

The app's bold surface is its shell's: a black bezel, the way the rail frames
the view, with a panel set into it. beUI's own blocks do the same (a tray with
a card inset in it, surfaces told apart by fill rather than borders), and it is
what keeps a form from looking like every other form. The classes live in
`components/ui/bezel.ts`.

- **The bezel** is near-black (`#09090a`) in both themes, pure black with a
  hairline white ring in dark. Radius 30px for a door, 28px for a ring card,
  full for a pill; 6px of it shows around the panel.
- **What sits on the bezel** (the place's mark, name and blurb; the caller)
  wears the dark theme in either theme (`onBezel` puts `dark` on it), so every
  token already reads as light on black. Titles are bold (27px on a door,
  20px on a ring), chips keep their own look.
- **The panel** is the theme's card, 24px radius on a door (22px on a ring),
  holding what the place asks: fields, the character grid, the buttons. No rule
  between the header and the panel; the panel's edge is the rule.
- **Fields are wells:** filled with the rail's colour, no border, a faint
  outline on focus. Your character card is a well too.
- **Around a door:** the rail's colour, plain, and the two ways out (Back and
  TinyFloor) as black chips in light, the panel's grey in dark. On a phone the
  door rests at the bottom as a sheet; its height animates between steps.
- Every door (the lobby, an invitation, the first introduction, a room that
  ended, a link that doesn't work, a door still looking itself up) is
  `EntryShell` with an `EntryHeader` on the bezel and its body in the panel.
  Sign-in and creating an office are the other forms, in the app's frame.

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

## What is built

All of the above is in, for offices, the lobby and guest links. Where the code
differs from the plan, or adds to it:

- **beUI in use:** button, tooltip, tabs, select, morph popover (menus, profile
  cards), centre-morph modal (dialogs), dock (the floor's controls), toast
  stack (chat nudges over the floor), command palette (Jump to…, ⌘K) and
  loader. They live in `components/motion/` as the registry ships them; the
  React Compiler lint rules are scoped off for that folder only. Components we
  tried and did not need were removed rather than kept "just in case".
- **The popover grows sideways.** beUI's morph popover opened only up or down;
  it now also opens to the right, so menus on the rail clear it, and it keeps
  itself on screen on a phone.
- **Faces use OKLCH** over nine curated base hues. Neighbouring hues are kept
  out of the olive band, where a darker shade turns muddy. The seed is the
  user id; offices use their id for a rounded-square mark.
- **No floor has a chat panel of its own.** Chat is the rail's; a message you
  have not seen shows as a nudge over the floor with a Reply.
- **The lobby's chat is one conversation for every copy of the lobby,** kept
  seven days. Anyone inside can post, guests included, under the name they
  walked in with.
- **"Message" beside someone on the floor** opens your direct messages with
  them in an office; in the lobby it explains that messages come with an office.
- **Walk to.** A person on the floor has *Walk to* on their card in People and
  in chat: the view switches to the floor and your character pathfinds to
  them, the same way a click on a tile does.
- **Guests are the public lobby's alone.** An office is for its members; an
  invitation makes someone a member, once they have an account.
- **The presence dock** (under every column) follows Discord's: a call band
  when you are in one (who with, camera, screen, hang up), then you, your
  status, microphone, speaker and settings, on the rail's colour. Pressing
  yourself opens the same menu the rail's face does.
- **Your office** (lobby) is one screen: name an office inline, and a preview
  drawn like the app — its mark, channels and floor — follows what you type.
  Sign-up shows the same preview beside the form, wearing that name.
- **Settings are a view in the shell,** not a dialog: General (theme, language),
  Audio and video (devices, noise suppression, echo cancellation, mirror, and
  an experimental, off-by-default *stronger noise removal*: RNNoise in an
  AudioWorklet on the device, loaded only when a call opens the mic with it on,
  falling back to the plain mic if it cannot load),
  Notifications (message and arrival sounds, previews over the floor),
  Accessibility (reduce motion, battery saver) and, in an office, the office
  itself (name, seats, leave or close). Everything but the office's name is
  kept in the browser, so none of it costs a request.
- **Fixes found on the way:** typing in chat no longer walks your character
  (movement ignores keys while a text field has focus); text fields are 16px on
  phones so mobile browsers do not zoom on focus; the canvas is transparent so
  the space around the map follows the theme.

### Rules from the polish pass

- **Focus is ink, never the accent.** Fields show focus with a darker border
  and a faint ring; everything else gets one quiet outline on keyboard focus,
  instead of the browser's blue or the brand orange.
- **One big button per screen**, `ActionButton` in `components/ui/Action.tsx`,
  built on beUI's stateful button: it springs when pressed and morphs into a
  spinner while it waits, instead of swapping words.
- **Nothing is ever just empty.** Where there is no data yet, the screen says
  what will be there and offers the action that fills it: invite someone, say
  the first thing in a channel, greet someone you have never
  written to. Being alone on the floor shows your face beside empty places.
- **A reload keeps you inside.** Walking through a door is remembered for the
  tab, so refreshing lands you back on the floor; leaving through the app
  brings you to the door next time.

## The home page

Every marketing page (the home page and the use case and comparison pages in
`components/landing`) is built from the same pieces in `components/home/Blocks.tsx`:
the page shell, headings, the two ways in, the product preview, the questions
and the last ask. Styling is Tailwind utilities only; there is no page CSS. It uses the same tokens and the
same theme as the app: system by default, light or dark from its footer, set
before first paint by the root layout's script (which now covers "/").

- **Its own face.** The page's words are set in Nunito; the previews keep the
  app's face, so they read as the app. The app's own
  routes never change font.
- **Built around previews.** The hero is the app's shell in miniature with four
  tabs (floor, chat, people, a meeting), and each feature row shows the app
  doing that one thing. The previews are server-rendered markup drawn with the
  app's own pieces (faces, the office art and walking characters, the bar you
  get beside someone, call cards, member cards); none of them are screenshots,
  so they follow the theme and every language.
- **Honest.** No invented customers, logos, reviews or numbers. The trust
  section names the Cloudflare services TinyFloor actually runs on, and the
  plans say only what is true today; bigger plans are "coming soon" with no
  price or date.
- **Light.** The only scripts are the hero's tab switcher, the nav's signed-in
  check and the footer's theme switch. The FAQ is native `<details>` that
  slides open where the browser can animate to `auto`; the globe is SVG
  computed on the server; the language list is plain links.
- **Layout from the references:** Gleap for the nav (two menus that open into
  a wide panel with a dark card on the right), the centred hero and two-tone
  headlines; ElevenLabs for the hero's tabbed product panel on a plain tray;
  a bento of cards whose previews run off their bottom edge for the product
  itself; a light Cloudflare touch (one ruled sheet with corner marks) for
  everything else, and for the network card; ClickUp for the footer.
