/**
 * Seed script: Import fallback keyword data from data/keywords/ into SQLite.
 *
 * Usage: npx tsx src/db/seed-keywords.ts
 *
 * Expects CSV with columns:
 *   keyword, position, search_volume, url, intent, cluster
 */

import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import { parse } from "csv-parse/sync";
import { db, sqlite } from "./index.js";
import { keywordRankings } from "./schema.js";

const DATA_DIR = resolve(import.meta.dirname, "../../data/keywords");

function seedKeywords() {
  const csvPath = resolve(DATA_DIR, "seed-keywords-with-serp-data.csv");

  if (!existsSync(csvPath)) {
    console.error(
      `No keyword CSV found at ${csvPath}.\n` +
        "Run the SEO keyword research skill with a SerpAPI key first,\n" +
        "or place a seed-keywords-with-serp-data.csv file in data/keywords/"
    );
    process.exit(1);
  }

  const raw = readFileSync(csvPath, "utf-8");
  const records: Record<string, string>[] = parse(raw, {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
  });

  console.log(`Parsing ${csvPath.split("/").pop()}: ${records.length} rows`);

  // Clear existing keywords before re-seeding
  sqlite.exec("DELETE FROM keyword_rankings");
  console.log("Cleared existing keywords from database.");

  const insertStmt = sqlite.prepare(`
    INSERT INTO keyword_rankings
      (keyword, position, search_volume, url, intent, cluster, checked_at)
    VALUES
      (@keyword, @position, @searchVolume, @url, @intent, @cluster, @checkedAt)
  `);

  const insertBatch = sqlite.transaction((rows: typeof records) => {
    for (const row of rows) {
      insertStmt.run({
        keyword: row.keyword || "",
        position: row.position ? parseInt(row.position, 10) : null,
        searchVolume: row.search_volume ? parseInt(row.search_volume, 10) : null,
        url: row.url || null,
        intent: row.intent || null,
        cluster: row.cluster || null,
        checkedAt: new Date().toISOString(),
      });
    }
  });

  insertBatch(records);

  // Print summary
  const counts = sqlite
    .prepare(
      "SELECT cluster, COUNT(*) as count, ROUND(AVG(position), 1) as avg_pos FROM keyword_rankings GROUP BY cluster"
    )
    .all() as { cluster: string; count: number; avg_pos: number }[];

  console.log(`\nSeeded ${records.length} keywords total:`);
  for (const { cluster, count, avg_pos } of counts) {
    console.log(`  ${cluster}: ${count} keywords (avg position: ${avg_pos})`);
  }
}

seedKeywords();
