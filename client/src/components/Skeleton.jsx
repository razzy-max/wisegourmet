const VARIANT_CLASS = {
  card: 'skeleton-card',
  row: 'skeleton-row',
  text: 'skeleton-text',
};

export default function Skeleton({ variant = 'text', count = 1 }) {
  const variantClass = VARIANT_CLASS[variant] || VARIANT_CLASS.text;

  return (
    <div className="skeleton-group" aria-hidden="true">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className={`skeleton ${variantClass}`} />
      ))}
    </div>
  );
}
