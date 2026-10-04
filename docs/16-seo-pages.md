# 16. Pages for search

Written 4 October 2026, from Ahrefs' free tools and the competitors' own sites.

## What the search data says

- Virtual office searches are mostly brand names. Gather gets about 23K visits a
  month from search, two thirds of it "gather"; its `/virtual-office` page gets
  about 117.
- Demand outside brand names is specific: "<competitor> alternative", "X vs Y",
  and how to run a remote team (communication, standups, onboarding, team
  building). Gather's best page types are by team (engineering, design,
  startups) and its team-building posts.
- Traffic is not the goal. Kumospace has 77K visits a month, 97% of it one post
  about online games. Our own "free online study room" visitors were the same
  mistake: people who will never pay.
- Wrong-audience terms to avoid: "virtual coworking" (solo body-doubling),
  "proximity chat" (gamers), "free ..." in titles (students).

## Page types

Every page is a template in `src/lib/landings.ts`, written once in English and
then translated into all 18 languages. Each one: a hero, three point cards, a
table or a day on the floor as a timeline, four questions, links onward by group.
Pages without a day of their own show the home page's floor moments instead.

| Type | Slug pattern | Who it's for |
|---|---|---|
| Features | `/team-chat`, `/online-whiteboard` | Someone searching for one thing the floor does |
| Alternatives | `/<competitor>-alternative` | Teams leaving a virtual office or a tool |
| X vs Y | `/<a>-vs-<b>` | Teams choosing between two virtual offices |
| Teams | `/engineering-teams`, `/startups` | A team type, and its day on the floor |
| Use cases | `/virtual-standup`, `/remote-onboarding` | One moment of the remote workday |
| Indexes | `/features`, `/compare`, `/teams`, `/use-cases` | Every page of a type, linked from nav and footer |

## Built

- Alternatives: Gather, Kumospace, SpatialChat, WorkAdventure, Wonder, Sococo,
  oVice, Roam, Teamflow, Slack huddles, Discord for work.
- X vs Y: Gather vs Kumospace.
- Features: proximity chat, virtual meeting room, team chat, team presence,
  online whiteboard. Each has a `line` for the nav's Product menu.
- Teams: engineering, design, startups, agencies.
- Use cases: virtual office, standup, pair programming, onboarding,
  watercooler, coworking, classroom.
- "Free" is out of the titles, except where the free plan is the comparison.
  The online study room page redirects to the virtual office.

## Nav and footer

- Nav: Product (features with their lines, and the demo office), For teams
  (teams and use cases side by side), Compare (every compare page), Pricing.
  Each menu ends with a link to its index. On a phone the same groups fold.
- Footer: Product, Teams, Use cases, Compare (first eight), Resources. Each
  group column ends with "See all".
- Both read `LANDINGS`, so a new page shows up in the nav, footer, sitemap and
  llms.txt without touching them.

## Next

1. More X vs Y: Gather vs Sococo, Gather vs oVice, Kumospace vs Roam.
2. A "best virtual office software" page with an honest table.
3. More teams: customer support, sales, product.
4. More feature pages, starting with screen sharing.
5. A few guides for remote team leads (team building on one floor, remote
   communication), always tied to the product.
6. Connect tinyfloor.com to Search Console and plan from real queries.

## Rules for competitor pages

- Every price and limit comes from the competitor's own pricing page, with the
  month it was checked (`checked` in `landings.ts`, shown under the table).
- Leave a row out rather than guess (Sococo has no "runs in the browser" row).
- Say what they have that we don't, in one honest answer.
- Recheck prices every few months; the pages say when they were checked.
