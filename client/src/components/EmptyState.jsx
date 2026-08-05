export default function EmptyState({ icon: Icon, heading, subtext, actionLabel, onAction }) {
  return (
    <div className="empty-state empty-state-animate">
      {Icon && (
        <span className="empty-state-badge">
          <Icon size={44} />
        </span>
      )}
      {heading && <h3 className="empty-state-heading">{heading}</h3>}
      {subtext && <p className="empty-state-subtext">{subtext}</p>}
      {actionLabel && (
        <button type="button" className="btn empty-state-action" onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </div>
  );
}
