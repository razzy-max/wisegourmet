export default function PinEntryForm({
  helperText,
  placeholder = 'Enter PIN',
  value,
  onChange,
  onSubmit,
  submitting,
  submitLabel,
  submittingLabel,
}) {
  return (
    <div className="pin-entry">
      <p className="muted">{helperText}</p>
      <div className="row pin-entry-row">
        <input
          type="password"
          maxLength="4"
          placeholder={placeholder}
          className="pin-entry-input"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={submitting}
        />
        <button className="btn" type="button" onClick={onSubmit} disabled={submitting}>
          {submitting ? submittingLabel : submitLabel}
        </button>
      </div>
    </div>
  );
}
