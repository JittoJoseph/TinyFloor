# Search and AI assistants: what we found

From Search Console, Bing Webmaster Tools, Ahrefs' free tools, and asking the
assistants themselves, October 2026.

## What people search, and what to ignore

- **Category searches are mostly brand names.** The best-known product's
  search traffic is mostly its own name; its virtual office page gets about
  117 visits a month.
- **The searches worth having are specific:** "<competitor> alternative",
  "X vs Y", "<competitor> pricing", "best virtual office software" (many
  variants, several of them questions people type into assistants), and how
  to run a remote team. Pages name a product the way people search it, old
  names included.
- **Competitors' traffic comes from guides, not product pages.** 97% of
  Kumospace's is one game-night post; others get theirs from "virtual
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
ones that matter (the biggest "<competitor> alternative" search, 57). That's authority, not the
pages: Domain Rating 2.5, and the ~700 "linking sites" are spam directories
that link to every new domain.

## How assistants decide what to recommend

**An assistant recommends what its web search finds for the user's words.**
There is no separate "AI SEO". ChatGPT searches Bing, Claude searches Brave,
Gemini and AI Mode search Google, Perplexity its own index and others. Only
when asked about a product by name does it read that product's site.

Measured on 7 October 2026:

- For category questions, all four put SoWork first. Twelve of Perplexity's
  24 sources were SoWork's own "best alternatives" blog posts,
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
office software", "<competitor> pricing"), and links, which also get us into
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
- On 24 October the seven newest guides went in, in English, Portuguese and
  Japanese, with the Spanish remote work tools and happy hour guides and the
  retitled Gather alternatives and virtual office pages: 25 URLs, each
  accepted. The human check passes on its own but takes 10 to 15 seconds;
  leaving the page sooner drops the submission. Later that day the Spot,
  SoWork, ZEP, ZEP vs Gather, hybrid teams and body doubling pages went in,
  in English and Portuguese, with the ZEP pages in Japanese and Korean: 16
  URLs, each accepted.
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
| Competitor alternatives, "X vs Y" | ~300 | 40–60 | Yes, but it's authority, not the pages. |
| **A competitor's price** ("<competitor> pricing", "cost", "料金", "planos") | small | **6–9** | **Yes: the one buyer search we already win.** |
| Virtual office (free, online, app) | ~250 | 27–80 | Mostly address-seekers and "free". |
| Team-building activities and games | ~200 | 60–90 | No: one-off HR searches. |
| Online study room | ~300, most of the clicks | 7–22 | No (students; the page redirects). |
| Wonder.me alternative | ~70 | 13 | Little: Wonder.me closed in April 2023 and served events. |

Who made offices: people arriving from GitHub (the README), ChatGPT, and
Google on the alternative pages and the virtual office page, from Brazil, India, Korea, Indonesia, the US and Germany. Search
impressions lean to the US (682) and UK (236), but there we rank 37 and 55;
the clicks come from Japan, Brazil, India and Italy.

What's happening outside:

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
consulting, often outside the US, that either lost a free plan elsewhere,
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
  <competitor> alternatives in 2026", several products reviewed with TinyFloor
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
virtual office page (43), the team building guide (77), the main
alternative page (38), the best virtual office software guide (29), the
competitor pricing guide (10) and games for virtual meetings (15).

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

## Where search stands, and the next pages (24 October)

Search Console, 28 days: 104 clicks, 4,460 impressions (about 450 a day by
the 21st, up from under 100 in September), average position 24.8. The domain
property also counts other subdomains' pages; filter to www when reading it.

- **What gets clicks:** the brand (home page, position 2.5), the Japanese
  pricing guide (position 6, the one buyer search we win), games for virtual
  meetings (16), and the virtual coworking pages in Japanese and Korean.
- **What gets seen but not clicked:** the virtual office page (171
  impressions, position 50), the main alternative page (204, position 33),
  the proximity chat guide (position 8, gamers).
- **Assistants search Google too.** Queries like "<product> alternative
  site:reddit.com" and long comparison questions ending in site:reddit.com
  show up with us at position 4: an assistant's fan-out, looking for Reddit
  threads. Being discussed on Reddit is how to be in those answers.
- **Translated pages rank far higher than English ones.** The proximity chat
  guide sits at 3 to 4 in Italian, Korean and Russian and 7.5 in German,
  against 8.4 in English; the Gather pricing guide is 5.9 in Japanese.
  Translation is the cheapest way up, even where Ahrefs shows under 100
  searches, so every guide is written in all 18 languages.
- **People still search "Gather Town".** The alternatives page is found for
  "gather town alternative(s)" (over 100 impressions, position 40) and "gather
  town alternativen"; its title and subtitle say Gather Town.
- **/virtual-office is found for "free" and "online"** ("virtual office
  online", "virtual office free", "free virtual meeting room", positions 30 to
  70). "Free virtual office" alone is under 100 a month and mostly means a
  mailing address, so it gets no page of its own.
- **Definition searches get seen, not clicked.** "proximity chat", "what is
  proximity chat", "proximity chat meaning": almost 300 impressions at 8 to 9
  and one click; the answer is shown above the results.

Ahrefs' free keyword tool (US, rough bands), searches near what TinyFloor
solves, and the page that answers each:

| Search | Volume | Difficulty | Page |
|---|---|---|---|
| remote work tools | >1,000 | easy | Remote work tools guide |
| remote team communication (tools, strategies) | >100 each | easy | Remote team communication guide |
| how to manage / motivate a remote team | >100 each | easy | How to manage a remote team guide |
| remote team collaboration (tools, software) | >100 each | easy | Remote work tools guide; one page, not two |
| virtual happy hour ideas | >100 | easy | Virtual happy hour ideas guide |
| one on one meeting questions | >100 | easy | One-on-one questions guide |
| async communication | >100 | medium | Async communication guide |
| retrospective ideas (for remote teams) | >100 | easy | Retrospective ideas guide |
| remote onboarding checklist | >100 | easy | Checklist guide; /remote-onboarding stays the product page |
| async standup (tool, template) | <100 each, many | easy | The standup template tool |
| hybrid work model (best practices) | >100 | easy | Not built: a fit only if hybrid teams become a target |
| virtual coffee chat, remote work loneliness | <100 | easy–medium | Folded into the happy hour and culture guides |
| リモートワーク ツール (Japan) | >100 | easy | Remote work tools guide in Japanese |
| outils télétravail, strumenti smart working, remote work tools (DE) | <100 each | easy | The same guide, translated |

## What the money pages rank for, and the next gaps (24 October, later)

- **"Virtual office software" lands on the comparison guide, not the product
  page:** the best virtual office software guide gets 96 impressions for it at
  position 31 (7.8 in German); /virtual-office ranks 60 to 80. So the guide is
  the page to strengthen for the head term, and it now links each product to
  its full comparison page, and every comparison page links back to it.
- **"Virtual office app" (over 100, hard) and "virtual meeting room" (over
  100, medium)** are the other head terms; we sit at 50 for both. The meeting
  room page now says "free" in its title, as people search it.
- **Assistants ask about products we had no page for.** A fan-out query
  comparing SoWork, Teamflow and Sococo pricing on Reddit showed us at 4.6.
  SoWork (free for 10 with 30-minute meetings, $5.40 to $15 a member) and
  ZEP (Korean, free for 10 at once, big in Korea and Japan, now leaning toward
  education) each have a comparison page, with ZEP vs Gather beside them.
  Another fan-out, Spot vs SoWork vs Remo, put us at 6, so Spot (no free
  plan, $4.80 to $10 a user after a 30-day trial) has one too. Remo is for
  events and gets none.
- **ZEP's Korean searches are games** ("zep quiz", hide and seek, mafia,
  escape rooms: over 1,000 each), classes rather than offices. The ZEP pages
  are for teams comparing it, not for those searches.
- **oVice is over 10,000 a month in Japan**, mostly the brand and its login;
  "oViceとは" is over 100 and "oVice 料金" under 100. The oVice alternative
  page already covers its prices, so no separate pricing guide.
- **Japan searches "バーチャルオフィスツール"** (over 100, easy; "ランキング"
  and "比較" too). Plain "バーチャルオフィス" also means a rented address, so
  the Japanese titles now say ツール.
- **"Body doubling" is over 10,000 a month and easy; "body doubling app" over
  100.** It's working next to someone to get started, which a TinyFloor
  office does for people who know each other (not matched strangers). A guide
  covers it honestly, without health claims, and the virtual coworking page's
  focus sessions link to it. Chinese, Arabic and Russian titles carry the
  English term too, since their own words for it are new.
- **"Hybrid team" (over 100, easy) and "hybrid team building activities"**
  (over 100): a hybrid teams page puts the office half and the home half on
  one floor.
- **The free tools draw few product searches.** Out-of-office messages and
  two truths and a lie get impressions in many languages, but not from people
  looking for an office; they aren't where to invest next.

## Copilot cites the comparison guide, and Gather pricing goes unclicked (24 October, evening)

- **Copilot cites us daily.** Bing Webmaster Tools' AI Performance report
  shows 164 citations in a month, rising from none to 20 to 37 a day in the
  last week. The best virtual office software guide has 102 of them, the
  proximity chat guide 38, the Japanese Gather pricing guide 6. The grounding
  queries: "affordable virtual office software options", "best virtual
  office apps 2026", "best virtual office software for small business
  2026". So that guide is the page to keep current: it now lists ten
  (Spot added) and answers the small business question in its FAQ.
- **Bing search itself is small:** 373 impressions in three months, mostly
  the brand and the old study room pages.
- **The Gather pricing guide ranks on page one but isn't clicked** in
  English (position 9, 121 impressions, no clicks) or Portuguese (8.7, 103,
  one click); Japanese (5.9) gets 6. The queries ask whether Gather is still
  free ("gather é pago?", "gather 無料 終了", "is gather free"), so the titles
  now lead with the price and "no free plan" (Portuguese and Spanish as the
  question). Japanese, which works, is unchanged.
- **The Gather alternatives page is a list of seven at position 38** for
  "gather town alternatives" (115 impressions). Its content matches; it
  lacks authority. Each product in it now links to its full comparison.

## Keyword volumes from OpenSEO (24 October, night)

OpenSEO (app.openseo.so, DataForSEO data) is connected as a Claude Code
plugin; scoring a list of keywords costs about a credit per three. Monthly
searches, keyword difficulty out of 100:

| Market | Search | Volume | KD | Page |
|---|---|---|---|---|
| US | virtual workspace | 880 | 9 | Comparison guide (half the results are IT remote desktops) |
| US | body doubling app | 880 | 11 | Body doubling guide, now naming the apps |
| US | virtual office cost / pricing | 210 | 4 | Cost calculator, comparison guide |
| US | gather alternative(s) | 170 | 0 | Gather alternatives |
| US | virtual office software / platforms | 140 each | 11–21 | Comparison guide |
| US | roam virtual office | 260 | 5 | Roam alternative |
| US | virtual office for startups, virtual watercooler | 70 each | 4 | Their pages |
| US | best virtual office software | 10 | 7 | The head term is "virtual office software", not "best" |
| Brazil | trabalho híbrido | 4,400 | 0 | Hybrid teams page |
| Brazil | body doubling | 2,400 | 16 | Body doubling guide |
| Brazil | comunicação assíncrona | 720 | 0 | Async guide |
| Brazil | escritório virtual | 4,400 | 4 | Mostly a business address |
| Japan | ハイブリッドワーク | 880 | 0 | Hybrid teams page |
| Japan | 非同期コミュニケーション | 480 | 0 | Async guide |
| Japan | oViceとは / oVice 料金 | 390 / 110 | 0 | oVice alternative, retitled to answer both |
| Japan | オンラインオフィス / 仮想オフィス | 320 / 210 | 0–24 | Virtual office page |
| Japan | オンライン飲み会 ゲーム, 振り返り 手法 | 210 / 140 | 0 | Happy hour and retrospective guides |

Internal links, 25 October: most product pages and half the guides had no
links in their text, so their only links were the menus and the same first
three pages of each group. Now every comparison page leads to its closest
comparisons, every product page lists the guides that point to it, guides
lead to related guides, and 85 links sit in the text of 24 pages and guides
(three or four each, in all 18 languages). The comparison guide links to
all 15 comparison pages.

Brand searches dwarf the rest (Gather 22,200 in Brazil and 18,100 in Japan;
ZEP 9,900 and oVice 6,600 in Japan), which is why the comparison pages
matter more than any head term.

## Links in, and a crawl of every page (25 October)

- **We have almost no real backlinks.** DataForSEO counts about 2,400
  referring domains, but nearly all appeared on 23 and 24 October: one
  "professional SEO links" directory page cloned across throwaway domains,
  anchored "Build Powerful SEO Authority with Premium Backlinks
  tinyfloor.com", plus link shorteners. Leave them: Google ignores this kind
  of spam, and a disavow file is only for links we bought or a manual
  action. Without them, the real links are AlternativeTo (nofollow) and a
  handful of others. That, not the copy, is why the comparison pages sit at
  30 to 40 for terms with almost no difficulty.
- **Where links would come from:** the pages that rank for our searches
  are listings and roundups that take submissions or suggestions: Product
  Hunt's alternatives and virtual office category, G2's virtual workspaces
  category, AlternativeTo, tool directories, roundup posts ("Gather.town
  alternatives", "best virtual office software"), and Reddit threads
  (r/gathertown, r/remotework), which also feed assistants' answers.
- **A crawl of all 1,155 sitemap pages** found every page answering 200
  with one H1 and the right canonical. Pricing and the Wonder page skipped
  from H1 to H3 (fixed). Home and pricing descriptions were cut off in most
  languages and are now under 155 characters. Danish, Norwegian and Swedish
  share some titles, which is fine across languages. OpenSEO's own audit
  stops at 50 pages on this plan, and counts Japanese and Chinese words by
  spaces, so it calls those pages thin.
- **Gather became an independent company in February 2026** (its AI team
  joined Figma; nothing changed for customers or prices, per Gather's blog).
  The pricing guide says so, for people asking whether Gather is ending.

## Meeting searches, and the menus (25 October)

Team-lead searches near what the product does, with almost no difficulty
(OpenSEO, US unless marked):

| Search | Volume | KD | Page |
|---|---|---|---|
| 1 on 1 meeting template / one on one meeting agenda | 1,300 / 590 | 0–1 | One-on-one guide, retitled around its template |
| team meeting agenda (template, weekly) | 720 / 590 / 110 | 2–7 | Team meeting agenda guide |
| pauta de reunião / modelo de pauta de reunião (Brazil) | 1,900 / 880 | 0 | The same guide in Portuguese |
| discord vs slack / teams vs slack | 590 each | 0–1 | Discord vs Slack guide (small teams run their day in Discord) |
| check in questions for meetings / team check in questions | 480 / 210 | 2–13 | Check-in questions guide |
| slack huddles | 1,600 | 14 | The Slack huddles page leads with huddle limits |
| virtual team building games | 2,900 | 19 | Team building guide's title says games |
| perguntas quebra gelo (Brazil), アイスブレイク 質問 (Japan) | 480 / 210 | 0 | Icebreaker tool titles use these words |

Skipped: pomodoro, deep work and "study with me" (students and solo
workers), "remote first company" (lists of companies).

Then two more guides, for the biggest searches near meetings:

| Search | Volume | KD | Page |
|---|---|---|---|
| this or that questions (US) | 33,100 | 0 | This or that questions guide |
| entweder oder fragen / this or that fragen (Germany) | 5,400 / 590 | 0 | The same guide in German |
| meeting minutes template (US) | 18,100 | 19 | Meeting minutes guide |
| ata de reunião / modelo de ata (Brazil) | 8,100 / 5,400 | 0 | The same guide in Portuguese |
| protokoll vorlage / besprechungsprotokoll vorlage (Germany) | 3,600 / 480 | 0 | The same guide in German |
| icebreaker games (US) | 14,800 | 2 | Games guide's title |
| check in fragen, icebreaker fragen, agenda vorlage, retrospektive methoden (Germany) | 1,000 / 590 / 320 / 260 | 0 | German titles of those pages |
| kickoff / all hands meeting agenda (US) | 260 / 140 | 0 | A section of the agenda guide |

Germany is the second country by impressions (321 in 28 days, after the US
at 579; then the UK, Denmark, Brazil and Japan). Germans search
"gather town alternative" in English and get the English page at 40, while
the German page ranks 9 for "gather alternative"; its title now leads with
"Gather Town Alternativen". "Gather town alternative" was also split between
the alternatives page and Gather vs Kumospace; the latter now sends readers
to the former.

The nav now has four menus: Product, For teams, Compare (the eight most
searched alternatives, the head-to-heads, and the comparison guide as the
featured card) and Resources (the five guides buyers and team leads read
first, and the four free tools in every language). The footer has the same
six groups as columns, with company and legal links in one row at the
bottom.

## Launch places (24 October)

- **Hacker News:** TinyFloor has never been posted. Earlier "virtual office"
  Show HNs mostly got under 10 points; the one that did well (125 points)
  led with "free" and "in the browser". What HN responds to: open source
  (AGPL), something to try without an account (the demo lobby), and how it's
  built. The lobby holds 1,000 at once (50 copies of 20).
- **Product Hunt:** no page yet. Its alternatives pages are among the pages
  assistants read for category questions, so a listing helps there too.
- **Email is the bottleneck in a spike:** Resend's free plan sends 100 a day,
  and every email sign-in is one.
