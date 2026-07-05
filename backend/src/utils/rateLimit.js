import rateLimit from 'express-rate-limit';

// Requires express.json() to run BEFORE this middleware on the route,
// so req.body.email is already populated.
function emailKey(req) {
  return (req.body?.email || 'unknown').trim().toLowerCase();
}

// 1 request per email per minute
export const perMinutePerEmail = rateLimit({
  windowMs: 60 * 1000,
  max: 1,
  keyGenerator: emailKey,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Please wait a minute before requesting another link.' },
});

// 5 requests per email per day
export const perDayPerEmail = rateLimit({
  windowMs: 24 * 60 * 60 * 1000,
  max: 5,
  keyGenerator: emailKey,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many sign-in requests for this email today. Try again tomorrow.' },
});

// 10 requests per IP per hour (coarse abuse guard, default IP-based key)
export const perIpPerHour = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests from this network. Try again later.' },
});
