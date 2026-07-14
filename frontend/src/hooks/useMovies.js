import { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';

export function useMovies() {
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const fetchMovies = useCallback(async () => {
    try {
      const { data } = await api.get('/movies');
      setMovies(Array.isArray(data) ? data : []); // guard here
      setError(null);
    } catch {
      setError('Could not load movies. Is the backend running?');
      setMovies([]); // make sure movies is always an array
    } finally {
      setLoading(false);
    }
  }, []);

  const triggerRefresh = async () => {
    setRefreshing(true);
    try {
      await api.post('/movies/refresh');
      // Wait for scraper to run then re-fetch
      setTimeout(async () => {
        await fetchMovies();
        setRefreshing(false);
      }, 8000);
    } catch {
      setRefreshing(false);
    }
  };

  // Background poll — GET /movies is a cheap DB read, not a scrape, so this
  // can run far more often than the 10-minute scrape cron. Kept short mainly
  // as a fallback for tabs left open and truly idle in the foreground.
  useEffect(() => {
    fetchMovies();
    const interval = setInterval(fetchMovies, 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchMovies]);

  // Backgrounded/minimized tabs throttle or fully pause setInterval in most
  // browsers, so the poll above can't be relied on alone — a tab left open
  // and switched away from may not auto-refresh for a long time. Refetch
  // immediately whenever the tab becomes visible/focused again so the user
  // sees current data as soon as they look at it, without waiting on the
  // interval or needing to hit refresh manually.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') fetchMovies();
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', fetchMovies);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', fetchMovies);
    };
  }, [fetchMovies]);

  return { movies, loading, refreshing, error, triggerRefresh, refetch: fetchMovies };
}
