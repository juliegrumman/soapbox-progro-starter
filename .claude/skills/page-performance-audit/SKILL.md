# Skill: Product Page Performance Audit (Orchestrator)

## Purpose

Audit the ProGRO Density+ product page using three specialized sub-agents coordinated by a TypeScript orchestrator. Each sub-agent is a separate Claude API call with its own system prompt and custom tools. The orchestrator synthesizes all findings into a unified audit report with a top-10 quick wins list.

## When to Use

- After Sessions 1-3 data is populated (reviews, keywords, Reddit threads)
- When auditing or re-auditing the product page
- Before major page redesigns or A/B tests
- After implementing quick wins from a prior audit (to measure improvement)

## Prerequisites

- `ANTHROPIC_API_KEY` set in `.env` (required — powers the sub-agents)
- `PAGESPEED_API_KEY` set in `.env` (optional — falls back to cached data)
- `CLARITY_API_TOKEN` and `CLARITY_PROJECT_ID` set in `.env` (optional — falls back to cached data)
- Sessions 1-3 data in `soapbox.db` (reviews, keywords, Reddit threads)

## How to Run

```bash
npm run audit:page
# or
npx tsx src/agents/page-audit-orchestrator.ts
```

To audit a different URL:
```bash
AUDIT_URL=https://example.com/product npm run audit:page
```

## What's Different About This Session

Sessions 1-2 were recipe-style skills (linear steps, one Claude session). Session 3 introduced the agent pattern (a single agent with a goal and tools). Session 4 introduces **real multi-agent coordination**: three separate Claude instances, each specialized, coordinated by TypeScript code.

The orchestrator (`src/agents/page-audit-orchestrator.ts`) uses the `@anthropic-ai/sdk` to make separate `messages.create()` calls for each sub-agent. Each gets:
- Its own **system prompt** (specialist persona)
- Its own **custom tools** (API calls, DB queries)
- Its own **context window** (sees only what it needs)

This is the same architecture used in production multi-agent systems.

## Architecture

```
┌─────────────────────────────────────┐
│         ORCHESTRATOR                │
│  1. Loads context from Sessions 1-3 │
│  2. Dispatches 3 sub-agents        │
│  3. Synthesizes results             │
│  4. Saves to DB + generates report  │
└──────┬──────────┬──────────┬────────┘
       │          │          │
       ▼          ▼          ▼
   ┌────────┐ ┌────────┐ ┌────────┐
   │ Perf   │ │ SEO +  │ │ CRO/UX │
   │ Agent  │ │ Msg    │ │ Agent  │
   │        │ │ Agent  │ │        │
   │PageSpd │ │Fetch + │ │Clarity │
   │  API   │ │  DB    │ │  API   │
   └────────┘ └────────┘ └────────┘
```

## Sub-Agent 1: Technical Performance Agent

**Persona:** Web performance specialist
**Tools:** `run_pagespeed_audit` — calls Google PageSpeed Insights API
**Output:** Lighthouse scores (performance, SEO, accessibility, best practices), Core Web Vitals (LCP, CLS, FCP, INP, TTFB) with pass/fail status, top optimization opportunities
**Fallback:** `data/pages/seed-pagespeed-results.json`

## Sub-Agent 2: SEO + Messaging Alignment Agent

**Persona:** On-page SEO and messaging strategist
**Tools:**
- `fetch_page_content` — fetches and parses the page HTML
- `query_keyword_rankings` — reads Session 2 keyword data
- `search_reviews` — reads Session 1 customer language
- `search_reddit_threads` — reads Session 3 conversation themes

**Output:** On-page element inventory, keyword coverage analysis, messaging gaps (themes from S1-S3 not on the page), alignment score (0-100)
**Fallback:** `data/pages/seed-page-content.json`

## Sub-Agent 3: Conversion/UX Agent

**Persona:** Conversion rate optimization specialist
**Tools:** `query_clarity_dashboard` — calls Microsoft Clarity Data Export API
**Output:** Scroll depth, engagement time, rage clicks (with specific elements), dead clicks, quick-back rate, UX friction interpretation
**Fallback:** `data/pages/seed-clarity-data.json`

## Output

- **Database:** Results saved to `page_performance` table in `soapbox.db`
- **Report:** Markdown report at `reports/page-performance-audit.md`
- **Dashboard:** Data available at `GET /api/pages` when server is running

## Key Concepts Taught

1. **Sub-agent delegation** — breaking a complex task into specialized roles
2. **Agentic tool-use loop** — the `while(true)` pattern that lets each sub-agent call tools iteratively
3. **Custom tool definitions** — defining tools with JSON Schema so Claude knows how to use them
4. **Parallel dispatch** — running independent sub-agents concurrently with `Promise.all()`
5. **Structured synthesis** — combining outputs from multiple sources into a unified recommendation
