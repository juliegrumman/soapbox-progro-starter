/**
 * Page Audit Orchestrator
 *
 * Coordinates three standalone sub-agents using the Claude Agent SDK's
 * native subagent dispatch. The SDK handles the agentic loop, tool
 * execution, and parallelization automatically.
 *
 * Sub-agents:
 *   1. perf-auditor   → Google PageSpeed Insights
 *   2. seo-analyst    → Page content + Sessions 1-3 cross-reference
 *   3. cro-analyst    → Microsoft Clarity behavioral data
 *
 * After synthesis, the orchestrator calls save_audit_results to persist
 * structured data to the database (no JSON regex parsing needed).
 *
 * Usage:
 *   npx tsx src/agents/page-audit-orchestrator.ts
 *   npm run audit:page
 */

import "dotenv/config";
import { query } from "@anthropic-ai/claude-agent-sdk";
import { writeFileSync } from "fs";
import { resolve } from "path";

// Import MCP servers from tool files
import { pagespeedServer } from "./tools/pagespeed-tools.js";
import { seoServer } from "./tools/seo-tools.js";
import { clarityServer } from "./tools/clarity-tools.js";
import { dbSaveServer } from "./tools/db-save-tools.js";

// Import agent configs for system prompts
import { perfAgentConfig } from "./perf-agent.js";
import { seoAgentConfig } from "./seo-messaging-agent.js";
import { croAgentConfig } from "./cro-ux-agent.js";

// ─── Configuration ───────────────────────────────────────────────────────────

const TARGET_URL =
  process.env.AUDIT_URL ||
  "https://www.soapboxsoaps.com/pages/progro-density-plus-hair-serum";

const REPORTS_DIR = resolve(import.meta.dirname, "../../reports");

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║  ProGRO Density+ Page Performance Audit — Orchestrator     ║");
  console.log("╚══════════════════════════════════════════════════════════════╝");
  console.log(`\nTarget: ${TARGET_URL}`);
  console.log(`Time:   ${new Date().toISOString()}\n`);

  const hasPageSpeed = !!process.env.PAGESPEED_API_KEY;
  const hasClarity = !!process.env.CLARITY_API_TOKEN && !!process.env.CLARITY_PROJECT_ID;

  console.log("API keys:");
  console.log(`  PageSpeed:  ${hasPageSpeed ? "✅" : "📂 Using fallback data"}`);
  console.log(`  Clarity:    ${hasClarity ? "✅" : "📂 Using fallback data"}`);

  let finalResult = "";

  for await (const message of query({
    prompt: `You are orchestrating a comprehensive page audit of: ${TARGET_URL}

Dispatch the three specialist agents to analyze the page:
1. Use the perf-auditor agent to audit technical performance (Core Web Vitals, Lighthouse scores)
2. Use the seo-analyst agent to audit SEO and messaging alignment against Sessions 1-3 data
3. Use the cro-analyst agent to audit conversion/UX using Clarity behavioral data

After all three agents report back, synthesize their findings into a unified audit report with these sections:
1. Executive Summary (3-4 bullets)
2. Technical Performance — Core Web Vitals pass/fail, key issues
3. SEO & Messaging Alignment — keyword coverage, messaging gaps, alignment score
4. Conversion & UX — scroll depth, rage/dead clicks, traffic source quality
5. Top 10 Quick Wins — prioritized by estimated impact, each with what/why/effort
6. Methodology

Then call the save_audit_results tool with the structured data to save everything to the database.

Finally, output the full markdown report.`,
    options: {
      // Register all MCP servers at the parent level
      mcpServers: {
        pagespeed: pagespeedServer,
        seo: seoServer,
        clarity: clarityServer,
        db: dbSaveServer,
      },

      // The orchestrator can dispatch subagents and save results
      allowedTools: ["Agent", "mcp__db__save_audit_results"],
      tools: [],

      // Define the three specialist subagents
      agents: {
        "perf-auditor": {
          description: perfAgentConfig.description,
          prompt: perfAgentConfig.prompt,
          mcpServers: ["pagespeed"],
          tools: [],
          model: "sonnet",
          maxTurns: 10,
          permissionMode: "bypassPermissions",
        },
        "seo-analyst": {
          description: seoAgentConfig.description,
          prompt: seoAgentConfig.prompt,
          mcpServers: ["seo"],
          tools: [],
          model: "sonnet",
          maxTurns: 15,
          permissionMode: "bypassPermissions",
        },
        "cro-analyst": {
          description: croAgentConfig.description,
          prompt: croAgentConfig.prompt,
          mcpServers: ["clarity"],
          tools: [],
          model: "sonnet",
          maxTurns: 10,
          permissionMode: "bypassPermissions",
        },
      },

      systemPrompt: `You are the lead product page auditor for ProGRO Density+ hair serum by Soapbox. You coordinate three specialist agents and synthesize their findings into a unified report. After synthesizing, you MUST call the save_audit_results tool to persist all structured data to the database.`,

      permissionMode: "bypassPermissions",
      model: "claude-sonnet-4-6",
      maxTurns: 30,
    },
  })) {
    // Stream assistant output
    if (message.type === "assistant") {
      for (const block of message.message.content) {
        if ("text" in block) process.stdout.write(block.text);
        if ("name" in block && block.name === "Agent") {
          console.log(`\n🔄 Dispatching subagent...`);
        }
      }
    }

    // Capture final result
    if (message.type === "result") {
      if (message.subtype === "success") {
        finalResult = message.result;
        console.log(`\n\n✅ Audit complete. Cost: $${message.total_cost_usd.toFixed(4)}`);
      } else {
        console.log(`\n❌ Audit failed: ${message.subtype}`);
      }
    }
  }

  // Save the markdown report to disk
  if (finalResult) {
    const reportPath = resolve(REPORTS_DIR, "page-performance-audit.md");
    writeFileSync(
      reportPath,
      `# ProGRO Density+ Page Performance Audit\n\n_Audited: ${new Date().toISOString()}_\n_URL: ${TARGET_URL}_\n\n${finalResult}\n`
    );
    console.log(`📄 Report saved to ${reportPath}`);
  }

  console.log("\n╔══════════════════════════════════════════════════════════════╗");
  console.log("║  Audit Complete                                            ║");
  console.log("╚══════════════════════════════════════════════════════════════╝");
  console.log("Run 'npm run dev' and visit http://localhost:3001/api/pages to see the data.\n");
}

main().catch((err) => {
  console.error("\n❌ Orchestrator failed:", err);
  process.exit(1);
});
