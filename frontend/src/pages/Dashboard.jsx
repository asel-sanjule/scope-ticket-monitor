import { useState } from 'react';
import { Clapperboard, CircleCheck, CircleDot, Bell, RefreshCw } from 'lucide-react';
import { useMovies } from '../hooks/useMovies';
import { useAuth } from '../hooks/useAuth';
import { useWatchlist } from '../hooks/useWatchlist';
import { MovieCard } from '../components/MovieCard';
import { SearchBar } from '../components/SearchBar';
import { LoginModal } from '../components/LoginModal';
import { TelegramConnect } from '../components/TelegramConnect';

export function Dashboard() {
  const { movies, loading, refreshing, error, triggerRefresh } = useMovies();
  const { user, isLoggedIn, sendMagicLink, logout, refresh } = useAuth();
  const watchlist = useWatchlist(isLoggedIn);
  const [showLogin, setShowLogin] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all'); // 'all' | 'available' | 'unavailable' | 'watchlist'

  const requireLogin = () => setShowLogin(true);

  // Always source movie fields (status, lastChecked, etc.) from the single
  // `movies` list so "All" and "My Watchlist" never show divergent data.
  // `watchlist.items` is only used to determine *membership* (which movies
  // are followed), not to supply the movie's own fields.
  const baseList =
    filter === 'watchlist'
      ? movies.filter((m) => watchlist.byMovieId.has(m.id))
      : movies;

  const filtered = baseList.filter((m) => {
    const matchesSearch = m.title.toLowerCase().includes(search.toLowerCase());
    const matchesFilter =
      filter === 'all' ||
      filter === 'watchlist' ||
      (filter === 'available' && m.available) ||
      (filter === 'unavailable' && !m.available);
    return matchesSearch && matchesFilter;
  });

  const availableCount = movies.filter((m) => m.available).length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-indigo-700 text-white px-6 py-5 shadow-md">
        <div className="max-w-2xl mx-auto flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
              <Clapperboard size={22} strokeWidth={2.25} />
              Scope Ticket Monitor
            </h1>
            <p className="text-indigo-300 text-sm mt-0.5">
              {loading
                ? 'Loading…'
                : `${availableCount} of ${movies.length} movies have tickets available`}
            </p>
          </div>

          {isLoggedIn ? (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-indigo-200 hidden sm:inline">{user.email}</span>
              <button
                onClick={logout}
                className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 font-medium transition-colors"
              >
                Sign out
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowLogin(true)}
              className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-sm font-medium transition-colors"
            >
              Sign in
            </button>
          )}
        </div>
      </header>

      {showLogin && (
        <LoginModal onClose={() => setShowLogin(false)} onSendLink={sendMagicLink} />
      )}

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {isLoggedIn && !user.telegramLinked && (
          <TelegramConnect onLinked={refresh} />
        )}

        {/* Search */}
        <SearchBar value={search} onChange={setSearch} />

        {/* Filter tabs */}
        <div className="flex flex-wrap gap-2">
          {[
            { key: 'all', label: 'All', icon: null },
            { key: 'available', label: 'Available', icon: CircleCheck, iconColor: 'text-emerald-500' },
            { key: 'unavailable', label: 'Not Available', icon: CircleDot, iconColor: 'text-red-500' },
            ...(isLoggedIn
              ? [{
                  key: 'watchlist',
                  label: `My Watchlist (${watchlist.items.length})`,
                  icon: Bell,
                  iconColor: 'text-indigo-500',
                }]
              : []),
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filter === tab.key
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {tab.icon && (
                <tab.icon
                  size={15}
                  strokeWidth={2.25}
                  className={filter === tab.key ? 'text-white' : tab.iconColor}
                />
              )}
              {tab.label}
            </button>
          ))}

          {/* Global refresh */}
          <button
            onClick={triggerRefresh}
            disabled={refreshing}
            className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium
                       bg-white border border-gray-200 text-gray-600
                       hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            <RefreshCw size={15} strokeWidth={2.25} className={refreshing ? 'animate-spin' : ''} />
            {refreshing ? 'Refreshing…' : 'Refresh All'}
          </button>
        </div>

        {/* States */}
        {loading && (
          <div className="text-center py-12 text-gray-400">Loading movies…</div>
        )}

        {error && (
          <div className="text-center py-12 text-red-400">{error}</div>
        )}

        {!loading && filtered.length === 0 && !error && (
          <div className="text-center py-12 text-gray-400">
            {filter === 'watchlist' ? (
              <span className="inline-flex items-center gap-1.5">
                You're not following any movies yet. Tap
                <Bell size={14} strokeWidth={2.25} className="inline text-gray-400" />
                Notify Me on a movie that isn't available yet.
              </span>
            ) : (
              `No movies found for "${search}"`
            )}
          </div>
        )}

        {/* Refreshing banner */}
        {refreshing && (
          <div className="bg-indigo-50 border border-indigo-200 text-indigo-700
                          rounded-xl px-4 py-3 text-sm text-center">
            Refreshing in background — this takes about 30 seconds…
          </div>
        )}

        {/* Movie list */}
        <div className="space-y-3">
          {filtered.map((movie) => (
            <MovieCard
              key={movie.id}
              movie={movie}
              onRefresh={triggerRefresh}
              refreshing={refreshing}
              isLoggedIn={isLoggedIn}
              watchlistItem={watchlist.byMovieId.get(movie.id)}
              onAddWatchlist={watchlist.add}
              onRemoveWatchlist={watchlist.remove}
              onRequireLogin={requireLogin}
              forceShowNotify={filter === 'watchlist'}
            />
          ))}
        </div>
      </main>
    </div>
  );
}
