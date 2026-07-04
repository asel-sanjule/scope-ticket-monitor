import cron from 'node-cron';
import { refreshMovies } from './movieService.js';
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
}