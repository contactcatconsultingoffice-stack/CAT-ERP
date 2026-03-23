export function SkeletonBox({ width = '100%', height = '20px', radius = '4px', className = '' }: { width?: string | number, height?: string | number, radius?: string | number, className?: string }) {
  return (
    <div 
      className={`skeleton-anim ${className}`} 
      style={{ 
        width, height, borderRadius: radius, 
        // Inline fallback setup for shimmer inside the component
        background: 'linear-gradient(90deg, rgba(255,255,255,0.05) 25%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.05) 75%)',
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.5s infinite linear',
        backgroundColor: 'rgba(255,255,255,0.03)' // base color
      }} 
    />
  );
}

export function TableSkeleton({ rows = 5, cols = 4 }) {
  return (
    <table className="data-table" style={{ width: '100%' }}>
      <thead>
        <tr>
          {Array.from({ length: cols }).map((_, i) => (
            <th key={i}><SkeletonBox height="16px" width="80%" /></th>
          ))}
        </tr>
      </thead>
      <tbody>
        {Array.from({ length: rows }).map((_, r) => (
          <tr key={r}>
            {Array.from({ length: cols }).map((_, c) => (
              <td key={c}><SkeletonBox height="14px" width={c === 0 ? "90%" : "60%"} /></td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function KpiSkeleton({ count = 4 }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card glass-card" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <SkeletonBox width="48px" height="48px" radius="12px" />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <SkeletonBox width="60%" height="12px" radius="4px" />
            <SkeletonBox width="80%" height="24px" radius="4px" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function CardSkeleton({ lines = 3 }) {
  return (
    <div className="card glass-card" style={{ padding: '1.5rem' }}>
      <SkeletonBox width="40%" height="24px" className="mb-4" />
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1rem' }}>
        {Array.from({ length: lines }).map((_, i) => (
          <SkeletonBox key={i} height="12px" width={i === lines - 1 ? '70%' : '100%'} />
        ))}
      </div>
    </div>
  );
}
