import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import { getOrCreateLinkCode, linkTelegramChat, sendTelegramMessage } from '../services/telegramService.js';
import { notifyBacklogForUser } from '../services/notificationService.js';
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

    if (chatId && text?.startsWith('/start')) {
      const code = text.split(' ')[1]; // "/start abc123" -> "abc123"

      if (!code) {
        await sendTelegramMessage(
          chatId,
          "Hi! To link your account, tap the \"Connect Telegram\" button on the Scope Ticket Monitor dashboard — it'll bring you back here with the right code."
        );
      } else {
        const result = await linkTelegramChat(code, chatId);

        if (result.ok) {
          await sendTelegramMessage(
            chatId,
            "✅ You're connected! I'll message you here as soon as tickets become available for movies on your watchlist."
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
    }

    res.sendStatus(200);
  } catch (err) {
    logger.error({ err }, 'Telegram webhook handling failed');
    res.sendStatus(200); // still ack — don't let Telegram hammer retries on our bug
  }
});

export default router;
