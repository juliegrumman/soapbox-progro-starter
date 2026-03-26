/**
 * Express API server — serves JSON from SQLite to the dashboard.
 * Minimal footprint; expanded in Session 5.
 */

import express from "express";
import { db } from "../db/index.js";
import { competitiveReviews, keywordRankings, redditThreads, pagePerformance, metaAds } from "../db/schema.js";
import { sql } from "drizzle-orm";

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

// Keywords summary (Session 2+)
app.get("/api/keywords", async (_req, res) => {
  const result = db.select().from(keywordRankings).all();
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

// Meta ads (Session 5+)
app.get("/api/ads", async (_req, res) => {
  const result = db.select().from(metaAds).all();
  res.json(result);
});

app.listen(PORT, () => {
  console.log(`API server running at http://localhost:${PORT}`);
});
