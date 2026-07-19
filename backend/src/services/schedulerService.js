import cron from 'node-cron';
import { refreshMovies } from './movieService.js';
import { deleteStaleMovies } from './cleanupService.js';
import { sendTelegramMessage } from './telegramService.js';
import { logger } from '../utils/logger.js';

// After this many consecutive scrape failures, stop retrying every tick and
// back off instead. Today's incident (2026-07-18) showed unbounded 10-minute
// retries can quietly exhaust the container's process/thread limit over
// many hours without ever surfacing as an obvious alert.
const MAX_CONSECUTIVE_FAILURES = 3;
const BACKOFF_MINUTES = 60;

let isScraping = false;
let consecutiveFailures = 0;
let backoffUntil = null;

// Optional — set TELEGRAM_ADMIN_CHAT_ID to your own Telegram chat id to get
// pinged when scraping backs off after repeated failures. If unset, this is
// a no-op (the failure is still logged either way).
async function alertAdmin(text) {
  const adminChatId = process.env.TELEGRAM_ADMIN_CHAT_ID;
  if (!adminChatId) return;

  try {
    await sendTelegramMessage(adminChatId, text);
  } catch (err) {
    logger.error({ err }, 'Failed to send admin alert via Telegram');
  }
}

export function startScheduler() {
  const interval = process.env.SCRAPE_INTERVAL_MINUTES ?? 10;
  const expression = `*/${interval} * * * *`;

  cron.schedule(expression, async () => {
    // Concurrency guard — never let a new tick start while a previous
    // scrape (including its browser cleanup) is still in flight.
    if (isScraping) {
      logger.warn('Scheduled refresh skipped — previous run still in progress');
      return;
    }

    // Backoff guard — after repeated failures, stop hammering the launcher
    // and wait it out instead of retrying every single tick.
    if (backoffUntil && Date.now() < backoffUntil) {
      logger.warn(
        { resumesAt: new Date(backoffUntil).toISOString() },
        'Scheduled refresh skipped — backing off after repeated failures'
      );
      return;
    }

    isScraping = true;
    logger.info('Scheduled refresh triggered');
    try {
      await refreshMovies();

      // Recovered after a backoff period — let the admin know it's healthy
      // again, since the earlier failure alert implied it wasn't.
      if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
        await alertAdmin('✅ Scope Ticket Monitor: scraping recovered and is running normally again.');
      }

      consecutiveFailures = 0;
      backoffUntil = null;
    } catch (err) {
      consecutiveFailures += 1;
      logger.error(
        { err, consecutiveFailures },
        'Scheduled refresh failed'
      );

      if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
        backoffUntil = Date.now() + BACKOFF_MINUTES * 60 * 1000;
        const resumesAt = new Date(backoffUntil).toISOString();
        logger.error(
          { consecutiveFailures, resumesAt },
          `Hit ${MAX_CONSECUTIVE_FAILURES} consecutive scrape failures — pausing scraping for ${BACKOFF_MINUTES} minutes`
        );

        await alertAdmin(
          `⚠️ Scope Ticket Monitor: scraping has failed ${consecutiveFailures} times in a row ` +
          `(latest error: ${err.message}). Pausing for ${BACKOFF_MINUTES} minutes — check Railway logs.`
        );
      }
    } finally {
      isScraping = false;
    }
  });

  logger.info(`Scheduler running — every ${interval} minutes`);

  // Daily watchlist cleanup — runs at 3am server time by default.
  const cleanupExpression = process.env.CLEANUP_CRON_EXPRESSION ?? '0 3 * * *';

  cron.schedule(cleanupExpression, async () => {
    logger.info('Scheduled watchlist cleanup triggered');
    try {
      await deleteStaleMovies();
    } catch (err) {
      logger.error({ err }, 'Scheduled watchlist cleanup failed');
    }
  });

  logger.info(`Watchlist cleanup scheduler running — cron "${cleanupExpression}"`);
}