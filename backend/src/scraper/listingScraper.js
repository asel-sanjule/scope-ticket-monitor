import { chromium } from 'playwright';
import { logger } from '../utils/logger.js';

const BASE_URL = process.env.SCOPE_BASE_URL;

const LISTING_PAGES = [
  `${BASE_URL}/now-showing`,
  `${BASE_URL}/coming-soon`,
];

const delay = (ms) => new Promise((res) => setTimeout(res, ms));

export async function scrapeMovieListing() {
  const browser = await chromium.launch({ headless: true });
  const allMovies = [];

  for (const pageUrl of LISTING_PAGES) {
    const page = await browser.newPage();
    await page.setViewportSize({ width: 390, height: 844 });

    try {
      logger.info(`Scraping: ${pageUrl}`);
      await page.goto(pageUrl, { waitUntil: 'domcontentloaded', timeout: 30_000 });
      await page.waitForTimeout(3000);
      await page.waitForSelector('article', { state: 'attached', timeout: 15_000 });

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
      allMovies.push(...movies);
    } catch (err) {
      logger.error({ err, pageUrl }, 'Scrape failed for page');
    } finally {
      await page.close();
      await delay(1500);
    }
  }

  await browser.close();

  const seen = new Set();
  return allMovies.filter((m) => {
    if (seen.has(m.movieUrl)) return false;
    seen.add(m.movieUrl);
    return true;
  });
}