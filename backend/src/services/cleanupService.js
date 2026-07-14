import { prisma } from '../lib/prisma.js';
import { logger } from '../utils/logger.js';

const DEFAULT_STALE_DAYS = 3;

/**
 * A movie's `lastChecked` is only updated when it still appears in a scrape
 * (see movieService.refreshMovies — the upsert loop only runs over movies
 * currently on the now-showing/coming-soon pages). So if a movie hasn't
 * been "seen" in several days, it's dropped off Scope's listings — most
 * likely its run ended.
 *
 * This deletes the Movie row itself (not just its watchlist items) once
 * it's gone stale. WatchlistItem.movieId is ON DELETE RESTRICT, so any
 * watchlist items pointing at a stale movie are deleted first, in the same
 * transaction, before the movie row goes.
 */
export async function deleteStaleMovies() {
  const staleDays = Number(process.env.CLEANUP_STALE_DAYS) || DEFAULT_STALE_DAYS;
  const cutoff = new Date(Date.now() - staleDays * 24 * 60 * 60 * 1000);

  const staleWhere = { lastChecked: { lt: cutoff } };

  const [{ count: watchlistItemsDeleted }, { count: moviesDeleted }] = await prisma.$transaction([
    prisma.watchlistItem.deleteMany({ where: { movie: staleWhere } }),
    prisma.movie.deleteMany({ where: staleWhere }),
  ]);

  if (moviesDeleted > 0) {
    logger.info(
      { moviesDeleted, watchlistItemsDeleted, staleDays },
      'Deleted stale movies (no longer appear in scrapes) and their watchlist items'
    );
  } else {
    logger.info({ staleDays }, 'Stale movie cleanup ran — nothing stale to delete');
  }

  return { moviesDeleted, watchlistItemsDeleted };
}
