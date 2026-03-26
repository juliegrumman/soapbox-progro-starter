# Skill: Competitive Review Collection

## Purpose
Scrape and normalize product reviews from competitor brands for competitive intelligence analysis. This skill handles data collection only — analysis is handled by the `competitive-intelligence-analysis` skill.

## When to Use
- Collecting competitor product reviews for a new competitive analysis
- Adding a new competitor to an existing dataset
- Refreshing review data for an existing competitor

## How It Works

### Existing Scrapers
Check the `scripts/` directory for existing platform scrapers before writing new ones:
- `scrape_okendo.py` — Scrapes any Okendo-powered review widget. Configured competitors can be run with `python scripts/scrape_okendo.py <competitor_key>` or `python scripts/scrape_okendo.py all`.

### Adding a New Okendo Competitor
If the target competitor uses Okendo for reviews:
1. Open `scripts/scrape_okendo.py`
2. Add a new entry to the `COMPETITORS` dict with: `competitor_name`, `product_name`, `store_id`, `product_id`, and any `extra_headers` (some stores require `origin` and `referer` headers)
3. Run `python scripts/scrape_okendo.py <new_key>`

**How to find Okendo store_id and product_id:** Open the competitor's product page in a browser. Open DevTools > Network tab. Filter by "okendo". Look for a request to `api.okendo.io/v1/stores/{store_id}/products/{product_id}/reviews`. The store_id and product_id are in the URL.

### Adding a New Platform Scraper
If the competitor uses a different review platform (Yotpo, Bazaarvoice, Judge.me, Amazon, etc.):
1. Write a new Python script named `scrape_<platform>.py`
2. The script MUST output the normalized CSV schema (see below)
3. Add it to the `scripts/` directory
4. Follow the same config-driven pattern: one script per platform, competitor-specific details in a config dict at the top

### Normalized Output Schema
**Every scraper, regardless of platform, MUST output these exact columns in this order:**

| Column | Type | Description |
|--------|------|-------------|
| `competitor` | string | Brand name (e.g., "Divi", "Vegamour") |
| `product` | string | Product name (e.g., "Scalp Serum") |
| `source_platform` | string | Platform ID (e.g., "okendo", "amazon", "yotpo") |
| `review_id` | string | Unique review identifier from the source |
| `date` | string | ISO 8601 date (e.g., "2026-03-11T00:27:12.296Z") |
| `rating` | int | Star rating, 1-5 |
| `title` | string | Review title/headline (may be empty) |
| `body` | string | Full review text |
| `reviewer_name` | string | Display name |
| `is_verified` | bool | Verified purchase flag |
| `is_recommended` | bool | Would recommend flag (empty if not available) |
| `helpful_count` | int | Upvote / helpful count |
| `reviewer_attributes` | JSON string | All platform-specific reviewer attributes as a JSON object (e.g., `{"age": "25-34", "hair_texture": "Fine", "scalp_type": "Oily"}`) |

**Rules:**
- Do NOT add platform-specific columns to the core schema. All platform-specific data goes in `reviewer_attributes` as JSON.
- File naming: `<competitor_key>_reviews_normalized.csv`
- When scraping multiple competitors, also produce `all_reviews_normalized.csv` combining all data.
- Always include a 0.5s delay between paginated API requests.

## Output
- One normalized CSV file per competitor: `<competitor>_reviews_normalized.csv`
- Combined file when scraping multiple: `all_reviews_normalized.csv`
- All files saved to the project's `data/reviews/` directory
