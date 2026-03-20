// Shared Table/Card view toggle button
export default function ViewToggle({ view, onChange }) {
  return (
    <div style={{ display:'flex', border:'1px solid var(--border-md)', borderRadius:6, overflow:'hidden', flexShrink:0 }}>
      {['table','cards'].map(v => (
        <button key={v} onClick={() => onChange(v)} style={{
          padding:'4px 12px', fontSize:11, border:'none', cursor:'pointer',
          fontFamily:'var(--font)', fontWeight:500, textTransform:'capitalize',
          background: view === v ? 'var(--accent)' : 'transparent',
          color: view === v ? '#fff' : 'var(--text-3)',
          transition:'all 140ms',
        }}>{v === 'table' ? '⊞ Table' : '▦ Cards'}</button>
      ))}
    </div>
  )
}
