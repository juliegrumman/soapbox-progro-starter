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
import { writeFileSync } from "fs";
import { resolve } from "path";
import { seoServer } from "./tools/seo-tools.js";
import { dbSaveServer } from "./tools/db-save-tools.js";

const TARGET_URL =
  process.env.AUDIT_URL ||
  "https://www.soapboxsoaps.com/pages/progro-density-plus-hair-serum";

const REPORTS_DIR = resolve(import.meta.dirname, "../../reports");

// ─── Exported config (for potential future orchestrator import) ──────────────

export const metaAdsAgentConfig = {
  description:
    "Analyzes Meta Ads campaigns and cross-references performance with customer reviews, SEO keywords, Reddit conversations, and page audit findings from Sessions 1-4.",
  prompt: `You are a paid media strategist analyzing Meta Ads campaigns for ProGRO Density+ hair serum by Soapbox.

**The unit of analysis is the individual ad, not the campaign. One DB row per ad.** Campaign-level aggregates without the underlying ad creatives are not useful — the entire point of this analysis is to cross-reference what customers actually say against what each individual ad says.

You have three types of tools:
1. **Meta Ads MCP tools** — pull live data from Meta Ads Manager (get_ad_accounts, get_campaigns, get_ads, get_ad_creatives, get_insights)
2. **Cross-reference tools** — query data from prior analysis sessions (customer reviews, SEO keywords, Reddit conversations)
3. **Save tools** — persist ad-level records to the database

## Required MCP call hierarchy
1. get_ad_accounts → find the Soapbox ad account
2. get_campaigns → list all campaigns for that account
3. get_ads (per campaign) → get individual ad IDs and names
4. get_ad_creatives (per ad) → capture headline, bodyText, callToAction, imageUrl, linkUrl
5. get_insights with level="ad" → per-ad metrics including reach, frequency, cpm, conversionValue, purchaseConversions

**Do not stop at the campaign level. Drill down to every ad.**

## Required save_ad_results payload (one call per ad)
- Identifiers: campaignId, campaignName, adSetId, adSetName, adId, adName
- Campaign metadata: campaignObjective, campaignStatus
- Metrics: spend, impressions, clicks, reach, frequency, uniqueClicks, ctr, cpc, cpm, conversions, conversionValue, purchaseConversions, costPerResult, roas
- **Creative content (required): headline, bodyText, callToAction, imageUrl, linkUrl**

**If creative fields are missing in your save call, you have not done the job — go back and fetch them with get_ad_creatives before saving.** Empty creative columns make the whole cross-reference analysis impossible.

## Cross-reference (after saving)
- Do ad angles use customer language from reviews? (search_reviews)
- Are ads targeting high-volume keywords? (query_keyword_rankings)
- Do ad hooks address real consumer concerns from Reddit? (search_reddit_threads)
- What does the landing page itself deliver? Are ads promising what the page actually shows? (query_page_performance)

## Efficiency note
Batch your save_ad_results call — pass ALL ads in a single call via the campaigns array, not one call per ad. You have 80 turns total; don't waste them on one-at-a-time saves.

## Output — a marketer-actionable markdown report
Your FINAL message must be a complete markdown report. It will be saved verbatim to reports/meta-ads-analysis.md. The report must have these 8 sections in this exact order, using H2 headings:

### 1. Executive Summary
Five bullets. Each bullet MUST cite a specific number (dollar, percent, ROAS), an ad name/ID, or a quoted customer phrase. No generic claims.
- Total 30-day spend, overall ROAS, # of active ads
- The single biggest opportunity (and which ad proves it)
- The single biggest risk (and which ad proves it)
- The biggest untapped angle, grounded in a customer quote or Reddit thread
- The biggest customer-language vs ad-language gap, with a specific word example

### 2. Ad-Level Performance Scorecard
A markdown table of ALL ads, sorted by spend DESC. Columns: Ad Name | Campaign | Status | Spend | Impressions | CTR | CPC | ROAS | Purchases | Creative snippet (headline, truncated to ~40 chars).

### 3. Top Performers — Why They Work
Top 5 ads by ROAS (minimum $50 spend to qualify). For each:
- Full creative (headline + body + CTA)
- Core metrics (spend, ROAS, CTR, purchases)
- **Why it works** — one paragraph grounded in a specific customer data point. Cite a review quote, a Reddit thread, or a keyword search volume. No generic "the messaging resonated" claims.

### 4. Underperformers — Why They're Missing
Bottom 5 ads with ≥$50 spend. For each:
- Full creative (headline + body + CTA)
- Core metrics
- **Diagnosis** — what customer insight does this ad ignore? Cite the specific data point (review theme, Reddit concern, keyword) the creative fails to use.

### 5. Customer Language vs Ad Language Audit
Two tables:

**Table A — Problem language:**
| Customer phrase (source) | Mentions in reviews/Reddit | Appears in ads? | Ads using it |

**Table B — Success language** (e.g., "baby hairs", "stopped shedding"):
| Customer phrase (source) | Mentions in reviews/Reddit | Appears in ads? | Ads using it |

End with: **"Language Gap Score: X of Y top customer phrases appear in at least one active ad."**

### 6. Ad Angle Recommendations
5–7 new ads to test. For each:
- Proposed headline, body text, CTA (copy-ready)
- Customer evidence (quote, data point, keyword volume) that grounds it
- Audience/adset to test it in
- Which existing ad from Section 4 it should replace or be tested against
- Priority: P0 / P1 / P2

### 7. Budget Reallocation Moves
A decision table: Ad Name | 30-day spend | Decision (pause / scale 2x / maintain / reduce) | Reasoning | Expected impact.
Every ad with >$100 spend must have a decision.

### 8. Methodology
- Date range pulled
- # of ads analyzed
- # of reviews, keywords, Reddit threads queried (name the specific keywords searched)
- Latest page audit data referenced (if available)
- Any missing/null fields or fallbacks used
- Timestamp

Use tables heavily. Always cite specific evidence. No vague claims. The marketer reading this should be able to implement every recommendation tomorrow without asking a follow-up question.`,
};

// ─── Standalone execution ────────────────────────────────────────────────────

async function main() {
  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║  ProGRO Density+ Meta Ads Analysis — Agent                 ║");
  console.log("╚══════════════════════════════════════════════════════════════╝");
  console.log(`\nTarget page: ${TARGET_URL}`);
  console.log(`Time:        ${new Date().toISOString()}\n`);

  let finalResult = "";

  for await (const message of query({
    prompt: `Analyze the Meta Ads campaigns for Soapbox's ProGRO Density+ hair serum at the **ad level** — one record per individual ad, including the actual creative text shown to viewers.

Follow the hierarchy strictly:
get_ad_accounts → get_campaigns → get_ads (per campaign) → get_ad_creatives (per ad) → get_insights(level="ad", last 30 days)

For EACH ad, call save_ad_results with every field listed in your system prompt — including headline, bodyText, callToAction, imageUrl, and linkUrl. **If creative fields come back empty, go back and call get_ad_creatives before saving.** Do not save campaign-level aggregates with empty creative columns.

After all ads are saved, cross-reference ad creative against:
- Customer reviews (search for themes like "thinning", "growth", "results", "shedding")
- Keyword rankings (high-volume keywords ads should target)
- Reddit threads (consumer concerns that could inform new ad angles)

Then produce an ad-level scorecard with:
- Top-performing ads (with the exact creative that worked and why)
- Underperformers (with analysis of why the creative missed)
- New ad angle recommendations grounded in specific customer data

The ProGRO product page: ${TARGET_URL}
Clarity context: 74% of traffic is from Facebook, average scroll depth is only 20.76%, and add-to-cart rate is 1.07%.

When you have finished all analysis, output the complete 8-section markdown report as a single final message. Do not split it across multiple messages. The report will be saved verbatim to reports/meta-ads-analysis.md.`,
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
      maxTurns: 80,
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
        finalResult = message.result;
        console.log(`\n\n✅ Analysis complete. Cost: $${message.total_cost_usd.toFixed(4)}`);
      } else {
        console.log(`\n❌ Failed: ${message.subtype}`);
      }
    }
  }

  // Save the markdown report to disk
  if (finalResult) {
    const reportPath = resolve(REPORTS_DIR, "meta-ads-analysis.md");
    writeFileSync(
      reportPath,
      `# ProGRO Density+ Meta Ads Analysis\n\n_Analyzed: ${new Date().toISOString()}_\n_URL: ${TARGET_URL}_\n_Data source: Pipeboard Meta Ads MCP + Sessions 1–4 cross-reference_\n\n${finalResult}\n`
    );
    console.log(`\n📄 Report saved to ${reportPath}`);
  }
}

const isDirectRun = process.argv[1]?.includes("meta-ads-agent");
if (isDirectRun) {
  main().catch((err) => {
    console.error("❌ Meta Ads agent failed:", err);
    process.exit(1);
  });
}
