---
name: advisors
description: End-to-end LinkedIn advisor search — scrape a person's network and rank the best advisory board candidates
disable-model-invocation: true
argument-hint: [describe what expertise gaps you're filling]
allowed-tools: Bash, Read, Write, Glob, Grep, Agent, Skill
---

# LinkedIn Leads — Advisory Board

Find and rank potential advisors from a LinkedIn network based on your company's expertise gaps and stage.

## Instructions

### Step 1: Gather information

Ask the user for everything you need. If they provided details in `$ARGUMENTS`, use those and only ask for what's missing:

1. **Target person's name** — A short label used as the output folder (e.g. "eduardo", "aum")
2. **LinkedIn URL** — The connections page or search results URL to scrape
3. **Scrape type** — "connections" (their connections list) or "search" (a search results page)
4. **What gaps are you filling?** — What expertise or experience does your advisory board need? Examples:
   - "Enterprise sales leadership — someone who's built and led a $50M+ ARR sales org"
   - "AI/ML technical depth — published researchers or former ML leads at top labs"
   - "Regulatory and compliance — fintech or healthtech compliance veterans"
5. **Company stage context** — Brief description of your company so we can evaluate advisor fit (e.g. "Series A AI security startup", "Pre-seed dev tools company"). This helps distinguish advisors who are right for your stage vs. those better suited for later-stage companies.

### Step 2: Check for existing data

Look for existing scraped data:

```
${CLAUDE_SKILL_DIR}/../../output/<person>/meta.json
```

If data exists, tell the user:
> "I found existing data for **[person]** — [count] profiles scraped on [date] from [url]. Want to use this data or re-scrape?"

If no data exists, proceed to scraping.

### Step 3: Scrape (if needed)

Before invoking the scraper, set expectations:

> **Starting scrape** of [person]'s [connections/search results]
> - A Chromium browser window will open (this is expected)
> - Typical scrape time: 10-15 minutes depending on connection count (one-time — you won't need to re-scrape to run different analyses)
> - You'll see real-time progress in the terminal

Invoke the scrape skill:

```
/linkedin:scrape <person> <type> <url>
```

Wait for it to complete.

### Step 3.5: Post-scrape report

After scraping completes, read `${CLAUDE_SKILL_DIR}/../../output/<person>/progress.json` and display:

> **Scrape complete:** [count] profiles in [duration] ([rate] profiles/min)
> Starting advisor analysis...

### Step 4: Analyze

Build the criteria string from the user's gaps and stage context, then invoke the analyze skill in advisors mode:

```
/linkedin:analyze <person> <gaps + stage context as criteria> advisors
```

### Step 5: Summary

After analysis completes, provide a final wrap-up:

> **Advisory search complete**
> - Scrape: [count] profiles in [duration]
> - Analysis: [agent_count] agents, ~[tokens]K tokens, [duration]
> - Total wall time: ~[total]
> - Results: [tier1_count] Tier 1 / [tier2_count] Tier 2 / [tier3_count] Tier 3

Then:
- Top 5 advisor candidates and what makes each one valuable
- File locations for the full ranked list
- Offer to format results for WhatsApp, email, or CSV if the user wants to share them
