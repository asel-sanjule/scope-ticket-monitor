import { StatusBadge } from './StatusBadge';
import { LastChecked } from './LastChecked';

export function MovieCard({ movie, onRefresh, refreshing }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex gap-4">
      {/* Poster */}
      <img
        src={movie.poster}
        alt={movie.title}
        className="w-20 h-28 object-cover rounded-lg flex-shrink-0 bg-gray-100"
        onError={(e) => {
          e.target.src = '/placeholder-poster.png';
          e.target.onerror = null;
        }}
      />

      {/* Info */}
      <div className="flex flex-col gap-2 flex-1 min-w-0">
        <h2 className="font-bold text-gray-900 leading-tight line-clamp-2">
          {movie.title}
        </h2>

        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">
            Status
          </p>
          <StatusBadge available={movie.available} />
        </div>

        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">
            Last Checked
          </p>
          <LastChecked timestamp={movie.lastChecked} />
        </div>

        {/* Actions */}
        <div className="flex gap-2 mt-auto pt-1">
          <button
            onClick={onRefresh}
            disabled={refreshing}
            className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg
                       hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed
                       transition-colors"
          >
            {refreshing ? 'Refreshing…' : '↻ Refresh'}
          </button>

          <a
            href={movie.movieUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 text-sm border border-gray-200 text-gray-600
                       rounded-lg hover:bg-gray-50 transition-colors"
          >
            View →
          </a>
        </div>
      </div>
    </div>
  );
}