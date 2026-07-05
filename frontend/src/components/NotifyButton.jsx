import { useState } from 'react';

export function NotifyButton({ movieId, isLoggedIn, watchlistItem, onAdd, onRemove, onRequireLogin }) {
  const [pending, setPending] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  async function handleClick() {
    if (!isLoggedIn) {
      onRequireLogin();
      return;
    }
    setPending(true);
    setErrorMsg('');
    try {
      if (watchlistItem) {
        await onRemove(movieId);
      } else {
        await onAdd(movieId);
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'Something went wrong.');
    } finally {
      setPending(false);
    }
  }

  if (watchlistItem?.notifiedAt) {
    return (
      <div className="flex flex-col gap-1">
        <button
          onClick={handleClick}
          disabled={pending}
          title="Tickets are available — click to remove from watchlist"
          className="px-3 py-1.5 text-sm rounded-lg font-medium
                     bg-emerald-50 text-emerald-700 border border-emerald-200
                     hover:bg-emerald-100 disabled:opacity-50 transition-colors"
        >
          {pending ? '…' : '🔔 Notified — remove'}
        </button>
        {errorMsg && <p className="text-xs text-red-600">{errorMsg}</p>}
      </div>
    );
  }

  if (watchlistItem) {
    return (
      <div className="flex flex-col gap-1">
        <button
          onClick={handleClick}
          disabled={pending}
          title="Click to stop following this movie"
          className="px-3 py-1.5 text-sm rounded-lg font-medium
                     bg-indigo-50 text-indigo-700 border border-indigo-200
                     hover:bg-indigo-100 disabled:opacity-50 transition-colors"
        >
          {pending ? '…' : '✓ Following'}
        </button>
        {errorMsg && <p className="text-xs text-red-600">{errorMsg}</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        onClick={handleClick}
        disabled={pending}
        className="px-3 py-1.5 text-sm rounded-lg font-medium
                   bg-white border border-gray-200 text-gray-600
                   hover:bg-gray-50 disabled:opacity-50 transition-colors"
      >
        {pending ? '…' : '🔔 Notify Me'}
      </button>
      {errorMsg && <p className="text-xs text-red-600">{errorMsg}</p>}
    </div>
  );
}
