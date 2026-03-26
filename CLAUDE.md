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
│   │   └── seed.ts          # CSV → SQLite importer
│   ├── tools/
│   │   └── reviews.ts       # Query + save competitive reviews
│   └── server/
│       └── index.ts         # Express API for dashboard
├── scripts/                  # Python scrapers
│   └── scrape_okendo.py     # Okendo review scraper (Divi, Vegamour)
├── skills/                   # Claude Code skill definitions
│   ├── skill-competitive-review-collection.md
│   └── skill-competitive-intelligence-analysis.md
├── data/reviews/             # Normalized CSV files
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
-- Review counts by competitor
SELECT competitor, COUNT(*), ROUND(AVG(rating), 2) FROM competitive_reviews GROUP BY competitor;

-- Rating distribution
SELECT rating, COUNT(*) FROM competitive_reviews GROUP BY rating ORDER BY rating;

-- Search reviews by keyword
SELECT competitor, title, body FROM competitive_reviews WHERE body LIKE '%thinning%' LIMIT 10;
```

## Available Skills
- **competitive-review-collection** (`skills/skill-competitive-review-collection.md`) — Orchestrates scraping and normalizing competitor reviews
- **competitive-intelligence-analysis** (`skills/skill-competitive-intelligence-analysis.md`) — Analyzes review data to produce competitive intelligence report

## Available Tools (TypeScript)
- `src/tools/reviews.ts` — Functions: `getReviews()`, `getReviewCountsByCompetitor()`, `getRatingDistribution()`, `getReviewsByRating()`, `searchReviews()`, `updateReviewEnrichment()`, `insertReview()`

## Key Commands
```bash
npm run seed          # Re-import CSVs into SQLite
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
- Python scrapers require a venv at `venv/`. If it doesn't exist, create it with `python3 -m venv venv && source venv/bin/activate && pip install -r scripts/requirements.txt`. To run scrapers directly: `venv/bin/python scripts/scrape_okendo.py all`
- All scrapers output the normalized CSV schema defined in `scrape_okendo.py`
