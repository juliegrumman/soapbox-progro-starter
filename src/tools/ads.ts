/**
 * Tool functions for the meta_ads table.
 * Used by the Meta Ads Agent (Session 4/5) to read and write campaign data.
 */

import { db } from "../db/index.js";
import { metaAds } from "../db/schema.js";
import { eq, sql, desc, like, and } from "drizzle-orm";

/** Get all ad records, optionally filtered by campaign */
export function getAds(opts?: { campaignName?: string; limit?: number }) {
  let query = db.select().from(metaAds).orderBy(desc(metaAds.pulledAt)).$dynamic();

  if (opts?.campaignName) {
    query = query.where(like(metaAds.campaignName, `%${opts.campaignName}%`));
  }
  if (opts?.limit) {
    query = query.limit(opts.limit);
  }

  return query;
}

/** Get campaign-level performance summary */
export function getCampaignSummary() {
  return db
    .select({
      campaignName: metaAds.campaignName,
      adSets: sql<number>`COUNT(DISTINCT ${metaAds.adSetName})`,
      totalSpend: sql<number>`ROUND(SUM(${metaAds.spend}), 2)`,
      totalImpressions: sql<number>`SUM(${metaAds.impressions})`,
      totalClicks: sql<number>`SUM(${metaAds.clicks})`,
      totalConversions: sql<number>`SUM(${metaAds.conversions})`,
      avgRoas: sql<number>`ROUND(AVG(${metaAds.roas}), 2)`,
      avgCtr: sql<number>`ROUND(AVG(${metaAds.ctr}), 4)`,
      avgCpc: sql<number>`ROUND(AVG(${metaAds.cpc}), 2)`,
    })
    .from(metaAds)
    .groupBy(metaAds.campaignName);
}

/** Get top performers by ROAS */
export function getTopPerformers(limit = 10) {
  return db
    .select()
    .from(metaAds)
    .where(sql`${metaAds.roas} IS NOT NULL AND ${metaAds.roas} > 0`)
    .orderBy(desc(metaAds.roas))
    .limit(limit);
}

/** Get underperformers — ads with spend but low/no conversions */
export function getUnderperformers(minSpend = 10) {
  return db
    .select()
    .from(metaAds)
    .where(
      and(
        sql`${metaAds.spend} >= ${minSpend}`,
        sql`(${metaAds.conversions} IS NULL OR ${metaAds.conversions} = 0)`
      )
    )
    .orderBy(desc(metaAds.spend));
}

/** Insert a single ad record */
export function insertAd(ad: {
  campaignId?: string;
  campaignName?: string;
  adSetName?: string;
  spend?: number;
  impressions?: number;
  clicks?: number;
  conversions?: number;
  roas?: number;
  ctr?: number;
  cpc?: number;
}) {
  return db.insert(metaAds).values({
    ...ad,
    pulledAt: new Date().toISOString(),
  });
}

/** Bulk insert ad records */
export function insertAdBatch(
  ads: Array<{
    campaignId?: string;
    campaignName?: string;
    adSetName?: string;
    spend?: number;
    impressions?: number;
    clicks?: number;
    conversions?: number;
    roas?: number;
    ctr?: number;
    cpc?: number;
  }>
) {
  const rows = ads.map((a) => ({
    ...a,
    pulledAt: new Date().toISOString(),
  }));

  return db.insert(metaAds).values(rows);
}
