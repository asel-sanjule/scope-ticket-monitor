import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { logger } from './utils/logger.js';
import moviesRouter from './routes/movies.js';
import authRouter from './routes/auth.js';
import telegramRouter from './routes/telegram.js';
import watchlistRouter from './routes/watchlist.js';
import { startScheduler } from './services/schedulerService.js';
import { refreshMovies } from './services/movieService.js';

const app = express();
const PORT = process.env.PORT ?? 3001;

// Middleware
const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost', // frontend served via docker-compose (nginx on port 80)
  'https://scope-ticket-monitor.up.railway.app', // old Railway frontend (safe to remove once fully retired)
  'https://scope-ticket-monitor.vercel.app', // Vercel production
];

// Vercel preview deployments get random subdomains per branch/PR, e.g.
// scope-ticket-monitor-git-feature-x-yourteam.vercel.app or
// scope-ticket-monitor-abc123.vercel.app — this regex allows any of those
// under the project so preview builds can hit the API too.
const VERCEL_PREVIEW_REGEX = /^https:\/\/scope-ticket-monitor(-[a-z0-9-]+)?\.vercel\.app$/;

app.use(cors({
  origin(origin, callback) {
    // Allow non-browser requests (curl, server-to-server, etc.) with no Origin header
    if (!origin) return callback(null, true);

    if (ALLOWED_ORIGINS.includes(origin) || VERCEL_PREVIEW_REGEX.test(origin)) {
      return callback(null, true);
    }

    callback(new Error(`Not allowed by CORS: ${origin}`));
  },
  credentials: true, // required so the session cookie is sent/accepted cross-subdomain
}));
app.use(express.json());
app.use(cookieParser());

// Routes
app.use('/api/movies', moviesRouter);
app.use('/api/auth', authRouter);
app.use('/api/telegram', telegramRouter);
app.use('/api/watchlist', watchlistRouter);

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Global error handler
app.use((err, req, res, next) => {
  logger.error({ err }, 'Unhandled error');
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  logger.info(`Backend running on port ${PORT}`);
  startScheduler();

  // Run scrape after a short delay, non-blocking
  setTimeout(() => {
    refreshMovies().catch((err) =>
      logger.error({ err }, 'Startup seed failed')
    );
  }, 5000);
});