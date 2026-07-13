import { useState, useEffect, useRef } from 'react';
import { getTelegramLinkCode } from '../api/client';

export function TelegramConnect({ onLinked }) {
  const [linkInfo, setLinkInfo] = useState(null);
  const [dismissed, setDismissed] = useState(false);
  const [loading, setLoading] = useState(true);
  const pollRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const data = await getTelegramLinkCode();
        if (cancelled) return;

        if (data.alreadyLinked) {
          onLinked?.();
          return;
        }
        setLinkInfo(data);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    // Poll every 3s to notice once the user has completed linking in Telegram
    pollRef.current = setInterval(async () => {
      const data = await getTelegramLinkCode();
      if (data.alreadyLinked) {
        clearInterval(pollRef.current);
        onLinked?.();
      }
    }, 3000);

    return () => {
      cancelled = true;
      clearInterval(pollRef.current);
    };
  }, [onLinked]);

  if (dismissed || loading || !linkInfo) return null;

  return (
    <div className="bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3">
      <div className="flex-1 text-sm text-indigo-900">
        <p className="font-medium">Connect Telegram to get notified</p>
        <p className="text-indigo-700 mt-0.5">
          Tap the button, then send <code className="bg-white px-1 rounded">/start</code> in the chat that opens.
          We'll message you the moment tickets go on sale for movies on your watchlist.
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <a
          href={linkInfo.deepLink}
          target="_blank"
          rel="noopener noreferrer"
          className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition-colors whitespace-nowrap"
        >
          Connect Telegram
        </a>
        <button
          onClick={() => setDismissed(true)}
          className="px-3 py-1.5 rounded-lg bg-white border border-indigo-200 text-indigo-700 text-sm font-medium hover:bg-indigo-100 transition-colors"
        >
          Later
        </button>
      </div>
    </div>
  );
}