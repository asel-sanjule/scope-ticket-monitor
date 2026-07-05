import { Router } from 'express';
import { createMagicLink, verifyMagicLinkToken, signSession } from '../services/authService.js';
import { sendMagicLinkEmail } from '../services/emailService.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { perMinutePerEmail, perDayPerEmail, perIpPerHour } from '../utils/rateLimit.js';
import { logger } from '../utils/logger.js';

const router = Router();

const isProd = process.env.NODE_ENV === 'production';
const COOKIE_OPTS = {
  httpOnly: true,
  secure: isProd,
  sameSite: isProd ? 'none' : 'lax', // frontend/backend are different Railway subdomains in prod
  maxAge: 30 * 24 * 60 * 60 * 1000,
};

// POST /api/auth/request-link  { email }
router.post(
  '/request-link',
  perIpPerHour,
  perMinutePerEmail,
  perDayPerEmail,
  async (req, res, next) => {
    const { email } = req.body;
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      return res.status(400).json({ error: 'Valid email required' });
    }

    try {
      const { token } = await createMagicLink(email);
      const verifyUrl = `${process.env.BACKEND_URL}/api/auth/verify?token=${token}`;
      await sendMagicLinkEmail(email, verifyUrl);
      res.json({ status: 'success', message: 'Sign-in link sent' });
    } catch (err) {
      logger.error({ err }, 'Failed to send magic link');
      next(err);
    }
  }
);

// GET /api/auth/verify?token=...
router.get('/verify', async (req, res) => {
  const { token } = req.query;
  if (!token) return res.status(400).send('Missing token');

  try {
    const user = await verifyMagicLinkToken(token);
    const session = signSession(user.id);
    res.cookie('session', session, COOKIE_OPTS);
    res.redirect(process.env.FRONTEND_URL);
  } catch (err) {
    const reason = err.message === 'TOKEN_EXPIRED' ? 'expired' : 'invalid';
    logger.warn({ err }, 'Magic link verification failed');
    res.redirect(`${process.env.FRONTEND_URL}/?login=${reason}`);
  }
});

// GET /api/auth/me
router.get('/me', requireAuth, (req, res) => {
  res.json({
    id: req.user.id,
    email: req.user.email,
    notificationChannel: req.user.notificationChannel,
    telegramLinked: !!req.user.telegramChatId,
    whatsappLinked: !!req.user.whatsappNumber,
  });
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  res.clearCookie('session', COOKIE_OPTS);
  res.json({ status: 'success' });
});

export default router;