/**
 * Seed script: Import normalized CSVs from data/reviews/ into SQLite.
 *
 * Usage: npx tsx src/db/seed.ts
 *
 * Expects CSV files with the standard normalized schema columns:
 *   competitor, product, source_platform, review_id, date, rating,
 *   title, body, reviewer_name, is_verified, is_recommended,
 *   helpful_count, reviewer_attributes
 */

import { readFileSync, existsSync, readdirSync } from "fs";
import { resolve } from "path";
import { parse } from "csv-parse/sync";
import { db, sqlite } from "./index.js";
import { competitiveReviews } from "./schema.js";

const DATA_DIR = resolve(import.meta.dirname, "../../data/reviews");

function parseBool(value: string | undefined): boolean | null {
  if (value === undefined || value === "") return null;
  const lower = value.toLowerCase().trim();
  if (lower === "true" || lower === "1") return true;
  if (lower === "false" || lower === "0") return false;
  return null;
}

function seedReviews() {
  // Discover all *_reviews_normalized.csv files, skipping the combined file
  if (!existsSync(DATA_DIR)) {
    console.error(
      `Data directory not found: ${DATA_DIR}\n` +
        "Run a scraper first, e.g.: venv/bin/python scripts/scrape_okendo.py all"
    );
    process.exit(1);
  }

  const csvFiles = readdirSync(DATA_DIR)
    .filter((f) => f.endsWith("_reviews_normalized.csv") && f !== "all_reviews_normalized.csv")
    .sort()
    .map((f) => resolve(DATA_DIR, f));

  if (csvFiles.length === 0) {
    console.error(
      `No *_reviews_normalized.csv files found in ${DATA_DIR}.\n` +
        "Run a scraper first, e.g.: venv/bin/python scripts/scrape_okendo.py all"
    );
    process.exit(1);
  }

  console.log(`Found ${csvFiles.length} CSV files: ${csvFiles.map((f) => f.split("/").pop()).join(", ")}`);

  // Clear existing reviews before re-seeding
  sqlite.exec("DELETE FROM competitive_reviews");
  console.log("Cleared existing reviews from database.");

  let totalInserted = 0;

  for (const csvPath of csvFiles) {
    const raw = readFileSync(csvPath, "utf-8");
    const records: Record<string, string>[] = parse(raw, {
      columns: true,
      skip_empty_lines: true,
      relax_column_count: true,
    });

    console.log(`Parsing ${csvPath.split("/").pop()}: ${records.length} rows`);

    // Insert in batches of 500 for performance
    const batchSize = 500;
    const insertStmt = sqlite.prepare(`
      INSERT OR IGNORE INTO competitive_reviews
        (competitor, product, source_platform, review_id, date, rating,
         title, body, reviewer_name, is_verified, is_recommended,
         helpful_count, reviewer_attributes, scraped_at)
      VALUES
        (@competitor, @product, @sourcePlatform, @reviewId, @date, @rating,
         @title, @body, @reviewerName, @isVerified, @isRecommended,
         @helpfulCount, @reviewerAttributes, @scrapedAt)
    `);

    const insertBatch = sqlite.transaction((rows: typeof records) => {
      for (const row of rows) {
        insertStmt.run({
          competitor: row.competitor || "",
          product: row.product || "",
          sourcePlatform: row.source_platform || "",
          reviewId: row.review_id || null,
          date: row.date || null,
          rating: row.rating ? parseInt(row.rating, 10) : null,
          title: row.title || null,
          body: row.body || null,
          reviewerName: row.reviewer_name || null,
          isVerified: parseBool(row.is_verified) ? 1 : 0,
          isRecommended: parseBool(row.is_recommended) ? 1 : 0,
          helpfulCount: row.helpful_count ? parseInt(row.helpful_count, 10) : 0,
          reviewerAttributes: row.reviewer_attributes || "{}",
          scrapedAt: new Date().toISOString(),
        });
      }
    });

    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      insertBatch(batch);
      totalInserted += batch.length;
    }
  }

  // Print summary
  const counts = sqlite
    .prepare(
      "SELECT competitor, COUNT(*) as count FROM competitive_reviews GROUP BY competitor"
    )
    .all() as { competitor: string; count: number }[];

  console.log(`\nSeeded ${totalInserted} reviews total:`);
  for (const { competitor, count } of counts) {
    console.log(`  ${competitor}: ${count}`);
  }
}

seedReviews();
