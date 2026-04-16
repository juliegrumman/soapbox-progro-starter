/**
 * Meta Ads Analysis Agent — standalone
 *
 * Connects to the Pipeboard Meta Ads MCP (configured in the project's .mcp.json
 * via `claude mcp add meta-ads`), pulls campaign data, cross-references with
 * Sessions 1-4 intelligence, and generates ad angle recommendations.
 *
 * Uses the Claude Agent SDK with:
 *   - Pipeboard Meta Ads MCP (via settingSources)
 *   - SEO tools for cross-referencing Sessions 1-3 data
 *   - DB save tools for persisting campaign records
 *
 * Run standalone:  npm run agent:ads
 */

import "dotenv/config";
import { query } from "@anthropic-ai/claude-agent-sdk";
import { seoServer } from "./tools/seo-tools.js";
import { dbSaveServer } from "./tools/db-save-tools.js";

const TARGET_URL =
  process.env.AUDIT_URL ||
  "https://www.soapboxsoaps.com/pages/progro-density-plus-hair-serum";

// ─── Exported config (for potential future orchestrator import) ──────────────

export const metaAdsAgentConfig = {
  description:
    "Analyzes Meta Ads campaigns and cross-references performance with customer reviews, SEO keywords, Reddit conversations, and page audit findings from Sessions 1-4.",
  prompt: `You are a paid media strategist analyzing Meta Ads campaigns for ProGRO Density+ hair serum by Soapbox.

You have access to two types of tools:
1. **Meta Ads MCP tools** — pull live campaign data from Meta Ads Manager (get_ad_accounts, get_campaigns, get_insights, get_ads, get_ad_creatives)
2. **Cross-reference tools** — query data from prior analysis sessions (customer reviews, SEO keywords, Reddit conversations)
3. **Save tools** — persist campaign data to the database

Your job is to:
1. Pull campaign performance data from Meta Ads
2. For each campaign, pull ad-level data: use get_ads then get_ad_creatives for each ad to capture headline, body text, CTA, and image URL
3. Pull insights at the ad level (level="ad") to get per-ad metrics including reach, frequency, cpm, and conversion_value
4. Analyze performance: which campaigns and individual ads are performing well and which aren't
5. Cross-reference with Sessions 1-4 data:
   - Do ad angles use customer language from reviews? (search_reviews)
   - Are ads targeting high-volume keywords? (query_keyword_rankings)
   - Do ad hooks address real consumer concerns from Reddit? (search_reddit_threads)
6. Generate specific recommendations for new ad angles grounded in real customer data
7. Save ad-level data to the database using save_ad_results — include ad IDs, ad names, creative text (headline, bodyText, callToAction, imageUrl, linkUrl), campaign status/objective, reach, frequency, cpm, conversionValue, and purchaseConversions

Return your findings as a structured analysis with:
1. Campaign performance scorecard
2. Top performers with analysis of why they work
3. Underperformers with analysis of why they fail
4. Ad angle recommendations — each grounded in specific customer data (review quote, Reddit thread, or keyword volume)
5. Budget optimization suggestions`,
};

// ─── Standalone execution ────────────────────────────────────────────────────

async function main() {
  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║  ProGRO Density+ Meta Ads Analysis — Agent                 ║");
  console.log("╚══════════════════════════════════════════════════════════════╝");
  console.log(`\nTarget page: ${TARGET_URL}`);
  console.log(`Time:        ${new Date().toISOString()}\n`);

  for await (const message of query({
    prompt: `Analyze the Meta Ads campaigns for Soapbox's ProGRO Density+ hair serum.

Steps:
1. Use get_ad_accounts to find the Soapbox ad account
2. Use get_campaigns to list all campaigns for that account
3. Use get_ads for each campaign to get individual ad IDs and names
4. Use get_ad_creatives for each ad to capture headline, body text, CTA, and image URL
5. Use get_insights at the ad level (level="ad") for the last 30 days — capture reach, frequency, cpm, conversion_value, purchase_conversions
6. Search reviews for themes that appear in ad copy: "thinning", "growth", "results", "shedding"
7. Query keyword rankings to find high-volume keywords ads should target
8. Search Reddit threads for consumer concerns that could inform ad angles
9. Cross-reference ad creative text with customer language — are winning ads using customer language or marketing language?
10. Save ad-level data using save_ad_results — include all identifiers (campaignId, adSetId, adId, adName), creative content (headline, bodyText, callToAction, imageUrl, linkUrl), campaign metadata (campaignObjective, campaignStatus), and all metrics (spend, impressions, clicks, reach, frequency, uniqueClicks, ctr, cpc, cpm, conversions, conversionValue, purchaseConversions, costPerResult, roas)
11. Generate a comprehensive analysis with ad angle recommendations grounded in customer data

The ProGRO product page is: ${TARGET_URL}
Clarity data shows: 74% of traffic is from Facebook, average scroll depth is only 20.76%, and add-to-cart rate is 1.07%.`,
    options: {
      mcpServers: {
        seo: seoServer,
        db: dbSaveServer,
      },
      // Load project MCP settings (picks up the meta-ads MCP configured via claude mcp add)
      settingSources: ["project"],
      allowedTools: [
        "mcp__meta-ads__*",
        "mcp__seo__*",
        "mcp__db__save_ad_results",
      ],
      tools: [],
      permissionMode: "bypassPermissions",
      systemPrompt: metaAdsAgentConfig.prompt,
      model: "claude-sonnet-4-6",
      maxTurns: 25,
    },
  })) {
    if (message.type === "assistant") {
      for (const block of message.message.content) {
        if ("text" in block) process.stdout.write(block.text);
        if ("name" in block) console.log(`\n🔧 Using tool: ${block.name}`);
      }
    }
    if (message.type === "result") {
      if (message.subtype === "success") {
        console.log(`\n\n✅ Analysis complete. Cost: $${message.total_cost_usd.toFixed(4)}`);
      } else {
        console.log(`\n❌ Failed: ${message.subtype}`);
      }
    }
  }
}

const isDirectRun = process.argv[1]?.includes("meta-ads-agent");
if (isDirectRun) {
  main().catch((err) => {
    console.error("❌ Meta Ads agent failed:", err);
    process.exit(1);
  });
}
