#!/usr/bin/env node

/**
 * LinkedIn Profile Scraper
 *
 * Scrapes LinkedIn connections (infinite scroll) or search results (paginated)
 * using Playwright with a persistent browser session.
 *
 * Usage:
 *   node scrape-connections.js --name <person> --type <connections|search> [options]
 *
 * See --help for full usage.
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const VALID_TYPES = ['connections', 'search'];

const DEFAULT_URLS = {
  connections: 'https://www.linkedin.com/mynetwork/invite-connect/connections/',
  search: 'https://www.linkedin.com/search/results/people/',
};

const DEFAULT_OUTPUT_FILES = {
  connections: 'connections.json',
  search: 'search-results.json',
};

const SCROLL_STEP_PX = 500;
const SCROLL_DELAY_MS = 700;
const STALE_ROUNDS_LIMIT = 12;
const STALE_ROUNDS_SHOW_MORE = 4;
const PROGRESS_SAVE_INTERVAL = 100;

const PAGE_LOAD_TIMEOUT_MS = 90_000;
const SELECTOR_TIMEOUT_MS = 15_000;
const LOGIN_TIMEOUT_DEFAULT_S = 300;
const INTER_PAGE_DELAY_MS = 2_000;
const MAX_CONSECUTIVE_EMPTY_PAGES = 3;

const BROWSER_DATA_DIR = path.join(__dirname, '.browser-data');
const OUTPUT_BASE_DIR = path.join(__dirname, 'output');

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

const HELP_TEXT = `
LinkedIn Profile Scraper

Usage:
  node scrape-connections.js --name <person> [--type <type>] [--url <url>] [options]

Required:
  --name <person>        Label for the person being scraped (used as output folder)

Options:
  --type <type>          "connections" (infinite scroll) or "search" (paginated)
                         Default: connections
  --url <url>            LinkedIn URL to scrape
                         Default: connections page or search results page
  --output <file>        Output filename (default: connections.json or search-results.json)
  --headless             Run browser in headless mode (default: visible)
  --timeout <seconds>    Login wait timeout (default: ${LOGIN_TIMEOUT_DEFAULT_S}s)
  --keep-open            Keep browser open after scraping (default: close immediately)
  --help, -h             Show this help message

Examples:
  # Scrape your own connections
  node scrape-connections.js --name eduardo

  # Scrape search results for a target person's network
  node scrape-connections.js --name aum --type search \\
    --url "https://www.linkedin.com/search/results/people/?connectionOf=..."

  # Re-scrape with custom output file
  node scrape-connections.js --name eduardo --output connections-v2.json
`.trim();

/**
 * Parse and validate CLI arguments.
 * @returns {Object} Validated options
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const opts = {
    name: null,
    type: 'connections',
    url: null,
    output: null,
    headless: false,
    timeout: LOGIN_TIMEOUT_DEFAULT_S,
    keepOpen: false,
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--help':
      case '-h':
        console.log(HELP_TEXT);
        process.exit(0);
      case '--name':
        opts.name = args[++i];
        break;
      case '--type':
        opts.type = args[++i];
        break;
      case '--url':
        opts.url = args[++i];
        break;
      case '--output':
        opts.output = args[++i];
        break;
      case '--headless':
        opts.headless = true;
        break;
      case '--timeout':
        opts.timeout = parseInt(args[++i], 10);
        break;
      case '--keep-open':
        opts.keepOpen = true;
        break;
      default:
        console.error(`Unknown argument: ${args[i]}\nRun with --help for usage.`);
        process.exit(1);
    }
  }

  if (!opts.name) {
    console.error('Error: --name is required.\n\nExample: node scrape-connections.js --name myname\nRun with --help for full usage.');
    process.exit(1);
  }

  if (!VALID_TYPES.includes(opts.type)) {
    console.error(`Error: --type must be one of: ${VALID_TYPES.join(', ')} (got "${opts.type}")`);
    process.exit(1);
  }

  if (opts.timeout <= 0 || isNaN(opts.timeout)) {
    console.error('Error: --timeout must be a positive number of seconds.');
    process.exit(1);
  }

  opts.url = opts.url || DEFAULT_URLS[opts.type];
  opts.output = opts.output || DEFAULT_OUTPUT_FILES[opts.type];

  return opts;
}

// ---------------------------------------------------------------------------
// DOM Extraction Strategies (evaluated in-browser via page.evaluate)
// ---------------------------------------------------------------------------

/**
 * Extract profiles from LinkedIn search results.
 * Targets div[role="listitem"] cards with structured <p> elements.
 */
function extractSearchResults() {
  const results = [];
  const seen = new Set();
  const cards = document.querySelectorAll('div[role="listitem"]');

  for (const card of cards) {
    const profileLink = card.querySelector('a[href*="/in/"]');
    if (!profileLink) continue;

    const href = profileLink.href;
    if (!href || !href.includes('linkedin.com/in/')) continue;

    const profileUrl = href.split('?')[0];
    if (seen.has(profileUrl)) continue;
    seen.add(profileUrl);

    // Name: prefer figure aria-label (consistent), fall back to link text
    const figure = card.querySelector('figure[aria-label]');
    const name = (figure && figure.getAttribute('aria-label'))
      || profileLink.textContent.trim()
      || '';

    // Collect paragraph text, filtering out connection degree and noise
    const pTexts = [];
    for (const p of card.querySelectorAll('p')) {
      const text = p.textContent.trim();
      if (text) pTexts.push(text);
    }

    const contentTexts = pTexts.filter(t => {
      if (/• (1st|2nd|3rd)/.test(t)) return false;
      if (t === name) return false;
      if (/^\d+ mutual connection/.test(t)) return false;
      return true;
    });

    if (name) {
      results.push({
        name,
        headline: contentTexts[0] || '',
        location: contentTexts[1] || '',
        profileUrl,
      });
    }
  }

  return results;
}

/**
 * Extract profiles from the LinkedIn connections page.
 * Walks up from profile links to find card containers, then extracts text nodes.
 */
function extractConnections() {
  const NOISE = new Set([
    'Message', 'Connect', 'More', 'Send', 'Note',
    'Remove connection', '...', 'Manage', 'Follow',
    'Pending', 'View profile',
  ]);

  const results = [];
  const seen = new Set();
  const links = document.querySelectorAll('a[href*="/in/"]');

  for (const link of links) {
    const href = link.href;
    if (!href || !href.includes('linkedin.com/in/')) continue;

    const profileUrl = href.split('?')[0];
    if (seen.has(profileUrl)) continue;
    seen.add(profileUrl);

    // Walk up DOM to find the card container
    let card = link.parentElement;
    for (let i = 0; i < 5; i++) {
      if (!card || !card.parentElement) break;
      if (card.parentElement.querySelectorAll('a[href*="/in/"]').length > 3) break;
      card = card.parentElement;
    }
    if (!card) continue;

    // Collect leaf text nodes, skipping buttons
    const textNodes = [];
    const walker = document.createTreeWalker(card, NodeFilter.SHOW_TEXT, null, false);
    let node;
    while ((node = walker.nextNode())) {
      const text = node.textContent.trim();
      if (text.length < 2) continue;
      if (node.parentElement && node.parentElement.closest('button')) continue;
      textNodes.push(text);
    }

    // Filter noise
    const meaningful = textNodes.filter(t => {
      if (t.length < 2 || t.length > 300) return false;
      if (/^\d+ connections?$/.test(t)) return false;
      if (/^\d+ mutual connections?$/.test(t)) return false;
      if (/^\d+ (day|week|month|year|hour|minute)s? ago$/.test(t)) return false;
      if (/^(1st|2nd|3rd)$/.test(t)) return false;
      if (NOISE.has(t)) return false;
      if (t.startsWith('Connected')) return false;
      return true;
    });

    if (meaningful.length >= 1) {
      results.push({
        name: meaningful[0],
        headline: meaningful[1] || '',
        profileUrl,
      });
    }
  }

  return results;
}

// ---------------------------------------------------------------------------
// Scraping Strategies
// ---------------------------------------------------------------------------

/**
 * Scrape connections page using infinite scroll.
 * @param {import('playwright').Page} page
 * @param {Map} allResults - Accumulated results map (profileUrl -> profile)
 * @param {Function} onProgress - Progress callback
 */
async function scrapeWithInfiniteScroll(page, allResults, onProgress) {
  let staleRounds = 0;
  let scrollPosition = 0;

  while (staleRounds < STALE_ROUNDS_LIMIT) {
    const visible = await page.evaluate(extractConnections);
    let newCount = 0;

    for (const profile of visible) {
      if (!allResults.has(profile.profileUrl)) {
        allResults.set(profile.profileUrl, {
          name: profile.name,
          headline: profile.headline,
          profileUrl: profile.profileUrl,
        });
        newCount++;
      }
    }

    if (newCount === 0) {
      staleRounds++;
    } else {
      staleRounds = 0;
      console.log(`  ${allResults.size} profiles (+${newCount} new)`);
    }

    // Scroll down
    scrollPosition += SCROLL_STEP_PX;
    await page.evaluate((pos) => window.scrollTo({ top: pos, behavior: 'smooth' }), scrollPosition);
    await page.waitForTimeout(SCROLL_DELAY_MS);

    // After several stale rounds, try clicking "Show More" / "Load More"
    if (staleRounds > STALE_ROUNDS_SHOW_MORE) {
      await page.evaluate(() => {
        const btn = [...document.querySelectorAll('button')].find(b => {
          const t = b.textContent.toLowerCase();
          return t.includes('show more') || t.includes('load more');
        });
        if (btn) btn.click();
      });
      scrollPosition += 3000;
      await page.evaluate((pos) => window.scrollTo({ top: pos, behavior: 'smooth' }), scrollPosition);
      await page.waitForTimeout(INTER_PAGE_DELAY_MS);
    }

    onProgress(allResults);
  }
}

/**
 * Scrape search results using pagination.
 * @param {import('playwright').Page} page
 * @param {Map} allResults - Accumulated results map (profileUrl -> profile)
 * @param {Function} onProgress - Progress callback
 */
async function scrapeWithPagination(page, allResults, onProgress) {
  let pageNum = 1;
  let consecutiveEmpty = 0;

  while (consecutiveEmpty < MAX_CONSECUTIVE_EMPTY_PAGES) {
    console.log(`  Page ${pageNum}...`);

    // Scroll to bottom to render all results on this page
    await autoScroll(page);

    const visible = await page.evaluate(extractSearchResults);
    let newCount = 0;

    for (const profile of visible) {
      if (!allResults.has(profile.profileUrl)) {
        allResults.set(profile.profileUrl, {
          name: profile.name,
          headline: profile.headline,
          location: profile.location,
          profileUrl: profile.profileUrl,
        });
        newCount++;
      }
    }

    if (newCount === 0) {
      consecutiveEmpty++;
    } else {
      consecutiveEmpty = 0;
      console.log(`  ${allResults.size} profiles (+${newCount} new from page ${pageNum})`);
    }

    onProgress(allResults);

    // Navigate to next page
    const hasNext = await page.evaluate(() => {
      const nextBtn = document.querySelector('button[aria-label="Next"]')
        || [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Next');
      if (nextBtn && !nextBtn.disabled) {
        nextBtn.click();
        return true;
      }
      return false;
    });

    if (!hasNext) {
      console.log('  No more pages.');
      break;
    }

    pageNum++;
    await page.waitForTimeout(INTER_PAGE_DELAY_MS);
    await page.waitForSelector('a[href*="/in/"]', { timeout: SELECTOR_TIMEOUT_MS }).catch(() => {});
  }
}

/**
 * Scroll to bottom of page to trigger lazy-loaded content.
 * @param {import('playwright').Page} page
 */
async function autoScroll(page) {
  await page.evaluate(async () => {
    const step = 400;
    const delay = 300;
    const maxHeight = document.body.scrollHeight;
    for (let pos = 0; pos < maxHeight; pos += step) {
      window.scrollTo({ top: pos, behavior: 'smooth' });
      await new Promise(r => setTimeout(r, delay));
    }
  });
  await page.waitForTimeout(500);
}

// ---------------------------------------------------------------------------
// Output
// ---------------------------------------------------------------------------

/**
 * Create a progress-saving callback that writes to disk every N new results.
 * @param {string} outputFile - Path to write JSON
 * @returns {Function} Callback accepting the results Map
 */
function createProgressSaver(outputFile) {
  let lastSavedSize = 0;

  return function saveProgress(allResults) {
    if (allResults.size - lastSavedSize >= PROGRESS_SAVE_INTERVAL) {
      const data = [...allResults.values()];
      fs.writeFileSync(outputFile, JSON.stringify(data, null, 2));
      console.log(`  (progress saved: ${data.length} profiles)`);
      lastSavedSize = allResults.size;
    }
  };
}

/**
 * Save debug HTML from the first few cards on the page.
 * @param {import('playwright').Page} page
 * @param {string} outputDir
 * @param {string} type
 */
async function saveDebugHTML(page, outputDir, type) {
  const html = await page.evaluate(() => {
    const cards = document.querySelectorAll('div[role="listitem"]');
    if (cards.length > 0) {
      return Array.from(cards).slice(0, 3).map(c => c.outerHTML).join('\n\n---CARD---\n\n');
    }

    // Fallback for connections page (no listitem roles)
    const links = document.querySelectorAll('a[href*="/in/"]');
    for (const link of links) {
      let el = link;
      for (let i = 0; i < 10; i++) {
        if (el.parentElement) el = el.parentElement;
        if (el.querySelectorAll('a[href*="/in/"]').length > 1) {
          el = el.children[0] || el;
          break;
        }
      }
      return el.outerHTML.substring(0, 5000);
    }

    return 'no cards found';
  });

  fs.writeFileSync(path.join(outputDir, `${type}-card-html.txt`), html);
}

/**
 * Write final results, metadata, and screenshot.
 * @param {Map} allResults
 * @param {Object} opts - CLI options
 * @param {string} outputDir
 * @param {string} outputFile
 * @param {import('playwright').Page} page
 */
async function writeFinalOutput(allResults, opts, outputDir, outputFile, page) {
  const results = [...allResults.values()];

  fs.writeFileSync(outputFile, JSON.stringify(results, null, 2));
  console.log(`\nDone! Extracted ${results.length} unique profiles.`);
  console.log(`Saved to ${outputFile}`);

  const meta = {
    name: opts.name,
    type: opts.type,
    url: opts.url,
    scrapedAt: new Date().toISOString(),
    count: results.length,
  };
  fs.writeFileSync(path.join(outputDir, 'meta.json'), JSON.stringify(meta, null, 2));

  await page.screenshot({ path: path.join(outputDir, `${opts.type}-final-state.png`) });
}

// ---------------------------------------------------------------------------
// Browser Management
// ---------------------------------------------------------------------------

/**
 * Launch browser and wait for LinkedIn to be ready (with login if needed).
 * @param {Object} opts
 * @returns {{ browser: import('playwright').BrowserContext, page: import('playwright').Page }}
 */
async function launchBrowser(opts) {
  const browser = await chromium.launchPersistentContext(BROWSER_DATA_DIR, {
    headless: opts.headless,
    viewport: { width: 1280, height: 900 },
    args: ['--disable-blink-features=AutomationControlled'],
  });

  const page = browser.pages()[0] || await browser.newPage();

  await page.goto(opts.url, {
    waitUntil: 'domcontentloaded',
    timeout: PAGE_LOAD_TIMEOUT_MS,
  });

  // Check if profile links are visible (indicates we're logged in)
  try {
    await page.waitForSelector('a[href*="/in/"]', { timeout: SELECTOR_TIMEOUT_MS });
  } catch {
    console.log('\n=== Please log in to LinkedIn in the browser window ===\n');
    await page.waitForSelector('a[href*="/in/"]', { timeout: opts.timeout * 1000 });
    await page.waitForTimeout(3000);
  }

  return { browser, page };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const opts = parseArgs();
  const outputDir = path.join(OUTPUT_BASE_DIR, opts.name);
  const outputFile = path.join(outputDir, opts.output);

  console.log(`Person:  ${opts.name}`);
  console.log(`Mode:    ${opts.type}`);
  console.log(`URL:     ${opts.url}`);
  console.log(`Output:  ${outputFile}`);
  console.log();

  fs.mkdirSync(outputDir, { recursive: true });

  const { browser, page } = await launchBrowser(opts);

  try {
    await saveDebugHTML(page, outputDir, opts.type);
    console.log('Card HTML saved for debugging.');

    const allResults = new Map();
    const onProgress = createProgressSaver(outputFile);

    if (opts.type === 'search') {
      await scrapeWithPagination(page, allResults, onProgress);
    } else {
      await scrapeWithInfiniteScroll(page, allResults, onProgress);
    }

    await writeFinalOutput(allResults, opts, outputDir, outputFile, page);

    if (opts.keepOpen) {
      console.log('Browser will stay open. Press Ctrl+C to exit.');
      await page.waitForTimeout(3_600_000);
    }
  } finally {
    await browser.close();
  }
}

main().catch(err => {
  console.error(`Error: ${err.message}`);
  process.exit(1);
});
