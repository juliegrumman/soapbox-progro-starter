# ProGRO Density+ Product Command Center

A hands-on Claude Code training series using Soapbox's ProGRO Density+ hair serum launch as a live case study. Each session teaches one Claude Code capability while solving a real marketing problem.

## Prerequisites

- [Node.js](https://nodejs.org/) v18 or higher
- [Python 3](https://www.python.org/downloads/) v3.9 or higher
- [Claude Code](https://docs.anthropic.com/en/docs/claude-code) (`npm install -g @anthropic-ai/claude-code`)

See [SESSION-1-GUIDE.md](SESSION-1-GUIDE.md) for detailed installation instructions.

## Quick Start

```bash
git clone https://github.com/juliegrumman/soapbox-progro-starter.git
cd soapbox-progro-starter
npm install
claude
```

The database ships pre-seeded with competitor review data — you're ready to go immediately.

## Sessions

| Session | Capability | Marketing Problem | Database Table |
|---------|-----------|-------------------|----------------|
| 1 | Skills & tool use | Competitive review analysis | `competitive_reviews` |
| 2 | SEO research | Keyword strategy from customer language | `keyword_rankings` |
| 3 | Social monitoring | Reddit conversation tracking | `reddit_threads` |
| 4 | Page auditing | Product page optimization | `page_performance` |
| 5 | Dashboard & ads | Meta Ads campaign analysis | `meta_ads` |

Each session's agent writes to its own table. Later sessions read from earlier tables, so the agents build on each other's work.

## Getting Started

Open [SESSION-1-GUIDE.md](SESSION-1-GUIDE.md) and follow along from the top.

## Tech Stack

- **Runtime:** Node.js + TypeScript (ESM)
- **Database:** SQLite via better-sqlite3 + Drizzle ORM
- **Scrapers:** Python
- **API:** Express
- **Dashboard:** Vite + React (Session 5)

## Project Structure

```
soapbox-progro-starter/
├── src/
│   ├── db/           # Schema, connection, seed script
│   ├── tools/        # TypeScript query functions
│   └── server/       # Express API
├── skill-templates/  # Skill playbooks (wire up in Session 1)
├── scripts/          # Python review scrapers
├── data/reviews/     # Normalized CSV files
├── reports/          # Generated analysis reports
└── soapbox.db        # Pre-seeded SQLite database
```

## Key Commands

```bash
npm run seed      # Re-import CSVs into SQLite
npm run db:push   # Push schema changes to SQLite
npm run dev       # Start Express API server (port 3001)
```
