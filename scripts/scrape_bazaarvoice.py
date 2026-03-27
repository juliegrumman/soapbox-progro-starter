"""
Bazaarvoice Review Scraper — Unified
Scrapes product reviews from any Bazaarvoice-powered retailer and outputs
to a normalized CSV format for competitive intelligence analysis.

Usage:
    python scrape_bazaarvoice.py hers
    python scrape_bazaarvoice.py all

Add new competitors by adding an entry to the COMPETITORS dict below.
"""

import os
import requests
import csv
import json
import time
import sys
from urllib.parse import urlencode

# ──────────────────────────────────────────────────────────────
# COMPETITOR CONFIGS
# To add a new Bazaarvoice competitor, add an entry here.
# Required: competitor_name, product_name, product_id, passkey
# ──────────────────────────────────────────────────────────────

COMPETITORS = {
    "hers": {
        "competitor_name": "Hers",
        "product_name": "Minoxidil 2% Topical Solution",
        "product_id": "79332324",
        "passkey": "caEisO5Wn6V0qlnb3bPloQFTeKRf7G5X7omtNo161xZQA",
        "retailer": "target",
    },
}

# ──────────────────────────────────────────────────────────────
# NORMALIZED OUTPUT SCHEMA (matches scrape_okendo.py)
# ──────────────────────────────────────────────────────────────

STANDARD_FIELDNAMES = [
    "competitor",
    "product",
    "source_platform",
    "review_id",
    "date",
    "rating",
    "title",
    "body",
    "reviewer_name",
    "is_verified",
    "is_recommended",
    "helpful_count",
    "reviewer_attributes",
]

API_BASE = "https://api.bazaarvoice.com/data/reviews.json"
LIMIT = 100
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                  "AppleWebKit/537.36 (KHTML, like Gecko) "
                  "Chrome/144.0.0.0 Safari/537.36",
    "Accept": "application/json",
}


def flatten_context_data(context_data: dict) -> str:
    """
    Convert Bazaarvoice ContextDataValues into a JSON string.
    These may include reviewer demographics/attributes.
    """
    result = {}
    for key, val_obj in context_data.items():
        if isinstance(val_obj, dict):
            value = val_obj.get("Value", val_obj.get("value", ""))
        else:
            value = str(val_obj)
        if value:
            result[key.lower()] = value
    return json.dumps(result) if result else "{}"


def flatten_secondary_ratings(secondary: dict) -> dict:
    """Extract secondary ratings (Quality, Value, etc.) as simple k/v."""
    result = {}
    for key, val_obj in secondary.items():
        if isinstance(val_obj, dict):
            result[key.lower()] = val_obj.get("Value", val_obj.get("value"))
        else:
            result[key.lower()] = val_obj
    return result


def scrape_competitor(key: str, config: dict) -> list:
    """Scrape all reviews for a single competitor and return normalized rows."""
    competitor_name = config["competitor_name"]
    product_name = config["product_name"]
    product_id = config["product_id"]
    passkey = config["passkey"]
    retailer = config.get("retailer", "bazaarvoice")

    all_rows = []
    offset = 0
    page = 1

    print(f"\n{'='*60}")
    print(f"Scraping {competitor_name} — {product_name} (via {retailer})")
    print(f"{'='*60}")

    while True:
        params = {
            "apiversion": "5.4",
            "passkey": passkey,
            "filter": f"productid:eq:{product_id}",
            "limit": LIMIT,
            "offset": offset,
            "sort": "SubmissionTime:desc",
        }
        url = f"{API_BASE}?{urlencode(params)}"

        print(f"  Page {page} (offset {offset})...")

        try:
            resp = requests.get(url, headers=HEADERS, timeout=15)
            resp.raise_for_status()
            data = resp.json()
        except Exception as e:
            print(f"  ERROR: {e}")
            break

        if data.get("HasErrors"):
            errors = data.get("Errors", [])
            for err in errors:
                print(f"  API ERROR: {err.get('Message', err)}")
            break

        reviews = data.get("Results", [])
        total = data.get("TotalResults", 0)

        if not reviews:
            print("  No more reviews — done.")
            break

        for r in reviews:
            context_data = r.get("ContextDataValues", {})
            secondary = r.get("SecondaryRatings", {})

            # Merge context data and secondary ratings into attributes
            attrs = {}
            ctx = flatten_context_data(context_data)
            if ctx != "{}":
                attrs.update(json.loads(ctx))
            sec = flatten_secondary_ratings(secondary)
            if sec:
                attrs.update({f"rating_{k}": v for k, v in sec.items()})

            row = {
                "competitor": competitor_name,
                "product": product_name,
                "source_platform": retailer,
                "review_id": r.get("Id"),
                "date": r.get("SubmissionTime"),
                "rating": r.get("Rating"),
                "title": (r.get("Title") or "").strip(),
                "body": (r.get("ReviewText") or "").strip(),
                "reviewer_name": r.get("UserNickname") or "",
                "is_verified": r.get("BadgesOrder", []) and "verifiedPurchaser" in r.get("BadgesOrder", []),
                "is_recommended": r.get("IsRecommended"),
                "helpful_count": r.get("TotalPositiveFeedbackCount", 0),
                "reviewer_attributes": json.dumps(attrs) if attrs else "{}",
            }
            all_rows.append(row)

        print(f"  Fetched {len(reviews)} (total: {len(all_rows)} / {total})")

        offset += LIMIT
        if offset >= total:
            break
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

    # Ensure output directory exists
    os.makedirs("data/reviews", exist_ok=True)

    for key in targets:
        config = COMPETITORS[key]
        rows = scrape_competitor(key, config)
        filename = f"data/reviews/{key}_reviews_normalized.csv"
        write_csv(rows, filename)

    if len(targets) > 1:
        all_rows = []
        for key in targets:
            filename = f"data/reviews/{key}_reviews_normalized.csv"
            with open(filename, "r", encoding="utf-8") as f:
                reader = csv.DictReader(f)
                all_rows.extend(list(reader))
        write_csv(all_rows, "data/reviews/all_reviews_normalized.csv")


if __name__ == "__main__":
    main()
