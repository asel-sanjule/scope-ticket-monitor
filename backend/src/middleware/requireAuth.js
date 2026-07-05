import { verifySession, getUserById } from '../services/authService.js';

/**
 * Reads the `session` cookie, verifies it, and attaches req.user.
 * Responds 401 if missing/invalid — use on any route that requires login.
 */
export async function requireAuth(req, res, next) {
  const token = req.cookies?.session;
  if (!token) return res.status(401).json({ error: 'Not authenticated' });

  try {
    const { userId } = verifySession(token);
    const user = await getUserById(userId);
    if (!user) return res.status(401).json({ error: 'Not authenticated' });
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ error: 'Session expired or invalid' });
  }
}

/**
 * Like requireAuth but does not reject — attaches req.user if a valid
 * session exists, otherwise leaves it undefined. Useful for routes that
 * behave differently for logged-in vs anonymous users without hard-blocking.
 */
export async function attachUserIfPresent(req, _res, next) {
  const token = req.cookies?.session;
  if (!token) return next();

  try {
    const { userId } = verifySession(token);
    req.user = await getUserById(userId);
  } catch {
    // ignore invalid/expired token, treat as anonymous
  }
  next();
}
