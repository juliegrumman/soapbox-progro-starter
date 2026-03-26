# ProGRO Density+ Product Command Center

## Quick Start
To run the competitive intelligence analysis, use `/competitive-intelligence-analysis`.
It analyzes all competitor reviews in the database and produces a report in `reports/`.

## What This Project Is
A Claude Code training series using Soapbox's ProGRO Density+ hair product launch as a live case study. Each session teaches one Claude Code capability while solving one real marketing problem. All sessions share a SQLite database so agents cross-reference each other's outputs.

## Product Context
**ProGRO Density+** is a new hair density/growth serum from Soapbox (soapboxsoaps.com). It competes in the hair growth/density serum category — a crowded market where consumer expectations around efficacy timelines, ingredient transparency, and visible results drive purchase decisions.

### Competitors
| Competitor | Positioning | Why They Matter |
|-----------|-------------|-----------------|
| Divi Scalp Serum | Same consumer, same price, clean-but-clinical aesthetic | Head-to-head competitor — closest positioning match |
| Vegamour GRO Hair Serum | Stronger brand awareness, heavy influencer penetration | Category leader — sets consumer expectations |
| The Ordinary Multi-Peptide Serum | Redensyl-based formula at a much lower price point | Pricing pressure, especially on Amazon |
| California Naturals Re:GRO | Natural positioning | Niche competitor in the clean/natural segment |
| Nutrafol Women's Hair Serum | Supplement-to-topical brand extension | Wellness-adjacent competitor with strong brand trust |
| Hers Topical Minoxidil | Drug-side (minoxidil) | Represents the pharmaceutical alternative consumers weigh |

### Key Intelligence Gaps
These are the questions the analysis should answer:
- Which content formats and hooks are actually driving conversions for competitors (not just views)?
- How do competitors handle the **efficacy expectation gap** — the disconnect between early shedding reduction and longer-term visible fullness?
- Where is consumer dissatisfaction clustering (timeline, texture, results expectations)? That's where ProGRO has real differentiation opportunity.

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
├── skill-templates/            # Skill templates (wire up to .claude/skills/ to activate)
│   ├── competitive-review-collection.md
│   └── competitive-intelligence-analysis.md
├── scripts/                  # Python scrapers
│   └── scrape_okendo.py     # Okendo review scraper (Divi, Vegamour)
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
Skill templates live in `skill-templates/`. To activate them as slash commands, create `.claude/skills/<skill-name>/SKILL.md` by copying the template file:
- **competitive-review-collection** (`skill-templates/competitive-review-collection.md`) — Once installed, invoke with `/competitive-review-collection`
- **competitive-intelligence-analysis** (`skill-templates/competitive-intelligence-analysis.md`) — Once installed, invoke with `/competitive-intelligence-analysis`

## Available Tools (TypeScript)
- `src/tools/reviews.ts` — Functions: `getReviews()`, `getReviewCountsByCompetitor()`, `getRatingDistribution()`, `getReviewsByRating()`, `searchReviews()`, `updateReviewEnrichment()`, `insertReview()`

## Key Commands
```bash
npm run seed          # Re-import CSVs into SQLite
npm run db:push       # Push schema changes to SQLite
npm run dev           # Start Express API server (port 3001)
```

## Scraper Architecture
One script per review platform, not per competitor. Each competitor is a config entry in the appropriate platform scraper. All scrapers output the same normalized CSV schema (competitor, product, source_platform, review_id, date, rating, title, body, reviewer_name, is_verified, is_recommended, helpful_count, reviewer_attributes as JSON).

- `scripts/scrape_okendo.py` — Divi, Vegamour (Okendo platform)
- `scripts/scrape_bazaarvoice.py` — The Ordinary (Bazaarvoice platform)
- Adding a new competitor: find which review platform they use, add a config entry to the matching scraper (or create a new `scrape_<platform>.py`), run it, seed the output into SQLite.

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
