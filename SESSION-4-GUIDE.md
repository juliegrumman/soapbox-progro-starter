# Session 4: Product Page Performance Audit with Sub-Agents

Audit your product page with three specialized sub-agents — each an expert in one domain — coordinated by a TypeScript orchestrator you build yourself. Real multi-agent coordination using the Claude Agent SDK. In 60 minutes.

## What's Different About This Session

Sessions 1-2 were guided recipes. Session 3 introduced a single agent with a search-evaluate-refine loop — and showed you the gap between "prompt-driven" and "code-driven" agents.

Today you **close that gap.** You'll build a TypeScript orchestrator using the Claude Agent SDK that dispatches three specialized sub-agents — each with its own tools, expertise, and MCP server. The SDK manages the agentic loop, tool execution, and subagent coordination. You define the tools with Zod schemas, package them as MCP servers, and let the SDK handle the rest.

By the end, you'll have built:
- Custom tools with typed Zod schemas, packaged as MCP servers
- Three standalone agents that each run independently OR as part of an orchestrator
- An orchestrator that dispatches sub-agents using the SDK's native `agents` option
- A `save_audit_results` tool that persists data with Zod validation (no JSON regex parsing)
- An understanding of the Claude Agent SDK patterns used in production systems

## What You'll Need

- Your soapbox-progro project from Sessions 1-3
- An Anthropic API key (this powers the sub-agents — your instructor will provide one for the session)
- A Google PageSpeed Insights API key (free — get one at https://developers.google.com/speed/docs/insights/v5/get-started)
- Microsoft Clarity API credentials (provided by the client)
- A Meta Business Manager account with ad campaign access (for the Meta Ads MCP connection)

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

## Step 2: Install the Claude Agent SDK

This is the first session where we use the Claude Agent SDK. Unlike the base Anthropic SDK (which gives you raw API calls), the Agent SDK manages the agentic loop for you — no more writing `while` loops with `messages.create()`. You define tools, and the SDK handles tool execution, message history, and iteration.

```
Install @anthropic-ai/claude-agent-sdk and zod as dependencies. Then show me what was added to package.json.
```

You should see both `@anthropic-ai/claude-agent-sdk` and `zod` in the dependencies. The Agent SDK provides `query()` (the agentic loop), `tool()` (typed tool definitions), and `createSdkMcpServer()` (package tools as MCP servers). Zod provides the schema definitions for tool parameters.

**What just happened:** In Session 3, we discussed two levels: "soft agents" (loop in the prompt) and "hard agents" (loop in code). The Agent SDK is the production version of hard agents — it manages the loop, but you control the tools, prompts, and subagent structure. You don't write the `while` loop anymore. The SDK does that. You define **what** the agents can do. The SDK handles **how** they execute.

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
I'm about to use the Claude Agent SDK with custom tools that call external APIs:
1. Google PageSpeed Insights API — what data does it return, and is there any privacy concern with sending a URL?
2. Microsoft Clarity Data Export API — what data does it return, and what authentication does it use?
3. The Claude Agent SDK (@anthropic-ai/claude-agent-sdk) — how does it differ from the base @anthropic-ai/sdk? What does it do that we'd otherwise have to build ourselves?

Also: one of our tools will call fetch() on the ProGRO product page to scrape its HTML. Is there any concern with that?
```

**The bottom line:** PageSpeed Insights is a public Google API — anyone can check any URL. Clarity requires a bearer token scoped to the project (the client authorized this). The Agent SDK is Anthropic's official framework for building agents — it manages the loop, tool execution, and subagent coordination that we'd otherwise write by hand. Fetching a public product page is standard practice for SEO auditing.

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

## Step 7: Build the DB Tool File

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

**What just happened:** You built the fourth data access layer in this project. Same pattern as reviews, keywords, and Reddit — import, export functions, Drizzle queries. These functions will be used by the Agent SDK tools you build next.

## Step 8: Build the Agent Tools with Zod

This is the key difference from a hand-rolled approach. Instead of defining tools as raw JSON Schema objects with untyped handlers, the Agent SDK provides `tool()` — a function that takes a Zod schema, validates inputs automatically, and packages everything as an MCP server.

**8a. Study the pattern:**

```
Show me the imports available from @anthropic-ai/claude-agent-sdk. What do tool(), createSdkMcpServer(), and query() do?
```

The three key pieces:
- **`tool()`** — defines a custom tool with a name, description, Zod schema for parameters, and a handler function. The handler receives typed args (not `Record<string, unknown>`).
- **`createSdkMcpServer()`** — packages an array of tools into an MCP server that agents can use.
- **`query()`** — runs an agent session. Manages the agentic loop, tool execution, message history. You iterate with `for await`.

**8b. Create the tool files:**

```
Create a directory src/agents/tools/ and build four tool definition files:

1. src/agents/tools/pagespeed-tools.ts
   - Import { tool, createSdkMcpServer } from "@anthropic-ai/claude-agent-sdk" and { z } from "zod"
   - Define a "run_pagespeed_audit" tool with Zod schema: url (z.string()), strategy (z.enum(["mobile", "desktop"]).default("mobile"))
   - The handler calls the Google PageSpeed Insights API (same logic as the PageSpeed API call pattern), falls back to seed-pagespeed-results.json if no API key
   - The handler returns { content: [{ type: "text", text: JSON.stringify(result) }] }
   - Export a pagespeedServer via createSdkMcpServer({ name: "pagespeed", tools: [runPagespeedAudit] })

2. src/agents/tools/seo-tools.ts
   - Four tools: "fetch_page_content" (fetches URL, extracts SEO elements), "query_keyword_rankings" (wraps getKeywords from src/tools/keywords.ts), "search_reviews" (wraps searchReviews from src/tools/reviews.ts), "search_reddit_threads" (wraps searchThreads from src/tools/reddit.ts)
   - Each tool has a Zod schema and a typed handler
   - Export seoServer via createSdkMcpServer({ name: "seo", tools: [...] })

3. src/agents/tools/clarity-tools.ts
   - One tool: "query_clarity_dashboard" with metric enum. Handler calls Clarity API or falls back to seed data.
   - Export clarityServer

4. src/agents/tools/db-save-tools.ts
   - One tool: "save_audit_results" — a Zod schema matching the full audit data structure (all scores, CWV metrics, keywords, events, traffic sources). The handler calls insertPageAudit(), insertEventBatch(), insertSourceBatch() from src/tools/pages.ts
   - This replaces the fragile JSON-regex-parsing approach — the agent calls this tool with validated, typed arguments
   - Export dbSaveServer
```

**8c. Inspect the tool definitions:**

```
Show me the run_pagespeed_audit tool definition in src/agents/tools/pagespeed-tools.ts. Walk me through:
1. How does the Zod schema define the parameters?
2. What type does the handler receive? (Is it typed or Record<string, unknown>?)
3. What format does the handler return?
4. How is it packaged into an MCP server?
```

You should see:
- Zod schema: `{ url: z.string(), strategy: z.enum(["mobile", "desktop"]).default("mobile") }`
- Handler receives typed args: `(args: { url: string; strategy: "mobile" | "desktop" })`
- Returns: `{ content: [{ type: "text", text: "..." }] }` (MCP tool result format)
- Packaged: `createSdkMcpServer({ name: "pagespeed", tools: [runPagespeedAudit] })`

**What just happened:** You defined custom tools using Zod schemas instead of raw JSON Schema. This gives you type safety — the handler receives `args.url` as a `string`, not `input["url"] as string | undefined`. The tools are packaged as MCP servers, which means any agent can use them — standalone or as part of the orchestrator.

## Step 9: Build the Standalone Agents

Each agent is its own runnable file that:
1. **Exports** its config (system prompt, description) — for the orchestrator to import
2. **Exports** its MCP server reference — for the orchestrator to register
3. **Has** a standalone `main()` — for independent execution

**9a. Build the three agents:**

```
Create three agent files, each following this pattern:

1. src/agents/perf-agent.ts
   - Import { query } from "@anthropic-ai/claude-agent-sdk" and pagespeedServer from ./tools/pagespeed-tools.js
   - Export perfAgentConfig = { description: "...", prompt: "You are a web performance specialist..." }
   - Export { pagespeedServer } (re-export for the orchestrator)
   - Standalone main() uses query() with:
     - mcpServers: { pagespeed: pagespeedServer }
     - allowedTools: ["mcp__pagespeed__run_pagespeed_audit"]
     - tools: [] (no built-in tools needed)
     - permissionMode: "bypassPermissions"
     - The for-await loop handles messages and prints the result
   - Add npm script: "agent:perf": "tsx src/agents/perf-agent.ts"

2. src/agents/seo-messaging-agent.ts — same pattern with seoServer, allowedTools: ["mcp__seo__*"]

3. src/agents/cro-ux-agent.ts — same pattern with clarityServer
```

**9b. Inspect the agent pattern:**

```
Show me perf-agent.ts. Walk me through:
1. What does the for-await loop over query() look like?
2. What message types does it emit?
3. How is this different from the hand-rolled while loop we discussed in Session 3?
```

You should see:
```typescript
for await (const message of query({ prompt: "...", options: { ... } })) {
  if (message.type === "assistant") { /* stream output */ }
  if (message.type === "result") { /* done — check success/failure */ }
}
```

No `while` loop, no `messages.create()`, no manual tool result handling. The SDK manages all of that.

**9c. Test a standalone agent:**

```bash
npm run agent:perf
```

You should see the agent connect to its MCP server, call the PageSpeed tool, and return a structured analysis. If no PageSpeed API key is set, it uses fallback data.

**What just happened:** Each agent runs independently via `npm run agent:perf/seo/cro`. This means you can re-run just the SEO check after updating page copy, or just the CRO analysis after getting new Clarity data. They don't have to run together — but they can, via the orchestrator.

## Step 10: Build the Orchestrator

The orchestrator imports the three agents and uses the SDK's `agents` option for native subagent dispatch.

```
Create src/agents/page-audit-orchestrator.ts:

- Import { query } from "@anthropic-ai/claude-agent-sdk"
- Import the four MCP servers (pagespeedServer, seoServer, clarityServer, dbSaveServer)
- Import the three agent configs (perfAgentConfig, seoAgentConfig, croAgentConfig)

The orchestrator calls query() with:
- All four MCP servers registered at the parent level: mcpServers: { pagespeed, seo, clarity, db }
- allowedTools: ["Agent", "mcp__db__save_audit_results"] — the orchestrator can dispatch subagents and save results
- tools: [] — no built-in tools
- agents: three subagent definitions, each with:
  - description and prompt from the imported config
  - mcpServers: ["pagespeed"] (reference by name from the parent's registered servers)
  - model: "sonnet"
  - permissionMode: "bypassPermissions"
- systemPrompt: "You are the lead auditor. Dispatch three specialists, synthesize, then call save_audit_results."
- maxTurns: 30 (higher because of subagent dispatches)

The for-await loop streams output and captures the final result.
After the loop, write the markdown report to reports/page-performance-audit.md.

Add npm script: "audit:page": "tsx src/agents/page-audit-orchestrator.ts"
```

**10a. Inspect the orchestrator:**

```
Show me the orchestrator's query() call. Walk me through:
1. How are the subagents defined in the agents option?
2. How does each subagent get access to its MCP server?
3. What happens when the orchestrator dispatches a subagent? Does it call Promise.all()?
4. How does save_audit_results replace the old JSON regex parsing?
```

You should see:
- Subagents defined inline with `description`, `prompt`, `mcpServers: ["pagespeed"]`
- MCP servers registered at parent level, subagents reference by name
- **No `Promise.all()`** — the SDK handles parallelization. The orchestrator agent decides when to dispatch subagents, and the SDK manages the execution.
- `save_audit_results` is a tool the orchestrator calls with typed Zod-validated arguments — no regex, no JSON parsing

**Quick checklist** — make sure your orchestrator:
- Has `import "dotenv/config"` as the first import
- Registers all 4 MCP servers at the parent level
- Uses `allowedTools: ["Agent", "mcp__db__save_audit_results"]`
- Defines three subagents in the `agents` option, each referencing its MCP server by name
- Sets `permissionMode: "bypassPermissions"` for headless execution
- Writes the report file after the query loop

## Step 11: Run It

```bash
npm run audit:page
```

Or from inside Claude Code:

```
Run the page audit orchestrator by executing: npx tsx src/agents/page-audit-orchestrator.ts
```

**Watch the terminal.** The orchestrator will dispatch three subagents. Each runs its own agentic loop with the SDK managing tool calls automatically. After all three complete, the orchestrator synthesizes their findings and calls `save_audit_results` to persist everything to the database.

**What just happened:** The SDK handled the entire agentic loop for each subagent — tool discovery, tool execution, result collection, iteration control. You didn't write a single `while` loop or `messages.create()` call. You defined the tools, the agent prompts, and the subagent structure. The SDK did the rest.

## Step 12: Explore Your Results

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

## Step 13: Verify the Data

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

## Step 14: Connect the Meta Ads MCP

Now we're going to connect to Soapbox's live Meta Ads account. This uses the Pipeboard Meta Ads MCP — a remote MCP server that connects Claude to the Meta Ads API via a token-based URL (no OAuth dance required).

**14a. Get your Pipeboard token.**

If you don't already have one, sign up at [pipeboard.co](https://pipeboard.co), connect your Meta Business Manager account, and copy your project token (it looks like `pk_xxxxxxxxxxxxx`).

**14b. Add the MCP server at project scope.**

We use **project scope** (not user scope) for two reasons:
- The Meta Ads agent uses `settingSources: ["project"]` so it only sees the meta-ads server — not every other MCP server you happen to have installed
- The configuration travels with the repo, so anyone who clones it gets the same setup

**Exit Claude Code first** (press `Ctrl+C` or type `/exit`), then run:

```
claude mcp add meta-ads --scope project --transport http https://meta-ads.mcp.pipeboard.co/?token=pk_xxxxxxxxxxxxx
```

This creates `.mcp.json` in the project root.

**14c. Gitignore the MCP config.**

`.mcp.json` contains your Pipeboard token. Add it to `.gitignore` so the token never gets pushed:

```
Add .mcp.json to .gitignore so my Pipeboard token doesn't get committed.
```

Re-enter Claude Code:

```
claude
```

**14d. Verify the connection:**

```
What MCP tools do you have access to now? List any Meta Ads tools and what each one does.
```

You should see tools like `get_ad_accounts`, `get_campaigns`, `get_insights`, `get_ads`, `get_ad_creatives`, and more.

## Step 15: Expand the meta_ads Schema for Ad-Level Data

The default `meta_ads` table only stores campaign-level metrics. The Pipeboard MCP gives us much more — ad-level identifiers, reach/frequency, CPM, creative text (headlines, body copy, CTAs). The whole point of Session 5's analysis is to cross-reference *ad copy* against *customer language*, so we need to actually persist that creative content.

```
Update the meta_ads table in src/db/schema.ts to capture ad-level data and creative content. Keep the existing columns (campaignId, campaignName, adSetName, spend, impressions, clicks, conversions, roas, ctr, cpc, pulledAt) and add these new ones:

Identifiers:
- adSetId (text)
- adId (text)
- adName (text)

Campaign metadata:
- campaignObjective (text)
- campaignStatus (text) — effective_status from Meta (ACTIVE, PAUSED, etc.)

Audience metrics:
- reach (integer)
- frequency (real)
- uniqueClicks (integer)
- cpm (real)

Conversion metrics:
- conversionValue (real)
- purchaseConversions (integer)
- costPerResult (real)

Creative content (this is the whole point — what the customer actually sees):
- headline (text)
- bodyText (text)
- callToAction (text)
- imageUrl (text)
- linkUrl (text)

Then run npm run db:push to apply the changes.
```

Verify the schema:

```
Show me the meta_ads table definition. How many columns does it have now?
```

You should see ~28 columns (up from ~12).

**What just happened:** You expanded the schema to hold the data that makes the Session 5 analysis worth doing. Without `headline` and `bodyText`, you can't ask "are our ads using the same words customers use in 5-star reviews?" — that question requires the ad copy to live next to the review copy in the same database.

## Step 16: Update the save_ad_results Tool

The `save_ad_results` tool in `src/agents/tools/db-save-tools.ts` has a Zod schema that mirrors the schema columns. When you add columns, you need to add them to the Zod schema too — otherwise the agent can't pass them through.

```
Update the save_ad_results tool in src/agents/tools/db-save-tools.ts. The Zod schema for each campaign object should include all the new columns we just added: adSetId, adId, adName, campaignObjective, campaignStatus, reach, frequency, uniqueClicks, cpm, conversionValue, purchaseConversions, costPerResult, headline, bodyText, callToAction, imageUrl, linkUrl. Mark each as optional. Add z.string().describe() lines for the creative fields so the agent knows what to pass.

Also update the AdRecord type in src/tools/ads.ts to match, and make sure both insertAd and insertAdBatch use that shared type.
```

Verify:

```
Show me the saveAdResults tool definition and the AdRecord type. Confirm they have all 17 new fields.
```

**What just happened:** The Zod schema is what the agent reads to know what data it can pass to the save tool. By keeping the schema in sync with the table, you let the agent send rich, validated data in a single call — no JSON regex parsing, no fragile string concatenation.

## Step 17: Run the Meta Ads Agent

The Meta Ads agent follows the same Agent SDK pattern as the page audit agents, but connects to the Pipeboard MCP (via `settingSources: ["project"]`) and cross-references with Sessions 1-3 data.

```bash
npm run agent:ads
```

Watch the terminal — you should see the agent:
1. Authenticate to the Pipeboard MCP automatically (token in URL, no OAuth prompt)
2. Pull ad accounts, campaigns, ads, and ad creatives
3. Pull insights at the ad level (level="ad") for the last 30 days
4. Search reviews/keywords/Reddit in parallel for cross-reference data
5. Call `save_ad_results` with full ad-level records (creative text + metrics)
6. Generate a markdown analysis with ad angle recommendations

**Verify the data landed:**

```
Run this query and show me the results:
SELECT ad_id, ad_name, headline, body_text, call_to_action, reach, frequency, cpm, campaign_status
FROM meta_ads ORDER BY id DESC LIMIT 8;
```

You should see one row per ad, with full creative text and audience-level metrics — not just campaign-level rollups.

**What just happened:** You ran a fourth standalone agent that connects to an external MCP server (Pipeboard), pulls live Meta Ads data including individual ad creatives, cross-references with your accumulated Sessions 1-3 intelligence, and persists everything to the database. Same SDK pattern, richer data model. Now Session 5's dashboard can show ad copy alongside review quotes — the foundation for the "customer language vs. marketing language" analysis.

## Step 18: The Architecture — Why This Works

Ask Claude:

```
Looking at the agents we built, explain the architecture:
1. How do the tool files in src/agents/tools/ define typed tools with Zod?
2. How does each agent file export its config for the orchestrator while also being independently runnable?
3. How does the orchestrator's agents option differ from manually dispatching with Promise.all()?
4. Why is save_audit_results a tool instead of post-loop code?
```

The key patterns:

**Typed tools with Zod.** Each tool defines its parameters as a Zod schema. The handler receives typed args (`args.url` is a `string`, not `unknown`). The SDK validates inputs automatically. This eliminates an entire class of bugs.

**Dual-mode agents.** Each agent file exports a config object (for the orchestrator) and has a standalone `main()`. Run one agent alone or run all three together. Adding a fourth agent means creating a new file and adding it to the orchestrator's `agents` option.

**SDK-managed subagents.** The orchestrator doesn't use `Promise.all()`. It defines subagents in the `agents` option, and the SDK handles dispatch, execution, and result collection. The orchestrator agent decides when to invoke each subagent as part of its natural reasoning.

**Save as a tool.** `save_audit_results` is a custom tool with a Zod schema matching the full audit data structure. The orchestrator agent calls it with validated arguments. No regex parsing, no JSON extraction from markdown. Zod validates the data before it hits the database.

### The Spectrum (final)

| Level | Loop lives in... | What enforces it | Where we've been |
|---|---|---|---|
| **Recipe** | Nowhere — linear | The prompt | Sessions 1-2 |
| **Soft agent** | The prompt | Claude's compliance | Session 3 (skill template) |
| **Hard agent** | Code | Program logic | Session 3 (code snippet) |
| **Agent SDK** | The SDK | SDK + typed tools + MCP servers | **Session 4** |

### What changed from Sessions 1-3:

- You **installed the Claude Agent SDK** — the production framework for building agents
- You defined **typed tools with Zod** instead of raw JSON Schema
- You packaged tools as **MCP servers** using `createSdkMcpServer()`
- You used **`query()`** instead of manual `while` loops with `messages.create()`
- You used **native subagent dispatch** via the `agents` option
- You built a **save tool** that replaces fragile JSON regex parsing with Zod validation
- Each agent is **independently runnable** — a modular, composable system

## Troubleshooting

**"ANTHROPIC_API_KEY is required"**
The agents need an Anthropic API key. Check your `.env` file.

**PageSpeed API returns an error**
Common issues: invalid API key, API not enabled in Google Cloud Console, or the target URL is unreachable. The tool falls back to cached data automatically.

**Clarity API fails**
Check that both `CLARITY_API_TOKEN` and `CLARITY_PROJECT_ID` are set in `.env`. Falls back to cached data automatically.

**Meta Ads MCP won't connect**
Make sure you ran `claude mcp add meta-ads --scope project --transport http https://meta-ads.mcp.pipeboard.co/?token=YOUR_TOKEN` outside of Claude Code (exit first). Check `claude mcp list` to confirm it's connected. If the token is invalid, the server will say so on connect.

**Token leaked to git**
If you accidentally committed `.mcp.json` before adding it to `.gitignore`, rotate your Pipeboard token immediately and remove the file from git history.

**"No such table: page_performance" or missing columns**
Run `npm run db:push` to apply the schema changes from Step 6.

**Agent hangs or takes too long**
Each agent has a `maxTurns` limit. If an agent is looping, it may be retrying a failing tool. Press `Ctrl+C`, check the console output.

**TypeScript errors**
Run `npx tsc --noEmit` to check for type errors.

**Want to audit a different page?**
```bash
AUDIT_URL=https://example.com/product npm run audit:page
```

**Running standalone agents:**
```bash
npm run agent:perf    # Just PageSpeed
npm run agent:seo     # Just SEO + messaging
npm run agent:cro     # Just Clarity UX
npm run agent:ads     # Just Meta Ads
npm run audit:page    # All three + synthesis + save
```

## Homework

1. **Read the audit report.** Pick the top 3 quick wins. For each: what's the fix, effort level, and which metric improves.

2. **Run a single agent.** Try `npm run agent:seo` by itself. How does the output differ from the orchestrated version?

3. **Bring your recommendations to Session 5.** The dashboard we build will surface these quick wins alongside all prior session data.

**Bonus:** Add a fourth subagent. Create `src/agents/tools/competitor-tools.ts` with a tool that fetches a competitor's page, and `src/agents/competitor-agent.ts` that compares it against the ProGRO page. Add it to the orchestrator's `agents` option. How many files and how many lines?

## What's Next

**Session 5:** We build the final dashboard — a custom web application that pulls data from all five sessions. Five panels, five data sources, one product command center. Everything we've built culminates in a tool the client actually uses.
