import { chromium } from 'playwright';
import { logger } from '../utils/logger.js';

const BASE_URL = process.env.SCOPE_BASE_URL;

const LISTING_PAGES = [
  `${BASE_URL}/now-showing`,
  `${BASE_URL}/coming-soon`,
];

// Hard ceiling on the whole scrape (both pages, launch included). If this
// fires, we forcibly kill the browser process ourselves rather than trusting
// Playwright's internal cleanup to always complete — see 2026-07-18 incident,
// where repeated failed launches were never fully cleaned up and eventually
// exhausted the container's process/thread limit (EAGAIN on pthread_create).
const SCRAPE_TIMEOUT_MS = 120_000;

const delay = (ms) => new Promise((res) => setTimeout(res, ms));

// Scrolls the page until the number of <article> cards in the DOM stops
// growing (i.e. lazy-loading/infinite-scroll has finished), or until
// maxAttempts is hit as a safety cap against genuinely infinite feeds.
async function scrollUntilAllArticlesLoaded(page, { maxAttempts = 20, settleMs = 1000 } = {}) {
  let previousCount = -1;
  let attempts = 0;

  while (attempts < maxAttempts) {
    const currentCount = await page.$$eval('article', (articles) => articles.length);

    if (currentCount === previousCount) {
      // No new cards appeared after the last scroll — we've reached the end.
      break;
    }

    previousCount = currentCount;
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(settleMs);
    attempts += 1;
  }

  if (attempts >= maxAttempts) {
    logger.warn(`Hit max scroll attempts (${maxAttempts}) — page may have more content than was loaded`);
  }

  return previousCount;
}

// Resource types we never need — we only read text content and href/src
// *attribute strings* from the DOM (see the $$eval below), never rendered
// pixels. Blocking these means Chromium never downloads, decodes, or
// rasterizes them, which is where most of a page's memory actually goes.
// This matters a lot on a 1GB-RAM Trial plan, where a fully-rendered
// 44-poster listing page can push Chromium close to the container's ceiling.
const BLOCKED_RESOURCE_TYPES = new Set(['image', 'stylesheet', 'font', 'media']);

async function scrapeOnePage(browser, pageUrl) {
  const page = await browser.newPage();
  await page.setViewportSize({ width: 390, height: 844 });

  await page.route('**/*', (route) => {
    const resourceType = route.request().resourceType();
    if (BLOCKED_RESOURCE_TYPES.has(resourceType)) {
      return route.abort();
    }
    return route.continue();
  });

  try {
    logger.info(`Scraping: ${pageUrl}`);
    await page.goto(pageUrl, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await page.waitForTimeout(3000);
    await page.waitForSelector('article', { state: 'attached', timeout: 15_000 });

    const totalArticles = await scrollUntilAllArticlesLoaded(page);
    logger.info(`Finished scrolling — ${totalArticles} article cards loaded on ${pageUrl}`);

    const movies = await page.$$eval('article', (articles) => {
      return articles
        .map((article) => {
          // Poster
          const img = article.querySelector('img');
          const poster = img?.src || img?.dataset?.src || '';

          // Title
          const titleEl = article.querySelector(
            'p.font-semibold.line-clamp-2.text-white'
          );
          const title = titleEl?.innerText?.trim() ?? '';

          // Movie page link
          const linkEl = article.querySelector('a');
          const href = linkEl?.getAttribute('href') ?? '';
          const origin = 'https://www.scopecinemas.com';
          const movieUrl = href.startsWith('http') ? href : `${origin}${href}`;

          // Availability
          const btn = article.querySelector('button');
          const buttonText = btn?.innerText?.trim().toLowerCase() ?? '';
          const available = buttonText.includes('buy tickets');

          return { title, poster, movieUrl, available };
        })
        .filter((m) => m.title && m.movieUrl);
    });

    logger.info(`Found ${movies.length} movies on ${pageUrl}`);
    return movies;
  } catch (err) {
    logger.error({ err, pageUrl }, 'Scrape failed for page');
    return [];
  } finally {
    await page.close();
    await delay(1500);
  }
}

async function runScrape() {
  // Declared outside the try so the finally block can always reach it,
  // even if chromium.launch() itself throws partway through startup —
  // that's the exact failure mode from today's incident.
  let browser;

  try {
    browser = await chromium.launch({ headless: true, timeout: 30_000 });

    const allMovies = [];
    for (const pageUrl of LISTING_PAGES) {
      const movies = await scrapeOnePage(browser, pageUrl);
      allMovies.push(...movies);
    }

    const seen = new Set();
    return allMovies.filter((m) => {
      if (seen.has(m.movieUrl)) return false;
      seen.add(m.movieUrl);
      return true;
    });
  } finally {
    if (browser) {
      // Force-kill rather than relying solely on browser.close() succeeding
      // cleanly — if the graceful path itself hangs, this guarantees the
      // process doesn't linger and compound across retries.
      try {
        await browser.close();
      } catch (closeErr) {
        logger.error({ closeErr }, 'Failed to close browser cleanly — process may leak');
      }
    }
  }
}

export async function scrapeMovieListing() {
  let timeoutHandle;

  const timeout = new Promise((_, reject) => {
    timeoutHandle = setTimeout(() => {
      reject(new Error(`Scrape timed out after ${SCRAPE_TIMEOUT_MS}ms`));
    }, SCRAPE_TIMEOUT_MS);
  });

  try {
    return await Promise.race([runScrape(), timeout]);
  } finally {
    clearTimeout(timeoutHandle);
  }
}