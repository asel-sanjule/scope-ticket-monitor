export function SearchBar({ value, onChange }) {
  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
        🔍
      </span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search movies…"
        className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl
                   text-gray-700 bg-white focus:outline-none focus:ring-2
                   focus:ring-indigo-400 focus:border-transparent transition"
      />
      {value && (
        <button
          onClick={() => onChange('')}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400
                     hover:text-gray-600"
        >
          ✕
        </button>
      )}
    </div>
  );
}