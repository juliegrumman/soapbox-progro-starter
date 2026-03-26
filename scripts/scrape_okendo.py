"""
Okendo Review Scraper — Unified
Scrapes product reviews from any Okendo-powered store and outputs
to a normalized CSV format for competitive intelligence analysis.

Usage:
    python scrape_okendo.py divi
    python scrape_okendo.py vegamour
    python scrape_okendo.py all

Add new competitors by adding an entry to the COMPETITORS dict below.
"""

import requests
import csv
import json
import time
import sys
from urllib.parse import urlencode

# ──────────────────────────────────────────────────────────────
# COMPETITOR CONFIGS
# To add a new Okendo competitor, add an entry here.
# The only required fields are store_id and product_id.
# ──────────────────────────────────────────────────────────────

COMPETITORS = {
    "divi": {
        "competitor_name": "Divi",
        "product_name": "Scalp Serum",
        "store_id": "f28ab46c-84e3-41cc-a3e3-133a18ee65b7",
        "product_id": "shopify-7211822645417",
        "extra_headers": {},
    },
    "vegamour": {
        "competitor_name": "Vegamour",
        "product_name": "GRO Hair Serum",
        "store_id": "9e65baea-5deb-4e8a-ac91-a1200eb60a01",
        "product_id": "shopify-7923465748595",
        "extra_headers": {
            "origin": "https://vegamour.com",
            "referer": "https://vegamour.com/",
        },
    },
}

# ──────────────────────────────────────────────────────────────
# NORMALIZED OUTPUT SCHEMA
# Every scraper (Okendo, Amazon, Yotpo, etc.) must produce
# these exact columns in this order.
# ──────────────────────────────────────────────────────────────

STANDARD_FIELDNAMES = [
    "competitor",          # Brand name (e.g., "Divi", "Vegamour")
    "product",             # Product name (e.g., "Scalp Serum")
    "source_platform",     # Where the review came from (e.g., "okendo", "amazon")
    "review_id",           # Unique review identifier
    "date",                # ISO 8601 date string
    "rating",              # Star rating (1-5)
    "title",               # Review title/headline
    "body",                # Full review text
    "reviewer_name",       # Display name
    "is_verified",         # Verified purchase (True/False)
    "is_recommended",      # Would recommend (True/False/empty)
    "helpful_count",       # Upvotes / helpful count
    "reviewer_attributes", # JSON string of platform-specific attributes
]

LIMIT = 100
BASE_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36",
    "Accept": "application/json",
}


def flatten_attributes(attributes: list) -> str:
    """
    Convert Okendo's attribute list into a JSON string.
    All platform-specific reviewer attributes (age, hair type, skin type,
    scalp type, etc.) go here. The analysis skill parses this column.
    """
    result = {}
    for attr in attributes:
        title = attr.get("title", "").strip()
        val = attr.get("value", "")
        if isinstance(val, list):
            val = ", ".join(val)
        if title and val:
            # Normalize the key: lowercase, replace spaces/special chars with underscore
            key = title.lower().replace(" ", "_").replace("-", "_").rstrip("_?")
            result[key] = val.strip()
    return json.dumps(result) if result else "{}"


def fix_next_url(next_url: str) -> str:
    """Fix Okendo's inconsistent nextUrl formatting."""
    if next_url.startswith("/"):
        return "https://api.okendo.io/v1" + next_url
    if "api.okendo.io/" in next_url and "/v1/" not in next_url:
        return next_url.replace("api.okendo.io/", "api.okendo.io/v1/")
    return next_url


def scrape_competitor(key: str, config: dict) -> list:
    """Scrape all reviews for a single competitor and return normalized rows."""
    competitor_name = config["competitor_name"]
    product_name = config["product_name"]
    store_id = config["store_id"]
    product_id = config["product_id"]

    base_url = f"https://api.okendo.io/v1/stores/{store_id}/products/{product_id}/reviews"
    headers = {**BASE_HEADERS, **config.get("extra_headers", {})}

    all_rows = []
    page = 1
    params = {"limit": LIMIT, "orderBy": "date desc"}
    current_url = f"{base_url}?{urlencode(params)}"

    print(f"\n{'='*60}")
    print(f"Scraping {competitor_name} — {product_name}")
    print(f"{'='*60}")

    while current_url:
        print(f"  Page {page}...")

        try:
            resp = requests.get(current_url, headers=headers, timeout=15)
            resp.raise_for_status()
            data = resp.json()
        except Exception as e:
            print(f"  ERROR: {e}")
            break

        reviews = data.get("reviews", [])
        if not reviews:
            print("  No more reviews — done.")
            break

        for r in reviews:
            attrs_json = flatten_attributes(
                r.get("reviewer", {}).get("attributes", [])
            )
            row = {
                "competitor": competitor_name,
                "product": r.get("productName", product_name),
                "source_platform": "okendo",
                "review_id": r.get("reviewId"),
                "date": r.get("dateCreated"),
                "rating": r.get("rating"),
                "title": r.get("title", "").strip(),
                "body": r.get("body", "").strip(),
                "reviewer_name": r.get("reviewer", {}).get("displayName", ""),
                "is_verified": r.get("reviewer", {}).get("isVerified", False),
                "is_recommended": r.get("isRecommended"),
                "helpful_count": r.get("helpfulCount", 0),
                "reviewer_attributes": attrs_json,
            }
            all_rows.append(row)

        print(f"  Fetched {len(reviews)} (total: {len(all_rows)})")

        next_url = data.get("nextUrl") or data.get("reviewsNextUrl")
        current_url = fix_next_url(next_url) if next_url else None
        page += 1
        time.sleep(0.5)

    return all_rows


def write_csv(rows: list, filename: str):
    """Write normalized rows to CSV."""
    with open(filename, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=STANDARD_FIELDNAMES, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(rows)
    print(f"\n✅ {len(rows)} reviews saved to {filename}")


def main():
    target = sys.argv[1].lower() if len(sys.argv) > 1 else "all"

    if target == "all":
        targets = list(COMPETITORS.keys())
    elif target in COMPETITORS:
        targets = [target]
    else:
        print(f"Unknown competitor: {target}")
        print(f"Available: {', '.join(COMPETITORS.keys())}, all")
        sys.exit(1)

    for key in targets:
        config = COMPETITORS[key]
        rows = scrape_competitor(key, config)
        filename = f"{key}_reviews_normalized.csv"
        write_csv(rows, filename)

    # If scraping multiple competitors, also write a combined file
    if len(targets) > 1:
        all_rows = []
        for key in targets:
            config = COMPETITORS[key]
            filename = f"{key}_reviews_normalized.csv"
            with open(filename, "r", encoding="utf-8") as f:
                reader = csv.DictReader(f)
                all_rows.extend(list(reader))
        write_csv(all_rows, "all_reviews_normalized.csv")


if __name__ == "__main__":
    main()
