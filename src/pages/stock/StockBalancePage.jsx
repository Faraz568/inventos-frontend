import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import AppLayout from '../../components/layout/AppLayout'
import ViewToggle from '../../components/ui/ViewToggle'
import { getProducts } from '../../api/productApi'
import { getCategories } from '../../api/categoryApi'
import { getSales, mockSales } from '../../api/salesApi'
import { getPurchases, mockPurchases } from '../../api/purchaseApi'
import { DEMO_MODE } from '../../api/axiosInstance'
import ExportMenu from '../../components/ui/ExportMenu'

function buildBalance(products, sales, purchases) {
  return products.map(p => {
    const received = purchases.filter(x=>x.productId===p.id&&x.status==='received')
    const totalIn  = received.reduce((s,x)=>s+x.quantity,0)
    const totalOut = sales.filter(x=>x.productId===p.id).reduce((s,x)=>s+x.quantity,0)
    const avgCost  = received.length>0
      ? received.reduce((s,x)=>s+x.totalCost,0)/received.reduce((s,x)=>s+x.quantity,0)
      : Number(p.costPrice||0)
    const stockVal   = p.quantity * avgCost
    const retailVal  = p.quantity * Number(p.price||0)
    const potProfit  = retailVal - stockVal
    return { ...p, totalIn, totalOut, avgCost:Math.round(avgCost*100)/100, stockVal, retailVal, potProfit }
  })
}

export default function StockBalancePage() {
  const [products,   setProducts]  = useState([])
  const [categories, setCats]      = useState([])
  const [sales,      setSales]     = useState(DEMO_MODE ? [...mockSales] : [])
  const [purchases,  setPurch]     = useState(DEMO_MODE ? [...mockPurchases] : [])
  const [loading,    setLoading]   = useState(true)
  const [search,     setSearch]    = useState('')
  const [catFilter,  setCat]       = useState('')
  const [sortBy,     setSort]      = useState('name')
  const [sortDir,    setSortDir]   = useState('asc')
  const [selected,   setSelected]  = useState(null)
  const [view,       setView]       = useState('table')
  const [lastUpdated,setLastUpd]   = useState(new Date())
  const [pulse,      setPulse]     = useState(false)
  const intervalRef = useRef(null)

  const refresh = useCallback(async () => {
    try {
      if (DEMO_MODE) {
        const { mockSales: ms } = await import('../../api/salesApi')
        const { mockPurchases: mp } = await import('../../api/purchaseApi')
        const [p, c] = await Promise.all([getProducts({size:200}), getCategories()])
        setProducts(p?.content ?? [])
        setCats(c ?? [])
        setSales([...ms])
        setPurch([...mp])
      } else {
        const [p, c, s, pur] = await Promise.all([
          getProducts({size:200}), getCategories(), getSales(), getPurchases()
        ])
        setProducts(p?.content ?? [])
        setCats(c ?? [])
        setSales(s ?? [])
        setPurch(pur ?? [])
      }
      setLastUpd(new Date())
      setPulse(true)
      setTimeout(() => setPulse(false), 800)
    } catch {}
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    refresh()
    intervalRef.current = setInterval(refresh, 5000)
    const onUpdate = () => refresh()
    window.addEventListener('inv_data_update', onUpdate)
    return () => {
      clearInterval(intervalRef.current)
      window.removeEventListener('inv_data_update', onUpdate)
    }
  }, [refresh])

  const balance = useMemo(()=>buildBalance(products,sales,purchases),[products,sales,purchases])

  const filtered = useMemo(()=>{
    let list = balance
    if (search)    list=list.filter(p=>p.name.toLowerCase().includes(search.toLowerCase())||(p.sku||'').toLowerCase().includes(search.toLowerCase()))
    if (catFilter) list=list.filter(p=>p.categoryName===catFilter)
    return [...list].sort((a,b)=>{
      const va=a[sortBy]??'', vb=b[sortBy]??''
      return sortDir==='asc'?(va<vb?-1:va>vb?1:0):(va>vb?-1:va<vb?1:0)
    })
  },[balance,search,catFilter,sortBy,sortDir])

  const handleSort = col => { if(sortBy===col)setSortDir(d=>d==='asc'?'desc':'asc'); else{setSort(col);setSortDir('asc')} }
  const SA = ({col}) => sortBy!==col
    ? <span style={{opacity:.25,marginLeft:3}}>↕</span>
    : <span style={{color:'var(--accent)',marginLeft:3}}>{sortDir==='asc'?'↑':'↓'}</span>

  const totalCostVal  = filtered.reduce((s,p)=>s+p.stockVal,0)
  const totalRetailVal= filtered.reduce((s,p)=>s+p.retailVal,0)
  const totalProfit   = totalRetailVal-totalCostVal
  const outCount      = filtered.filter(p=>p.quantity===0).length
  const lowCount      = filtered.filter(p=>p.quantity>0&&p.quantity<=p.reorderLevel).length

  const fmt     = n => `₹${Number(n||0).toLocaleString('en-IN',{minimumFractionDigits:2})}`
  const fmtS    = n => n>=100000?`₹${(n/100000).toFixed(2)}L`:n>=1000?`₹${(n/1000).toFixed(1)}k`:`₹${Math.round(n)}`

  const handleExport = () => {
    const rows=[['Product','SKU','Category','Qty','Reorder','Status','Sell Price','Cost','Avg Cost','Stock Val','Retail Val','Pot Profit','Total In','Total Out'],
      ...filtered.map(p=>[p.name,p.sku||'',p.categoryName,p.quantity,p.reorderLevel,p.quantity===0?'Out of Stock':p.quantity<=p.reorderLevel?'Low Stock':'In Stock',p.price,p.costPrice||0,p.avgCost,p.stockVal.toFixed(2),p.retailVal.toFixed(2),p.potProfit.toFixed(2),p.totalIn,p.totalOut])]
    const csv=rows.map(r=>r.map(v=>`"${v}"`).join(',')).join('\n')
    const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'})); a.download='stock-balance.csv'; a.click()
  }

  return (
    <AppLayout title="Stock Balance">
      <div className="page-header">
        <div>
          <div className="page-title">Stock Balance</div>
          <div className="page-sub">Current stock levels, valuation, and movement summary per product</div>
        </div>
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
          <button className="btn btn-ghost btn-sm" onClick={refresh}>↻ Refresh</button>
          <ExportMenu label="Export" onExport={handleExport} disabled={filtered.length===0}/>
        </div>
      </div>

      {/* Stats */}
      <div className="grid-4" style={{ marginBottom:18 }}>
        {[
          { label:'Stock Value (Cost)',   value:fmtS(totalCostVal),  sub:'At purchase price', color:'var(--accent)' },
          { label:'Stock Value (Retail)', value:fmtS(totalRetailVal),sub:'At selling price',  color:'#2563eb' },
          { label:'Potential Profit',     value:fmtS(totalProfit),   sub:'If all stock sold',  color:'var(--green)'  },
          { label:'Alerts',               value:outCount+lowCount,   sub:`${outCount} out · ${lowCount} low`, color:'var(--amber)' },
        ].map((c,i)=>(
          <div key={i} style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:12, padding:'14px 16px', position:'relative', overflow:'hidden' }}>
            <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:c.color, opacity:.7, borderRadius:'12px 12px 0 0' }}/>
            <div style={{ fontSize:10.5, fontWeight:600, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'.07em', marginBottom:6 }}>{c.label}</div>
            <div style={{ fontSize:22, fontWeight:700, color:'var(--text)' }}>{c.value}</div>
            <div style={{ fontSize:11.5, color:'var(--text-3)', marginTop:4 }}>{c.sub}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display:'flex', gap:10, marginBottom:14, flexWrap:'wrap', alignItems:'center' }}>
        <ViewToggle view={view} onChange={setView} />
        <div className="search-wrap">
          <span className="search-icon">⌕</span>
          <input className="search-input" placeholder="Search products or SKU…" value={search} onChange={e=>setSearch(e.target.value)}/>
        </div>
        <select style={{ border:'1px solid var(--border-md)', borderRadius:8, padding:'6px 10px', fontSize:12.5, outline:'none', background:'var(--surface)', color:'var(--text)', fontFamily:'var(--font)' }}
          value={catFilter} onChange={e=>setCat(e.target.value)}>
          <option value="">All Categories</option>
          {categories.map(c=><option key={c.id} value={c.name}>{c.name}</option>)}
        </select>
        {(search||catFilter) && <button className="btn btn-ghost btn-sm" onClick={()=>{setSearch('');setCat('')}}>✕ Clear</button>}
        <span style={{ marginLeft:'auto', fontSize:12, color:'var(--text-3)' }}>{filtered.length} products · auto-refreshes every 5s</span>
      </div>

      {/* Table */}
      <div className={`grid-main-aside-280${!selected ? ' grid-single' : ''}`}>
        {loading ? <div style={{ padding:40, textAlign:'center' }}><span className="spinner" style={{ width:20, height:20 }}/></div>
          : filtered.length===0 ? <div className="empty-state"><span className="empty-icon">⚖</span><span>No products found.</span></div>
          : view === 'table' ? (
        <div className="table-wrap">(
            <table className="data-table">
              <thead>
                <tr>
                  <th className="sort" onClick={()=>handleSort('name')}>Product <SA col="name"/></th>
                  <th>Category</th>
                  <th className="sort" style={{ textAlign:'right' }} onClick={()=>handleSort('quantity')}>Current Qty <SA col="quantity"/></th>
                  <th style={{ textAlign:'right' }} className="hide-mobile">Total In</th>
                  <th style={{ textAlign:'right' }} className="hide-mobile">Total Out</th>
                  <th className="sort" style={{ textAlign:'right' }} onClick={()=>handleSort('stockVal')}>Stock Value <SA col="stockVal"/></th>
                  <th style={{ textAlign:'right' }}>Retail Value</th>
                  <th style={{ textAlign:'right' }} className="hide-mobile">Pot. Profit</th>
                  <th className="hide-mobile">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(p=>{
                  const status = p.quantity===0?'out':p.quantity<=p.reorderLevel?'low':'ok'
                  return (
                    <tr key={p.id} onClick={()=>setSelected(p.id===selected?null:p.id)}
                      style={{ cursor:'pointer', background:p.id===selected?'var(--accent-dim)':'' }}>
                      <td>
                        <div style={{ fontWeight:500 }}>{p.name}</div>
                        {p.sku && <div style={{ fontSize:10.5, color:'var(--text-3)', fontFamily:'var(--mono)' }}>{p.sku}</div>}
                      </td>
                      <td><span className="tag">{p.categoryName}</span></td>
                      <td className="mono" style={{ textAlign:'right', fontWeight:700, color:status==='out'?'var(--red)':status==='low'?'var(--amber)':'var(--text)' }}>{p.quantity}</td>
                      <td className="mono hide-mobile" style={{ textAlign:'right', color:'var(--green)', fontSize:12 }}>+{p.totalIn}</td>
                      <td className="mono hide-mobile" style={{ textAlign:'right', color:'var(--red)', fontSize:12 }}>−{p.totalOut}</td>
                      <td className="mono" style={{ textAlign:'right', fontSize:12 }}>{fmt(p.stockVal)}</td>
                      <td className="mono" style={{ textAlign:'right', fontSize:12, color:'var(--text-2)' }}>{fmt(p.retailVal)}</td>
                      <td className="mono" style={{ textAlign:'right', fontWeight:700, fontSize:12, color:p.potProfit>=0?'var(--green)':'var(--red)' }}>
                        {p.potProfit>=0?'+':''}{fmt(p.potProfit)}
                      </td>
                      <td>
                        {status==='out'&&<span className="badge badge-out">Out</span>}
                        {status==='low'&&<span className="badge badge-low">Low</span>}
                        {status==='ok' &&<span className="badge badge-ok">OK</span>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )
        </div>
          ) : (
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))',gap:12}}>
          {filtered.map(p => {
            const status = p.quantity === 0 ? 'out' : p.quantity <= p.reorderLevel ? 'low' : 'ok'
            return (
            <div key={p.id} className="card" style={{padding:14,cursor:'pointer',border:selected===p.id?'1px solid var(--accent)':'1px solid var(--border)'}} onClick={()=>setSelected(selected===p.id?null:p.id)}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:8}}>
                <div><div style={{fontWeight:600,fontSize:13}}>{p.name}</div>{p.sku&&<div style={{fontFamily:'var(--mono)',fontSize:10,color:'var(--text-3)'}}>{p.sku}</div>}</div>
                {status==='out'&&<span className="badge badge-out">Out</span>}
                {status==='low'&&<span className="badge badge-low">Low</span>}
                {status==='ok' &&<span className="badge badge-ok">OK</span>}
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6}}>
                {[{label:'Category',value:p.categoryName},{label:'Qty',value:p.quantity,color:status==='out'?'var(--red)':status==='low'?'var(--amber)':'var(--text)'},{label:'Stock Value',value:fmt(p.stockVal)},{label:'Retail Value',value:fmt(p.retailVal)},{label:'Pot. Profit',value:fmt(p.potProfit),color:p.potProfit>=0?'var(--green)':'var(--red)'},{label:'Total In',value:`+${p.totalIn}`}].map(r=>(
                  <div key={r.label} style={{background:'var(--raised)',borderRadius:6,padding:'6px 8px'}}>
                    <div style={{fontSize:10,color:'var(--text-3)',marginBottom:2}}>{r.label}</div>
                    <div style={{fontSize:12,fontFamily:'var(--mono)',fontWeight:500,color:r.color||'var(--text)'}}>{r.value}</div>
                  </div>
                ))}
              </div>
            </div>
          )})}
        </div>
          )}

        {selected && (()=>{
          const p = filtered.find(x=>x.id===selected)
          if (!p) return null
          const margin = Number(p.price)>0?((Number(p.price)-(p.avgCost))/Number(p.price)*100).toFixed(1):0
          return (
            <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:12, overflow:'hidden', position:'sticky', top:80 }}>
              <div style={{ padding:'12px 16px', borderBottom:'1px solid var(--border)', background:'var(--raised)', display:'flex', justifyContent:'space-between', flexWrap:'wrap', gap:8, alignItems:'center' }}>
                <span style={{ fontWeight:600, fontSize:13 }}>Product Detail</span>
                <button onClick={()=>setSelected(null)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-3)', fontSize:16 }}>✕</button>
              </div>
              <div style={{ padding:16 }}>
                <div style={{ fontWeight:700, fontSize:14, marginBottom:3 }}>{p.name}</div>
                {p.sku && <div style={{ fontFamily:'var(--mono)', fontSize:11, color:'var(--text-3)', marginBottom:14 }}>{p.sku}</div>}
                {[
                  { label:'Category',        value:p.categoryName },
                  { label:'Current Stock',   value:p.quantity, color:p.quantity===0?'var(--red)':p.quantity<=p.reorderLevel?'var(--amber)':'var(--green)', mono:true },
                  { label:'Reorder Level',   value:p.reorderLevel, mono:true },
                  { label:'Sell Price',      value:fmt(p.price), mono:true },
                  { label:'Cost Price',      value:fmt(p.costPrice||0), mono:true },
                  { label:'Avg Cost',        value:fmt(p.avgCost), mono:true },
                  { label:'Gross Margin',    value:`${margin}%`, color:Number(margin)>=0?'var(--green)':'var(--red)', mono:true },
                  { label:'Total Received',  value:`+${p.totalIn} units`, color:'var(--green)', mono:true },
                  { label:'Total Sold',      value:`−${p.totalOut} units`, color:'var(--red)', mono:true },
                  { label:'Stock Value',     value:fmt(p.stockVal), mono:true },
                  { label:'Retail Value',    value:fmt(p.retailVal), mono:true },
                  { label:'Pot. Profit',     value:fmt(p.potProfit), color:p.potProfit>=0?'var(--green)':'var(--red)', mono:true },
                ].map(row=>(
                  <div key={row.label} style={{ display:'flex', justifyContent:'space-between', flexWrap:'wrap', gap:8, padding:'6px 0', borderBottom:'1px solid var(--border)', alignItems:'center' }}>
                    <span style={{ fontSize:11.5, color:'var(--text-3)' }}>{row.label}</span>
                    <span style={{ fontSize:12.5, fontFamily:row.mono?'var(--mono)':'var(--font)', color:row.color||'var(--text)', fontWeight:500 }}>{row.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )
        })()}
      </div>
    </AppLayout>
  )
}