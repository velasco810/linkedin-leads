---
name: vcs
description: End-to-end LinkedIn investor search — scrape a person's network and rank the best VC matches for your raise
disable-model-invocation: true
argument-hint: [describe your raise and ideal investor profile]
allowed-tools: Bash, Read, Write, Glob, Grep, Agent, Skill
---

# LinkedIn Leads — Investor Search

Find and rank potential VC investors from a LinkedIn network based on your raise details and ideal investor profile.

## Instructions

### Step 1: Gather information

Ask the user for everything you need. If they provided details in `$ARGUMENTS`, use those and only ask for what's missing:

1. **Target person's name** — A short label used as the output folder (e.g. "eduardo", "aum")
2. **LinkedIn URL** — The connections page or search results URL to scrape
3. **Scrape type** — "connections" (their connections list) or "search" (a search results page)
4. **What are you raising?** — Stage, target amount, and sector. Examples:
   - "Seed round, $3M, AI security for enterprise"
   - "Series A, $15M, developer tools for platform engineering"
   - "Pre-seed, $1.5M, vertical SaaS for construction"
5. **What kind of investor do you want?** — What matters beyond the check? Examples:
   - "Hands-on operator VCs who've built enterprise sales motions"
   - "Sector-specific funds with deep cybersecurity portfolios"
   - "Solo GPs or small funds where we'd be a top-3 bet"

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
> Starting investor analysis...

### Step 4: Analyze

Build the criteria string from the user's raise details and investor preferences, then invoke the analyze skill in vcs mode:

```
/linkedin:analyze <person> <raise + investor preferences as criteria> vcs
```

### Step 5: Summary

After analysis completes, provide a final wrap-up:

> **Investor search complete**
> - Scrape: [count] profiles in [duration]
> - Analysis: [agent_count] agents, ~[tokens]K tokens, [duration]
> - Total wall time: ~[total]
> - Results: [tier1_count] Tier 1 / [tier2_count] Tier 2 / [tier3_count] Tier 3

Then:
- Top 5 investor matches and why each one fits your raise
- File locations for the full ranked list
- Offer to format results for WhatsApp, email, or CSV if the user wants to share them
