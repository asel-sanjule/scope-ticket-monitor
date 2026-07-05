import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger.js';

const prisma = new PrismaClient();

const CODE_TTL_MINUTES = 10;
const TELEGRAM_API = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`;

function generateCode() {
  // Telegram /start deep-link params must be url-safe; base36 keeps it short and typeable
  return crypto.randomBytes(6).toString('hex');
}

/**
 * Returns a still-valid pending link code for this user if one exists,
 * otherwise creates a new one. Avoids generating a fresh code on every
 * page load while the user is mid-flow.
 */
export async function getOrCreateLinkCode(userId) {
  const existing = await prisma.telegramLinkCode.findFirst({
    where: { userId, usedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: 'desc' },
  });
  if (existing) return existing;

  return prisma.telegramLinkCode.create({
    data: {
      userId,
      code: generateCode(),
      expiresAt: new Date(Date.now() + CODE_TTL_MINUTES * 60 * 1000),
    },
  });
}

/**
 * Called from the webhook when a user sends /start <code> to the bot.
 * Links the chat id to the user's account if the code is valid.
 * Returns { ok: true, userId } or { ok: false, reason }.
 */
export async function linkTelegramChat(code, chatId) {
  const record = await prisma.telegramLinkCode.findUnique({ where: { code } });

  if (!record) return { ok: false, reason: 'not_found' };
  if (record.usedAt) return { ok: false, reason: 'already_used' };
  if (record.expiresAt < new Date()) return { ok: false, reason: 'expired' };

  await prisma.$transaction([
    prisma.telegramLinkCode.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
    prisma.user.update({
      where: { id: record.userId },
      data: { telegramChatId: String(chatId) },
    }),
  ]);

  return { ok: true, userId: record.userId };
}

export async function sendTelegramMessage(chatId, text) {
  const res = await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
  });

  if (!res.ok) {
    const body = await res.text();
    logger.error({ status: res.status, body }, 'Telegram sendMessage failed');
  }
}
