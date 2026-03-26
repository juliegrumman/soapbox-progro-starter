import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

// Session 1: Competitive Reviews
// Columns match the normalized CSV schema from scrape_okendo.py exactly
export const competitiveReviews = sqliteTable("competitive_reviews", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  competitor: text("competitor").notNull(),
  product: text("product").notNull(),
  sourcePlatform: text("source_platform").notNull(),
  reviewId: text("review_id").unique(),
  date: text("date"),
  rating: integer("rating"),
  title: text("title"),
  body: text("body"),
  reviewerName: text("reviewer_name"),
  isVerified: integer("is_verified", { mode: "boolean" }),
  isRecommended: integer("is_recommended", { mode: "boolean" }),
  helpfulCount: integer("helpful_count").default(0),
  reviewerAttributes: text("reviewer_attributes"), // JSON string
  // Analysis enrichment (populated by intelligence skill)
  sentimentScore: real("sentiment_score"),
  themes: text("themes"), // JSON array of detected themes
  scrapedAt: text("scraped_at"),
});

// Session 2: SEO Keyword Rankings
export const keywordRankings = sqliteTable("keyword_rankings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  keyword: text("keyword").notNull(),
  position: integer("position"),
  searchVolume: integer("search_volume"),
  url: text("url"),
  intent: text("intent"),
  cluster: text("cluster"),
  checkedAt: text("checked_at"),
});

// Session 3: Reddit Social Monitoring
export const redditThreads = sqliteTable("reddit_threads", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  subreddit: text("subreddit").notNull(),
  threadId: text("thread_id").unique(),
  title: text("title"),
  body: text("body"),
  author: text("author"),
  score: integer("score"),
  commentCount: integer("comment_count"),
  sentiment: text("sentiment"),
  relevantBrands: text("relevant_brands"), // JSON array
  foundAt: text("found_at"),
});

// Session 4: Product Page Performance
export const pagePerformance = sqliteTable("page_performance", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  url: text("url").notNull(),
  performanceScore: real("performance_score"),
  lcp: real("lcp"),
  cls: real("cls"),
  seoScore: real("seo_score"),
  messagingAlignmentScore: real("messaging_alignment_score"),
  recommendations: text("recommendations"), // JSON array
  auditedAt: text("audited_at"),
});

// Session 5: Meta Ads Performance
export const metaAds = sqliteTable("meta_ads", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  campaignId: text("campaign_id"),
  campaignName: text("campaign_name"),
  adSetName: text("ad_set_name"),
  spend: real("spend"),
  impressions: integer("impressions"),
  clicks: integer("clicks"),
  conversions: integer("conversions"),
  roas: real("roas"),
  ctr: real("ctr"),
  cpc: real("cpc"),
  pulledAt: text("pulled_at"),
});
