# Skill: SEO Keyword Research & Rank Tracking

## Purpose
Turn customer language from competitor reviews into an SEO keyword strategy. Pull live search data from Google via SerpAPI, check current rankings, cluster keywords by search intent, and identify opportunities where ProGRO Density+ can win.

## When to Use
- After running the Session 1 competitive intelligence analysis
- When building or refreshing an SEO keyword strategy
- When checking current search rankings for target keywords

## Prerequisites
- Session 1 competitive intelligence report (`reports/competitive-intelligence-report.md`) OR the `competitive_reviews` table populated in the database
- SerpAPI API key set in `.env` file (`SERPAPI_KEY=your_key_here`)
- If no API key is available, fallback data in `data/keywords/` will be used automatically

## Target Page
ProGRO Density+ product page: `https://www.soapboxsoaps.com/pages/progro-density-plus-hair-serum`

When checking SERP results, flag whether this URL (or any soapboxsoaps.com page) appears in the rankings.

## Input
This skill reads from:
1. `reports/competitive-intelligence-report.md` (preferred — contains extracted customer language)
2. The `competitive_reviews` table in `soapbox.db` (fallback — query directly for recurring phrases)

Use the tool functions in `src/tools/keywords.ts` to write results to the database.

---

## Skill Workflow

### Phase 1: Extract Seed Keywords from Customer Language

**Goal:** Identify 20-30 keyword phrases that real customers use when searching for hair growth products.

**Process:**
1. Check if `reports/competitive-intelligence-report.md` exists
2. If yes: read the **Customer Language Database** and **Objection Patterns** sections. Extract the most frequently cited phrases, focusing on:
   - Product category terms (e.g., "hair growth serum", "scalp serum")
   - Problem/symptom terms (e.g., "thinning hair", "hair loss", "receding hairline")
   - Comparison terms (e.g., "divi vs vegamour", "best hair growth serum")
   - Ingredient terms (e.g., "biotin serum", "redensyl hair serum")
   - Question-format terms (e.g., "does hair growth serum work", "how long for hair serum results")
3. If no report exists: query the `competitive_reviews` table directly:
   ```sql
   -- Find recurring phrases in review titles
   SELECT title, COUNT(*) as freq FROM competitive_reviews
   WHERE title IS NOT NULL GROUP BY title ORDER BY freq DESC LIMIT 50;

   -- Search for common hair-related terms in review bodies
   SELECT body FROM competitive_reviews
   WHERE body LIKE '%hair growth%' OR body LIKE '%thinning%'
   OR body LIKE '%scalp%' OR body LIKE '%serum%'
   LIMIT 200;
   ```
4. Compile a list of 20-30 seed keywords, organized by theme:
   - **Category:** hair growth serum, scalp serum, hair density serum
   - **Problem:** thinning hair treatment, hair loss products, hair shedding
   - **Comparison:** divi scalp serum reviews, vegamour vs divi, best hair growth serum
   - **Ingredient:** biotin hair serum, redensyl serum, peptide hair treatment
   - **Question:** does hair serum work, how long hair growth serum results

### Phase 2: Check Live Search Data via SerpAPI

**Goal:** Pull current Google SERP data for each seed keyword.

**Process:**
1. Read the SerpAPI key:
   ```typescript
   import { readFileSync } from 'fs';
   const envContent = readFileSync('.env', 'utf-8');
   const apiKey = envContent.match(/SERPAPI_KEY=(.+)/)?.[1]?.trim();
   ```

2. If no API key is found, skip to the **Fallback** section below.

3. For each seed keyword, call the SerpAPI Google Search endpoint:
   ```typescript
   const url = new URL('https://serpapi.com/search.json');
   url.searchParams.set('q', keyword);
   url.searchParams.set('api_key', apiKey);
   url.searchParams.set('engine', 'google');
   url.searchParams.set('location', 'United States');
   url.searchParams.set('num', '10');

   const response = await fetch(url.toString());
   const data = await response.json();
   ```

4. From each response, extract:
   - `organic_results[]` — position, title, link, snippet for the top 10 results
   - Check if any result URL contains `soapboxsoaps.com` (ProGRO ranking)
   - Check if any result URL contains competitor domains: `diviofficial.com`, `vegamour.com`, `theordinary.com`, `nutrafol.com`
   - Record the top-ranking URL for each keyword

5. For search volume, use the SerpAPI Google Trends endpoint for a subset of keywords (~15 highest-priority):
   ```typescript
   const trendsUrl = new URL('https://serpapi.com/search.json');
   trendsUrl.searchParams.set('engine', 'google_trends');
   trendsUrl.searchParams.set('q', keyword);
   trendsUrl.searchParams.set('api_key', apiKey);
   trendsUrl.searchParams.set('data_type', 'TIMESERIES');
   trendsUrl.searchParams.set('geo', 'US');
   ```
   Use the relative interest values to estimate comparative search volume across keywords.

6. **Rate limiting:** Add a 1-second delay between API calls. Budget ~30 search queries + ~15 trends queries = ~45 total (well within the 100/month free tier).

7. Log progress to the terminal as each keyword is checked so the user can see live results coming back.

### Phase 2 Fallback: No API Key or Offline Mode

If `SERPAPI_KEY` is not set in `.env`, or if the API returns errors:

1. Log a clear message: "No SerpAPI key found (or API error). Using cached keyword data."
2. Check for `data/keywords/seed-keywords-with-serp-data.csv`
3. Read and parse the CSV file
4. Load the data into memory and proceed to Phase 3 with cached data
5. Note in the final report that data is from a cached snapshot, not live SERP results

### Phase 3: Classify Intent & Cluster Keywords

**Goal:** Enrich each keyword with search intent and semantic cluster. This is where Claude's AI analysis adds value beyond raw API data.

**Search Intent Classification:**
- **Informational:** Questions, how-to, educational ("does hair serum work", "what causes hair thinning", "biotin for hair growth benefits")
- **Commercial:** Research/comparison with purchase consideration ("best hair growth serum", "divi vs vegamour review", "hair growth serum before and after")
- **Transactional:** Ready to buy ("buy hair growth serum", "divi scalp serum discount", "hair serum subscription")
- **Navigational:** Looking for a specific brand/page ("divi scalp serum", "vegamour website", "soapbox progro")

**Semantic Clustering:**
Group related keywords into clusters:
- **Hair growth** — hair growth serum, best serum for hair growth, hair growth products for women
- **Thinning/loss** — thinning hair treatment, best products for thinning hair, hair loss serum
- **Scalp care** — scalp serum, scalp treatment for hair growth, healthy scalp products
- **Comparison** — divi vs vegamour, best hair serum brands, hair serum comparison
- **Ingredients** — biotin hair serum, redensyl serum, peptide hair treatment
- **Education** — does hair serum work, how long for hair serum results, hair growth serum side effects
- **Branded** — divi scalp serum, vegamour gro serum, progro density plus

### Phase 4: Save to Database

**Goal:** Persist all keyword data to the `keyword_rankings` table.

Use the tool functions in `src/tools/keywords.ts`:
```typescript
import { insertKeywordBatch } from './src/tools/keywords.js';

await insertKeywordBatch(keywords.map(kw => ({
  keyword: kw.keyword,
  position: kw.position,        // null if ProGRO not in top 10
  searchVolume: kw.searchVolume, // from trends data or CSV
  url: kw.topRankingUrl,         // top organic result URL
  intent: kw.intent,             // informational|commercial|transactional|navigational
  cluster: kw.cluster,           // semantic group name
})));
```

After saving, verify the data:
```sql
SELECT cluster, COUNT(*) as keywords, ROUND(AVG(position), 1) as avg_pos,
       SUM(search_volume) as total_volume
FROM keyword_rankings GROUP BY cluster;
```

### Phase 5: Generate Keyword Strategy Report

**Goal:** Produce an actionable report for the Soapbox marketing team.

**Output file:** `reports/keyword-strategy-report.md`

**Report structure:**

1. **Executive Summary** (3-5 bullets)
   - Total keywords researched, total estimated search volume
   - Top 3 highest-opportunity keywords
   - Where ProGRO currently ranks (if at all)
   - Biggest competitive gaps

2. **Keyword Overview Table**
   | Keyword | Position | Volume | Intent | Cluster | Top URL | Opportunity |
   |---------|----------|--------|--------|---------|---------|-------------|
   Sort by opportunity score (high volume + weak competition + commercial intent = high opportunity).

3. **Cluster Analysis**
   For each keyword cluster:
   - Number of keywords in cluster
   - Total search volume
   - Average SERP position
   - Who dominates this cluster (which competitor URLs appear most)
   - ProGRO's presence or absence

4. **Competitive SERP Landscape**
   - Which competitors appear most frequently in results
   - Which competitor dominates which clusters
   - Keywords where multiple competitors rank (high-competition terms)
   - Keywords where NO competitor ranks on page 1 (low-competition opportunities)

5. **Quick Wins** (Striking Distance)
   Keywords where relevant content ranks positions 4-20 — close to page 1 with optimization effort. Prioritize by search volume.

6. **Content Opportunities**
   Informational keywords that need blog posts, guides, or FAQ content. Map each to a suggested content type:
   - "does hair serum work" → educational blog post
   - "hair growth serum before and after" → user gallery / case study page
   - "biotin vs redensyl for hair growth" → ingredient comparison guide

7. **ProGRO Ranking Status**
   - Keywords where `soapboxsoaps.com` appears in top 10
   - Keywords where ProGRO is absent but should rank
   - Recommended next steps for each gap

8. **Methodology**
   - Data source: SerpAPI Google Search + Google Trends (or "cached data snapshot" if fallback used)
   - Date of data pull
   - Number of keywords checked
   - Location: United States
   - Limitations: free tier volume estimates, single-point-in-time snapshot

---

## SerpAPI Reference

**Google Search endpoint:**
- URL: `https://serpapi.com/search.json`
- Required: `q` (query), `api_key`, `engine=google`
- Optional: `location` (default: "United States"), `num` (results per page, default: 10)
- Response: `organic_results[]` with `position`, `title`, `link`, `snippet`

**Google Trends endpoint:**
- URL: `https://serpapi.com/search.json`
- Required: `engine=google_trends`, `q` (query), `api_key`
- Optional: `data_type=TIMESERIES`, `geo=US`
- Response: `interest_over_time.timeline_data[]` with relative interest values

**Rate limits:** Free tier = 100 searches/month. Budget ~45 per skill run.

---

## Tips for Best Results
- Run Session 1's competitive intelligence analysis first — the customer language section is the richest source of seed keywords
- The more specific the seed keywords, the more actionable the results. "Hair growth serum for thinning hair over 40" is better than "hair serum"
- Re-run this skill monthly to track ranking changes over time. Each run adds new rows to `keyword_rankings` with fresh `checked_at` timestamps
- Cross-reference with Session 3 (Reddit) to find keyword opportunities from social conversations
