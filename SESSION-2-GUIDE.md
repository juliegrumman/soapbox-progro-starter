# Session 2: SEO Keyword Rank Tracking

Turn your competitor review insights into a keyword strategy with live Google search data — in 60 minutes.

## What You'll Need

- Your soapbox-progro project from Session 1
- A SerpAPI account (free tier): https://serpapi.com/
- Your SerpAPI API key (from your SerpAPI dashboard)

## Before We Start: Get Your API Key

1. Go to https://serpapi.com/ and create a free account
2. From your dashboard, copy your API key
3. You'll paste this into the project in Step 2

The free tier gives you 100 searches per month — plenty for this session.

## Step 1: Open Your Project in Claude Code

Open your terminal:

```
cd soapbox-progro && claude
```

If you already have the repo but need the latest updates:

```
cd soapbox-progro && git pull && npm install && claude
```

If you're starting fresh (missed Session 1), clone the project first:

```
git clone <repo-url> soapbox-progro
cd soapbox-progro && npm install && claude
```

## Step 2: Set Up Your API Key

Type this into Claude Code:

```
Create a .env file with my SerpAPI key: YOUR_KEY_HERE
```

Replace `YOUR_KEY_HERE` with the API key you copied from SerpAPI.

Claude will create a `.env` file with your API key. This is how you give Claude Code access to external services — through environment variables in a `.env` file.

**Don't have a key?** That's OK — we have backup data. Tell Claude:

```
I don't have a SerpAPI key. Use the fallback keyword data instead.
```

## Step 3: Build Your API Client

In Session 1, we used pre-written Python scrapers. This time, **you're going to have Claude build the API connection from scratch** — so you can replicate this pattern for any API you work with.

Paste this prompt into Claude Code:

```
I need to connect to the SerpAPI Google Search API from this project. Here's what I need:

1. A config module that loads API keys from .env using the dotenv package (it's already in package.json). It should export a function that returns the key, or null if it's missing.

2. A reusable fetch wrapper with retry logic (3 attempts with backoff), rate limiting (1 second between calls), and a 15-second timeout. It should return typed success/error results, not throw exceptions.

3. A SerpAPI client that uses the config and fetch wrapper to call two endpoints:
   - Google Search: https://serpapi.com/search.json (params: q, api_key, engine=google, location=United States, num=10)
   - Google Trends: https://serpapi.com/search.json (params: engine=google_trends, q, api_key, data_type=TIMESERIES, geo=US)

Put these in src/clients/ (config.ts, base-client.ts, serpapi.ts). Follow the same patterns as the existing src/tools/ files. If there's no API key, the functions should return null instead of throwing — that's how the skill knows to use fallback data.
```

Watch what Claude builds. You'll see it create three files:
- **`config.ts`** — loads your `.env` and exports key getters
- **`base-client.ts`** — handles the HTTP plumbing (retries, rate limits, timeouts)
- **`serpapi.ts`** — the actual SerpAPI client with typed responses

**What just happened:** You gave Claude a clear description of what you needed — the API endpoints, the behavior you wanted (retry, rate limiting, null instead of throwing), and where to put the files. Claude handled the implementation details. This is the pattern for connecting to **any** REST API: describe the endpoints, the auth method, and the error handling behavior you want.

**The reusable lesson:** Next time you need to connect to a different API (Ahrefs, Google PageSpeed, Shopify, whatever), you can use the same prompt structure: describe the endpoints, say how auth works, tell Claude where to put the code and what patterns to follow. The `base-client.ts` you just built will work for any of them.

## Step 4: Wire Up the Session 2 Skill

Type this into Claude Code:

```
Copy the SEO keyword research skill from skill-templates/ to skills/
```

Claude will copy the skill template into the active skills directory.

**What just happened:** Skills in the `skill-templates/` folder are blueprints. Copying one to `skills/` tells Claude Code "this is a capability you can use." Same pattern we used in Session 1 — the skill-template approach lets you add new abilities to your project one at a time.

## Step 5: Warm-Up — Bridge from Session 1

Type this prompt:

```
What customer language did we find in Session 1? What words and phrases do real customers use when talking about hair growth products?
```

Claude will either read the Session 1 report (if it exists in `reports/`) or query the review database directly. Either way, you'll see the exact language real customers use — and that language is about to become your keyword strategy.

**What just happened:** Claude is pulling from work we did last session. The database and reports persist between sessions — this is the power of the shared SQLite database. Each session builds on the last.

## Step 6: Run the SEO Keyword Research

This is the main event. Type this prompt:

```
Run the SEO keyword research skill. Extract keywords from our customer language data, check Google rankings via SerpAPI, and save the full keyword strategy report.
```

Claude will now:
1. Extract 20-30 seed keywords from your Session 1 customer language data
2. Call SerpAPI to check live Google search results for each keyword
3. Record who ranks where — competitors, ProGRO, informational sites
4. Classify each keyword by search intent (commercial, informational, etc.)
5. Cluster related keywords into semantic groups
6. Save everything to the `keyword_rankings` database table
7. Generate a keyword strategy report

**This takes several minutes.** Watch the terminal — you'll see live API calls to Google as each keyword is checked. This is Claude reaching outside your local project to pull real-time search data.

## Step 7: Explore Your Results

Your report is saved at:

```
reports/keyword-strategy-report.md
```

Try these follow-up prompts:

```
What are our top 5 keyword opportunities based on the research?
```

```
Show me keywords where Divi ranks but ProGRO doesn't — those are our competitive gaps.
```

```
Which keyword clusters have the highest total search volume?
```

```
Are there any keywords where soapboxsoaps.com already ranks?
```

## What's in the Report

1. **Executive Summary** — Top opportunities at a glance
2. **Keyword Overview Table** — Full table with rankings, volume, intent, and opportunity scores
3. **Cluster Analysis** — Related keywords grouped together with aggregate metrics
4. **Competitive SERP Landscape** — Who dominates which keyword clusters
5. **Quick Wins** — Keywords almost on page 1 (striking distance, positions 4-20)
6. **Content Opportunities** — Informational keywords that need blog posts or guides
7. **ProGRO Ranking Status** — Where soapboxsoaps.com appears (or doesn't) in search results
8. **Methodology** — Data sources and limitations

## What You Learned Today

- **Building API clients with Claude:** You described what you needed (endpoints, auth, error behavior) and Claude built the implementation. This prompt pattern works for any REST API.
- **The client module pattern:** `config.ts` loads keys, `base-client.ts` handles HTTP plumbing, `serpapi.ts` is the API-specific layer. When you need a new API, you add one file — the base layers are reusable.
- **Environment variables:** The `.env` file is how you securely pass API keys to Claude Code
- **Skills as building blocks:** Each skill template adds a new capability. Copy to `skills/` to activate.
- **Cross-session data:** Session 2 reads Session 1's customer language and builds on it. The SQLite database is the shared memory between sessions.

## Troubleshooting

**"SERPAPI_KEY is not set"**
Make sure you created the `.env` file in Step 2. Ask Claude: `Show me what's in my .env file`

**SerpAPI returns errors or rate limit messages**
The free tier allows 100 searches per month. If you've hit the limit, tell Claude to use the fallback data: `Use the fallback keyword data in data/keywords/ instead of SerpAPI`

**"No competitive intelligence report found"**
That's fine — Claude will extract keywords directly from the review database. If you want the full experience, run Session 1's analysis skill first: `Run the competitive intelligence analysis skill`

**Claude seems stuck or is taking too long**
The SerpAPI calls take time (one per keyword, with pauses between calls). If it's been more than 10 minutes, press `Ctrl+C` and tell Claude to use fewer keywords: `Run the keyword research with only 10 keywords instead of 30`

**npm install errors**
Make sure you have Node.js 18 or higher: `node --version`

## Homework

Review the keyword strategy report. Find 3-5 keywords where your brand should be creating content. For each keyword, think about:
- What type of content matches the search intent? (blog post, product page, FAQ, comparison guide)
- Is this a "quick win" (close to page 1) or a long-term play?
- What would you say differently than the competitors who currently rank?

Bring your keyword picks to Session 3.

## What's Next

**Session 3:** We build a Reddit social listening agent. Claude becomes autonomous — instead of following a recipe, it decides its own search strategy, finds relevant conversations about hair growth products, and cross-references everything with our review and keyword data. First taste of real agent behavior.
