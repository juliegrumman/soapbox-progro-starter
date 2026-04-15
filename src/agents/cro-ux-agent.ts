/**
 * Conversion/UX Agent — standalone
 *
 * Analyzes user behavior data from Microsoft Clarity to identify
 * UX friction points and conversion barriers.
 * Can run alone (npm run agent:cro) or be imported by the orchestrator.
 *
 * Usage:
 *   npx tsx src/agents/cro-ux-agent.ts
 *   AUDIT_URL=https://example.com npx tsx src/agents/cro-ux-agent.ts
 */

import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import { runSubAgent, type SubAgentConfig } from "./run-sub-agent.js";

const TARGET_URL =
  process.env.AUDIT_URL ||
  "https://www.soapboxsoaps.com/pages/progro-density-plus-hair-serum";

const DATA_DIR = resolve(import.meta.dirname, "../../data/pages");

// ─── Tool Handler ────────────────────────────────────────────────────────────

async function handleQueryClarity(input: Record<string, unknown>): Promise<string> {
  const token = process.env.CLARITY_API_TOKEN;
  const projectId = process.env.CLARITY_PROJECT_ID;

  if (!token || !projectId) {
    console.log("   📂 No Clarity credentials — using fallback data");
    const fallback = resolve(DATA_DIR, "seed-clarity-data.json");
    if (existsSync(fallback)) {
      return readFileSync(fallback, "utf-8");
    }
    return JSON.stringify({ error: "No Clarity credentials and no fallback data available" });
  }

  const metric = (input.metric as string) || "all";
  console.log(`   🌐 Querying Clarity API (metric: ${metric})...`);

  try {
    const resp = await fetch(
      `https://www.clarity.ms/export-data/api/v1/${projectId}/data?metric=${metric}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!resp.ok) {
      throw new Error(`Clarity API error: ${resp.status} ${resp.statusText}`);
    }

    const data = await resp.json();
    return JSON.stringify(data, null, 2);
  } catch (err) {
    console.log("   📂 Clarity API failed — using fallback data");
    const fallback = resolve(DATA_DIR, "seed-clarity-data.json");
    if (existsSync(fallback)) {
      return readFileSync(fallback, "utf-8");
    }
    return JSON.stringify({ error: err instanceof Error ? err.message : String(err) });
  }
}

// ─── Agent Config (exported for orchestrator) ────────────────────────────────

export function buildCroUxAgent(): SubAgentConfig {
  return {
    name: "Conversion/UX Agent",
    system: `You are a conversion rate optimization specialist for an ecommerce product page (hair density serum).

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
- Low engagement time + high scroll = scanning without reading
- If a traffic source has much lower scroll depth, the ad/link is setting wrong expectations

Return your findings as a structured JSON object with:
1. "metrics" — raw aggregate numbers (scroll depth, engagement time, total rage clicks, dead clicks, quick-backs)
2. "events" — array of element-level friction events, each with:
   - "eventType": "rage_click" | "dead_click"
   - "selector": CSS selector of the element (e.g. ".ingredient-card img")
   - "count": number of occurrences
   - "context": what this likely means for the user
   - "severity": "high" (100+ occurrences), "medium" (25-99), or "low" (under 25)
   - "suggestedFix": specific, actionable fix recommendation
3. "trafficSources" — array of per-source metrics, each with:
   - "source": traffic source name
   - "sessions": session count
   - "scrollDepth": average scroll depth for this source
   - "engagementTime": average engagement time for this source
4. "topRecommendations" — 5 most impactful conversion improvements
5. "summary" — 2-3 sentence overview of UX health`,
    tools: [
      {
        name: "query_clarity_dashboard",
        description: "Query Microsoft Clarity analytics data for the product page. Returns behavioral metrics: scroll depth, engagement time, rage clicks, dead clicks, quick-backs, and traffic data.",
        input_schema: {
          type: "object" as const,
          properties: {
            metric: {
              type: "string",
              enum: ["all", "scroll_depth", "engagement", "rage_clicks", "dead_clicks", "quick_backs"],
              description: "Which metric to query (default: all)",
            },
          },
        },
      },
    ],
    toolHandlers: {
      query_clarity_dashboard: handleQueryClarity,
    },
    task: `Analyze user behavior on this product page: ${TARGET_URL}

Query the Clarity dashboard for all available metrics. Interpret the data from a conversion optimization perspective.

IMPORTANT: Return element-level data for every rage click and dead click event. Each event must include the CSS selector of the element, the occurrence count, what the behavior means, a severity rating, and a specific fix recommendation.

Also return per-traffic-source metrics so we can identify which sources have the worst engagement.

Return your complete analysis as a JSON object.`,
  };
}

// ─── Standalone Main ─────────────────────────────────────────────────────────

async function main() {
  console.log(`\n📊 Conversion/UX Agent — standalone`);
  console.log(`Target: ${TARGET_URL}\n`);

  const client = new Anthropic();
  const result = await runSubAgent(client, buildCroUxAgent());
  console.log("\n── Result ──\n");
  console.log(result);
}

const isDirectRun = process.argv[1]?.includes("cro-ux-agent");
if (isDirectRun) {
  main().catch((err) => {
    console.error("❌ CRO agent failed:", err);
    process.exit(1);
  });
}
