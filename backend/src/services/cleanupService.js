import { prisma } from '../lib/prisma.js';
import { logger } from '../utils/logger.js';

const DEFAULT_STALE_DAYS = 3;

/**
 * A movie's `lastChecked` is only updated when it still appears in a scrape
 * (see movieService.refreshMovies — the upsert loop only runs over movies
 * currently on the now-showing/coming-soon pages). So if a movie hasn't
 * been "seen" in several days, it's dropped off Scope's listings — most
 * likely its run ended — and any watchlist items for it are stale.
 *
 * This deletes those watchlist items outright rather than just flagging
 * them, since there's nothing left to notify about.
 */
export async function pruneStaleWatchlistItems() {
  const staleDays = Number(process.env.CLEANUP_STALE_DAYS) || DEFAULT_STALE_DAYS;
  const cutoff = new Date(Date.now() - staleDays * 24 * 60 * 60 * 1000);

  const result = await prisma.watchlistItem.deleteMany({
    where: {
      movie: {
        lastChecked: { lt: cutoff },
      },
    },
  });

  if (result.count > 0) {
    logger.info(
      { count: result.count, staleDays },
      'Pruned stale watchlist items (movie no longer appears in scrapes)'
    );
  } else {
    logger.info({ staleDays }, 'Watchlist cleanup ran — nothing stale to prune');
  }

  return result.count;
}