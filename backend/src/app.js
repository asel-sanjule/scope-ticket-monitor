import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { logger } from './utils/logger.js';
import moviesRouter from './routes/movies.js';
import { startScheduler } from './services/schedulerService.js';
import { refreshMovies } from './services/movieService.js';

const app = express();
const PORT = process.env.PORT ?? 3001;

// Middleware
//app.use(cors());
app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://scope-ticket-monitor.up.railway.app', 
  ]
}));
app.use(express.json());

// Routes
app.use('/api/movies', moviesRouter);

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