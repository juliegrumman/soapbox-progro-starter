---
name: seo-keyword-research
description: Extracts keywords from customer language, checks Google rankings via SerpAPI, cross-references Amazon Search Query Performance data, clusters by intent, produces keyword strategy report
---

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

## Amazon Search Query Performance Data (March 2026)

The following keywords come from the client's Amazon Brand Analytics Search Query Performance report. Use these directionally when building seed keyword lists and interpreting results — they show what real shoppers search on Amazon to find Soapbox products.

| Keyword | Amazon Rank | Amazon Search Volume |
|---------|-------------|---------------------|
| soapbox | 1 | 1,359 |
| hair serum | 2 | 19,686 |
| soapbox shampoo and conditioner | 3 | 2,204 |
| scalp serum | 4 | 9,467 |
| hair growth serum | 5 | 34,011 |
| nutrafol | 6 | 25,987 |
| soapbox hair growth | 7 | 220 |
| champo hair growth serum | 8 | 1,552 |
| soapbox hair growth serum | 9 | 13 |
| soapbox shampoo | 10 | 732 |
| soapbox progro | 11 | 14 |
| thickening serum | 12 | 51 |
| inde wild hair oil | 13 | 481 |
| nioxin thickening treatment | 14 | 2 |
| soap box soaps | 15 | 4 |
| soap box shampoo and conditioner | 16 | 7 |
| soapbox pro density | 17 | 1 |
| soapbox progro density | 18 | 1 |
| soap box shampoo and conditioner | 19 | 423 |
| soapbox hair products | 20 | 236 |
| hair growth oil | 21 | 29,615 |
| hair thickening serum | 22 | 1,037 |
| sérum para el cabello | 23 | 1,416 |
| soap box shampoo | 24 | 378 |
| soapbox hand soap | 25 | 536 |

**Key takeaways for seed keyword selection:**
- High-volume category terms to prioritize: "hair growth serum" (34K), "hair growth oil" (29.6K), "nutrafol" (26K), "hair serum" (19.7K), "scalp serum" (9.5K)
- Competitor terms shoppers use alongside Soapbox: nutrafol, champo, inde wild, nioxin
- Branded searches are low-volume — category search is how shoppers find the product on Amazon
- Spanish-language search ("sérum para el cabello") signals a bilingual audience opportunity

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
4. Cross-reference with the **Amazon Search Query Performance Data** table above. Ensure the high-volume Amazon terms (hair growth serum, hair serum, scalp serum, hair growth oil, hair thickening serum) are included in your seed list. Also note competitor terms that Amazon shoppers use (nutrafol, champo, inde wild, nioxin) — these signal which brands Soapbox competes against at the point of purchase.
5. Compile a list of 20-30 seed keywords, organized by theme:
   - **Category:** hair growth serum, scalp serum, hair density serum, hair growth oil
   - **Problem:** thinning hair treatment, hair loss products, hair shedding, thickening serum
   - **Comparison:** divi scalp serum reviews, vegamour vs divi, best hair growth serum, nutrafol
   - **Ingredient:** biotin hair serum, redensyl serum, peptide hair treatment
   - **Question:** does hair serum work, how long hair growth serum results

### Phase 2: Check Live Search Data via SerpAPI

**Goal:** Pull current Google SERP data for each seed keyword.

**Process:**
1. Use the SerpAPI client module to search for each seed keyword:
   ```typescript
   import { searchGoogle, getGoogleTrends, searchBatch } from './src/clients/serpapi.js';
   ```

2. For bulk searching, use `searchBatch()` which handles rate limiting (1s between calls) and progress logging automatically:
   ```typescript
   const results = await searchBatch(seedKeywords);
   // Returns null if no API key is configured — trigger fallback
   if (results === null) {
     console.log('No SerpAPI key found. Using cached keyword data.');
     // skip to Fallback section below
   }
   ```

3. From each result, extract:
   - `organicResults[]` — position, title, link, snippet for the top 10 results
   - Check if any result URL contains `soapboxsoaps.com` (ProGRO ranking)
   - Check if any result URL contains competitor domains: `diviofficial.com`, `vegamour.com`, `theordinary.com`, `nutrafol.com`
   - Record the top-ranking URL for each keyword

4. For search volume, use the Google Trends endpoint for a subset of keywords (~15 highest-priority):
   ```typescript
   const trends = await getGoogleTrends(keyword);
   // Returns typed { keyword, timeline, averageInterest }
   ```
   Use the relative interest values to estimate comparative search volume across keywords.

5. **Budget:** ~30 search queries + ~15 trends queries = ~45 total (well within the 100/month free tier). Rate limiting is handled by the client module.

### Phase 2 Fallback: No API Key or Offline Mode

If `searchBatch()` or `searchGoogle()` returns `null` (no API key), or returns `{ success: false }` (API error):

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

7. **Amazon vs Google Cross-Reference**
   Compare the Amazon Search Query Performance data (from the table at the top of this skill) with the Google SERP data collected in Phase 2:
   - **High-volume on both platforms:** Keywords with high Amazon volume AND strong Google search volume — these are the highest-priority targets (e.g., "hair growth serum", "scalp serum")
   - **Amazon-heavy, Google-weak:** Keywords where Amazon volume is high but ProGRO doesn't rank on Google — SEO content opportunities to capture demand that currently only flows through Amazon
   - **Branded search insight:** Amazon branded searches (soapbox, soapbox progro) are low-volume compared to category terms — most Amazon discovery happens through category search, not brand search. Note implications for Amazon listing optimization vs Google SEO.
   - **Competitor signals:** Which competitor names appear in Amazon search data (nutrafol, champo, nioxin, inde wild) and how they compare to Google SERP competitors

8. **ProGRO Ranking Status**
   - Keywords where `soapboxsoaps.com` appears in top 10
   - Keywords where ProGRO is absent but should rank
   - Recommended next steps for each gap

9. **Methodology**
   - Data source: SerpAPI Google Search + Google Trends (or "cached data snapshot" if fallback used) + Amazon Search Query Performance (March 2026 export)
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
