export default function StatusIndicator({ status, size = 10 }) {
  return (
    <span
      className={`status-dot ${status}`}
      style={{ width: size, height: size }}
      title={status}
    />
  );
}
