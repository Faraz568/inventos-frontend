import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'

function fuzzyMatch(str, query) {
  if (!query) return true
  const s = str.toLowerCase(), q = query.toLowerCase()
  let si = 0
  for (let qi = 0; qi < q.length; qi++) {
    si = s.indexOf(q[qi], si)
    if (si === -1) return false
    si++
  }
  return true
}

function Highlight({ text, query }) {
  if (!query) return text
  const q = query.toLowerCase()
  const result = []
  let i = 0, qi = 0
  while (i < text.length) {
    if (qi < q.length && text[i].toLowerCase() === q[qi]) {
      result.push(<mark key={i} style={{ background:'var(--accent-dim)', color:'var(--accent)', borderRadius:2, padding:'0 1px' }}>{text[i]}</mark>)
      qi++
    } else { result.push(text[i]) }
    i++
  }
  return result
}

const NAV_COMMANDS = [
  { label:'Dashboard',        icon:'⊡', to:'/dashboard',  desc:'Overview & analytics'    },
  { label:'Sales Invoice',    icon:'📄', to:'/sales',      desc:'Create & manage invoices' },
  { label:'New Invoice',      icon:'✚',  to:'/sales?new=1',desc:'Create a new invoice'     },
  { label:'Purchases',        icon:'↓',  to:'/purchases',  desc:'Purchase orders'          },
  { label:'Products',         icon:'▦',  to:'/products',   desc:'Inventory management'     },
  { label:'Categories',       icon:'◫',  to:'/categories', desc:'Product categories'       },
  { label:'Reports',          icon:'◻',  to:'/reports',    desc:'Analytics & P&L'          },
  { label:'Stock Ledger',     icon:'📒', to:'/stock/ledger',  desc:'All stock movements'   },
  { label:'Stock Balance',    icon:'⚖',  to:'/stock/balance', desc:'Current stock levels'  },
  { label:'DB Manager',       icon:'⊞',  to:'/database',   desc:'Table editor'             },
  { label:'Settings',         icon:'⚙',  to:'/settings',   desc:'Account & preferences'    },
]

export default function CommandPalette({ products = [], onClose }) {
  const [query,  setQuery]  = useState('')
  const [active, setActive] = useState(0)
  const navigate = useNavigate()
  const inputRef = useRef(null)
  const listRef  = useRef(null)

  useEffect(() => { inputRef.current?.focus() }, [])
  useEffect(() => { setActive(0) }, [query])

  const prodItems = products.map(p => ({
    type:'product', label:p.name, icon:'▦',
    desc:`${p.categoryName} · SKU: ${p.sku||'—'} · ${p.quantity} in stock`,
    to:'/products', qty:p.quantity, price:p.price, id:p.id,
  }))

  const navFiltered  = query.trim() ? NAV_COMMANDS.filter(c=>fuzzyMatch(c.label,query)||fuzzyMatch(c.desc,query)) : NAV_COMMANDS
  const prodFiltered = query.trim() ? prodItems.filter(p=>fuzzyMatch(p.label,query)||fuzzyMatch(p.desc,query)) : []

  const groups = [
    ...(navFiltered.length  ? [{ group:'Pages & Actions', items:navFiltered }]  : []),
    ...(prodFiltered.length ? [{ group:'Products',        items:prodFiltered }] : []),
  ]
  const flat = groups.flatMap(g=>g.items)

  const go = useCallback(item => {
    if (item.to === '/sales?new=1') { navigate('/sales'); onClose(); setTimeout(()=>window.dispatchEvent(new CustomEvent('sales:new')),100); return }
    navigate(item.to); onClose()
  }, [navigate, onClose])

  const handleKey = useCallback(e => {
    if (e.key==='ArrowDown') { e.preventDefault(); setActive(a=>Math.min(a+1,flat.length-1)) }
    else if (e.key==='ArrowUp') { e.preventDefault(); setActive(a=>Math.max(a-1,0)) }
    else if (e.key==='Enter' && flat[active]) go(flat[active])
    else if (e.key==='Escape') onClose()
  }, [active, flat, go, onClose])

  useEffect(()=>{
    const el = listRef.current?.querySelector('[data-active="true"]')
    el?.scrollIntoView({block:'nearest'})
  },[active])

  let flatIdx = 0
  const fmtPrice = n => n>=1000?`₹${(n/1000).toFixed(0)}k`:`₹${n}`

  return (
    <div style={{
      position:'fixed', inset:0, background:'rgba(0,0,0,.3)', backdropFilter:'blur(3px)',
      display:'flex', alignItems:'flex-start', justifyContent:'center',
      paddingTop:'11vh', zIndex:500, animation:'fadeIn .1s ease',
    }} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{
        background:'var(--surface)', border:'1px solid var(--border-md)',
        borderRadius:14, boxShadow:'0 20px 60px rgba(0,0,0,.18), 0 4px 16px rgba(0,0,0,.10)',
        width:560, maxWidth:'95vw', maxHeight:'68vh',
        display:'flex', flexDirection:'column', overflow:'hidden',
        animation:'slideUp .15s ease',
      }}>
        
        <div style={{ display:'flex', alignItems:'center', gap:10, padding:'12px 16px', borderBottom:'1px solid var(--border)' }}>
          <span style={{ fontSize:16, color:'var(--text-3)', flexShrink:0 }}>⌕</span>
          <input ref={inputRef} value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={handleKey}
            placeholder="Search pages, products, actions…"
            style={{ flex:1, border:'none', outline:'none', fontSize:14, color:'var(--text)', background:'transparent', fontFamily:'var(--font)' }}/>
          {query && <button onClick={()=>setQuery('')} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-3)', fontSize:12, borderRadius:3, padding:'2px 5px' }}>✕</button>}
          <kbd style={{ background:'var(--raised)', border:'1px solid var(--border)', borderRadius:4, fontSize:10, padding:'2px 6px', color:'var(--text-3)', fontFamily:'var(--mono)', flexShrink:0 }}>ESC</kbd>
        </div>

        
        <div ref={listRef} style={{ overflowY:'auto', flex:1 }}>
          {groups.length===0 ? (
            <div style={{ padding:'32px 16px', textAlign:'center', color:'var(--text-3)', fontSize:13 }}>
              No results for <strong>"{query}"</strong>
            </div>
          ) : groups.map(group=>(
            <div key={group.group}>
              <div style={{ padding:'8px 16px 3px', fontSize:10.5, fontWeight:600, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'.07em' }}>
                {group.group}
              </div>
              {group.items.map(item=>{
                const idx = flatIdx++
                const isActive = idx===active
                return (
                  <div key={`${item.type||'nav'}-${item.label}`} data-active={isActive}
                    onClick={()=>go(item)} onMouseEnter={()=>setActive(idx)}
                    style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 14px', cursor:'pointer', background:isActive?'var(--accent-dim)':'transparent', transition:'background .1s' }}>
                    <div style={{
                      width:30, height:30, borderRadius:7, flexShrink:0,
                      background:isActive?'var(--accent-dim)':'var(--raised)', border:'1px solid var(--border)',
                      display:'flex', alignItems:'center', justifyContent:'center',
                      fontSize:13, color:isActive?'var(--accent)':'var(--text-2)',
                    }}>{item.icon}</div>
                    <div style={{ flex:1, overflow:'hidden' }}>
                      <div style={{ fontSize:13, fontWeight:500, color:isActive?'var(--accent)':'var(--text)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                        <Highlight text={item.label} query={query}/>
                      </div>
                      {item.desc && <div style={{ fontSize:11.5, color:'var(--text-3)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{item.desc}</div>}
                    </div>
                    {item.type==='product' && (
                      <div style={{ flexShrink:0, textAlign:'right' }}>
                        <div className="mono" style={{ fontSize:12, color:'var(--text-2)' }}>{fmtPrice(item.price)}</div>
                        <div style={{ fontSize:10.5, color:item.qty===0?'var(--red)':item.qty<=10?'var(--amber)':'var(--green)' }}>{item.qty} in stock</div>
                      </div>
                    )}
                    {isActive && !item.type && <kbd style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:3, fontSize:9, padding:'2px 4px', color:'var(--text-3)', fontFamily:'var(--mono)', flexShrink:0 }}>↵</kbd>}
                  </div>
                )
              })}
            </div>
          ))}
        </div>

        
        <div style={{ borderTop:'1px solid var(--border)', padding:'7px 14px', display:'flex', gap:14, fontSize:11, color:'var(--text-3)' }}>
          <span><kbd style={{ fontFamily:'var(--mono)', fontSize:10 }}>↑↓</kbd> navigate</span>
          <span><kbd style={{ fontFamily:'var(--mono)', fontSize:10 }}>↵</kbd> open</span>
          <span><kbd style={{ fontFamily:'var(--mono)', fontSize:10 }}>ESC</kbd> close</span>
          <span style={{ marginLeft:'auto' }}>{flat.length} result{flat.length!==1?'s':''}</span>
        </div>
      </div>
    </div>
  )
}
