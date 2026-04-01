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

## Step 3: Wire Up the Session 2 Skill

Type this into Claude Code:

```
Copy the SEO keyword research skill from skill-templates/ to skills/
```

Claude will copy the skill template into the active skills directory.

**What just happened:** Skills in the `skill-templates/` folder are blueprints. Copying one to `skills/` tells Claude Code "this is a capability you can use." Same pattern we used in Session 1 — the skill-template approach lets you add new abilities to your project one at a time.

## Step 4: Warm-Up — Bridge from Session 1

Type this prompt:

```
What customer language did we find in Session 1? What words and phrases do real customers use when talking about hair growth products?
```

Claude will either read the Session 1 report (if it exists in `reports/`) or query the review database directly. Either way, you'll see the exact language real customers use — and that language is about to become your keyword strategy.

**What just happened:** Claude is pulling from work we did last session. The database and reports persist between sessions — this is the power of the shared SQLite database. Each session builds on the last.

## Step 5: Run the SEO Keyword Research

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

## Step 6: Explore Your Results

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

- **API connections:** Claude Code can call external APIs like SerpAPI — or any REST API with an endpoint and key
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
