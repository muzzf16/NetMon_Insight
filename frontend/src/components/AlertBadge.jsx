export default function AlertBadge({ severity }) {
  const label = severity || 'unknown';
  return (
    <span className={`badge ${label.toLowerCase()}`}>
      {label}
    </span>
  );
}
