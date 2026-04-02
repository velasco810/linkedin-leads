---
name: scrape
description: Scrape LinkedIn connections or search results for a person using Playwright
argument-hint: <person> <connections|search> [linkedin-url]
allowed-tools: Bash, Read
---

# LinkedIn Scraper

Scrape LinkedIn profiles from a connections page or search results page.

## Arguments

- `$0` — Person name (used as output folder, e.g. "eduardo", "aum")
- `$1` — Type: `connections` (infinite scroll) or `search` (paginated)
- `$2` — LinkedIn URL to scrape (optional; uses default if omitted)

## Steps

1. **Install dependencies** (if not already installed):

```bash
cd ${CLAUDE_SKILL_DIR}/../.. && npm install --silent 2>&1 | tail -3
```

2. **Run the scraper**:

```bash
cd ${CLAUDE_SKILL_DIR}/../.. && node scrape-connections.js --name "$0" --type "$1" --url "$2"
```

If `$2` is empty, omit the `--url` flag so the scraper uses its default URL for the type.

3. **Report results** — After the scraper finishes, read the metadata:

```bash
cat ${CLAUDE_SKILL_DIR}/../../output/$0/meta.json
```

Report:
- Number of profiles scraped
- Output file path
- Timestamp

4. **Suggest next step**:

> To analyze and rank these profiles, run:
> `/linkedin:analyze $0 "<your ranking criteria>"`
