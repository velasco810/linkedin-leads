---
name: leads
description: End-to-end LinkedIn lead generation — scrape a person's network and rank the best matches
disable-model-invocation: true
argument-hint: [describe what you're looking for]
allowed-tools: Bash, Read, Write, Glob, Grep, Agent, Skill
---

# LinkedIn Leads — Full Workflow

Guide the user through a complete lead generation workflow: scrape LinkedIn data, then rank and tier the results.

## Instructions

### Step 1: Gather information

Ask the user for everything you need. If they provided details in `$ARGUMENTS`, use those and only ask for what's missing:

1. **Target person's name** — A short label used as the output folder (e.g. "eduardo", "aum")
2. **LinkedIn URL** — The connections page or search results URL to scrape
3. **Scrape type** — "connections" (their connections list) or "search" (a search results page)
4. **Ranking criteria** — What kinds of people are they looking for? Be specific. Examples:
   - "CISOs, Heads of Security, and AI Engineering leaders at AI-native SaaS companies"
   - "CROs, VPs of Sales, and RevOps leaders at companies with 50+ sellers"
   - "Heads of Data and VPs of Engineering at mid-size fintech startups"

### Step 2: Check for existing data

Look for existing scraped data:

```
${CLAUDE_SKILL_DIR}/../../output/<person>/meta.json
```

If data exists, tell the user:
> "I found existing data for **[person]** — [count] profiles scraped on [date] from [url]. Want to use this data or re-scrape?"

If no data exists, proceed to scraping.

### Step 3: Scrape (if needed)

Invoke the scrape skill:

```
/linkedin-leads:scrape <person> <type> <url>
```

Wait for it to complete. The scraper opens a visible browser window — let the user know this is expected.

### Step 4: Analyze

Invoke the analyze skill with the user's criteria:

```
/linkedin-leads:analyze <person> <criteria>
```

### Step 5: Summary

After analysis completes, provide a brief wrap-up:
- Total profiles analyzed
- Number in each tier
- Top 5 names and why they stand out
- File locations for the full ranked list
- Offer to format results for WhatsApp, email, or CSV if the user wants to share them
