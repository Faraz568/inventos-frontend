import { useState, useEffect, useCallback } from 'react'
import AppLayout from '../../components/layout/AppLayout'
import { getSales, getSalesStats, mockSales } from '../../api/salesApi'
import { exportSales } from '../../utils/exportUtils'
import { exportPurchases } from '../../utils/exportUtils'
import { exportProducts } from '../../utils/exportUtils'
import ExportMenu from '../../components/ui/ExportMenu'
import { getPurchases, getPurchaseStats, mockPurchases } from '../../api/purchaseApi'
import { DEMO_MODE } from '../../api/axiosInstance'
import { getProducts } from '../../api/productApi'
import { getCategories } from '../../api/categoryApi'

const COLORS = ['var(--blue)','var(--teal)','var(--amber)','var(--red)','#a78bfa','#fb923c','#34d399','#f472b6']

function BarChart({ data, color='var(--blue)', valuePrefix='₹' }) {
  if (!data || data.length === 0) return <div className="empty-state" style={{ padding:24 }}>No data</div>
  const max = Math.max(...data.map(d => d.value), 1)
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
      {data.map((d, i) => (
        <div key={i} style={{ display:'grid', gridTemplateColumns:'120px 1fr 90px', gap:10, alignItems:'center' }}>
          <div style={{ color:'var(--muted)', fontSize:12, textAlign:'right', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{d.label}</div>
          <div style={{ background:'var(--raised)', borderRadius:4, height:22, overflow:'hidden' }}>
            <div style={{ background:color, borderRadius:4, height:'100%', width:`${(d.value/max)*100}%`, transition:'width .5s ease', minWidth:d.value>0?4:0 }} />
          </div>
          <div style={{ color, fontFamily:'var(--mono)', fontSize:12, textAlign:'right' }}>
            {typeof d.value==='number'&&d.value>=1000 ? `${valuePrefix}${(d.value/1000).toFixed(1)}k` : `${valuePrefix}${d.value}`}
          </div>
        </div>
      ))}
    </div>
  )
}

function LineChart({ series, height=180 }) {
  if (!series || series.every(s => !s.data?.length)) return <div className="empty-state" style={{ padding:24 }}>No data</div>
  const allY = series.flatMap(s => s.data.map(d => d.y))
  const allX = series[0]?.data?.map(d => d.x) || []
  if (!allX.length) return null
  const minY=0, maxY=Math.max(...allY,1)
  const W=520, H=height, padL=54, padR=16, padT=12, padB=36
  const xScale = i => padL + (i/Math.max(allX.length-1,1))*(W-padL-padR)
  const yScale = v => padT + H - padB - ((v-minY)/(maxY-minY||1))*(H-padT-padB)
  const fmtY = v => v>=100000?`${(v/100000).toFixed(1)}L`:v>=1000?`${(v/1000).toFixed(0)}k`:`${v}`
  const yTicks=4, yStep=(maxY-minY)/yTicks
  return (
    <div style={{ overflowX:'auto' }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width:'100%', minWidth:300, fontFamily:'var(--mono)', fontSize:10 }}>
        {Array.from({length:yTicks+1}).map((_,i)=>{
          const val=minY+yStep*i, y=yScale(val)
          return (<g key={i}>
            <line x1={padL} x2={W-padR} y1={y} y2={y} stroke="var(--border)" strokeWidth={0.5}/>
            <text x={padL-6} y={y+3.5} textAnchor="end" fill="var(--muted)" fontSize={9}>₹{fmtY(val)}</text>
          </g>)
        })}
        {series.map((s,si)=>{
          const pts=s.data.map((d,i)=>`${xScale(i)},${yScale(d.y)}`).join(' ')
          return (<g key={si}>
            <polyline points={pts} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round"/>
            {s.data.map((d,i)=>(
              <circle key={i} cx={xScale(i)} cy={yScale(d.y)} r={3.5} fill={s.color} stroke="var(--surface)" strokeWidth={1.5}>
                <title>{s.label}: ₹{d.y.toLocaleString('en-IN')}</title>
              </circle>
            ))}
          </g>)
        })}
        {allX.map((lbl,i)=>(
          <text key={i} x={xScale(i)} y={H-padB+14} textAnchor="middle" fill="var(--muted)" fontSize={9}>{lbl}</text>
        ))}
        <line x1={padL} x2={W-padR} y1={H-padB} y2={H-padB} stroke="var(--border)" strokeWidth={1}/>
      </svg>
      <div style={{ display:'flex', gap:16, marginTop:8, flexWrap:'wrap' }}>
        {series.map((s,i)=>(
          <div key={i} style={{ display:'flex', alignItems:'center', gap:6, fontSize:11, color:'var(--muted)' }}>
            <div style={{ width:20, height:3, background:s.color, borderRadius:2 }}/>
            {s.label}
          </div>
        ))}
      </div>
    </div>
  )
}

function DonutChart({ segments, size=140 }) {
  const total=segments.reduce((s,x)=>s+x.value,0)
  if (!total) return null
  let offset=0
  const r=50,cx=60,cy=60,stroke=18,circ=2*Math.PI*r
  const arcs=segments.map((seg,i)=>{ const dash=seg.value/total*circ; const arc={...seg,dash,offset,color:COLORS[i%COLORS.length]}; offset+=dash; return arc })
  return (
    <div style={{ display:'flex', alignItems:'center', gap:20, flexWrap:'wrap' }}>
      <svg width={size} height={size} viewBox="0 0 120 120">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--raised)" strokeWidth={stroke}/>
        {arcs.map((arc,i)=>(
          <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={arc.color} strokeWidth={stroke}
            strokeDasharray={`${arc.dash} ${circ-arc.dash}`} strokeDashoffset={-arc.offset+circ*0.25} style={{transition:'all .4s ease'}}/>
        ))}
        <text x={cx} y={cy+5} textAnchor="middle" fill="var(--text)" fontSize="12" fontFamily="var(--mono)">{segments.length}</text>
        <text x={cx} y={cy+16} textAnchor="middle" fill="var(--muted)" fontSize="8">segments</text>
      </svg>
      <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
        {arcs.map((arc,i)=>(
          <div key={i} style={{ alignItems:'center', display:'flex', gap:8, fontSize:12 }}>
            <div style={{ background:arc.color, borderRadius:2, flexShrink:0, height:10, width:10 }}/>
            <span style={{ color:'var(--muted)' }}>{arc.label}</span>
            <span style={{ color:'var(--text)', fontFamily:'var(--mono)', marginLeft:'auto', paddingLeft:12 }}>
              {((arc.value/total)*100).toFixed(1)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function StatCard({ label, value, sub, cls='blue' }) {
  return (
    <div className={`stat-card ${cls}`}>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  )
}

function PnlBadge({ value }) {
  const color=value>=0?'var(--teal)':'var(--red)', sign=value>=0?'▲':'▼'
  return <span style={{ color, fontFamily:'var(--mono)', fontWeight:600 }}>{sign} ₹{Math.abs(value).toLocaleString('en-IN',{minimumFractionDigits:2})}</span>
}

export default function ReportsPage() {
  const [salesStats,    setSalesStats]    = useState(null)
  const [purchStats,    setPurchStats]    = useState(null)
  const [livePurchases, setLivePurchases] = useState([])
  const [liveSales,     setLiveSales]     = useState([])
  const [products,      setProducts]      = useState([])
  const [categories,    setCategories]    = useState([])
  const [loading,       setLoading]       = useState(true)
  const [activeSection, setActiveSection] = useState('overview')

  const refresh = useCallback(() => {
    setLoading(true)
    Promise.all([getProducts({ size:200 }), getCategories(), getPurchases(), getSales()])
      .then(([prod, cats, purchases, sales]) => {
        setProducts(prod?.content ?? [])
        setCategories(cats ?? [])
        const purArr = Array.isArray(purchases) ? purchases : []
        const salArr = Array.isArray(sales) ? sales : []
        setLivePurchases(purArr)
        setLiveSales(salArr)
        if (DEMO_MODE) {
          setSalesStats(getSalesStats())
          setPurchStats(getPurchaseStats())
        } else {
          const sTotal = salArr.reduce((s, x) => s + Number(x.totalPrice || 0), 0)
          const sByCat = {}, sByMonth = {}, sByProduct = {}
          salArr.forEach(s => {
            const cat = s.categoryName || 'Uncategorised'
            if (!sByCat[cat]) sByCat[cat] = { count: 0, total: 0 }
            sByCat[cat].count += Number(s.quantity || 0)
            sByCat[cat].total += Number(s.totalPrice || 0)
            const m = (s.soldAt || '').slice(0, 7)
            if (m) {
              if (!sByMonth[m]) sByMonth[m] = { revenue: 0, count: 0 }
              sByMonth[m].revenue += Number(s.totalPrice || 0)
              sByMonth[m].count   += 1
            }
            const pn = s.productName || 'Unknown'
            if (!sByProduct[pn]) sByProduct[pn] = { units: 0, revenue: 0 }
            sByProduct[pn].units   += Number(s.quantity || 0)
            sByProduct[pn].revenue += Number(s.totalPrice || 0)
          })
          setSalesStats({ total: salArr.length, totalRevenue: sTotal, byCat: sByCat, byMonth: sByMonth, byProduct: sByProduct })

          const pTotal = purArr.reduce((s, p) => s + Number(p.totalCost || 0), 0)
          const pByCat = {}, pByMonth = {}
          purArr.forEach(p => {
            const cat = p.categoryName || 'Uncategorised'
            if (!pByCat[cat]) pByCat[cat] = { count: 0, total: 0 }
            pByCat[cat].count += 1
            pByCat[cat].total += Number(p.totalCost || 0)
            const m = (p.purchasedAt || '').slice(0, 7)
            if (m) {
              if (!pByMonth[m]) pByMonth[m] = 0
              pByMonth[m] += Number(p.totalCost || 0)
            }
          })
          setPurchStats({
            total:    purArr.length,
            totalSpent: pTotal,
            received: purArr.filter(p => p.status === 'received').length,
            pending:  purArr.filter(p => p.status === 'pending').length,
            byCat: pByCat,
            byMonth: pByMonth,
          })
        }
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { refresh() }, [refresh])

  const fmt     = (n) => { if(n>=100000) return `₹${(n/100000).toFixed(2)}L`; if(n>=1000) return `₹${(n/1000).toFixed(1)}k`; return `₹${Math.round(n||0)}` }
  const fmtFull = n  => (n||0).toLocaleString('en-IN',{minimumFractionDigits:2})

  const SECTIONS = [
    { key:'overview',  label:'Overview'        },
    { key:'sales',     label:'Sales Report'     },
    { key:'purchases', label:'Purchase Report'  },
    { key:'inventory', label:'Inventory Report' },
    { key:'pnl',       label:'Profit & Loss'    },
  ]

  if (loading) return (
    <AppLayout title="Reports">
      <div style={{ padding:60, textAlign:'center' }}><span className="spinner" style={{ width:28, height:28, borderWidth:3 }}/></div>
    </AppLayout>
  )

  
  const totalRevenue  = salesStats?.totalRevenue || 0
  const totalSpent    = purchStats?.totalSpent   || 0
  const grossProfit   = totalRevenue - totalSpent
  const totalProducts = products.length
  const outOfStock    = products.filter(p=>p.quantity===0).length
  const lowStock      = products.filter(p=>p.quantity>0&&p.quantity<=p.reorderLevel).length
  const inventoryVal  = products.reduce((s,p)=>s+(Number(p.price)||0)*(p.quantity||0),0)

  
  const allMonths = Array.from(new Set([
    ...Object.keys(salesStats?.byMonth||{}),
    ...Object.keys(purchStats?.byMonth||{}),
  ])).sort()
  const monthlyData = allMonths.map(m=>({
    label:  new Date(m+'-01').toLocaleDateString('en-IN',{month:'short',year:'2-digit'}),
    revenue: salesStats?.byMonth?.[m]?.revenue||0,
    spent:   purchStats?.byMonth?.[m]||0,
    profit: (salesStats?.byMonth?.[m]?.revenue||0)-(purchStats?.byMonth?.[m]||0),
  }))

  const lineSeries = [
    { label:'Revenue',   color:'var(--teal)', data: monthlyData.map(d=>({x:d.label,y:d.revenue})) },
    { label:'Purchases', color:'var(--blue)', data: monthlyData.map(d=>({x:d.label,y:d.spent})) },
    { label:'Profit',    color:'var(--amber)',data: monthlyData.map(d=>({x:d.label,y:Math.max(0,d.profit)})) },
  ]

  
  const salesByCat = Object.entries(salesStats?.byCat||{}).map(([k,v])=>({label:k,value:v.total})).sort((a,b)=>b.value-a.value)
  const purchByCat = Object.entries(purchStats?.byCat||{}).map(([k,v])=>({label:k,value:v.total})).sort((a,b)=>b.value-a.value)

  const allCatNames = Array.from(new Set([...salesByCat.map(d=>d.label),...purchByCat.map(d=>d.label)]))
  const categoryPnL = allCatNames.map(cat=>({
    cat,
    rev:    salesStats?.byCat?.[cat]?.total||0,
    cost:   purchStats?.byCat?.[cat]?.total||0,
    profit: (salesStats?.byCat?.[cat]?.total||0)-(purchStats?.byCat?.[cat]?.total||0),
    salesQty: salesStats?.byCat?.[cat]?.count||0,
  })).sort((a,b)=>b.profit-a.profit)

  
  const productPnL = Object.entries(salesStats?.byProduct||{}).map(([name,sv])=>{
    const prod=products.find(p=>p.name===name)
    const costPrice=Number(prod?.costPrice||0)
    const revenue=sv.revenue, cost=sv.units*costPrice
    return { name, units:sv.units, revenue, cost, profit:revenue-cost, margin:revenue>0?((revenue-cost)/revenue*100).toFixed(1):'0.0' }
  }).sort((a,b)=>b.profit-a.profit)

  const topProducts = productPnL.slice(0,5)

  
  return (
    <AppLayout title="Reports">
      <div className="page-header">
        <div style={{ display:'flex', justifyContent:'space-between', flexWrap:'wrap', gap:8, alignItems:'flex-start', flexWrap:'wrap', gap:8 }}>
          <div>
            <div className="page-title">Reports & Analytics</div>
            <div className="page-sub">Live data from sales, purchases, and inventory</div>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <button className="btn btn-ghost btn-sm" onClick={refresh} style={{ gap:6 }}>↻ Refresh</button>
            <div style={{ color:'var(--muted)', fontFamily:'var(--mono)', fontSize:11 }}>{new Date().toLocaleString('en-IN')}</div>
          </div>
        </div>
      </div>

      <div className="tab-bar" style={{ marginBottom:20 }}>
        {SECTIONS.map(s=>(
          <button key={s.key} className={`tab-btn${activeSection===s.key?' active':''}`} onClick={()=>setActiveSection(s.key)}>{s.label}</button>
        ))}
      </div>

      <div style={{ display:'flex', justifyContent:'flex-end', gap:10, marginBottom:16, position:'relative', zIndex:1 }}>
        {activeSection==='sales'     && <ExportMenu label="Export Sales"     onExport={f=>exportSales(DEMO_MODE ? [...mockSales] : liveSales, f)}/>}
        {activeSection==='purchases' && <ExportMenu label="Export Purchases" onExport={f=>exportPurchases(DEMO_MODE ? [...mockPurchases] : livePurchases, f)}/>}
        {activeSection==='inventory' && <ExportMenu label="Export Inventory" onExport={f=>exportProducts(products,f)}/>}
      </div>

      
      {activeSection==='overview' && (<>
        <div className="stats-grid" style={{ marginBottom:24 }}>
          <StatCard cls="teal"  label="Total Revenue"   value={fmt(totalRevenue)} sub={`₹${fmtFull(totalRevenue)} total`}/>
          <StatCard cls="blue"  label="Total Purchases"  value={fmt(totalSpent)}   sub={`₹${fmtFull(totalSpent)} spent`}/>
          <StatCard cls={grossProfit>=0?'teal':'red'} label="Gross Profit" value={fmt(Math.abs(grossProfit))} sub={grossProfit>=0?'▲ Profitable':'▼ Loss making'}/>
          <StatCard cls="blue"  label="Inventory Value"  value={fmt(inventoryVal)} sub={`${totalProducts} active SKUs`}/>
        </div>

        <div className="card" style={{ padding:20, marginBottom:20 }}>
          <div style={{ fontFamily:'var(--mono)', fontSize:11, color:'var(--muted)', letterSpacing:'.08em', textTransform:'uppercase', marginBottom:16 }}>Monthly Trend — Revenue vs Purchases vs Profit</div>
          {monthlyData.length>0 ? <LineChart series={lineSeries} height={200}/> : <div className="empty-state" style={{padding:24}}>No monthly data yet</div>}
        </div>

        <div className="grid-2" style={{ marginBottom:20 }}>
          <div className="card" style={{ padding:20 }}>
            <div style={{ fontFamily:'var(--mono)', fontSize:11, color:'var(--muted)', letterSpacing:'.08em', textTransform:'uppercase', marginBottom:16 }}>Monthly Revenue</div>
            <BarChart data={monthlyData.map(d=>({label:d.label,value:d.revenue}))} color="var(--teal)"/>
          </div>
          <div className="card" style={{ padding:20 }}>
            <div style={{ fontFamily:'var(--mono)', fontSize:11, color:'var(--muted)', letterSpacing:'.08em', textTransform:'uppercase', marginBottom:16 }}>Monthly Purchases</div>
            <BarChart data={monthlyData.map(d=>({label:d.label,value:d.spent}))} color="var(--blue)"/>
          </div>
        </div>

        <div className="card" style={{ padding:20, marginBottom:20 }}>
          <div style={{ fontFamily:'var(--mono)', fontSize:11, color:'var(--muted)', letterSpacing:'.08em', textTransform:'uppercase', marginBottom:16 }}>Profit & Loss Summary</div>
          <table className="data-table">
            <thead><tr><th>Metric</th><th>Value</th><th>Notes</th></tr></thead>
            <tbody>
              <tr><td style={{fontWeight:500}}>Total Sales Revenue</td><td className="mono" style={{color:'var(--teal)'}}>₹{fmtFull(totalRevenue)}</td><td style={{color:'var(--muted)',fontSize:12}}>{salesStats?.total||0} transactions</td></tr>
              <tr><td style={{fontWeight:500}}>Total Purchase Cost</td><td className="mono" style={{color:'var(--red)'}}>₹{fmtFull(totalSpent)}</td><td style={{color:'var(--muted)',fontSize:12}}>{purchStats?.total||0} orders</td></tr>
              <tr><td style={{fontWeight:500}}>Gross Profit</td><td className="mono" style={{color:grossProfit>=0?'var(--teal)':'var(--red)',fontWeight:600}}>₹{fmtFull(Math.abs(grossProfit))}</td><td style={{color:grossProfit>=0?'var(--teal)':'var(--red)',fontSize:12}}>{grossProfit>=0?'▲ Profit':'▼ Loss'}</td></tr>
              <tr><td style={{fontWeight:500}}>Profit Margin</td><td className="mono">{totalRevenue>0?((grossProfit/totalRevenue)*100).toFixed(1):0}%</td><td style={{color:'var(--muted)',fontSize:12}}>Revenue − Cost</td></tr>
              <tr><td style={{fontWeight:500}}>Inventory Value</td><td className="mono" style={{color:'var(--blue)'}}>₹{fmtFull(inventoryVal)}</td><td style={{color:'var(--muted)',fontSize:12}}>{totalProducts} products</td></tr>
            </tbody>
          </table>
        </div>
      </>)}

      
      {activeSection==='sales' && (<>
        <div className="stats-grid" style={{ marginBottom:20 }}>
          <StatCard cls="teal"  label="Total Transactions" value={salesStats?.total||0} sub="All time sales"/>
          <StatCard cls="blue"  label="Total Revenue"       value={fmt(totalRevenue)} sub={`₹${fmtFull(totalRevenue)}`}/>
          <StatCard cls="amber" label="Avg Sale Value"       value={`₹${salesStats?.total?Math.round(totalRevenue/salesStats.total).toLocaleString('en-IN'):0}`} sub="Per transaction"/>
          <StatCard cls="teal"  label="Top Category"        value={salesByCat[0]?.label||'—'} sub={salesByCat[0]?fmt(salesByCat[0].value):''}/>
        </div>

        <div className="card" style={{ padding:20, marginBottom:20 }}>
          <div style={{ fontFamily:'var(--mono)', fontSize:11, color:'var(--muted)', letterSpacing:'.08em', textTransform:'uppercase', marginBottom:16 }}>Monthly Sales Trend</div>
          <LineChart series={[{label:'Revenue',color:'var(--teal)',data:monthlyData.map(d=>({x:d.label,y:d.revenue}))}]} height={180}/>
        </div>

        <div className="grid-2" style={{ marginBottom:20 }}>
          <div className="card" style={{ padding:20 }}>
            <div style={{ fontFamily:'var(--mono)', fontSize:11, color:'var(--muted)', letterSpacing:'.08em', textTransform:'uppercase', marginBottom:16 }}>Revenue by Category</div>
            <BarChart data={salesByCat} color="var(--teal)"/>
          </div>
          <div className="card" style={{ padding:20 }}>
            <div style={{ fontFamily:'var(--mono)', fontSize:11, color:'var(--muted)', letterSpacing:'.08em', textTransform:'uppercase', marginBottom:16 }}>Category Split</div>
            <DonutChart segments={salesByCat.map(d=>({label:d.label,value:d.value}))}/>
          </div>
        </div>

        <div className="card" style={{ overflow:'hidden' }}>
          <div style={{ fontFamily:'var(--mono)', fontSize:11, color:'var(--muted)', letterSpacing:'.08em', textTransform:'uppercase', padding:'14px 18px', borderBottom:'1px solid var(--border)' }}>Top Products by Revenue</div>
          <table className="data-table">
            <thead><tr><th>Rank</th><th>Product</th><th>Units Sold</th><th>Revenue</th><th>% of Total</th></tr></thead>
            <tbody>
              {topProducts.map((p,i)=>(
                <tr key={p.name}>
                  <td className="mono muted">#{i+1}</td>
                  <td style={{fontWeight:500}}>{p.name}</td>
                  <td className="mono">{p.units}</td>
                  <td className="mono" style={{color:'var(--teal)'}}>₹{p.revenue.toLocaleString('en-IN',{minimumFractionDigits:2})}</td>
                  <td className="mono muted">{totalRevenue>0?((p.revenue/totalRevenue)*100).toFixed(1):0}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="card" style={{ overflow:'hidden', marginTop:20 }}>
          <div style={{ fontFamily:'var(--mono)', fontSize:11, color:'var(--muted)', letterSpacing:'.08em', textTransform:'uppercase', padding:'14px 18px', borderBottom:'1px solid var(--border)' }}>
            All Sales ({(DEMO_MODE ? mockSales : liveSales).length})
          </div>
          <table className="data-table">
            <thead><tr><th>ID</th><th>Product</th><th>Category</th><th>Qty</th><th>Unit Price</th><th>Total</th><th>Sold By</th><th>Date</th></tr></thead>
            <tbody>
              {[...(DEMO_MODE ? mockSales : liveSales)].sort((a,b)=>new Date(b.soldAt)-new Date(a.soldAt)).map(s=>(
                <tr key={s.id}>
                  <td className="mono muted">{s.id}</td>
                  <td style={{fontWeight:500}}>{s.productName}</td>
                  <td><span className="tag">{s.categoryName}</span></td>
                  <td className="mono">{s.quantity}</td>
                  <td className="mono">₹{Number(s.unitPrice).toLocaleString('en-IN',{minimumFractionDigits:2})}</td>
                  <td className="mono" style={{color:'var(--teal)',fontWeight:500}}>₹{Number(s.totalPrice).toLocaleString('en-IN',{minimumFractionDigits:2})}</td>
                  <td style={{color:'var(--muted)',fontSize:12}}>{s.soldBy}</td>
                  <td className="mono muted" style={{fontSize:11}}>{new Date(s.soldAt).toLocaleDateString('en-IN')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </>)}

      
      {activeSection==='purchases' && (<>
        <div className="stats-grid" style={{ marginBottom:20 }}>
          <StatCard cls="blue"  label="Total Orders"   value={purchStats?.total||0}    sub="All time purchases"/>
          <StatCard cls="teal"  label="Total Spent"     value={fmt(totalSpent)}          sub={`₹${fmtFull(totalSpent)}`}/>
          <StatCard cls="amber" label="Pending Orders"  value={purchStats?.pending||0}   sub="Awaiting delivery"/>
          <StatCard cls="teal"  label="Received Orders" value={purchStats?.received||0}  sub="Successfully delivered"/>
        </div>

        <div className="card" style={{ padding:20, marginBottom:20 }}>
          <div style={{ fontFamily:'var(--mono)', fontSize:11, color:'var(--muted)', letterSpacing:'.08em', textTransform:'uppercase', marginBottom:16 }}>Monthly Purchases Trend</div>
          <LineChart series={[{label:'Purchases',color:'var(--blue)',data:monthlyData.map(d=>({x:d.label,y:d.spent}))}]} height={180}/>
        </div>

        <div className="grid-2" style={{ marginBottom:20 }}>
          <div className="card" style={{ padding:20 }}>
            <div style={{ fontFamily:'var(--mono)', fontSize:11, color:'var(--muted)', letterSpacing:'.08em', textTransform:'uppercase', marginBottom:16 }}>Spend by Category</div>
            <BarChart data={purchByCat} color="var(--blue)"/>
          </div>
          <div className="card" style={{ padding:20 }}>
            <div style={{ fontFamily:'var(--mono)', fontSize:11, color:'var(--muted)', letterSpacing:'.08em', textTransform:'uppercase', marginBottom:16 }}>Category Breakdown</div>
            <DonutChart segments={purchByCat.map(d=>({label:d.label,value:d.value}))}/>
          </div>
        </div>

        <div className="card" style={{ overflow:'hidden' }}>
          <div style={{ fontFamily:'var(--mono)', fontSize:11, color:'var(--muted)', letterSpacing:'.08em', textTransform:'uppercase', padding:'14px 18px', borderBottom:'1px solid var(--border)' }}>
            All Purchase Orders ({(DEMO_MODE ? mockPurchases : livePurchases).length})
          </div>
          <table className="data-table">
            <thead><tr><th>ID</th><th>Product</th><th>Supplier</th><th>Qty</th><th>Unit Cost</th><th>Total</th><th>Status</th><th>Date</th></tr></thead>
            <tbody>
              {[...(DEMO_MODE ? mockPurchases : livePurchases)].sort((a,b)=>new Date(b.purchasedAt)-new Date(a.purchasedAt)).map(p=>{
                const badge=p.status==='received'?<span className="badge badge-ok">Received</span>:p.status==='pending'?<span className="badge badge-low">Pending</span>:<span className="badge badge-out">Cancelled</span>
                return (
                  <tr key={p.id}>
                    <td className="mono muted">{p.id}</td>
                    <td style={{fontWeight:500}}>{p.productName}</td>
                    <td style={{color:'var(--muted)',fontSize:12}}>{p.supplierName}</td>
                    <td className="mono">{p.quantity}</td>
                    <td className="mono">₹{Number(p.unitCost).toLocaleString('en-IN',{minimumFractionDigits:2})}</td>
                    <td className="mono" style={{color:'var(--blue)',fontWeight:500}}>₹{Number(p.totalCost).toLocaleString('en-IN',{minimumFractionDigits:2})}</td>
                    <td>{badge}</td>
                    <td className="mono muted" style={{fontSize:11}}>{new Date(p.purchasedAt).toLocaleDateString('en-IN')}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </>)}

      
      {activeSection==='inventory' && (<>
        <div className="stats-grid" style={{ marginBottom:20 }}>
          <StatCard cls="blue"  label="Total Products" value={totalProducts}    sub="Active SKUs"/>
          <StatCard cls="teal"  label="Inventory Value" value={fmt(inventoryVal)} sub={`₹${fmtFull(inventoryVal)}`}/>
          <StatCard cls="amber" label="Low Stock"       value={lowStock}         sub="Below reorder level"/>
          <StatCard cls="red"   label="Out of Stock"    value={outOfStock}       sub="Needs reorder"/>
        </div>

        <div className="grid-2" style={{ marginBottom:20 }}>
          <div className="card" style={{ padding:20 }}>
            <div style={{ fontFamily:'var(--mono)', fontSize:11, color:'var(--muted)', letterSpacing:'.08em', textTransform:'uppercase', marginBottom:16 }}>Stock Status</div>
            <DonutChart segments={[
              {label:'In Stock',    value:products.filter(p=>p.quantity>p.reorderLevel).length},
              {label:'Low Stock',   value:lowStock},
              {label:'Out of Stock',value:outOfStock},
            ]}/>
          </div>
          <div className="card" style={{ padding:20 }}>
            <div style={{ fontFamily:'var(--mono)', fontSize:11, color:'var(--muted)', letterSpacing:'.08em', textTransform:'uppercase', marginBottom:16 }}>Value by Category</div>
            <BarChart
              data={categories.map(cat=>({label:cat.name,value:Math.round(products.filter(p=>p.categoryName===cat.name).reduce((s,p)=>s+(Number(p.price)||0)*(p.quantity||0),0))})).filter(d=>d.value>0).sort((a,b)=>b.value-a.value)}
              color="var(--amber)"
            />
          </div>
        </div>

        <div className="card" style={{ overflow:'hidden' }}>
          <div style={{ fontFamily:'var(--mono)', fontSize:11, color:'var(--muted)', letterSpacing:'.08em', textTransform:'uppercase', padding:'14px 18px', borderBottom:'1px solid var(--border)' }}>
            Full Inventory ({products.length} items)
          </div>
          <table className="data-table">
            <thead><tr><th>ID</th><th>Product</th><th>Category</th><th>Qty</th><th>Price</th><th>Cost</th><th>Margin</th><th>Stock Value</th><th>Status</th></tr></thead>
            <tbody>
              {products.map(p=>{
                const margin=Number(p.price)-Number(p.costPrice||0)
                const marginPct=Number(p.price)>0?(margin/Number(p.price)*100).toFixed(0):0
                const stockVal=Number(p.price)*(p.quantity||0)
                const badge=p.quantity===0?<span className="badge badge-out">Out</span>:p.quantity<=p.reorderLevel?<span className="badge badge-low">Low</span>:<span className="badge badge-ok">OK</span>
                return (
                  <tr key={p.id}>
                    <td className="mono muted">{p.id}</td>
                    <td style={{fontWeight:500}}>{p.name}{p.sku&&<div style={{color:'var(--muted)',fontSize:10,fontFamily:'var(--mono)'}}>{p.sku}</div>}</td>
                    <td><span className="tag">{p.categoryName}</span></td>
                    <td className="mono" style={{color:p.quantity===0?'var(--red)':p.quantity<=p.reorderLevel?'var(--amber)':'inherit'}}>{p.quantity}</td>
                    <td className="mono">₹{Number(p.price).toLocaleString('en-IN',{minimumFractionDigits:2})}</td>
                    <td className="mono muted">₹{Number(p.costPrice||0).toLocaleString('en-IN',{minimumFractionDigits:2})}</td>
                    <td className="mono" style={{color:margin>=0?'var(--teal)':'var(--red)'}}>{marginPct}%</td>
                    <td className="mono" style={{fontWeight:500}}>₹{stockVal.toLocaleString('en-IN',{minimumFractionDigits:2})}</td>
                    <td>{badge}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </>)}

      
      {activeSection==='pnl' && (<>
        <div className="stats-grid" style={{ marginBottom:24 }}>
          <StatCard cls="teal"  label="Total Revenue" value={fmt(totalRevenue)}       sub={`₹${fmtFull(totalRevenue)}`}/>
          <StatCard cls="blue"  label="Total Cost"     value={fmt(totalSpent)}         sub={`₹${fmtFull(totalSpent)}`}/>
          <StatCard cls={grossProfit>=0?'teal':'red'} label="Net Profit" value={fmt(Math.abs(grossProfit))} sub={grossProfit>=0?'▲ Profitable':'▼ Loss making'}/>
          <StatCard cls="amber" label="Profit Margin" value={`${totalRevenue>0?((grossProfit/totalRevenue)*100).toFixed(1):0}%`} sub="Gross margin"/>
        </div>

        
        <div className="card" style={{ padding:20, marginBottom:20 }}>
          <div style={{ fontFamily:'var(--mono)', fontSize:11, color:'var(--muted)', letterSpacing:'.08em', textTransform:'uppercase', marginBottom:16 }}>Monthly Profit & Loss Trend</div>
          <LineChart series={lineSeries} height={210}/>
        </div>

        
        <div className="card" style={{ overflow:'hidden', marginBottom:20 }}>
          <div style={{ fontFamily:'var(--mono)', fontSize:11, color:'var(--muted)', letterSpacing:'.08em', textTransform:'uppercase', padding:'14px 18px', borderBottom:'1px solid var(--border)' }}>Month-wise P&L</div>
          <table className="data-table">
            <thead><tr><th>Month</th><th>Revenue</th><th>Purchase Cost</th><th>Net Profit / Loss</th><th>Margin</th></tr></thead>
            <tbody>
              {monthlyData.length===0
                ? <tr><td colSpan={5} style={{textAlign:'center',color:'var(--muted)',padding:20}}>No data</td></tr>
                : monthlyData.map((m,i)=>(
                  <tr key={i}>
                    <td style={{fontWeight:500}}>{m.label}</td>
                    <td className="mono" style={{color:'var(--teal)'}}>₹{m.revenue.toLocaleString('en-IN',{minimumFractionDigits:2})}</td>
                    <td className="mono" style={{color:'var(--red)'}}>₹{m.spent.toLocaleString('en-IN',{minimumFractionDigits:2})}</td>
                    <td><PnlBadge value={m.profit}/></td>
                    <td className="mono muted">{m.revenue>0?((m.profit/m.revenue)*100).toFixed(1):'0.0'}%</td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>

        
        <div className="card" style={{ overflow:'hidden', marginBottom:20 }}>
          <div style={{ fontFamily:'var(--mono)', fontSize:11, color:'var(--muted)', letterSpacing:'.08em', textTransform:'uppercase', padding:'14px 18px', borderBottom:'1px solid var(--border)' }}>Category-wise Profit & Loss</div>
          <div style={{ padding:20, borderBottom:'1px solid var(--border)' }}>
            <BarChart data={categoryPnL.map(c=>({label:c.cat,value:Math.max(0,c.profit)}))} color="var(--amber)"/>
          </div>
          <table className="data-table">
            <thead><tr><th>Category</th><th>Sales Revenue</th><th>Purchase Cost</th><th>Net Profit / Loss</th><th>Margin</th><th>Sales Count</th></tr></thead>
            <tbody>
              {categoryPnL.length===0
                ? <tr><td colSpan={6} style={{textAlign:'center',color:'var(--muted)',padding:20}}>No category data</td></tr>
                : categoryPnL.map((c,i)=>(
                  <tr key={i}>
                    <td style={{fontWeight:500}}><span className="tag">{c.cat}</span></td>
                    <td className="mono" style={{color:'var(--teal)'}}>₹{c.rev.toLocaleString('en-IN',{minimumFractionDigits:2})}</td>
                    <td className="mono" style={{color:'var(--red)'}}>₹{c.cost.toLocaleString('en-IN',{minimumFractionDigits:2})}</td>
                    <td><PnlBadge value={c.profit}/></td>
                    <td className="mono muted">{c.rev>0?((c.profit/c.rev)*100).toFixed(1):'0.0'}%</td>
                    <td className="mono muted">{c.salesQty}</td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>

        
        <div className="card" style={{ overflow:'hidden' }}>
          <div style={{ fontFamily:'var(--mono)', fontSize:11, color:'var(--muted)', letterSpacing:'.08em', textTransform:'uppercase', padding:'14px 18px', borderBottom:'1px solid var(--border)' }}>Product-wise Profit & Loss</div>
          <div style={{ padding:20, borderBottom:'1px solid var(--border)' }}>
            <BarChart data={productPnL.slice(0,10).map(p=>({label:p.name,value:Math.max(0,p.profit)}))} color="var(--teal)"/>
          </div>
          <table className="data-table">
            <thead><tr><th>Product</th><th>Units Sold</th><th>Revenue</th><th>COGS</th><th>Net Profit / Loss</th><th>Margin %</th></tr></thead>
            <tbody>
              {productPnL.length===0
                ? <tr><td colSpan={6} style={{textAlign:'center',color:'var(--muted)',padding:20}}>No sales data yet</td></tr>
                : productPnL.map((p,i)=>(
                  <tr key={i}>
                    <td style={{fontWeight:500}}>{p.name}</td>
                    <td className="mono">{p.units}</td>
                    <td className="mono" style={{color:'var(--teal)'}}>₹{p.revenue.toLocaleString('en-IN',{minimumFractionDigits:2})}</td>
                    <td className="mono" style={{color:'var(--red)'}}>₹{p.cost.toLocaleString('en-IN',{minimumFractionDigits:2})}</td>
                    <td><PnlBadge value={p.profit}/></td>
                    <td className="mono" style={{color:Number(p.margin)>=0?'var(--teal)':'var(--red)'}}>{p.margin}%</td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
      </>)}
    </AppLayout>
  )
}
