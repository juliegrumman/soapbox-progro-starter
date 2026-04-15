/**
 * Page Audit Orchestrator
 *
 * Imports three standalone sub-agents and coordinates them:
 *   1. perf-agent        → Google PageSpeed Insights
 *   2. seo-messaging-agent → Page content + Sessions 1-3 cross-reference
 *   3. cro-ux-agent      → Microsoft Clarity behavioral data
 *
 * Each agent can also run independently (npm run agent:perf, agent:seo, agent:cro).
 * The orchestrator dispatches all three in parallel, synthesizes, and saves.
 *
 * Usage:
 *   npx tsx src/agents/page-audit-orchestrator.ts
 *   npm run audit:page
 */

import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";
import { writeFileSync } from "fs";
import { resolve } from "path";
import { runSubAgent } from "./run-sub-agent.js";
import { buildPerfAgent } from "./perf-agent.js";
import { buildSeoMessagingAgent } from "./seo-messaging-agent.js";
import { buildCroUxAgent } from "./cro-ux-agent.js";
import { insertPageAudit, insertEventBatch, insertSourceBatch } from "../tools/pages.js";

// ─── Configuration ───────────────────────────────────────────────────────────

const TARGET_URL =
  process.env.AUDIT_URL ||
  "https://www.soapboxsoaps.com/pages/progro-density-plus-hair-serum";

const MODEL = "claude-sonnet-4-6";
const REPORTS_DIR = resolve(import.meta.dirname, "../../reports");

const client = new Anthropic();

// ─── Synthesis ───────────────────────────────────────────────────────────────

async function synthesize(
  perfResult: string,
  seoResult: string,
  croResult: string
): Promise<string> {
  console.log("\n🔄 Synthesizing results...");

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 8192,
    system: `You are the lead product page auditor for ProGRO Density+ hair serum by Soapbox. Three specialist agents have analyzed the product page. Your job is to synthesize their findings into a single, actionable audit report.

Structure your response as a markdown report with these sections:
1. **Executive Summary** — 3-4 bullet points covering the most important findings
2. **Technical Performance** — Core Web Vitals status, key issues
3. **SEO & Messaging Alignment** — Keyword coverage, messaging gaps, alignment score
4. **Conversion & UX** — Clarity behavioral insights, friction points
5. **Top 10 Quick Wins** — Prioritized list of actions sorted by estimated impact, each with: what to do, why it matters, estimated effort (low/medium/high)
6. **Methodology** — Brief note on data sources

Also output a JSON block at the very end (fenced with \`\`\`json) containing the structured data for database storage:
{
  "performanceScore": number (0-100),
  "seoScore": number (0-100),
  "accessibilityScore": number (0-100),
  "bestPracticesScore": number (0-100),
  "lcp": number (ms),
  "cls": number,
  "fcp": number (ms),
  "inp": number (ms) or null,
  "ttfb": number (ms),
  "messagingAlignmentScore": number (0-100),
  "keywordsFound": string[] (keywords found on page),
  "keywordsMissing": string[] (high-value keywords missing),
  "messagingGaps": string[] (themes/topics missing from page),
  "scrollDepth": number (percentage) or null,
  "engagementTime": number (seconds) or null,
  "rageClicks": number (total) or null,
  "deadClicks": number (total) or null,
  "quickBacks": number or null,
  "recommendations": string[] (all recommendations),
  "quickWins": string[] (top 10 quick wins),
  "events": [{ "eventType": string, "selector": string, "count": number, "context": string, "severity": string, "suggestedFix": string }],
  "trafficSources": [{ "source": string, "sessions": number, "scrollDepth": number, "engagementTime": number }]
}

IMPORTANT: The "events" array must include EVERY element-level rage click and dead click from the Conversion/UX data. The "trafficSources" array must include per-source engagement metrics.`,
    messages: [
      {
        role: "user",
        content: `Here are the findings from three specialist agents who audited the ProGRO Density+ product page (${TARGET_URL}):

## Technical Performance Agent Results
${perfResult}

## SEO + Messaging Alignment Agent Results
${seoResult}

## Conversion/UX Agent Results
${croResult}

Synthesize these into a unified audit report with a top-10 quick wins list. End with the JSON data block for database storage.`,
      },
    ],
  });

  const text = response.content
    .filter((b): b is Anthropic.Messages.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n");

  console.log("   ✅ Synthesis complete");
  return text;
}

// ─── Save Results ────────────────────────────────────────────────────────────

async function saveResults(synthesisResult: string): Promise<void> {
  const jsonMatch = synthesisResult.match(/```json\s*([\s\S]*?)\s*```/);

  if (jsonMatch) {
    try {
      const data = JSON.parse(jsonMatch[1]);

      await insertPageAudit({
        url: TARGET_URL,
        performanceScore: data.performanceScore,
        seoScore: data.seoScore,
        accessibilityScore: data.accessibilityScore,
        bestPracticesScore: data.bestPracticesScore,
        lcp: data.lcp,
        cls: data.cls,
        fcp: data.fcp,
        inp: data.inp,
        ttfb: data.ttfb,
        messagingAlignmentScore: data.messagingAlignmentScore,
        keywordsFound: JSON.stringify(data.keywordsFound),
        keywordsMissing: JSON.stringify(data.keywordsMissing),
        messagingGaps: JSON.stringify(data.messagingGaps),
        scrollDepth: data.scrollDepth,
        engagementTime: data.engagementTime,
        rageClicks: data.rageClicks,
        deadClicks: data.deadClicks,
        quickBacks: data.quickBacks,
        recommendations: JSON.stringify(data.recommendations),
        quickWins: JSON.stringify(data.quickWins),
      });
      console.log("   💾 Saved to page_performance table");

      if (Array.isArray(data.events) && data.events.length > 0) {
        await insertEventBatch(
          data.events.map((e: Record<string, unknown>) => ({
            url: TARGET_URL,
            eventType: e.eventType as string,
            selector: e.selector as string,
            count: e.count as number,
            context: e.context as string,
            severity: e.severity as string,
            suggestedFix: e.suggestedFix as string,
          }))
        );
        console.log(`   💾 Saved ${data.events.length} UX events to clarity_events table`);
      }

      if (Array.isArray(data.trafficSources) && data.trafficSources.length > 0) {
        await insertSourceBatch(
          data.trafficSources.map((s: Record<string, unknown>) => ({
            url: TARGET_URL,
            source: s.source as string,
            sessions: s.sessions as number,
            scrollDepth: s.scrollDepth as number,
            engagementTime: s.engagementTime as number,
          }))
        );
        console.log(`   💾 Saved ${data.trafficSources.length} traffic sources to clarity_sources table`);
      }
    } catch (err) {
      console.error("   ⚠️  Could not parse JSON from synthesis:", err);
    }
  }

  const reportContent = synthesisResult.replace(/```json\s*[\s\S]*?\s*```/, "").trim();
  const reportPath = resolve(REPORTS_DIR, "page-performance-audit.md");
  writeFileSync(reportPath, `# ProGRO Density+ Page Performance Audit\n\n_Audited: ${new Date().toISOString()}_\n_URL: ${TARGET_URL}_\n\n${reportContent}\n`);
  console.log(`   📄 Report saved to ${reportPath}`);
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║  ProGRO Density+ Page Performance Audit — Orchestrator     ║");
  console.log("╚══════════════════════════════════════════════════════════════╝");
  console.log(`\nTarget: ${TARGET_URL}`);
  console.log(`Model:  ${MODEL}`);
  console.log(`Time:   ${new Date().toISOString()}\n`);

  const hasPageSpeed = !!process.env.PAGESPEED_API_KEY;
  const hasClarity = !!process.env.CLARITY_API_TOKEN && !!process.env.CLARITY_PROJECT_ID;
  const hasAnthropic = !!process.env.ANTHROPIC_API_KEY;

  console.log("API keys:");
  console.log(`  Anthropic:  ${hasAnthropic ? "✅" : "❌ Required — set ANTHROPIC_API_KEY"}`);
  console.log(`  PageSpeed:  ${hasPageSpeed ? "✅" : "📂 Using fallback data"}`);
  console.log(`  Clarity:    ${hasClarity ? "✅" : "📂 Using fallback data"}`);

  if (!hasAnthropic) {
    console.error("\n❌ ANTHROPIC_API_KEY is required to run the orchestrator.");
    process.exit(1);
  }

  // Dispatch all three sub-agents in parallel
  console.log("\n━━━ Phase 1: Dispatching Sub-Agents ━━━");

  const [perfResult, seoResult, croResult] = await Promise.all([
    runSubAgent(client, buildPerfAgent()),
    runSubAgent(client, buildSeoMessagingAgent()),
    runSubAgent(client, buildCroUxAgent()),
  ]);

  // Synthesize
  console.log("\n━━━ Phase 2: Synthesis ━━━");
  const synthesisResult = await synthesize(perfResult, seoResult, croResult);

  // Save
  console.log("\n━━━ Phase 3: Save Results ━━━");
  await saveResults(synthesisResult);

  console.log("\n╔══════════════════════════════════════════════════════════════╗");
  console.log("║  Audit Complete                                            ║");
  console.log("╚══════════════════════════════════════════════════════════════╝");
  console.log(`\nReport: reports/page-performance-audit.md`);
  console.log("Run 'npm run dev' and visit http://localhost:3001/api/pages to see the data.\n");
}

main().catch((err) => {
  console.error("\n❌ Orchestrator failed:", err);
  process.exit(1);
});
