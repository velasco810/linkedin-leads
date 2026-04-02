# linkedin

A [Claude Code](https://claude.com/claude-code) plugin that scrapes LinkedIn connections and search results, then uses AI to rank and tier the best matches based on your criteria.

Three built-in workflows:

- **`/linkedin:leads`** — Find sales prospects matching your ideal customer profile
- **`/linkedin:advisors`** — Find advisory board candidates based on expertise gaps
- **`/linkedin:vcs`** — Find investors that fit your raise

Give it a LinkedIn URL and describe what you're looking for in plain English. It scrapes the profiles, reads every headline, and returns a ranked top-30 list organized into tiers.

## Prerequisites

- **Node.js 18+** — [Install](https://nodejs.org/)
- **Claude Code 1.0.33+** — [Install](https://claude.com/claude-code)
- **LinkedIn account** — You'll log in through a browser window on first use

## Installation

```bash
git clone https://github.com/velasco810/claude-code-linkedin.git
cd claude-code-linkedin
npm install
```

This installs [Playwright](https://playwright.dev/) and downloads Chromium automatically.

### Load the plugin in Claude Code

```bash
claude --plugin-dir /path/to/linkedin
```

Or from inside the repo:

```bash
claude --plugin-dir .
```

## Quick Start

From a Claude Code session with the plugin loaded:

```
/linkedin:leads
```

This walks you through the full workflow interactively — it asks for the LinkedIn URL, what kind of leads you want, then scrapes and ranks them.

## Skills

### `/linkedin:leads`

Find and rank sales leads based on your ideal customer profile.

```
/linkedin:leads CISOs at AI-native SaaS companies
```

Asks for: target person's name, LinkedIn URL, scrape type, and ICP description.

### `/linkedin:advisors`

Find and rank advisory board candidates based on expertise gaps and company stage.

```
/linkedin:advisors enterprise sales leadership for a Series A AI security startup
```

Asks for: target person's name, LinkedIn URL, scrape type, expertise gaps, and company stage.

### `/linkedin:vcs`

Find and rank VC investors that fit your raise.

```
/linkedin:vcs Seed round, $3M, AI security — hands-on operator VCs
```

Asks for: target person's name, LinkedIn URL, scrape type, raise details, and investor preferences.

### `/linkedin:scrape`

Scrape LinkedIn profiles into a local JSON file. Used internally by the workflow skills, but can be run standalone.

```
/linkedin:scrape <person> <connections|search> [linkedin-url]
```

| Arg | Description |
|-----|-------------|
| `person` | Label for whose data this is (becomes the output folder name) |
| `type` | `connections` — scrape a connections page (infinite scroll) |
| | `search` — scrape search results (paginated) |
| `url` | LinkedIn URL to scrape (optional; uses defaults) |

**Examples:**

```
/linkedin:scrape eduardo connections
/linkedin:scrape aum search "https://www.linkedin.com/search/results/people/?connectionOf=..."
```

**Output:** `output/<person>/connections.json` or `output/<person>/search-results.json`

### `/linkedin:analyze`

Rank and tier scraped profiles using AI analysis. Used internally by the workflow skills, but can be run standalone.

```
/linkedin:analyze <person> <criteria> [leads|advisors|vcs]
```

| Arg | Description |
|-----|-------------|
| `person` | Matches the folder name from scraping |
| `criteria` | Plain English description of who you're looking for |
| `mode` | `leads` (default), `advisors`, or `vcs` — changes the AI's evaluation lens |

Each mode uses a different agent persona:
- **leads** — thinks like a sales strategist (decision-makers, budget-holders, champions)
- **advisors** — thinks like an executive talent scout (domain expertise, operator experience, board track record)
- **vcs** — thinks like a fundraising strategist (stage fit, thesis alignment, value-add potential)

**Output:**
- Tiered table displayed in the terminal
- `output/<person>/ranked-{mode}.json` — Full ranked list as JSON
- `output/<person>/top-30-{mode}.csv` — CSV for sharing

## Standalone Scraper

You can also run the scraper directly without Claude Code:

```bash
node scrape-connections.js --name aum --type search --url "https://www.linkedin.com/search/results/people/?..."
```

Run `node scrape-connections.js --help` for all options:

| Flag | Description | Default |
|------|-------------|---------|
| `--name` | Person label (required, alphanumeric/hyphens/underscores only) | — |
| `--type` | `connections` or `search` | `connections` |
| `--url` | LinkedIn URL (must be `https://www.linkedin.com/...`) | Type-specific default |
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

### Ranked Results JSON

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

2. **Analysis** — Claude Code agents read every profile's name and headline, then reason about fit against your criteria using natural language. No keyword matching or scoring scripts — the AI uses judgment, just like a human reviewing a list. The agent persona changes based on mode (sales strategist, talent scout, or fundraising strategist).

3. **Output** — Results are ranked into three tiers with mode-specific labels and a one-line reason for each. Saved as both JSON and CSV.

## License

MIT
