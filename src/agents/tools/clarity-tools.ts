/**
 * Microsoft Clarity custom tools for the Agent SDK.
 * Behavioral analytics: scroll depth, engagement, rage/dead clicks.
 */

import { tool, createSdkMcpServer } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

const DATA_DIR = resolve(import.meta.dirname, "../../../data/pages");

const queryClarityDashboard = tool(
  "query_clarity_dashboard",
  "Query Microsoft Clarity analytics data for the product page. Returns behavioral metrics: scroll depth, engagement time, rage clicks, dead clicks, quick-backs, and traffic source data.",
  {
    metric: z
      .enum(["all", "scroll_depth", "engagement", "rage_clicks", "dead_clicks", "quick_backs"])
      .default("all")
      .describe("Which metric to query"),
  },
  async (args) => {
    const token = process.env.CLARITY_API_TOKEN;
    const projectId = process.env.CLARITY_PROJECT_ID;

    if (!token || !projectId) {
      console.log("   📂 No Clarity credentials — using fallback data");
      const fallback = resolve(DATA_DIR, "seed-clarity-data.json");
      if (existsSync(fallback)) {
        return { content: [{ type: "text" as const, text: readFileSync(fallback, "utf-8") }] };
      }
      return { content: [{ type: "text" as const, text: '{"error":"No Clarity credentials and no fallback data"}' }], isError: true };
    }

    console.log(`   🌐 Querying Clarity API (metric: ${args.metric})...`);
    try {
      const resp = await fetch(
        `https://www.clarity.ms/export-data/api/v1/${projectId}/data?metric=${args.metric}`,
        { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }
      );
      if (!resp.ok) throw new Error(`Clarity API error: ${resp.status}`);
      const data = await resp.json();
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    } catch {
      console.log("   📂 Clarity API failed — using fallback data");
      const fallback = resolve(DATA_DIR, "seed-clarity-data.json");
      if (existsSync(fallback)) {
        return { content: [{ type: "text" as const, text: readFileSync(fallback, "utf-8") }] };
      }
      return { content: [{ type: "text" as const, text: '{"error":"Clarity API failed"}' }], isError: true };
    }
  },
  { annotations: { readOnlyHint: true, openWorldHint: true } }
);

export const clarityServer = createSdkMcpServer({
  name: "clarity",
  version: "1.0.0",
  tools: [queryClarityDashboard],
});
