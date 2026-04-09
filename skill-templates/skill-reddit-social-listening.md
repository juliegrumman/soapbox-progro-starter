---
name: reddit-social-listening
description: Searches Reddit for hair growth/scalp care discussions, classifies sentiment and brand mentions, cross-references with review and keyword data, produces social listening brief
---

# Skill: Reddit Social Listening

## Purpose
Monitor Reddit conversations about hair growth, scalp care, and competitor products to surface unfiltered consumer sentiment, emerging trends, and brand perception that doesn't show up in structured reviews or search data. This skill reads Sessions 1-2 data for context, searches Reddit via the Reddit MCP server, saves structured findings to the `reddit_threads` table, and produces a social listening brief.

## When to Use
- After running Sessions 1-2 (competitive reviews and keyword research)
- When building a social listening baseline for ProGRO Density+ launch positioning
- When refreshing Reddit data to track shifts in brand sentiment or emerging trends

## Prerequisites
- **Reddit MCP server** connected and functional (configured in `.mcp.json`). If unavailable, see the Fallback section at the end.
- **Session 1 data:** `competitive_reviews` table populated (run `SELECT COUNT(*) FROM competitive_reviews;` to verify)
- **Session 2 data:** `keyword_rankings` table populated (run `SELECT COUNT(*) FROM keyword_rankings;` to verify)

## How This Skill Works — Agent Brief, Not Recipe

Sessions 1-2 skills gave you step-by-step recipes: do this, then this, then this. This skill is different. **This is an agent brief** — it defines your mission, gives you tools and success criteria, and lets you decide how to accomplish it.

Why the change? Reddit is unstructured. You can't predict what subreddits will have relevant threads, which search terms will surface the best conversations, or what gaps will appear in your first pass. A rigid recipe would either miss important data or waste time on irrelevant searches.

**Your job:** Search Reddit strategically, evaluate what you found, identify gaps, and search again until you have a representative picture of how real people talk about hair growth products online. Log your reasoning at each step so participants can see how an autonomous agent makes decisions.

---

## Target Subreddits

Focus searches on these communities where hair growth product discussions are most likely:

| Subreddit | Why It's Relevant |
|-----------|-------------------|
| r/haircare | General hair care — broad product discussions |
| r/longhair | Growth-focused community — serum and treatment talk |
| r/haircarescience | Ingredient-savvy users — science-backed discussions |
| r/sallybeautysupply | Retail product reviews — purchase decision context |
| r/curlyhair | Textured hair — product performance across hair types |
| r/veganbeauty | Clean/vegan product preferences — ProGRO positioning angle |
| r/wavyhair | Wavy hair care — lightweight product preferences |
| r/thinHair | Directly relevant — thinning and density concerns |

You are not limited to these subreddits. If your searches surface relevant threads in other communities (e.g., r/femalehairloss, r/30PlusSkinCare), include them.

---

## Phase 1: Build Search Context

**Goal:** Understand what language, themes, and keywords already exist in Sessions 1-2 data so your Reddit searches are informed by real customer language — not guesses.

**Read from the database:**

1. Query the competitive reviews for recurring complaint themes and customer language:
   ```sql
   -- Top themes from negative reviews
   SELECT title, body FROM competitive_reviews
   WHERE rating <= 3 ORDER BY helpful_count DESC LIMIT 30;

   -- Top themes from positive reviews
   SELECT title, body FROM competitive_reviews
   WHERE rating >= 4 ORDER BY helpful_count DESC LIMIT 30;
   ```

2. Query keyword rankings for the terms people actually search:
   ```sql
   -- High-volume keywords by cluster
   SELECT keyword, cluster, search_volume FROM keyword_rankings
   ORDER BY search_volume DESC LIMIT 30;
   ```

3. If `reports/competitive-intelligence-report.md` exists, read the **Customer Language Database** and **Objection Patterns** sections for extracted phrases.

4. If `reports/keyword-strategy-report.md` exists, read the **Quick Wins** and **Content Opportunities** sections for topic ideas.

**Output of this phase:** A list of 10-15 initial search terms derived from the data. These should mix:
- **Product category terms:** "hair growth serum", "scalp serum", "hair density"
- **Problem terms from reviews:** "thinning hair", "hair shedding", "postpartum hair loss"
- **Brand names from reviews:** "Divi", "Vegamour", "Nutrafol", "The Ordinary"
- **Specific phrases from customer language:** whatever stood out in the review data

Log your initial search terms and explain why you chose them based on what you found in the data.

---

## Phase 2: Define Success Criteria

**Before searching Reddit**, define what "done" looks like. Set these targets and track against them after each search round:

| Criterion | Target | How to Measure |
|-----------|--------|----------------|
| **Subreddit coverage** | Threads from at least 5 of 8 target subreddits | Count distinct subreddits in collected threads |
| **Brand coverage** | At least 3 competitor brands mentioned | Count distinct brands in `relevant_brands` across threads |
| **Sentiment diversity** | At least 2 sentiment categories represented (positive, negative, neutral, mixed) | Count distinct sentiment labels |
| **Volume** | 30-50 relevant threads total | Count total collected threads |

Write these targets down at the start and evaluate against them after each search round.

---

## Phase 3: Search-Evaluate-Refine Loop

This is the core of the skill. You will search Reddit, evaluate what you found against your success criteria, and search again if there are gaps. **Maximum 3 rounds.**

### Round 1: Initial Search

1. **Scrape target subreddits** using `mcp__reddit__scrape_subreddit` to build the local Reddit data:
   ```
   scrape_subreddit(subreddit: "haircare", limit: 100, scrape_comments: true)
   scrape_subreddit(subreddit: "thinHair", limit: 100, scrape_comments: true)
   // ... repeat for priority subreddits
   ```
   You don't need to scrape all 8 in Round 1. Start with the 3-4 most likely to have relevant content (e.g., thinHair, haircare, haircarescience, longhair) and expand based on what you find.

2. **Search using your initial terms** with `mcp__reddit__search_reddit`:
   ```
   search_reddit(query: "hair growth serum", limit: 50)
   search_reddit(query: "Divi scalp serum", limit: 50)
   search_reddit(query: "thinning hair treatment", limit: 50)
   // ... work through your initial search term list
   ```

3. **Filter for relevance.** Not every result will be relevant. Skip threads that are:
   - Purely about hair styling with no product/treatment discussion
   - Spam or self-promotion with no real discussion
   - About a completely unrelated product category

4. **Evaluate against success criteria.** After Round 1, log a status check:
   ```
   === ROUND 1 EVALUATION ===
   Threads collected: X / 30-50 target
   Subreddits covered: [list] — X / 5 target
   Brands mentioned: [list] — X / 3 target
   Sentiments found: [list] — X / 2 target
   GAPS: [what's missing]
   DECISION: [proceed to Round 2 / move on]
   ```

### Round 2 (if needed): Fill the Gaps

Only enter Round 2 if Round 1 left gaps in your success criteria.

1. **Analyze what's missing** and generate NEW search terms that specifically target the gaps. Examples:
   - *Gap: No Vegamour mentions* → Search `"vegamour review"`, `"vegamour results"`, `"vegamour before and after"`
   - *Gap: No negative sentiment* → Search `"hair growth serum didn't work"`, `"disappointed hair serum"`, `"waste of money hair"`
   - *Gap: Missing subreddits* → Scrape the missing subreddits, then search within them
   - *Gap: Low thread count* → Broaden search terms: `"best hair serum"`, `"hair serum recommendation"`, `"hair loss help"`

2. **Scrape additional subreddits** if coverage is lacking:
   ```
   scrape_subreddit(subreddit: "veganbeauty", limit: 100, scrape_comments: true)
   scrape_subreddit(subreddit: "curlyhair", limit: 100, scrape_comments: true)
   ```

3. **Search with gap-targeted terms** and add new relevant threads to your collection.

4. **Re-evaluate** against success criteria. Log another status check with the same format.

### Round 3 (if still gaps): Final Targeted Search

Only enter Round 3 if critical gaps remain after Round 2.

1. Make final targeted searches for the specific remaining gaps.
2. Log a final evaluation.
3. **Proceed to Phase 4 regardless of whether all criteria are met.** Some gaps may simply reflect reality (e.g., a subreddit has no relevant threads). Note unmet criteria in the final report.

**Important:** Log your evaluation after EVERY round. The evaluation log is how participants learn to see agent decision-making in action. Don't skip it.

---

## Phase 4: Classify and Save

**Goal:** For each relevant thread you collected, classify it and save it to the database.

### Classification

For each thread, determine:

1. **Sentiment** — Classify the overall sentiment of the thread (considering both the post and its top comments):
   - `positive` — Enthusiastic about a product, recommending it, sharing good results
   - `negative` — Disappointed, complaining, warning others away
   - `neutral` — Asking questions, seeking recommendations, sharing information without strong opinion
   - `mixed` — Thread contains both strong positive and strong negative sentiment (common in comparison threads)

2. **Relevant brands** — Extract all brand/product names mentioned in the thread and its comments. Include:
   - Direct competitor brands: Divi, Vegamour, Nutrafol, The Ordinary, Nioxin, Champo, Bondi Boost, Olaplex
   - The ProGRO / Soapbox brand if mentioned
   - Any other hair growth/scalp care brands discussed

### Save to Database

Use the tool functions in `src/tools/reddit.ts`:

```typescript
import { insertThread, insertThreadBatch } from './src/tools/reddit.js';

// For batch insert:
await insertThreadBatch(threads.map(t => ({
  subreddit: t.subreddit,
  threadId: t.id,
  title: t.title,
  body: t.body,           // post body text (or summary if very long)
  author: t.author,
  score: t.score,
  commentCount: t.commentCount,
  sentiment: t.sentiment,  // positive | negative | neutral | mixed
  relevantBrands: t.brands // string[] — auto-serialized to JSON
})));
```

After saving, verify the data:
```sql
SELECT subreddit, COUNT(*) as threads,
       ROUND(AVG(score), 1) as avg_score
FROM reddit_threads GROUP BY subreddit;

SELECT sentiment, COUNT(*) FROM reddit_threads GROUP BY sentiment;
```

---

## Phase 5: Cross-Reference with Sessions 1-2

**Goal:** Connect Reddit findings with review data and keyword data to identify patterns that span multiple data sources — and gaps that only appear in one.

### Reddit + Reviews Cross-Reference
1. Query the review themes and Reddit threads for overlapping topics:
   ```sql
   -- What complaint themes from reviews also appear on Reddit?
   SELECT rt.title, rt.sentiment, rt.subreddit
   FROM reddit_threads rt
   WHERE rt.body LIKE '%thinning%' OR rt.body LIKE '%shedding%'
   ORDER BY rt.score DESC;
   ```
2. Identify:
   - **Validated themes** — Issues that appear in BOTH reviews and Reddit (high confidence these matter)
   - **Review-only themes** — Complaints in reviews but absent from Reddit (may be purchase-specific friction)
   - **Reddit-only themes** — Discussions happening on Reddit but NOT reflected in reviews (emerging trends, unmet needs the review platforms don't capture)

### Reddit + Keywords Cross-Reference
1. Check which high-volume keywords from Session 2 are actually being discussed on Reddit:
   ```sql
   -- Are people discussing our target keywords organically?
   SELECT kr.keyword, kr.search_volume, kr.cluster,
          COUNT(rt.id) as reddit_mentions
   FROM keyword_rankings kr
   LEFT JOIN reddit_threads rt
     ON rt.body LIKE '%' || kr.keyword || '%'
     OR rt.title LIKE '%' || kr.keyword || '%'
   GROUP BY kr.keyword
   ORDER BY kr.search_volume DESC;
   ```
2. Identify:
   - **Keywords with Reddit validation** — High search volume AND active Reddit discussion (strong content opportunities)
   - **Keywords without Reddit presence** — High search volume but no Reddit discussion (may be purely transactional)
   - **Reddit topics without keyword coverage** — Active Reddit discussion but no matching keyword in our strategy (potential keyword gaps to add)

---

## Phase 6: Generate Report

**Output file:** `reports/reddit-social-listening-brief.md`

### Report Structure

1. **Executive Summary** (3-5 bullets)
   - Total threads analyzed, subreddits covered, date range
   - Top 3 actionable insights for ProGRO Density+ positioning
   - Most discussed competitor brands and their sentiment
   - Biggest surprise or non-obvious finding

2. **Search Strategy Log**
   - Initial search terms and why they were chosen
   - Round-by-round evaluation logs (from Phase 3)
   - What gaps were found and how they were addressed
   - Final coverage metrics vs. success criteria

3. **Subreddit Landscape**
   | Subreddit | Threads Found | Avg Score | Dominant Sentiment | Key Themes |
   |-----------|---------------|-----------|-------------------|------------|
   - Which communities are most active and most relevant
   - Community-specific language or preferences worth noting

4. **Brand Perception Map**
   For each competitor brand mentioned across Reddit threads:
   - Sentiment breakdown (positive / negative / neutral / mixed)
   - Most common praise points
   - Most common complaints
   - Notable quotes from high-engagement threads

5. **Theme Analysis**
   Top recurring themes across all threads, ranked by frequency:
   - What problems people are trying to solve
   - What results they expect and in what timeline
   - What ingredients or features they care about
   - What deal-breakers or red flags they mention

6. **Cross-Reference Findings**
   - Validated themes (appear in reviews AND Reddit)
   - Reddit-only insights (not captured in reviews)
   - Keyword opportunities surfaced by Reddit discussion
   - Table showing overlap between data sources

7. **ProGRO Density+ Opportunities**
   - Positioning angles supported by Reddit sentiment
   - Objections ProGRO should address preemptively
   - Subreddits or thread types where ProGRO could naturally be relevant
   - Content ideas driven by actual Reddit questions

8. **Methodology**
   - Data sources: Reddit MCP server, `competitive_reviews` table, `keyword_rankings` table
   - Date of data collection
   - Search terms used
   - Subreddits scraped
   - Classification approach (agent-determined sentiment + brand extraction)
   - Limitations: point-in-time snapshot, subreddit selection bias, thread volume constraints

---

## Fallback: Reddit MCP Unavailable

If the Reddit MCP server is not connected or its tools return errors:

1. **Log the issue clearly:** "Reddit MCP server is not available. Proceeding with manual data construction."

2. **Check for cached data:** Query `SELECT COUNT(*) FROM reddit_threads;` — if prior data exists, use it for the cross-reference and report phases.

3. **If no cached data exists**, construct a minimal dataset by:
   - Using the `competitive_reviews` table to identify the top 10 discussion topics (most common complaint themes, most praised features)
   - Using the `keyword_rankings` table to identify the top 10 search terms people use
   - Creating a report section titled "Projected Reddit Themes" that maps review/keyword insights to likely Reddit discussion patterns
   - Clearly label all output as **projected, not observed** — this is an inference, not data

4. **Produce a modified report** at `reports/reddit-social-listening-brief.md` that:
   - Notes the MCP was unavailable in the Executive Summary and Methodology
   - Includes the cross-reference analysis using whatever data is available
   - Flags that the report should be refreshed when Reddit access is restored

5. **Do not fabricate Reddit threads or pretend to have scraped data.** The report must be honest about its data sources.
