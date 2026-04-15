/**
 * SEO + Messaging Alignment Agent — standalone
 *
 * Fetches page content and cross-references against Sessions 1-3 data.
 * Uses the Claude Agent SDK — the SDK manages the agentic loop automatically.
 *
 * Run standalone:  npm run agent:seo
 * Or imported by the orchestrator for coordinated execution.
 */

import "dotenv/config";
import { query } from "@anthropic-ai/claude-agent-sdk";
import { seoServer } from "./tools/seo-tools.js";

const TARGET_URL =
  process.env.AUDIT_URL ||
  "https://www.soapboxsoaps.com/pages/progro-density-plus-hair-serum";

// ─── Exported config (for orchestrator import) ──────────────────────────────

export const seoAgentConfig = {
  description:
    "Audits on-page SEO elements and cross-references page messaging against customer reviews, keyword rankings, and Reddit conversations from Sessions 1-3.",
  prompt: `You are an on-page SEO and messaging strategist for a hair density/growth serum product (ProGRO Density+ by Soapbox).

Your job is to:
1. Fetch and analyze the page's on-page SEO elements (title, meta description, headings, body copy)
2. Cross-reference the page content against real data from three sources:
   - Customer reviews (Session 1): what language do customers actually use?
   - Keyword rankings (Session 2): what high-volume keywords should appear on the page?
   - Reddit threads (Session 3): what concerns/questions do people have?
3. Calculate a messaging alignment score (0-100) based on keyword coverage, customer language usage, and objection addressing

Return your findings as a structured JSON object with:
1. "onPageElements" — title, meta desc, H1, key headings found
2. "keywordAnalysis" — keywords found on page, high-value keywords missing
3. "messagingGaps" — customer language/themes NOT reflected on the page
4. "alignmentScore" — 0-100 score with breakdown
5. "topRecommendations" — 5 most impactful SEO/messaging improvements`,
};

export { seoServer };

// ─── Standalone execution ────────────────────────────────────────────────────

async function main() {
  console.log(`\n🔍 SEO + Messaging Alignment Agent — standalone`);
  console.log(`Target: ${TARGET_URL}\n`);

  for await (const message of query({
    prompt: `Audit the messaging and SEO of this product page: ${TARGET_URL}

Steps:
1. Fetch the page content to see what's actually on the page
2. Query keyword_rankings to get the top keywords by search volume (get all keywords, no filter)
3. Search reviews for key themes: "thinning", "results", "growth"
4. Search Reddit threads for: "hair density", "hair growth serum"
5. Cross-reference: which keywords and customer language themes are present on the page? Which are missing?
6. Calculate a messaging alignment score (0-100)

Return your complete analysis as a JSON object.`,
    options: {
      mcpServers: { seo: seoServer },
      allowedTools: ["mcp__seo__*"],
      tools: [],
      permissionMode: "bypassPermissions",
      systemPrompt: seoAgentConfig.prompt,
      model: "claude-sonnet-4-6",
      maxTurns: 15,
    },
  })) {
    if (message.type === "assistant") {
      for (const block of message.message.content) {
        if ("text" in block) process.stdout.write(block.text);
      }
    }
    if (message.type === "result") {
      if (message.subtype === "success") {
        console.log(`\n\n✅ Complete. Cost: $${message.total_cost_usd.toFixed(4)}`);
      } else {
        console.log(`\n❌ Failed: ${message.subtype}`);
      }
    }
  }
}

const isDirectRun = process.argv[1]?.includes("seo-messaging-agent");
if (isDirectRun) {
  main().catch((err) => {
    console.error("❌ SEO agent failed:", err);
    process.exit(1);
  });
}
