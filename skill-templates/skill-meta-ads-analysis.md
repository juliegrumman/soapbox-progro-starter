# Skill: Meta Ads Campaign Analysis

## Purpose

Analyze Soapbox's Meta Ads campaigns for ProGRO Density+ using the Pipeboard Meta Ads MCP. Pull live campaign data, cross-reference with Sessions 1-4 intelligence, save performance metrics to the database, and generate a report with data-driven ad angle recommendations.

## When to Use

- After connecting the Pipeboard Meta Ads MCP (`claude mcp add meta-ads --transport sse https://mcp.pipeboard.co/meta-ads-mcp`)
- After Sessions 1-4 data is in the database (reviews, keywords, Reddit threads, page audit)
- When analyzing campaign performance or developing new ad angles

## Prerequisites

- Pipeboard Meta Ads MCP connected (OAuth — run `claude mcp add meta-ads --transport sse https://mcp.pipeboard.co/meta-ads-mcp` outside Claude Code)
- Sessions 1-4 data in `soapbox.db`
- Tool functions available at `src/tools/ads.ts`

## What This Skill Does Differently

Sessions 1-3 skills operated on one data source each. Session 4's orchestrator ran three sub-agents in parallel via TypeScript code. This skill combines **live MCP tools** (Meta Ads data) with **database cross-referencing** (Sessions 1-4) in a single Claude Code session. It's a soft agent with a structured workflow — Claude decides how to search and analyze, but the phases keep it on track.

## Phase 1: Discover and Connect

Use the Meta Ads MCP tools to find the Soapbox ad account and list active campaigns.

1. Call `get_ad_accounts` to find all accessible ad accounts. Identify the Soapbox account.
2. Call `get_campaigns` with the Soapbox account ID. Filter for ACTIVE campaigns.
3. For each active campaign, call `get_campaign_details` to get objective, budget, and status.
4. Log what you found: how many campaigns, total daily/lifetime budget, campaign objectives.

## Phase 2: Pull Performance Data

For each active campaign, pull the last 30 days of performance metrics.

1. Call `get_insights` for each campaign with a 30-day date range. Request: spend, impressions, clicks, CTR, CPC, conversions, ROAS.
2. If the campaign has multiple ad sets, call `get_adsets` and then `get_insights` per ad set.
3. For the top-performing ad sets, call `get_ads` and `get_ad_creatives` to see the actual creative content (headlines, body text, images).
4. Organize the data into a performance table:

| Campaign | Ad Set | Spend | Impressions | Clicks | CTR | CPC | Conversions | ROAS |
|----------|--------|-------|-------------|--------|-----|-----|-------------|------|

## Phase 3: Cross-Reference with Sessions 1-4

This is where the accumulated intelligence becomes valuable. Run these queries against the database:

**Session 1 — Customer Language:**
Search competitive reviews for the themes that appear in the best-performing ad creatives. Do winning ads use the same language customers use?
```
Search reviews for: "thinning", "shedding", "growth", "results", "confidence"
```

**Session 2 — SEO Keywords:**
Query keyword rankings to find high-volume commercial-intent keywords. Are ads targeting these terms?
```
Query keyword_rankings for commercial and transactional intent keywords, sorted by search volume
```

**Session 3 — Reddit Conversations:**
Search Reddit threads for the concerns and questions real consumers have. Are ads addressing these?
```
Search threads for: "hair growth serum", "does it work", "results timeline", "side effects"
```

**Session 4 — Page Audit:**
Get the latest page audit to understand what happens AFTER the ad click.
```
Get the latest page_performance record and clarity_sources data
```

Key questions to answer:
- Facebook sends 74% of traffic but average scroll depth is only 20.76% — are ads setting expectations the page doesn't deliver above the fold?
- Which ad angles align with the highest-volume keywords?
- Do top-performing ads use customer language from reviews, or marketing language?
- Are there Reddit concerns (e.g., shedding timeline, hormonal hair loss) that no current ad addresses?

## Phase 4: Generate Recommendations

Based on the cross-referencing, generate:

1. **Performance Scorecard** — which campaigns/ad sets are working and which aren't, with specific reasons
2. **Ad Angle Recommendations** — 5-10 new ad angle ideas, each grounded in real customer data:
   - The angle (headline concept + hook)
   - The customer data supporting it (specific review quote, Reddit thread, or keyword volume)
   - Which audience segment it targets
   - Why it should work (connects to a proven pain point or desire)
3. **Landing Page Alignment** — specific mismatches between what ads promise and what the page delivers in the first 20% of scroll depth
4. **Budget Optimization** — where to shift spend based on performance + cross-session insights

## Phase 5: Save to Database and Generate Report

1. Save campaign performance data to the `meta_ads` table using the tool functions in `src/tools/ads.ts`:
   ```typescript
   import { insertAdBatch } from "./src/tools/ads.js";
   ```
   Each campaign/ad set becomes a row with: campaignId, campaignName, adSetName, spend, impressions, clicks, conversions, roas, ctr, cpc.

2. Generate the report at `reports/meta-ads-analysis.md` with all sections from Phase 4.

## Fallback

If the Meta Ads MCP is not connected or fails:
- Check that you ran `claude mcp add meta-ads --transport sse https://mcp.pipeboard.co/meta-ads-mcp` outside Claude Code
- Re-enter Claude Code and verify with: "What MCP tools do you have? List any Meta Ads tools."
- If still unavailable, you can analyze the Clarity traffic source data from Session 4 which shows that 74% of traffic comes from Facebook — this gives a starting point for ad-to-page alignment analysis even without live campaign data.

## Tips

- Start with `get_ad_accounts` — everything else needs the account ID
- Use `get_insights` with `date_preset=last_30d` for a meaningful performance window
- When pulling creatives, focus on the top 3-5 performers and bottom 3-5 — the middle is less interesting
- The most valuable output is the ad angle recommendations grounded in customer data — this is what the client can act on immediately
- Cross-reference is what makes this different from just looking at Meta Ads Manager directly
