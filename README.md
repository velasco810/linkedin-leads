# linkedin-leads

A [Claude Code](https://claude.com/claude-code) plugin that scrapes LinkedIn connections and search results, then uses AI to rank and tier the best leads based on your criteria.

Give it a LinkedIn URL and describe who you're looking for in plain English. It scrapes the profiles, reads every headline, and returns a ranked top-30 list organized into tiers — with LinkedIn URLs you can click through.

## Prerequisites

- **Node.js 18+** — [Install](https://nodejs.org/)
- **Claude Code 1.0.33+** — [Install](https://claude.com/claude-code)
- **LinkedIn account** — You'll log in through a browser window on first use

## Installation

```bash
git clone https://github.com/velasco810/linkedin-leads.git
cd linkedin-leads
npm install
```

This installs [Playwright](https://playwright.dev/) and downloads Chromium automatically.

### Load the plugin in Claude Code

```bash
claude --plugin-dir ./linkedin-leads
```

Or from inside the repo:

```bash
claude --plugin-dir .
```

## Quick Start

The fastest way to get going:

```
/linkedin-leads:leads
```

This walks you through the full workflow interactively — it'll ask for the LinkedIn URL, what kind of leads you want, then scrape and rank them.

## Skills

### `/linkedin-leads:scrape`

Scrape LinkedIn profiles into a local JSON file.

```
/linkedin-leads:scrape <person> <connections|search> [linkedin-url]
```

**Arguments:**

| Arg | Description |
|-----|-------------|
| `person` | Label for whose data this is (becomes the output folder name) |
| `type` | `connections` — scrape a connections page (infinite scroll) |
| | `search` — scrape search results (paginated) |
| `url` | LinkedIn URL to scrape (optional; uses defaults) |

**Examples:**

```
# Scrape your own connections
/linkedin-leads:scrape eduardo connections

# Scrape a search results page for someone's network
/linkedin-leads:scrape aum search "https://www.linkedin.com/search/results/people/?connectionOf=..."
```

**Output:** `output/<person>/connections.json` or `output/<person>/search-results.json`

### `/linkedin-leads:analyze`

Rank and tier scraped profiles using AI analysis.

```
/linkedin-leads:analyze <person> <criteria>
```

**Arguments:**

| Arg | Description |
|-----|-------------|
| `person` | Matches the folder name from scraping |
| `criteria` | Plain English description of who you're looking for |

**Examples:**

```
/linkedin-leads:analyze aum "CISOs and security leaders at AI-native tech companies with external-facing AI"

/linkedin-leads:analyze eduardo "CROs, VPs of Sales, and RevOps leaders at companies with 50+ sellers"

/linkedin-leads:analyze aum "Heads of Data and VPs of Engineering at mid-size fintech startups"
```

**How it works:** Claude reads every profile and uses natural language reasoning to assess fit — no keyword matching or regex. It thinks like a sales strategist, considering role, company type, seniority, and context.

**Output:**
- Tiered table displayed in the terminal
- `output/<person>/ranked-leads.json` — Full ranked list as JSON
- `output/<person>/top-30.csv` — CSV for sharing

### `/linkedin-leads:leads`

Interactive end-to-end workflow that combines scraping and analysis.

```
/linkedin-leads:leads I need CISOs at AI companies from Aum's network
```

Walks you through: gathering URLs → checking for existing data → scraping → ranking → summary.

## Standalone Scraper

You can also run the scraper directly without Claude Code:

```bash
node scrape-connections.js --name aum --type search --url "https://www.linkedin.com/search/results/people/?..."
```

Run `node scrape-connections.js --help` for all options:

| Flag | Description | Default |
|------|-------------|---------|
| `--name` | Person label (required) | — |
| `--type` | `connections` or `search` | `connections` |
| `--url` | LinkedIn URL | Type-specific default |
| `--output` | Output filename | `connections.json` / `search-results.json` |
| `--headless` | Run browser without UI | `false` |
| `--timeout` | Login wait in seconds | `300` |
| `--keep-open` | Keep browser open after scraping | `false` |

## Output Format

### Profile JSON

```json
{
  "name": "Jane Smith",
  "headline": "VP of Engineering at Acme Corp",
  "location": "San Francisco, CA",
  "profileUrl": "https://www.linkedin.com/in/janesmith/"
}
```

`location` is only present for search results; connections don't include it.

### Ranked Leads JSON

```json
{
  "rank": 1,
  "name": "Jane Smith",
  "headline": "VP of Engineering at Acme Corp",
  "profileUrl": "https://www.linkedin.com/in/janesmith/",
  "tier": 1,
  "reason": "VP Eng at an AI-native SaaS company shipping external-facing agents"
}
```

### Metadata

Each scrape saves `meta.json`:

```json
{
  "name": "aum",
  "type": "search",
  "url": "https://www.linkedin.com/search/results/people/?...",
  "scrapedAt": "2026-03-17T19:00:36.238Z",
  "count": 427
}
```

## How It Works

1. **Scraping** — Uses [Playwright](https://playwright.dev/) to automate a real Chromium browser. It opens visibly (not headless) because LinkedIn detects headless browsers. On first run, you log in manually; the session persists in `.browser-data/` for future runs.

2. **Analysis** — Claude Code agents read every profile's name and headline, then reason about fit against your criteria using natural language. No keyword matching or scoring scripts — the AI uses judgment, just like a human SDR reviewing a list.

3. **Output** — Results are ranked into three tiers (Top Priority, Strong Matches, Worth Exploring) with a one-line reason for each. Saved as both JSON and CSV.

## License

MIT
