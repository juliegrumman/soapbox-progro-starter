# ProGRO Density+ Product Command Center

## Quick Start
To run the competitive intelligence analysis, use the skill at
`skills/skill-competitive-intelligence-analysis.md`. It analyzes all
competitor reviews in the database and produces a report in `reports/`.

## What This Project Is
A 5-session Claude Code training series using Soapbox's ProGRO Density+ hair product launch as a live case study. Each session teaches one Claude Code capability while solving one real marketing problem. All sessions share a SQLite database so agents cross-reference each other's outputs.

## Project Structure
```
soapbox-progro/
├── src/
│   ├── db/
│   │   ├── schema.ts       # Drizzle schema (all 5 tables)
│   │   ├── index.ts         # DB connection singleton
│   │   ├── seed.ts          # CSV → SQLite importer (reviews)
│   │   ├── seed-keywords.ts # CSV → SQLite importer (keywords)
│   │   ├── seed-reddit.ts   # CSV → SQLite importer (reddit threads)
│   │   └── seed-pages.ts    # CSV → SQLite importer (page audits)
│   ├── tools/
│   │   ├── reviews.ts       # Query + save competitive reviews
│   │   ├── keywords.ts      # Query + save keyword rankings
│   │   ├── reddit.ts        # Query + save reddit threads
│   │   └── pages.ts         # Query + save page audit results
│   ├── agents/
│   │   └── page-audit-orchestrator.ts  # Multi-agent orchestrator (Session 4)
│   └── server/
│       └── index.ts         # Express API for dashboard
├── scripts/                  # Python scrapers
│   └── scrape_okendo.py     # Okendo review scraper (Divi, Vegamour)
├── skills/                   # Active Claude Code skill definitions
│   ├── skill-competitive-review-collection.md
│   ├── skill-competitive-intelligence-analysis.md
│   ├── skill-seo-keyword-research.md
│   └── skill-reddit-social-listening.md
├── skill-templates/          # Skill blueprints (copy to skills/ to activate)
├── data/
│   ├── reviews/              # Normalized review CSV files
│   ├── keywords/             # Keyword ranking CSV fallback data
│   ├── reddit/               # Reddit thread CSV fallback data
│   └── pages/                # Page audit fallback data (PageSpeed, Clarity, page content)
├── reports/                  # Generated analysis reports
└── soapbox.db                # SQLite database
```

## Database
- **Engine:** SQLite via `better-sqlite3` + `drizzle-orm`
- **File:** `soapbox.db` (project root)
- **Schema:** `src/db/schema.ts`

### Tables
| Table | Session | Description |
|-------|---------|-------------|
| `competitive_reviews` | 1 | Competitor product reviews (run the warm-up query below to see current counts) |
| `keyword_rankings` | 2 | SEO keyword position tracking |
| `reddit_threads` | 3 | Reddit social monitoring data |
| `page_performance` | 4 | Product page audit results (aggregate scores, CWV, messaging alignment) |
| `clarity_events` | 4 | Element-level UX friction events (rage clicks, dead clicks with CSS selectors, severity, suggested fixes) |
| `clarity_sources` | 4 | Per-traffic-source behavioral metrics (scroll depth, engagement by source) |
| `meta_ads` | 5 | Meta Ads campaign performance |

### Useful queries
```sql
-- Session 1: Review counts by competitor
SELECT competitor, COUNT(*), ROUND(AVG(rating), 2) FROM competitive_reviews GROUP BY competitor;

-- Session 1: Rating distribution
SELECT rating, COUNT(*) FROM competitive_reviews GROUP BY rating ORDER BY rating;

-- Session 1: Search reviews by keyword
SELECT competitor, title, body FROM competitive_reviews WHERE body LIKE '%thinning%' LIMIT 10;

-- Session 2: Keyword rankings by cluster
SELECT cluster, COUNT(*) as keywords, ROUND(AVG(position), 1) as avg_pos,
       SUM(search_volume) as total_volume
FROM keyword_rankings GROUP BY cluster;

-- Session 2: Quick wins — keywords in striking distance (positions 4-20)
SELECT keyword, position, search_volume, url
FROM keyword_rankings WHERE position BETWEEN 4 AND 20
ORDER BY search_volume DESC;

-- Session 2: Competitive gaps — keywords where competitors rank on page 1
SELECT keyword, position, url, search_volume
FROM keyword_rankings WHERE position <= 10
ORDER BY search_volume DESC;

-- Session 3: Thread counts by subreddit
SELECT subreddit, COUNT(*), ROUND(AVG(score), 1) FROM reddit_threads GROUP BY subreddit;

-- Session 3: Sentiment distribution
SELECT sentiment, COUNT(*) FROM reddit_threads GROUP BY sentiment;

-- Session 3: Most-discussed brands
SELECT relevant_brands, COUNT(*) FROM reddit_threads
WHERE relevant_brands IS NOT NULL GROUP BY relevant_brands;

-- Session 3: High-engagement threads (score > 50)
SELECT subreddit, title, score, comment_count, sentiment
FROM reddit_threads WHERE score > 50 ORDER BY score DESC;

-- Session 4: Latest page audit scores
SELECT url, performance_score, seo_score, messaging_alignment_score,
       scroll_depth, rage_clicks, audited_at
FROM page_performance ORDER BY audited_at DESC LIMIT 1;

-- Session 4: Core Web Vitals pass/fail
SELECT url, lcp, cls, fcp, inp, ttfb,
  CASE WHEN lcp < 2500 THEN 'GOOD' WHEN lcp < 4000 THEN 'NEEDS WORK' ELSE 'POOR' END as lcp_status,
  CASE WHEN cls < 0.1 THEN 'GOOD' WHEN cls < 0.25 THEN 'NEEDS WORK' ELSE 'POOR' END as cls_status
FROM page_performance ORDER BY audited_at DESC LIMIT 1;

-- Session 4: Quick wins from latest audit
SELECT quick_wins FROM page_performance ORDER BY audited_at DESC LIMIT 1;

-- Session 4: Top UX friction points (open, high severity, sorted by count)
SELECT event_type, selector, count, context, suggested_fix
FROM clarity_events WHERE status = 'open' AND severity = 'high'
ORDER BY count DESC;

-- Session 4: Event summary by type and severity
SELECT event_type, severity, COUNT(*) as events, SUM(count) as total_occurrences
FROM clarity_events GROUP BY event_type, severity;

-- Session 4: Traffic sources ranked by engagement
SELECT source, sessions, scroll_depth, engagement_time
FROM clarity_sources ORDER BY sessions DESC;

-- Session 4: Low-engagement traffic sources (scroll depth < 40%)
SELECT source, sessions, scroll_depth, engagement_time
FROM clarity_sources WHERE scroll_depth < 40 ORDER BY scroll_depth;
```

## Available Skills
- **competitive-review-collection** (`skills/skill-competitive-review-collection.md`) — Orchestrates scraping and normalizing competitor reviews
- **competitive-intelligence-analysis** (`skills/skill-competitive-intelligence-analysis.md`) — Analyzes review data to produce competitive intelligence report
- **seo-keyword-research** (`skills/skill-seo-keyword-research.md`) — Extracts keywords from customer language, checks Google rankings via SerpAPI, clusters by intent, produces keyword strategy report
- **reddit-social-listening** (`skills/skill-reddit-social-listening.md`) — Autonomous agent that monitors Reddit for brand mentions, competitor conversations, and market sentiment. Cross-references with Sessions 1-2 data.
- **page-performance-audit** (`skill-templates/skill-page-performance-audit.md`) — TypeScript orchestrator that coordinates three sub-agents (technical performance, SEO+messaging alignment, conversion/UX) to audit the ProGRO product page. Uses `@anthropic-ai/sdk` for real multi-agent coordination. Run with `npm run audit:page`.

## Available Tools (TypeScript)
- `src/tools/reviews.ts` — Functions: `getReviews()`, `getReviewCountsByCompetitor()`, `getRatingDistribution()`, `getReviewsByRating()`, `searchReviews()`, `updateReviewEnrichment()`, `insertReview()`
- `src/tools/keywords.ts` — Functions: `getKeywords()`, `getKeywordsByCluster()`, `getKeywordsByIntent()`, `getKeywordsByPositionRange()`, `searchKeywords()`, `upsertKeyword()`, `insertKeywordBatch()`
- `src/tools/reddit.ts` — Functions: `getThreads()`, `getThreadsBySubreddit()`, `getThreadsBySentiment()`, `searchThreads()`, `getThreadsByBrand()`, `getHighEngagementThreads()`, `insertThread()`, `insertThreadBatch()`
- `src/tools/pages.ts` — Functions: `getPageAudits()`, `getLatestAudit()`, `getAuditSummary()`, `getCoreWebVitals()`, `getClarityMetrics()`, `getMessagingAlignment()`, `insertPageAudit()`, `searchRecommendations()`, `getEvents()`, `getTopFrictionPoints()`, `getEventSummary()`, `insertEventBatch()`, `updateEventStatus()`, `getTrafficSources()`, `getLowEngagementSources()`, `insertSourceBatch()`
- `src/agents/page-audit-orchestrator.ts` — Multi-agent orchestrator using `@anthropic-ai/sdk`. Dispatches 3 sub-agents in parallel, synthesizes results, saves to DB, generates report.

## Key Commands
```bash
npm run seed          # Re-import review CSVs into SQLite
npm run seed:keywords # Import fallback keyword data into SQLite
npm run seed:reddit   # Import fallback Reddit thread data into SQLite
npm run seed:pages    # Import fallback page audit data into SQLite
npm run db:push       # Push schema changes to SQLite
npm run dev           # Start Express API server (port 3001)
npm run audit:page    # Run the Session 4 page audit orchestrator
```

## Tech Stack
- **Runtime:** Node.js + TypeScript (ESM)
- **Database:** SQLite via better-sqlite3 + Drizzle ORM
- **API:** Express (serves JSON to dashboard)
- **AI SDK:** @anthropic-ai/sdk (Session 4 orchestrator sub-agents)
- **Scrapers:** Python (existing, invoked via scripts/)
- **Dashboard:** Vite + React (Session 5, in `dashboard/`)

## Agent Architecture
Agents share context through the SQLite database, not direct communication:
- **S1 Review Agent** → writes to `competitive_reviews`
- **S2 SEO Agent** → reads reviews for seed keywords → writes to `keyword_rankings`
- **S3 Reddit Agent** → reads reviews + keywords → writes to `reddit_threads`
- **S4 Page Audit Agent** → reads all 3 prior tables → writes to `page_performance`
- **S5 Meta Ads Agent** → reads all 4 prior tables → writes to `meta_ads`

## MCP Servers
- **Reddit MCP:** `claude mcp add reddit --scope project -- uvx mcp-reddit` (no auth needed, used in Session 3)
- **Clarity MCP:** `claude mcp add clarity -- npx @microsoft/clarity-mcp-server --clarity_api_token=TOKEN` (Session 4, requires Clarity project access)
- **Playwright MCP:** `claude mcp add playwright -- npx @anthropic-ai/playwright-mcp --headless` (Session 4, no auth needed)

## Important Notes
- The `data/` and `reports/` directories are gitignored in the dev repo (data is regenerated from scrapers)
- In the participant repo, `soapbox.db` ships pre-seeded — no need to run seed commands
- Python scrapers use a venv at `venv/` — activate with `source venv/bin/activate`
- All scrapers output the normalized CSV schema defined in `scrape_okendo.py`
- SerpAPI free tier allows 100 searches/month. The keyword research skill budgets ~45 searches per run (30 search + 15 trends).
- If no `SERPAPI_KEY` is set in `.env`, the keyword skill falls back to pre-baked data in `data/keywords/`
- If the Reddit MCP is unavailable, the social listening skill falls back to seed data in `data/reddit/`
- If no `PAGESPEED_API_KEY` is set, the page audit orchestrator falls back to data in `data/pages/seed-pagespeed-results.json`
- If no `CLARITY_API_TOKEN`/`CLARITY_PROJECT_ID` is set, the orchestrator falls back to `data/pages/seed-clarity-data.json`
- `ANTHROPIC_API_KEY` is required for the page audit orchestrator (it powers the sub-agent API calls)
- ProGRO Density+ product page: `https://www.soapboxsoaps.com/pages/progro-density-plus-hair-serum`
