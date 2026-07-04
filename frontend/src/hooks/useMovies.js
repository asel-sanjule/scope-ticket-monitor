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
      setMovies(data);
      setError(null);
    } catch {
      setError('Could not load movies. Is the backend running?');
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

  // Auto-refresh every 10 minutes
  useEffect(() => {
    fetchMovies();
    const interval = setInterval(fetchMovies, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchMovies]);

  return { movies, loading, refreshing, error, triggerRefresh, refetch: fetchMovies };
}