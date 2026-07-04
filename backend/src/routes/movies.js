import { Router } from 'express';
import { getAllMovies, getMovieById, refreshMovies } from '../services/movieService.js';
import { logger } from '../utils/logger.js';

const router = Router();

// GET /api/movies
router.get('/', async (req, res, next) => {
  try {
    const movies = await getAllMovies();
    res.json(movies);
  } catch (err) {
    next(err);
  }
});

// GET /api/movies/:id
router.get('/:id', async (req, res, next) => {
  try {
    const movie = await getMovieById(req.params.id);
    if (!movie) return res.status(404).json({ error: 'Movie not found' });
    res.json(movie);
  } catch (err) {
    next(err);
  }
});

// POST /api/movies/refresh
router.post('/refresh', async (req, res, next) => {
  try {
    // Fire and forget — scraping takes time, don't block the response
    refreshMovies().catch((err) =>
      logger.error({ err }, 'Background refresh failed')
    );
    res.json({ status: 'success', message: 'Refresh started' });
  } catch (err) {
    next(err);
  }
});

export default router;