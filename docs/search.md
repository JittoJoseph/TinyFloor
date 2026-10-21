# Search and AI assistants: what we found

From Search Console, Bing Webmaster Tools, Ahrefs' free tools, and asking the
assistants themselves, October 2026.

## What people search, and what to ignore

- **Category searches are mostly brand names.** Gather gets ~23K search
  visits a month, two thirds of it "gather"; its `/virtual-office` page gets
  about 117.
- **The searches worth having are specific:** "<competitor> alternative",
  "X vs Y", "gather town pricing", "best virtual office software" (many
  variants, several of them questions people type into assistants), and how
  to run a remote team. People still say "Gather Town", so the Gather page
  names it.
- **Competitors' traffic comes from guides, not product pages.** 97% of
  Kumospace's is one game-night post; Gather's non-brand traffic is "virtual
  team building activities" and "games for virtual meetings". Their links
  come the same way.
- **Traffic isn't the goal.** Our first clicks came from a study-room page in
  Japanese and Portuguese: people who will never pay. That page now redirects.

Leave alone:

| Query | Why |
|---|---|
| virtual office, virtual office space | People want a business address. |
| online office | Office supplies and Microsoft 365. |
| virtual meeting room (alone) | Zoom Rooms and Teams. |
| virtual coworking (solo), proximity chat | Body-doubling and gamers. |
| "free …" in titles | Students. |

## Where we stood (early October)

Google: 65 clicks and 1,060 impressions in 28 days, average position 25.
Pages rank for niche queries ("wonder me alternative", 8) but far down for the
ones that matter ("gather town alternative", 57). That's authority, not the
pages: Domain Rating 2.5, and the ~700 "linking sites" are spam directories
that link to every new domain.

## How assistants decide what to recommend

**An assistant recommends what its web search finds for the user's words.**
There is no separate "AI SEO". ChatGPT searches Bing, Claude searches Brave,
Gemini and AI Mode search Google, Perplexity its own index and others. Only
when asked about a product by name does it read that product's site.

Measured on 7 October 2026:

- For category questions, all four put SoWork first. Twelve of Perplexity's
  24 sources were SoWork's own blog posts ("Best Gather alternatives 2026"),
  and Google's AI Mode repeated SoWork's line almost word for word. The rest
  were vendor lists, G2, Product Hunt's alternatives page, and an old Reddit
  thread. TinyFloor was in none.
- Asked about TinyFloor by name: ChatGPT read the site and got everything
  right. Perplexity knew it only from the GitHub README and called it a
  developer project. Brave had indexed one page.
- **G2 had us under Residential Property Management** (the word "floor"),
  with property managers as alternatives.
- **Common Crawl**, which most models train on, had no tinyfloor.com pages in
  its last three snapshots (SoWork 127). It picks pages largely by inbound
  links.

What turned out not to matter: crawler access (nothing is blocked; the
"failed" AI fetches in Cloudflare were scanners using AI user agents to look
for `/.env`), `llms.txt` (63 requests in 30 days, none from an AI company),
and Wikidata (SoWork has none and is recommended everywhere).

So what moves it: being on the pages that get retrieved (G2, AlternativeTo,
Product Hunt, SaaSHub, Toolradar, vendor "best of" lists, Reddit, LinkedIn
articles, which rank on Bing), pages in the format that wins ("best virtual
office software", "Gather pricing"), and links, which also get us into
Common Crawl. The README matters too: assistants that read GitHub describe
what the README says first.

## Rules for comparison and pricing pages

- Every competitor price and limit comes from their own pricing page, with
  the month it was checked shown on the page. Recheck every few months.
- Leave a row out rather than guess.
- Say honestly what they do better.
- Say only what TinyFloor does today (the guides name free browser games;
  TinyFloor has none built in).

## IndexNow and Bing

Once a deploy that changed or added pages is live, run
`pnpm run indexnow <path…>` from `marketing-frontend` (a path covers every
language; `all` sends the whole sitemap) to tell Bing, Yandex, Seznam, Naver
and Yep. Deploys don't run it: most change no pages. ChatGPT search and
Copilot answer from Bing's index, so this is also how they learn about new
pages. The key file is
`/6537fa0233c5dc0cca20f9d1f56be989.txt`. Bing Webmaster Tools has the site as
`https://tinyfloor.com/` (covering www) and reads the www sitemap.

## Brave

Claude searches Brave, so a page Brave hasn't indexed can't be recommended
there. On 16 October Brave had one tinyfloor.com page (the Wonder.me
alternative), the same as on 7 October. A search for "tinyfloor virtual
office" returned the GitHub repo and about twenty of its pull requests first,
some still showing the old "$19/month for 10" repo description.

- Brave takes no IndexNow and no sitemap submissions. Its crawler announces
  no user agent of its own and fetches what Googlebot may fetch; nothing of
  ours is blocked.
- It learns of pages partly from the Web Discovery Project: Brave browser
  users who opt in send anonymised reports of public pages they visit,
  mostly ones reached from a search. The GitHub repo is that client's code,
  not a way for a site to submit pages. Pages with few visitors, which is all
  of ours, don't reach it.
- `search.brave.com/submit-url` asks Brave to re-fetch one URL at a time. It
  is meant for updates and removals, and is the only manual lever there is.
  It runs an automatic human check that takes about 15 seconds a URL. It
  does add pages Brave never had: the ten main English pages went in on 16
  October, and by the 17th `site:tinyfloor.com` showed the home page,
  pricing, the comparisons, the guides and the icebreaker tool, where before
  there was one page. On the 17th the other 32 English pages and the 17
  translated home pages went in too. Translated inner pages weren't
  submitted (over 700); Brave can reach them from the language links.
- Brazil is where most sign-ups come from (16 of the accounts and guests in
  the admin's country list on 17 October, then the Philippines and India at
  7; Portugal 3), and Portuguese pages have the most impressions of any
  language in Search Console. So all 44 Portuguese pages went to Brave by
  the 17th, along with the 19 best-seen pages in other languages (the German
  and Italian proximity chat guides, the virtual office pages that the old
  study room pages now redirect to, team building guides in Danish, Swedish,
  Dutch and German, and the like). The Portuguese copy is Brazilian (você,
  equipe), which suits who is arriving.
- So what grows Brave's index of us is the same as for everything else:
  visitors arriving from Google and Bing, and links from pages Brave already
  has (the GitHub repo links to the site).

Mobile PageSpeed was 65 with a 7.1 s LCP on throttled 4G because the hero
video downloaded before the page counted as loaded. The poster is preloaded
now and the video attached after load.

## Who is looking, and who acts (15 October)

Search Console, three months: 108 clicks, 3,330 impressions, average
position 25. PostHog, 30 days: about 3 to 8 real search visitors a day (a
spike of 224 "Google" visits on 28 September was a bot opening every locale
from the US), 48 people from GitHub, a handful from Bing, DuckDuckGo,
ChatGPT, Ecosia and AlternativeTo.

What the impressions are, by intent:

| Intent | Impressions | Where we rank | Worth it? |
|---|---|---|---|
| Proximity chat (what it means) | ~350, guide ~500 | 7–9, no clicks | No: gamers. |
| Gather and other alternatives, "X vs Y" | ~300 | 40–60 | Yes, but it's authority, not the pages. |
| **Gather's price** ("gather pricing", "gather cost", "gather 料金", "gather planos") | small | **6–9** | **Yes: the one buyer search we already win.** |
| Virtual office (free, online, app) | ~250 | 27–80 | Mostly address-seekers and "free". |
| Team-building activities and games | ~200 | 60–90 | No: one-off HR searches. |
| Online study room | ~300, most of the clicks | 7–22 | No (students; the page redirects). |
| Wonder.me alternative | ~70 | 13 | Little: Wonder.me closed in April 2023 and served events. |

Who made offices: people arriving from GitHub (the README), ChatGPT, and
Google on the Kumospace and Gather alternative pages and the virtual office
page, from Brazil, India, Korea, Indonesia, the US and Germany. Search
impressions lean to the US (682) and UK (236), but there we rank 37 and 55;
the clicks come from Japan, Brazil, India and Italy.

What's happening outside:

- **Gather ended its free plan on 15 September 2025**: every office now pays
  $12 a member a month yearly, $15 monthly. A team of 8 pays $96–120 a month
  where it used to pay nothing. Reviewers in Brazil and Europe complain most.
  Yearly plans locked in at the old $5.95 ran until September 2026, so many
  teams meet the new price at this year's renewal (Gather's help center).
- **Gather's buyers are small tech teams.** About 74% of its G2 reviewers
  work at 50 people or fewer; Computer Software 26%, IT services 20%,
  Marketing and Advertising 8%, Consulting 5%.
- **Small teams use Discord voice channels as an office** (dev teams, agencies,
  a Japanese consultancy that went remote on it): cheap, drop-in, good audio,
  but built for gamers. Our "Discord for work" page ranks 8.
- **Free tiers elsewhere stop at 5–10 people** (Kumospace 5, Flat.social 5 at
  once, SoWork 10, WorkAdventure 10, ZEP cut from 20 to 10 at once).
- **Japan and Korea have their own tools** priced by space, not by person
  (oVice Entry-S $65 a month; RISA ¥3,000–5,000; ZEP), so a flat price is
  normal there, not a novelty.
- **Always-on presence worries some remote workers** as surveillance (Hacker
  News threads on virtual offices). The pitch is a place to drop in, never a
  camera on.

So the audience: **a remote team of 4 to 15, mostly in software, agencies or
consulting, often outside the US, that either lost Gather's free plan,
already hangs out in a Discord voice channel, or has outgrown a 5–10 person
free tier.** Not students, gamers, event hosts or anyone after an address.

## What our pages lack, and what to do about it (15 October)

Measured on the live site: our pages run 350–790 words (/features 176,
/pricing 353, the alternative pages 550–600, the virtual office page 440),
mostly a hero, three short points, a block repeated on every landing page,
and an FAQ. The one long page, the best-virtual-office-software guide, is
1,465 words. Pages that win searches like ours are reference pages, not
sales pages. So:

- **Each page earns its place with its own content**: 1,500 words or so of
  what that page alone can say, in sections (how it works, a comparison
  table, worked examples, what to do when it doesn't fit), an FAQ, a "how we
  checked" note and a last-checked date. No block shared across pages.
- **Alternatives as round-ups**, not one-against-one sales pages: "the best
  Gather alternatives in 2026", several products reviewed with TinyFloor
  among them, how we compared them, and an FAQ. Say honestly what each does
  better.
- **One free tool that answers one concrete question** a remote team lead
  has, built into a full page like the above and leading to the floor. It's
  the kind of page that earns links, which is what we lack.
- **Fewer languages done properly** before eighteen thin ones: English
  first, then Portuguese and Spanish, where our visitors are.

Search demand for such tools (Ahrefs' free keyword tool, US, rough bands):
"icebreaker questions" over 10,000 a month, easy; "icebreaker questions for
work" over 1,000, easy; "daily standup tool" and "daily standup meeting
template" over 100, easy; "virtual team building activities" over 1,000,
medium; "meeting cost calculator" over 100, hard; world clocks and time-zone
planners large but hard. "Virtual office software" itself is just over 100.

## Where search stands, and four more tools (20 October)

Search Console, 28 days to 17 October: 96 clicks, 3,630 impressions,
average position 25 (property `sc-domain:tinyfloor.com`, under the second
Google account in the team's Chrome). PostHog, 30 days: Google now sends the
most visitors (315 people), then direct (237) and GitHub (62). The pages
with impressions are the proximity chat guide (position 8, gamers), the
virtual office page (43), the team building guide (77), the Gather
alternative (38), the best virtual office software guide (29), Gather
pricing (10) and games for virtual meetings (15).

More free tools, chosen from Ahrefs' free keyword tool (US, rough bands)
for demand, ease and who searches:

| Tool | Searches | Difficulty | Why |
|---|---|---|---|
| Daily standup template | "daily standup template", "agenda", "tool": >100 each | easy | Small software teams, the audience we want most. |
| Would you rather questions for work | >1,000, plus "this or that questions for work" >100 | easy | Next to the icebreakers; same rules. |
| Two truths and a lie ideas | >1,000 | easy | The team game people search ideas for. |
| Out of office message generator | "out of office message" >10,000; "examples" >1,000 | easy | Broad, but it's what a status note does. |

Left out: "meeting cost calculator" (>100, hard), "random team generator"
(>10,000, hard, sports fans), "slack status ideas" (<100). Retrospective
ideas (>100, easy) and team building questions (>1,000, easy, close to the
icebreakers) are the next candidates.

The new tools started in English, Portuguese and Spanish, then were written
in all eighteen languages the same day, each titled with the phrase people
search in that language rather than a translation of the English one (in
Japanese "究極の選択" for would you rather, in Korean "밸런스 게임" and
"진진가", in Arabic "لو خيروك"), with examples that travel (no spelling bee,
no northern lights where they're ordinary). A tool can still be limited to
some languages: the page, the sitemap, the language versions in its head and
the footer's language menu follow `lib/tools/catalog.ts`, and the middleware
sends any other language to the 404. Every tool page ends with the other
tools in its language, and `/tools` lists them all.
