import { useState, useRef, useCallback } from 'react'
import Modal from './Modal'

function parseCSV(text) {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')
  const result = []
  for (const line of lines) {
    if (!line.trim()) continue
    const row = []; let cur = '', inQ = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') {
        if (inQ && line[i+1] === '"') { cur += '"'; i++ } else inQ = !inQ
      } else if (ch === ',' && !inQ) { row.push(cur.trim()); cur = '' }
      else cur += ch
    }
    row.push(cur.trim())
    result.push(row)
  }
  return result
}

function readFileWithSheetJS(file) {
  return new Promise((resolve, reject) => {
    
    const doRead = () => {
      const reader = new FileReader()
      reader.onload = e => {
        try {
          const wb  = window.XLSX.read(e.target.result, { type: 'binary' })
          const ws  = wb.Sheets[wb.SheetNames[0]]
          
          const rows = window.XLSX.utils.sheet_to_json(ws, { header:1, defval:'' })
          resolve(rows.map(r => r.map(v => String(v ?? '').trim())))
        } catch(err) { reject(err) }
      }
      reader.onerror = () => reject(new Error('FileReader failed'))
      reader.readAsBinaryString(file)
    }

    if (window.XLSX) { doRead(); return }

    
    const s = document.createElement('script')
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'
    s.onload  = doRead
    s.onerror = () => reject(new Error(
      'Could not load the Excel library. Check your internet connection, ' +
      'or save the file as .csv and import that instead.'
    ))
    document.head.appendChild(s)
  })
}

const COL_MAP = {
  name:         ['name','product name','product'],
  categoryName: ['category','category name','cat'],
  quantity:     ['qty','quantity','stock','stock qty'],
  price:        ['price','selling price','price (₹)','price (rs)','sell price'],
  costPrice:    ['cost','cost price','cost (₹)','cost (rs)','costprice','unit cost'],
  sku:          ['sku','item code','barcode','code'],
  reorderLevel: ['reorder','reorder level','reorderlevel','min stock','minimum stock'],
  description:  ['description','desc','notes','note'],
}

function buildHeaderMap(headers) {
  const map = {}
  headers.forEach((h, i) => {
    const norm = String(h ?? '').toLowerCase().trim()
    for (const [field, aliases] of Object.entries(COL_MAP)) {
      if (aliases.includes(norm)) { map[field] = i; break }
    }
  })
  return map
}

function rowToProduct(cells, hmap) {
  const get = (f, def = '') => {
    const idx = hmap[f]
    return idx !== undefined && idx < cells.length ? String(cells[idx] ?? '') : def
  }
  return {
    name: get('name'), categoryName: get('categoryName'),
    quantity: get('quantity','0'), price: get('price','0'),
    costPrice: get('costPrice','0'), sku: get('sku'),
    reorderLevel: get('reorderLevel','10'), description: get('description'),
  }
}

function validateRow(row, idx, categories) {
  const errors = []
  if (!row.name?.trim())         errors.push('Name required')
  if (!row.categoryName?.trim()) errors.push('Category required')
  if (isNaN(Number(row.quantity)) || Number(row.quantity) < 0) errors.push('Invalid qty')
  if (isNaN(Number(row.price))    || Number(row.price)    < 0) errors.push('Invalid price')
  const cat = categories.find(c =>
    c.name.toLowerCase() === row.categoryName?.toLowerCase().trim()
  )
  return {
    row: idx + 2, data: row, errors,
    categoryId: cat?.id ?? null,
    catMissing: !cat && !!row.categoryName?.trim(),
  }
}

const Pill = ({ ok, children }) => (
  <span style={{
    background: ok ? 'var(--green-dim)' : 'var(--red-dim)',
    color:      ok ? 'var(--green)'     : 'var(--red)',
    border:     `1px solid ${ok ? 'rgba(22,160,90,.2)' : 'rgba(220,53,53,.2)'}`,
    borderRadius:4, fontSize:10, fontFamily:'var(--mono)',
    padding:'2px 7px', whiteSpace:'nowrap',
  }}>{children}</span>
)

export default function ImportExcelModal({ categories, onClose, onImport }) {
  const [stage,    setStage]    = useState('upload')
  const [parsed,   setParsed]   = useState([])
  const [filename, setFilename] = useState('')
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)
  const [dragging, setDragging] = useState(false)
  const fileRef = useRef(null)

  const processFile = useCallback(async (file) => {
    if (!file) return
    const ext = file.name.split('.').pop().toLowerCase()
    if (!['csv','xls','xlsx'].includes(ext)) {
      setError('Unsupported file type. Please upload .csv, .xls or .xlsx.')
      return
    }
    setError('')
    setFilename(file.name)
    setLoading(true)

    try {
      let rows = []

      if (ext === 'csv') {
        
        const text = await new Promise((res, rej) => {
          const r = new FileReader()
          r.onload  = e => res(e.target.result)
          r.onerror = () => rej(new Error('Could not read file'))
          r.readAsText(file, 'utf-8')
        })
        rows = parseCSV(text)
      } else {
        
        rows = await readFileWithSheetJS(file)
      }

      if (rows.length < 2) {
        setError('File is empty or only has a header row.')
        setLoading(false)
        return
      }

      const [headerRow, ...dataRows] = rows
      const hmap = buildHeaderMap(headerRow)

      if (!('name' in hmap) || !('categoryName' in hmap)) {
        setError(
          'Required columns "Name" and "Category" not found. ' +
          'Make sure row 1 has column headers. ' +
          `Found: ${headerRow.filter(Boolean).join(', ') || '(nothing)'}`
        )
        setLoading(false)
        return
      }

      const validated = dataRows
        .filter(r => r.some(c => String(c).trim() !== ''))
        .map((r, i) => validateRow(rowToProduct(r, hmap), i, categories))

      setParsed(validated)
      setStage('preview')
    } catch (err) {
      setError(err.message || 'Failed to read file.')
    } finally {
      setLoading(false)
    }
  }, [categories])

  const onFileInput = e => { if (e.target.files[0]) processFile(e.target.files[0]) }
  const onDrop = e => {
    e.preventDefault(); setDragging(false)
    processFile(e.dataTransfer.files[0])
  }

  const handleImport = () => {
    const valid = parsed.filter(r => r.errors.length === 0 && r.categoryId !== null)
    onImport(valid.map(r => ({
      name:         r.data.name.trim(),
      categoryId:   r.categoryId,
      quantity:     Math.max(0, Math.round(Number(r.data.quantity) || 0)),
      price:        Math.max(0, Number(Number(r.data.price).toFixed(2))  || 0),
      costPrice:    Math.max(0, Number(Number(r.data.costPrice).toFixed(2)) || 0),
      sku:          r.data.sku?.trim()          || undefined,
      reorderLevel: Math.max(0, Math.round(Number(r.data.reorderLevel) || 10)),
      description:  r.data.description?.trim() || undefined,
    })))
  }

  const validCount = parsed.filter(r => r.errors.length === 0 && r.categoryId !== null).length
  const warnCount  = parsed.filter(r => r.errors.length === 0 && r.categoryId === null && r.catMissing).length
  const errCount   = parsed.filter(r => r.errors.length > 0).length

  const COLS = [
    { col:'Name',          req:true  }, { col:'Category',      req:true  },
    { col:'Qty',           req:true  }, { col:'Price (₹)',     req:true  },
    { col:'Cost (₹)',      req:false }, { col:'SKU',           req:false },
    { col:'Reorder Level', req:false }, { col:'Description',   req:false },
  ]

  return (
    <Modal title="Import Products" onClose={onClose} wide
      footer={
        stage === 'preview' ? (
          <>
            <button className="btn btn-ghost" onClick={() => { setStage('upload'); setParsed([]); setFilename(''); setError('') }}>
              ← Back
            </button>
            <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" disabled={validCount === 0} onClick={handleImport}>
              Import {validCount} Product{validCount !== 1 ? 's' : ''}
            </button>
          </>
        ) : (
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        )
      }
    >

      
      {stage === 'upload' && (
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

          
          <div
            onClick={() => !loading && fileRef.current?.click()}
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            style={{
              border:       `2px dashed ${dragging ? 'var(--accent)' : 'var(--border-md)'}`,
              borderRadius: 'var(--rl)',
              background:   dragging ? 'var(--accent-dim)' : 'var(--raised)',
              cursor:       loading ? 'wait' : 'pointer',
              padding:      '36px 24px',
              textAlign:    'center',
              transition:   'border-color .15s, background .15s',
            }}
          >
            {loading ? (
              <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:10 }}>
                <span className="spinner" style={{ width:24, height:24, borderWidth:3 }} />
                <span style={{ color:'var(--text-2)', fontSize:13 }}>Reading file…</span>
              </div>
            ) : (
              <>
                <div style={{ fontSize:32, marginBottom:10 }}>📂</div>
                <div style={{ color:'var(--text)', fontWeight:500, marginBottom:5, fontSize:14 }}>
                  Drop your file here, or click to browse
                </div>
                <div style={{ color:'var(--text-2)', fontSize:12 }}>
                  Supports{' '}
                  {['.xlsx','.xls','.csv'].map(e => (
                    <span key={e} style={{ color:'var(--accent)', fontFamily:'var(--mono)', marginLeft:4 }}>{e}</span>
                  ))}
                </div>
              </>
            )}
            <input ref={fileRef} type="file" accept=".csv,.xls,.xlsx"
              onChange={onFileInput} style={{ display:'none' }} />
          </div>

          {error && (
            <div className="alert alert-error" style={{ flexDirection:'column', alignItems:'flex-start', gap:4 }}>
              <strong>Could not read file</strong>
              <span style={{ fontSize:12 }}>{error}</span>
            </div>
          )}

          
          <div style={{ background:'var(--raised)', border:'1px solid var(--border)', borderRadius:'var(--r)', padding:'14px 16px' }}>
            <div style={{ color:'var(--text-3)', fontSize:11, fontFamily:'var(--mono)', letterSpacing:'.08em', textTransform:'uppercase', marginBottom:10 }}>
              Expected columns (row 1 = headers)
            </div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:10 }}>
              {COLS.map(({ col, req }) => (
                <span key={col} style={{
                  background:   req ? 'var(--accent-dim)' : 'var(--raised)',
                  border:       `1px solid ${req ? 'var(--accent-border)' : 'var(--border-md)'}`,
                  borderRadius: 4,
                  color:        req ? 'var(--accent)' : 'var(--text-2)',
                  fontFamily:   'var(--mono)', fontSize:11, padding:'2px 8px',
                }}>
                  {col}{req ? ' *' : ''}
                </span>
              ))}
            </div>
            <div style={{ color:'var(--text-3)', fontSize:11.5, lineHeight:1.6 }}>
              * Required. <strong>Category</strong> must exactly match an existing category name (case-insensitive).
              Export your products first to use as a template.
            </div>
          </div>
        </div>
      )}

      
      {stage === 'preview' && (
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

          
          <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
            <span style={{ color:'var(--text-2)', fontSize:12 }}>
              <strong style={{ color:'var(--text)' }}>{filename}</strong>
              {' '}— {parsed.length} data row{parsed.length !== 1 ? 's' : ''}
            </span>
            {validCount > 0 && <Pill ok>{validCount} ready to import</Pill>}
            {warnCount  > 0 && <Pill ok={false}>{warnCount} unknown category</Pill>}
            {errCount   > 0 && <Pill ok={false}>{errCount} invalid</Pill>}
          </div>

          
          <div className="table-wrap" style={{ maxHeight:340, overflowY:'auto' }}>
            <table className="data-table" style={{ fontSize:12 }}>
              <thead>
                <tr>
                  <th>#</th><th>Name</th><th>Category</th>
                  <th>Qty</th><th>Price</th><th>Cost</th><th>SKU</th><th>Status</th>
                </tr>
              </thead>
              <tbody>
                {parsed.map((r, i) => {
                  const ok   = r.errors.length === 0 && r.categoryId !== null
                  const warn = r.errors.length === 0 && r.categoryId === null && r.catMissing
                  return (
                    <tr key={i}>
                      <td className="mono muted">{r.row}</td>
                      <td style={{ fontWeight:500 }}>
                        {r.data.name || <span style={{ color:'var(--red)' }}>—</span>}
                      </td>
                      <td>
                        {r.categoryId
                          ? <span className="tag">{r.data.categoryName}</span>
                          : <span style={{ color: r.catMissing ? 'var(--amber)' : 'var(--text-3)', fontSize:11 }}>
                              {r.data.categoryName || '—'}{r.catMissing ? ' ⚠' : ''}
                            </span>
                        }
                      </td>
                      <td className="mono">{r.data.quantity}</td>
                      <td className="mono">₹{Number(r.data.price||0).toLocaleString('en-IN')}</td>
                      <td className="mono muted">₹{Number(r.data.costPrice||0).toLocaleString('en-IN')}</td>
                      <td style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--text-3)' }}>
                        {r.data.sku || '—'}
                      </td>
                      <td>
                        {ok   && <Pill ok>✓ Ready</Pill>}
                        {warn && <Pill ok={false}>⚠ No category</Pill>}
                        {r.errors.length > 0 && (
                          <span title={r.errors.join(', ')}>
                            <Pill ok={false}>✕ {r.errors[0]}</Pill>
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {warnCount > 0 && (
            <div style={{ background:'var(--amber-dim)', border:'1px solid rgba(201,124,16,.2)', borderRadius:'var(--r)', padding:'10px 14px', fontSize:12.5, color:'var(--amber)' }}>
              ⚠ {warnCount} row{warnCount !== 1 ? 's' : ''} will be skipped — category not found.
              Create the missing categories first, then re-import.
            </div>
          )}

          {validCount === 0 && errCount > 0 && (
            <div className="alert alert-error">
              No valid rows to import. Fix the errors and try again.
            </div>
          )}
        </div>
      )}
    </Modal>
  )
}
