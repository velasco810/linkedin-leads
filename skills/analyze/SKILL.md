---
name: analyze
description: Rank and tier LinkedIn profiles from scraped data based on free-form criteria using AI analysis
argument-hint: <person> <ranking criteria in plain English>
allowed-tools: Read, Write, Glob, Grep, Agent
---

# LinkedIn Lead Analysis & Ranking

Analyze scraped LinkedIn profiles and produce a ranked, tiered list of the top 30 leads based on the user's criteria.

## Arguments

- `$0` — Person name (matches the output folder from scraping)
- `$1` — Ranking criteria in natural language (e.g. "CISOs and security leaders at AI-native tech companies")

## Data Source

Read from: `${CLAUDE_SKILL_DIR}/../../output/$0/`

Look for (in priority order):
1. `search-results.json` — Search result profiles
2. `connections.json` — Connection profiles

Also read `meta.json` for context (who was scraped, when, source URL).

## CRITICAL RULES — READ CAREFULLY

1. **Data isolation**: ONLY read files from the `output/$0/` folder. NEVER open, read, or reference data from any other person's folder. Each person's data is completely independent.

2. **No cross-referencing**: NEVER use the plugin user's own connections to enrich, filter, or cross-reference these results. The scraped data IS the complete dataset.

3. **No scripts**: YOU are the analyst. Never generate a Python/JS/shell script to do the analysis. Read the data and reason about it directly.

4. **Natural language reasoning**: Do NOT use keyword matching, regex filters, or static rules to score profiles. Read each profile's name and headline as a human would, and use your judgment about whether they fit the criteria.

## Error Handling

- If `output/$0/` does not exist, tell the user: "No data found for $0. Run `/linkedin-leads:scrape $0 <type> <url>` first."
- If the data file exists but is empty or contains no profiles, report: "Data file for $0 is empty (0 profiles). Try re-scraping."
- If `meta.json` is missing, proceed without it — the data file is sufficient.

## Analysis Process

### Step 1: Load and report

Read the data file. Report: "Found X profiles for [person] scraped on [date]."

### Step 1.5: Estimate and report

Before launching agents, calculate and display an estimate for the user:

- **Batch size**: ~175 profiles per batch
- **Number of batches**: ceil(profile_count / 175)
- **Number of agents**: min(batch_count, 3) per wave; if more than 3 batches, multiple waves
- **Estimated input tokens**: batches × (175 × 45 tokens/profile + 800 tokens system prompt)
- **Estimated output tokens**: agents × 1,500 tokens + 4,000 tokens for merge
- **Estimated time**: 45-90 seconds per wave (agents run in parallel)

Display to the user:

> **Analysis plan:** [X] profiles → [N] batches across [M] agents
> **Estimated tokens:** ~[T]K input, ~[O]K output
> **Estimated time:** [E] seconds

### Step 2: Batch and analyze

Split profiles into batches of ~175. Launch agents in waves of up to 3 parallel agents.

Each agent receives:

- The batch of profiles (as JSON)
- The user's ranking criteria
- These instructions:

> You are a senior sales strategist analyzing LinkedIn profiles.
>
> **Goal**: Find the best matches for: [CRITERIA]
>
> Read each profile's name and headline carefully. For each one, think about:
> - Does this person's role suggest they'd be a decision-maker, budget-holder, or champion for this goal?
> - Does their company/industry sound like the right fit?
> - What's their seniority level — can they actually sign a deal or make an introduction?
> - Is there anything in their headline that signals urgency or active need?
>
> Think like a sales strategist, not a search engine. A "VP Engineering" at an AI company is a very different lead than a "VP Engineering" at a construction firm — context matters.
>
> Return your top 15 candidates as a JSON array:
> ```json
> [{ "name": "...", "headline": "...", "profileUrl": "...", "reason": "1 sentence why" }]
> ```
>
> Be selective. Only include people who genuinely fit. Returning 5 great matches is better than 15 mediocre ones.
>
> End your response with a stats line: "Reviewed [N] profiles. Selected [M] candidates. Top pick: [name] — [reason]."

**Between waves** (if more than 3 batches), report:

> **Wave 1/2 complete:** [M] candidates from [N] profiles ([B] batches). Starting wave 2...

### Step 3: Merge, rank, and report

Collect results from all agents. Deduplicate by profileUrl. Re-rank the combined candidates into a final top 30, assigning tiers:

- **Tier 1** (ranks 1-12): Strongest fit — these people should be contacted first
- **Tier 2** (ranks 13-22): Strong fit — worth pursuing after Tier 1
- **Tier 3** (ranks 23-30): Adjacent or worth exploring — may need qualification

After ranking, display a completion summary:

> **Analysis complete**
> - Profiles reviewed: [total]
> - Candidates surfaced by agents: [count]
> - Final top 30 selected
> - Agents used: [count] ([waves] wave(s))
> - Estimated token usage: ~[T]K input, ~[O]K output

## Output

### Console display

Show a formatted table for each tier:

```
## Top 30 Leads from [person]'s Network
### Criteria: [user's criteria]

### Tier 1 — Top Priority
| # | Name | Headline | LinkedIn | Why |
|---|------|----------|----------|-----|
| 1 | ...  | ...      | url      | ... |

### Tier 2 — Strong Matches
...

### Tier 3 — Worth Exploring
...
```

Always include the full LinkedIn URL for each person — the user needs to be able to click through or copy-paste.

### File output

Save to `${CLAUDE_SKILL_DIR}/../../output/$0/`:

1. **`ranked-leads.json`**:
```json
[
  {
    "rank": 1,
    "name": "Person Name",
    "headline": "Their LinkedIn headline",
    "profileUrl": "https://www.linkedin.com/in/...",
    "tier": 1,
    "reason": "One-line explanation"
  }
]
```

2. **`top-30.csv`** with headers: `Rank,Name,Headline,LinkedIn URL,Tier,Reason`

Report the saved file paths when done.
