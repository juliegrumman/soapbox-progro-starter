# Session 1: Competitive Review Analysis

Turn thousands of competitor reviews into a competitive intelligence report — in 60 minutes.

## What You'll Need

- A laptop with Claude Code installed (see SETUP.md if you haven't done this yet)
- A terminal (Mac: Terminal app, Windows: PowerShell)
- An internet connection

## Step 1: Clone the Project

Open your terminal and paste this command:

```
git clone https://github.com/juliegrumman/soapbox-progro-starter.git
```

This downloads the project to a folder called `soapbox-progro-starter` on your computer.

## Step 2: Open Claude Code

```
cd soapbox-progro-starter && claude
```

This moves into the project folder and starts Claude Code. You should see Claude's prompt appear.

## Step 3: Install Dependencies

Type this into Claude Code:

```
npm install
```

Wait for it to finish. This installs the tools Claude needs to query the database.

## Step 4: Open Drizzle Studio (Optional)

To visually explore the database, open a **second terminal window**, navigate to the project folder, and run:

```
cd soapbox-progro-starter
npx drizzle-kit studio
```

This opens a browser-based database viewer where you can see tables, run queries, and watch data populate in real time as Claude works. Keep this open alongside Claude Code during the session.

## Step 5: Collect Competitor Reviews

The database starts empty — let's populate it. Type this into Claude Code:

```
Run the competitive review collection skill. Scrape reviews for all competitors and seed the database.
```

Claude will run the Python scraper to pull reviews from competitor product pages, normalize them into CSVs, and import them into the SQLite database. If you have Drizzle Studio open, you'll see the `competitive_reviews` table fill up in real time.

**This takes a few minutes.** You'll see Claude working through each competitor one at a time.

**What just happened:** Claude read a skill file that describes *how* to collect reviews, then autonomously executed the scraper, handled the data pipeline, and loaded everything into the database — all from a single prompt.

## Step 6: Warm-Up — See What Claude Knows

Type this prompt into Claude Code exactly as written:

```
What project is this? How many competitor reviews do we have, and what are the average ratings?
```

Claude will read the project context file (CLAUDE.md), find the database, query it, and report back with review counts and ratings for each competitor. This takes about 15 seconds.

**What just happened:** Claude read CLAUDE.md — a file that describes the entire project — and used that context to find and query the database on its own. That's the power of project context.

### Optional: Explore the Data

If you have a couple of extra minutes, try this:

```
Show me 5 one-star reviews from our lowest-rated competitor. What are people complaining about?
```

This grounds you in the raw data before the big analysis.

## Step 7: Run the Competitive Intelligence Analysis

This is the main event. Type this prompt:

```
Run the competitive intelligence analysis. Analyze all reviews in the database and save the report to reports/competitive-intelligence-report.md
```

Claude will now:
1. Query the database to understand what competitors and reviews are available
2. Run quantitative analysis across the full dataset (ratings, trends, distributions)
3. Read a stratified sample of reviews for qualitative analysis (language, objections, gaps)
4. Synthesize everything into a structured report
5. Save the report to the `reports/` folder

**This takes several minutes.** Craig will narrate what's happening on screen while you wait.

## Step 8: Find Your Report

Your report is saved at:

```
reports/competitive-intelligence-report.md
```

You can ask Claude to show you specific sections:

```
Show me the executive summary from the report you just created
```

Or:

```
What are the top 3 objection patterns from the report?
```

## What's in the Report

1. **Executive Summary** — The 5 most actionable findings
2. **Competitor Scorecard** — At-a-glance comparison across 5 dimensions
3. **Customer Language Database** — Exact phrases for ad copy and landing pages
4. **Objection Patterns** — What customers complain about, ranked by frequency
5. **Feature Gaps** — Unmet needs your product can address
6. **Sentiment Trends** — Is each competitor improving or declining over time?
7. **Customer Personas** — Distinct buyer types and who's underserved

## Troubleshooting

**"command not found: claude"**
Claude Code isn't installed yet. See SETUP.md for installation instructions.

**"no such table: competitive_reviews"**
The database file may not have downloaded correctly. Try re-cloning the repo.

**Claude seems stuck or is taking a very long time**
The analysis can take up to 10 minutes for large datasets. If it's been longer than that, type `Ctrl+C` to stop and try the prompt again. Craig will have a pre-generated report to show as backup.

**"npm install" errors**
Make sure you have Node.js installed (version 18 or higher). Check with `node --version` in your terminal.

## Homework

Read the full report. Find 3 insights that are relevant to your own brand or product line. Bring them to Session 2.

## What's Next

**Session 2:** We take the customer language we just extracted and turn it into an SEO keyword strategy. Claude will check where Soapbox ranks for those terms and find opportunities competitors are missing.
