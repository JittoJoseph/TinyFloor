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

Every production deploy tells Bing, Yandex, Seznam, Naver and Yep which
pages changed (`marketing-frontend/scripts/indexnow.mjs`), by hashing what a
crawler reads on each page, so a build that only changes code sends nothing.
ChatGPT search and Copilot answer from Bing's index, so this is also how they
learn about new pages. The key file is
`/6537fa0233c5dc0cca20f9d1f56be989.txt`. Bing Webmaster Tools has the site as
`https://tinyfloor.com/` (covering www) and reads the www sitemap.

Mobile PageSpeed was 65 with a 7.1 s LCP on throttled 4G because the hero
video downloaded before the page counted as loaded. The poster is preloaded
now and the video attached after load.
