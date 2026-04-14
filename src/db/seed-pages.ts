/**
 * Seed script: Import fallback page audit data from data/pages/ into SQLite.
 *
 * Usage: npx tsx src/db/seed-pages.ts
 *
 * Expects CSV with columns:
 *   url, performance_score, seo_score, accessibility_score, best_practices_score,
 *   lcp, cls, fcp, inp, ttfb, messaging_alignment_score, keywords_found,
 *   keywords_missing, messaging_gaps, scroll_depth, engagement_time, rage_clicks,
 *   dead_clicks, quick_backs, clarity_metrics, recommendations, quick_wins, audited_at
 */

import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import { parse } from "csv-parse/sync";
import { db, sqlite } from "./index.js";
import { pagePerformance } from "./schema.js";

const DATA_DIR = resolve(import.meta.dirname, "../../data/pages");

function seedPages() {
  const csvPath = resolve(DATA_DIR, "seed-page-audit.csv");

  if (!existsSync(csvPath)) {
    console.error(
      `No page audit CSV found at ${csvPath}.\n` +
        "Run the page audit orchestrator first,\n" +
        "or place a seed-page-audit.csv file in data/pages/"
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

  // Clear existing page performance data before re-seeding
  sqlite.exec("DELETE FROM page_performance");
  console.log("Cleared existing page performance data from database.");

  const insertStmt = sqlite.prepare(`
    INSERT INTO page_performance
      (url, performance_score, seo_score, accessibility_score, best_practices_score,
       lcp, cls, fcp, inp, ttfb,
       messaging_alignment_score, keywords_found, keywords_missing, messaging_gaps,
       scroll_depth, engagement_time, rage_clicks, dead_clicks, quick_backs,
       clarity_metrics, recommendations, quick_wins, audited_at)
    VALUES
      (@url, @performanceScore, @seoScore, @accessibilityScore, @bestPracticesScore,
       @lcp, @cls, @fcp, @inp, @ttfb,
       @messagingAlignmentScore, @keywordsFound, @keywordsMissing, @messagingGaps,
       @scrollDepth, @engagementTime, @rageClicks, @deadClicks, @quickBacks,
       @clarityMetrics, @recommendations, @quickWins, @auditedAt)
  `);

  const insertBatch = sqlite.transaction((rows: typeof records) => {
    for (const row of rows) {
      insertStmt.run({
        url: row.url || "",
        performanceScore: row.performance_score ? parseFloat(row.performance_score) : null,
        seoScore: row.seo_score ? parseFloat(row.seo_score) : null,
        accessibilityScore: row.accessibility_score ? parseFloat(row.accessibility_score) : null,
        bestPracticesScore: row.best_practices_score ? parseFloat(row.best_practices_score) : null,
        lcp: row.lcp ? parseFloat(row.lcp) : null,
        cls: row.cls ? parseFloat(row.cls) : null,
        fcp: row.fcp ? parseFloat(row.fcp) : null,
        inp: row.inp ? parseFloat(row.inp) : null,
        ttfb: row.ttfb ? parseFloat(row.ttfb) : null,
        messagingAlignmentScore: row.messaging_alignment_score ? parseFloat(row.messaging_alignment_score) : null,
        keywordsFound: row.keywords_found || null,
        keywordsMissing: row.keywords_missing || null,
        messagingGaps: row.messaging_gaps || null,
        scrollDepth: row.scroll_depth ? parseFloat(row.scroll_depth) : null,
        engagementTime: row.engagement_time ? parseFloat(row.engagement_time) : null,
        rageClicks: row.rage_clicks ? parseInt(row.rage_clicks, 10) : null,
        deadClicks: row.dead_clicks ? parseInt(row.dead_clicks, 10) : null,
        quickBacks: row.quick_backs ? parseInt(row.quick_backs, 10) : null,
        clarityMetrics: row.clarity_metrics || null,
        recommendations: row.recommendations || null,
        quickWins: row.quick_wins || null,
        auditedAt: row.audited_at || new Date().toISOString(),
      });
    }
  });

  insertBatch(records);

  // Print summary
  const summary = sqlite
    .prepare(
      `SELECT url,
              performance_score,
              seo_score,
              messaging_alignment_score,
              scroll_depth,
              rage_clicks
       FROM page_performance
       ORDER BY audited_at DESC`
    )
    .all() as {
    url: string;
    performance_score: number;
    seo_score: number;
    messaging_alignment_score: number;
    scroll_depth: number;
    rage_clicks: number;
  }[];

  console.log(`\nSeeded ${records.length} page audit(s):`);
  for (const row of summary) {
    console.log(`  ${row.url}`);
    console.log(`    Performance: ${row.performance_score}/100 | SEO: ${row.seo_score}/100 | Messaging: ${row.messaging_alignment_score}/100`);
    console.log(`    Scroll depth: ${row.scroll_depth}% | Rage clicks: ${row.rage_clicks}`);
  }
}

seedPages();
