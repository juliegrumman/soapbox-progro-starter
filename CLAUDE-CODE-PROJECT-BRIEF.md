# ProGRO Density+ Product Command Center — Project Brief

You are helping build a five-part Claude Code training series that uses Soapbox's ProGRO Density+ product launch as a live case study. Each session solves one real marketing problem while teaching one new Claude Code capability. The series culminates in a custom dashboard application that tracks competitive intelligence, SEO visibility, social sentiment, product page health, and paid ad performance.

This document is your single source of truth for context, client data, technical decisions, and project structure.

---

## THE CLIENT

**Company:** Soapbox (soapboxsoaps.com)
**Product:** ProGRO Density+ — a new hair density/growth serum product line
**Client contact:** Jeff Sheely (jeff.sheely@soapboxsoaps.com)
**Training partner:** Craig Foldes (ChatWalrus) — delivers the sessions to his ecommerce marketing community
**Curriculum designer:** Julie Grumman — designs content, builds the technical demos, provides the expertise behind the sessions

---

## SESSION OUTLINE

### Session 1: The Ground Floor — Competitive Review Analysis
- **Objective:** Scrape and analyze competitor product reviews to map where competitors are winning and failing. Build a voice-of-customer database with the exact language real buyers use.
- **New technology:** Claude Code fundamentals — installation, project setup, building and saving skills, first MCP server connection
- **Integrations:** Playwright MCP (free, no auth) or Python Scripts (let's decide together)
- **Output:** Competitive intelligence report, voice-of-customer database, competitor scorecard, reusable analysis skill

### Session 2: Reaching Outside — SEO Keyword Rank Tracking
- **Objective:** Turn Session 1's customer language into a keyword strategy. Pull live search data, cluster by intent, check current rankings. Introduce persistent cloud database so all future data accumulates for the dashboard.
- **New technology:** API connections, tool use, persistent data storage (SQLite — already set up from Session 1)
- **Integrations:** SerpAPI (free tier, API key)
- **Output:** Keyword strategy report, rank tracking baseline, Supabase database, reusable keyword skill

### Session 3: Listening at Scale — Reddit Social Monitoring
- **Objective:** Build an agent that autonomously monitors Reddit for brand mentions, competitor chatter, and market conversations. Cross-reference findings with Sessions 1-2 data. First session where Claude decides its own steps rather than following a recipe.
- **New technology:** MCP server ecosystem, agent architecture (goal + tools + autonomy)
- **Integrations:** Reddit MCP (free, no auth) — `claude mcp add reddit -- uvx mcp-reddit`
- **Output:** Social listening brief, cross-channel insights, Reddit thread database, reusable social agent

### Session 4: Divide and Conquer — Product Page Performance Audit
- **Objective:** Audit the ProGRO Density+ product page using three specialized sub-agents: page speed analyzer, SEO health checker, and messaging alignment auditor (compared against all prior session data). Orchestrator synthesizes findings.
- **New technology:** Sub-agent delegation, multi-agent coordination
- **Integrations:** Google PageSpeed Insights API (free, API key) + Playwright MCP (reused)
- **Output:** Full audit report, Core Web Vitals data, messaging gap analysis, top 10 quick wins, sub-agent architecture template

### Session 5: The Command Center — Meta Ads + Dashboard Build
- **Objective:** Connect to Soapbox's live Meta Ads account. Analyze campaign performance cross-referenced against all prior intelligence. Build the final product: a custom UI dashboard pulling accumulated data from all 5 sessions.
- **New technology:** Multi-agent orchestration, OAuth authentication, custom UI generation
- **Integrations:** Pipeboard Meta Ads MCP (free tier, OAuth) + all prior integrations
- **Output:** Meta ads analysis, new ad angle suggestions, complete custom dashboard application, full project codebase

### Technology Progression
| Session | Auth Level | Tech Layer |
|---------|-----------|------------|
| 1 | None | Fundamentals + Skills |
| 2 | API key | API tool use + SQLite |
| 3 | None | MCP servers + Agents |
| 4 | API key | Sub-agents |
| 5 | OAuth | Multi-agent + UI |

### All Integrations
| Tool | Type | Auth | Cost | Sessions |
|------|------|------|------|----------|
| Playwright MCP | MCP Server | None | Free | 1, 2, 4 |
| SerpAPI | REST API | API key | Free tier (100/mo) | 2 |
| SQLite + Drizzle ORM | Local DB | None | Free | 1-5 |
| mcp-reddit | MCP Server | None | Free | 3 |
| Google PageSpeed API | REST API | API key | Free | 4 |
| Pipeboard Meta Ads MCP | Remote MCP | OAuth | Free tier | 5 |

---

## CLIENT ANSWERS (from onboarding questionnaire)

### Competitors
- **Primary competitor:** Divi Scalp Serum — closest in positioning, price point, and target consumer
- **Full competitive set:** Divi, Vegamour GRO Hair Serum, California Naturals Re:GRO, The Ordinary Multi-Peptide Serum, Nutrafol Women's Hair Serum, Hers Topical Minoxidil (drug side)
- **Key competitive dynamics:**
  - Divi: Same consumer, same price, similar clean-but-clinical aesthetic. Competing head-to-head.
  - Vegamour: Stronger brand awareness and influencer penetration. Sets category expectations.
  - The Ordinary: Pricing pressure concern on Amazon — Redensyl-based formula invites ingredient comparisons at a much lower price point.
- **Current competitive analysis process:** Primarily manual — reviewing competitor PDPs, social content, influencer output on an ad hoc basis. Some ad library monitoring. No dedicated tool or systematic reporting.
- **Primary review channel:** Amazon is highest-volume for this category. That's where Vegamour, The Ordinary, and California Naturals have the densest review pools.
- **Intelligence gaps they want filled:**
  - Which content formats and hooks are actually driving conversions for competitors (not just views)
  - How competitors handle the efficacy expectation gap between early shedding reduction and longer-term visible fullness
  - Where consumer dissatisfaction is clustering — particularly around timeline, texture, or results expectations — since that's where ProGRO has real differentiation opportunity

### SEO
- **Current SEO tools:** None — ProGRO is a new product. They are looking at AIO/GEO options to optimize presence in LLMs (ChatGPT, Claude, Gemini, Perplexity)
- **Target keywords:** Very preliminary data from Amazon only (no formal keyword list yet)

### Social Listening
- **Social listening platform:** Refunnel (but API capabilities are unconfirmed — CSV export may be needed as fallback)
- **Where customers talk:** TikTok, Threads, hair-related Facebook groups, and Soapbox's own private Facebook community (growing quickly)
- **Subreddits to monitor:** r/haircare (biggest), r/longhair, r/haircarescience, r/sallybeautysupply, r/curlyhair, r/veganbeauty, r/wavyhair, r/thinhair

### Product Page
- **Page speed tools:** Shopify built-in tools, Google Lighthouse, Microsoft Clarity
- **A/B testing:** Running landing pages through Replo, aggressively testing copy/layout. Should have substantial data to share by Session 4.

### Meta Ads
- **Currently running campaigns:** Yes
- **Meta access:** Will add Julie as analyst-level user in Meta Business Manager (need her account info)
- **Ad angle process:** Early stages — creating initial best theories (with AI assistance from ChatWalrus), testing rapidly. Using heavy UGC/TikTok Shop creator content to test authentic hooks. Will iterate on winners.
- **Key insight from early testing:** First goal is determining what root cause of hair loss is shared by interested consumers. Current results favor: aging/gradual thinning, hormonal changes, and stress/burnout.
- **Metrics that matter:** Ultimately CAC-to-LTV, but currently focused on ROAS optimization while scrutinizing secondary metrics (thumbstop/engagement rates, CTR, conversion rate)
- **Campaign focus:** To be discussed closer to Session 5 — rapidly testing everything now

---

## PROJECT STRUCTURE

```
project/
├── scripts/
│   ├── scrape_okendo.py          # Okendo review scraper (Divi, Vegamour + future)
│   ├── scrape_bazaarvoice.py     # Bazaarvoice review scraper (The Ordinary + future)
│   └── (future: scrape_amazon.py, scrape_yotpo.py, etc.)
├── skills/
│   ├── skill-competitive-review-collection.md    # Skill 1: Data collection
│   └── skill-competitive-intelligence-analysis.md # Skill 2: Analysis engine
├── data/
│   └── reviews/
│       ├── divi_reviews_normalized.csv
│       ├── vegamour_reviews_normalized.csv
│       ├── theordinary_reviews_normalized.csv
│       ├── (future competitor CSVs)
│       └── all_reviews_normalized.csv            # Combined dataset
├── reports/
│   └── competitive-intelligence-report.md
└── dashboard/
    └── (Session 5: React/HTML dashboard application)
```

---

## SCRAPER ARCHITECTURE

### Design Principle
One script per review platform, not per competitor. Each competitor is a config entry in the appropriate platform scraper. All scrapers output the same normalized CSV schema.

### Normalized Output Schema
Every scraper MUST output these exact columns in this order:

| Column | Type | Description |
|--------|------|-------------|
| `competitor` | string | Brand name (e.g., "Divi", "Vegamour") |
| `product` | string | Product name |
| `source_platform` | string | Platform ID ("okendo", "bazaarvoice", "amazon", etc.) |
| `review_id` | string | Unique review identifier from source |
| `date` | string | ISO 8601 date |
| `rating` | int | Star rating, 1-5 |
| `title` | string | Review title/headline |
| `body` | string | Full review text |
| `reviewer_name` | string | Display name |
| `is_verified` | bool | Verified purchase flag |
| `is_recommended` | bool | Would recommend (empty if unavailable) |
| `helpful_count` | int | Upvote/helpful count |
| `reviewer_attributes` | JSON string | All platform-specific reviewer attributes as JSON (e.g., `{"age": "25-34", "hair_texture": "Fine"}`) |

**Rules:**
- Do NOT add platform-specific columns. All platform-specific data goes in `reviewer_attributes` as JSON.
- File naming: `<competitor_key>_reviews_normalized.csv`
- When scraping multiple competitors, also produce `all_reviews_normalized.csv`
- 0.5s delay between paginated API requests

### scrape_okendo.py
- **Configured competitors:** Divi (store: f28ab46c-84e3-41cc-a3e3-133a18ee65b7, product: shopify-7211822645417), Vegamour (store: 9e65baea-5deb-4e8a-ac91-a1200eb60a01, product: shopify-7923465748595)
- **Usage:** `python scripts/scrape_okendo.py divi`, `python scripts/scrape_okendo.py vegamour`, `python scripts/scrape_okendo.py all`
- **Adding new Okendo competitors:** Add entry to COMPETITORS dict with store_id, product_id, competitor_name, product_name, and any extra_headers
- **Finding Okendo IDs:** DevTools → Network tab → filter "okendo" → look for request to api.okendo.io/v1/stores/{store_id}/products/{product_id}/reviews
- **Known quirks:** Vegamour requires origin/referer headers. Okendo's nextUrl sometimes drops the /v1/ prefix (script handles this automatically).
- **Data collected so far:** ~14,000 Divi reviews, ~6,500 Vegamour reviews

### scrape_bazaarvoice.py
- **Configured competitors:** The Ordinary Multi-Peptide + HA Serum (passkey and product_id need to be filled in from DevTools)
- **Usage:** `python scripts/scrape_bazaarvoice.py theordinary`, `python scripts/scrape_bazaarvoice.py all`
- **Adding new BV competitors:** Add entry to COMPETITORS dict with passkey, product_id, competitor_name, product_name
- **Finding BV credentials:** DevTools → Network tab → filter "bazaarvoice" → look for request to api.bazaarvoice.com/data/reviews.json → grab passkey and ProductId from query parameters
- **BV reviewer attributes:** Stored in ContextDataValues, AdditionalFields, or TagDimensions depending on client config. Script checks all three.

### Future Scrapers Needed
- **Amazon scraper:** For Vegamour, The Ordinary, California Naturals, Nutrafol (Amazon has the densest review pools per client). Do NOT scrape Amazon directly — use SerpAPI, Rainforest API, or Apify. Must output same normalized schema.
- **Other platforms:** California Naturals and Nutrafol review platforms not yet identified. Check their PDPs.
- **Hers (Topical Minoxidil):** Drug-side competitor. Review platform not yet identified.

---

## SKILLS

### Skill 1: Competitive Review Collection (`skill-competitive-review-collection.md`)
**Purpose:** Orchestrates scraping and normalizing product reviews. This skill handles data collection only.

**When to use:** When collecting reviews for a new competitor, adding a competitor to the dataset, or refreshing review data.

**How it works:**
1. Check `scripts/` for an existing platform scraper before writing a new one
2. If competitor uses a known platform (Okendo, BV), add a config entry to the existing scraper
3. If competitor uses an unknown platform, write a new `scrape_<platform>.py` following the normalized schema
4. All output goes to `data/reviews/`

### Skill 2: Competitive Intelligence Analysis (`skill-competitive-intelligence-analysis.md`)
**Purpose:** Analyzes normalized review data to produce actionable competitive intelligence.

**Input:** Normalized CSV files from Skill 1

**Six analysis components:**
1. **Customer Language Extraction** — Exact phrases customers use, grouped by theme (efficacy, application, value, side effects, comparison, emotional). Separate 5-star language (aspirational) from 1-2 star language (objection). Prioritize specific/vivid over generic.
2. **Objection Pattern Mapping** — Recurring 1-3 star complaint themes with frequency counts, percentage of negative reviews, representative quotes. Cross-reference: industry-wide vs brand-specific objections.
3. **Feature Gap Analysis** — Unmet needs from "I wish" / "if only" language. Categorize: formulation, packaging, pricing, timeline expectations, transparency, support.
4. **Sentiment Trending** — Monthly bucketing by competitor: avg rating, review count, pct positive/negative, inflection points with root cause sampling.
5. **Customer Persona Clustering** — Parse reviewer_attributes JSON. Define 3-5 persona archetypes with satisfaction levels. Identify the underserved persona as priority acquisition target.
6. **Competitor Scorecard** — 1-5 scale across: perceived efficacy, value for money, application experience, brand trust, customer support. Each score backed by evidence.

**Output:** Single markdown file `reports/competitive-intelligence-report.md` with executive summary (5 most actionable findings), then all six sections, then methodology note.

**Tips:**
- Run on `all_reviews_normalized.csv` for cross-competitor analysis
- Minimum 500 reviews per competitor recommended for reliable clustering
- For 10,000+ review datasets, use stratified sampling (200 per star rating per competitor) for language extraction, full dataset for quantitative metrics

---

## PERSISTENCE LAYER (SQLite — set up from Session 1)

Every agent writes timestamped results to a local SQLite database (`soapbox.db`). By Session 5, the dashboard has weeks of accumulated data showing real trends. Zero cost, zero network dependency, fully inspectable.

### Database: SQLite + Drizzle ORM
- **File:** `soapbox.db` (project root, gitignored)
- **Schema:** `src/db/schema.ts` (Drizzle ORM, type-safe)
- **Connection:** `src/db/index.ts` (singleton)
- **Seed:** `src/db/seed.ts` (CSV → SQLite importer)

### Tables
| Table | Session | Description |
|-------|---------|-------------|
| `competitive_reviews` | 1 | ~18.5K reviews (Divi, Vegamour) with ratings, text, reviewer attributes, sentiment enrichment |
| `keyword_rankings` | 2 | SEO keyword positions, search volume, intent, clusters |
| `reddit_threads` | 3 | Reddit threads with sentiment, brand mentions, engagement |
| `page_performance` | 4 | Core Web Vitals, SEO scores, messaging alignment |
| `meta_ads` | 5 | Campaign spend, impressions, clicks, conversions, ROAS |

### Setup commands
```bash
npm run db:push       # Create/update SQLite tables from schema
npm run seed          # Import normalized CSVs into SQLite
```

### Upgrade path
If cloud hosting is needed later, Turso (LibSQL) is a drop-in SQLite-compatible cloud DB. Drizzle ORM supports it natively — config change, not a rewrite.

---

## DASHBOARD (Session 5)

Five integrated panels, one per session's data domain:
1. **Competitive Intelligence (S1)** — Competitor scorecard, customer complaints, competitive advantages, language themes
2. **SEO Keyword Tracker (S2)** — Rankings with trend indicators, keyword clusters by intent, content gap opportunities
3. **Social Listening (S3)** — Recent Reddit threads, sentiment trend chart, emerging topics, high-engagement flags
4. **Product Page Health (S4)** — Core Web Vitals pass/fail, SEO score, messaging alignment score, optimization recs
5. **Meta Ads Performance (S5)** — Campaign metrics table, top/bottom creatives, ROAS trend, AI-generated ad angle suggestions

Dashboard reads from Express API (`src/server/index.ts`) which serves JSON from SQLite.

---

## CURRENT STATUS

### Completed
- [x] Training series curriculum designed and approved
- [x] Client onboarding questionnaire completed
- [x] Competitors identified and prioritized
- [x] Okendo scraper built and tested (Divi: ~12.8K reviews, Vegamour: ~5.7K reviews)
- [x] Bazaarvoice scraper built (The Ordinary — needs passkey/product_id from DevTools)
- [x] Normalized output schema defined and implemented
- [x] Skill 1 (Review Collection) written
- [x] Skill 2 (Competitive Intelligence Analysis) written
- [x] Node.js + TypeScript project initialized
- [x] SQLite database set up with Drizzle ORM (all 5 session tables)
- [x] 18,451 reviews seeded into database
- [x] Review tool functions created (`src/tools/reviews.ts`)
- [x] Express API server stub created (`src/server/index.ts`)
- [x] CLAUDE.md project context file created

### In Progress
- [ ] Fill in The Ordinary's BV passkey and product_id, run the scrape
- [ ] Build Amazon scraper (SerpAPI or Rainforest API) for remaining competitors
- [ ] Identify review platforms for California Naturals, Nutrafol, Hers
- [ ] Run Skill 2 analysis against collected data

### Not Yet Started
- [ ] Session 2: SerpAPI keyword research + keyword_rankings tools
- [ ] Session 3: Reddit MCP social listening agent
- [ ] Session 4: PageSpeed + Playwright product page audit system
- [ ] Session 5: Meta Ads MCP + dashboard build
- [ ] Julie's Meta Business Manager access (Facebook account being set up)

---

## TECHNICAL CONSTRAINTS & GOTCHAS

- **Facebook/Meta access:** Julie's original Facebook account (juliegrumman@gmail.com) is disabled. Setting up new account via new email to accept Soapbox's Meta Business Manager invite.
- **Refunnel API:** Capabilities unconfirmed. CSV export as fallback for social data.
- **Facebook community data:** Largely inaccessible post-2018 API restrictions. Treat as out of scope for live demos.
- **TikTok:** No practical API for organic/competitor data. Apify recommended if needed.
- **Amazon scraping:** Direct scraping violates ToS. Use SerpAPI, Rainforest API, or Apify.
- **Shopify access:** Avoid requesting direct access. Request exports/screenshots instead.
- **Microsoft Clarity:** Julie has access to client's dashboard
- **Google Lighthouse / PageSpeed:** No client access needed — fully public API.
- **Live demo fallbacks:** Every session should have pre-baked data as fallback in case live scraping/API calls fail during the training delivery.
