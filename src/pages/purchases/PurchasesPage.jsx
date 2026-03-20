import { useState, useEffect, useCallback, useRef } from 'react'
import AppLayout from '../../components/layout/AppLayout'
import ViewToggle from '../../components/ui/ViewToggle'
import Modal from '../../components/ui/Modal'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import { useToast } from '../../context/ToastContext'
import { getPurchases, createPurchase, updatePurchase, deletePurchase } from '../../api/purchaseApi'
import { exportPurchases } from '../../utils/exportUtils'
import { getProducts } from '../../api/productApi'

const SUPPLIERS = ['TechMart India','Office Supplies Co','Display World','Furniture Hub','General Traders','Other']
const STATUSES  = [{ value:'received', label:'Received' },{ value:'pending', label:'Pending' },{ value:'cancelled', label:'Cancelled' }]
const today     = () => new Date().toISOString().slice(0,10)

// Print a multi-line PO
function printPurchaseOrder(poNumber, meta, lines) {
  const fmt   = n => Number(n||0).toLocaleString('en-IN',{minimumFractionDigits:2})
  const fdate = d => new Date(d).toLocaleDateString('en-IN',{day:'numeric',month:'long',year:'numeric'})
  const stamp = new Date().toLocaleString('en-IN',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'})
  const subtotal = lines.reduce((s,l)=>s+l.qty*l.unitCost,0)

  const rows = lines.map((l,i)=>`
    <tr>
      <td style="color:#9ca3af;font-size:11px">${String(i+1).padStart(2,'0')}</td>
      <td>
        <div style="font-weight:600;color:#111827">${l.productName}</div>
        ${l.categoryName?`<span style="display:inline-block;background:#eff6ff;color:#1d4ed8;border-radius:4px;font-size:10px;padding:1px 6px;margin-top:3px">${l.categoryName}</span>`:''}
      </td>
      <td style="text-align:right;font-weight:600">${l.qty}</td>
      <td style="text-align:right">₹${fmt(l.unitCost)}</td>
      <td style="text-align:right;font-weight:700;color:#111827">₹${fmt(l.qty*l.unitCost)}</td>
    </tr>`).join('')

  const html=`<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">
<title>${poNumber} — Purchase Order</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Segoe UI',Arial,sans-serif;font-size:13px;color:#1a1a2e;background:#fff}
.page{max-width:720px;margin:0 auto;padding:48px 52px}
.header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:36px;padding-bottom:24px;border-bottom:3px solid #1d4ed8}
.brand{font-size:22px;font-weight:700;letter-spacing:.08em;color:#1d4ed8}
.brand-sub{font-size:11px;color:#6b7280;margin-top:3px}
.po-label{font-size:11px;text-transform:uppercase;letter-spacing:.12em;color:#6b7280;text-align:right}
.po-number{font-size:22px;font-weight:700;color:#1d4ed8;margin-top:2px;font-family:'Courier New',monospace;text-align:right}
.meta-grid{display:grid;grid-template-columns:1fr 1fr 1fr;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;margin-bottom:28px}
.meta-cell{padding:13px 16px;border-right:1px solid #e5e7eb}.meta-cell:last-child{border-right:none}
.meta-key{font-size:10px;text-transform:uppercase;letter-spacing:.1em;color:#9ca3af;margin-bottom:4px}
.meta-val{font-size:13.5px;font-weight:600;color:#111827}
table{width:100%;border-collapse:collapse}
thead th{background:#1d4ed8;color:#fff;font-size:11px;font-weight:600;letter-spacing:.06em;padding:10px 14px;text-align:left;text-transform:uppercase}
thead th:last-child{text-align:right}
tbody tr{border-bottom:1px solid #f3f4f6}tbody tr:last-child{border-bottom:none}
tbody td{padding:12px 14px;font-size:13px;color:#374151;vertical-align:top}tbody td:last-child{text-align:right}
.totals{border-top:2px solid #e5e7eb;display:flex;justify-content:flex-end}
.totals-inner{min-width:240px}
.total-row{display:flex;justify-content:space-between;padding:8px 14px;font-size:13px;color:#6b7280;border-bottom:1px solid #f3f4f6}
.total-row.grand{background:#1d4ed8;color:#fff;font-weight:700;font-size:15px}
.footer{margin-top:36px;padding-top:18px;border-top:1px solid #e5e7eb;display:flex;justify-content:space-between;align-items:flex-end}
.sig-line{border-top:1px solid #9ca3af;width:180px;margin-bottom:6px;margin-left:auto}
.sig-label{font-size:11px;color:#9ca3af;text-align:right}
@media print{body{padding:0}.page{padding:24px 32px;max-width:100%}@page{margin:12mm 14mm;size:A4}}
@media screen{body{background:#f3f4f6}.page{background:#fff;box-shadow:0 4px 32px rgba(0,0,0,.12);margin:32px auto;border-radius:4px}}
</style></head><body>
<div class="page">
  <div class="header">
    <div><div class="brand">InventOS</div><div class="brand-sub">Inventory Management System</div></div>
    <div><div class="po-label">Purchase Order</div><div class="po-number">${poNumber}</div></div>
  </div>
  <div class="meta-grid">
    <div class="meta-cell"><div class="meta-key">Order Date</div><div class="meta-val">${fdate(meta.purchasedAt||new Date())}</div></div>
    <div class="meta-cell"><div class="meta-key">Supplier</div><div class="meta-val">${meta.supplierName}</div></div>
    <div class="meta-cell"><div class="meta-key">Status</div><div class="meta-val" style="text-transform:capitalize">${meta.status}</div></div>
  </div>
  <table>
    <thead><tr><th style="width:36px">#</th><th>Product</th><th style="text-align:right;width:60px">Qty</th><th style="text-align:right;width:110px">Unit Cost</th><th style="text-align:right;width:120px">Total</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="totals"><div class="totals-inner">
    <div class="total-row"><span>Subtotal (${lines.length} item${lines.length!==1?'s':''})</span><span>₹${fmt(subtotal)}</span></div>
    <div class="total-row"><span>Tax / GST</span><span style="color:#9ca3af">—</span></div>
    <div class="total-row grand"><span>Total Amount</span><span>₹${fmt(subtotal)}</span></div>
  </div></div>
  ${meta.note?`<div style="margin-top:20px;background:#f9fafb;border:1px solid #e5e7eb;border-left:4px solid #1d4ed8;padding:12px 16px"><div style="font-size:10px;text-transform:uppercase;letter-spacing:.1em;color:#9ca3af;margin-bottom:5px;font-weight:600">Notes</div><div style="font-size:13px;color:#374151;line-height:1.6">${meta.note}</div></div>`:''}
  <div class="footer">
    <div style="font-size:12px;color:#9ca3af">Generated by <strong style="color:#1d4ed8">InventOS</strong> &nbsp;·&nbsp; ${stamp}</div>
    <div><div class="sig-line"></div><div class="sig-label">Authorised Signature</div></div>
  </div>
</div>
<script>window.onload=()=>{window.print()}<\/script>
</body></html>`

  const win = window.open('','_blank','width=820,height=940')
  if (win) { win.document.write(html); win.document.close() }
}

function ExportBtn({ disabled, onExport }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])
  return (
    <div style={{ position:'relative', display:'inline-block' }} ref={ref}>
      <button className="btn btn-ghost btn-sm" disabled={disabled}
        onClick={() => setOpen(o => !o)} style={{ gap:6 }}>
        <span style={{ fontSize:13 }}>↓</span> Export <span style={{ opacity:.5, fontSize:10 }}>▾</span>
      </button>
      {open && (
        <div style={{ position:'absolute', right:0, bottom:'calc(100% + 6px)', background:'rgba(12,16,26,.97)', border:'1px solid var(--border-lit)', borderRadius:'var(--rl)', boxShadow:'0 16px 40px rgba(0,0,0,.6)', minWidth:160, overflow:'hidden', zIndex:50, animation:'slideUp .15s ease', backdropFilter:'blur(20px)' }}>
          {[{fmt:'csv',icon:'📄',label:'CSV',color:'var(--teal)',sub:'Comma-separated'},
            {fmt:'excel',icon:'📊',label:'Excel',color:'var(--amber)',sub:'Opens in Microsoft Excel'}].map(({fmt,icon,label,color,sub}) => (
            <div key={fmt} onClick={() => { setOpen(false); onExport(fmt) }}
              style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 14px', cursor:'pointer', fontFamily:'var(--mono)', fontSize:12, color:'var(--muted)', transition:'background .15s' }}
              onMouseEnter={e => { e.currentTarget.style.background='rgba(59,130,246,.08)'; e.currentTarget.style.color=color }}
              onMouseLeave={e => { e.currentTarget.style.background=''; e.currentTarget.style.color='var(--muted)' }}>
              <span style={{ fontSize:16 }}>{icon}</span>
              <div>
                <div style={{ fontWeight:500 }}>{label}</div>
                <div style={{ fontSize:10, color:'var(--muted)' }}>{sub}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Multi-Product Line Row ──────────────────────────────────────
const emptyLine = () => ({ _key: Math.random(), productId:'', productName:'', categoryName:'', qty:1, unitCost:'' })

function LineRow({ line, products, idx, onChange, onRemove, canRemove }) {
  const prod = products.find(p => p.id === Number(line.productId))

  return (
    <tr style={{ borderBottom:'1px solid var(--border)' }}>
      <td style={{ padding:'6px 8px', color:'var(--text-3)', fontSize:12, textAlign:'center', width:36 }}>{idx+1}</td>
      <td style={{ padding:'4px 8px' }}>
        <select value={line.productId}
          onChange={e => {
            const p = products.find(x=>x.id===Number(e.target.value))
            onChange({...line, productId:e.target.value, productName:p?.name||'', categoryName:p?.categoryName||'', unitCost:p?.costPrice||''})
          }}
          style={{ width:'100%', border:'1px solid var(--border-md)', borderRadius:6, padding:'6px 8px', fontSize:13, background:'var(--surface)', color:line.productId?'var(--text)':'var(--text-3)', outline:'none', cursor:'pointer', fontFamily:'var(--font)' }}>
          <option value="">— Select product —</option>
          {products.map(p=>(
            <option key={p.id} value={p.id}>{p.name}{p.sku?` (${p.sku})`:''}</option>
          ))}
        </select>
      </td>
      <td style={{ padding:'4px 8px', width:80 }}>
        <input type="number" min="1" value={line.qty}
          onChange={e => onChange({...line, qty:Number(e.target.value)||1})}
          style={{ width:'100%', border:'1px solid var(--border-md)', borderRadius:6, padding:'6px 8px', fontSize:13, background:'var(--surface)', color:'var(--text)', outline:'none', fontFamily:'var(--mono)', textAlign:'right' }} />
      </td>
      <td style={{ padding:'4px 8px', width:110 }}>
        <input type="number" min="0" step="0.01" value={line.unitCost}
          onChange={e => onChange({...line, unitCost:e.target.value})}
          placeholder="0.00"
          style={{ width:'100%', border:'1px solid var(--border-md)', borderRadius:6, padding:'6px 8px', fontSize:13, background:'var(--surface)', color:'var(--text)', outline:'none', fontFamily:'var(--mono)', textAlign:'right' }} />
      </td>
      <td style={{ padding:'4px 8px', width:110, textAlign:'right' }}>
        <span style={{ fontFamily:'var(--mono)', fontSize:13, fontWeight:600, color:'var(--teal)' }}>
          ₹{((Number(line.qty)||0)*(Number(line.unitCost)||0)).toLocaleString('en-IN',{minimumFractionDigits:2})}
        </span>
      </td>
      <td style={{ padding:'4px 8px', width:36, textAlign:'center' }}>
        {canRemove && (
          <button onClick={onRemove} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--red)', fontSize:16, lineHeight:1, opacity:.7, padding:2 }}
            onMouseEnter={e=>e.currentTarget.style.opacity=1}
            onMouseLeave={e=>e.currentTarget.style.opacity=.7}>✕</button>
        )}
      </td>
    </tr>
  )
}

// ─── Purchase Order Modal ────────────────────────────────────────
function PurchaseModal({ purchase, products, onClose, onSaved }) {
  const toast = useToast()

  // When editing a single existing purchase, seed with that line
  const [lines, setLines] = useState(() => {
    if (purchase) {
      return [{ _key: Math.random(), productId: String(purchase.productId), productName: purchase.productName, categoryName: purchase.categoryName, qty: purchase.quantity, unitCost: purchase.unitCost }]
    }
    return [emptyLine()]
  })

  const [meta, setMeta] = useState({
    supplierName: purchase?.supplierName ?? '',
    note:         purchase?.note         ?? '',
    status:       purchase?.status       ?? 'received',
    purchasedAt:  purchase?.purchasedAt  ? purchase.purchasedAt.slice(0,10) : today(),
  })
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})

  const setM = k => e => { setMeta(m => ({ ...m, [k]: e.target.value })); setErrors(ev => ({ ...ev, [k]: undefined })) }

  const updateLine = (idx, line) => setLines(ls => ls.map((l,i) => i===idx ? line : l))
  const removeLine = idx => setLines(ls => ls.filter((_,i) => i!==idx))
  const addLine    = ()  => setLines(ls => [...ls, emptyLine()])

  const subtotal = lines.reduce((s,l)=>s+(Number(l.qty)||0)*(Number(l.unitCost)||0),0)

  const validate = () => {
    const e = {}
    if (!meta.supplierName.trim()) e.supplierName = 'Enter supplier name'
    if (!meta.purchasedAt)         e.purchasedAt  = 'Select a date'
    lines.forEach((l,i) => {
      if (!l.productId)               e[`prod_${i}`] = 'Select product'
      if (!l.qty || Number(l.qty)<1)  e[`qty_${i}`]  = 'Qty must be ≥ 1'
      if (l.unitCost===''||Number(l.unitCost)<0) e[`cost_${i}`] = 'Enter valid cost'
    })
    return e
  }

  const save = async e => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setSaving(true)
    try {
      // Save each line as a separate purchase record (same as sales invoice pattern)
      // For editing, just update the single record
      if (purchase) {
        const l = lines[0]
        const qty = Number(l.qty), cost = Number(l.unitCost)
        await updatePurchase(purchase.id, {
          ...meta,
          productId: Number(l.productId), productName: l.productName, categoryName: l.categoryName,
          quantity: qty, unitCost: cost, totalCost: qty*cost,
          purchasedAt: new Date(meta.purchasedAt).toISOString(),
        })
      } else {
        for (const l of lines) {
          const qty = Number(l.qty), cost = Number(l.unitCost)
          await createPurchase({
            ...meta,
            productId: Number(l.productId), productName: l.productName, categoryName: l.categoryName,
            quantity: qty, unitCost: cost, totalCost: qty*cost,
            purchasedAt: new Date(meta.purchasedAt).toISOString(),
          })
        }
      }
      window.dispatchEvent(new Event('inv_data_update'))
      toast.success(purchase ? 'Purchase updated.' : `${lines.length} purchase${lines.length>1?'s':''} recorded.`)
      onSaved(); onClose()
    } catch (err) { setErrors({ _: err.response?.data?.message || 'Save failed' }) }
    finally { setSaving(false) }
  }

  const Err = ({ k }) => errors[k] ? <div style={{ color:'var(--red)', fontSize:11, marginTop:3 }}>{errors[k]}</div> : null

  return (
    <Modal title={purchase ? 'Edit Purchase' : 'New Purchase Order'} onClose={onClose}
      footer={<>
        <button className="btn btn-ghost" onClick={onClose} disabled={saving}>Cancel</button>
        <button className="btn btn-success" onClick={save} disabled={saving}>
          {saving && <span className="spinner" />}
          {saving ? 'Saving…' : purchase ? 'Save Changes' : `Record ${lines.length} Item${lines.length>1?'s':''}`}
        </button>
      </>}>
      <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

        {/* Supplier + Date + Status row */}
        <div className="field-row">
          <div className="field">
            <label>Supplier Name *</label>
            <input list="sup-list" type="text" placeholder="e.g. TechMart India"
              value={meta.supplierName} onChange={setM('supplierName')}
              style={errors.supplierName ? { borderColor:'var(--red)' } : {}} />
            <datalist id="sup-list">{SUPPLIERS.map(s => <option key={s} value={s} />)}</datalist>
            <Err k="supplierName" />
          </div>
          <div className="field">
            <label>Purchase Date *</label>
            <input type="date" value={meta.purchasedAt} onChange={setM('purchasedAt')}
              max={today()}
              style={{ ...(errors.purchasedAt ? { borderColor:'var(--red)' } : {}), colorScheme:'dark' }} />
            <Err k="purchasedAt" />
          </div>
          <div className="field">
            <label>Status</label>
            <select value={meta.status} onChange={setM('status')}>
              {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
        </div>

        {/* Product lines */}
        <div>
          <div style={{ display:'flex', justifyContent:'space-between', flexWrap:'wrap', gap:8, alignItems:'center', marginBottom:8 }}>
            <label style={{ fontSize:12, fontWeight:600, color:'var(--text-2)', textTransform:'uppercase', letterSpacing:'.05em' }}>
              Products ({lines.length})
            </label>
            {!purchase && (
              <button type="button" className="btn btn-ghost btn-sm" onClick={addLine} style={{ gap:4 }}>
                + Add Product
              </button>
            )}
          </div>
          <div style={{ border:'1px solid var(--border)', borderRadius:8, overflow:'hidden' }}>
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead>
                <tr style={{ background:'var(--raised)', borderBottom:'1px solid var(--border)' }}>
                  <th style={{ padding:'7px 8px', fontSize:10.5, fontWeight:600, color:'var(--text-3)', textAlign:'center', width:36 }}>#</th>
                  <th style={{ padding:'7px 8px', fontSize:10.5, fontWeight:600, color:'var(--text-3)', textAlign:'left' }}>Product</th>
                  <th style={{ padding:'7px 8px', fontSize:10.5, fontWeight:600, color:'var(--text-3)', textAlign:'right', width:80 }}>Qty</th>
                  <th style={{ padding:'7px 8px', fontSize:10.5, fontWeight:600, color:'var(--text-3)', textAlign:'right', width:110 }}>Unit Cost ₹</th>
                  <th style={{ padding:'7px 8px', fontSize:10.5, fontWeight:600, color:'var(--text-3)', textAlign:'right', width:110 }}>Total ₹</th>
                  <th style={{ width:36 }}></th>
                </tr>
              </thead>
              <tbody>
                {lines.map((line, idx) => (
                  <LineRow key={line._key} line={line} products={products} idx={idx}
                    onChange={l => updateLine(idx, l)}
                    onRemove={() => removeLine(idx)}
                    canRemove={lines.length > 1 && !purchase} />
                ))}
              </tbody>
            </table>
          </div>
          {lines.some((_,i)=>errors[`prod_${i}`]||errors[`qty_${i}`]||errors[`cost_${i}`]) && (
            <div style={{ color:'var(--red)', fontSize:11, marginTop:4 }}>Please fill all product rows correctly.</div>
          )}
        </div>

        {/* Subtotal */}
        {subtotal > 0 && (
          <div style={{ background:'var(--teal-dim)', border:'1px solid rgba(20,184,166,.2)', borderRadius:'var(--r)', padding:'10px 14px', display:'flex', justifyContent:'space-between', flexWrap:'wrap', gap:8, alignItems:'center' }}>
            <span style={{ color:'var(--muted)', fontSize:12 }}>Total Purchase Cost ({lines.length} item{lines.length>1?'s':''})</span>
            <span style={{ color:'var(--teal)', fontFamily:'var(--mono)', fontSize:18, fontWeight:500 }}>
              ₹{subtotal.toLocaleString('en-IN',{minimumFractionDigits:2})}
            </span>
          </div>
        )}

        {/* Notes */}
        <div className="field">
          <label>Notes</label>
          <textarea rows={2} placeholder="Optional notes about this purchase…" value={meta.note} onChange={setM('note')} />
        </div>

        {errors._ && <div className="alert alert-error">{errors._}</div>}
      </div>
    </Modal>
  )
}

// ─── Main Page ───────────────────────────────────────────────────
export default function PurchasesPage() {
  const toast = useToast()
  const [purchases,    setPurchases]    = useState([])
  const [products,     setProducts]     = useState([])
  const [loading,      setLoading]      = useState(true)
  const [showModal,    setShowModal]    = useState(false)
  const [editTarget,   setEditTarget]   = useState(null)
  const [delTarget,    setDelTarget]    = useState(null)
  const [deleting,     setDeleting]     = useState(false)
  const [search,       setSearch]       = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [sortCol,      setSortCol]      = useState('purchasedAt')
  const [sortDir,      setSortDir]      = useState('desc')

  const load = useCallback(async () => {
    setLoading(true)
    const [purResult, prodResult] = await Promise.allSettled([
      getPurchases(),
      getProducts({ size: 500 }),
    ])
    if (purResult.status === 'fulfilled') setPurchases(purResult.value ?? [])
    else toast.error('Failed to load purchases')
    if (prodResult.status === 'fulfilled') setProducts(prodResult.value?.content ?? [])
    else toast.error('Failed to load products')
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await deletePurchase(delTarget.id)
      window.dispatchEvent(new Event('inv_data_update'))
      toast.success('Purchase deleted.')
      setDelTarget(null)
      load()
    } catch { toast.error('Delete failed') }
    finally { setDeleting(false) }
  }

  const handleSort = col => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortCol(col); setSortDir('asc') }
  }

  const SortArrow = ({ col }) => sortCol !== col
    ? <span style={{ opacity:.25, marginLeft:4 }}>↕</span>
    : <span style={{ color:'var(--blue)', marginLeft:4 }}>{sortDir === 'asc' ? '↑' : '↓'}</span>

  const filtered = purchases
    .filter(p => !search ||
      p.productName.toLowerCase().includes(search.toLowerCase()) ||
      p.supplierName.toLowerCase().includes(search.toLowerCase()))
    .filter(p => !statusFilter || p.status === statusFilter)
    .sort((a, b) => {
      let va = a[sortCol], vb = b[sortCol]
      if (sortCol === 'purchasedAt') { va = new Date(va); vb = new Date(vb) }
      if (va < vb) return sortDir === 'asc' ? -1 : 1
      if (va > vb) return sortDir === 'asc' ? 1 : -1
      return 0
    })

  // Group purchases by PO batch (same supplier + same date + created together)
  const totalSpent    = purchases.reduce((s, p) => s + p.totalCost, 0)
  const totalReceived = purchases.filter(p => p.status === 'received').length
  const totalPending  = purchases.filter(p => p.status === 'pending').length
  const totalValue    = purchases.filter(p => p.status === 'received').reduce((s, p) => s + p.totalCost, 0)

  const statusBadge = s => {
    if (s === 'received')  return <span className="badge badge-ok">Received</span>
    if (s === 'pending')   return <span className="badge badge-low">Pending</span>
    return                        <span className="badge badge-out">Cancelled</span>
  }

  return (
    <AppLayout title="Purchases">
      <div className="page-header">
        <div className="page-title">Purchase Management</div>
        <div className="page-sub">Record and track all stock purchases from suppliers</div>
      </div>

      {/* Stats */}
      <div className="stats-grid" style={{ marginBottom:20 }}>
        <div className="stat-card blue">
          <div className="stat-label">Total Orders</div>
          <div className="stat-value">{purchases.length}</div>
          <div className="stat-sub">All time</div>
        </div>
        <div className="stat-card teal">
          <div className="stat-label">Total Spent</div>
          <div className="stat-value" style={{ fontSize:20 }}>₹{totalSpent.toLocaleString('en-IN')}</div>
          <div className="stat-sub">All purchases</div>
        </div>
        <div className="stat-card amber">
          <div className="stat-label">Pending</div>
          <div className="stat-value">{totalPending}</div>
          <div className="stat-sub">Awaiting delivery</div>
        </div>
        <div className="stat-card teal">
          <div className="stat-label">Received</div>
          <div className="stat-value">{totalReceived}</div>
          <div className="stat-sub">₹{totalValue.toLocaleString('en-IN')} value</div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="toolbar">
        <ViewToggle view={view} onChange={setView} />
        <ViewToggle view={view} onChange={setView} />
        <div className="search-wrap">
          <span className="search-icon" style={{ fontSize:13 }}>⌕</span>
          <input className="search-input" placeholder="Search product or supplier…"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select style={{ background:'var(--raised)', border:'1px solid var(--border)', borderRadius:'var(--r)', color:'var(--text)', fontSize:13, outline:'none', padding:'8px 12px' }}
          value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">All statuses</option>
          {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        {(search || statusFilter) && (
          <button className="btn btn-ghost btn-sm" onClick={() => { setSearch(''); setStatusFilter('') }}>✕ Clear</button>
        )}
        <button className="btn btn-primary" style={{ marginLeft:'auto' }} onClick={() => setShowModal(true)}>
          + New Purchase Order
        </button>
      </div>

      {/* Table / Card View */}
      {loading ? (
        <div style={{ padding:40, textAlign:'center' }}><span className="spinner" style={{ width:22, height:22 }} /></div>
      ) : filtered.length === 0 ? (
        <div className="empty-state"><span className="empty-icon">🛒</span><strong>No purchases{search||statusFilter?' match filters':' yet'}.</strong></div>
      ) : view === 'table' ? (
        <div className="table-wrap">
          <table className="data-table" style={{ minWidth:620 }}>
            <thead><tr>
              <th className="sort" onClick={()=>handleSort('productName')}>Product <SortArrow col="productName"/></th>
              <th className="sort" onClick={()=>handleSort('supplierName')}>Supplier <SortArrow col="supplierName"/></th>
              <th className="sort" onClick={()=>handleSort('quantity')}>Qty <SortArrow col="quantity"/></th>
              <th className="sort" onClick={()=>handleSort('totalCost')}>Total <SortArrow col="totalCost"/></th>
              <th>Status</th>
              <th className="sort" onClick={()=>handleSort('purchasedAt')}>Date <SortArrow col="purchasedAt"/></th>
              <th style={{textAlign:'right'}}>Actions</th>
            </tr></thead>
            <tbody>{filtered.map(p=>(
              <tr key={p.id}>
                <td><div style={{fontWeight:500}}>{p.productName}</div><div style={{color:'var(--muted)',fontSize:11}}>{p.categoryName}</div></td>
                <td style={{color:'var(--muted)',fontSize:12}}>{p.supplierName}</td>
                <td className="mono">{p.quantity}</td>
                <td className="mono" style={{fontWeight:600,color:'var(--teal)'}}>₹{Number(p.totalCost).toLocaleString('en-IN',{minimumFractionDigits:2})}</td>
                <td>{statusBadge(p.status)}</td>
                <td className="mono muted" style={{fontSize:11}}>{new Date(p.purchasedAt).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}</td>
                <td><div style={{display:'flex',gap:5,justifyContent:'flex-end'}}>
                  <button className="btn-icon" style={{color:'var(--teal)'}} onClick={()=>printPurchaseOrder(`PO-${String(p.id).padStart(5,'0')}`,{supplierName:p.supplierName,status:p.status,purchasedAt:p.purchasedAt,note:p.note},[{productName:p.productName,categoryName:p.categoryName,qty:p.quantity,unitCost:p.unitCost}])}>⎙</button>
                  <button className="btn-icon" style={{color:'var(--blue)'}} onClick={()=>setEditTarget(p)}>✎</button>
                  <button className="btn-icon danger" onClick={()=>setDelTarget(p)}>✕</button>
                </div></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      ) : (
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))',gap:12}}>
          {filtered.map(p=>(
            <div key={p.id} className="card" style={{padding:14}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:8}}>
                <div><div style={{fontWeight:600,fontSize:13}}>{p.productName}</div><div style={{fontSize:11,color:'var(--text-3)',marginTop:2}}>{p.categoryName}</div></div>
                {statusBadge(p.status)}
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6,marginBottom:10}}>
                {[{label:'Supplier',value:p.supplierName},{label:'Qty',value:p.quantity},{label:'Unit Cost',value:`₹${Number(p.unitCost).toLocaleString('en-IN')}`},{label:'Total',value:`₹${Number(p.totalCost).toLocaleString('en-IN')}`,color:'var(--teal)'},{label:'Date',value:new Date(p.purchasedAt).toLocaleDateString('en-IN',{day:'numeric',month:'short'})},{label:'Supplier',value:p.supplierName}].slice(0,4).map(r=>(
                  <div key={r.label} style={{background:'var(--raised)',borderRadius:6,padding:'6px 8px'}}>
                    <div style={{fontSize:10,color:'var(--text-3)',marginBottom:2}}>{r.label}</div>
                    <div style={{fontSize:12,fontFamily:'var(--mono)',fontWeight:500,color:r.color||'var(--text)'}}>{r.value}</div>
                  </div>
                ))}
              </div>
              <div style={{display:'flex',gap:6,justifyContent:'flex-end',borderTop:'1px solid var(--border)',paddingTop:8}}>
                <button className="btn-icon" style={{color:'var(--teal)'}} onClick={()=>printPurchaseOrder(`PO-${String(p.id).padStart(5,'0')}`,{supplierName:p.supplierName,status:p.status,purchasedAt:p.purchasedAt,note:p.note},[{productName:p.productName,categoryName:p.categoryName,qty:p.quantity,unitCost:p.unitCost}])}>⎙</button>
                <button className="btn-icon" style={{color:'var(--blue)'}} onClick={()=>setEditTarget(p)}>✎</button>
                <button className="btn-icon danger" onClick={()=>setDelTarget(p)}>✕</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && (
        <div style={{ display:'flex', justifyContent:'space-between', flexWrap:'wrap', gap:8, alignItems:'center', marginTop:12 }}>
          <div className="page-count" style={{ margin:0 }}>{filtered.length} of {purchases.length} purchases</div>
          <ExportBtn
            disabled={purchases.length === 0}
            onExport={fmt => { exportPurchases(purchases, fmt); toast.success('Exported as ' + fmt.toUpperCase()) }}
          />
        </div>
      )}

      {showModal  && <PurchaseModal products={products} onClose={() => setShowModal(false)} onSaved={load} />}
      {editTarget && <PurchaseModal purchase={editTarget} products={products} onClose={() => setEditTarget(null)} onSaved={load} />}
      {delTarget  && (
        <ConfirmDialog
          title="Delete Purchase"
          message={<>Delete purchase of <strong style={{ color:'var(--text)' }}>{delTarget.quantity}× {delTarget.productName}</strong> from <strong style={{ color:'var(--text)' }}>{delTarget.supplierName}</strong>?</>}
          onConfirm={handleDelete}
          onCancel={() => setDelTarget(null)}
          loading={deleting}
        />
      )}
    </AppLayout>
  )
}
