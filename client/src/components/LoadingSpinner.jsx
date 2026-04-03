export default function LoadingSpinner({ label = 'Loading...' }) {
  return (
    <div className="loading-wrap" role="status" aria-live="polite" aria-label={label}>
      <span className="loading-dot" />
      <span className="loading-dot" />
      <span className="loading-dot" />
      <span className="loading-label">{label}</span>
    </div>
  );
}
