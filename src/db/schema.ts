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
  // Core Web Vitals (from PageSpeed Insights)
  performanceScore: real("performance_score"),
  seoScore: real("seo_score"),
  accessibilityScore: real("accessibility_score"),
  bestPracticesScore: real("best_practices_score"),
  lcp: real("lcp"), // Largest Contentful Paint (ms)
  cls: real("cls"), // Cumulative Layout Shift
  fcp: real("fcp"), // First Contentful Paint (ms)
  inp: real("inp"), // Interaction to Next Paint (ms)
  ttfb: real("ttfb"), // Time to First Byte (ms)
  // Messaging alignment (from page scrape + Sessions 1-3 cross-reference)
  messagingAlignmentScore: real("messaging_alignment_score"),
  keywordsFound: text("keywords_found"), // JSON array
  keywordsMissing: text("keywords_missing"), // JSON array
  messagingGaps: text("messaging_gaps"), // JSON array
  // Microsoft Clarity UX metrics
  scrollDepth: real("scroll_depth"), // Avg scroll depth %
  engagementTime: real("engagement_time"), // Avg engagement (seconds)
  rageClicks: integer("rage_clicks"),
  deadClicks: integer("dead_clicks"),
  quickBacks: integer("quick_backs"),
  clarityMetrics: text("clarity_metrics"), // JSON overflow for additional data
  // Synthesis
  recommendations: text("recommendations"), // JSON array
  quickWins: text("quick_wins"), // JSON array (top 10)
  auditedAt: text("audited_at"),
});

// Session 4: Clarity UX Events (element-level friction data)
export const clarityEvents = sqliteTable("clarity_events", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  url: text("url").notNull(),
  eventType: text("event_type").notNull(), // "rage_click", "dead_click", "quick_back"
  selector: text("selector"), // CSS selector of the element
  count: integer("count"), // how many times this event occurred
  context: text("context"), // what it likely means
  severity: text("severity"), // "high", "medium", "low"
  suggestedFix: text("suggested_fix"), // agent-generated recommendation
  status: text("status").default("open"), // "open", "fixed", "wont_fix"
  auditedAt: text("audited_at"),
});

// Session 4: Clarity Traffic Sources (per-source behavioral metrics)
export const claritySources = sqliteTable("clarity_sources", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  url: text("url").notNull(),
  source: text("source").notNull(), // "Meta Ads", "Google Organic", "TikTok", "Direct"
  sessions: integer("sessions"),
  scrollDepth: real("scroll_depth"),
  engagementTime: real("engagement_time"),
  bounceRate: real("bounce_rate"),
  auditedAt: text("audited_at"),
});

// Session 5: Meta Ads Performance
export const metaAds = sqliteTable("meta_ads", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  // Identifiers
  campaignId: text("campaign_id"),
  campaignName: text("campaign_name"),
  adSetId: text("ad_set_id"),
  adSetName: text("ad_set_name"),
  adId: text("ad_id"),
  adName: text("ad_name"),
  // Campaign metadata
  campaignObjective: text("campaign_objective"),
  campaignStatus: text("campaign_status"), // effective_status from Meta
  // Core metrics
  spend: real("spend"),
  impressions: integer("impressions"),
  clicks: integer("clicks"),
  reach: integer("reach"),
  frequency: real("frequency"),
  uniqueClicks: integer("unique_clicks"),
  ctr: real("ctr"),
  cpc: real("cpc"),
  cpm: real("cpm"),
  // Conversion metrics
  conversions: integer("conversions"),
  conversionValue: real("conversion_value"),
  purchaseConversions: integer("purchase_conversions"),
  costPerResult: real("cost_per_result"),
  roas: real("roas"),
  // Creative content
  headline: text("headline"),
  bodyText: text("body_text"),
  callToAction: text("call_to_action"),
  imageUrl: text("image_url"),
  linkUrl: text("link_url"),
  // Timestamp
  pulledAt: text("pulled_at"),
});
