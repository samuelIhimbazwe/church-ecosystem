export function Skeleton({
  height = '1rem',
  width = '100%',
  radius = 6,
  className = '',
}: {
  height?: string | number;
  width?: string | number;
  radius?: number;
  className?: string;
}) {
  return (
    <span
      className={`skeleton ${className}`.trim()}
      style={{
        display: 'inline-block',
        height,
        width,
        borderRadius: radius,
      }}
      aria-hidden
    />
  );
}

export function TableSkeleton({
  rows = 5,
  cols = 4,
}: {
  rows?: number;
  cols?: number;
}) {
  return (
    <div className="data-table-wrap" aria-busy="true" aria-label="Loading">
      <table className="data-table">
        <thead>
          <tr>
            {Array.from({ length: cols }, (_, i) => (
              <th key={i}>
                <Skeleton height="0.85rem" width="70%" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }, (_, r) => (
            <tr key={r}>
              {Array.from({ length: cols }, (_, c) => (
                <td key={c}>
                  <Skeleton height="0.9rem" width={c === 0 ? '85%' : '55%'} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="stack" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="panel" style={{ padding: '1rem' }}>
          <Skeleton height="1.1rem" width="40%" />
          <div style={{ marginTop: '0.65rem' }}>
            <Skeleton height="0.85rem" width="90%" />
          </div>
          <div style={{ marginTop: '0.4rem' }}>
            <Skeleton height="0.85rem" width="60%" />
          </div>
        </div>
      ))}
    </div>
  );
}
