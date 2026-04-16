/**
 * SEO + Messaging Alignment custom tools for the Agent SDK.
 * Page fetch, keyword query, review search, Reddit search.
 */

import { tool, createSdkMcpServer } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import { getKeywords } from "../../tools/keywords.js";
import { searchReviews } from "../../tools/reviews.js";
import { searchThreads } from "../../tools/reddit.js";
import { getLatestAudit } from "../../tools/pages.js";

const DATA_DIR = resolve(import.meta.dirname, "../../../data/pages");

const fetchPageContent = tool(
  "fetch_page_content",
  "Fetch a web page and extract SEO-relevant elements: title, meta description, headings, body text, image alts, structured data.",
  {
    url: z.string().describe("The URL to fetch"),
  },
  async (args) => {
    try {
      console.log(`   🌐 Fetching page content: ${args.url}`);
      const resp = await fetch(args.url, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; SoapboxAuditBot/1.0)" },
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

      const html = await resp.text();

      const title = html.match(/<title[^>]*>(.*?)<\/title>/is)?.[1]?.trim() ?? "";
      const metaDesc =
        html.match(/<meta[^>]*name=["']description["'][^>]*content=["'](.*?)["']/is)?.[1]?.trim() ?? "";

      const headings: { level: number; text: string }[] = [];
      const headingRegex = /<h([1-6])[^>]*>(.*?)<\/h\1>/gis;
      let match;
      while ((match = headingRegex.exec(html)) !== null) {
        headings.push({ level: parseInt(match[1]), text: match[2].replace(/<[^>]*>/g, "").trim() });
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

      const result = {
        url: args.url, title, metaDescription: metaDesc,
        ogTitle, ogDescription: ogDesc, headings,
        bodyTextPreview: bodyText,
        imageAltTexts: alts.slice(0, 20),
        structuredData: jsonLd.length > 0 ? jsonLd : null,
      };
      return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
    } catch {
      console.log("   📂 Fetch failed — using fallback page content");
      const fallback = resolve(DATA_DIR, "seed-page-content.json");
      if (existsSync(fallback)) {
        return { content: [{ type: "text" as const, text: readFileSync(fallback, "utf-8") }] };
      }
      return { content: [{ type: "text" as const, text: '{"error":"Could not fetch page"}' }], isError: true };
    }
  },
  { annotations: { readOnlyHint: true, openWorldHint: true } }
);

const queryKeywordRankings = tool(
  "query_keyword_rankings",
  "Query the keyword_rankings database from Session 2. Returns keywords with position, search volume, intent, and cluster.",
  {
    cluster: z.string().optional().describe("Filter by keyword cluster"),
    intent: z.string().optional().describe("Filter by search intent"),
    limit: z.number().default(50).describe("Max results"),
  },
  async (args) => {
    const results = await getKeywords({ cluster: args.cluster, intent: args.intent, limit: args.limit });
    return { content: [{ type: "text" as const, text: JSON.stringify(results, null, 2) }] };
  },
  { annotations: { readOnlyHint: true } }
);

const searchReviewsTool = tool(
  "search_reviews",
  "Search competitor product reviews from Session 1 by keyword. Shows how customers talk about topics relevant to messaging.",
  {
    keyword: z.string().describe("Keyword to search in review title and body"),
    limit: z.number().default(20).describe("Max results"),
  },
  async (args) => {
    const results = await searchReviews(args.keyword, { limit: args.limit });
    return { content: [{ type: "text" as const, text: JSON.stringify(results, null, 2) }] };
  },
  { annotations: { readOnlyHint: true } }
);

const searchRedditThreads = tool(
  "search_reddit_threads",
  "Search Reddit threads from Session 3 by keyword. Shows real consumer conversations.",
  {
    keyword: z.string().describe("Keyword to search in thread title and body"),
    limit: z.number().default(20).describe("Max results"),
  },
  async (args) => {
    const results = await searchThreads(args.keyword, args.limit);
    return { content: [{ type: "text" as const, text: JSON.stringify(results, null, 2) }] };
  },
  { annotations: { readOnlyHint: true } }
);

const queryPagePerformance = tool(
  "query_page_performance",
  "Query the latest page audit from Session 4. Returns scores, Core Web Vitals, messaging alignment, scroll depth, rage clicks, missing keywords, messaging gaps, and quick wins for a given URL. Use this to cross-reference whether ads promise what the landing page actually delivers.",
  {
    url: z.string().describe("The page URL to look up"),
  },
  async (args) => {
    const results = await getLatestAudit(args.url);
    return { content: [{ type: "text" as const, text: JSON.stringify(results, null, 2) }] };
  },
  { annotations: { readOnlyHint: true } }
);

export const seoServer = createSdkMcpServer({
  name: "seo",
  version: "1.0.0",
  tools: [fetchPageContent, queryKeywordRankings, searchReviewsTool, searchRedditThreads, queryPagePerformance],
});
