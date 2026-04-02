# Contributing

## Development Setup

```bash
git clone https://github.com/velasco810/claude-code-linkedin.git
cd claude-code-linkedin
npm install
claude --plugin-dir .
```

`npm install` downloads Playwright and Chromium. `claude --plugin-dir .` loads the plugin so you can test skills interactively.

After making changes to skill files, run `/reload-plugins` inside Claude Code to pick them up without restarting.

## Project Structure

```
linkedin/
├── .claude-plugin/plugin.json     # Plugin manifest
├── skills/
│   ├── scrape/SKILL.md            # /linkedin:scrape — Playwright scraper wrapper
│   ├── analyze/SKILL.md           # /linkedin:analyze — AI ranking (leads/advisors/vcs modes)
│   ├── leads/SKILL.md             # /linkedin:leads — End-to-end sales lead workflow
│   ├── advisors/SKILL.md          # /linkedin:advisors — End-to-end advisor workflow
│   └── vcs/SKILL.md               # /linkedin:vcs — End-to-end investor workflow
├── scrape-connections.js           # Playwright scraper (standalone Node.js)
├── package.json
├── output/                         # Scraped data (gitignored)
└── .browser-data/                  # Persistent browser session (gitignored)
```

## Code Style

**Scraper** (`scrape-connections.js`): Single-file Node.js. Named constants for magic numbers and CSS selectors. JSDoc on public functions. Sections separated by comment dividers: CLI, DOM extraction, scraping strategies, output, browser management, main.

**Skills** (`skills/*/SKILL.md`): YAML frontmatter with `name`, `description`, `allowed-tools`. The three workflow skills (`leads`, `advisors`, `vcs`) invoke `scrape` and `analyze` as sub-skills. The `analyze` skill accepts a `mode` parameter that switches the agent persona — this is where ranking behavior differs between the three workflows.

## Modifying the Scraper

If LinkedIn changes its DOM structure:

1. Run a scrape and check `output/<name>/<type>-card-html.txt` for current HTML samples
2. Update the relevant extraction function (`extractSearchResults` or `extractConnections`) in `scrape-connections.js`
3. If selectors change, update the `SELECTORS` constant at the top of the file
4. Test: `node scrape-connections.js --name test --type search --url "https://www.linkedin.com/search/results/people/?..."`
5. Verify the output JSON has correct `name`, `headline`, and `profileUrl` fields

## Adding a New Skill

1. Create `skills/<skill-name>/SKILL.md`
2. Add YAML frontmatter: `name`, `description`, `allowed-tools`
3. Set `disable-model-invocation: true` if it should only be user-invoked (not auto-triggered)
4. Test with `claude --plugin-dir .` and run `/linkedin:<skill-name>`

## Adding an Analysis Mode

To add a new mode to the analyze skill (e.g., `partners`):

1. Add a new "Mode: `partners`" section in `skills/analyze/SKILL.md` with the agent persona and evaluation criteria
2. Add tier definitions for the new mode
3. Add a row to the output labels table (header, file prefix)
4. Create `skills/partners/SKILL.md` as the end-to-end workflow that invokes analyze with the new mode

## Pull Requests

- One feature or fix per PR
- Test with `claude --plugin-dir .` before submitting
- If you modify the scraper, include sample output showing it works
- If you modify a skill, describe the workflow you tested

## Reporting Issues

Include:
- What you ran (skill name + arguments, or CLI command)
- What you expected vs. what happened
- `output/<name>/meta.json` and `<type>-card-html.txt` if it's a scraping issue
