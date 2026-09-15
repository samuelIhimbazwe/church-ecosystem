export function Spinner({
  label = 'Loading',
  size,
}: {
  label?: string;
  size?: 'sm' | 'lg';
}) {
  return (
    <span
      className={`spinner${size === 'lg' ? ' lg' : ''}`}
      role="status"
      aria-label={label}
    />
  );
}
