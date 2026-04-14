/**
 * Express API server — serves JSON from SQLite to the dashboard.
 * Minimal footprint; expanded in Session 5.
 */

import express from "express";
import { db } from "../db/index.js";
import { competitiveReviews, keywordRankings, redditThreads, pagePerformance, metaAds } from "../db/schema.js";
import { sql, desc } from "drizzle-orm";

const app = express();
const PORT = process.env.PORT || 3001;

// CORS for local dashboard dev
app.use((_req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  next();
});

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

// Meta ads (Session 5+)
app.get("/api/ads", async (_req, res) => {
  const result = db.select().from(metaAds).all();
  res.json(result);
});

app.listen(PORT, () => {
  console.log(`API server running at http://localhost:${PORT}`);
});
