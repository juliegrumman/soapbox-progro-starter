/**
 * Tool functions for the reddit_threads table.
 * Used by the Reddit Agent (Session 3) to read and write Reddit thread data.
 */

import { db } from "../db/index.js";
import { redditThreads } from "../db/schema.js";
import { eq, sql, like, or } from "drizzle-orm";

/** Insert a single Reddit thread */
export function insertThread(thread: {
  subreddit: string;
  threadId: string;
  title?: string;
  body?: string;
  author?: string;
  score?: number;
  commentCount?: number;
  sentiment?: string;
  relevantBrands?: string[];
}) {
  return db.insert(redditThreads).values({
    subreddit: thread.subreddit,
    threadId: thread.threadId,
    title: thread.title ?? null,
    body: thread.body ?? null,
    author: thread.author ?? null,
    score: thread.score ?? 0,
    commentCount: thread.commentCount ?? 0,
    sentiment: thread.sentiment ?? null,
    relevantBrands: thread.relevantBrands
      ? JSON.stringify(thread.relevantBrands)
      : null,
    foundAt: new Date().toISOString(),
  });
}

/** Insert multiple Reddit threads at once */
export function insertThreadBatch(
  threads: Array<{
    subreddit: string;
    threadId: string;
    title?: string;
    body?: string;
    author?: string;
    score?: number;
    commentCount?: number;
    sentiment?: string;
    relevantBrands?: string[];
  }>
) {
  const values = threads.map((t) => ({
    subreddit: t.subreddit,
    threadId: t.threadId,
    title: t.title ?? null,
    body: t.body ?? null,
    author: t.author ?? null,
    score: t.score ?? 0,
    commentCount: t.commentCount ?? 0,
    sentiment: t.sentiment ?? null,
    relevantBrands: t.relevantBrands
      ? JSON.stringify(t.relevantBrands)
      : null,
    foundAt: new Date().toISOString(),
  }));

  return db.insert(redditThreads).values(values);
}

/** Get all threads, optionally filtered by subreddit */
export function getThreads(opts?: { subreddit?: string; limit?: number }) {
  let query = db.select().from(redditThreads).$dynamic();

  if (opts?.subreddit) {
    query = query.where(eq(redditThreads.subreddit, opts.subreddit));
  }

  if (opts?.limit) {
    query = query.limit(opts.limit);
  }

  return query;
}

/** Get thread counts grouped by subreddit */
export function getThreadCountsBySubreddit() {
  return db
    .select({
      subreddit: redditThreads.subreddit,
      count: sql<number>`COUNT(*)`,
      avgScore: sql<number>`ROUND(AVG(${redditThreads.score}), 1)`,
    })
    .from(redditThreads)
    .groupBy(redditThreads.subreddit);
}

/** Get sentiment distribution */
export function getSentimentDistribution() {
  return db
    .select({
      sentiment: redditThreads.sentiment,
      count: sql<number>`COUNT(*)`,
    })
    .from(redditThreads)
    .groupBy(redditThreads.sentiment);
}

/** Search threads by keyword in title or body */
export function searchThreads(keyword: string, limit = 20) {
  const pattern = `%${keyword}%`;
  return db
    .select()
    .from(redditThreads)
    .where(
      or(
        like(redditThreads.title, pattern),
        like(redditThreads.body, pattern)
      )
    )
    .limit(limit);
}
