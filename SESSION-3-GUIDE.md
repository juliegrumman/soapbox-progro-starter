# Session 3: Reddit Social Monitoring Agent

Build a social listening agent that monitors Reddit, decides its own search strategy, and knows when it's done. Then see where the architecture breaks — and what production agents look like. In 60 minutes.

## What's Different About This Session

Sessions 1-2 were guided: you copied a pre-built skill, ran it, and explored results. Today you **build** the code yourself — and you'll encounter a real architectural question: what's the difference between a flexible prompt and an actual agent?

By the end, you'll have built:
- A new MCP server connection (Reddit)
- A TypeScript tool file (data access layer)
- A skill template with a search-evaluate-refine loop
- An understanding of where "prompt-driven" ends and "code-driven agent" begins

## What You'll Need

- Your soapbox-progro project from Sessions 1-2
- Python 3.8+ with `uv` installed (for the Reddit MCP server)
- No API key needed — the Reddit MCP is free, no authentication required

## Step 1: Open Your Project

Open your terminal:

```
cd soapbox-progro && claude
```

If you're starting fresh (missed Sessions 1-2), clone and set up:

```
git clone <repo-url> soapbox-progro
cd soapbox-progro && npm install && claude
```

## Step 2: Security Check — Scan Before You Install

Before connecting any third-party MCP server, take a moment to vet it. MCP servers are arbitrary code that runs on your machine with your user permissions. Treat installing one like installing any open-source package — inspect it first.

**2a. Inspect the MCP package before installing**

The Reddit MCP we'll use is `mcp-reddit` — a community-built, open-source package. It is **not** an official Reddit product. Before installing, ask Claude:

```
Fetch the PyPI page for mcp-reddit and tell me: who is the author, when was it last updated, how many downloads does it have, and is there a GitHub repo I can inspect?
```

**What to look for:**
- **Author & maintainers** — Is there an identifiable person or organization? Do they maintain other packages?
- **Download count & age** — A package with 400 downloads/month is riskier than one with 40,000. A package less than 6 months old hasn't been widely battle-tested.
- **Source availability** — Is the code on GitHub where you can read it? No public repo is a red flag.
- **What it actually does** — `mcp-reddit` scrapes `old.reddit.com` rather than using the official Reddit API. This means no auth is needed (convenient for us), but it could break if Reddit changes their HTML, and may violate Reddit's Terms of Service.
- **Permissions** — Does it read files, write to disk, or make unexpected network calls? For deeper inspection, you can download without installing and scan the source:

```bash
pip download mcp-reddit --no-deps -d /tmp/inspect
unzip /tmp/inspect/*.whl -d /tmp/inspect/src
grep -r "subprocess\|os.system\|eval\|exec(" /tmp/inspect/src
```

**The bottom line:** There is no "app store review process" for MCP servers today. For a read-only Reddit scraper in a training context, the risk is low. For anything touching credentials, databases, or write operations in production, you'd want much more scrutiny. The fallback data path (Step 2b below) exists so you're never forced to install something you're not comfortable with.

**2b. Decide: live MCP or fallback data?**

If you're comfortable with the `mcp-reddit` package, proceed to Step 3. If you'd rather skip the third-party install, use the pre-baked fallback data instead:

```
The Reddit MCP isn't working. Seed the fallback Reddit data by running npm run seed:reddit
```

Then skip to Step 5.

## Step 3: Connect the Reddit MCP Server

**Exit Claude Code first** (press `Ctrl+C` or type `/exit`), then run this terminal command:

```
claude mcp add reddit -- uvx mcp-reddit
```

This installs a Reddit MCP server — a plugin that gives Claude the ability to search and read Reddit. Now re-enter Claude Code:

```
claude
```

Verify the connection by asking Claude:

```
What MCP tools do you have access to now? List the Reddit tools and what each one does.
```

You should see tools like `search_reddit`, `get_reddit_post`, and `get_subreddit_posts`. These are new capabilities Claude didn't have before — you just gave it a new sense.

**What just happened:** In Sessions 1-2, Claude used built-in tools (file reading, database queries, API calls). You just extended Claude's capabilities by connecting an MCP server. MCP (Model Context Protocol) servers are how you give Claude access to external systems — Reddit today, but the same pattern works for Slack, GitHub, databases, and hundreds of other integrations.

**Can't get the MCP working?** That's OK — go back to Step 2d and use the fallback data instead.

## Step 4: Warm-Up — Test the Connection

Try a live Reddit search:

```
Search Reddit for "hair growth serum" in r/haircare. Show me the top 5 results with their titles and scores.
```

You should see real Reddit threads come back. This is Claude reaching into Reddit in real time — the same way it reached into Google's search data via SerpAPI in Session 2, but through an MCP server instead of a REST API.

**If using fallback data:** Skip this step — your data is already in the database from the seed command.

## Step 5: Build the Tool File

This is the first "you build it" step. Instead of using a pre-built tool file, you'll create one.

First, study the pattern:

```
Show me the structure of src/tools/reviews.ts and src/tools/keywords.ts side by side. What pattern do they follow? What's the same between them?
```

Claude will show you the pattern: both files import the database and schema, then export named functions for querying, searching, filtering, and inserting data. Every session's tool file follows the same structure.

Now build your own:

```
Create src/tools/reddit.ts following the same pattern as reviews.ts and keywords.ts, but for the reddit_threads table in the schema. I need functions to:
1. Get threads (filterable by subreddit and sentiment)
2. Get thread counts grouped by subreddit
3. Get thread counts grouped by sentiment
4. Search threads by keyword in title or body
5. Find threads mentioning a specific brand (search the relevant_brands JSON field)
6. Get high-engagement threads above a score threshold
7. Insert a single thread
8. Batch insert threads
```

After Claude creates the file, **inspect it**:

```
Show me the getThreadsByBrand function you just created. How does it search for brand names in the relevant_brands JSON field?
```

**What just happened:** You built a data access layer — the code that lets Claude save and query Reddit data in the shared database. Notice how every session's tool file follows the same pattern: import, export functions, Drizzle queries. That predictability is intentional. When code follows patterns, both humans and AI can work with it faster.

**Quick checklist** — make sure your file:
- Imports from `../db/index.js` and `../db/schema.js`
- Has `insertThread` that adds a `foundAt` timestamp (like `scrapedAt` in reviews and `checkedAt` in keywords)
- Has `searchThreads` that uses LIKE on both title and body

## Step 6: Design the Agent Brief

Now for the biggest shift from Sessions 1-2. Instead of copying a pre-built skill, you'll design how the agent should behave — including a loop that lets it evaluate its own progress and decide when it's done.

```
Now we need a skill template that tells the Reddit agent HOW to work. This skill is different from Sessions 1-2 in two ways:

1. It's an AGENT BRIEF, not a recipe — the agent decides its own approach
2. It has a SEARCH LOOP — the agent evaluates what it found and searches again if there are gaps

Create skill-templates/skill-reddit-social-listening.md with this structure:

1. Purpose and prerequisites (Reddit MCP connected, Sessions 1-2 data in database)

2. A section explaining this is an agent brief, not a recipe

3. Target subreddits: r/haircare, r/longhair, r/haircarescience, r/sallybeautysupply, r/curlyhair, r/veganbeauty, r/wavyhair, r/thinhair

4. Phase 1 — Build Search Context: Read Sessions 1-2 data to understand what customer language, complaint themes, and keywords exist. Generate initial search terms from the data.

5. Phase 2 — Define Success Criteria: Before searching, the agent defines what "done" looks like. It should set targets for:
   - Minimum subreddit coverage (threads from at least 5 of 8 target subreddits)
   - Minimum brand coverage (at least 3 competitor brands mentioned)
   - Sentiment diversity (at least 2 sentiment categories represented)
   - Volume target (30-50 relevant threads total)

6. Phase 3 — Search-Evaluate-Refine Loop (max 3 rounds):
   Round 1: Search Reddit using initial terms. After collecting results, evaluate against success criteria. Log what's covered and what's missing.
   Round 2 (if needed): Generate NEW search terms targeting the gaps. If Round 1 had no Vegamour mentions, search "vegamour review" and "vegamour results." If no negative sentiment, search "hair growth serum didn't work" and "disappointed." Search again, re-evaluate.
   Round 3 (if still gaps): Final targeted search for remaining gaps. Then proceed regardless.
   The agent should log its evaluation after each round so participants can see the decision-making.

7. Phase 4 — Classify and Save: For each relevant thread, classify sentiment (positive/negative/neutral/mixed) and extract brand mentions, then save to database using our tool functions

8. Phase 5 — Cross-Reference: Connect Reddit findings with review themes and keyword data — what shows up in both? What's on Reddit but NOT in reviews?

9. Phase 6 — Generate Report: Social listening brief at reports/reddit-social-listening-brief.md

10. Fallback section for when the Reddit MCP is unavailable
```

After Claude creates it, examine the loop:

```
Read the skill template you just created. Walk me through what happens in Phase 3. How does the agent decide whether to do Round 2? What's different about Round 2's search terms compared to Round 1?
```

**What just happened:** You designed an agent brief with a **search-evaluate-refine loop**. The agent sets its own success criteria, evaluates its progress after each round, and decides whether to keep searching. This is meaningfully different from Sessions 1-2 — the agent isn't following a fixed list of steps. It's pursuing a goal and adjusting its approach based on what it finds.

But here's a question worth holding: **what's actually enforcing that loop?** We'll come back to this.

## Step 7: Run the Agent

Activate the skill:

```
Copy skill-templates/skill-reddit-social-listening.md to skills/
```

Now run it:

```
Run the Reddit social listening skill. Search the target subreddits for conversations about hair growth products, competitors, and topics relevant to ProGRO Density+. Cross-reference everything with our Session 1-2 data. Save all findings to the database and generate the social listening brief.
```

**Watch the terminal carefully.** You should see something like this:

```
Reading Session 1-2 data to build search context...
Found 5 competitors in review data. Top complaint themes: shedding, timeline, texture.
Top keyword clusters: hair growth serum (2,400 vol), thinning hair treatment (1,900 vol)

Setting success criteria:
- Threads from ≥5 subreddits
- ≥3 competitor brands mentioned
- Positive AND negative sentiment represented
- 30-50 threads total

Round 1: Searching 10 terms across target subreddits...
  Collected 18 threads. Evaluating coverage...
  ✓ 5 subreddits represented
  ✗ Only 1 brand mentioned (Divi) — need Vegamour, The Ordinary
  ✗ Limited negative sentiment
  → Gaps identified. Generating Round 2 search terms...

Round 2: Searching "vegamour results", "the ordinary peptide hair",
         "hair serum not working", "scalp treatment disappointed"...
  Collected 14 new threads. Re-evaluating...
  ✓ 6 subreddits represented
  ✓ 4 brands covered (Divi, Vegamour, The Ordinary, Nutrafol)
  ✓ Mixed sentiment represented
  → Success criteria met. Proceeding to classification.
```

This is the agent **reasoning about its own coverage** and deciding to search again. It chose those Round 2 terms because Round 1 had gaps — that's not a script, it's a decision.

**If using fallback data:** The agent skips the live Reddit search and works from the seed data, but still performs the cross-referencing and report generation.

## Step 8: Explore Your Results

Your report is saved at:

```
reports/reddit-social-listening-brief.md
```

Try these follow-up prompts:

```
What subreddits had the most relevant conversations about hair growth?
```

```
Which competitor brands are mentioned most on Reddit? How does that compare to what we found in the product reviews from Session 1?
```

```
Are there topics that Reddit users discuss that DIDN'T appear in our competitor reviews? These could be blind spots in our messaging.
```

```
Show me the highest-engagement Reddit threads about hair growth. What makes these conversations resonate?
```

## Step 9: Verify the Data

Run these verification queries to make sure everything landed correctly:

```
Run these database queries and show me the results:
1. How many Reddit threads are in the database, grouped by subreddit?
2. What's the sentiment distribution across all threads?
3. Which brands are mentioned most?
4. Show me one thread that mentions a keyword from our Session 2 keyword research.
```

## Step 10: The Gap — Who's Actually in Charge?

Now for the important question. Let's stress-test what we built.

Ask Claude:

```
Look at the Reddit social listening skill template. In Phase 3, the search-evaluate-refine loop says "max 3 rounds." What happens if you decide after Round 1 that you have enough data, even if you've only collected 12 threads and only covered 2 subreddits? What stops you from skipping Round 2?
```

Claude will give you an honest answer: **nothing stops it.** The success criteria and the loop are instructions in a prompt. Claude follows them because it's good at following instructions — but there's no code enforcing the loop, no programmatic check on the criteria, no guardrail that says "you must search again."

This is the difference between:
- **A flexible prompt** — Claude decides what to do, and we hope it follows the instructions
- **An agent** — code controls the loop, calls Claude for each step, and programmatically enforces the criteria

What we built today is a **soft agent**: agentic behavior driven by a prompt. It usually works well. But in production — where reliability matters, where you're running this weekly, where bad data costs money — you need the loop in code, not in the prompt.

## Step 11: From Prompt to Code

Here's what that looks like. **You don't need to build this** — just read it and understand the difference.

```typescript
// agent-reddit.ts — a hard agent with the loop in code
import Anthropic from "@anthropic-ai/sdk";
import { getThreads } from "./src/tools/reddit.js";
import { getReviews } from "./src/tools/reviews.js";

const client = new Anthropic();
const MAX_ROUNDS = 3;

// Success criteria — enforced by CODE, not by a prompt
function evaluateCoverage(threads) {
  const subreddits = new Set(threads.map((t) => t.subreddit));
  const brands = new Set(threads.flatMap((t) => JSON.parse(t.relevantBrands || "[]")));
  const sentiments = new Set(threads.map((t) => t.sentiment));

  return {
    subredditsCovered: subreddits.size >= 5,
    brandsCovered: brands.size >= 3,
    sentimentDiverse: sentiments.size >= 2,
    volumeMet: threads.length >= 30,
    gaps: {
      needSubreddits: subreddits.size < 5,
      needBrands: brands.size < 3,
      needSentiment: sentiments.size < 2,
      needVolume: threads.length < 30,
    },
  };
}

// The loop lives in CODE — Claude can't skip it
let allThreads = [];
for (let round = 1; round <= MAX_ROUNDS; round++) {
  const evaluation = evaluateCoverage(allThreads);

  // Programmatic stop condition — not a suggestion, a rule
  if (
    evaluation.subredditsCovered &&
    evaluation.brandsCovered &&
    evaluation.sentimentDiverse &&
    evaluation.volumeMet
  ) {
    console.log(`Round ${round}: All criteria met. Done searching.`);
    break;
  }

  // Claude decides WHAT to search — code decides WHETHER to search
  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: `You are searching Reddit for hair growth product conversations.
        Current gaps: ${JSON.stringify(evaluation.gaps)}
        Current thread count: ${allThreads.length}
        Generate 5 search terms that target these specific gaps.`,
      },
    ],
  });

  const searchTerms = parseSearchTerms(response);
  const newThreads = await searchReddit(searchTerms); // uses MCP
  allThreads.push(...newThreads);

  console.log(
    `Round ${round}: Found ${newThreads.length} threads. ` +
    `Total: ${allThreads.length}. Evaluating...`
  );
}
```

**The key insight is in the comments:**
- **Claude decides WHAT to search** — it picks the search terms based on the gaps
- **Code decides WHETHER to search** — the `for` loop and `evaluateCoverage()` function are deterministic

This is 50 lines of TypeScript. Claude is still doing the hard work (choosing search terms, classifying sentiment, extracting brands). But the skeleton — the loop, the stop condition, the criteria check — is in code that can't be skipped, forgotten, or reinterpreted.

**This is the Agent SDK pattern.** The SDK gives you structured tool calling, message management, and conversation handling. But the core idea is simple: code controls the flow, Claude controls the content.

### When do you need this?

| Use case | Right tool |
|---|---|
| Exploring a question once, interactively | Skill template (what we built today) |
| Running weekly, results feed a dashboard | Agent in code (what this snippet shows) |
| Multiple agents coordinating on one task | Agent orchestrator (Session 4) |
| Production system serving multiple clients | Full Agent SDK implementation |

The skill template is a **prototype**. It lets you design the agent's behavior, test the loop, and validate that the approach works. When you're ready for production, you move the loop into code.

## What You Learned Today

- **MCP servers:** How to connect external data sources as plugins for Claude. The Reddit MCP gave Claude the ability to search Reddit — the same pattern works for Slack, GitHub, and hundreds of other services.
- **Building tool files:** You created the data access layer that lets agents save and query data. Every session follows the same pattern: import, export functions, Drizzle queries.
- **The search-evaluate-refine loop:** You designed an agent that sets its own success criteria and iterates until it meets them. This is the core pattern of agentic behavior: observe, evaluate, decide, act again.
- **Soft agent vs. hard agent:** A soft agent has the loop in the prompt — Claude follows instructions to iterate. A hard agent has the loop in code — the program enforces iteration. Both use Claude for the hard decisions, but they differ in who controls the flow.
- **Cross-session intelligence:** Reddit data connected back to review themes and keyword data. Insights that only exist when you combine multiple data sources.

### The Spectrum

| Level | Loop lives in... | What enforces it | Where we've been |
|---|---|---|---|
| **Recipe** | Nowhere — linear | The prompt | Sessions 1-2 |
| **Soft agent** | The prompt | Claude's compliance | Session 3 (skill template) |
| **Hard agent** | Code | Program logic | Session 3 (the snippet you saw) |
| **Orchestrator** | Code + delegation | Code + multiple agents | Session 4 |

**What changed from Sessions 1-2:**
- You **built** code (tool file) instead of just running pre-built code
- You **designed** agent behavior (skill template with a loop) instead of copying one
- Claude **evaluated its own progress** and decided whether to keep searching
- You saw the architectural boundary between "prompt-driven" and "code-driven" agents
- Three sessions of data combine into intelligence no single source provides

## Bonus: Extend the API (if time allows)

If you have 5 extra minutes, try this technical exercise:

```
Add two new endpoints to src/server/index.ts for our Reddit data:
1. GET /api/reddit/by-sentiment — thread counts grouped by sentiment, with average score
2. GET /api/reddit/by-subreddit — thread counts grouped by subreddit, with average score and comments

Follow the same pattern as the existing /api/keywords/summary and /api/keywords/by-intent endpoints.
```

After Claude adds them, test:

```
Start the API server with npm run dev and test the new /api/reddit/by-sentiment endpoint. What does it return?
```

These endpoints will feed the dashboard we build in Session 5.

## Troubleshooting

**"claude mcp add" command not found**
Make sure you have Claude Code updated to the latest version. Run `claude update` first.

**Reddit MCP won't connect / uvx not found**
You need Python 3.8+ and `uv` installed. Install uv: `curl -LsSf https://astral.sh/uv/install.sh | sh`. If it still won't work, use the fallback data: `npm run seed:reddit`

**"No such table: reddit_threads"**
Run `npm run db:push` to create the table from the schema.

**Claude seems stuck during the agent run**
The agent may be searching many terms across multiple subreddits. If it's been more than 10 minutes, press `Ctrl+C` and try with a narrower scope: `Run the Reddit social listening skill but only search r/haircare and r/thinhair with 5 search terms.`

**TypeScript errors when building the tool file**
Ask Claude to check: `Run npx tsc --noEmit and fix any TypeScript errors in src/tools/reddit.ts`

**npm run seed:reddit fails**
Make sure the CSV file exists at `data/reddit/seed-reddit-threads.csv`. If it's missing, the repo may need to be re-cloned.

**The agent didn't loop — it just searched once and moved on**
This can happen with the soft agent approach — the loop is in the prompt, not in code. Try running again with an explicit nudge: `Run the Reddit social listening skill. Make sure to evaluate your coverage after each search round and search again if you have gaps in subreddit coverage, brand mentions, or sentiment diversity.` This is exactly the limitation we discuss in Step 10.

## Homework

Review the social listening brief. Find the cross-channel insights section — the themes that appear in Reddit but NOT in product reviews. For each one, consider:
- Is this a messaging gap ProGRO should address?
- Would this make a good content marketing topic?
- Does this suggest a keyword we should be tracking in Session 2's data?

Pick your top 3 Reddit-sourced insights and bring them to Session 4.

**Bonus:** Look at the Agent SDK snippet from Step 11. If you were to move one of your Session 1-2 skills from a skill template to code, which one would benefit most from having the loop enforced programmatically? Why?

## What's Next

**Session 4:** We audit the ProGRO Density+ product page using three specialized sub-agents working in parallel — one checks page speed (Core Web Vitals), one audits SEO health, and one compares the page's messaging against everything we've learned in Sessions 1-3. A code-level orchestrator delegates to each sub-agent and synthesizes their findings into a single audit report. This is the first time we use the hard agent pattern from Step 10 — multiple agents coordinated by code, not by a prompt.
