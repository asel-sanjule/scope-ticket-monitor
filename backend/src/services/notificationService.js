import { PrismaClient } from '@prisma/client';
import { sendTelegramMessage } from './telegramService.js';
import { logger } from '../utils/logger.js';

const prisma = new PrismaClient();

function buildMessage(movie) {
  return `ðŸŽ¬ Tickets are now available for "${movie.title}"!\n${movie.movieUrl}`;
}

/**
 * Sends the notification for a single watchlist item + movie, and marks
 * it notified if the send succeeded. Shared by both the live scrape-diff
 * trigger and the backlog check run after a user links a channel.
 */
async function notifyUserForItem(item, movie) {
  const { user } = item;
  let sent = false;

  if (user.notificationChannel === 'TELEGRAM' && user.telegramChatId) {
    await sendTelegramMessage(user.telegramChatId, buildMessage(movie));
    sent = true;
  } else if (user.notificationChannel === 'WHATSAPP' && user.whatsappNumber) {
    // Not implemented yet â€” WhatsApp Cloud API is a later phase.
    logger.warn(
      { userId: user.id },
      'WhatsApp channel selected but sender not implemented yet â€” skipping'
    );
  } else {
    logger.info(
      { userId: user.id, movieId: movie.id },
      'Watcher has no linked notification channel yet â€” leaving unnotified'
    );
  }

  if (sent) {
    await prisma.watchlistItem.update({
      where: { id: item.id },
      data: { notifiedAt: new Date() },
    });
  }
}

/**
 * Called right when a movie transitions from unavailable -> available.
 * Notifies everyone watching it who hasn't been notified yet and has a
 * linked channel. Users without a linked channel are left unnotified â€”
 * notifyBacklogForUser() catches them up once they do link one.
 */
export async function notifyWatchers(movie) {
  const items = await prisma.watchlistItem.findMany({
    where: { movieId: movie.id, notifiedAt: null },
    include: { user: true },
  });

  for (const item of items) {
    try {
      await notifyUserForItem(item, movie);
    } catch (err) {
      logger.error(
        { err, userId: item.userId, movieId: movie.id },
        'Failed to notify one watcher â€” continuing with the rest'
      );
    }
  }
}

/**
 * Called after a user successfully links a notification channel (e.g.
 * Telegram). Catches any watchlist items where the movie already became
 * available while they had no channel connected yet.
 */
export async function notifyBacklogForUser(userId) {
  const items = await prisma.watchlistItem.findMany({
    where: { userId, notifiedAt: null, movie: { available: true } },
    include: { user: true, movie: true },
  });

  for (const item of items) {
    try {
      await notifyUserForItem(item, item.movie);
    } catch (err) {
      logger.error(
        { err, userId, movieId: item.movieId },
        'Failed to send backlog notification'
      );
    }
  }
}
