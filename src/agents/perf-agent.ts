/**
 * Technical Performance Agent — standalone
 *
 * Audits a page's Core Web Vitals and Lighthouse scores via Google PageSpeed Insights.
 * Uses the Claude Agent SDK — the SDK manages the agentic loop automatically.
 *
 * Run standalone:  npm run agent:perf
 * Or imported by the orchestrator for coordinated execution.
 */

import "dotenv/config";
import { query } from "@anthropic-ai/claude-agent-sdk";
import { pagespeedServer } from "./tools/pagespeed-tools.js";

const TARGET_URL =
  process.env.AUDIT_URL ||
  "https://www.soapboxsoaps.com/pages/progro-density-plus-hair-serum";

// ─── Exported config (for orchestrator import) ──────────────────────────────

export const perfAgentConfig = {
  description:
    "Audits a web page's Core Web Vitals and Lighthouse scores via Google PageSpeed Insights. Use for technical performance analysis.",
  prompt: `You are a web performance specialist. Your job is to analyze a web page's technical performance using Google PageSpeed Insights data.

Analyze the Core Web Vitals (LCP, CLS, FCP, INP, TTFB) and Lighthouse category scores. Apply Google's thresholds:
- LCP: Good < 2500ms, Needs Improvement < 4000ms, Poor >= 4000ms
- CLS: Good < 0.1, Needs Improvement < 0.25, Poor >= 0.25
- FCP: Good < 1800ms, Needs Improvement < 3000ms, Poor >= 3000ms
- INP: Good < 200ms, Needs Improvement < 500ms, Poor >= 500ms
- TTFB: Good < 800ms, Needs Improvement < 1800ms, Poor >= 1800ms

Return your findings as a structured JSON object with:
1. "scores" — all Lighthouse category scores
2. "coreWebVitals" — each metric value + pass/fail status
3. "topIssues" — the 5 most impactful performance problems
4. "summary" — 2-3 sentence overview of technical health`,
};

export { pagespeedServer };

// ─── Standalone execution ────────────────────────────────────────────────────

async function main() {
  console.log(`\n⚡ Technical Performance Agent — standalone`);
  console.log(`Target: ${TARGET_URL}\n`);

  for await (const message of query({
    prompt: `Audit the following page for technical performance: ${TARGET_URL}

Run the PageSpeed audit for BOTH mobile and desktop strategies. Compare the results and identify the most critical issues.

Return your complete analysis as a JSON object.`,
    options: {
      mcpServers: { pagespeed: pagespeedServer },
      allowedTools: ["mcp__pagespeed__run_pagespeed_audit"],
      tools: [],
      permissionMode: "bypassPermissions",
      systemPrompt: perfAgentConfig.prompt,
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

const isDirectRun = process.argv[1]?.includes("perf-agent");
if (isDirectRun) {
  main().catch((err) => {
    console.error("❌ Performance agent failed:", err);
    process.exit(1);
  });
}
