import { useState, useEffect, useCallback, useMemo } from 'react'
import AppLayout from '../../components/layout/AppLayout'
import ViewToggle from '../../components/ui/ViewToggle'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import { useToast } from '../../context/ToastContext'
import { useAuth } from '../../context/AuthContext'
import {
  getSales, createInvoice, deleteInvoice, deleteSale,
  mockSales, getNextInvoiceNo
} from '../../api/salesApi'
import { DEMO_MODE } from '../../api/axiosInstance'
import api from '../../api/axiosInstance'
import { getProducts } from '../../api/productApi'
import ExportMenu from '../../components/ui/ExportMenu'

function printInvoice(meta, lines) {
  const fmt   = n => Number(n||0).toLocaleString('en-IN',{minimumFractionDigits:2})
  const fdate = d => new Date(d).toLocaleDateString('en-IN',{day:'numeric',month:'long',year:'numeric'})
  const stamp = new Date().toLocaleString('en-IN',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'})
  const subtotal = lines.reduce((s,l)=>s+l.qty*l.unitPrice,0)

  const rows = lines.map((l,i)=>`
    <tr>
      <td style="color:#9ca3af;font-size:11px">${String(i+1).padStart(2,'0')}</td>
      <td>
        <div style="font-weight:600;color:#111827">${l.productName}</div>
        ${l.categoryName?`<span style="display:inline-block;background:#f0fdf4;color:#166534;border-radius:4px;font-size:10px;padding:1px 6px;margin-top:3px">${l.categoryName}</span>`:''}
      </td>
      <td style="text-align:right;font-weight:600">${l.qty}</td>
      <td style="text-align:right">₹${fmt(l.unitPrice)}</td>
      <td style="text-align:right;font-weight:700;color:#111827">₹${fmt(l.qty*l.unitPrice)}</td>
    </tr>`).join('')

  const html=`<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">
<title>${meta.invoiceNo} — Sales Invoice</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Segoe UI',Arial,sans-serif;font-size:13px;color:#1a1a2e;background:#fff}
.page{max-width:720px;margin:0 auto;padding:48px 52px}
.header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:36px;padding-bottom:24px;border-bottom:3px solid #00c9b1}
.brand{font-size:22px;font-weight:700;letter-spacing:.08em;color:#00a896}
.brand-sub{font-size:11px;color:#6b7280;margin-top:3px}
.inv-label{font-size:11px;text-transform:uppercase;letter-spacing:.12em;color:#6b7280;text-align:right}
.inv-number{font-size:22px;font-weight:700;color:#00a896;margin-top:2px;font-family:'Courier New',monospace;text-align:right}
.meta-grid{display:grid;grid-template-columns:1fr 1fr 1fr;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;margin-bottom:28px}
.meta-cell{padding:13px 16px;border-right:1px solid #e5e7eb}
.meta-cell:last-child{border-right:none}
.meta-key{font-size:10px;text-transform:uppercase;letter-spacing:.1em;color:#9ca3af;margin-bottom:4px}
.meta-val{font-size:13.5px;font-weight:600;color:#111827}
.bill-to{background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:14px 18px;margin-bottom:24px}
.bill-label{font-size:10px;text-transform:uppercase;letter-spacing:.1em;color:#6b7280;margin-bottom:6px;font-weight:600}
.bill-name{font-size:15px;font-weight:700;color:#111827}
.bill-detail{font-size:12px;color:#6b7280;margin-top:2px}
table{width:100%;border-collapse:collapse}
thead th{background:#00c9b1;color:#fff;font-size:11px;font-weight:600;letter-spacing:.06em;padding:10px 14px;text-align:left;text-transform:uppercase}
thead th:last-child{text-align:right}
tbody tr{border-bottom:1px solid #f3f4f6}tbody tr:last-child{border-bottom:none}
tbody td{padding:12px 14px;font-size:13px;color:#374151;vertical-align:top}tbody td:last-child{text-align:right}
.totals{border-top:2px solid #e5e7eb;display:flex;justify-content:flex-end}
.totals-inner{min-width:240px}
.total-row{display:flex;justify-content:space-between;padding:8px 14px;font-size:13px;color:#6b7280;border-bottom:1px solid #f3f4f6}
.total-row.grand{background:#00c9b1;color:#fff;font-weight:700;font-size:15px}
.notes-box{margin-top:24px;background:#f9fafb;border:1px solid #e5e7eb;border-left:4px solid #00c9b1;padding:12px 16px}
.footer{margin-top:36px;padding-top:18px;border-top:1px solid #e5e7eb;display:flex;justify-content:space-between;align-items:flex-end}
.footer-brand{font-size:12px;color:#9ca3af}
.sig-line{border-top:1px solid #9ca3af;width:180px;margin-bottom:6px;margin-left:auto}
.sig-label{font-size:11px;color:#9ca3af;text-align:right}
@media print{body{padding:0}.page{padding:24px 32px;max-width:100%}@page{margin:12mm 14mm;size:A4}}
@media screen{body{background:#f3f4f6}.page{background:#fff;box-shadow:0 4px 32px rgba(0,0,0,.12);margin:32px auto;border-radius:4px}}
</style></head><body>
<div class="page">
  <div class="header">
    <div><div class="brand">InventOS</div><div class="brand-sub">Inventory Management System</div></div>
    <div><div class="inv-label">Sales Invoice</div><div class="inv-number">${meta.invoiceNo}</div></div>
  </div>
  <div class="meta-grid">
    <div class="meta-cell"><div class="meta-key">Invoice Date</div><div class="meta-val">${fdate(meta.soldAt||new Date())}</div></div>
    <div class="meta-cell"><div class="meta-key">Sold By</div><div class="meta-val">${meta.soldBy}</div></div>
    <div class="meta-cell"><div class="meta-key">Printed On</div><div class="meta-val" style="font-size:11px;font-weight:500">${stamp}</div></div>
  </div>
  ${meta.customerName?`<div class="bill-to"><div class="bill-label">Bill To</div><div class="bill-name">${meta.customerName}</div>${meta.customerPhone?`<div class="bill-detail">${meta.customerPhone}</div>`:''}</div>`:''}
  <table>
    <thead><tr><th style="width:36px">#</th><th>Product</th><th style="text-align:right;width:60px">Qty</th><th style="text-align:right;width:110px">Unit Price</th><th style="text-align:right;width:120px">Amount</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="totals"><div class="totals-inner">
    <div class="total-row"><span>Subtotal (${lines.length} item${lines.length!==1?'s':''})</span><span>₹${fmt(subtotal)}</span></div>
    <div class="total-row"><span>Tax / GST</span><span style="color:#9ca3af">—</span></div>
    <div class="total-row grand"><span>Total Amount</span><span>₹${fmt(subtotal)}</span></div>
  </div></div>
  ${meta.note?`<div class="notes-box"><div style="font-size:10px;text-transform:uppercase;letter-spacing:.1em;color:#9ca3af;margin-bottom:5px;font-weight:600">Notes</div><div style="font-size:13px;color:#374151;line-height:1.6">${meta.note}</div></div>`:''}
  <div class="footer">
    <div class="footer-brand">Generated by <strong style="color:#00a896">InventOS</strong> &nbsp;·&nbsp; ${meta.invoiceNo}</div>
    <div><div class="sig-line"></div><div class="sig-label">Authorised Signature</div></div>
  </div>
</div>
<script>window.onload=()=>{window.print()}<\/script>
</body></html>`

  const win = window.open('','_blank','width=820,height=940')
  if (win) { win.document.write(html); win.document.close() }
}

const emptyLine = () => ({
  _key: Math.random(), productId:'', productName:'', categoryName:'', qty:1, unitPrice:0
})

function groupByInvoice(sales) {
  const map = {}
  sales.forEach(s => {
    const key = s.invoiceNo || `__${s.id}`
    if (!map[key]) map[key] = {
      invoiceNo: s.invoiceNo || `SAL-${s.id}`,
      customerName: s.customerName || '',
      customerPhone: s.customerPhone || '',
      soldBy: s.soldBy,
      soldAt: s.soldAt,
      note: s.note || '',
      lines: [],
      total: 0,
    }
    map[key].lines.push(s)
    map[key].total += Number(s.quantity) * Number(s.unitPrice)
    
    if (new Date(s.soldAt) > new Date(map[key].soldAt)) map[key].soldAt = s.soldAt
  })
  return Object.values(map).sort((a,b)=>new Date(b.soldAt)-new Date(a.soldAt))
}

function LineRow({ line, products, idx, onChange, onRemove, canRemove }) {
  const prod = products.find(p => p.id === Number(line.productId))
  const avail = prod?.quantity ?? 0
  const overStock = line.productId && line.qty > avail

  return (
    <tr style={{ borderBottom:'1px solid var(--border)' }}>
      <td style={{ padding:'6px 8px', color:'var(--text-3)', fontSize:12, textAlign:'center', width:36 }}>{idx+1}</td>
      <td style={{ padding:'4px 8px' }}>
        <select value={line.productId}
          onChange={e => {
            const p = products.find(x=>x.id===Number(e.target.value))
            onChange({...line, productId:e.target.value, productName:p?.name||'', categoryName:p?.categoryName||'', unitPrice:p?.price||0})
          }}
          style={{ width:'100%', border:'1px solid var(--border-md)', borderRadius:6, padding:'6px 8px', fontSize:13, background:'var(--surface)', color:line.productId?'var(--text)':'var(--text-3)', outline:'none', cursor:'pointer', fontFamily:'var(--font)' }}>
          <option value="">— Select product —</option>
          {products.map(p=>(
            <option key={p.id} value={p.id}>
              {p.name}{p.sku?` (${p.sku})`:''} — ₹{Number(p.price).toLocaleString('en-IN')} · {p.quantity} in stock
            </option>
          ))}
        </select>
        {line.productId && (
          <div style={{ fontSize:11, marginTop:3, color: overStock?'var(--red)':'var(--text-3)' }}>
            {overStock ? `⚠ Only ${avail} available` : `${avail} in stock · ${line.categoryName}`}
          </div>
        )}
      </td>
      <td style={{ padding:'4px 8px', width:90 }}>
        <input type="number" min={1} value={line.qty}
          onChange={e=>onChange({...line, qty:Math.max(1,Number(e.target.value))})}
          style={{ width:'100%', border:`1px solid ${overStock?'var(--red)':'var(--border-md)'}`, borderRadius:6, padding:'6px 8px', fontSize:13, fontFamily:'var(--mono)', textAlign:'right', background:'var(--surface)', color:'var(--text)', outline:'none' }}/>
      </td>
      <td style={{ padding:'4px 8px', width:120 }}>
        <input type="number" min={0} step={0.01} value={line.unitPrice}
          onChange={e=>onChange({...line, unitPrice:Number(e.target.value)})}
          style={{ width:'100%', border:'1px solid var(--border-md)', borderRadius:6, padding:'6px 8px', fontSize:13, fontFamily:'var(--mono)', textAlign:'right', background:'var(--surface)', color:'var(--text)', outline:'none' }}/>
      </td>
      <td style={{ padding:'4px 12px', width:110, fontFamily:'var(--mono)', fontSize:13, textAlign:'right', color:'var(--text-2)', fontWeight:500 }}>
        ₹{(line.qty * line.unitPrice).toLocaleString('en-IN',{minimumFractionDigits:2})}
      </td>
      <td style={{ padding:'4px 8px', width:36, textAlign:'center' }}>
        <button onClick={onRemove} disabled={!canRemove}
          style={{ background:'none', border:'none', cursor:canRemove?'pointer':'default', color:canRemove?'var(--red)':'var(--text-3)', fontSize:15, opacity:canRemove?1:.3, borderRadius:4, padding:'2px 5px', transition:'background 120ms' }}
          onMouseEnter={e=>{if(canRemove)e.currentTarget.style.background='var(--red-dim)'}}
          onMouseLeave={e=>e.currentTarget.style.background='none'}>
          ✕
        </button>
      </td>
    </tr>
  )
}

function NewInvoiceForm({ products, user, onSaved, onCancel }) {
  const toast   = useToast()
  const [saving, setSaving] = useState(false)

  const [invoiceNo,     setInvoiceNo]     = useState('')
  const [customerName,  setCustomerName]  = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [note,          setNote]          = useState('')
  const [lines,         setLines]         = useState([emptyLine()])

  
  useEffect(() => {
    const fetchInvoiceNo = async () => {
      if (DEMO_MODE) {
        setInvoiceNo(getNextInvoiceNo())
        return
      }
      try {
        const { data } = await api.get('/sales/next-invoice-no')
        setInvoiceNo(data?.data || getNextInvoiceNo())
      } catch {
        setInvoiceNo(getNextInvoiceNo())
      }
    }
    fetchInvoiceNo()
  }, [])

  const validLines = lines.filter(l=>l.productId && l.qty>0)
  const subtotal   = validLines.reduce((s,l)=>s+l.qty*l.unitPrice, 0)
  const hasStock   = validLines.every(l=>{
    const p = products.find(x=>x.id===Number(l.productId))
    return p ? l.qty <= p.quantity : false
  })

  const updateLine = (idx, updated) => setLines(ls=>ls.map((l,i)=>i===idx?updated:l))
  const removeLine = idx => setLines(ls=>ls.filter((_,i)=>i!==idx))
  const addLine    = ()  => setLines(ls=>[...ls, emptyLine()])

  const save = async () => {
    if (validLines.length === 0)  { toast.error('Add at least one product.'); return }
    if (!hasStock)                 { toast.error('Some items exceed available stock.'); return }
    setSaving(true)
    try {
      await createInvoice(validLines, {
        invoiceNo,
        customerName,
        customerPhone,
        note,
        soldBy: user?.username || 'admin',
      })
      toast.success(`Invoice ${invoiceNo} saved — ${validLines.length} line(s)`)
      onSaved()
    } catch(err) {
      toast.error(err?.response?.data?.message || 'Failed to save invoice')
    } finally { setSaving(false) }
  }

  const handlePrint = () => {
    if (validLines.length === 0) { toast.error('Add at least one product first.'); return }
    printInvoice(
      { invoiceNo, customerName, customerPhone, note, soldBy: user?.username||'admin', soldAt: new Date() },
      validLines
    )
  }

  return (
    <div className="grid-main-aside-260">

      
      <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

        
        <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:12, padding:18 }}>
          <div style={{ fontSize:11, fontWeight:600, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'.07em', marginBottom:14 }}>Invoice Details</div>
          <div className="grid-3">
            <div className="field">
              <label>Invoice No.</label>
              <input value={invoiceNo} onChange={e=>setInvoiceNo(e.target.value)}
                style={{ fontFamily:'var(--mono)', fontWeight:600, color:'var(--accent)' }}/>
            </div>
            <div className="field">
              <label>Customer Name</label>
              <input placeholder="Optional" value={customerName} onChange={e=>setCustomerName(e.target.value)}/>
            </div>
            <div className="field">
              <label>Customer Phone</label>
              <input placeholder="Optional" value={customerPhone} onChange={e=>setCustomerPhone(e.target.value)}/>
            </div>
          </div>
        </div>

        
        <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:12, overflow:'hidden' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 16px', borderBottom:'1px solid var(--border)', background:'var(--raised)' }}>
            <span style={{ fontWeight:600, fontSize:13 }}>Line Items</span>
            <button className="btn btn-ghost btn-sm" onClick={addLine}>+ Add Row</button>
          </div>

          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead>
                <tr style={{ background:'var(--raised)', borderBottom:'1px solid var(--border)' }}>
                  <th style={{ padding:'8px', fontSize:10, fontWeight:600, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'.05em', width:36 }}>#</th>
                  <th style={{ padding:'8px', fontSize:10, fontWeight:600, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'.05em' }}>Product</th>
                  <th style={{ padding:'8px', fontSize:10, fontWeight:600, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'.05em', width:90 }}>Qty</th>
                  <th style={{ padding:'8px', fontSize:10, fontWeight:600, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'.05em', width:120 }}>Unit Price ₹</th>
                  <th style={{ padding:'8px 12px 8px 8px', fontSize:10, fontWeight:600, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'.05em', width:110, textAlign:'right' }}>Amount</th>
                  <th style={{ width:36 }}></th>
                </tr>
              </thead>
              <tbody>
                {lines.map((l,i)=>(
                  <LineRow key={l._key} line={l} products={products} idx={i}
                    onChange={updated=>updateLine(i,updated)}
                    onRemove={()=>removeLine(i)}
                    canRemove={lines.length>1}/>
                ))}
              </tbody>
            </table>
          </div>

          
          <div style={{ display:'flex', justifyContent:'flex-end', borderTop:'2px solid var(--border)', background:'var(--raised)', padding:'12px 16px' }}>
            <div style={{ minWidth:220 }}>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:12.5, color:'var(--text-2)', marginBottom:6 }}>
                <span>Subtotal ({validLines.length} item{validLines.length!==1?'s':''})</span>
                <span className="mono">₹{subtotal.toLocaleString('en-IN',{minimumFractionDigits:2})}</span>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', fontWeight:700, fontSize:15, color:'var(--text)', borderTop:'1px solid var(--border-md)', paddingTop:8, marginTop:4 }}>
                <span>Total</span>
                <span className="mono" style={{ color:'var(--green)' }}>₹{subtotal.toLocaleString('en-IN',{minimumFractionDigits:2})}</span>
              </div>
            </div>
          </div>
        </div>

        
        <div className="field" style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:12, padding:16 }}>
          <label>Notes / Remarks</label>
          <textarea value={note} onChange={e=>setNote(e.target.value)}
            placeholder="Special instructions, terms, or remarks…" style={{ minHeight:60 }}/>
        </div>
      </div>

      
      <div style={{ display:'flex', flexDirection:'column', gap:12 }}>

        
        <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:12, padding:16 }}>
          <div style={{ fontSize:11, fontWeight:600, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'.07em', marginBottom:12 }}>Summary</div>
          <div style={{ fontFamily:'var(--mono)', fontSize:26, fontWeight:700, color:'var(--green)', letterSpacing:'-.02em', marginBottom:3 }}>
            ₹{subtotal.toLocaleString('en-IN',{minimumFractionDigits:2})}
          </div>
          <div style={{ fontSize:12, color:'var(--text-3)', marginBottom:16 }}>
            {validLines.length} product{validLines.length!==1?'s':''} · {invoiceNo}
          </div>

          {!hasStock && validLines.length>0 && (
            <div style={{ background:'var(--red-dim)', border:'1px solid rgba(220,53,53,.2)', borderRadius:8, padding:'8px 10px', fontSize:12, color:'var(--red)', marginBottom:12 }}>
              ⚠ Some items exceed available stock
            </div>
          )}

          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            <button className="btn btn-success btn-full" onClick={save}
              disabled={saving||validLines.length===0||!hasStock}>
              {saving?<><span className="spinner"/> Saving…</>:'✓ Save Invoice'}
            </button>
            <button className="btn btn-ghost btn-full" onClick={handlePrint}
              disabled={validLines.length===0}>
              🖨 Print Preview
            </button>
            <button className="btn btn-ghost btn-full" onClick={onCancel}>Cancel</button>
          </div>
        </div>

        
        {validLines.length>0 && (
          <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:12, padding:14 }}>
            <div style={{ fontSize:11, fontWeight:600, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'.07em', marginBottom:10 }}>Stock Check</div>
            {validLines.map(l=>{
              const p = products.find(x=>x.id===Number(l.productId))
              const avail = p?.quantity??0
              const ok = avail>=l.qty
              return (
                <div key={l._key} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:7, fontSize:12 }}>
                  <span style={{ width:8, height:8, borderRadius:'50%', background:ok?'var(--green)':'var(--red)', flexShrink:0 }}/>
                  <span style={{ flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', color:'var(--text-2)' }}>{l.productName}</span>
                  <span className="mono" style={{ fontSize:11, color:ok?'var(--green)':'var(--red)', fontWeight:600 }}>
                    {avail} avail
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function InvoiceDetail({ invoice, onDelete, onPrint, onClose }) {
  const fmt = n => `₹${Number(n||0).toLocaleString('en-IN',{minimumFractionDigits:2})}`
  return (
    <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:12, overflow:'hidden', position:'sticky', top:80 }}>
      <div style={{ padding:'13px 16px', borderBottom:'1px solid var(--border)', background:'var(--raised)', display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap' }}>
        <div>
          <div style={{ fontFamily:'var(--mono)', fontWeight:700, fontSize:14, color:'var(--accent)' }}>{invoice.invoiceNo}</div>
          <div style={{ fontSize:11, color:'var(--text-3)', marginTop:1 }}>
            {new Date(invoice.soldAt).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}
          </div>
        </div>
        <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-3)', fontSize:16 }}>✕</button>
      </div>

      <div style={{ padding:16 }}>
        
        {invoice.customerName && (
          <div style={{ background:'var(--accent-dim)', border:'1px solid var(--accent-border)', borderRadius:8, padding:'10px 12px', marginBottom:14 }}>
            <div style={{ fontSize:10, fontWeight:600, color:'var(--accent)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:3 }}>Customer</div>
            <div style={{ fontSize:13, fontWeight:600, color:'var(--text)' }}>{invoice.customerName}</div>
            {invoice.customerPhone && <div style={{ fontSize:11.5, color:'var(--text-3)' }}>{invoice.customerPhone}</div>}
          </div>
        )}

        
        <div style={{ marginBottom:14 }}>
          <div style={{ fontSize:10, fontWeight:600, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:8 }}>Items</div>
          {invoice.lines.map((l,i)=>(
            <div key={l.id||i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', padding:'6px 0', borderBottom:'1px solid var(--border)', fontSize:12.5 }}>
              <div style={{ flex:1, overflow:'hidden' }}>
                <div style={{ fontWeight:500, color:'var(--text)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{l.productName}</div>
                <div style={{ fontSize:11, color:'var(--text-3)' }}>
                  {l.quantity} × {fmt(l.unitPrice)}
                </div>
              </div>
              <span className="mono" style={{ fontWeight:600, color:'var(--text)', flexShrink:0, marginLeft:8, fontSize:12 }}>
                {fmt(Number(l.quantity) * Number(l.unitPrice))}
              </span>
            </div>
          ))}
        </div>

        
        <div style={{ display:'flex', justifyContent:'space-between', padding:'10px 0', borderTop:'2px solid var(--border)', marginBottom:14 }}>
          <span style={{ fontWeight:700, fontSize:14 }}>Total</span>
          <span className="mono" style={{ fontWeight:700, fontSize:16, color:'var(--green)' }}>
            {fmt(invoice.lines.reduce((s, l) => s + Number(l.quantity) * Number(l.unitPrice), 0))}
          </span>
        </div>

        
        <div style={{ fontSize:12, color:'var(--text-3)', marginBottom:16 }}>
          Sold by <strong style={{ color:'var(--text-2)' }}>{invoice.soldBy}</strong>
          {invoice.note && <div style={{ marginTop:6, fontStyle:'italic' }}>"{invoice.note}"</div>}
        </div>

        
        <div style={{ display:'flex', gap:8 }}>
          <button className="btn btn-ghost btn-sm" style={{ flex:1 }} onClick={()=>onPrint(invoice)}>
            🖨 Print
          </button>
          <button className="btn btn-danger btn-sm" onClick={()=>onDelete(invoice)}>
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}

export default function SalesInvoicePage() {
  const toast  = useToast()
  const { user } = useAuth()

  const [view,         setView]         = useState('list')  
  const [products,     setProducts]     = useState([])
  const [sales,        setSales]        = useState([])
  const [loading,      setLoading]      = useState(true)
  const [search,       setSearch]       = useState('')
  const [selInvoice,   setSelInvoice]   = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting,     setDeleting]     = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [prods, sl] = await Promise.all([getProducts({size:200}), getSales()])
      setProducts(prods?.content??[])
      setSales(sl??[])
    } finally { setLoading(false) }
  }, [])

  useEffect(()=>{ loadData() },[loadData])

  
  const invoices = useMemo(()=>groupByInvoice(sales),[sales])
  const filtered = useMemo(()=>{
    if (!search.trim()) return invoices
    const q = search.toLowerCase()
    return invoices.filter(inv=>
      inv.invoiceNo.toLowerCase().includes(q) ||
      inv.customerName.toLowerCase().includes(q) ||
      inv.lines.some(l=>l.productName.toLowerCase().includes(q))
    )
  }, [invoices, search])

  
  const totalRevenue = useMemo(()=>sales.reduce((s,x)=>s+x.totalPrice,0),[sales])
  const uniqueCustomers = useMemo(()=>new Set(sales.filter(s=>s.customerName).map(s=>s.customerName)).size,[sales])

  const fmt = n => `₹${Number(n||0).toLocaleString('en-IN',{minimumFractionDigits:2})}`
  const fmtShort = n => n>=100000?`₹${(n/100000).toFixed(2)}L`:n>=1000?`₹${(n/1000).toFixed(1)}k`:`₹${Math.round(n)}`

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deleteInvoice(deleteTarget.invoiceNo)
      toast.success(`Invoice ${deleteTarget.invoiceNo} deleted.`)
      setDeleteTarget(null)
      setSelInvoice(null)
      await loadData()
    } catch { toast.error('Delete failed') }
    finally { setDeleting(false) }
  }

  const handlePrint = (inv) => {
    printInvoice(
      { invoiceNo:inv.invoiceNo, customerName:inv.customerName, customerPhone:inv.customerPhone, note:inv.note, soldBy:inv.soldBy, soldAt:inv.soldAt },
      inv.lines.map(l=>({ productName:l.productName, categoryName:l.categoryName, qty:l.quantity, unitPrice:l.unitPrice }))
    )
  }

  const handleExport = () => {
    const rows = [
      ['Invoice No','Customer','Product','Category','Qty','Unit Price','Total','Sold By','Date'],
      ...sales.map(s=>[s.invoiceNo||'',s.customerName||'',s.productName,s.categoryName,s.quantity,s.unitPrice,s.totalPrice,s.soldBy,new Date(s.soldAt).toLocaleDateString('en-IN')])
    ]
    const csv = rows.map(r=>r.map(v=>`"${v}"`).join(',')).join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv],{type:'text/csv'}))
    a.download = 'sales-invoices.csv'; a.click()
  }

  return (
    <AppLayout title="Sales Invoice">

      
      <div className="page-header">
        <div>
          <div className="page-title">Sales Invoice</div>
          <div className="page-sub">Create and manage customer invoices · Number series: INV-XXXX</div>
        </div>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          {view==='list' && (
            <>
              <button className="btn btn-ghost btn-sm" onClick={handleExport} disabled={sales.length===0}>↓ Export CSV</button>
              <button className="btn btn-primary" onClick={()=>setView('new')}>+ New Invoice</button>
            </>
          )}
          {view==='new' && (
            <button className="btn btn-ghost" onClick={()=>setView('list')}>← Back to list</button>
          )}
        </div>
      </div>

      
      {view==='list' && (
        <div className="grid-4" style={{ marginBottom:20 }}>
          {[
            { label:'Total Invoices', value:invoices.length, sub:'All time', color:'var(--accent)' },
            { label:'Total Revenue', value:fmtShort(totalRevenue), sub:fmt(totalRevenue), color:'var(--green)' },
            { label:'Unique Customers', value:uniqueCustomers, sub:'Named customers', color:'#7c3aed' },
            { label:'Avg Invoice Value', value:invoices.length>0?fmtShort(totalRevenue/invoices.length):'—', sub:'Per invoice', color:'var(--amber)' },
          ].map((c,i)=>(
            <div key={i} style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:12, padding:'15px 17px', position:'relative', overflow:'hidden' }}>
              <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:c.color, opacity:.7, borderRadius:'12px 12px 0 0' }}/>
              <div style={{ fontSize:10.5, fontWeight:600, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'.07em', marginBottom:6 }}>{c.label}</div>
              <div style={{ fontSize:22, fontWeight:700, color:'var(--text)', letterSpacing:'-.02em' }}>{c.value}</div>
              <div style={{ fontSize:11.5, color:'var(--text-3)', marginTop:4 }}>{c.sub}</div>
            </div>
          ))}
        </div>
      )}

      
      {view==='list' && (
        <div className={`grid-main-aside-320${!selInvoice ? ' grid-single' : ''}`}>

          
          <div>
            
            <div style={{ marginBottom:12, display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
              <ViewToggle view={view} onChange={setView} />
              <div className="search-wrap" style={{ flex:1 }}>
                <span className="search-icon">⌕</span>
                <input className="search-input" placeholder="Search by invoice number, customer, or product…"
                  value={search} onChange={e=>setSearch(e.target.value)} style={{ width:"100%", maxWidth:320 }}/>
              </div>
            </div>

            {view === 'table' ? (
            <div className="table-wrap">
              <table className="data-table" style={{minWidth:580}}>
                <thead><tr>
                  <th>Invoice No.</th><th>Customer</th><th>Items</th><th>Sold By</th><th>Date</th><th style={{textAlign:'right'}}>Total</th><th></th>
                </tr></thead>
                <tbody>{filtered.map(inv=>(
                  <tr key={inv.invoiceNo} onClick={()=>setSelInvoice(inv.invoiceNo===selInvoice?.invoiceNo?null:inv)} style={{cursor:'pointer',background:selInvoice?.invoiceNo===inv.invoiceNo?'var(--accent-dim)':''}}>
                    <td><span className="mono" style={{fontWeight:700,color:'var(--accent)',fontSize:12.5}}>{inv.invoiceNo}</span></td>
                    <td>{inv.customerName?<span style={{fontWeight:500}}>{inv.customerName}</span>:<span style={{color:'var(--text-3)',fontSize:12}}>—</span>}</td>
                    <td><div style={{display:'flex',flexWrap:'wrap',gap:4}}>{inv.lines.slice(0,2).map((l,i)=><span key={i} className="tag" style={{fontSize:11}}>{l.productName} ×{l.quantity}</span>)}{inv.lines.length>2&&<span style={{fontSize:11,color:'var(--text-3)'}}>+{inv.lines.length-2} more</span>}</div></td>
                    <td style={{color:'var(--text-3)',fontSize:12}}>{inv.soldBy}</td>
                    <td className="mono muted" style={{fontSize:11.5}}>{new Date(inv.soldAt).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}</td>
                    <td className="mono" style={{textAlign:'right',fontWeight:700,color:'var(--green)',fontSize:13}}>{fmt(inv.total)}</td>
                    <td><div style={{display:'flex',gap:4,justifyContent:'flex-end'}}><button className="btn-icon" onClick={e=>{e.stopPropagation();handlePrint(inv)}}>🖨</button><button className="btn-icon danger" onClick={e=>{e.stopPropagation();setDeleteTarget(inv)}}>✕</button></div></td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
            ) : (
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))',gap:12,padding:12}}>
              {filtered.map(inv=>(
                <div key={inv.invoiceNo} className="card" style={{padding:14,cursor:'pointer',border:selInvoice?.invoiceNo===inv.invoiceNo?'1px solid var(--accent)':'1px solid var(--border)'}} onClick={()=>setSelInvoice(inv.invoiceNo===selInvoice?.invoiceNo?null:inv)}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:8}}>
                    <span className="mono" style={{fontWeight:700,color:'var(--accent)',fontSize:13}}>{inv.invoiceNo}</span>
                    <span className="mono" style={{fontWeight:700,color:'var(--green)',fontSize:14}}>{fmt(inv.total)}</span>
                  </div>
                  <div style={{fontWeight:500,fontSize:13,marginBottom:2}}>{inv.customerName||<span style={{color:'var(--text-3)'}}>Walk-in</span>}</div>
                  <div style={{fontSize:11,color:'var(--text-3)',marginBottom:8}}>{new Date(inv.soldAt).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})} · {inv.soldBy}</div>
                  <div style={{display:'flex',flexWrap:'wrap',gap:4,marginBottom:8}}>{inv.lines.slice(0,3).map((l,i)=><span key={i} className="tag" style={{fontSize:11}}>{l.productName} ×{l.quantity}</span>)}{inv.lines.length>3&&<span style={{fontSize:11,color:'var(--text-3)'}}>+{inv.lines.length-3} more</span>}</div>
                  <div style={{display:'flex',gap:6,justifyContent:'flex-end',borderTop:'1px solid var(--border)',paddingTop:8}}>
                    <button className="btn-icon" onClick={e=>{e.stopPropagation();handlePrint(inv)}}>🖨 Print</button>
                    <button className="btn-icon danger" onClick={e=>{e.stopPropagation();setDeleteTarget(inv)}}>✕</button>
                  </div>
                </div>
              ))}
            </div>
            )}

          
          {selInvoice && (
            <InvoiceDetail
              invoice={selInvoice}
              onClose={()=>setSelInvoice(null)}
              onDelete={inv=>setDeleteTarget(inv)}
              onPrint={handlePrint}
            />
          )}
        </div>
      )}

      
      {view==='new' && (
        <NewInvoiceForm
          products={products}
          user={user}
          onSaved={async()=>{ await loadData(); setView('list') }}
          onCancel={()=>setView('list')}
        />
      )}

      
      {deleteTarget && (
        <ConfirmDialog
          title="Delete Invoice"
          message={
            <span>Delete invoice <strong style={{ color:'var(--text)' }}>{deleteTarget.invoiceNo}</strong>?
              <br/><span style={{ fontSize:12, color:'var(--text-3)', display:'block', marginTop:6 }}>
                All {deleteTarget.lines?.length} line item{deleteTarget.lines?.length!==1?'s':''} will be removed and stock will be restored.
              </span>
            </span>
          }
          onConfirm={handleDelete}
          onCancel={()=>setDeleteTarget(null)}
          loading={deleting}
        />
      )}
    </AppLayout>
  )
}
