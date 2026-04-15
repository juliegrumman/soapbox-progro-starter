/**
 * Technical Performance Agent — standalone
 *
 * Audits a page's Core Web Vitals and Lighthouse scores via Google PageSpeed Insights.
 * Can run alone (npm run agent:perf) or be imported by the orchestrator.
 *
 * Usage:
 *   npx tsx src/agents/perf-agent.ts
 *   AUDIT_URL=https://example.com npx tsx src/agents/perf-agent.ts
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

async function handlePageSpeedAudit(input: Record<string, unknown>): Promise<string> {
  const url = (input.url as string) || TARGET_URL;
  const strategy = (input.strategy as string) || "mobile";

  const apiKey = process.env.PAGESPEED_API_KEY;
  if (!apiKey) {
    console.log("   📂 No PAGESPEED_API_KEY — using fallback data");
    const fallback = resolve(DATA_DIR, "seed-pagespeed-results.json");
    if (existsSync(fallback)) {
      return readFileSync(fallback, "utf-8");
    }
    return JSON.stringify({ error: "No API key and no fallback data available" });
  }

  const params = new URLSearchParams({
    url,
    key: apiKey,
    strategy,
    category: "performance",
  });
  for (const cat of ["seo", "accessibility", "best-practices"]) {
    params.append("category", cat);
  }

  console.log(`   🌐 Calling PageSpeed API (${strategy})...`);
  const resp = await fetch(
    `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?${params}`
  );

  if (!resp.ok) {
    return JSON.stringify({ error: `PageSpeed API error: ${resp.status} ${resp.statusText}` });
  }

  const data = await resp.json();
  const lighthouse = data.lighthouseResult;

  const result = {
    url,
    strategy,
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

  return JSON.stringify(result, null, 2);
}

// ─── Agent Config (exported for orchestrator) ────────────────────────────────

export function buildPerfAgent(): SubAgentConfig {
  return {
    name: "Technical Performance Agent",
    system: `You are a web performance specialist. Your job is to analyze a web page's technical performance using Google PageSpeed Insights data.

Analyze the Core Web Vitals (LCP, CLS, FCP, INP, TTFB) and Lighthouse category scores. Apply Google's thresholds:
- LCP: Good < 2500ms, Needs Improvement < 4000ms, Poor >= 4000ms
- CLS: Good < 0.1, Needs Improvement < 0.25, Poor >= 0.25
- FCP: Good < 1800ms, Needs Improvement < 3000ms, Poor >= 3000ms
- INP: Good < 200ms, Needs Improvement < 500ms, Poor >= 500ms
- TTFB: Good < 800ms, Needs Improvement < 1800ms, Poor >= 1800ms

Return your findings as a structured JSON object with:
1. "scores" — all Lighthouse category scores
2. "coreWebVitals" — each metric value + pass/fail status
3. "topIssues" — the 5 most impactful performance problems, each with title, description, and estimated impact
4. "summary" — 2-3 sentence overview of technical health`,
    tools: [
      {
        name: "run_pagespeed_audit",
        description:
          "Run a Google PageSpeed Insights audit on a URL. Returns Lighthouse scores, Core Web Vitals, and optimization opportunities.",
        input_schema: {
          type: "object" as const,
          properties: {
            url: { type: "string", description: "The URL to audit" },
            strategy: {
              type: "string",
              enum: ["mobile", "desktop"],
              description: "Device strategy (default: mobile)",
            },
          },
          required: ["url"],
        },
      },
    ],
    toolHandlers: {
      run_pagespeed_audit: handlePageSpeedAudit,
    },
    task: `Audit the following page for technical performance: ${TARGET_URL}

Run the PageSpeed audit for BOTH mobile and desktop strategies. Compare the results and identify the most critical issues.

Return your complete analysis as a JSON object.`,
  };
}

// ─── Standalone Main ─────────────────────────────────────────────────────────

async function main() {
  console.log(`\n⚡ Technical Performance Agent — standalone`);
  console.log(`Target: ${TARGET_URL}\n`);

  const client = new Anthropic();
  const result = await runSubAgent(client, buildPerfAgent());
  console.log("\n── Result ──\n");
  console.log(result);
}

// Only run main() when executed directly (not imported)
const isDirectRun = process.argv[1]?.includes("perf-agent");
if (isDirectRun) {
  main().catch((err) => {
    console.error("❌ Performance agent failed:", err);
    process.exit(1);
  });
}
