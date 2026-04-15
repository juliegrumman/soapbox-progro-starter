/**
 * PageSpeed Insights custom tools for the Agent SDK.
 * Defines the run_pagespeed_audit tool and exports the MCP server.
 */

import { tool, createSdkMcpServer } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

const DATA_DIR = resolve(import.meta.dirname, "../../../data/pages");

const runPagespeedAudit = tool(
  "run_pagespeed_audit",
  "Run a Google PageSpeed Insights audit on a URL. Returns Lighthouse scores, Core Web Vitals, and optimization opportunities for both mobile and desktop.",
  {
    url: z.string().describe("The URL to audit"),
    strategy: z.enum(["mobile", "desktop"]).default("mobile").describe("Device strategy"),
  },
  async (args) => {
    const apiKey = process.env.PAGESPEED_API_KEY;
    if (!apiKey) {
      console.log("   📂 No PAGESPEED_API_KEY — using fallback data");
      const fallback = resolve(DATA_DIR, "seed-pagespeed-results.json");
      if (existsSync(fallback)) {
        return { content: [{ type: "text" as const, text: readFileSync(fallback, "utf-8") }] };
      }
      return { content: [{ type: "text" as const, text: JSON.stringify({ error: "No API key and no fallback data" }) }] };
    }

    const params = new URLSearchParams({
      url: args.url,
      key: apiKey,
      strategy: args.strategy,
      category: "performance",
    });
    for (const cat of ["seo", "accessibility", "best-practices"]) {
      params.append("category", cat);
    }

    console.log(`   🌐 Calling PageSpeed API (${args.strategy})...`);
    const resp = await fetch(
      `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?${params}`
    );

    if (!resp.ok) {
      return {
        content: [{ type: "text" as const, text: JSON.stringify({ error: `PageSpeed API error: ${resp.status}` }) }],
        isError: true,
      };
    }

    const data = await resp.json();
    const lighthouse = data.lighthouseResult;

    const result = {
      url: args.url,
      strategy: args.strategy,
      scores: {
        performance: Math.round((lighthouse?.categories?.performance?.score ?? 0) * 100),
        seo: Math.round((lighthouse?.categories?.seo?.score ?? 0) * 100),
        accessibility: Math.round((lighthouse?.categories?.accessibility?.score ?? 0) * 100),
        bestPractices: Math.round((lighthouse?.categories?.["best-practices"]?.score ?? 0) * 100),
      },
      coreWebVitals: {
        lcp: lighthouse?.audits?.["largest-contentful-paint"]?.numericValue,
        cls: lighthouse?.audits?.["cumulative-layout-shift"]?.numericValue,
        fcp: lighthouse?.audits?.["first-contentful-paint"]?.numericValue,
        inp: lighthouse?.audits?.["interaction-to-next-paint"]?.numericValue,
        ttfb: lighthouse?.audits?.["server-response-time"]?.numericValue,
      },
      opportunities: Object.values(lighthouse?.audits ?? {})
        .filter((a: any) => a.score !== null && a.score < 1 && a.details?.overallSavingsMs > 0)
        .sort((a: any, b: any) => (b.details?.overallSavingsMs ?? 0) - (a.details?.overallSavingsMs ?? 0))
        .slice(0, 10)
        .map((a: any) => ({
          title: a.title,
          description: a.description,
          savingsMs: a.details?.overallSavingsMs,
        })),
      fieldData: data.loadingExperience?.metrics ?? null,
    };

    return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
  },
  { annotations: { readOnlyHint: true, openWorldHint: true } }
);

export const pagespeedServer = createSdkMcpServer({
  name: "pagespeed",
  version: "1.0.0",
  tools: [runPagespeedAudit],
});
