# Session 4: Product Page Performance Audit with Sub-Agents

Audit your product page with three specialized sub-agents — each an expert in one domain — coordinated by a TypeScript orchestrator. Real multi-agent coordination, not a prompt pretending to be multiple agents. In 60 minutes.

## What's Different About This Session

Sessions 1-2 were guided recipes. Session 3 introduced a single agent with a search-evaluate-refine loop — and showed you the gap between "prompt-driven" and "code-driven" agents.

Today you **close that gap.** The main deliverable is a TypeScript file that uses the Anthropic SDK to run three separate Claude instances in parallel, each with its own tools and expertise. Code controls the flow. Claude controls the content. This is the orchestrator pattern from Session 3's spectrum — and it's what production multi-agent systems actually look like.

By the end, you'll have:
- Connected two new external tools (Google PageSpeed API + Microsoft Clarity MCP)
- Built a tool file for page audit data
- Walked through a real multi-agent orchestrator
- Run three sub-agents in parallel and watched them synthesize
- A complete product page audit with cross-session intelligence
- An understanding of why sub-agent delegation works

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
cd soapbox-progro && npm install && npm run db:push && npm run seed && npm run seed:keywords && npm run seed:reddit && npm run seed:pages && claude
```

## Step 2: Set Up Your API Keys

You need three API keys for the full experience. The orchestrator will fall back to cached data for any missing key, so you can proceed even if you're missing one or two.

**2a. Anthropic API key (required)**

This powers the sub-agents. Without it, the orchestrator can't run.

```
Add ANTHROPIC_API_KEY to my .env file. The key is: <your-key-here>
```

**2b. Google PageSpeed Insights API key (optional)**

Get a free key from the Google Cloud Console. No billing required for PageSpeed Insights.

```
Add PAGESPEED_API_KEY to my .env file. The key is: <your-key-here>
```

If you skip this, the orchestrator uses cached PageSpeed data from a previous audit.

**2c. Microsoft Clarity credentials (optional)**

Your instructor will provide the project's Clarity API token and project ID.

```
Add CLARITY_API_TOKEN and CLARITY_PROJECT_ID to my .env file.
CLARITY_API_TOKEN=<token>
CLARITY_PROJECT_ID=<project-id>
```

If you skip this, the orchestrator uses cached Clarity behavioral data.

## Step 3: Connect the MCP Servers (for interactive use)

These MCP servers aren't used by the orchestrator (it calls APIs directly via code), but they're useful for interactive follow-up questions in Claude Code.

**Exit Claude Code first** (press `Ctrl+C` or type `/exit`).

```
claude mcp add clarity -- npx @microsoft/clarity-mcp-server --clarity_api_token=YOUR_TOKEN
claude mcp add playwright -- npx @anthropic-ai/playwright-mcp --headless
```

Re-enter Claude Code:

```
claude
```

Verify:

```
What MCP tools do you have access to now? List any Clarity and Playwright tools.
```

**Can't get them working?** That's fine — the MCP servers are a bonus for interactive exploration. The orchestrator runs independently.

## Step 4: Warm-Up — What Do We Know So Far?

Before auditing the product page, let's see what intelligence we've gathered across Sessions 1-3:

```
What do we know about ProGRO Density+ so far? Summarize the key findings from:
1. Competitive reviews (Session 1) — what are customers saying about hair growth serums?
2. Keyword rankings (Session 2) — what are the highest-volume keywords?
3. Reddit threads (Session 3) — what concerns do people have?

Query the database for each.
```

**What just happened:** Claude queried three different database tables from three different sessions and combined the intelligence. This is why all sessions share one database — downstream agents can cross-reference upstream data. The page audit will do exactly this, but automatically.

## Step 5: Build the Tool File

Study the established pattern:

```
Show me the structure of src/tools/keywords.ts and src/tools/reddit.ts side by side. What pattern do they follow?
```

Now build yours:

```
Create src/tools/pages.ts following the same pattern, but for the page_performance table. I need functions to:
1. Get all page audits (filterable by URL)
2. Get the latest audit for a specific URL
3. Get an aggregate summary (latest scores per URL)
4. Get Core Web Vitals with pass/fail thresholds (LCP < 2500ms good, CLS < 0.1 good, etc.)
5. Get Clarity behavioral metrics (scroll depth, engagement, rage clicks, etc.)
6. Get messaging alignment data (score, keywords found/missing, gaps)
7. Insert a complete page audit record
8. Search recommendations by keyword
```

**Quick checklist** — make sure your file:
- Imports from `../db/index.js` and `../db/schema.js`
- Has `insertPageAudit` that adds an `auditedAt` timestamp
- Has `getCoreWebVitals` with SQL CASE statements for pass/fail status
- Has `getLatestAudit` that orders by `auditedAt DESC LIMIT 1`

**Note:** If you're short on time, the tool file is already pre-built at `src/tools/pages.ts`. You can skip building it and just read through it to understand the pattern.

## Step 6: Walk Through the Orchestrator

This is the main event. Open the orchestrator file and study it:

```
Read src/agents/page-audit-orchestrator.ts. Walk me through the architecture:
1. What is the runSubAgent() function doing? Explain the agentic tool-use loop.
2. What are the three sub-agents? What tools does each one have?
3. How does the orchestrator dispatch them? Are they sequential or parallel?
4. What happens in the synthesis step?
5. How do the results get saved?
```

### What to look for:

**The `runSubAgent()` helper** is the core pattern. It:
1. Sends a task to Claude via `messages.create()` with a specialized system prompt and custom tools
2. If Claude requests a tool call, executes the tool locally and passes the result back
3. Loops until Claude is done (the "agentic tool-use loop")
4. Returns the agent's text output

**Three sub-agents, each specialized:**

| Agent | Persona | Tools | Data Source |
|---|---|---|---|
| Technical Performance | Web performance specialist | `run_pagespeed_audit` | Google PageSpeed API |
| SEO + Messaging | On-page SEO strategist | `fetch_page_content`, `query_keyword_rankings`, `search_reviews`, `search_reddit_threads` | Page HTML + Sessions 1-3 DB |
| Conversion/UX | CRO specialist | `query_clarity_dashboard` | Microsoft Clarity API |

**Parallel dispatch:** All three agents run concurrently via `Promise.all()`. They don't need each other's output, so why wait?

**Synthesis:** A fourth Claude call receives all three agents' outputs and produces a unified report with a top-10 quick wins list.

## Step 7: Run It

```bash
npm run audit:page
```

Or from inside Claude Code:

```
Run the page audit orchestrator: npx tsx src/agents/page-audit-orchestrator.ts
```

**Watch the terminal.** You should see something like:

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

Notice how the three agents interleave — they're running in parallel. The Performance Agent calls PageSpeed twice (mobile + desktop). The SEO Agent calls four different tools (page fetch, keywords, reviews, Reddit). The CRO Agent calls Clarity. Each agent runs its own tool-use loop independently.

## Step 8: Explore Your Results

Your report is at `reports/page-performance-audit.md`. Try these follow-ups:

```
Read the page audit report. What are the top 3 quick wins?
```

```
Show me the Core Web Vitals from the latest audit. Which ones pass Google's thresholds and which ones fail?
```

```
What keywords from our Session 2 research are missing from the product page? Which are the highest volume?
```

```
What does the Clarity data tell us about user behavior? What percentage of users scroll past the fold?
```

```
Compare what PageSpeed says about the page versus what Clarity shows. Are there cases where the page is technically fast but users still struggle?
```

## Step 9: Verify the Data

Run these verification queries:

```
Run these database queries and show me the results:
1. How many page audits are in the database?
2. What are the Core Web Vitals for the latest audit? Do they pass Google's thresholds?
3. What's the messaging alignment score? Which keywords are missing from the page?
4. What are the top 5 quick wins from the audit?
5. How does the scroll depth compare to where key content sections are placed?
```

Also check that the API serves the data:

```
Start the server with npm run dev and test these endpoints:
- GET /api/pages/latest — does it return the audit?
- GET /api/pages/vitals — does it show Core Web Vitals with pass/fail?
- GET /api/pages/quick-wins — does it return the quick wins list?
```

## Step 10: Try the MCP Servers (bonus)

If you connected the Clarity and Playwright MCPs in Step 3, try interactive queries:

```
Using the Clarity MCP, what's the average scroll depth on the ProGRO product page?
```

```
Using Playwright, navigate to the ProGRO product page and show me the H1 heading, meta description, and the first 3 H2 headings.
```

These MCPs let you ask ad-hoc questions that go beyond what the orchestrator checks. The orchestrator runs a structured audit; the MCPs let you dig deeper into specific findings.

## Step 11: The Architecture — Why Three Agents?

Ask Claude:

```
Looking at the page audit orchestrator, why did we use three separate sub-agents instead of one big prompt that does everything? What are the tradeoffs?
```

The key reasons:

**Bounded context.** Each sub-agent only sees what it needs. The Performance Agent doesn't need to know about customer reviews. The SEO Agent doesn't need Clarity data. Smaller context = more focused analysis.

**Specialized tools.** Each agent gets custom tools that match its expertise. The Performance Agent gets `run_pagespeed_audit`. The SEO Agent gets four tools for cross-referencing. The CRO Agent gets `query_clarity_dashboard`. No agent sees tools it doesn't need.

**Parallel execution.** All three agents run concurrently. If you added a fourth agent (e.g., competitor page comparison), it would run in parallel too. The total time is the slowest agent, not the sum of all agents.

**Clean synthesis.** The orchestrator's synthesis step receives three structured outputs and combines them. It doesn't need to understand how PageSpeed works or what Clarity metrics mean — it just needs to prioritize across domains.

**This is the same pattern used in production.** When you see "AI-powered audit tool" products, they're typically running specialized sub-agents with different models, tools, and prompts, coordinated by code.

### The Spectrum (updated)

| Level | Loop lives in... | What enforces it | Where we've been |
|---|---|---|---|
| **Recipe** | Nowhere — linear | The prompt | Sessions 1-2 |
| **Soft agent** | The prompt | Claude's compliance | Session 3 (skill template) |
| **Hard agent** | Code | Program logic | Session 3 (the code snippet) |
| **Orchestrator** | Code + delegation | Code + multiple agents | **Session 4** |

Session 3 showed you the gap between soft and hard agents. Session 4 shows you the next level: hard agents that coordinate other hard agents.

## Troubleshooting

**"ANTHROPIC_API_KEY is required"**
The orchestrator needs an Anthropic API key to run sub-agents. Check your `.env` file.

**PageSpeed API returns an error**
Common issues: invalid API key, API not enabled in Google Cloud Console, or the target URL is unreachable. The orchestrator falls back to cached data automatically.

**Clarity API fails**
Check that both `CLARITY_API_TOKEN` and `CLARITY_PROJECT_ID` are set in `.env`. The token comes from Clarity project → Settings → Data Export → Generate new API token. Falls back to cached data automatically.

**"No such table: page_performance"**
Run `npm run db:push` to create the table from the schema.

**Orchestrator hangs or takes too long**
Each sub-agent has a max iteration limit (10). If one agent is looping excessively, check the tool handlers — they may be returning errors that cause the agent to retry. Press `Ctrl+C` to stop, then check the console output for clues.

**TypeScript errors**
Run `npx tsc --noEmit` to check for type errors across the project.

**Want to audit a different page?**
Set the `AUDIT_URL` environment variable:
```bash
AUDIT_URL=https://example.com/product npm run audit:page
```

**Using fallback data for everything?**
That's fine! Run `npm run seed:pages` to load the pre-baked audit data, then explore it with the queries in Step 9. The fallback data is realistic and demonstrates all the same concepts.

## Homework

1. **Read the audit report.** Pick the top 3 quick wins that you could implement on the ProGRO product page. For each one, note: what's the fix, how hard is it (low/medium/high effort), and what metric should improve.

2. **Compare the data sources.** Look at what PageSpeed says about performance versus what Clarity shows about user behavior. Are there cases where the page loads fast but users still struggle? Or where a "poor" technical score doesn't actually affect user engagement?

3. **Bring your recommendations to Session 5.** The dashboard we build will surface these quick wins alongside all prior session data.

**Bonus:** Add a fourth sub-agent to the orchestrator. Ideas:
- A **competitor page agent** that audits Divi's product page for comparison
- An **accessibility agent** that does a deeper WCAG audit
- A **content quality agent** that evaluates the page copy for readability and persuasion

## What's Next

**Session 5:** We connect to Soapbox's live Meta Ads account and build the final dashboard — a custom web application that pulls data from all five sessions. Five panels, five data sources, one product command center. Everything we've built culminates in a tool the client actually uses.
