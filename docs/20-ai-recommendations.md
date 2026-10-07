# 20. Being recommended by AI assistants

What decides whether ChatGPT, Claude, Gemini and Perplexity recommend
TinyFloor, measured in October 2026, and what we did about it. The short
version: an assistant recommends what its web search finds for the user's
words. There is no separate "AI SEO".

## How an answer gets made

For a question like "best virtual office for a small team, like Gather but
cheaper":

1. The assistant runs a web search with the user's words.
   - ChatGPT searches Bing.
   - Claude searches Brave.
   - Gemini and AI Mode search Google.
   - Perplexity uses its own index and others.
2. It reads the top results and summarises them, often in their own words.
3. It recommends whatever those pages recommend.

Only when a product is asked about by name does it fetch that product's own
site, and then it does so well.

## What we measured (October 7, 2026)

**Category questions.** All four assistants put SoWork first.
- On Perplexity, 12 of the 24 sources were SoWork's own blog posts: "Best
  Gather alternatives 2026", "best affordable virtual office software 2026",
  "is SoWork worth it for a fully remote startup".
- Google's AI Mode repeated SoWork's line ("roughly half Gather's price")
  almost word for word.
- The rest were other vendors' lists (Katmai, flat.social, VirtualStation,
  WorkAdventure), G2, Product Hunt's "Gather alternatives" page, Toolradar, a
  LinkedIn article and an old r/gathertown thread.
- TinyFloor was in none of them, including the open-source question, which
  WorkAdventure wins.

**TinyFloor asked about by name.**
- **ChatGPT** read tinyfloor.com and got everything right: prices, "$19 vs
  $120 for 10 people", and a recommendation for teams of 10 or fewer.
- **Perplexity** knew TinyFloor only from the GitHub README. It called it
  "open-source, developer-oriented, less mature, no commercial price" and said
  Gather was safer.
- **Brave** had indexed one page of tinyfloor.com. A search for "tinyfloor"
  showed only the GitHub repo and one of its pull requests.

**Structural gaps.**
- **G2** listed TinyFloor under Real Estate › Residential Property Management
  (the word "floor"), with property managers as its "alternatives", 0 reviews,
  and a logo whose dark squares disappear on black.
- **Common Crawl**, which most models are trained on, had no tinyfloor.com
  pages in its last three snapshots (SoWork 127, Kumospace 200+). It picks
  pages largely by inbound links.
- **Not listed** on Product Hunt, Toolradar or SaaSHub. On AlternativeTo
  TinyFloor was listed, but with no likes it wasn't visible on Gather's page.

## What turned out not to matter

- **Crawler access.** Nothing is blocked. In a week, ClaudeBot, OpenAI's
  search bot, Bingbot, Googlebot and Applebot each fetched hundreds of pages.
  The many "failed" AI fetches in Cloudflare's AI Crawl Control were
  vulnerability scanners using AI bot user agents to probe for `/.env` and
  credential files.
- **llms.txt.** 63 requests in 30 days, none from any AI company's crawler.
  It's cheap to keep, but it isn't how assistants learn about us.
- **Wikidata and structured data.** SoWork has no Wikidata entry and is
  recommended everywhere.

## Done

- **README** leads with the hosted product, pricing and the comparison with
  Gather. Open source comes second, so assistants that read GitHub describe
  what people can actually use.
- **GitHub repo description** now names the free plan and the price, with
  topics for virtual office software.
- **AlternativeTo**: suggested Sococo, NexGen Virtual, qube, Walkabout
  Workplace and flat.social as alternatives, and "Team Collaboration Tool" as
  an app type (Gather's group). All are waiting for AlternativeTo's approval.
- **Pages in the format that wins:** `/guides/best-virtual-office-software`
  (nine products and what a team of 10 pays each) and `/guides/gather-pricing`
  (by team size, and the same team elsewhere), dated, in 18 languages.

## Next, in order

1. **G2.** Get vendor admin access, which G2 gives to an address on our own
   domain (support@tinyfloor.com). Then move the category to virtual office or
   remote work, replace the logo, and ask a few real users for reviews.
2. **Be on the pages that get retrieved.**
   - A Product Hunt launch; its "alternatives" pages rank on Bing.
   - Toolradar, SaaSHub, fitgap and similar directories.
   - Ask the authors of the ranking lists to include us, with a one-page fact
     sheet. Vendor lists include competitors to look neutral.
   - Honest founder answers on Reddit, saying who we are.
   - An article on LinkedIn; those rank on Bing.
3. **More pages in the format that wins.** The first two are built (see
   Done). Next: "Kumospace pricing" and "Cheapest virtual office for a small
   team". Our price story ($19 for an office of 10) is stronger than SoWork's
   ($6 a person); these pages write it down where an assistant looks.
4. **Links and mentions.** These are what get us into Common Crawl (so future
   models know us without searching) and into more of Brave's index.
5. **Measure.**
   - Each month, ask the same ten questions on ChatGPT, Claude, Gemini and
     Perplexity, and note who is recommended and which sources are cited.
   - Track visits from chatgpt.com, perplexity.ai, claude.ai and gemini in
     PostHog. Cloudflare's free plan doesn't show referrers.
