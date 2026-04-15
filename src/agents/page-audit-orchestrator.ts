/**
 * Page Audit Orchestrator — Session 4 Main Deliverable
 *
 * Coordinates three specialized sub-agents using the Anthropic SDK:
 *   1. Technical Performance Agent  → Google PageSpeed Insights API
 *   2. SEO + Messaging Agent        → Page fetch + Sessions 1-3 cross-reference
 *   3. Conversion/UX Agent          → Microsoft Clarity Data Export API
 *
 * Each sub-agent gets its own messages.create() call with a focused system prompt
 * and custom tools. The orchestrator synthesizes their findings into a unified
 * report and saves results to the page_performance table.
 *
 * Usage:
 *   npx tsx src/agents/page-audit-orchestrator.ts
 *   # or
 *   npm run audit:page
 */

import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { resolve } from "path";
import { runSubAgent, type SubAgentConfig } from "./run-sub-agent.js";
import { insertPageAudit, insertEventBatch, insertSourceBatch } from "../tools/pages.js";
import { getKeywords } from "../tools/keywords.js";
import { searchReviews } from "../tools/reviews.js";
import { searchThreads } from "../tools/reddit.js";

// ─── Configuration ───────────────────────────────────────────────────────────

const TARGET_URL =
  process.env.AUDIT_URL ||
  "https://www.soapboxsoaps.com/pages/progro-density-plus-hair-serum";

const MODEL = "claude-sonnet-4-6";
const DATA_DIR = resolve(import.meta.dirname, "../../data/pages");
const REPORTS_DIR = resolve(import.meta.dirname, "../../reports");

const client = new Anthropic();

// ─── Tool Handlers ───────────────────────────────────────────────────────────

// --- PageSpeed Insights ---

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
  // Add multiple categories
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

  // Extract the key metrics
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

// --- Page Content Fetch ---

async function handleFetchPageContent(input: Record<string, unknown>): Promise<string> {
  const url = (input.url as string) || TARGET_URL;

  try {
    console.log(`   🌐 Fetching page content: ${url}`);
    const resp = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; SoapboxAuditBot/1.0)" },
    });

    if (!resp.ok) {
      throw new Error(`HTTP ${resp.status}`);
    }

    const html = await resp.text();

    // Extract SEO-relevant elements with basic regex parsing
    const title = html.match(/<title[^>]*>(.*?)<\/title>/is)?.[1]?.trim() ?? "";
    const metaDesc =
      html.match(/<meta[^>]*name=["']description["'][^>]*content=["'](.*?)["']/is)?.[1]?.trim() ?? "";

    // Extract headings
    const headings: { level: number; text: string }[] = [];
    const headingRegex = /<h([1-6])[^>]*>(.*?)<\/h\1>/gis;
    let match;
    while ((match = headingRegex.exec(html)) !== null) {
      headings.push({
        level: parseInt(match[1]),
        text: match[2].replace(/<[^>]*>/g, "").trim(),
      });
    }

    // Extract meta tags
    const ogTitle = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["'](.*?)["']/is)?.[1] ?? "";
    const ogDesc = html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["'](.*?)["']/is)?.[1] ?? "";

    // Extract visible body text (strip tags, scripts, styles)
    const bodyHtml = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)?.[1] ?? "";
    const bodyText = bodyHtml
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 5000); // Cap at 5000 chars to keep context manageable

    // Extract image alt texts
    const alts: string[] = [];
    const altRegex = /<img[^>]*alt=["'](.*?)["'][^>]*>/gi;
    while ((match = altRegex.exec(html)) !== null) {
      if (match[1].trim()) alts.push(match[1].trim());
    }

    // Extract structured data
    const jsonLd: string[] = [];
    const ldRegex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
    while ((match = ldRegex.exec(html)) !== null) {
      jsonLd.push(match[1].trim());
    }

    return JSON.stringify(
      {
        url,
        title,
        metaDescription: metaDesc,
        ogTitle,
        ogDescription: ogDesc,
        headings,
        bodyTextPreview: bodyText,
        imageAltTexts: alts.slice(0, 20),
        structuredData: jsonLd.length > 0 ? jsonLd : null,
      },
      null,
      2
    );
  } catch (err) {
    // Fallback to cached data
    console.log("   📂 Fetch failed — using fallback page content");
    const fallback = resolve(DATA_DIR, "seed-page-content.json");
    if (existsSync(fallback)) {
      return readFileSync(fallback, "utf-8");
    }
    return JSON.stringify({ error: `Could not fetch page: ${err instanceof Error ? err.message : String(err)}` });
  }
}

// --- Database query handlers (wrap existing tool functions) ---

async function handleQueryKeywords(input: Record<string, unknown>): Promise<string> {
  const cluster = input.cluster as string | undefined;
  const intent = input.intent as string | undefined;
  const limit = (input.limit as number) ?? 50;
  const results = await getKeywords({ cluster, intent, limit });
  return JSON.stringify(results, null, 2);
}

async function handleSearchReviews(input: Record<string, unknown>): Promise<string> {
  const keyword = input.keyword as string;
  const limit = (input.limit as number) ?? 20;
  const results = await searchReviews(keyword, { limit });
  return JSON.stringify(results, null, 2);
}

async function handleSearchReddit(input: Record<string, unknown>): Promise<string> {
  const keyword = input.keyword as string;
  const limit = (input.limit as number) ?? 20;
  const results = await searchThreads(keyword, limit);
  return JSON.stringify(results, null, 2);
}

// --- Clarity API ---

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

// ─── Sub-Agent Definitions ───────────────────────────────────────────────────

function buildPerfAgent(): SubAgentConfig {
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

function buildSeoMessagingAgent(): SubAgentConfig {
  return {
    name: "SEO + Messaging Alignment Agent",
    system: `You are an on-page SEO and messaging strategist for a hair density/growth serum product (ProGRO Density+ by Soapbox).

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
    tools: [
      {
        name: "fetch_page_content",
        description:
          "Fetch a web page and extract SEO-relevant elements: title, meta description, headings, body text, image alts, structured data.",
        input_schema: {
          type: "object" as const,
          properties: {
            url: { type: "string", description: "The URL to fetch" },
          },
          required: ["url"],
        },
      },
      {
        name: "query_keyword_rankings",
        description:
          "Query the keyword_rankings database from Session 2. Returns keywords with position, search volume, intent, and cluster.",
        input_schema: {
          type: "object" as const,
          properties: {
            cluster: { type: "string", description: "Filter by keyword cluster" },
            intent: { type: "string", description: "Filter by search intent (informational, commercial, transactional, navigational)" },
            limit: { type: "number", description: "Max results (default 50)" },
          },
        },
      },
      {
        name: "search_reviews",
        description:
          "Search competitor product reviews from Session 1 by keyword. Returns review text showing how customers talk about this topic.",
        input_schema: {
          type: "object" as const,
          properties: {
            keyword: { type: "string", description: "Keyword to search in review title and body" },
            limit: { type: "number", description: "Max results (default 20)" },
          },
          required: ["keyword"],
        },
      },
      {
        name: "search_reddit_threads",
        description:
          "Search Reddit threads from Session 3 by keyword. Returns threads showing real consumer conversations.",
        input_schema: {
          type: "object" as const,
          properties: {
            keyword: { type: "string", description: "Keyword to search in thread title and body" },
            limit: { type: "number", description: "Max results (default 20)" },
          },
          required: ["keyword"],
        },
      },
    ],
    toolHandlers: {
      fetch_page_content: handleFetchPageContent,
      query_keyword_rankings: handleQueryKeywords,
      search_reviews: handleSearchReviews,
      search_reddit_threads: handleSearchReddit,
    },
    task: `Audit the messaging and SEO of this product page: ${TARGET_URL}

Steps:
1. Fetch the page content to see what's actually on the page
2. Query keyword_rankings to get the top keywords by search volume (get all keywords, no filter)
3. Search reviews for key themes: "thinning", "results", "growth"
4. Search Reddit threads for: "hair density", "hair growth serum"
5. Cross-reference: which keywords and customer language themes are present on the page? Which are missing?
6. Calculate a messaging alignment score (0-100)

Return your complete analysis as a JSON object.`,
  };
}

function buildCroUxAgent(): SubAgentConfig {
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
        description:
          "Query Microsoft Clarity analytics data for the product page. Returns behavioral metrics: scroll depth, engagement time, rage clicks, dead clicks, quick-backs, and traffic data.",
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

// ─── Orchestrator ────────────────────────────────────────────────────────────

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

IMPORTANT: The "events" array must include EVERY element-level rage click and dead click from the Conversion/UX data. Each event needs a specific CSS selector, count, and a concrete suggested fix. The "trafficSources" array must include per-source engagement metrics.`,
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

async function saveResults(synthesisResult: string): Promise<void> {
  // Extract the JSON block from the synthesis
  const jsonMatch = synthesisResult.match(/```json\s*([\s\S]*?)\s*```/);

  if (jsonMatch) {
    try {
      const data = JSON.parse(jsonMatch[1]);

      // Save aggregate audit to page_performance
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

      // Save element-level UX events to clarity_events
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

      // Save traffic source breakdown to clarity_sources
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

  // Save the full markdown report (strip the JSON block for cleaner output)
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

  // Check for required API keys
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

  // Dispatch sub-agents
  // Performance and CRO agents are independent — run in parallel
  // SEO agent is independent too, so all three can run concurrently
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
