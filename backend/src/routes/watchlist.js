import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import {
  addToWatchlist,
  removeFromWatchlist,
  getWatchlistForUser,
} from '../services/watchlistService.js';

const router = Router();

// GET /api/watchlist
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const items = await getWatchlistForUser(req.user.id);
    res.json(items);
  } catch (err) {
    next(err);
  }
});

// POST /api/watchlist  { movieId }
router.post('/', requireAuth, async (req, res, next) => {
  const { movieId } = req.body;
  if (!movieId) return res.status(400).json({ error: 'movieId is required' });

  try {
    const item = await addToWatchlist(req.user.id, movieId);
    res.status(201).json(item);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
});

// DELETE /api/watchlist/:movieId
router.delete('/:movieId', requireAuth, async (req, res, next) => {
  try {
    await removeFromWatchlist(req.user.id, req.params.movieId);
    res.json({ status: 'success' });
  } catch (err) {
    next(err);
  }
});

export default router;
