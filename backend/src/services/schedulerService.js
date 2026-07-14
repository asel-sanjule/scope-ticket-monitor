import cron from 'node-cron';
import { refreshMovies } from './movieService.js';
import { deleteStaleMovies } from './cleanupService.js';
import { logger } from '../utils/logger.js';

export function startScheduler() {
  const interval = process.env.SCRAPE_INTERVAL_MINUTES ?? 10;
  const expression = `*/${interval} * * * *`;

  cron.schedule(expression, async () => {
    logger.info('Scheduled refresh triggered');
    try {
      await refreshMovies();
    } catch (err) {
      logger.error({ err }, 'Scheduled refresh failed');
    }
  });

  logger.info(`Scheduler running — every ${interval} minutes`);

  // Daily stale-movie cleanup — runs at 3am server time by default.
  // Deletes Movie rows (and their watchlist items) that haven't been seen
  // in a scrape for CLEANUP_STALE_DAYS days.
  const cleanupExpression = process.env.CLEANUP_CRON_EXPRESSION ?? '0 3 * * *';

  cron.schedule(cleanupExpression, async () => {
    logger.info('Scheduled stale movie cleanup triggered');
    try {
      await deleteStaleMovies();
    } catch (err) {
      logger.error({ err }, 'Scheduled stale movie cleanup failed');
    }
  });

  logger.info(`Stale movie cleanup scheduler running — cron "${cleanupExpression}"`);
}