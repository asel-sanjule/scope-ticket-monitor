import { useState, useEffect, useCallback } from 'react';
import { fetchCurrentUser, requestMagicLink, logout as apiLogout } from '../api/client';

export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const current = await fetchCurrentUser();
      setUser(current);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const sendMagicLink = useCallback((email) => requestMagicLink(email), []);

  const logout = useCallback(async () => {
    await apiLogout();
    setUser(null);
  }, []);

  return { user, loading, isLoggedIn: !!user, sendMagicLink, logout, refresh };
}