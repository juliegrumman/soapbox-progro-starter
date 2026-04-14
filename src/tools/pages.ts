/**
 * Tool functions for the page_performance table.
 * Used by the Page Audit Orchestrator (Session 4) to read and write audit data.
 */

import { db } from "../db/index.js";
import { pagePerformance } from "../db/schema.js";
import { eq, sql, desc, like } from "drizzle-orm";

/** Get all page audits, optionally filtered by URL */
export function getPageAudits(opts?: { url?: string; limit?: number }) {
  let query = db.select().from(pagePerformance).$dynamic();

  if (opts?.url) {
    query = query.where(eq(pagePerformance.url, opts.url));
  }

  query = query.orderBy(desc(pagePerformance.auditedAt));

  if (opts?.limit) {
    query = query.limit(opts.limit);
  }

  return query;
}

/** Get the most recent audit for a specific URL */
export function getLatestAudit(url: string) {
  return db
    .select()
    .from(pagePerformance)
    .where(eq(pagePerformance.url, url))
    .orderBy(desc(pagePerformance.auditedAt))
    .limit(1);
}

/** Get aggregate summary: latest scores per URL */
export function getAuditSummary() {
  return db
    .select({
      url: pagePerformance.url,
      audits: sql<number>`COUNT(*)`,
      latestPerformance: sql<number>`MAX(${pagePerformance.performanceScore})`,
      latestSeo: sql<number>`MAX(${pagePerformance.seoScore})`,
      latestMessaging: sql<number>`MAX(${pagePerformance.messagingAlignmentScore})`,
      latestScrollDepth: sql<number>`MAX(${pagePerformance.scrollDepth})`,
      latestRageClicks: sql<number>`MAX(${pagePerformance.rageClicks})`,
    })
    .from(pagePerformance)
    .groupBy(pagePerformance.url);
}

/** Get Core Web Vitals for a URL with pass/fail thresholds */
export function getCoreWebVitals(url: string) {
  return db
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
      inpStatus: sql<string>`CASE WHEN ${pagePerformance.inp} < 200 THEN 'GOOD' WHEN ${pagePerformance.inp} < 500 THEN 'NEEDS IMPROVEMENT' ELSE 'POOR' END`,
      ttfbStatus: sql<string>`CASE WHEN ${pagePerformance.ttfb} < 800 THEN 'GOOD' WHEN ${pagePerformance.ttfb} < 1800 THEN 'NEEDS IMPROVEMENT' ELSE 'POOR' END`,
      auditedAt: pagePerformance.auditedAt,
    })
    .from(pagePerformance)
    .where(eq(pagePerformance.url, url))
    .orderBy(desc(pagePerformance.auditedAt))
    .limit(1);
}

/** Get Clarity behavioral metrics for a URL */
export function getClarityMetrics(url: string) {
  return db
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
    .where(eq(pagePerformance.url, url))
    .orderBy(desc(pagePerformance.auditedAt))
    .limit(1);
}

/** Get messaging alignment data for a URL */
export function getMessagingAlignment(url: string) {
  return db
    .select({
      url: pagePerformance.url,
      messagingAlignmentScore: pagePerformance.messagingAlignmentScore,
      keywordsFound: pagePerformance.keywordsFound,
      keywordsMissing: pagePerformance.keywordsMissing,
      messagingGaps: pagePerformance.messagingGaps,
      auditedAt: pagePerformance.auditedAt,
    })
    .from(pagePerformance)
    .where(eq(pagePerformance.url, url))
    .orderBy(desc(pagePerformance.auditedAt))
    .limit(1);
}

/** Insert a complete page audit record */
export function insertPageAudit(audit: {
  url: string;
  performanceScore?: number;
  seoScore?: number;
  accessibilityScore?: number;
  bestPracticesScore?: number;
  lcp?: number;
  cls?: number;
  fcp?: number;
  inp?: number;
  ttfb?: number;
  messagingAlignmentScore?: number;
  keywordsFound?: string;
  keywordsMissing?: string;
  messagingGaps?: string;
  scrollDepth?: number;
  engagementTime?: number;
  rageClicks?: number;
  deadClicks?: number;
  quickBacks?: number;
  clarityMetrics?: string;
  recommendations?: string;
  quickWins?: string;
}) {
  return db.insert(pagePerformance).values({
    ...audit,
    auditedAt: new Date().toISOString(),
  });
}

/** Search recommendations JSON text for a keyword */
export function searchRecommendations(keyword: string) {
  const pattern = `%${keyword}%`;

  return db
    .select()
    .from(pagePerformance)
    .where(
      sql`(${pagePerformance.recommendations} LIKE ${pattern} OR ${pagePerformance.quickWins} LIKE ${pattern})`
    )
    .orderBy(desc(pagePerformance.auditedAt));
}
