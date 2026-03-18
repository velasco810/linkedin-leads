# Contributing to linkedin-leads

Thanks for considering a contribution! This project is a Claude Code plugin for LinkedIn lead generation.

## Development Setup

1. **Clone the repo:**

```bash
git clone https://github.com/velasco810/linkedin-leads.git
cd linkedin-leads
```

2. **Install dependencies:**

```bash
npm install
```

This installs Playwright and downloads Chromium.

3. **Test the plugin locally:**

```bash
claude --plugin-dir .
```

4. **Reload after changes:**

Inside Claude Code, run `/reload-plugins` to pick up changes to skills without restarting.

## Project Structure

```
linkedin-leads/
├── .claude-plugin/plugin.json    # Plugin manifest
├── skills/
│   ├── scrape/SKILL.md           # /linkedin-leads:scrape
│   ├── analyze/SKILL.md          # /linkedin-leads:analyze
│   └── leads/SKILL.md            # /linkedin-leads:leads
├── scrape-connections.js          # Playwright scraper
├── package.json
├── output/                        # Scraped data (gitignored)
└── .browser-data/                 # Browser session (gitignored)
```

## Code Style

- **Scraper**: Single-file Node.js. Named constants for all magic numbers. JSDoc on public functions. Clean separation between CLI parsing, DOM extraction, scraping strategies, and browser management.
- **Skills**: SKILL.md files with YAML frontmatter. Keep instructions clear and specific. The analyze skill is the most critical — it must enforce natural language reasoning (no regex/keyword matching) and data isolation rules.

## Adding a New Extraction Strategy

If LinkedIn changes its DOM structure:

1. Run the scraper and check `output/<name>/<type>-card-html.txt` for current HTML samples
2. Update the relevant extraction function (`extractSearchResults` or `extractConnections`) in `scrape-connections.js`
3. Test with a small scrape: `node scrape-connections.js --name test --type search --url "..."`
4. Verify the output JSON has correct `name`, `headline`, and `profileUrl` fields

## Adding a New Skill

1. Create `skills/<skill-name>/SKILL.md`
2. Add YAML frontmatter with `name`, `description`, and `allowed-tools`
3. Set `disable-model-invocation: true` if it should only be user-invoked
4. Test with `claude --plugin-dir .` and run `/linkedin-leads:<skill-name>`

## Pull Requests

- Keep PRs focused — one feature or fix per PR
- Test your changes with `claude --plugin-dir .` before submitting
- If you modify the scraper, include sample output showing it works
- If you modify a skill, describe the workflow you tested

## Reporting Issues

Open an issue with:
- What you ran (skill name + arguments, or CLI command)
- What you expected
- What actually happened
- Contents of `output/<name>/meta.json` and `<type>-card-html.txt` if it's a scraping issue
