import cron from 'node-cron';
import { refreshMovies } from './movieService.js';
import { pruneStaleWatchlistItems } from './cleanupService.js';
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

  // Daily watchlist cleanup — runs at 3am server time by default.
  const cleanupExpression = process.env.CLEANUP_CRON_EXPRESSION ?? '0 3 * * *';

  cron.schedule(cleanupExpression, async () => {
    logger.info('Scheduled watchlist cleanup triggered');
    try {
      await pruneStaleWatchlistItems();
    } catch (err) {
      logger.error({ err }, 'Scheduled watchlist cleanup failed');
    }
  });

  logger.info(`Watchlist cleanup scheduler running — cron "${cleanupExpression}"`);
}