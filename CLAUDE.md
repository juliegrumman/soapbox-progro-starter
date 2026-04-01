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
│   │   └── seed-keywords.ts # CSV → SQLite importer (keywords)
│   ├── tools/
│   │   ├── reviews.ts       # Query + save competitive reviews
│   │   └── keywords.ts      # Query + save keyword rankings
│   └── server/
│       └── index.ts         # Express API for dashboard
├── scripts/                  # Python scrapers
│   └── scrape_okendo.py     # Okendo review scraper (Divi, Vegamour)
├── skills/                   # Active Claude Code skill definitions
│   ├── skill-competitive-review-collection.md
│   ├── skill-competitive-intelligence-analysis.md
│   └── skill-seo-keyword-research.md
├── skill-templates/          # Skill blueprints (copy to skills/ to activate)
├── data/
│   ├── reviews/              # Normalized review CSV files
│   └── keywords/             # Keyword ranking CSV fallback data
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
| `page_performance` | 4 | Product page audit results |
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
```

## Available Skills
- **competitive-review-collection** (`skills/skill-competitive-review-collection.md`) — Orchestrates scraping and normalizing competitor reviews
- **competitive-intelligence-analysis** (`skills/skill-competitive-intelligence-analysis.md`) — Analyzes review data to produce competitive intelligence report
- **seo-keyword-research** (`skills/skill-seo-keyword-research.md`) — Extracts keywords from customer language, checks Google rankings via SerpAPI, clusters by intent, produces keyword strategy report

## Available Tools (TypeScript)
- `src/tools/reviews.ts` — Functions: `getReviews()`, `getReviewCountsByCompetitor()`, `getRatingDistribution()`, `getReviewsByRating()`, `searchReviews()`, `updateReviewEnrichment()`, `insertReview()`
- `src/tools/keywords.ts` — Functions: `getKeywords()`, `getKeywordsByCluster()`, `getKeywordsByIntent()`, `getKeywordsByPositionRange()`, `searchKeywords()`, `upsertKeyword()`, `insertKeywordBatch()`

## Key Commands
```bash
npm run seed          # Re-import review CSVs into SQLite
npm run seed:keywords # Import fallback keyword data into SQLite
npm run db:push       # Push schema changes to SQLite
npm run dev           # Start Express API server (port 3001)
```

## Tech Stack
- **Runtime:** Node.js + TypeScript (ESM)
- **Database:** SQLite via better-sqlite3 + Drizzle ORM
- **API:** Express (serves JSON to dashboard)
- **Scrapers:** Python (existing, invoked via scripts/)
- **Dashboard:** Vite + React (Session 5, in `dashboard/`)

## Agent Architecture
Agents share context through the SQLite database, not direct communication:
- **S1 Review Agent** → writes to `competitive_reviews`
- **S2 SEO Agent** → reads reviews for seed keywords → writes to `keyword_rankings`
- **S3 Reddit Agent** → reads reviews + keywords → writes to `reddit_threads`
- **S4 Page Audit Agent** → reads all 3 prior tables → writes to `page_performance`
- **S5 Meta Ads Agent** → reads all 4 prior tables → writes to `meta_ads`

## Important Notes
- The `data/` and `reports/` directories are gitignored in the dev repo (data is regenerated from scrapers)
- In the participant repo, `soapbox.db` ships pre-seeded — no need to run seed commands
- Python scrapers use a venv at `venv/` — activate with `source venv/bin/activate`
- All scrapers output the normalized CSV schema defined in `scrape_okendo.py`
- SerpAPI free tier allows 100 searches/month. The keyword research skill budgets ~45 searches per run (30 search + 15 trends).
- If no `SERPAPI_KEY` is set in `.env`, the keyword skill falls back to pre-baked data in `data/keywords/`
- ProGRO Density+ product page: `https://www.soapboxsoaps.com/pages/progro-density-plus-hair-serum`
