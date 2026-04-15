/**
 * Conversion/UX Agent — standalone
 *
 * Analyzes user behavior data from Microsoft Clarity.
 * Uses the Claude Agent SDK — the SDK manages the agentic loop automatically.
 *
 * Run standalone:  npm run agent:cro
 * Or imported by the orchestrator for coordinated execution.
 */

import "dotenv/config";
import { query } from "@anthropic-ai/claude-agent-sdk";
import { clarityServer } from "./tools/clarity-tools.js";

const TARGET_URL =
  process.env.AUDIT_URL ||
  "https://www.soapboxsoaps.com/pages/progro-density-plus-hair-serum";

// ─── Exported config (for orchestrator import) ──────────────────────────────

export const croAgentConfig = {
  description:
    "Analyzes real user behavior data from Microsoft Clarity to identify UX friction points, engagement patterns, and conversion barriers.",
  prompt: `You are a conversion rate optimization specialist for an ecommerce product page (hair density serum).

Your job is to analyze real user behavior data from Microsoft Clarity to identify:
- UX friction points (rage clicks, dead clicks) at the ELEMENT level
- Engagement patterns (scroll depth, time on page)
- Conversion barriers (quick-backs, low engagement sections)
- Traffic source quality (which sources have worst engagement)

Interpret the data for actionable conversion insights:
- If scroll depth < 50%, key content below the fold isn't being seen
- If rage clicks are high on specific elements, those elements have misleading affordances
- If dead clicks are high, users expect interactivity that isn't there
- If quick-backs are high, the page may not match search intent or ad promise
- If a traffic source has much lower scroll depth, the ad/link is setting wrong expectations

Return your findings as a structured JSON object with:
1. "metrics" — raw aggregate numbers
2. "events" — array of element-level friction events with eventType, selector, count, context, severity, suggestedFix
3. "trafficSources" — array of per-source metrics with source, sessions, scrollDepth, engagementTime
4. "topRecommendations" — 5 most impactful conversion improvements
5. "summary" — 2-3 sentence overview of UX health`,
};

export { clarityServer };

// ─── Standalone execution ────────────────────────────────────────────────────

async function main() {
  console.log(`\n📊 Conversion/UX Agent — standalone`);
  console.log(`Target: ${TARGET_URL}\n`);

  for await (const message of query({
    prompt: `Analyze user behavior on this product page: ${TARGET_URL}

Query the Clarity dashboard for all available metrics. Interpret the data from a conversion optimization perspective.

IMPORTANT: Return element-level data for every rage click and dead click event. Each event must include the CSS selector, occurrence count, meaning, severity rating, and a specific fix recommendation.

Also return per-traffic-source metrics so we can identify which sources have the worst engagement.

Return your complete analysis as a JSON object.`,
    options: {
      mcpServers: { clarity: clarityServer },
      allowedTools: ["mcp__clarity__query_clarity_dashboard"],
      tools: [],
      permissionMode: "bypassPermissions",
      systemPrompt: croAgentConfig.prompt,
      model: "claude-sonnet-4-6",
      maxTurns: 10,
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

const isDirectRun = process.argv[1]?.includes("cro-ux-agent");
if (isDirectRun) {
  main().catch((err) => {
    console.error("❌ CRO agent failed:", err);
    process.exit(1);
  });
}
