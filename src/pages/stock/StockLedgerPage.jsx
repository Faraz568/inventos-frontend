import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import AppLayout from '../../components/layout/AppLayout'
import ViewToggle from '../../components/ui/ViewToggle'
import { DEMO_MODE } from '../../api/axiosInstance'
import { getSales, mockSales } from '../../api/salesApi'
import { getPurchases, mockPurchases } from '../../api/purchaseApi'

function buildLedger(sales, purchases, productFilter, typeFilter, dateFrom, dateTo) {
  const entries = []
  sales.forEach(s => {
    entries.push({
      id:`S-${s.id}`, date:s.soldAt, type:'out', typeLabel:'Sale',
      productId:s.productId, productName:s.productName, categoryName:s.categoryName,
      qty:-s.quantity, qtyAbs:s.quantity,
      reference:s.invoiceNo||`SAL-${s.id}`, party:s.soldBy,
      rate:s.unitPrice, amount:s.totalPrice, note:s.note||'',
    })
  })
  purchases.forEach(p => {
    if (p.status!=='received') return
    entries.push({
      id:`P-${p.id}`, date:p.purchasedAt, type:'in', typeLabel:'Purchase',
      productId:p.productId, productName:p.productName, categoryName:p.categoryName,
      qty:p.quantity, qtyAbs:p.quantity,
      reference:`PO-${String(p.id).padStart(4,'0')}`, party:p.supplierName,
      rate:p.unitCost, amount:p.totalCost, note:p.note||'',
    })
  })

  entries.sort((a,b)=>new Date(a.date)-new Date(b.date))
  const balance = {}
  entries.forEach(e => {
    balance[e.productId] = (balance[e.productId]||0) + e.qty
    e.runningBalance = balance[e.productId]
  })
  entries.reverse()

  return entries.filter(e => {
    if (productFilter && e.productId!==Number(productFilter)) return false
    if (typeFilter    && e.type!==typeFilter)                  return false
    if (dateFrom && new Date(e.date)<new Date(dateFrom))       return false
    if (dateTo   && new Date(e.date)>new Date(dateTo+'T23:59:59')) return false
    return true
  })
}

function getProductOptions(sales, purchases) {
  const map = {}
  sales.forEach(s=>map[s.productId]=s.productName)
  purchases.forEach(p=>map[p.productId]=p.productName)
  return Object.entries(map).map(([id,name])=>({id:Number(id),name})).sort((a,b)=>a.name.localeCompare(b.name))
}

export default function StockLedgerPage() {
  const [productFilter, setProduct] = useState('')
  const [view, setView] = useState('table')
  const [typeFilter,    setType]    = useState('')
  const [dateFrom,      setFrom]    = useState('')
  const [dateTo,        setTo]      = useState('')
  const [sales,         setSales]   = useState(DEMO_MODE ? [...mockSales] : [])
  const [purchases,     setPurch]   = useState(DEMO_MODE ? [...mockPurchases] : [])
  const [lastUpdated,   setLastUpd] = useState(new Date())
  const [pulse,         setPulse]   = useState(false)
  const intervalRef = useRef(null)

  const refresh = useCallback(async () => {
    if (DEMO_MODE) {
      // In demo mode, read the live mock arrays directly
      const { mockSales: ms } = await import('../../api/salesApi')
      const { mockPurchases: mp } = await import('../../api/purchaseApi')
      setSales([...ms])
      setPurch([...mp])
    } else {
      try {
        const [s, p] = await Promise.all([getSales(), getPurchases()])
        setSales(s ?? [])
        setPurch(p ?? [])
      } catch {}
    }
    setLastUpd(new Date())
    setPulse(true)
    setTimeout(() => setPulse(false), 800)
  }, [])

  useEffect(() => {
    refresh()
    // Poll every 5s for real-time updates
    intervalRef.current = setInterval(refresh, 5000)
    // Also listen to data mutation events dispatched by sales/purchase pages
    const onUpdate = () => refresh()
    window.addEventListener('inv_data_update', onUpdate)
    window.addEventListener('inv_chat_update', onUpdate)
    return () => {
      clearInterval(intervalRef.current)
      window.removeEventListener('inv_data_update', onUpdate)
      window.removeEventListener('inv_chat_update', onUpdate)
    }
  }, [refresh])

  const ledger = useMemo(()=>buildLedger(sales,purchases,productFilter,typeFilter,dateFrom,dateTo),
    [sales,purchases,productFilter,typeFilter,dateFrom,dateTo])
  const productOptions = useMemo(()=>getProductOptions(sales,purchases),[sales,purchases])

  const totalIn  = ledger.filter(e=>e.type==='in').reduce((s,e)=>s+e.qtyAbs,0)
  const totalOut = ledger.filter(e=>e.type==='out').reduce((s,e)=>s+e.qtyAbs,0)
  const totalVal = ledger.reduce((s,e)=>s+(e.type==='in'?e.amount:-e.amount),0)

  const fmt = n => `₹${Number(n||0).toLocaleString('en-IN',{minimumFractionDigits:2})}`
  const fmtS = n => n>=100000?`₹${(n/100000).toFixed(1)}L`:n>=1000?`₹${(n/1000).toFixed(1)}k`:`₹${Math.round(n)}`
  const hasFilters = productFilter||typeFilter||dateFrom||dateTo
  const clear = ()=>{ setProduct(''); setType(''); setFrom(''); setTo('') }

  const inputSt = { border:'1px solid var(--border-md)', borderRadius:8, padding:'6px 10px', fontSize:12.5, outline:'none', fontFamily:'var(--font)', background:'var(--surface)', color:'var(--text)', transition:'border-color var(--t)' }

  return (
    <AppLayout title="Stock Ledger">
      <div className="page-header">
        <div>
          <div className="page-title">Stock Ledger</div>
          <div className="page-sub">Complete log of all stock movements — purchases in, sales out, with running balance</div>
        </div>
        {/* Live indicator */}
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <span style={{
            display:'flex', alignItems:'center', gap:5, fontSize:11, fontFamily:'var(--mono)',
            background:'var(--green-dim)', color:'var(--green)', border:'1px solid rgba(16,185,129,.2)',
            borderRadius:20, padding:'4px 10px', fontWeight:600,
            transition:'opacity 300ms', opacity: pulse ? 0.5 : 1,
          }}>
            <span style={{ width:6, height:6, borderRadius:'50%', background:'var(--green)',
              boxShadow: pulse ? '0 0 8px var(--green)' : 'none', transition:'box-shadow 300ms',
              display:'inline-block' }}/>
            Live · {lastUpdated.toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit',second:'2-digit'})}
          </span>
          <button className="btn btn-ghost btn-sm" onClick={refresh} title="Refresh now">↻ Refresh</button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid-4" style={{ marginBottom:18 }}>
        {[
          { label:'Total Entries', value:ledger.length,       sub:'Filtered movements',   color:'var(--accent)' },
          { label:'Stock In',      value:`+${totalIn}`,        sub:'Units received',        color:'var(--green)'  },
          { label:'Stock Out',     value:`−${totalOut}`,       sub:'Units sold',            color:'var(--red)'    },
          { label:'Net Value',     value:fmtS(Math.abs(totalVal)), sub:totalVal>=0?'Net purchase':'Net sale', color:totalVal>=0?'var(--green)':'var(--red)' },
        ].map((c,i)=>(
          <div key={i} style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:12, padding:'14px 16px', position:'relative', overflow:'hidden' }}>
            <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:c.color, opacity:.7, borderRadius:'12px 12px 0 0' }}/>
            <div style={{ fontSize:10.5, fontWeight:600, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'.07em', marginBottom:6 }}>{c.label}</div>
            <div style={{ fontSize:22, fontWeight:700, color:c.color }}>{c.value}</div>
            <div style={{ fontSize:11.5, color:'var(--text-3)', marginTop:4 }}>{c.sub}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginBottom:14, alignItems:'center' }}>
        <select style={inputSt} value={productFilter} onChange={e=>setProduct(e.target.value)}>
          <option value="">All Products</option>
          {productOptions.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select style={inputSt} value={typeFilter} onChange={e=>setType(e.target.value)}>
          <option value="">All Types</option>
          <option value="in">Stock In (Purchases)</option>
          <option value="out">Stock Out (Sales)</option>
        </select>
        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
          <span style={{ fontSize:12, color:'var(--text-3)' }}>From</span>
          <input type="date" value={dateFrom} onChange={e=>setFrom(e.target.value)} style={inputSt}/>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
          <span style={{ fontSize:12, color:'var(--text-3)' }}>To</span>
          <input type="date" value={dateTo} onChange={e=>setTo(e.target.value)} style={inputSt}/>
        </div>
        {hasFilters && <button className="btn btn-ghost btn-sm" onClick={clear}>✕ Clear</button>}
        <span style={{ marginLeft:'auto', fontSize:12, color:'var(--text-3)' }}>{ledger.length} entries</span>
      </div>

      {/* Table / Card */}
      {ledger.length===0 ? (
        <div className="empty-state"><span className="empty-icon">📒</span><span>No ledger entries match your filters.</span>{hasFilters && <button className="btn btn-ghost btn-sm" onClick={clear}>Clear filters</button>}</div>
      ) : view === 'table' ? (
        <div className="table-wrap">
          <table className="data-table" style={{minWidth:700}}>
            <thead><tr>
              <th>Date</th><th>Ref</th><th>Type</th><th>Product</th><th>Category</th>
              <th>Party</th><th style={{textAlign:'right'}}>In</th><th style={{textAlign:'right'}}>Out</th>
              <th style={{textAlign:'right'}}>Balance</th><th style={{textAlign:'right'}}>Rate</th><th style={{textAlign:'right'}}>Value</th><th>Note</th>
            </tr></thead>
            <tbody>{ledger.map(e=>(
              <tr key={e.id}>
                <td className="mono muted" style={{fontSize:11,whiteSpace:'nowrap'}}>{new Date(e.date).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'2-digit'})}</td>
                <td><span className="mono" style={{fontSize:11,fontWeight:600,borderRadius:4,padding:'1px 6px',color:e.type==='in'?'var(--accent)':'#7c3aed',background:e.type==='in'?'var(--accent-dim)':'rgba(124,58,237,.1)'}}>{e.reference}</span></td>
                <td><span className={`badge ${e.type==='in'?'badge-ok':'badge-info'}`} style={{fontSize:10.5}}>{e.type==='in'?'↑ In':'↓ Out'}</span></td>
                <td style={{fontWeight:500}}>{e.productName}</td>
                <td><span className="tag">{e.categoryName}</span></td>
                <td style={{fontSize:12,color:'var(--text-2)'}}>{e.party}</td>
                <td className="mono" style={{textAlign:'right',color:'var(--green)',fontWeight:500}}>{e.type==='in'?`+${e.qtyAbs}`:'—'}</td>
                <td className="mono" style={{textAlign:'right',color:'var(--red)',fontWeight:500}}>{e.type==='out'?`−${e.qtyAbs}`:'—'}</td>
                <td className="mono" style={{textAlign:'right',fontWeight:700,color:e.runningBalance<0?'var(--red)':e.runningBalance===0?'var(--text-3)':'var(--text)'}}>{e.runningBalance}</td>
                <td className="mono" style={{textAlign:'right',fontSize:11.5,color:'var(--text-2)'}}>₹{Number(e.rate||0).toLocaleString('en-IN')}</td>
                <td className="mono" style={{textAlign:'right',fontWeight:500,color:e.type==='in'?'var(--green)':'var(--red)'}}>{e.type==='in'?'+':'-'}{fmt(e.amount)}</td>
                <td style={{fontSize:11.5,color:'var(--text-3)'}}>{e.note||'—'}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      ) : (
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))',gap:12}}>
          {ledger.map(e=>(
            <div key={e.id} className="card" style={{padding:14,borderLeft:`3px solid ${e.type==='in'?'var(--green)':'var(--red)'}`}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
                <span className="mono" style={{fontSize:11,fontWeight:600,color:e.type==='in'?'var(--accent)':'#7c3aed'}}>{e.reference}</span>
                <span className={`badge ${e.type==='in'?'badge-ok':'badge-info'}`}>{e.type==='in'?'↑ In':'↓ Out'}</span>
              </div>
              <div style={{fontWeight:600,fontSize:13,marginBottom:4}}>{e.productName}</div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:5,marginTop:6}}>
                {[{label:'Category',value:e.categoryName},{label:'Party',value:e.party||'—'},{label:'Qty',value:e.type==='in'?`+${e.qtyAbs}`:`−${e.qtyAbs}`,color:e.type==='in'?'var(--green)':'var(--red)'},{label:'Balance',value:e.runningBalance,color:e.runningBalance<0?'var(--red)':'var(--text)'},{label:'Value',value:`${e.type==='in'?'+':'-'}${fmt(e.amount)}`,color:e.type==='in'?'var(--green)':'var(--red)'},{label:'Date',value:new Date(e.date).toLocaleDateString('en-IN',{day:'numeric',month:'short'})}].map(r=>(
                  <div key={r.label} style={{background:'var(--raised)',borderRadius:6,padding:'5px 8px'}}>
                    <div style={{fontSize:10,color:'var(--text-3)',marginBottom:1}}>{r.label}</div>
                    <div style={{fontSize:12,fontFamily:'var(--mono)',fontWeight:500,color:r.color||'var(--text)'}}>{r.value}</div>
                  </div>
                ))}
              </div>
              {e.note&&<div style={{marginTop:6,fontSize:11,color:'var(--text-3)',fontStyle:'italic'}}>{e.note}</div>}
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop:12, display:'flex', gap:16, fontSize:11.5, color:'var(--text-3)' }}>
        <span><span style={{ color:'var(--green)', fontWeight:600 }}>↑ In</span> = Purchase received</span>
        <span><span style={{ color:'var(--red)', fontWeight:600 }}>↓ Out</span> = Sale completed</span>
        <span>Balance = running total per product</span>
        <span style={{ marginLeft:'auto' }}>Auto-refreshes every 5 seconds</span>
      </div>
    </AppLayout>
  )
}
