# Skill: Competitive Intelligence Analysis

## Purpose
Analyze normalized competitor review data to produce actionable competitive intelligence. This skill reads from the `competitive_reviews` table in the SQLite database and generates a structured report with six analysis components.

## When to Use
- After collecting competitor reviews using the collection skill
- When refreshing a competitive analysis with new data
- When analyzing a specific competitor or comparing across competitors

## Input
This skill reads from the `competitive_reviews` table in the SQLite database (`soapbox.db`). Use the tool functions in `src/tools/reviews.ts` to query data, or query the database directly via `sqlite3 soapbox.db`.

The table columns: `competitor`, `product`, `source_platform`, `review_id`, `date`, `rating`, `title`, `body`, `reviewer_name`, `is_verified`, `is_recommended`, `helpful_count`, `reviewer_attributes`, `sentiment_score`, `themes`, `scraped_at`

Normalized CSV files are also available in `data/reviews/` as a fallback.

## Analysis Strategy

Before starting the analysis, query the database to understand the dataset:

```sql
SELECT competitor, COUNT(*) as reviews, ROUND(AVG(rating), 2) as avg_rating
FROM competitive_reviews GROUP BY competitor ORDER BY reviews DESC;
```

### Phase 1: Quantitative foundation (use SQL aggregates on the FULL dataset)
- Rating distributions per competitor
- Monthly review counts and average ratings (for sentiment trending)
- Reviewer attribute breakdowns (age, hair concerns, etc.) cross-referenced with ratings
- These numbers cover every review — no sampling needed

### Phase 2: Qualitative deep dive (use stratified sampling)
For the language extraction, objection mapping, and feature gap analysis,
read a representative sample rather than the full dataset:
- Sample up to 100 reviews per star rating per competitor
- For competitors with fewer than 500 reviews, read all of them
- Prioritize reviews with substantive body text (>50 characters)
- This keeps total review text manageable regardless of how many
  competitors or reviews are in the database

### Phase 3: Synthesis
Combine the full-dataset quantitative metrics with the sampled qualitative
insights to produce the report. Every claim should be backed by either
an aggregate statistic or a direct quote from the sample.

## Analysis Components

### 1. Customer Language Extraction
Extract the exact words and phrases customers use to describe their experience. This is messaging gold for ad copy, landing pages, and product descriptions.

**Process:**
- Scan all review bodies and titles for recurring phrases and descriptive language
- Group extracted language by theme: efficacy/results, application experience, value/price, side effects/concerns, comparison to alternatives, emotional response
- For each theme, list the 10-15 most frequently occurring phrases with example quotes
- Flag phrases that appear in 5-star reviews (aspirational language) separately from 1-2 star reviews (objection language) — both are valuable for different purposes
- Prioritize language that is specific and vivid over generic praise ("my hair feels thicker after 3 weeks" over "great product")

### 2. Objection Pattern Mapping
Surface the recurring reasons people leave 1-3 star reviews. These are the objections the sales page, ads, and customer support need to address.

**Process:**
- Filter to reviews rated 1-3 stars
- Identify and categorize recurring complaint themes (e.g., "no results after X weeks," "too expensive for what you get," "caused irritation," "misleading claims")
- For each objection theme: count frequency, calculate what percentage of negative reviews mention it, list 3-5 representative quotes, and note whether the objection is about the product itself or the purchase experience
- Rank objections by frequency — the most common objection is the one that must be addressed first in marketing
- Cross-reference: do the same objections appear across multiple competitors (industry-wide problem) or are they specific to one brand (competitive opportunity)?

### 3. Feature Gap Analysis
Identify needs and features customers mention wanting but aren't getting from current products. These are opportunities for ProGro Density+ positioning.

**Process:**
- Scan for language indicating unmet needs: "I wish," "if only," "would be better if," "compared to X which has," "missing," "doesn't have," "looking for"
- Also scan positive reviews for features praised as differentiators — if customers celebrate a feature, its absence elsewhere is a gap
- Categorize gaps: product formulation, packaging/application, pricing/sizing, results timeline/expectations, transparency/ingredients, customer support
- For each gap: note which competitor(s) it applies to, frequency, and whether ProGro Density+ addresses it (if known)

### 4. Sentiment Trending
Analyze whether each competitor's perception is improving or declining over time. Useful for identifying competitors who are losing ground or gaining momentum.

**Process:**
- Bucket reviews by month (using the `date` field)
- For each month per competitor: calculate average rating, count of reviews, percentage of 4-5 star reviews, percentage of 1-2 star reviews
- Identify inflection points: months where average rating shifted notably (±0.3 stars or more)
- If an inflection point exists, sample reviews from that period to identify what changed (reformulation? shipping issues? price increase?)
- Present as a table: competitor, month, review_count, avg_rating, pct_positive, pct_negative, notable_themes
- Call out the overall trend direction for each competitor: improving, declining, stable, or volatile

### 5. Customer Persona Clustering
Identify distinct buyer types from review language and the `reviewer_attributes` JSON column. Understand which segments are most satisfied and which are underserved.

**Process:**
- Parse the `reviewer_attributes` JSON column to extract demographic and characteristic data (age ranges, hair type, skin type, concerns, etc.)
- Cross-reference attributes with ratings and review language to identify clusters:
  - Which age groups rate highest/lowest?
  - Which hair concern segments are most/least satisfied?
  - Are there attribute combinations that predict satisfaction or dissatisfaction?
- Define 3-5 persona archetypes with: a descriptive label, key attributes, typical satisfaction level, what they care about most, and representative review quotes
- Identify the underserved persona — the group with the lowest average rating or most frequent complaints — as this is a priority acquisition target for ProGro Density+
- Note: not all platforms collect the same attributes. Use what's available and note data gaps.

### 6. Competitor Scorecard
Rate each competitor across key dimensions using evidence from the reviews. This is the at-a-glance comparison for the executive summary.

**Process:**
- Score each competitor on a 1-5 scale across: perceived efficacy, value for money, application experience, brand trust, customer support
- Each score must be backed by specific evidence: average rating for relevant reviews, frequency of relevant positive/negative mentions, representative quotes
- Identify each competitor's #1 strength and #1 vulnerability
- Note where ProGro Density+ has a clear competitive advantage (if data exists)

## Output Format
Produce a single markdown file: `competitive-intelligence-report.md`

**Structure:**
1. **Executive Summary** (top of report) — The 5 most actionable findings, each in 1-2 sentences. These should be insights a marketing team can act on immediately.
2. **Competitor Scorecard** — The at-a-glance comparison table
3. **Customer Language Database** — Organized by theme, with positive and negative language separated
4. **Objection Patterns** — Ranked by frequency with cross-competitor comparison
5. **Feature Gaps** — Categorized with competitive opportunity flags
6. **Sentiment Trends** — Monthly trend table with inflection analysis
7. **Customer Personas** — Persona profiles with satisfaction data
8. **Methodology Note** — Brief note on data sources, date range, and review counts per competitor

Save the report to the project's `reports/` directory.

## Tips for Best Results
- The Analysis Strategy section above defines the sampling approach. Follow it to keep analysis manageable at any dataset size.
- The more review data available, the more reliable the persona clustering and sentiment trending. Minimum recommended: 500 reviews per competitor.
- Re-run this analysis periodically (monthly or quarterly) as new review data is collected to track shifts in competitive positioning.
