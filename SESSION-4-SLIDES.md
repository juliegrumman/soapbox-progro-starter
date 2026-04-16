# Session 4 Slide Content

---

## Slide: Where We Left Off
*Session 04*

| Session 1 | Session 2 | Session 3 | Session 4 |
|---|---|---|---|
| Pre-built skill | Skill + tool file | You build the tool file + agent brief | **You build the agents themselves — in code** |
| Recipe | Recipe with API call | Soft agent (loop in prompt) | **Hard agent (loop in the SDK)** |
| Reviews in DB | Keyword rankings in DB | Reddit threads in DB | Page audit + Meta Ads in DB |

---

## Slide: The Big Shift
*From "agent as prompt" to "agent as program"*

### Session 3 ended with a question
**Who controls the loop?**
- The skill template put the loop in the prompt → Claude *chose* to iterate
- The 50-line code snippet put the loop in code → the program *enforced* iteration

### Session 4 takes the second path — at production scale
- We use **Anthropic's official framework** for building agents in code
- We define **typed tools** with validated parameters
- We orchestrate **multiple agents** that each have their own expertise
- We connect to **external MCP servers** for live data

> Sessions 1-3: agents that work because Claude follows instructions.
> Session 4: agents that work because the code enforces the structure.

---

## Slide: What is an SDK?
*The single most important word in this session*

**API** = Application Programming Interface
A raw endpoint you send HTTP requests to. You handle every detail yourself.

**SDK** = Software Development Kit
A library that wraps the API and gives you higher-level building blocks. Less boilerplate, more guardrails.

### The same job, two layers

| Layer | What you write | What you handle |
|---|---|---|
| **Anthropic API** (`@anthropic-ai/sdk`) | Raw `messages.create()` calls | Loop, tool execution, message history, retries, errors |
| **Claude Agent SDK** (`@anthropic-ai/claude-agent-sdk`) | `query()` with tools and prompt | Tools and prompt — that's it |

> An SDK is opinionated. It makes the common case easy and the right way obvious.

---

## Slide: API vs SDK — The Code
*Same agent, two implementations*

### With the API: you write the loop
```ts
let messages = [{ role: "user", content: "..." }];
while (true) {
  const res = await client.messages.create({ model, messages, tools });
  messages.push({ role: "assistant", content: res.content });
  if (res.stop_reason === "end_turn") break;
  for (const block of res.content) {
    if (block.type === "tool_use") {
      const result = await runTool(block.name, block.input);
      messages.push({ role: "user", content: [{ type: "tool_result", ... }] });
    }
  }
}
```

### With the SDK: the loop is gone
```ts
for await (const message of query({
  prompt: "...",
  options: { mcpServers: { db: dbServer }, allowedTools: ["mcp__db__*"] }
})) {
  if (message.type === "assistant") /* stream output */
  if (message.type === "result") /* done */
}
```

> No `while`. No tool dispatch. No message history bookkeeping.
> You define **what** the agent can do. The SDK handles **how**.

---

## Slide: What is Zod?
*Why we don't pass raw JSON to our tools*

**Zod** = a TypeScript schema validation library

You describe the shape of your data once, and Zod gives you:
- **Runtime validation** — bad input is rejected before it reaches your code
- **TypeScript types** — your handler receives `args.url: string`, not `unknown`
- **Self-documenting tools** — the schema *is* the tool's parameter spec

### Without Zod
```ts
async function handler(input: Record<string, unknown>) {
  const url = input["url"] as string; // hope it's actually a string!
}
```

### With Zod
```ts
tool("run_audit", "Audit a page", {
  url: z.string().describe("The page URL to audit"),
  strategy: z.enum(["mobile", "desktop"]).default("mobile"),
}, async (args) => {
  // args.url is a string. args.strategy is "mobile" | "desktop". Guaranteed.
});
```

> Zod converts your TypeScript types into runtime checks. The agent knows what to send. The handler knows what it'll receive. The bug class disappears.

---

## Slide: What We're Building
*Session 04 — Multi-Agent Page Auditor + Meta Ads Agent*

A TypeScript orchestrator that dispatches **three specialist sub-agents** to audit the ProGRO product page in parallel — plus a **fourth standalone agent** that pulls live Meta Ads data and cross-references it with everything we've built.

### Five components:

**MCP TOOLS** > **AGENTS** > **ORCHESTRATOR** > **EXTERNAL MCP** > **DATABASE**

- **MCP Tools** (`src/agents/tools/`): Custom tools defined with Zod schemas, packaged as MCP servers via `createSdkMcpServer()`
- **Sub-Agents** (`src/agents/`): Three standalone agents — performance, SEO+messaging, conversion/UX — each with its own tools and expertise
- **Orchestrator** (`page-audit-orchestrator.ts`): Dispatches sub-agents using the SDK's native `agents` option, synthesizes findings, calls the save tool
- **External MCP** (`.mcp.json`): The Pipeboard Meta Ads MCP — a remote server connecting Claude to live Meta Ads data
- **Database**: All five sessions write to the same SQLite DB through Zod-validated save tools

---

## Slide: The Multi-Agent Architecture
*Orchestrator + sub-agents, native to the SDK*

```
                    ┌──────────────────────┐
                    │   Orchestrator Agent │
                    │  (decides who to     │
                    │   dispatch & when)   │
                    └──────────┬───────────┘
                               │ agents: [...]
          ┌────────────────────┼────────────────────┐
          ▼                    ▼                    ▼
   ┌────────────┐       ┌────────────┐       ┌────────────┐
   │ Perf Agent │       │ SEO Agent  │       │ CRO Agent  │
   │ PageSpeed  │       │ Page +     │       │ Clarity    │
   │ MCP        │       │ Reviews +  │       │ MCP        │
   │            │       │ Keywords   │       │            │
   └─────┬──────┘       └─────┬──────┘       └─────┬──────┘
         └──────────┬─────────┴──────────┬─────────┘
                    ▼                    ▼
           ┌──────────────────────────────────┐
           │   save_audit_results (Zod tool)  │
           │       ↓                          │
           │   page_performance table         │
           └──────────────────────────────────┘
```

> The orchestrator doesn't call `Promise.all()`. It declares the sub-agents in the `agents` option, and the SDK manages dispatch, execution, and result collection.

---

## Slide: Deep Dive — The SEO + Messaging Agent
*The agent that only works because Sessions 1-3 exist*

This is the most cross-session-dependent sub-agent. Technical SEO is the easy part — the real job is asking: **"does our page speak the language of actual customers?"**

### Its four tools
| Tool | What it reads | Source |
|---|---|---|
| `fetch_page_content` | Title, meta desc, H1-H6, body text, image alts, JSON-LD | Live fetch of ProGRO page (falls back to cached HTML) |
| `query_keyword_rankings` | Top keywords by volume, intent, cluster | `keyword_rankings` table (Session 2) |
| `search_reviews` | Customer language for themes like "thinning", "results" | `competitive_reviews` table (Session 1) |
| `search_reddit_threads` | Real consumer concerns and questions | `reddit_threads` table (Session 3) |

### What it returns
A structured JSON object with five fields:
- **`onPageElements`** — title, meta desc, H1, key headings actually found on the page
- **`keywordAnalysis`** — keywords present vs. high-value keywords missing
- **`messagingGaps`** — customer themes/language from reviews + Reddit that the page never addresses
- **`alignmentScore`** — 0-100, with a breakdown across keyword coverage, customer language usage, and objection handling
- **`topRecommendations`** — 5 highest-leverage SEO/messaging improvements

### The loop it runs (standalone mode)
1. Fetch the ProGRO page HTML → extract on-page elements
2. Pull top keywords by search volume from the DB
3. Search reviews for themes: "thinning", "results", "growth"
4. Search Reddit for: "hair density", "hair growth serum"
5. Cross-reference presence/absence → compute alignment score

> This agent is the strongest argument for the whole 5-session arc. You *can't* build it in Session 1. You need reviews + keywords + Reddit already in the DB before "messaging alignment" is even a question you can ask.

---

## Slide: The Tool Pattern
*One file. One Zod schema. One MCP server.*

```ts
import { tool, createSdkMcpServer } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";

const runPagespeedAudit = tool(
  "run_pagespeed_audit",                          // ← name
  "Run Google PageSpeed Insights on a URL.",      // ← description
  {                                               // ← Zod schema
    url: z.string(),
    strategy: z.enum(["mobile", "desktop"]).default("mobile"),
  },
  async (args) => {                               // ← typed handler
    const result = await fetch(`...?url=${args.url}&strategy=${args.strategy}`);
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
  }
);

export const pagespeedServer = createSdkMcpServer({
  name: "pagespeed",
  tools: [runPagespeedAudit],                     // ← package as MCP server
});
```

> The same MCP server can be used by a standalone agent OR by the orchestrator.
> Adding a tool = adding one entry to the array.

---

## Slide: Save as a Tool
*Killing JSON-regex parsing for good*

### The old way: hope Claude formats output correctly
```ts
const text = response.content[0].text;
const match = text.match(/```json\s*([\s\S]*?)```/);
const data = JSON.parse(match[1]); // 🤞 hope this works
db.insert(pagePerformance).values(data);
```

### The new way: a tool with a Zod schema
```ts
tool("save_audit_results", "Save the audit to the database.", {
  performanceScore: z.number().optional(),
  lcp: z.number().optional(),
  scrollDepth: z.number().optional(),
  events: z.array(z.object({ ... })).optional(),
  // ...all the fields the agent should pass
}, async (args) => {
  await insertPageAudit(args);
});
```

> The agent calls the tool with validated, typed arguments.
> No regex. No JSON parsing. No failures from a missing closing brace.

---

## Slide: Standalone OR Orchestrated
*Every agent is its own runnable file*

```bash
npm run agent:perf     # Just PageSpeed
npm run agent:seo      # Just SEO + messaging
npm run agent:cro      # Just Clarity UX
npm run agent:ads      # Meta Ads (Pipeboard MCP)
npm run audit:page     # Orchestrator → all three + synthesis + save
```

### Each agent file does three things:
1. **Exports its config** (`description` + `prompt`) — for the orchestrator to import
2. **Exports its MCP server** — for the orchestrator to register at the parent level
3. **Has a standalone `main()`** — so you can run it alone

> Re-run just the SEO check after editing page copy. Re-run just the CRO analysis after fresh Clarity data. They're independent — but they compose.

---

## Slide: What Running the Orchestrator Produces
*`npm run audit:page` → two artifacts, one pass*

After the three sub-agents report back, the orchestrator synthesizes their findings and produces **two things at once**:

### 1. A markdown report → `reports/page-performance-audit.md`
A six-section audit written to disk:

| Section | What's in it |
|---|---|
| **Executive Summary** | 3-4 bullets — the headline story |
| **Technical Performance** | Core Web Vitals pass/fail, Lighthouse scores, key issues |
| **SEO & Messaging Alignment** | Keyword coverage, messaging gaps, alignment score (the payoff for Sessions 1-3) |
| **Conversion & UX** | Scroll depth, rage/dead clicks, traffic source quality |
| **Top 10 Quick Wins** | Prioritized by impact, each with what / why / effort |
| **Methodology** | Which agent saw which data, what was fallback vs. live |

### 2. A structured DB row → `page_performance` + `clarity_events` + `clarity_sources`
The orchestrator calls the Zod-typed `save_audit_results` tool. All 25+ columns land in the DB — scores, CWV timings, scroll depth, rage clicks, keyword gaps, quick wins (as JSON). No regex parsing of the markdown.

### Why both?
- The **markdown** is for humans — open it, read it, share it with the team
- The **DB row** is for machines — Session 5's dashboard queries it directly, and future audits can diff against it

> One orchestrator run. One audit. Two consumable shapes. That's the payoff of making `save_audit_results` a Zod tool instead of an afterthought.

---

## Slide: External MCP Servers
*The Meta Ads agent connects to Pipeboard*

You can build your own MCP servers (the four we built today) **or** connect to ones that already exist.

### Pipeboard's Meta Ads MCP
- Hosted by Pipeboard at `meta-ads.mcp.pipeboard.co`
- Already built — we just connect to it
- Authenticates via a token in the URL (no OAuth dance from Claude)
- You authorize Pipeboard ↔ Meta *once* at pipeboard.co; Claude uses the token from there

### Two layers of auth
| Step | Who's connecting | How |
|---|---|---|
| Pipeboard ↔ Meta | You authorize Pipeboard to read your ads | OAuth on pipeboard.co (one-time) |
| Claude ↔ Pipeboard | Claude proves it's allowed to use your account | Token in the MCP URL (`.mcp.json`) |

> The MCP ecosystem is the long tail. You'll write a few servers and connect to many.

---

## Slide: The Spectrum (Final)
*Where we've been and where we landed*

| Level | Loop lives in... | Enforced by | Sessions |
|---|---|---|---|
| **Recipe** | Nowhere — linear | Prompt order | Sessions 1-2 |
| **Soft agent** | The prompt | Claude's compliance | Session 3 (skill) |
| **Hard agent** | Hand-rolled code | Your `while` loop | Session 3 (snippet) |
| **Agent SDK** | The SDK | SDK + typed tools + MCP servers | **Session 4** |
| **Orchestrator** | SDK + native sub-agents | SDK manages multi-agent dispatch | **Session 4** |

> The four levels are a progression in *who controls what*.
> By Session 4, the SDK controls the loop. You control the structure.

---

## Slide: Tech Terms
*Session 04 — New concepts*

| Term | Definition |
|---|---|
| **API** | Application Programming Interface. The raw HTTP endpoint you call to talk to a service. With the Anthropic API you handle the loop, message history, tool execution, and retries yourself. |
| **SDK** | Software Development Kit. A library that wraps an API with higher-level building blocks. The Claude Agent SDK manages the agentic loop so you only write the tools and prompt. |
| **Claude Agent SDK** | Anthropic's official framework for building agents (`@anthropic-ai/claude-agent-sdk`). Provides `query()` (the loop), `tool()` (typed tool definitions), and `createSdkMcpServer()` (package tools as MCP servers). |
| **Zod** | A TypeScript schema validation library. You describe the shape of your data once and get runtime validation + TypeScript types. Used to define the parameters of every tool we build. |
| **`query()`** | The SDK's main entry point. Replaces the hand-rolled `while` loop with `messages.create()`. You give it a prompt and options; it streams messages until the agent decides it's done. |
| **`tool()`** | The SDK function for defining a custom tool. Takes a name, description, Zod schema, and a typed handler. The handler receives validated args, not `Record<string, unknown>`. |
| **`createSdkMcpServer()`** | Packages an array of tools into an MCP server. The same server can be used standalone or registered with an orchestrator. |
| **Sub-Agent** | An agent dispatched by another agent. Each has its own prompt, its own tools, and its own expertise. The SDK's `agents` option declares them; the orchestrator decides when to invoke them. |
| **Orchestrator** | A parent agent that coordinates sub-agents. It doesn't call `Promise.all()` — it declares sub-agents in the `agents` option and the SDK handles execution. |
| **`allowedTools`** | An option on `query()` that whitelists which tools the agent is allowed to call. Use wildcards like `"mcp__seo__*"` to allow everything from one server. |
| **`settingSources`** | An option on `query()` that controls which MCP server configs to load. `["project"]` loads `.mcp.json` from the repo; `["user"]` loads your global config. |
| **`bypassPermissions`** | A `permissionMode` setting that lets the agent run tools without per-call confirmation. Used for headless agents like the orchestrator. |
| **External MCP Server** | An MCP server you don't run yourself — like Pipeboard's hosted Meta Ads MCP. You connect via URL; Pipeboard handles the Meta API integration. |
| **Pipeboard** | A third-party service that hosts MCP servers for ad platforms (Meta, Google Ads, etc.). You connect Pipeboard to your Meta account once, then use a token to let Claude pull ads data. |

---

## Slide: Session 04
*Session 04 — Page Audit Orchestrator + Meta Ads Agent*

| # | Step | Detail |
|---|---|---|
| 1 | **Open your project** | `cd soapbox-progro && claude` |
| 2 | **Install the Agent SDK** | `npm install @anthropic-ai/claude-agent-sdk zod` |
| 3 | **Set up API keys** | Anthropic (required), PageSpeed + Clarity (optional, fall back to seed data) |
| 4 | **Expand the page_performance schema** | Add CWV, Clarity, and messaging columns |
| 5 | **Build `src/tools/pages.ts`** | Data access layer with Drizzle queries + CWV thresholds |
| 6 | **Build the Zod-typed MCP tools** | `pagespeed-tools`, `seo-tools`, `clarity-tools`, `db-save-tools` |
| 7 | **Build three standalone sub-agents** | `perf-agent`, `seo-messaging-agent`, `cro-ux-agent` |
| 8 | **Build the orchestrator** | Native `agents` option dispatches all three |
| 9 | **Run `npm run audit:page`** | Watch the SDK manage the loop, sub-agents, and tool execution |
| 10 | **Connect the Pipeboard Meta Ads MCP** | `claude mcp add meta-ads --scope project --transport http ...` |
| 11 | **Expand the meta_ads schema** | Add ad-level IDs, creative content, reach/frequency, CPM |
| 12 | **Update `save_ad_results`** | Match Zod schema to the new columns |
| 13 | **Run `npm run agent:ads`** | Live ad data + cross-reference with Sessions 1-3 |
| 14 | **Verify in the database** | Check that ad creative text landed alongside metrics |
