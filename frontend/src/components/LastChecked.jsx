export function LastChecked({ timestamp }) {
  if (!timestamp) {
    return <span className="text-gray-400 text-sm">Never checked</span>;
  }

  const date = new Date(timestamp);
  const dateStr = date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const timeStr = date.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="text-sm text-gray-500">
      <p>{dateStr}</p>
      <p className="font-medium text-gray-700">{timeStr}</p>
    </div>
  );
}