# Session 4: Product Page Performance Audit with Sub-Agents

Audit your product page with three specialized sub-agents — each an expert in one domain — coordinated by a TypeScript orchestrator you build yourself. Real multi-agent coordination, not a prompt pretending to be multiple agents. In 60 minutes.

## What's Different About This Session

Sessions 1-2 were guided recipes. Session 3 introduced a single agent with a search-evaluate-refine loop — and showed you the gap between "prompt-driven" and "code-driven" agents.

Today you **close that gap.** You'll build a TypeScript orchestrator that uses the Anthropic SDK to run three separate Claude instances in parallel, each with its own tools and expertise. Code controls the flow. Claude controls the content. This is the orchestrator pattern from Session 3's spectrum — and it's what production multi-agent systems actually look like.

By the end, you'll have built:
- A new tool file for page audit data (following the Sessions 1-3 pattern)
- A TypeScript orchestrator that dispatches three sub-agents via the Anthropic SDK
- Custom tool handlers for Google PageSpeed API, Microsoft Clarity API, and page content scraping
- A synthesis step that combines three specialist perspectives into one report
- An understanding of why sub-agent delegation works and when to use it

## What You'll Need

- Your soapbox-progro project from Sessions 1-3
- An Anthropic API key (this powers the sub-agents — your instructor will provide one for the session)
- A Google PageSpeed Insights API key (free — get one at https://developers.google.com/speed/docs/insights/v5/get-started)
- Microsoft Clarity API credentials (provided by the client)

## Step 1: Open Your Project

Open your terminal:

```
cd soapbox-progro && claude
```

If you're starting fresh (missed Sessions 1-3), clone and set up:

```
git clone <repo-url> soapbox-progro
cd soapbox-progro && npm install && npm run db:push && npm run seed && npm run seed:keywords && npm run seed:reddit && claude
```

## Step 2: Install the Anthropic SDK

This is the first session where we use an external AI SDK. The Anthropic SDK lets you make API calls to Claude from TypeScript code — the same way SerpAPI let you call Google Search in Session 2, but this time you're calling Claude itself.

```
Install @anthropic-ai/sdk as a dependency. Then show me what was added to package.json.
```

You should see `@anthropic-ai/sdk` added to the dependencies section. This package gives us the `Anthropic` client class and type definitions for messages, tools, and tool results.

**What just happened:** In Sessions 1-3, Claude Code was both the brain and the executor. Now you're giving your TypeScript code the ability to call Claude directly. The orchestrator script will create its own Claude conversations — three of them, in parallel — each with a different specialist persona and custom tools.

## Step 3: Set Up Your API Keys

You need three API keys for the full experience. The orchestrator falls back to cached data for any missing key, so you can proceed with just the Anthropic key.

**3a. Anthropic API key (required)**

This powers the sub-agents. Without it, the orchestrator can't run.

```
Create a .env file (if it doesn't exist) and add this Anthropic API key:
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxx
```

(Your instructor will give you the actual key.)

**3b. Google PageSpeed Insights API key (optional)**

```
Add this PageSpeed Insights API key to the .env file:
PAGESPEED_API_KEY=AIzaxxxxxxxxxxxxx
```

If you skip this, the orchestrator uses cached PageSpeed data from `data/pages/seed-pagespeed-results.json`.

**3c. Microsoft Clarity credentials (optional)**

```
Add these Microsoft Clarity credentials to the .env file:
CLARITY_API_TOKEN=xxxxxxxxxxxxx
CLARITY_PROJECT_ID=xxxxxxxxxxxxx
```

If you skip this, the orchestrator uses cached Clarity data from `data/pages/seed-clarity-data.json`.

**3d. Verify your keys are set:**

```
Read my .env file and confirm which API keys are set. Don't show me the actual values — just tell me which ones are present and which are missing.
```

You should see at minimum: `ANTHROPIC_API_KEY` present. PageSpeed and Clarity are optional.

## Step 4: Security Check — Vet the New Dependencies

Before connecting to external APIs, understand what you're connecting to:

```
I'm about to use three external APIs in a TypeScript orchestrator:
1. Google PageSpeed Insights API — what data does it return, and is there any privacy concern with sending a URL?
2. Microsoft Clarity Data Export API — what data does it return, and what authentication does it use?
3. The Anthropic SDK (@anthropic-ai/sdk) — we're sending page content and database query results to Claude's API. What should I be aware of?

Also: the orchestrator will call fetch() on the ProGRO product page to scrape its HTML. Is there any concern with that?
```

**The bottom line:** PageSpeed Insights is a public Google API — anyone can check any URL. Clarity requires a bearer token scoped to the project (the client authorized this). The Anthropic API processes your data per their usage policy. Fetching a public product page is standard practice for SEO auditing.

## Step 5: Warm-Up — What Do We Know So Far?

Before auditing the product page, let's see what intelligence we've gathered across Sessions 1-3:

```
Query the database and give me a summary of what we've collected so far:
1. How many competitive reviews do we have, grouped by competitor? What's the average rating for each?
2. How many keywords are we tracking? What are the top 5 by search volume?
3. How many Reddit threads? What's the sentiment breakdown?

For each, run the actual SQL query and show me the results.
```

You should see something like: ~18K reviews across Divi and Vegamour, keyword rankings with clusters, and Reddit threads with sentiment distribution.

**What just happened:** Three sessions of accumulated data, all in one database. The page audit will cross-reference all of it — checking whether the product page uses the customer language from reviews, targets the high-volume keywords, and addresses the concerns from Reddit. No single agent could have built this picture alone.

## Step 6: Expand the Schema

The existing `page_performance` table only has basic fields. We need columns for the full Core Web Vitals set, Microsoft Clarity behavioral metrics, and cross-session messaging analysis.

```
Update the page_performance table in src/db/schema.ts. Keep the existing url, performanceScore, lcp, cls, seoScore, messagingAlignmentScore, recommendations, and auditedAt columns, but add these new ones:

Core Web Vitals (from PageSpeed):
- accessibilityScore (real)
- bestPracticesScore (real)
- fcp (real) — First Contentful Paint in ms
- inp (real) — Interaction to Next Paint in ms
- ttfb (real) — Time to First Byte in ms

Messaging alignment (from page scrape + Sessions 1-3):
- keywordsFound (text) — JSON array of keywords found on page
- keywordsMissing (text) — JSON array of high-value keywords missing from page
- messagingGaps (text) — JSON array of themes/topics missing

Microsoft Clarity UX metrics:
- scrollDepth (real) — average scroll depth percentage
- engagementTime (real) — average engagement in seconds
- rageClicks (integer)
- deadClicks (integer)
- quickBacks (integer)
- clarityMetrics (text) — JSON overflow for additional data

Synthesis:
- quickWins (text) — JSON array of top 10 quick wins

Then run npm run db:push to apply the changes.
```

Verify the schema was updated:

```
Show me the page_performance table definition in src/db/schema.ts. How many columns does it have now?
```

You should see ~25 columns (up from ~8). The new columns store everything the three sub-agents will produce.

**What just happened:** You expanded the database to hold three types of data from three different sources — PageSpeed metrics, Clarity behavioral data, and cross-session messaging analysis. In Session 5, the dashboard will query these columns directly. This is why we use dedicated columns instead of jamming everything into a JSON blob.

## Step 7: Build the Tool File

This follows the exact same pattern from Sessions 1-3. Study it first:

```
Show me the structure of src/tools/keywords.ts and src/tools/reddit.ts side by side. What pattern do they follow? What's the same between them?
```

Claude will show you the pattern: import db + schema, export named functions for querying, searching, filtering, and inserting data. Every session's tool file follows this structure.

Now build yours:

```
Create src/tools/pages.ts following the same pattern as keywords.ts and reddit.ts, but for the page_performance table. I need functions to:
1. Get all page audits, optionally filtered by URL, ordered by auditedAt DESC
2. Get the most recent audit for a specific URL (ORDER BY auditedAt DESC LIMIT 1)
3. Get an aggregate summary grouped by URL (latest scores, clarity metrics)
4. Get Core Web Vitals for a URL with SQL CASE statements that apply Google's pass/fail thresholds:
   - LCP: Good < 2500ms, Needs Improvement < 4000ms, Poor >= 4000ms
   - CLS: Good < 0.1, Needs Improvement < 0.25, Poor >= 0.25
   - FCP: Good < 1800ms, Needs Improvement < 3000ms, Poor >= 3000ms
   - INP: Good < 200ms, Needs Improvement < 500ms, Poor >= 500ms
   - TTFB: Good < 800ms, Needs Improvement < 1800ms, Poor >= 1800ms
5. Get Clarity behavioral metrics for a URL (scroll depth, engagement, rage/dead clicks)
6. Get messaging alignment data for a URL (score, keywords found/missing, gaps)
7. Insert a complete page audit record (with auditedAt auto-set to current timestamp)
8. Search recommendations and quick wins by keyword using LIKE
```

After Claude creates the file, inspect it:

```
Show me the getCoreWebVitals function you just created. Walk me through the SQL CASE statements — how do they classify each metric as GOOD, NEEDS IMPROVEMENT, or POOR?
```

**Quick checklist** — make sure your file:
- Imports from `../db/index.js` and `../db/schema.js`
- Imports `desc` from `drizzle-orm` (needed for ordering)
- Has `insertPageAudit` that auto-sets `auditedAt: new Date().toISOString()`
- Has `getCoreWebVitals` with 5 CASE statements (one per metric)
- Has `getLatestAudit` that uses `.orderBy(desc(pagePerformance.auditedAt)).limit(1)`

**What just happened:** You built the fourth data access layer in this project. Same pattern as reviews, keywords, and Reddit — import, export functions, Drizzle queries. The `getCoreWebVitals` function is the most interesting because it encodes domain knowledge (Google's thresholds) directly in SQL. When the dashboard calls this function, it gets pass/fail status without needing to know the threshold values.

## Step 8: Build the Orchestrator

This is the biggest build of the session — and the most important. You're going to create a TypeScript file that uses the Anthropic SDK to coordinate three sub-agents.

**8a. Create the scaffold:**

```
Create src/agents/page-audit-orchestrator.ts. This is a runnable TypeScript script (not a module — it should execute when run with tsx). Here's the architecture:

1. Import "dotenv/config" for env vars, Anthropic from "@anthropic-ai/sdk", fs functions, path resolve, and our tool functions from src/tools/pages.ts, src/tools/keywords.ts, src/tools/reviews.ts, and src/tools/reddit.ts.

2. Set these constants:
   - TARGET_URL from process.env.AUDIT_URL or "https://www.soapboxsoaps.com/pages/progro-density-plus-hair-serum"
   - MODEL = "claude-sonnet-4-6"
   - DATA_DIR pointing to ../../data/pages (relative to the file)
   - REPORTS_DIR pointing to ../../reports

3. Create the Anthropic client: const client = new Anthropic()

4. Create a runSubAgent() async function that takes: name (string), system (string), tools (Anthropic tool definitions), toolHandlers (record of name → async handler function), and task (string). This function:
   - Starts a messages array with the task as the user message
   - Loops (max 10 iterations):
     - Calls client.messages.create() with the model, max_tokens 4096, system prompt, tools, and messages
     - If stop_reason is "end_turn", extract all text blocks and return them joined
     - If stop_reason is "tool_use", execute each tool_use block by calling the matching handler, collect the results as tool_result blocks, push the assistant response and tool results to messages, and continue the loop
   - Console.log the agent name and tool calls at each step so participants can watch the progress

5. Create tool handler functions:
   a. handlePageSpeedAudit(input) — if PAGESPEED_API_KEY exists, call the Google PageSpeed Insights API:
      URL: https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url={url}&key={key}&strategy={strategy}&category=performance&category=seo&category=accessibility&category=best-practices
      Extract from the response: lighthouseResult.categories scores (multiply by 100), Core Web Vitals from lighthouseResult.audits, and top optimization opportunities sorted by overallSavingsMs.
      If no API key, read data/pages/seed-pagespeed-results.json as fallback.

   b. handleFetchPageContent(input) — fetch the target URL HTML, extract with regex: <title>, meta description, all H1-H6 headings (with level), og:title, og:description, body text (stripped of scripts/styles/tags, capped at 5000 chars), image alt texts, and JSON-LD structured data. If fetch fails, fall back to data/pages/seed-page-content.json.

   c. handleQueryKeywords(input) — wraps getKeywords() from src/tools/keywords.ts. Takes optional cluster, intent, limit params.

   d. handleSearchReviews(input) — wraps searchReviews() from src/tools/reviews.ts. Takes keyword and optional limit.

   e. handleSearchReddit(input) — wraps searchThreads() from src/tools/reddit.ts. Takes keyword and optional limit.

   f. handleQueryClarity(input) — if CLARITY_API_TOKEN and CLARITY_PROJECT_ID exist, call the Clarity Data Export API. If not, read data/pages/seed-clarity-data.json as fallback.

6. Create three sub-agent builder functions (buildPerfAgent, buildSeoMessagingAgent, buildCroUxAgent) that each return an object with name, system prompt, tools (Anthropic tool schema definitions), toolHandlers, and task. Each sub-agent should:

   - Technical Performance Agent: system prompt as a web performance specialist, one tool (run_pagespeed_audit), task to audit the target URL for both mobile and desktop.

   - SEO + Messaging Alignment Agent: system prompt as an on-page SEO strategist for a hair density serum, four tools (fetch_page_content, query_keyword_rankings, search_reviews, search_reddit_threads), task to fetch the page, cross-reference against keywords/reviews/Reddit, and calculate a messaging alignment score 0-100.

   - Conversion/UX Agent: system prompt as a CRO specialist, one tool (query_clarity_dashboard), task to analyze user behavior data and identify friction points.

   All three should return their findings as structured JSON.

7. Create a synthesize() function that takes the three sub-agent result strings and makes one final client.messages.create() call with a system prompt that says: "You are the lead auditor. Synthesize findings from three specialists into a unified markdown report with: Executive Summary, Technical Performance, SEO & Messaging Alignment, Conversion & UX, Top 10 Quick Wins (prioritized by impact), and Methodology. End with a JSON block containing all structured data for database storage."

8. Create a saveResults() function that:
   - Extracts the JSON block from the synthesis using a regex for ```json...```
   - Calls insertPageAudit() with all the structured fields
   - Writes the markdown report (minus the JSON block) to reports/page-performance-audit.md

9. Create a main() function that:
   - Prints a banner with the target URL and model
   - Checks which API keys are present and logs them
   - Exits with an error if ANTHROPIC_API_KEY is missing
   - Dispatches all three sub-agents in PARALLEL using Promise.all()
   - Calls synthesize() with the three results
   - Calls saveResults()
   - Prints a completion banner

10. Call main().catch(console.error) at the bottom.

Add an "audit:page" script to package.json: "tsx src/agents/page-audit-orchestrator.ts"
```

This is a big prompt — Claude will generate ~350-400 lines of TypeScript. Give it time.

**8b. Inspect the core pattern:**

```
Show me the runSubAgent() function you just created. Walk me through what happens when a sub-agent requests a tool call. How does the while loop work? What stops it from looping forever?
```

You should see a `while` loop with a max iteration guard (10). Each iteration: call `messages.create()`, check `stop_reason`, if `tool_use` then execute the tool handler locally, push the result back into messages, and loop again. If `end_turn`, extract text and return.

**This is the agentic tool-use loop** — the same pattern used in every production AI agent. Claude decides which tools to call and when to stop. Your code executes the tools and enforces the iteration limit.

**8c. Inspect the sub-agent definitions:**

```
Show me the three sub-agent builder functions. For each one, tell me:
1. What is its system prompt persona?
2. What custom tools does it have? (list the tool names and their input schemas)
3. What is its task?
```

You should see three distinct specialists:

| Agent | Persona | Tools | Task |
|---|---|---|---|
| Technical Performance | Web performance specialist | `run_pagespeed_audit` (url, strategy) | Audit target URL for mobile + desktop |
| SEO + Messaging | On-page SEO strategist | `fetch_page_content`, `query_keyword_rankings`, `search_reviews`, `search_reddit_threads` | Fetch page, cross-reference S1-S3 data, score alignment |
| Conversion/UX | CRO specialist | `query_clarity_dashboard` (metric) | Analyze behavioral data, identify friction |

**8d. Inspect the parallel dispatch:**

```
Show me the main() function. How does it dispatch the three sub-agents? Are they sequential or parallel? What would change if we wanted to add a fourth agent?
```

You should see `Promise.all([runSubAgent(buildPerfAgent()), runSubAgent(buildSeoMessagingAgent()), runSubAgent(buildCroUxAgent())])`. All three run concurrently. Adding a fourth agent means adding one more entry to the array.

**Quick checklist** — make sure your orchestrator:
- Has `import "dotenv/config"` as the first import (loads .env before anything else)
- Has `const client = new Anthropic()` (uses ANTHROPIC_API_KEY from env automatically)
- Uses `Promise.all()` to dispatch sub-agents in parallel, not sequential `await`s
- Has fallback reads from `data/pages/seed-*.json` for each API that might be missing
- Has console.log statements so you can watch the agents work in the terminal
- Has a max iteration guard in runSubAgent (prevents infinite loops)
- Has `insertPageAudit()` in saveResults to persist to the database
- Writes the report to `reports/page-performance-audit.md`

**What just happened:** You built a multi-agent orchestrator. This is fundamentally different from everything in Sessions 1-3:
- **Sessions 1-2:** One Claude session following a recipe
- **Session 3:** One Claude session with a loop
- **Session 4:** Your TypeScript code creating THREE separate Claude conversations, each with different tools, running in parallel, then synthesizing the results

The key insight: each sub-agent has **bounded context** (its own system prompt and tools), **focused expertise** (one specialist per domain), and **clean handoffs** (structured JSON output fed to the synthesis step). This is the same architecture behind production AI audit tools.

## Step 9: Run It

```bash
npm run audit:page
```

Or from inside Claude Code:

```
Run the page audit orchestrator by executing: npx tsx src/agents/page-audit-orchestrator.ts
```

**Watch the terminal carefully.** You should see something like:

```
╔══════════════════════════════════════════════════════════════╗
║  ProGRO Density+ Page Performance Audit — Orchestrator     ║
╚══════════════════════════════════════════════════════════════╝

Target: https://www.soapboxsoaps.com/pages/progro-density-plus-hair-serum
Model:  claude-sonnet-4-6

API keys:
  Anthropic:  ✅
  PageSpeed:  ✅
  Clarity:    📂 Using fallback data

━━━ Phase 1: Dispatching Sub-Agents ━━━

🔄 Dispatching: Technical Performance Agent
🔄 Dispatching: SEO + Messaging Alignment Agent
🔄 Dispatching: Conversion/UX Agent
   🔧 Tools called: run_pagespeed_audit
   🌐 Calling PageSpeed API (mobile)...
   🔧 Tools called: fetch_page_content
   🌐 Fetching page content...
   🔧 Tools called: query_clarity_dashboard
   📂 No Clarity credentials — using fallback data
   🔧 Tools called: query_keyword_rankings, search_reviews
   🔧 Tools called: run_pagespeed_audit
   🌐 Calling PageSpeed API (desktop)...
   🔧 Tools called: search_reddit_threads
   ✅ Conversion/UX Agent complete (2 iterations)
   ✅ Technical Performance Agent complete (3 iterations)
   ✅ SEO + Messaging Alignment Agent complete (4 iterations)

━━━ Phase 2: Synthesis ━━━
🔄 Synthesizing results...
   ✅ Synthesis complete

━━━ Phase 3: Save Results ━━━
   💾 Saved to page_performance table
   📄 Report saved to reports/page-performance-audit.md

╔══════════════════════════════════════════════════════════════╗
║  Audit Complete                                            ║
╚══════════════════════════════════════════════════════════════╝
```

Notice how the three agents interleave their output — they're running in parallel. The Performance Agent calls PageSpeed twice (mobile + desktop). The SEO Agent calls four different tools (page fetch, keywords, reviews, Reddit). The CRO Agent calls Clarity. Each agent runs its own tool-use loop independently.

**What just happened:** You just ran three AI agents simultaneously. Each one made its own decisions about which tools to call and when to stop. The CRO Agent finished first (fewer tools, simpler data), the Performance Agent next, and the SEO Agent last (it had four tools to call and cross-reference). Then the synthesis step combined all three perspectives into one report.

## Step 10: Explore Your Results

Your report is at `reports/page-performance-audit.md`. Try these follow-ups:

```
Read the page audit report at reports/page-performance-audit.md. What are the top 3 quick wins? For each, tell me: what's the fix, why it matters, and what metric it would improve.
```

```
Show me the Core Web Vitals from the latest page audit in the database. Which ones pass Google's thresholds and which ones fail? Use the getCoreWebVitals function or run the SQL query directly.
```

```
What keywords from our Session 2 research are missing from the product page? Show me the keywords_missing field from the latest audit. Which of these have the highest search volume?
```

```
What does the Clarity data tell us about user behavior? What percentage of users scroll past the fold? Where are the rage clicks concentrated?
```

```
Compare what PageSpeed says about the page versus what Clarity shows. Are there cases where the page is technically fast but users still struggle? Or where a poor score doesn't actually affect behavior?
```

## Step 11: Verify the Data

Run these verification queries to confirm everything landed correctly:

```
Run these database queries and show me the results:
1. SELECT COUNT(*) FROM page_performance — how many audits are stored?
2. SELECT url, performance_score, seo_score, messaging_alignment_score, scroll_depth, rage_clicks, audited_at FROM page_performance ORDER BY audited_at DESC LIMIT 1 — latest audit scores
3. SELECT keywords_missing FROM page_performance ORDER BY audited_at DESC LIMIT 1 — what keywords are missing?
4. SELECT quick_wins FROM page_performance ORDER BY audited_at DESC LIMIT 1 — what are the quick wins?
```

Expected: 1 audit row with performance scores, a list of missing keywords as JSON, and a JSON array of quick wins.

Also check that the API serves the data:

```
Start the server with npm run dev and test these endpoints. Show me the response for each:
- GET http://localhost:3001/api/pages/latest
- GET http://localhost:3001/api/pages/vitals
- GET http://localhost:3001/api/pages/quick-wins
```

Expected: `/latest` returns the full audit record, `/vitals` returns CWV with pass/fail status strings, `/quick-wins` returns parsed JSON arrays.

## Step 12: Connect the MCP Servers (bonus)

If you have time, connect the Clarity and Playwright MCP servers for interactive exploration. These let you ask ad-hoc questions that go beyond the structured audit.

**Exit Claude Code first** (press `Ctrl+C` or type `/exit`).

```
claude mcp add clarity -- npx @microsoft/clarity-mcp-server --clarity_api_token=YOUR_TOKEN
claude mcp add playwright -- npx @anthropic-ai/playwright-mcp --headless
```

Re-enter Claude Code:

```
claude
```

Verify the connection:

```
What MCP tools do you have access to now? List any Clarity and Playwright tools and what each one does.
```

You should see tools like `query-analytics-dashboard` and `list-session-recordings` from Clarity, and navigation/screenshot tools from Playwright.

Now try interactive queries:

```
Using the Clarity MCP, what's the average scroll depth on the ProGRO product page over the last 30 days?
```

```
Using Playwright, navigate to the ProGRO product page and show me the H1 heading, meta description, and the first 3 H2 headings. Do they match what our SEO agent found?
```

**What just happened:** You used two different ways to access the same data sources. The orchestrator calls the Clarity API and fetches page HTML directly from TypeScript code. The MCP servers let Claude Code do the same thing interactively. The orchestrator is for structured, repeatable audits. The MCPs are for ad-hoc investigation when you want to dig deeper into a specific finding.

## Step 13: The Architecture — Why Three Agents?

Ask Claude:

```
Looking at the page audit orchestrator we built, why did we use three separate sub-agents instead of one big prompt that does everything? What are the specific tradeoffs? Give me concrete examples from our code.
```

The key reasons:

**Bounded context.** Each sub-agent only sees what it needs. The Performance Agent doesn't know about customer reviews. The SEO Agent doesn't know about Clarity data. Smaller context = more focused analysis. In our code, each sub-agent's `system` prompt and `tools` array are completely different.

**Specialized tools.** Each agent gets custom tools that match its expertise. The Performance Agent gets `run_pagespeed_audit`. The SEO Agent gets four tools for cross-referencing. The CRO Agent gets `query_clarity_dashboard`. No agent sees tools it doesn't need.

**Parallel execution.** All three agents run concurrently via `Promise.all()`. The total time is the slowest agent, not the sum of all agents. If you added a fourth agent (e.g., competitor page comparison), it would run in parallel too — just one more entry in the array.

**Clean synthesis.** The orchestrator's synthesis step receives three structured outputs and combines them. It doesn't need to understand how PageSpeed works or what Clarity metrics mean — it just needs to prioritize across domains.

**This is the same pattern used in production.** When you see "AI-powered audit tool" products, they're typically running specialized sub-agents with different models, tools, and prompts, coordinated by code.

### The Spectrum (updated)

| Level | Loop lives in... | What enforces it | Where we've been |
|---|---|---|---|
| **Recipe** | Nowhere — linear | The prompt | Sessions 1-2 |
| **Soft agent** | The prompt | Claude's compliance | Session 3 (skill template) |
| **Hard agent** | Code | Program logic | Session 3 (the code snippet) |
| **Orchestrator** | Code + delegation | Code + multiple agents | **Session 4** |

Session 3 showed you the gap between soft and hard agents. Session 4 shows you the next level: hard agents that coordinate other hard agents. The `runSubAgent()` function is itself a hard agent loop. The `main()` function is the orchestrator that dispatches three of them.

### What changed from Sessions 1-3:

- You **installed an AI SDK** and used it to make API calls to Claude from your own code
- You **built an orchestrator** that creates three separate Claude conversations
- You defined **custom tools** with JSON Schema that Claude knows how to call
- You implemented the **agentic tool-use loop** — the `while` pattern that every production agent uses
- Three sessions of accumulated data converged into one audit via **cross-session intelligence**
- You saw the difference between **MCP tools** (Claude Code plugins) and **SDK tools** (code-level tool definitions)

## Troubleshooting

**"ANTHROPIC_API_KEY is required"**
The orchestrator needs an Anthropic API key to run sub-agents. Check your `.env` file. Make sure `import "dotenv/config"` is the first line in the orchestrator.

**"Cannot find module '../tools/pages.js'"**
Make sure you created `src/tools/pages.ts` in Step 7. Check that it exports `insertPageAudit`.

**PageSpeed API returns an error**
Common issues: invalid API key, API not enabled in Google Cloud Console, or the target URL is unreachable. The orchestrator falls back to cached data automatically — check the console for the `📂 Using fallback data` message.

**Clarity API fails**
Check that both `CLARITY_API_TOKEN` and `CLARITY_PROJECT_ID` are set in `.env`. The token comes from Clarity project → Settings → Data Export → Generate new API token. Falls back to cached data automatically.

**"No such table: page_performance" or missing columns**
Run `npm run db:push` to apply the schema changes from Step 6.

**Orchestrator hangs or takes too long**
Each sub-agent has a max iteration limit (10). If one agent is looping, it may be retrying a failing tool. Press `Ctrl+C`, check the console output for error messages, and fix the tool handler. Common issue: a typo in the API URL or a missing env variable.

**TypeScript errors**
Run `npx tsc --noEmit` to check for type errors. Common issues: missing imports, wrong function signatures (the starter repo's `searchThreads` takes `(keyword, limit)` not `(keyword, {limit})`).

**Want to audit a different page?**
Set the `AUDIT_URL` environment variable:
```bash
AUDIT_URL=https://example.com/product npm run audit:page
```

**Using fallback data for everything?**
That's fine! The fallback data in `data/pages/` is realistic and demonstrates all the same concepts. The sub-agents still run their tool-use loops and make decisions — they just get cached data instead of live API responses.

## Homework

1. **Read the audit report.** Pick the top 3 quick wins that you could implement on the ProGRO product page. For each one, note: what's the fix, how hard is it (low/medium/high effort), and what metric should improve.

2. **Compare the data sources.** Look at what PageSpeed says about performance versus what Clarity shows about user behavior. Are there cases where the page loads fast but users still struggle? Or where a "poor" technical score doesn't actually affect user engagement?

3. **Bring your recommendations to Session 5.** The dashboard we build will surface these quick wins alongside all prior session data.

**Bonus:** Add a fourth sub-agent to the orchestrator. Create a new `buildCompetitorAgent()` function that audits Divi's product page for comparison. Add it to the `Promise.all()` array and update the synthesis prompt to include competitive comparison. How many lines of code does it take?

## What's Next

**Session 5:** We connect to Soapbox's live Meta Ads account and build the final dashboard — a custom web application that pulls data from all five sessions. Five panels, five data sources, one product command center. Everything we've built culminates in a tool the client actually uses.
