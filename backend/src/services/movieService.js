import { PrismaClient } from '@prisma/client';
import { scrapeMovieListing } from '../scraper/listingScraper.js';
import { logger } from '../utils/logger.js';

const prisma = new PrismaClient();

export async function refreshMovies() {
  logger.info('Starting movie refresh...');
  const movies = await scrapeMovieListing();

  if (movies.length === 0) {
    logger.warn('Scraper returned 0 movies — skipping upsert');
    return;
  }

  for (const movie of movies) {
    await prisma.movie.upsert({
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