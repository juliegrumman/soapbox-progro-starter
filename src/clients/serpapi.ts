/**
 * SerpAPI client for Google Search and Google Trends.
 * Used by the SEO Keyword Research skill (Session 2).
 */

import { getSerpApiKey } from "./config.js";
import { apiFetch, type ApiResult } from "./base-client.js";

// ── Response types ──────────────────────────────────────────────

export interface OrganicResult {
  position: number;
  title: string;
  link: string;
  snippet?: string;
}

export interface SerpSearchResult {
  keyword: string;
  organicResults: OrganicResult[];
  relatedQuestions?: string[];
}

export interface TrendsTimelinePoint {
  date: string;
  value: number;
}

export interface SerpTrendsResult {
  keyword: string;
  timeline: TrendsTimelinePoint[];
  averageInterest: number;
}

// ── Public API ──────────────────────────────────────────────────

/**
 * Search Google for a keyword. Returns null if no API key is configured.
 */
export async function searchGoogle(
  keyword: string,
  options: { location?: string; num?: number } = {}
): Promise<ApiResult<SerpSearchResult> | null> {
  const apiKey = getSerpApiKey();
  if (!apiKey) return null;

  const { location = "United States", num = 10 } = options;

  const url = new URL("https://serpapi.com/search.json");
  url.searchParams.set("q", keyword);
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("engine", "google");
  url.searchParams.set("location", location);
  url.searchParams.set("num", String(num));

  console.log(`  Searching Google: "${keyword}"`);

  const result = await apiFetch<Record<string, unknown>>(url.toString());
  if (!result.success) return result;

  const raw = result.data;
  const organicResults: OrganicResult[] = (
    (raw.organic_results as Array<Record<string, unknown>>) || []
  ).map((r) => ({
    position: r.position as number,
    title: r.title as string,
    link: r.link as string,
    snippet: r.snippet as string | undefined,
  }));

  const relatedQuestions = (
    (raw.related_questions as Array<Record<string, unknown>>) || []
  ).map((q) => q.question as string);

  return {
    success: true,
    data: { keyword, organicResults, relatedQuestions },
  };
}

/**
 * Get Google Trends data for a keyword. Returns null if no API key is configured.
 */
export async function getGoogleTrends(
  keyword: string,
  options: { geo?: string } = {}
): Promise<ApiResult<SerpTrendsResult> | null> {
  const apiKey = getSerpApiKey();
  if (!apiKey) return null;

  const { geo = "US" } = options;

  const url = new URL("https://serpapi.com/search.json");
  url.searchParams.set("engine", "google_trends");
  url.searchParams.set("q", keyword);
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("data_type", "TIMESERIES");
  url.searchParams.set("geo", geo);

  console.log(`  Fetching trends: "${keyword}"`);

  const result = await apiFetch<Record<string, unknown>>(url.toString());
  if (!result.success) return result;

  const raw = result.data;
  const timelineData =
    ((raw.interest_over_time as Record<string, unknown>)?.timeline_data as Array<Record<string, unknown>>) || [];

  const timeline: TrendsTimelinePoint[] = timelineData.map((point) => ({
    date: point.date as string,
    value: ((point.values as Array<Record<string, unknown>>)?.[0]?.extracted_value as number) ?? 0,
  }));

  const averageInterest =
    timeline.length > 0
      ? Math.round(timeline.reduce((sum, p) => sum + p.value, 0) / timeline.length)
      : 0;

  return {
    success: true,
    data: { keyword, timeline, averageInterest },
  };
}

/**
 * Search Google for a batch of keywords sequentially with progress logging.
 * Returns null if no API key is configured.
 */
export async function searchBatch(
  keywords: string[],
  options: { location?: string; num?: number } = {}
): Promise<ApiResult<SerpSearchResult[]> | null> {
  const apiKey = getSerpApiKey();
  if (!apiKey) return null;

  const results: SerpSearchResult[] = [];
  console.log(`\nSearching ${keywords.length} keywords via SerpAPI...\n`);

  for (let i = 0; i < keywords.length; i++) {
    const keyword = keywords[i];
    console.log(`[${i + 1}/${keywords.length}]`);
    const result = await searchGoogle(keyword, options);
    if (result === null) return null;
    if (!result.success) {
      console.log(`  ⚠ Failed: ${result.error}`);
      continue;
    }
    results.push(result.data);
  }

  console.log(`\nCompleted: ${results.length}/${keywords.length} keywords.\n`);
  return { success: true, data: results };
}
