/**
 * SEO + Messaging Alignment Agent — standalone
 *
 * Fetches page content and cross-references against Sessions 1-3 data
 * (reviews, keywords, Reddit) to score messaging alignment.
 * Can run alone (npm run agent:seo) or be imported by the orchestrator.
 *
 * Usage:
 *   npx tsx src/agents/seo-messaging-agent.ts
 *   AUDIT_URL=https://example.com npx tsx src/agents/seo-messaging-agent.ts
 */

import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import { runSubAgent, type SubAgentConfig } from "./run-sub-agent.js";
import { getKeywords } from "../tools/keywords.js";
import { searchReviews } from "../tools/reviews.js";
import { searchThreads } from "../tools/reddit.js";

const TARGET_URL =
  process.env.AUDIT_URL ||
  "https://www.soapboxsoaps.com/pages/progro-density-plus-hair-serum";

const DATA_DIR = resolve(import.meta.dirname, "../../data/pages");

// ─── Tool Handlers ───────────────────────────────────────────────────────────

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

    const title = html.match(/<title[^>]*>(.*?)<\/title>/is)?.[1]?.trim() ?? "";
    const metaDesc =
      html.match(/<meta[^>]*name=["']description["'][^>]*content=["'](.*?)["']/is)?.[1]?.trim() ?? "";

    const headings: { level: number; text: string }[] = [];
    const headingRegex = /<h([1-6])[^>]*>(.*?)<\/h\1>/gis;
    let match;
    while ((match = headingRegex.exec(html)) !== null) {
      headings.push({
        level: parseInt(match[1]),
        text: match[2].replace(/<[^>]*>/g, "").trim(),
      });
    }

    const ogTitle = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["'](.*?)["']/is)?.[1] ?? "";
    const ogDesc = html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["'](.*?)["']/is)?.[1] ?? "";

    const bodyHtml = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)?.[1] ?? "";
    const bodyText = bodyHtml
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 5000);

    const alts: string[] = [];
    const altRegex = /<img[^>]*alt=["'](.*?)["'][^>]*>/gi;
    while ((match = altRegex.exec(html)) !== null) {
      if (match[1].trim()) alts.push(match[1].trim());
    }

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
    console.log("   📂 Fetch failed — using fallback page content");
    const fallback = resolve(DATA_DIR, "seed-page-content.json");
    if (existsSync(fallback)) {
      return readFileSync(fallback, "utf-8");
    }
    return JSON.stringify({ error: `Could not fetch page: ${err instanceof Error ? err.message : String(err)}` });
  }
}

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

// ─── Agent Config (exported for orchestrator) ────────────────────────────────

export function buildSeoMessagingAgent(): SubAgentConfig {
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
        description: "Fetch a web page and extract SEO-relevant elements: title, meta description, headings, body text, image alts, structured data.",
        input_schema: {
          type: "object" as const,
          properties: { url: { type: "string", description: "The URL to fetch" } },
          required: ["url"],
        },
      },
      {
        name: "query_keyword_rankings",
        description: "Query the keyword_rankings database from Session 2. Returns keywords with position, search volume, intent, and cluster.",
        input_schema: {
          type: "object" as const,
          properties: {
            cluster: { type: "string", description: "Filter by keyword cluster" },
            intent: { type: "string", description: "Filter by search intent" },
            limit: { type: "number", description: "Max results (default 50)" },
          },
        },
      },
      {
        name: "search_reviews",
        description: "Search competitor product reviews from Session 1 by keyword.",
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
        description: "Search Reddit threads from Session 3 by keyword.",
        input_schema: {
          type: "object" as const,
          properties: {
            keyword: { type: "string", description: "Keyword to search" },
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

// ─── Standalone Main ─────────────────────────────────────────────────────────

async function main() {
  console.log(`\n🔍 SEO + Messaging Alignment Agent — standalone`);
  console.log(`Target: ${TARGET_URL}\n`);

  const client = new Anthropic();
  const result = await runSubAgent(client, buildSeoMessagingAgent());
  console.log("\n── Result ──\n");
  console.log(result);
}

const isDirectRun = process.argv[1]?.includes("seo-messaging-agent");
if (isDirectRun) {
  main().catch((err) => {
    console.error("❌ SEO agent failed:", err);
    process.exit(1);
  });
}
