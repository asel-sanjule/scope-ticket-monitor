import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function addToWatchlist(userId, movieId) {
  const movie = await prisma.movie.findUnique({ where: { id: movieId } });
  if (!movie) {
    const err = new Error('Movie not found');
    err.status = 404;
    throw err;
  }
  if (movie.available) {
    const err = new Error('Tickets for this movie are already available');
    err.status = 400;
    throw err;
  }

  return prisma.watchlistItem.upsert({
    where: { userId_movieId: { userId, movieId } },
    update: {}, // already on the watchlist — no-op
    create: { userId, movieId },
    include: { movie: true },
  });
}

export async function removeFromWatchlist(userId, movieId) {
  await prisma.watchlistItem.deleteMany({
    where: { userId, movieId },
  });
}

export async function getWatchlistForUser(userId) {
  return prisma.watchlistItem.findMany({
    where: { userId },
    include: { movie: true },
    orderBy: { createdAt: 'desc' },
  });
}