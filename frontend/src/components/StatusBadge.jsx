export function StatusBadge({ available }) {
  if (available) {
    return (
      <span className="inline-flex items-center gap-1.5 text-emerald-600 font-semibold text-sm">
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        Available
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 text-red-400 font-semibold text-sm">
      <span className="w-2 h-2 rounded-full bg-red-400" />
      Not Available
    </span>
  );
}