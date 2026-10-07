# 18. Search research, October 2026

What the data says after the first search pages, and what to do next. Sources:
Search Console (last 3 months), Bing Webmaster Tools, Ahrefs' free tools
(keyword generator, keyword difficulty, backlink and traffic checkers) and
PageSpeed Insights.

## Where we are

- Google: 65 clicks and 1,060 impressions in 28 days, average position 25.
  225 pages indexed before the two new batches; the sitemap was last read with
  237 URLs. Bing: 4 clicks, 110 impressions.
- Most clicks still come from the study-room audience in other languages
  (オンライン自習室, sala de estudos online). That page now redirects to the
  virtual office, so expect those clicks to fade; they were the wrong people.
- The search pages are starting to show up: "wonder me alternative" (position
  8), "chat de proximidade" (6), "virtual workspace online free" (6), "free
  virtual workspace" (10).
- They are far down for the queries that matter: "virtual office free" (25),
  "gather town alternative" (57), "virtual office app" (54), "virtual
  coworking" (77). That is authority, not the pages: Domain Rating is 2.5 and
  the 700 "linking sites" are spam directories that link to every new domain.

## What people search

| Query | US volume | Difficulty | Notes |
|---|---|---|---|
| virtual team building activities | 2,400 | Medium | Gather's #1 non-brand page. A DR 47 page with 12 linking sites is #1 |
| virtual team building (games, ideas, free...) | 100+ each | Easy | The same page answers all of them |
| games for virtual meetings | | | Gather's page on it gets about 1,000 visits a month |
| remote team communication / collaboration / culture | 100+ each | Easy | Guides for remote team leads |
| what is proximity chat | 100+ | Easy | Mostly games (Fortnite, Among Us); an explainer can rank |
| gather town | 1,300 | Easy | Brand; people still say "Gather Town" |
| gather town alternatives | <100 | 0 | Top 10 is G2, Capterra, Tumblr, StackShare: easy to beat |
| gather town pricing, is gather town free | <100 | Easy | Buyers comparing |
| kumospace alternative, kumospace pricing | <100 | Easy | Same |
| best virtual office software (and many variants) | <100 each | Easy | Many look like questions typed into AI assistants |
| virtual office, virtual office space | 1,000+ | Easy | Wrong intent: a mailing address for a company |
| virtual meeting room | 100+ | Hard | Zoom and Teams rooms |

Competitors get their search traffic from guides, not product pages: 97% of
Kumospace's is one game-night post, and Gather's non-brand traffic is
"virtual team building activities" and "5-minute games for virtual meetings".
Their backlinks come the same way: other blogs link to useful guides.

## Done in this round

- "Gather Town" in the Gather page's title and description, in all 18
  languages (people search "gather town alternative", in German and Spanish too).
- The hero video no longer competes with the page on a slow phone. Mobile
  PageSpeed was 65 with a 7.1 s LCP on throttled 4G: the 1920×1080 video was
  downloaded before the page counted as loaded. Now the poster is preloaded
  on every page that shows it, and the video is attached after the page loads.

## Next, in order

1. **Get listed where the search results already are.** G2, Capterra,
   AlternativeTo (as an alternative to Gather, Kumospace, SpatialChat,
   Wonder), SaaSHub, Product Hunt, and "virtual office" lists on Reddit and
   Indie Hackers. These rank for "gather alternatives" today, give the first
   real links, and AI assistants cite them. This needs accounts, so it is a
   job for Jitto; the short description, features and prices are in
   llms-full.txt.
2. **Guides for remote team leads.** Built: `/guides` and five guides in 18
   languages (see below). Next ones: icebreaker questions for remote teams,
   remote onboarding checklist, how to run a remote standup.
3. **Buyer pages for competitors' pricing.** Built: "Gather pricing", what a
   team of 5, 10, 25 and 50 pays, beside TinyFloor, SoWork and Kumospace.
   Next: "Kumospace pricing".
4. **"Best virtual office software".** Built: nine products, honestly
   compared, with what a team of 10 pays each month. The many long variants
   of this query point at one strong page.
5. Wait for Google to read the new sitemap, then look at Search Console again
   in about four weeks, by page.

## Guides

`src/lib/guides.ts` lists them; copy is under `guides.pages.<key>` in the
message files; `GuidePage` renders them in one reading column.

- Built: virtual team building activities, games for virtual meetings, how
  to build remote team culture, remote team communication, what is proximity
  chat. For buyers: best virtual office software, Gather pricing.
- A section can carry a `table` (header, rows, a note on where the numbers
  come from). It scrolls sideways on phones, and llms-full.txt prints it as a
  markdown table.
- The buyer guides quote competitors' prices from their own pricing pages,
  checked October 2026, and say where each one is better than TinyFloor.
  Check those pages again every few months and bump `updated`.
- Each guide: a headline, an intro, sections of paragraphs and items, one
  "where TinyFloor fits" box at the end with links to the product pages it
  relates to, four questions, and the other guides. Items with a detail line
  (time and group size) are numbered through the whole guide, so "20
  activities" counts to 20.
- Article, FAQPage and BreadcrumbList (Home, Guides, guide) structured data,
  a byline and an updated date. Bump `updated` in `guides.ts` when a guide
  changes, so the page and its schema say so.
- Say only what the product does today. TinyFloor has no built-in games: the
  guides name free browser games and say where the floor helps.
- Social cards: `ONLY=guides node scripts/pictures.mjs` draws
  `og/guide-<slug>.jpg`.

## Leave alone

- "virtual office", "virtual office space": people want a business address.
- "online office": office supplies and Microsoft 365.
- "virtual meeting room" alone: Zoom Rooms and Teams.
