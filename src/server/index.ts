/**
 * Express API server — serves JSON from SQLite to the dashboard.
 * Minimal footprint; expanded in Session 5.
 */

import express from "express";
import { resolve } from "path";
import { readFileSync, readdirSync, existsSync } from "fs";
import { db } from "../db/index.js";
import { competitiveReviews, keywordRankings, redditThreads, pagePerformance, clarityEvents, claritySources, metaAds } from "../db/schema.js";
import { sql, desc, eq, and } from "drizzle-orm";

const app = express();
const PORT = process.env.PORT || 3001;

// CORS for local dashboard dev
app.use((_req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  next();
});

// Serve static dashboard files
app.use(express.static(resolve(import.meta.dirname, "../../public")));

// Reviews summary
app.get("/api/reviews/summary", async (_req, res) => {
  const result = db
    .select({
      competitor: competitiveReviews.competitor,
      count: sql<number>`COUNT(*)`,
      avgRating: sql<number>`ROUND(AVG(${competitiveReviews.rating}), 2)`,
    })
    .from(competitiveReviews)
    .groupBy(competitiveReviews.competitor)
    .all();

  res.json(result);
});

// Reviews rating distribution
app.get("/api/reviews/rating-distribution", async (_req, res) => {
  const result = db
    .select({
      competitor: competitiveReviews.competitor,
      rating: competitiveReviews.rating,
      count: sql<number>`COUNT(*)`,
    })
    .from(competitiveReviews)
    .groupBy(competitiveReviews.competitor, competitiveReviews.rating)
    .all();
  res.json(result);
});

// Keywords - all data (Session 2+)
app.get("/api/keywords", async (_req, res) => {
  const result = db.select().from(keywordRankings).all();
  res.json(result);
});

// Keywords summary by cluster
app.get("/api/keywords/summary", async (_req, res) => {
  const result = db
    .select({
      cluster: keywordRankings.cluster,
      count: sql<number>`COUNT(*)`,
      avgPosition: sql<number>`ROUND(AVG(${keywordRankings.position}), 1)`,
      totalVolume: sql<number>`SUM(${keywordRankings.searchVolume})`,
    })
    .from(keywordRankings)
    .groupBy(keywordRankings.cluster)
    .all();
  res.json(result);
});

// Keywords by search intent
app.get("/api/keywords/by-intent", async (_req, res) => {
  const result = db
    .select({
      intent: keywordRankings.intent,
      count: sql<number>`COUNT(*)`,
      avgPosition: sql<number>`ROUND(AVG(${keywordRankings.position}), 1)`,
      totalVolume: sql<number>`SUM(${keywordRankings.searchVolume})`,
    })
    .from(keywordRankings)
    .groupBy(keywordRankings.intent)
    .all();
  res.json(result);
});

// Reddit threads (Session 3+)
app.get("/api/reddit", async (_req, res) => {
  const result = db.select().from(redditThreads).all();
  res.json(result);
});

// Reddit threads by sentiment (Session 3)
app.get("/api/reddit/by-sentiment", async (_req, res) => {
  const result = db
    .select({
      sentiment: redditThreads.sentiment,
      count: sql<number>`COUNT(*)`,
      avgScore: sql<number>`ROUND(AVG(${redditThreads.score}), 1)`,
    })
    .from(redditThreads)
    .groupBy(redditThreads.sentiment)
    .all();
  res.json(result);
});

// Reddit threads by subreddit (Session 3)
app.get("/api/reddit/by-subreddit", async (_req, res) => {
  const result = db
    .select({
      subreddit: redditThreads.subreddit,
      count: sql<number>`COUNT(*)`,
      avgScore: sql<number>`ROUND(AVG(${redditThreads.score}), 1)`,
      avgComments: sql<number>`ROUND(AVG(${redditThreads.commentCount}), 1)`,
    })
    .from(redditThreads)
    .groupBy(redditThreads.subreddit)
    .all();
  res.json(result);
});

// Reddit top threads by engagement
app.get("/api/reddit/top", async (_req, res) => {
  const result = db
    .select({
      subreddit: redditThreads.subreddit,
      title: redditThreads.title,
      score: redditThreads.score,
      commentCount: redditThreads.commentCount,
      sentiment: redditThreads.sentiment,
      relevantBrands: redditThreads.relevantBrands,
    })
    .from(redditThreads)
    .orderBy(desc(redditThreads.score))
    .limit(10)
    .all();
  res.json(result);
});

// Reports — list available reports
const reportsDir = resolve(import.meta.dirname, "../../reports");

app.get("/api/reports", async (_req, res) => {
  if (!existsSync(reportsDir)) return res.json([]);
  const files = readdirSync(reportsDir).filter(f => f.endsWith(".md"));
  res.json(files.map(f => ({ filename: f, name: f.replace(/\.md$/, "").replace(/-/g, " ") })));
});

// Reports — get parsed report content
app.get("/api/reports/:filename", async (req, res) => {
  const filePath = resolve(reportsDir, req.params.filename);
  if (!existsSync(filePath) || !filePath.startsWith(reportsDir)) {
    return res.status(404).json({ error: "Report not found" });
  }
  const content = readFileSync(filePath, "utf-8");

  // Parse markdown into sections
  const sections: { heading: string; level: number; content: string }[] = [];
  const lines = content.split("\n");
  let current: { heading: string; level: number; lines: string[] } | null = null;

  for (const line of lines) {
    const headingMatch = line.match(/^(#{1,3})\s+(.+)/);
    if (headingMatch) {
      if (current) sections.push({ heading: current.heading, level: current.level, content: current.lines.join("\n").trim() });
      current = { heading: headingMatch[2], level: headingMatch[1].length, lines: [] };
    } else if (current) {
      current.lines.push(line);
    }
  }
  if (current) sections.push({ heading: current.heading, level: current.level, content: current.lines.join("\n").trim() });

  res.json({ filename: req.params.filename, sections });
});

// Page performance (Session 4+)
app.get("/api/pages", async (_req, res) => {
  const result = db.select().from(pagePerformance).all();
  res.json(result);
});

// Latest page audit per URL
app.get("/api/pages/latest", async (_req, res) => {
  const result = db
    .select()
    .from(pagePerformance)
    .orderBy(desc(pagePerformance.auditedAt))
    .limit(1)
    .all();
  res.json(result[0] ?? null);
});

// Core Web Vitals with pass/fail status
app.get("/api/pages/vitals", async (_req, res) => {
  const result = db
    .select({
      url: pagePerformance.url,
      performanceScore: pagePerformance.performanceScore,
      lcp: pagePerformance.lcp,
      cls: pagePerformance.cls,
      fcp: pagePerformance.fcp,
      inp: pagePerformance.inp,
      ttfb: pagePerformance.ttfb,
      lcpStatus: sql<string>`CASE WHEN ${pagePerformance.lcp} < 2500 THEN 'GOOD' WHEN ${pagePerformance.lcp} < 4000 THEN 'NEEDS IMPROVEMENT' ELSE 'POOR' END`,
      clsStatus: sql<string>`CASE WHEN ${pagePerformance.cls} < 0.1 THEN 'GOOD' WHEN ${pagePerformance.cls} < 0.25 THEN 'NEEDS IMPROVEMENT' ELSE 'POOR' END`,
      fcpStatus: sql<string>`CASE WHEN ${pagePerformance.fcp} < 1800 THEN 'GOOD' WHEN ${pagePerformance.fcp} < 3000 THEN 'NEEDS IMPROVEMENT' ELSE 'POOR' END`,
      auditedAt: pagePerformance.auditedAt,
    })
    .from(pagePerformance)
    .orderBy(desc(pagePerformance.auditedAt))
    .limit(1)
    .all();
  res.json(result[0] ?? null);
});

// Clarity behavioral metrics
app.get("/api/pages/clarity", async (_req, res) => {
  const result = db
    .select({
      url: pagePerformance.url,
      scrollDepth: pagePerformance.scrollDepth,
      engagementTime: pagePerformance.engagementTime,
      rageClicks: pagePerformance.rageClicks,
      deadClicks: pagePerformance.deadClicks,
      quickBacks: pagePerformance.quickBacks,
      clarityMetrics: pagePerformance.clarityMetrics,
      auditedAt: pagePerformance.auditedAt,
    })
    .from(pagePerformance)
    .orderBy(desc(pagePerformance.auditedAt))
    .limit(1)
    .all();
  res.json(result[0] ?? null);
});

// Top 10 quick wins from latest audit
app.get("/api/pages/quick-wins", async (_req, res) => {
  const result = db
    .select({
      url: pagePerformance.url,
      quickWins: pagePerformance.quickWins,
      recommendations: pagePerformance.recommendations,
      auditedAt: pagePerformance.auditedAt,
    })
    .from(pagePerformance)
    .orderBy(desc(pagePerformance.auditedAt))
    .limit(1)
    .all();

  if (result.length === 0) return res.json(null);

  const row = result[0];
  res.json({
    url: row.url,
    quickWins: row.quickWins ? JSON.parse(row.quickWins) : [],
    recommendations: row.recommendations ? JSON.parse(row.recommendations) : [],
    auditedAt: row.auditedAt,
  });
});

// Clarity UX events — element-level friction data
app.get("/api/pages/events", async (req, res) => {
  const eventType = req.query.type as string | undefined;
  const severity = req.query.severity as string | undefined;
  const status = req.query.status as string | undefined;

  const conditions = [];
  if (eventType) conditions.push(eq(clarityEvents.eventType, eventType));
  if (severity) conditions.push(eq(clarityEvents.severity, severity));
  if (status) conditions.push(eq(clarityEvents.status, status));

  let query = db.select().from(clarityEvents).orderBy(desc(clarityEvents.count)).$dynamic();
  if (conditions.length > 0) {
    query = query.where(and(...conditions));
  }

  const result = query.all();
  res.json(result);
});

// Clarity UX events summary — counts by type and severity
app.get("/api/pages/events/summary", async (_req, res) => {
  const result = db
    .select({
      eventType: clarityEvents.eventType,
      severity: clarityEvents.severity,
      count: sql<number>`COUNT(*)`,
      totalOccurrences: sql<number>`SUM(${clarityEvents.count})`,
    })
    .from(clarityEvents)
    .groupBy(clarityEvents.eventType, clarityEvents.severity)
    .all();
  res.json(result);
});

// Clarity traffic sources — per-source engagement metrics
app.get("/api/pages/sources", async (_req, res) => {
  const result = db
    .select()
    .from(claritySources)
    .orderBy(desc(claritySources.sessions))
    .all();
  res.json(result);
});

// Meta ads (Session 5+)
app.get("/api/ads", async (_req, res) => {
  const result = db.select().from(metaAds).all();
  res.json(result);
});

app.listen(PORT, () => {
  console.log(`API server running at http://localhost:${PORT}`);
});
