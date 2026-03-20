import { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { getDashboardStats, getLowStockProducts } from '../../api/productApi'
import { getSalesStats, mockSales } from '../../api/salesApi'
import { getPurchaseStats, mockPurchases } from '../../api/purchaseApi'

const CUR_YEAR = new Date().getFullYear()
const CUR_MONTH = new Date().getMonth() + 1

function remapDate(dateStr) {
  
  return dateStr.replace(/^\d{4}/, String(CUR_YEAR))
}

const liveSales = mockSales.map(s => ({ ...s, soldAt: remapDate(s.soldAt) }))
const livePurchases = mockPurchases.map(p => ({ ...p, purchasedAt: remapDate(p.purchasedAt) }))

function getPeriodRange(period) {
  const now = new Date()
  if (period === 'month')   return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: now }
  if (period === 'quarter') { const q = Math.floor(now.getMonth()/3); return { from: new Date(now.getFullYear(), q*3, 1), to: now } }
  if (period === 'year')    return { from: new Date(now.getFullYear(), 0, 1), to: now }
  return { from: new Date(0), to: now } 
}

function filterByPeriod(items, dateField, period) {
  const { from } = getPeriodRange(period)
  return items.filter(x => new Date(x[dateField]) >= from)
}

function buildCashflowData(sales, purchases, period) {
  const { from } = getPeriodRange(period)
  const now = new Date()
  const months = []
  let cur = new Date(from.getFullYear(), from.getMonth(), 1)
  while (cur <= now) {
    months.push({
      key: cur.toISOString().slice(0,7),
      label: cur.toLocaleDateString('en-IN', { month:'short', ...(period==='year'?{year:'2-digit'}:{}) })
    })
    cur = new Date(cur.getFullYear(), cur.getMonth()+1, 1)
  }
  if (!months.length) months.push({ key: now.toISOString().slice(0,7), label: now.toLocaleDateString('en-IN',{month:'short'}) })
  return months.map(m => ({
    label:   m.label,
    inflow:  sales.filter(s=>s.soldAt.startsWith(m.key)).reduce((s,x)=>s+x.totalPrice,0),
    outflow: purchases.filter(p=>p.purchasedAt.startsWith(m.key)&&p.status==='received').reduce((s,x)=>s+x.totalCost,0),
  }))
}

function buildTopProducts(sales) {
  const map = {}
  sales.forEach(s => {
    if (!map[s.productName]) map[s.productName] = { name:s.productName, revenue:0, units:0, category:s.categoryName }
    map[s.productName].revenue += s.totalPrice
    map[s.productName].units   += s.quantity
  })
  return Object.values(map).sort((a,b)=>b.revenue-a.revenue).slice(0,5)
}

function PeriodTabs({ value, onChange }) {
  const opts = [
    { k:'month',   l:'This Month'   },
    { k:'quarter', l:'This Quarter' },
    { k:'year',    l:'This Year'    },
    { k:'all',     l:'All Time'     },
  ]
  return (
    <div style={{ display:'flex', background:'var(--raised)', borderRadius:9, padding:3, gap:2 }}>
      {opts.map(o => (
        <button key={o.k} onClick={()=>onChange(o.k)} style={{
          background:  value===o.k ? 'var(--surface)' : 'transparent',
          border:      value===o.k ? '1px solid var(--border-md)' : '1px solid transparent',
          borderRadius:6, color: value===o.k ? 'var(--text)' : 'var(--text-3)',
          cursor:'pointer', fontFamily:'var(--font)', fontSize:12,
          fontWeight: value===o.k ? 500 : 400,
          padding:'5px 13px', transition:'all 140ms',
          boxShadow: value===o.k ? '0 1px 4px rgba(0,0,0,.09)' : 'none',
          whiteSpace:'nowrap',
        }}>{o.l}</button>
      ))}
    </div>
  )
}

function CashflowChart({ data }) {
  const [tooltip, setTooltip] = useState(null)
  if (!data?.length) return <div style={{ height:180, display:'flex', alignItems:'center', justifyContent:'center', color:'var(--text-3)', fontSize:13 }}>No data for this period</div>

  const W=600, H=190, padL=52, padR=20, padT=16, padB=36
  const maxVal = Math.max(...data.flatMap(d=>[d.inflow,d.outflow]), 1)
  const xS = i => padL + (i/Math.max(data.length-1,1))*(W-padL-padR)
  const yS = v => padT + (H-padT-padB)*(1-v/maxVal)
  const fmtY = v => v>=100000?`${(v/100000).toFixed(1)}L`:v>=1000?`${(v/1000).toFixed(0)}k`:`${Math.round(v)}`

  const inflowPts  = data.map((d,i)=>`${xS(i)},${yS(d.inflow)}`).join(' ')
  const outflowPts = data.map((d,i)=>`${xS(i)},${yS(d.outflow)}`).join(' ')
  const inflowArea = `M${xS(0)},${yS(data[0].inflow)} `+data.slice(1).map((d,i)=>`L${xS(i+1)},${yS(d.inflow)}`).join(' ')+` L${xS(data.length-1)},${H-padB} L${xS(0)},${H-padB} Z`
  const outflowArea= `M${xS(0)},${yS(data[0].outflow)} `+data.slice(1).map((d,i)=>`L${xS(i+1)},${yS(d.outflow)}`).join(' ')+` L${xS(data.length-1)},${H-padB} L${xS(0)},${H-padB} Z`

  return (
    <div style={{ position:'relative' }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width:'100%', display:'block', overflow:'visible' }}>
        <defs>
          <linearGradient id="ig" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#16a05a" stopOpacity=".2"/><stop offset="100%" stopColor="#16a05a" stopOpacity=".01"/></linearGradient>
          <linearGradient id="og" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#dc3535" stopOpacity=".15"/><stop offset="100%" stopColor="#dc3535" stopOpacity=".01"/></linearGradient>
        </defs>
        
        {[0,1,2,3,4].map(i=>{const v=(maxVal/4)*i; const y=yS(v); return(
          <g key={i}>
            <line x1={padL} x2={W-padR} y1={y} y2={y} stroke="rgba(0,0,0,.05)" strokeWidth={.8} strokeDasharray="3 3"/>
            <text x={padL-6} y={y+3.5} textAnchor="end" fill="rgba(0,0,0,.35)" fontSize={8.5} fontFamily="monospace">₹{fmtY(v)}</text>
          </g>
        )})}
        <line x1={padL} x2={W-padR} y1={H-padB} y2={H-padB} stroke="rgba(0,0,0,.12)" strokeWidth={1}/>
        
        <path d={inflowArea}  fill="url(#ig)"/>
        <path d={outflowArea} fill="url(#og)"/>
        
        <polyline points={inflowPts}  fill="none" stroke="#16a05a" strokeWidth={2.2} strokeLinejoin="round" strokeLinecap="round"/>
        <polyline points={outflowPts} fill="none" stroke="#dc3535" strokeWidth={2.2} strokeLinejoin="round" strokeLinecap="round"/>
        
        {data.map((d,i)=>(
          <g key={i}>
            
            <circle cx={xS(i)} cy={yS(d.inflow)} r={4} fill="#16a05a" stroke="white" strokeWidth={2}
              style={{ cursor:'pointer' }}
              onMouseEnter={()=>setTooltip({i, type:'inflow', x:xS(i), y:yS(d.inflow), val:d.inflow, label:d.label})}
              onMouseLeave={()=>setTooltip(null)}/>
            
            <circle cx={xS(i)} cy={yS(d.outflow)} r={4} fill="#dc3535" stroke="white" strokeWidth={2}
              style={{ cursor:'pointer' }}
              onMouseEnter={()=>setTooltip({i, type:'outflow', x:xS(i), y:yS(d.outflow), val:d.outflow, label:d.label})}
              onMouseLeave={()=>setTooltip(null)}/>
            
            <text x={xS(i)} y={H-padB+14} textAnchor="middle" fill="rgba(0,0,0,.4)" fontSize={9} fontFamily="monospace">{d.label}</text>
          </g>
        ))}
        
        {tooltip && (
          <g>
            <rect x={tooltip.x-44} y={tooltip.y-32} width={88} height={24} rx={5} fill="rgba(15,17,23,.88)"/>
            <text x={tooltip.x} y={tooltip.y-16} textAnchor="middle" fill="white" fontSize={9.5} fontFamily="monospace">
              {tooltip.type==='inflow'?'↑ In':'↓ Out'} ₹{tooltip.val>=1000?`${(tooltip.val/1000).toFixed(1)}k`:tooltip.val.toLocaleString('en-IN')}
            </text>
          </g>
        )}
      </svg>
    </div>
  )
}

function PLBar({ label, value, max, color, prefix='₹' }) {
  const pct = max > 0 ? Math.min((value/max)*100, 100) : 0
  const fmt = n => n>=100000?`${prefix}${(n/100000).toFixed(2)}L`:n>=1000?`${prefix}${(n/1000).toFixed(1)}k`:`${prefix}${Math.round(n)}`
  return (
    <div style={{ marginBottom:12 }}>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
        <span style={{ fontSize:12.5, color:'var(--text-2)', fontWeight:500 }}>{label}</span>
        <span style={{ fontSize:12.5, fontFamily:'var(--mono)', color, fontWeight:600 }}>{fmt(value)}</span>
      </div>
      <div style={{ background:'var(--raised)', borderRadius:5, height:9, overflow:'hidden' }}>
        <div style={{ background:color, height:'100%', borderRadius:5, width:`${pct}%`, transition:'width .65s cubic-bezier(.22,1,.36,1)' }}/>
      </div>
    </div>
  )
}

function KpiCard({ label, value, sub, color, icon, onClick }) {
  const [hov, setHov] = useState(false)
  return (
    <div onClick={onClick}
      onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{
        background:'var(--surface)', border:`1px solid ${hov&&onClick?'var(--border-md)':'var(--border)'}`,
        borderRadius:12, padding:'17px 18px', cursor:onClick?'pointer':'default',
        transition:'all 140ms', position:'relative', overflow:'hidden',
        boxShadow: hov&&onClick?'0 3px 14px rgba(0,0,0,.08)':'none',
      }}>
      <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:color, borderRadius:'12px 12px 0 0', opacity:.7 }}/>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap' }}>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:10.5, fontWeight:600, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'.07em', marginBottom:7 }}>{label}</div>
          <div style={{ fontSize:24, fontWeight:700, color:'var(--text)', letterSpacing:'-.02em', lineHeight:1.2 }}>{value}</div>
          {sub && <div style={{ fontSize:11.5, color:'var(--text-3)', marginTop:5 }}>{sub}</div>}
        </div>
        {icon && (
          <div style={{ width:38, height:38, borderRadius:10, background:`${color}16`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:17, flexShrink:0 }}>{icon}</div>
        )}
      </div>
    </div>
  )
}

function Panel({ children, style={}, noPad=false }) {
  return (
    <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:12, overflow:'hidden', ...(noPad?{}:{padding:20}), ...style }}>
      {children}
    </div>
  )
}

function PanelHeader({ title, right, style={} }) {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16, ...style }}>
      <div style={{ fontSize:13, fontWeight:600, color:'var(--text)', letterSpacing:'-.01em' }}>{title}</div>
      {right}
    </div>
  )
}

function LinkBtn({ children, onClick }) {
  return (
    <button onClick={onClick} style={{ background:'none', border:'none', color:'var(--accent)', fontSize:12, cursor:'pointer', fontFamily:'var(--font)', padding:0, fontWeight:500 }}>
      {children}
    </button>
  )
}

function ActionBtn({ icon, label, desc, color, onClick }) {
  const [hov, setHov] = useState(false)
  return (
    <button onClick={onClick}
      onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{
        background: hov ? `${color}0c` : 'var(--surface)',
        border: `1.5px solid ${hov ? color : 'var(--border)'}`,
        borderRadius:10, cursor:'pointer',
        display:'flex', alignItems:'center', gap:12,
        padding:'12px 16px', fontFamily:'var(--font)',
        transition:'all 150ms', textAlign:'left', width:'100%',
        boxShadow: hov ? `0 3px 14px ${color}22` : 'none',
      }}>
      <div style={{
        width:36, height:36, borderRadius:9, background:`${color}18`,
        display:'flex', alignItems:'center', justifyContent:'center', fontSize:17, flexShrink:0,
      }}>{icon}</div>
      <div>
        <div style={{ fontSize:13, fontWeight:600, color: hov ? color : 'var(--text)', transition:'color 150ms' }}>{label}</div>
        <div style={{ fontSize:11.5, color:'var(--text-3)', marginTop:1 }}>{desc}</div>
      </div>
    </button>
  )
}

export default function DashboardPage() {
  const { user } = useAuth()
  const navigate  = useNavigate()

  const [period,   setPeriod]  = useState('all')
  const [stats,    setStats]   = useState(null)
  const [lowStock, setLow]     = useState([])
  const [loading,  setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [s, ls] = await Promise.all([getDashboardStats(), getLowStockProducts()])
      setStats(s); setLow(ls??[])
    } finally { setLoading(false) }
  }, [])

  useEffect(()=>{ load() },[load])

  
  const fSales  = useMemo(()=>filterByPeriod(liveSales,  'soldAt',      period), [period])
  const fPurch  = useMemo(()=>filterByPeriod(livePurchases, 'purchasedAt', period), [period])
  const cashflow= useMemo(()=>buildCashflowData(fSales, fPurch, period), [fSales, fPurch, period])
  const topProds= useMemo(()=>buildTopProducts(fSales), [fSales])

  const recentTxns = useMemo(()=>{
    const s = fSales.map(s=>({ id:`S${s.id}`, type:'sale', date:s.soldAt, label:s.productName, sub:`by ${s.soldBy}`, amount:s.totalPrice, positive:true }))
    const p = fPurch.map(p=>({ id:`P${p.id}`, type:'purchase', date:p.purchasedAt, label:p.productName, sub:p.supplierName, amount:p.totalCost, positive:false, status:p.status }))
    return [...s,...p].sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,10)
  }, [fSales, fPurch])

  const revenue  = fSales.reduce((s,x)=>s+x.totalPrice,0)
  const spend    = fPurch.filter(p=>p.status==='received').reduce((s,x)=>s+x.totalCost,0)
  const profit   = revenue - spend
  const pendingN = livePurchases.filter(p=>p.status==='pending').length
  const pendingV = livePurchases.filter(p=>p.status==='pending').reduce((s,p)=>s+p.totalCost,0)
  const maxPL    = Math.max(revenue, spend, 1)

  const fmt     = n => n>=100000?`₹${(n/100000).toFixed(2)}L`:n>=1000?`₹${(n/1000).toFixed(1)}k`:`₹${Math.round(n||0)}`
  const fmtFull = n => (n||0).toLocaleString('en-IN',{minimumFractionDigits:2})

  const hour  = new Date().getHours()
  const greet = hour<12?'Good morning':hour<17?'Good afternoon':'Good evening'

  const ACTIONS = [
    { icon:'📋', label:'New Purchase',  desc:'Record a supplier order',   color:'#4a6cf7', to:'/purchases'  },
    { icon:'📦', label:'Add Product',   desc:'Create a new inventory item', color:'#c97c10', to:'/products'   },
    { icon:'◫',  label:'Categories',    desc:'Manage product categories',  color:'#7c3aed', to:'/categories' },
    { icon:'◻',  label:'View Reports',  desc:'Analytics & P&L overview',   color:'#16a05a', to:'/reports'    },
  ]

  return (
    <div style={{ background:'var(--bg)', minHeight:'100vh' }}>
      <style>{`
        @keyframes fadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:none} }
        .ds { animation: fadeUp 300ms cubic-bezier(.22,1,.36,1) both }
        .ds:nth-child(1){animation-delay:20ms} .ds:nth-child(2){animation-delay:70ms}
        .ds:nth-child(3){animation-delay:120ms} .ds:nth-child(4){animation-delay:170ms}
        .ds:nth-child(5){animation-delay:220ms} .ds:nth-child(6){animation-delay:270ms}
      `}</style>

      <div className="page-content">

        
        <div className="ds" style={{ marginBottom:22 }}>

          
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:12, marginBottom:18 }}>
            <div>
              <div style={{ fontSize:20, fontWeight:700, color:'var(--text)', letterSpacing:'-.02em' }}>
                {greet}, {user?.fullName?.split(' ')[0]??user?.username} 👋
              </div>
              <div style={{ fontSize:13, color:'var(--text-3)', marginTop:3 }}>
                Here's your inventory overview.
              </div>
            </div>
            <PeriodTabs value={period} onChange={setPeriod}/>
          </div>

          {/* Quick Actions row — 4 cards full width */}
          <div className="grid-4">
            {ACTIONS.map(a=>(
              <ActionBtn key={a.label} icon={a.icon} label={a.label} desc={a.desc} color={a.color} onClick={()=>navigate(a.to)}/>
            ))}
          </div>
        </div>

        {/* ══ ROW 2 — KPI Cards ══════════════════════════════ */}
        <div className="ds grid-4" style={{ marginBottom:16 }}>
          <KpiCard label="Revenue"        value={fmt(revenue)}  sub={`${fSales.length} sales`}                      color="#16a05a" icon="💰" onClick={()=>navigate('/reports')}/>
          <KpiCard label="Purchases"      value={fmt(spend)}    sub={`${fPurch.filter(p=>p.status==='received').length} received`} color="#4a6cf7" icon="🛒" onClick={()=>navigate('/purchases')}/>
          <KpiCard label="Gross Profit"   value={fmt(Math.abs(profit))} sub={profit>=0?'▲ Profitable':'▼ Loss'} color={profit>=0?'#16a05a':'#dc3535'} icon={profit>=0?'📈':'📉'} onClick={()=>navigate('/reports')}/>
          <KpiCard label="Inventory Value" value={fmt(stats?.totalInventoryValue||0)} sub={`${stats?.totalProducts||0} products`} color="#c97c10" icon="📦" onClick={()=>navigate('/products')}/>
        </div>

        {/* ══ ROW 3 — Cash Flow Chart + P&L + Pending ═══════ */}
        <div className="ds grid-main-aside-280" style={{ marginBottom:14 }}>

          {/* Cash Flow */}
          <Panel>
            <PanelHeader
              title="Cash Flow"
              right={
                <div style={{ display:'flex', gap:16, alignItems:'center' }}>
                  <div style={{ display:'flex', gap:12, fontSize:12 }}>
                    <span style={{ display:'flex', alignItems:'center', gap:5, color:'var(--text-2)' }}>
                      <span style={{ width:12, height:3, background:'#16a05a', borderRadius:2, display:'inline-block' }}/>Inflow
                    </span>
                    <span style={{ display:'flex', alignItems:'center', gap:5, color:'var(--text-2)' }}>
                      <span style={{ width:12, height:3, background:'#dc3535', borderRadius:2, display:'inline-block' }}/>Outflow
                    </span>
                  </div>
                </div>
              }
            />
            <CashflowChart data={cashflow}/>
            <div style={{ display:'flex', gap:0, marginTop:16, paddingTop:14, borderTop:'1px solid var(--border)' }}>
              {[
                { label:'Total Inflow',  val:revenue, color:'#16a05a' },
                { label:'Total Outflow', val:spend,   color:'#dc3535' },
                { label:'Net',           val:profit,  color:profit>=0?'#16a05a':'#dc3535', sign:true },
              ].map((item,i)=>(
                <div key={i} style={{ flex:1, borderRight: i<2?'1px solid var(--border)':'none', padding:'0 16px 0 '+(i===0?0:16)+'px' }}>
                  <div style={{ fontSize:10.5, fontWeight:600, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:4 }}>{item.label}</div>
                  <div style={{ fontFamily:'var(--mono)', fontSize:15, fontWeight:700, color:item.color }}>
                    {item.sign?(profit>=0?'+':'-'):''}{fmt(Math.abs(item.val))}
                  </div>
                </div>
              ))}
            </div>
          </Panel>

          {/* Right column: P&L + Pending stacked */}
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>

            {/* Profit & Loss */}
            <Panel>
              <PanelHeader title="Profit & Loss"/>
              <PLBar label="Revenue"   value={revenue} max={maxPL} color="#16a05a"/>
              <PLBar label="Purchases" value={spend}   max={maxPL} color="#dc3535"/>
              <div style={{ borderTop:'1px solid var(--border)', paddingTop:12, marginTop:4 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', marginBottom: revenue>0?8:0 }}>
                  <span style={{ fontSize:12.5, fontWeight:600 }}>Net Profit</span>
                  <span style={{ fontFamily:'var(--mono)', fontWeight:700, fontSize:13.5, color:profit>=0?'#16a05a':'#dc3535' }}>
                    {profit>=0?'▲':'▼'} {fmt(Math.abs(profit))}
                  </span>
                </div>
                {revenue>0 && (
                  <div>
                    <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, color:'var(--text-3)', marginBottom:4 }}>
                      <span>Profit Margin</span>
                      <span style={{ fontFamily:'var(--mono)', fontWeight:500, color:profit>=0?'#16a05a':'#dc3535' }}>{((profit/revenue)*100).toFixed(1)}%</span>
                    </div>
                    <div style={{ background:'var(--raised)', borderRadius:4, height:7, overflow:'hidden' }}>
                      <div style={{ background:profit>=0?'#16a05a':'#dc3535', height:'100%', borderRadius:4, width:`${Math.min(Math.abs((profit/revenue)*100),100)}%`, transition:'width .6s' }}/>
                    </div>
                  </div>
                )}
              </div>
            </Panel>

            {/* Pending Purchases */}
            <Panel style={{ flex:1 }}>
              <PanelHeader
                title="Pending Orders"
                right={
                  pendingN > 0
                    ? <span style={{ fontSize:11, fontFamily:'var(--mono)', color:'var(--amber)', background:'var(--amber-dim)', border:'1px solid rgba(201,124,16,.25)', borderRadius:20, padding:'2px 8px', fontWeight:600 }}>{pendingN}</span>
                    : null
                }
              />
              {pendingN === 0 ? (
                <div style={{ textAlign:'center', color:'var(--text-3)', fontSize:12.5, padding:'8px 0' }}>
                  <div style={{ fontSize:18, marginBottom:5 }}>✓</div>All orders received
                </div>
              ) : (
                <>
                  <div style={{ fontFamily:'var(--mono)', fontSize:20, fontWeight:700, color:'var(--amber)', marginBottom:2 }}>{fmt(pendingV)}</div>
                  <div style={{ fontSize:11.5, color:'var(--text-3)', marginBottom:10 }}>awaiting delivery</div>
                  {livePurchases.filter(p=>p.status==='pending').slice(0,3).map(p=>(
                    <div key={p.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', padding:'6px 0', borderBottom:'1px solid var(--border)', fontSize:12 }}>
                      <div>
                        <div style={{ fontWeight:500, color:'var(--text)' }}>{p.productName}</div>
                        <div style={{ color:'var(--text-3)', fontSize:10.5 }}>{p.supplierName}</div>
                      </div>
                      <span style={{ fontFamily:'var(--mono)', color:'var(--amber)', fontSize:11.5, fontWeight:600 }}>{fmt(p.totalCost)}</span>
                    </div>
                  ))}
                  <button onClick={()=>navigate('/purchases')} style={{ marginTop:10, width:'100%', background:'var(--raised)', border:'1px solid var(--border)', borderRadius:6, color:'var(--text-2)', cursor:'pointer', fontSize:12, padding:'7px 0', fontFamily:'var(--font)', transition:'all 140ms' }}
                    onMouseEnter={e=>{e.currentTarget.style.background='var(--hover)';e.currentTarget.style.color='var(--text)'}}
                    onMouseLeave={e=>{e.currentTarget.style.background='var(--raised)';e.currentTarget.style.color='var(--text-2)'}}>
                    View all →
                  </button>
                </>
              )}
            </Panel>
          </div>
        </div>

        {/* ══ ROW 4 — Top Products + Recent Activity + Stock Alerts ═ */}
        <div className="ds grid-3-col">

          {/* Top Products */}
          <Panel>
            <PanelHeader title="Top Products by Revenue" right={<LinkBtn onClick={()=>navigate('/reports')}>See all →</LinkBtn>}/>
            {topProds.length===0
              ? <div style={{ color:'var(--text-3)', fontSize:12.5, textAlign:'center', padding:'20px 0' }}>No sales this period</div>
              : topProds.map((p,i)=>{
                  const pct   = topProds[0].revenue>0?(p.revenue/topProds[0].revenue)*100:0
                  const C     = ['#4a6cf7','#16a05a','#c97c10','#7c3aed','#0891b2'][i]
                  return (
                    <div key={p.name} style={{ marginBottom: i<topProds.length-1?14:0 }}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', marginBottom:5 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:9, overflow:'hidden', flex:1 }}>
                          <span style={{ width:22,height:22,borderRadius:6,background:`${C}18`,color:C,fontSize:11,fontWeight:700,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}>{i+1}</span>
                          <div style={{ overflow:'hidden', flex:1 }}>
                            <div style={{ fontSize:12.5,fontWeight:500,color:'var(--text)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{p.name}</div>
                            <div style={{ fontSize:10.5,color:'var(--text-3)' }}>{p.units} units</div>
                          </div>
                        </div>
                        <span style={{ fontFamily:'var(--mono)',fontSize:12.5,fontWeight:700,color:C,flexShrink:0,marginLeft:10 }}>{fmt(p.revenue)}</span>
                      </div>
                      <div style={{ background:'var(--raised)',borderRadius:4,height:5,overflow:'hidden' }}>
                        <div style={{ background:C,height:'100%',width:`${pct}%`,borderRadius:4,transition:'width .6s cubic-bezier(.22,1,.36,1)' }}/>
                      </div>
                    </div>
                  )
                })
            }
          </Panel>

          {/* Recent Activity */}
          <Panel noPad>
            <div style={{ padding:'16px 18px 12px', borderBottom:'1px solid var(--border)' }}>
              <PanelHeader style={{ marginBottom:0 }} title="Recent Activity" right={<LinkBtn onClick={()=>navigate('/reports')}>View all →</LinkBtn>}/>
            </div>
            {recentTxns.length===0
              ? <div style={{ padding:20, color:'var(--text-3)', fontSize:12.5, textAlign:'center' }}>No activity this period</div>
              : recentTxns.map((t,i)=>(
                <div key={t.id} style={{
                  display:'flex', alignItems:'center', gap:10, padding:'9px 18px',
                  borderBottom: i<recentTxns.length-1?'1px solid var(--border)':'none', transition:'background 120ms',
                }}
                  onMouseEnter={e=>e.currentTarget.style.background='var(--raised)'}
                  onMouseLeave={e=>e.currentTarget.style.background=''}
                >
                  <div style={{ width:30,height:30,borderRadius:8,flexShrink:0,
                    background:t.positive?'rgba(22,160,90,.1)':'rgba(74,108,247,.1)',
                    color:t.positive?'#16a05a':'#4a6cf7',
                    display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:700 }}>
                    {t.positive?'↑':'↓'}
                  </div>
                  <div style={{ flex:1, overflow:'hidden' }}>
                    <div style={{ fontSize:12.5,fontWeight:500,color:'var(--text)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{t.label}</div>
                    <div style={{ fontSize:11,color:'var(--text-3)' }}>
                      {t.sub} · {new Date(t.date).toLocaleDateString('en-IN',{day:'numeric',month:'short'})}
                    </div>
                  </div>
                  <div style={{ flexShrink:0, textAlign:'right' }}>
                    <div style={{ fontFamily:'var(--mono)',fontSize:12.5,fontWeight:700,color:t.positive?'#16a05a':'var(--text-2)' }}>
                      {t.positive?'+':'-'}{fmt(t.amount)}
                    </div>
                    {t.status && (
                      <span style={{ fontSize:10,color:t.status==='pending'?'var(--amber)':'#16a05a',fontWeight:600 }}>{t.status}</span>
                    )}
                  </div>
                </div>
              ))
            }
          </Panel>

          {/* Stock Alerts */}
          <Panel noPad style={{ display:'flex', flexDirection:'column' }}>
            <div style={{ padding:'14px 16px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
              <div style={{ fontSize:13, fontWeight:600, color:'var(--text)' }}>Stock Alerts</div>
              <div style={{ display:'flex', gap:5 }}>
                {(stats?.outOfStock??0)>0 && <span style={{ fontSize:10.5,color:'var(--red)',background:'var(--red-dim)',border:'1px solid rgba(220,53,53,.2)',borderRadius:20,padding:'1px 7px',fontWeight:700 }}>{stats.outOfStock} out</span>}
                {(stats?.lowStock??0)>0   && <span style={{ fontSize:10.5,color:'var(--amber)',background:'var(--amber-dim)',border:'1px solid rgba(201,124,16,.2)',borderRadius:20,padding:'1px 7px',fontWeight:700 }}>{stats.lowStock} low</span>}
              </div>
            </div>
            <div style={{ flex:1, overflowY:'auto' }}>
              {loading
                ? <div style={{ padding:20,textAlign:'center' }}><span className="spinner"/></div>
                : lowStock.length===0
                  ? <div style={{ padding:'24px 16px',textAlign:'center',color:'var(--text-3)',fontSize:12.5 }}><div style={{ fontSize:22,marginBottom:6 }}>✓</div>All stock healthy</div>
                  : lowStock.map(p=>(
                    <div key={p.id} onClick={()=>navigate('/products')}
                      style={{ display:'flex',alignItems:'center',gap:10,padding:'8px 14px',borderBottom:'1px solid var(--border)',cursor:'pointer',transition:'background 120ms' }}
                      onMouseEnter={e=>e.currentTarget.style.background='var(--raised)'}
                      onMouseLeave={e=>e.currentTarget.style.background=''}>
                      <div style={{ width:8,height:8,borderRadius:'50%',flexShrink:0,background:p.quantity===0?'var(--red)':'var(--amber)' }}/>
                      <div style={{ flex:1, overflow:'hidden' }}>
                        <div style={{ fontSize:12,fontWeight:500,color:'var(--text)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{p.name}</div>
                        <div style={{ fontSize:10.5,color:'var(--text-3)' }}>{p.categoryName}</div>
                      </div>
                      <span style={{ fontFamily:'var(--mono)',fontSize:11.5,fontWeight:700,flexShrink:0,
                        color:p.quantity===0?'var(--red)':'var(--amber)',
                        background:p.quantity===0?'var(--red-dim)':'var(--amber-dim)',
                        borderRadius:5,padding:'2px 7px' }}>
                        {p.quantity===0?'OUT':p.quantity}
                      </span>
                    </div>
                  ))
              }
            </div>
            <div style={{ borderTop:'1px solid var(--border)', padding:'8px 14px', flexShrink:0 }}>
              <button onClick={()=>navigate('/products')} style={{ width:'100%',background:'none',border:'none',color:'var(--accent)',fontSize:12,cursor:'pointer',fontFamily:'var(--font)',fontWeight:500,padding:'2px 0' }}>
                Manage inventory →
              </button>
            </div>
          </Panel>
        </div>

      </div>
    </div>
  )
}
