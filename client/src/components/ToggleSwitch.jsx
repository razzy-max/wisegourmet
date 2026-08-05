export default function ToggleSwitch({ checked, onChange, label, disabled = false }) {
  return (
    <label className={`toggle-switch${disabled ? ' toggle-switch-disabled' : ''}`}>
      <input
        type="checkbox"
        className="toggle-switch-input"
        checked={checked}
        onChange={onChange}
        disabled={disabled}
      />
      <span className="toggle-switch-track">
        <span className="toggle-switch-knob" />
      </span>
      {label && <span className="toggle-switch-label">{label}</span>}
    </label>
  );
}
