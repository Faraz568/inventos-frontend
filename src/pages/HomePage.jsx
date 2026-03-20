import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'

function SquareGrid() {
  return (
    <div style={{
      position:    'fixed',
      inset:       0,
      zIndex:      0,
      pointerEvents:'none',
      backgroundImage: `
        linear-gradient(rgba(74,108,247,.06) 1px, transparent 1px),
        linear-gradient(90deg, rgba(74,108,247,.06) 1px, transparent 1px)
      `,
      backgroundSize: '48px 48px',
      maskImage: 'radial-gradient(ellipse 85% 80% at 50% 40%, black 50%, transparent 100%)',
      WebkitMaskImage: 'radial-gradient(ellipse 85% 80% at 50% 40%, black 50%, transparent 100%)',
    }} />
  )
}

const FEATURES = [
  { icon:'▦', title:'Product Management',  desc:'Real-time stock tracking with reorder alerts and category filtering.' },
  { icon:'↓', title:'Purchase Tracking',   desc:'Record supplier orders and automatically update stock on delivery.' },
  { icon:'◻', title:'Reports & Analytics', desc:'Purchase history, inventory value, and low-stock summaries.' },
  { icon:'⊞', title:'DB Manager',          desc:'Edit products and categories in a clean table view.' },
  { icon:'⚙', title:'User Management',     desc:'Role-based access with ADMIN, MANAGER, and USER roles.' },
  { icon:'◫', title:'Categories',          desc:'Organise your products into logical groups.' },
]

function Carousel({ items }) {
  const trackRef = useRef(null)
  const offset   = useRef(0)
  const paused   = useRef(false)
  const drag     = useRef({ on:false, startX:0, startOff:0 })
  const rafRef   = useRef(null)
  const CARD = 280, GAP = 12, STEP = CARD + GAP, SPEED = 0.35
  const doubled = [...items, ...items]

  const tick = useCallback(() => {
    if (!paused.current && !drag.current.on) {
      offset.current += SPEED
      if (offset.current >= items.length * STEP) offset.current -= items.length * STEP
    }
    if (trackRef.current) trackRef.current.style.transform = `translateX(${-offset.current}px)`
    rafRef.current = requestAnimationFrame(tick)
  }, [items.length])

  useEffect(() => {
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [tick])

  const onPointerDown = e => { drag.current = { on:true, startX:e.clientX, startOff:offset.current }; trackRef.current?.setPointerCapture(e.pointerId) }
  const onPointerMove = e => {
    if (!drag.current.on) return
    let v = drag.current.startOff - (e.clientX - drag.current.startX)
    const loop = items.length * STEP
    if (v < 0) v += loop; if (v >= loop) v -= loop
    offset.current = v
  }
  const onPointerUp = () => { drag.current.on = false }

  return (
    <div style={{ overflow:'hidden', cursor:'grab', userSelect:'none' }}
      onMouseEnter={() => paused.current = true}
      onMouseLeave={() => paused.current = false}>
      <div ref={trackRef}
        onPointerDown={onPointerDown} onPointerMove={onPointerMove}
        onPointerUp={onPointerUp} onPointerCancel={onPointerUp}
        style={{ display:'flex', gap:GAP, willChange:'transform', width:'max-content' }}>
        {doubled.map((item, i) => (
          <div key={i} style={{
            background:'var(--surface)', border:'1px solid var(--border)',
            borderRadius:12, flexShrink:0, padding:'24px',
            boxShadow:'0 1px 4px rgba(0,0,0,.04)',
            width:CARD, transition:'border-color 140ms ease',
          }}
            onMouseEnter={e => e.currentTarget.style.borderColor='var(--border-md)'}
            onMouseLeave={e => e.currentTarget.style.borderColor='var(--border)'}
          >
            <div style={{ color:'var(--accent)', fontSize:18, marginBottom:14, opacity:.75 }}>{item.icon}</div>
            <div style={{ color:'var(--text)', fontSize:14, fontWeight:600, marginBottom:7, letterSpacing:'-.01em' }}>{item.title}</div>
            <div style={{ color:'var(--text-2)', fontSize:12.5, lineHeight:1.65 }}>{item.desc}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function AnimatedTitle({ text }) {
  const [visible, setVisible] = useState(false)
  useEffect(() => { const t = setTimeout(() => setVisible(true), 100); return () => clearTimeout(t) }, [])

  
  const lines = text.split('\n')

  return (
    <h1 style={{
      color:'var(--text)',
      fontSize:'clamp(36px,7vw,68px)',
      fontWeight:600,
      letterSpacing:'-.03em',
      lineHeight:1.1,
      marginBottom:20,
    }}>
      {lines.map((line, li) => (
        <span key={li} style={{ display:'block' }}>
          {line.split('').map((ch, ci) => {
            const idx = lines.slice(0,li).join('').length + ci
            const isAccent = li === 1  
            return (
              <span key={ci} style={{
                display:     'inline-block',
                opacity:     visible ? 1 : 0,
                transform:   visible ? 'none' : 'translateY(20px)',
                transition:  `opacity 400ms ease ${idx * 18}ms, transform 400ms cubic-bezier(.22,1,.36,1) ${idx * 18}ms`,
                color:       isAccent ? 'var(--accent)' : 'inherit',
                whiteSpace:  ch === ' ' ? 'pre' : 'normal',
              }}>
                {ch}
              </span>
            )
          })}
        </span>
      ))}
    </h1>
  )
}

export default function HomePage() {
  const navigate = useNavigate()

  return (
    <div style={{ background:'var(--bg)', minHeight:'100vh', position:'relative', overflowX:'hidden' }}>
      <style>{`
        @keyframes fade-up { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:none; } }
        .hero-pill    { animation: fade-up 450ms 600ms ease both; }
        .hero-sub     { animation: fade-up 450ms 800ms ease both; }
        .hero-actions { animation: fade-up 450ms 950ms ease both; }
        .hero-stack   { animation: fade-up 450ms 1080ms ease both; }
        .features-sec { animation: fade-up 450ms 200ms ease both; }
      `}</style>

      <SquareGrid />

      
      <nav style={{
        alignItems:'center', background:'rgba(245,246,248,.92)',
        backdropFilter:'blur(16px)', borderBottom:'1px solid var(--border-md)',
        display:'flex', height:52, justifyContent:'space-between',
        left:0, right:0, top:0, padding:'0 28px', position:'fixed', zIndex:50,
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <div style={{ width:28, height:28, borderRadius:7, overflow:'hidden', flexShrink:0 }}>
            <img src="/logo.png" alt="InventOS" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
          </div>
          <span style={{ fontFamily:'var(--mono)', fontSize:13, fontWeight:500, color:'var(--text)', letterSpacing:'.06em' }}>InventOS</span>
        </div>
        <button onClick={() => navigate('/login')} className="btn btn-ghost btn-sm">
          Sign in →
        </button>
      </nav>

      
      <div style={{
        alignItems:'center', display:'flex', flexDirection:'column',
        minHeight:'100vh', justifyContent:'center',
        padding:'80px 24px 60px', position:'relative',
        textAlign:'center', zIndex:10,
        maxWidth:720, margin:'0 auto',
      }}>

        
        <div className="hero-pill" style={{
          display:'inline-flex', alignItems:'center', gap:7,
          background:'var(--surface)', border:'1px solid var(--border)',
          boxShadow:'0 1px 4px rgba(0,0,0,.06)',
          borderRadius:20, color:'var(--text-2)',
          fontFamily:'var(--mono)', fontSize:11.5, letterSpacing:'.04em',
          marginBottom:32, padding:'5px 14px',
        }}>
          <span style={{ width:6, height:6, borderRadius:'50%', background:'var(--green)', display:'inline-block', flexShrink:0 }} />
          Full-Stack Inventory Management
        </div>

        
        <AnimatedTitle text={"Count products\nnot headaches"} />

        
        <p className="hero-sub" style={{
          color:'var(--text-2)', fontSize:'clamp(14px,2vw,16.5px)',
          lineHeight:1.75, maxWidth:480, marginBottom:36,
        }}>
          A full-stack inventory platform built with React, Spring Boot &amp; MySQL.
          Track products, purchases and reports — without the bloat.
        </p>

        
        <div className="hero-actions" style={{ display:'flex', gap:10, flexWrap:'wrap', justifyContent:'center', marginBottom:40 }}>
          <button onClick={() => navigate('/login')} className="btn btn-primary"
            style={{ fontSize:14, padding:'10px 26px' }}>
            Get started
          </button>
          <button onClick={() => document.getElementById('features')?.scrollIntoView({ behavior:'smooth' })}
            className="btn btn-ghost" style={{ fontSize:14, padding:'10px 22px' }}>
            See features
          </button>
        </div>

        
        <div className="hero-stack" style={{ display:'flex', flexWrap:'wrap', gap:6, justifyContent:'center' }}>
          {['React 18','Spring Boot 3','MySQL 8','JWT Auth','REST API'].map(t => (
            <span key={t} style={{
              background:'var(--raised)', border:'1px solid var(--border)',
              borderRadius:5, color:'var(--text-2)', fontFamily:'var(--mono)',
              fontSize:11, padding:'3px 10px',
            }}>{t}</span>
          ))}
        </div>
      </div>

      
      <section id="features" className="features-sec" style={{
        maxWidth:960, margin:'0 auto', padding:'0 24px 100px',
        position:'relative', zIndex:10,
      }}>
        
        <div style={{ textAlign:'center', marginBottom:40 }}>
          <div style={{ color:'var(--text-3)', fontFamily:'var(--mono)', fontSize:11, letterSpacing:'.1em', textTransform:'uppercase', marginBottom:10 }}>
            Features
          </div>
          <h2 style={{ color:'var(--text)', fontSize:'clamp(20px,3.5vw,28px)', fontWeight:600, letterSpacing:'-.02em' }}>
            Everything you need to manage stock
          </h2>
        </div>

        <Carousel items={FEATURES} />

      
      </section>
    </div>
  )
}
