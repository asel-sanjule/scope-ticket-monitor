import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import {
  getOrCreateLinkCode,
  linkTelegramChat,
  sendTelegramMessage,
  getUserByChatId,
  unlinkChat,
} from '../services/telegramService.js';
import { notifyBacklogForUser } from '../services/notificationService.js';
import { getWatchlistForUser } from '../services/watchlistService.js';
import { logger } from '../utils/logger.js';

const router = Router();

// GET /api/telegram/link-code
router.get('/link-code', requireAuth, async (req, res, next) => {
  try {
    if (req.user.telegramChatId) {
      return res.json({ alreadyLinked: true });
    }

    const linkCode = await getOrCreateLinkCode(req.user.id);
    const botUsername = process.env.TELEGRAM_BOT_USERNAME;

    res.json({
      alreadyLinked: false,
      code: linkCode.code,
      deepLink: `https://t.me/${botUsername}?start=${linkCode.code}`,
      expiresAt: linkCode.expiresAt,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/telegram/webhook — called by Telegram, not the frontend.
// Always ack quickly; Telegram retries on non-2xx or timeouts.
router.post('/webhook', async (req, res) => {
  // Optional shared-secret check — set when registering the webhook
  // (see setWebhook's secret_token param) to confirm requests are really
  // from Telegram, not just anyone who finds this URL.
  const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (expectedSecret) {
    const receivedSecret = req.get('x-telegram-bot-api-secret-token');
    if (receivedSecret !== expectedSecret) {
      return res.sendStatus(401);
    }
  }

  try {
    const message = req.body?.message;
    const chatId = message?.chat?.id;
    const text = message?.text?.trim();

    if (chatId && text) {
      const command = text.split(' ')[0].toLowerCase();

      if (command === '/start') {
        await handleStart(chatId, text);
      } else if (command === '/help') {
        await handleHelp(chatId);
      } else if (command === '/status') {
        await handleStatus(chatId);
      } else if (command === '/stop') {
        await handleStop(chatId);
      }
      // Anything else is silently ignored — no other commands exist yet.
    }

    res.sendStatus(200);
  } catch (err) {
    logger.error({ err }, 'Telegram webhook handling failed');
    res.sendStatus(200); // still ack — don't let Telegram hammer retries on our bug
  }
});

async function handleStart(chatId, text) {
  const code = text.split(' ')[1]; // "/start abc123" -> "abc123"

  if (!code) {
    await sendTelegramMessage(
      chatId,
      "Hi! To link your account, tap the \"Connect Telegram\" button on the Scope Ticket Monitor dashboard — it'll bring you back here with the right code."
    );
    return;
  }

  const result = await linkTelegramChat(code, chatId);

  if (result.ok) {
    await sendTelegramMessage(
      chatId,
      "✅ You're connected! I'll message you here as soon as tickets become available for movies on your watchlist.\n\nSend /help anytime to see what I can do."
    );
    notifyBacklogForUser(result.userId).catch((err) =>
      logger.error({ err, userId: result.userId }, 'Backlog notification check failed')
    );
  } else {
    const reasonText =
      result.reason === 'expired'
        ? 'That link code has expired — go back to the dashboard and tap "Connect Telegram" again for a fresh one.'
        : result.reason === 'already_used'
        ? 'That link code was already used. Go back to the dashboard and generate a new one if needed.'
        : "That code doesn't look right. Go back to the dashboard and tap \"Connect Telegram\" to get a valid link.";
    await sendTelegramMessage(chatId, reasonText);
  }
}

async function handleHelp(chatId) {
  await sendTelegramMessage(
    chatId,
    "Here's what I can do:\n\n" +
      "🔔 I'll message you here the moment tickets go on sale for movies on your watchlist.\n\n" +
      '/status — see how many movies you\'re following\n' +
      '/stop — disconnect Telegram from your account\n\n' +
      'Manage your watchlist from the Scope Ticket Monitor dashboard.'
  );
}

async function handleStatus(chatId) {
  const user = await getUserByChatId(chatId);

  if (!user) {
    await sendTelegramMessage(
      chatId,
      "You're not connected right now — head to the Scope Ticket Monitor dashboard and tap \"Connect Telegram\" to link your account."
    );
    return;
  }

  const items = await getWatchlistForUser(user.id);
  const notifiedCount = items.filter((i) => i.notifiedAt).length;

  await sendTelegramMessage(
    chatId,
    `You're connected as ${user.email}.\n\n` +
      `📋 Following ${items.length} movie${items.length === 1 ? '' : 's'}\n` +
      `🔔 ${notifiedCount} notified so far\n\n` +
      'Manage your watchlist from the dashboard.'
  );
}

async function handleStop(chatId) {
  const user = await unlinkChat(chatId);

  if (!user) {
    await sendTelegramMessage(chatId, "You're not connected right now — nothing to disconnect.");
    return;
  }

  await sendTelegramMessage(
    chatId,
    "You're disconnected. I won't send any more notifications here.\n\nYour watchlist is still saved — reconnect anytime from the dashboard to start getting notified again."
  );
}

export default router;