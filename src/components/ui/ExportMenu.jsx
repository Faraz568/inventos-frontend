import { useState, useEffect, useRef } from 'react'

export default function ExportMenu({ onExport, label = 'Export', disabled = false }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const pick = format => { setOpen(false); onExport(format) }

  return (
    <div className="export-menu" ref={ref}>
      <button className="btn btn-ghost btn-sm" onClick={() => setOpen(o => !o)} disabled={disabled} style={{ gap:5 }}>
        <span style={{ fontSize:11 }}>↓</span> {label}
        <span style={{ opacity:.4, fontSize:10 }}>▾</span>
      </button>
      {open && (
        <div className="export-dropdown" style={{ top:'auto', bottom:'calc(100% + 6px)' }}>
          {[
            { fmt:'csv',   icon:'📄', label:'CSV',   sub:'Comma-separated' },
            { fmt:'excel', icon:'📊', label:'Excel', sub:'Microsoft Excel' },
          ].map(({ fmt, icon, label, sub }) => (
            <div key={fmt} className="export-item" onClick={() => pick(fmt)}>
              <span style={{ fontSize:14 }}>{icon}</span>
              <div>
                <div style={{ fontWeight:500, color:'var(--text)', fontSize:12.5 }}>{label}</div>
                <div style={{ fontSize:10.5, color:'var(--text-3)' }}>{sub}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
