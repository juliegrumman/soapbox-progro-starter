/**
 * Tool functions for the keyword_rankings table.
 * Used by the SEO Keyword Agent (Session 2) to read and write keyword data.
 */

import { db } from "../db/index.js";
import { keywordRankings } from "../db/schema.js";
import { eq, sql, and, gte, lte, like } from "drizzle-orm";

/** Get all keyword rankings, optionally filtered by cluster or intent */
export function getKeywords(opts?: { cluster?: string; intent?: string; limit?: number }) {
  let query = db.select().from(keywordRankings).$dynamic();

  const conditions = [];
  if (opts?.cluster) {
    conditions.push(eq(keywordRankings.cluster, opts.cluster));
  }
  if (opts?.intent) {
    conditions.push(eq(keywordRankings.intent, opts.intent));
  }
  if (conditions.length > 0) {
    query = query.where(and(...conditions));
  }

  if (opts?.limit) {
    query = query.limit(opts.limit);
  }

  return query;
}

/** Get keyword counts and metrics grouped by cluster */
export function getKeywordsByCluster() {
  return db
    .select({
      cluster: keywordRankings.cluster,
      count: sql<number>`COUNT(*)`,
      avgPosition: sql<number>`ROUND(AVG(${keywordRankings.position}), 1)`,
      totalVolume: sql<number>`SUM(${keywordRankings.searchVolume})`,
    })
    .from(keywordRankings)
    .groupBy(keywordRankings.cluster);
}

/** Get keyword counts and metrics grouped by search intent */
export function getKeywordsByIntent() {
  return db
    .select({
      intent: keywordRankings.intent,
      count: sql<number>`COUNT(*)`,
      avgPosition: sql<number>`ROUND(AVG(${keywordRankings.position}), 1)`,
      totalVolume: sql<number>`SUM(${keywordRankings.searchVolume})`,
    })
    .from(keywordRankings)
    .groupBy(keywordRankings.intent);
}

/** Get keywords filtered by SERP position range (e.g., 1-10 for page 1, 11-20 for striking distance) */
export function getKeywordsByPositionRange(minPos: number, maxPos: number, opts?: { cluster?: string; limit?: number }) {
  const conditions = [
    gte(keywordRankings.position, minPos),
    lte(keywordRankings.position, maxPos),
  ];

  if (opts?.cluster) {
    conditions.push(eq(keywordRankings.cluster, opts.cluster));
  }

  let query = db
    .select()
    .from(keywordRankings)
    .where(and(...conditions))
    .$dynamic();

  if (opts?.limit) {
    query = query.limit(opts.limit);
  }

  return query;
}

/** Search keywords by substring match */
export function searchKeywords(term: string, opts?: { limit?: number }) {
  const pattern = `%${term}%`;

  let query = db
    .select()
    .from(keywordRankings)
    .where(like(keywordRankings.keyword, pattern))
    .$dynamic();

  if (opts?.limit) {
    query = query.limit(opts.limit);
  }

  return query;
}

/** Insert or update a single keyword ranking */
export function upsertKeyword(data: {
  keyword: string;
  position?: number;
  searchVolume?: number;
  url?: string;
  intent?: string;
  cluster?: string;
}) {
  return db.insert(keywordRankings).values({
    ...data,
    checkedAt: new Date().toISOString(),
  });
}

/** Bulk insert keyword rankings (for SerpAPI results or CSV import) */
export function insertKeywordBatch(keywords: Array<{
  keyword: string;
  position?: number;
  searchVolume?: number;
  url?: string;
  intent?: string;
  cluster?: string;
}>) {
  const rows = keywords.map((kw) => ({
    ...kw,
    checkedAt: new Date().toISOString(),
  }));

  return db.insert(keywordRankings).values(rows);
}
