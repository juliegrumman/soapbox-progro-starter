# Session 3 Slide Content

---

## Slide: Where We Left Off
*Session 03*

| Session 1 | Session 2 | Session 3 |
|---|---|---|
| 21,000+ competitor reviews in the database | Keyword rankings with volume, position, intent | Reddit conversations — unfiltered consumer voice |
| A competitive intelligence report | A keyword strategy report | A social listening brief |
| Skills pattern (copy template, activate) | Same pattern, but Claude also builds the API client | **You build the tool file + design the agent brief yourself** |

---

## Slide: The Big Shift
*From recipes to agents — and what "agent" actually means*

### Sessions 1-2: Recipe
- Pre-built skill files
- Pre-built tool files
- Fixed steps: do this, then this, then this
- Claude executes your instructions

### Session 3: Flexible Instructions + Loop
- You build the tool file
- You design the agent brief
- The agent sets success criteria and loops until they're met
- Claude decides WHAT to search — but who decides WHETHER to search again?

> That question — **who controls the loop** — is the difference between a prompt and an agent.

---

## Slide: What We're Building
*Session 03 — Social Listening Agent*

An autonomous Reddit monitoring agent that reads your existing data, builds its own search strategy, evaluates its progress, and decides when it's done.

### Three components:

**MCP SERVER** > **TOOL FILE** > **AGENT BRIEF**

- **MCP Server** (`mcp-reddit`): A plugin that gives Claude live Reddit access — search threads, read posts, browse subreddits. You connect it with one terminal command.
- **Tool File** (`src/tools/reddit.ts`): The data access layer you build yourself. Functions for querying, searching, filtering, and inserting Reddit data into the shared database.
- **Agent Brief** (`skill-reddit-social-listening.md`): The agent's mission briefing with a search-evaluate-refine loop. It defines success criteria, but the agent decides how to meet them.

---

## Slide: Social Listening Agent Pipeline

Bridge Session 1-2's structured data into live social conversations

| 01 | 02 | 03 | 04 | 05 | 06 |
|---|---|---|---|---|---|
| **Session 1-2 Data** | **Success Criteria** | **Search Loop** | **Classify & Store** | **Cross-Reference** | **Brief** |
| Read reviews + keywords to build context | Agent defines what "done" looks like: subreddit coverage, brand mentions, sentiment diversity | Search > evaluate > search again if gaps remain (max 3 rounds) | Sentiment classification, brand extraction, save to DB | Connect Reddit findings to reviews + keywords | Social listening brief |

---

## Slide: The Loop
*This is what makes it agentic*

```
Round 1: Search 10 terms across 4 subreddits
  → 18 threads collected
  → Evaluate: Divi mentioned, but no Vegamour or The Ordinary
  → Gaps found. Searching again.

Round 2: Search 5 NEW terms targeting gaps
  → 14 new threads collected
  → Evaluate: 4 brands, mixed sentiment, 5 subreddits
  → Success criteria met. Moving to classification.
```

The agent isn't following a script. It's evaluating its own progress and deciding what to do next.

**But who's enforcing this?** Claude is. There's no code that *requires* Round 2 to happen.

---

## Slide: Soft Agent vs. Hard Agent
*Where does the loop live?*

### Soft Agent (what we build today)
- Loop is in the **prompt**
- Claude follows the instructions to iterate
- Works well — but nothing enforces it
- Great for **prototyping** agent behavior

### Hard Agent (what production looks like)
- Loop is in **code** (TypeScript / Agent SDK)
- Program logic enforces iteration
- Claude decides WHAT to search — code decides WHETHER to keep going
- Required for **reliable, repeatable** systems

> The skill template is the prototype. Code is the production version. Today we build the prototype and see the code.

---

## Slide: The Spectrum
*Where we've been and where we're going*

| Level | Loop lives in... | Enforced by | Sessions |
|---|---|---|---|
| **Recipe** | Nowhere (linear) | Prompt order | Sessions 1-2 |
| **Soft agent** | The prompt | Claude's compliance | Session 3 (skill) |
| **Hard agent** | Code | Program logic | Session 3 (snippet) |
| **Orchestrator** | Code + delegation | Code + multiple agents | Session 4 |

---

## Slide: Tech Terms
*Session 03 — New concepts*

| Term | Definition |
|---|---|
| **MCP (Model Context Protocol)** | A plugin system that gives Claude access to external services. You "add" an MCP server and Claude gets new tools — like giving it a new sense. Reddit today, but the same pattern works for Slack, GitHub, and hundreds of others. |
| **MCP Server** | A small program that runs locally and translates between Claude and an external service. `mcp-reddit` translates Claude's requests into Reddit API calls and returns the results. |
| **uvx** | A command that downloads and runs Python packages on the fly (from the `uv` tool). We use `uvx mcp-reddit` to install and run the Reddit MCP server in one step. |
| **Tool File (Data Access Layer)** | A TypeScript file that defines the functions Claude uses to read and write database data. In Sessions 1-2 these were pre-built. Today you create one from scratch. |
| **Soft Agent** | An agent whose loop lives in the prompt. Claude follows instructions to iterate, evaluate, and decide. Works well but nothing enforces it programmatically. Good for prototyping. |
| **Hard Agent** | An agent whose loop lives in code. A program calls Claude for each step but controls whether to continue, stop, or retry. Required for production reliability. |
| **Agent SDK** | Anthropic's toolkit for building hard agents in code. Gives you structured tool calling, message management, and conversation handling — the skeleton that Claude's intelligence plugs into. |
| **Success Criteria** | The conditions the agent defines for itself before starting. "I need threads from 5+ subreddits, 3+ brands, mixed sentiment." The agent evaluates against these after each search round. |
| **Search-Evaluate-Refine Loop** | The core agent pattern: search for data, evaluate what you found against your criteria, refine your approach if there are gaps, repeat. This is what separates an agent from a script. |
| **Cross-Session Intelligence** | Insights that only emerge when you combine multiple data sources. A complaint in reviews + a trending keyword + a Reddit thread = a validated opportunity no single source reveals. |
| **Sentiment Classification** | Labeling text as positive, negative, neutral, or mixed. The agent reads each Reddit thread and assigns a sentiment based on the language used. |

---

## Slide: Session 03
*Session 03 — Social Listening Agent*

| # | Step | Detail |
|---|---|---|
| 1 | **Open your project** | `cd soapbox-progro && claude` |
| 2 | **Connect the Reddit MCP** | `claude mcp add reddit --scope project -- uvx mcp-reddit` |
| 3 | **Test the connection** | Ask Claude to search Reddit live |
| 4 | **Build the tool file** | Study the reviews.ts pattern, then create reddit.ts yourself |
| 5 | **Design the agent brief** | Success criteria + search-evaluate-refine loop |
| 6 | **Run the agent** | Watch it evaluate its own coverage and decide to search again |
| 7 | **Explore results** | Cross-session insights: what's on Reddit but NOT in reviews? |
| 8 | **The gap** | Who's enforcing the loop? What happens if Claude skips Round 2? |
| 9 | **Prompt to code** | See the 50-line Agent SDK version that puts the loop in code |
