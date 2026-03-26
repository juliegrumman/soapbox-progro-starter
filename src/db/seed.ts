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

import { readFileSync, existsSync } from "fs";
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
  // Prefer the combined file; fall back to individual files
  const combinedPath = resolve(DATA_DIR, "all_reviews_normalized.csv");
  const diviPath = resolve(DATA_DIR, "divi_reviews_normalized.csv");
  const vegamourPath = resolve(DATA_DIR, "vegamour_reviews_normalized.csv");

  let csvFiles: string[] = [];

  if (existsSync(combinedPath)) {
    csvFiles = [combinedPath];
    console.log("Using combined CSV: all_reviews_normalized.csv");
  } else {
    // Fall back to individual files
    for (const p of [diviPath, vegamourPath]) {
      if (existsSync(p)) csvFiles.push(p);
    }
    if (csvFiles.length === 0) {
      console.error(
        `No CSV files found in ${DATA_DIR}.\n` +
          "Run: cd scripts && python scrape_okendo.py all\n" +
          "Then move the output CSVs to data/reviews/"
      );
      process.exit(1);
    }
    console.log(`Using individual CSVs: ${csvFiles.map((f) => f.split("/").pop()).join(", ")}`);
  }

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
