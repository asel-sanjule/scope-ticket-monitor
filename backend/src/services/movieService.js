import { PrismaClient } from '@prisma/client';
import { scrapeMovieListing } from '../scraper/listingScraper.js';
import { logger } from '../utils/logger.js';
import { notifyWatchers } from './notificationService.js';

const prisma = new PrismaClient();

export async function refreshMovies() {
  logger.info('Starting movie refresh...');
  const movies = await scrapeMovieListing();

  if (movies.length === 0) {
    logger.warn('Scraper returned 0 movies — skipping upsert');
    return;
  }

  for (const movie of movies) {
    const existing = await prisma.movie.findUnique({ where: { movieUrl: movie.movieUrl } });
    const becameAvailable = !!existing && !existing.available && movie.available;

    const upserted = await prisma.movie.upsert({
      where: { movieUrl: movie.movieUrl },
      update: {
        title: movie.title,
        poster: movie.poster,
        available: movie.available,
        lastChecked: new Date(),
      },
      create: {
        ...movie,
        lastChecked: new Date(),
      },
    });

    if (becameAvailable) {
      logger.info({ movieId: upserted.id, title: upserted.title }, 'Movie became available — notifying watchers');
      try {
        await notifyWatchers(upserted);
      } catch (err) {
        logger.error({ err, movieId: upserted.id }, 'Failed to notify watchers for this movie');
      }
    }
  }

  logger.info(`Upserted ${movies.length} movies to database`);
}

export async function getAllMovies() {
  return prisma.movie.findMany({
    orderBy: [{ available: 'desc' }, { title: 'asc' }],
  });
}

export async function getMovieById(id) {
  return prisma.movie.findUnique({ where: { id } });
}