import { useState } from 'react';
import { KeyIcon, CheckIcon } from './icons';

export default function PinDisplay({ pin, label = 'Pickup PIN', subtitle }) {
  const [copied, setCopied] = useState(false);

  const copyPin = () => {
    if (!pin) return;
    navigator.clipboard.writeText(pin);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      copyPin();
    }
  };

  return (
    <article className="panel order-delivery-pin">
      <div className="pin-header">
        <span><KeyIcon size={15} className="status-badge-icon" /> {label}</span>
        {subtitle && <span className="pin-subtitle">{subtitle}</span>}
      </div>
      {pin ? (
        <div
          className="pin-display"
          onClick={copyPin}
          onKeyDown={handleKeyDown}
          role="button"
          tabIndex={0}
        >
          <strong>{pin}</strong>
          <p className="pin-hint" style={{ opacity: copied ? 1 : 0.5 }}>
            {copied ? <><CheckIcon size={13} className="status-badge-icon" /> Copied!</> : 'Tap to copy'}
          </p>
        </div>
      ) : (
        <p className="muted">PIN will appear after payment is verified.</p>
      )}
    </article>
  );
}
