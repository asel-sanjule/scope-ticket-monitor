import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  getWatchlist,
  addToWatchlist as apiAdd,
  removeFromWatchlist as apiRemove,
} from '../api/client';

export function useWatchlist(isLoggedIn) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!isLoggedIn) {
      setItems([]);
      return;
    }
    setLoading(true);
    try {
      const data = await getWatchlist();
      setItems(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  }, [isLoggedIn]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // movieId -> watchlist item, for quick lookup while rendering movie cards
  const byMovieId = useMemo(() => {
    const map = new Map();
    for (const item of items) map.set(item.movieId, item);
    return map;
  }, [items]);

  const add = useCallback(
    async (movieId) => {
      await apiAdd(movieId);
      await refresh();
    },
    [refresh]
  );

  const remove = useCallback(
    async (movieId) => {
      await apiRemove(movieId);
      await refresh();
    },
    [refresh]
  );

  return { items, byMovieId, loading, add, remove, refresh };
}