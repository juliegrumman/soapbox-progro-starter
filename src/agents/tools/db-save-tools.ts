/**
 * Database save tools for the Agent SDK.
 * Lets the orchestrator's synthesis agent persist audit results
 * with Zod-validated typed arguments instead of fragile JSON regex parsing.
 */

import { tool, createSdkMcpServer } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";
import { insertPageAudit, insertEventBatch, insertSourceBatch } from "../../tools/pages.js";
import { insertAdBatch } from "../../tools/ads.js";

const saveAuditResults = tool(
  "save_audit_results",
  "Save a complete page audit to the database. Persists scores, Core Web Vitals, messaging alignment, Clarity events, and traffic sources.",
  {
    url: z.string().describe("The audited page URL"),
    performanceScore: z.number().optional(),
    seoScore: z.number().optional(),
    accessibilityScore: z.number().optional(),
    bestPracticesScore: z.number().optional(),
    lcp: z.number().optional().describe("Largest Contentful Paint (ms)"),
    cls: z.number().optional().describe("Cumulative Layout Shift"),
    fcp: z.number().optional().describe("First Contentful Paint (ms)"),
    inp: z.number().optional().describe("Interaction to Next Paint (ms)"),
    ttfb: z.number().optional().describe("Time to First Byte (ms)"),
    messagingAlignmentScore: z.number().optional(),
    keywordsFound: z.array(z.string()).optional(),
    keywordsMissing: z.array(z.string()).optional(),
    messagingGaps: z.array(z.string()).optional(),
    scrollDepth: z.number().optional(),
    engagementTime: z.number().optional(),
    rageClicks: z.number().optional(),
    deadClicks: z.number().optional(),
    quickBacks: z.number().optional(),
    recommendations: z.array(z.string()).optional(),
    quickWins: z.array(z.string()).optional(),
    events: z
      .array(
        z.object({
          eventType: z.string(),
          selector: z.string(),
          count: z.number(),
          context: z.string(),
          severity: z.string(),
          suggestedFix: z.string(),
        })
      )
      .optional()
      .describe("Element-level UX friction events (rage clicks, dead clicks)"),
    trafficSources: z
      .array(
        z.object({
          source: z.string(),
          sessions: z.number(),
          scrollDepth: z.number().optional(),
          engagementTime: z.number().optional(),
        })
      )
      .optional()
      .describe("Per-traffic-source behavioral metrics"),
  },
  async (args) => {
    // Save main audit record
    await insertPageAudit({
      url: args.url,
      performanceScore: args.performanceScore,
      seoScore: args.seoScore,
      accessibilityScore: args.accessibilityScore,
      bestPracticesScore: args.bestPracticesScore,
      lcp: args.lcp,
      cls: args.cls,
      fcp: args.fcp,
      inp: args.inp,
      ttfb: args.ttfb,
      messagingAlignmentScore: args.messagingAlignmentScore,
      keywordsFound: args.keywordsFound ? JSON.stringify(args.keywordsFound) : undefined,
      keywordsMissing: args.keywordsMissing ? JSON.stringify(args.keywordsMissing) : undefined,
      messagingGaps: args.messagingGaps ? JSON.stringify(args.messagingGaps) : undefined,
      scrollDepth: args.scrollDepth,
      engagementTime: args.engagementTime,
      rageClicks: args.rageClicks,
      deadClicks: args.deadClicks,
      quickBacks: args.quickBacks,
      recommendations: args.recommendations ? JSON.stringify(args.recommendations) : undefined,
      quickWins: args.quickWins ? JSON.stringify(args.quickWins) : undefined,
    });

    let eventCount = 0;
    if (args.events && args.events.length > 0) {
      await insertEventBatch(args.events.map((e) => ({ url: args.url, ...e })));
      eventCount = args.events.length;
    }

    let sourceCount = 0;
    if (args.trafficSources && args.trafficSources.length > 0) {
      await insertSourceBatch(args.trafficSources.map((s) => ({ url: args.url, ...s })));
      sourceCount = args.trafficSources.length;
    }

    const summary = `Saved: 1 audit record, ${eventCount} UX events, ${sourceCount} traffic sources`;
    console.log(`   💾 ${summary}`);
    return { content: [{ type: "text" as const, text: summary }] };
  }
);

const saveAdResults = tool(
  "save_ad_results",
  "Save Meta Ads campaign performance data to the database.",
  {
    campaigns: z.array(
      z.object({
        campaignId: z.string().optional(),
        campaignName: z.string().optional(),
        adSetName: z.string().optional(),
        spend: z.number().optional(),
        impressions: z.number().optional(),
        clicks: z.number().optional(),
        conversions: z.number().optional(),
        roas: z.number().optional(),
        ctr: z.number().optional(),
        cpc: z.number().optional(),
      })
    ),
  },
  async (args) => {
    await insertAdBatch(args.campaigns);
    const summary = `Saved ${args.campaigns.length} campaign records to meta_ads table`;
    console.log(`   💾 ${summary}`);
    return { content: [{ type: "text" as const, text: summary }] };
  }
);

export const dbSaveServer = createSdkMcpServer({
  name: "db",
  version: "1.0.0",
  tools: [saveAuditResults, saveAdResults],
});
