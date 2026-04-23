import { useState, useRef } from 'react'
import { useAuth } from '../../context/AuthContext'
import { DEMO_MODE, storage } from '../../api/axiosInstance'
import api from '../../api/axiosInstance'

function ForgotStep1({ onNext, onBack }) {
  const [email, setEmail]     = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const makeOtp = () => String(Math.floor(100000 + Math.random() * 900000))

  const submit = async e => {
    e.preventDefault()
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) { setError('Enter a valid email.'); return }
    setError(''); setLoading(true)
    try {
      if (DEMO_MODE) {
        await new Promise(r => setTimeout(r, 500))
        onNext(email, makeOtp())
      } else {
        await api.post('/auth/forgot-password', { email })
        onNext(email, null)
      }
    } catch { onNext(email, null) }
    finally { setLoading(false) }
  }

  return (<>
    <button onClick={onBack} style={{ background:'none', border:'none', color:'var(--text-3)', cursor:'pointer', fontSize:12, marginBottom:16, padding:0 }}>← Back to sign in</button>
    <h2 style={{ fontSize:18, fontWeight:600, marginBottom:4, letterSpacing:'-.01em' }}>Forgot password?</h2>
    <p style={{ color:'var(--text-2)', fontSize:13, marginBottom:24, lineHeight:1.6 }}>Enter your account email and we'll send a reset code.</p>
    <form onSubmit={submit} style={{ display:'flex', flexDirection:'column', gap:14 }}>
      <div className="field">
        <label>Email address</label>
        <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" autoFocus />
      </div>
      {error && <div className="alert alert-error">{error}</div>}
      <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
        {loading && <span className="spinner" />}{loading ? 'Sending…' : 'Send Reset Code'}
      </button>
    </form>
  </>)
}

function OtpBoxes({ value, onChange, error }) {
  const digits  = value.length ? value.split('') : Array(6).fill('')
  const refs    = useRef([])

  const handleChange = (i, val) => {
    if (!/^\d?$/.test(val)) return
    const next = [...digits]; next[i] = val
    while (next.length < 6) next.push('')
    onChange(next.join(''))
    if (val && i < 5) refs.current[i + 1]?.focus()
  }
  const handleKeyDown = (i, e) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) refs.current[i - 1]?.focus()
  }
  const handlePaste = e => {
    const p = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (p.length === 6) { onChange(p); refs.current[5]?.focus() }
  }

  return (
    <div style={{ display:'flex', gap:8, justifyContent:'center' }} onPaste={handlePaste}>
      {Array.from({ length:6 }, (_, i) => (
        <input key={i} ref={el => refs.current[i] = el}
          type="text" inputMode="numeric" maxLength={1}
          value={digits[i] || ''}
          autoFocus={i === 0}
          onChange={e => handleChange(i, e.target.value)}
          onKeyDown={e => handleKeyDown(i, e)}
          style={{
            width:44, height:52, textAlign:'center',
            fontSize:22, fontFamily:'var(--mono)', fontWeight:600,
            background:'var(--raised)',
            border:`1px solid ${error ? 'var(--red)' : digits[i] ? 'var(--accent-border)' : 'var(--border-md)'}`,
            borderRadius:8, color:'var(--text)', outline:'none', transition:'border-color 120ms',
          }}
          onFocus={e => { e.target.style.borderColor = 'var(--accent)' }}
          onBlur={e  => { e.target.style.borderColor = error ? 'var(--red)' : digits[i] ? 'var(--accent-border)' : 'var(--border-md)' }}
        />
      ))}
    </div>
  )
}

function ForgotStep2({ email, demoOtp, onNext, onBack }) {
  const [otp, setOtp]         = useState('')
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)
  const [resent, setResent]   = useState(false)

  const submit = async e => {
    e.preventDefault()
    if (otp.length < 6) { setError('Enter all 6 digits.'); return }
    setError(''); setLoading(true)
    try {
      if (DEMO_MODE) {
        await new Promise(r => setTimeout(r, 400))
        if (otp === demoOtp) onNext(otp)
        else { setError('Incorrect code.'); setLoading(false) }
      } else { onNext(otp) }
    } finally { if (!DEMO_MODE) setLoading(false) }
  }

  const resend = async () => {
    setResent(true)
    if (!DEMO_MODE) { try { await api.post('/auth/forgot-password', { email }) } catch {} }
    setTimeout(() => setResent(false), 30000)
  }

  return (<>
    <button onClick={onBack} style={{ background:'none', border:'none', color:'var(--text-3)', cursor:'pointer', fontSize:12, marginBottom:16, padding:0 }}>← Back</button>
    <h2 style={{ fontSize:18, fontWeight:600, marginBottom:4, letterSpacing:'-.01em' }}>Check your email</h2>
    <p style={{ color:'var(--text-2)', fontSize:13, marginBottom:8, lineHeight:1.6 }}>
      We sent a code to <strong style={{ color:'var(--text)' }}>{email}</strong>.
    </p>
    {DEMO_MODE && demoOtp && (
      <div style={{ background:'var(--accent-dim)', border:'1px solid var(--accent-border)', borderRadius:'var(--r)', padding:'8px 12px', marginBottom:16, fontFamily:'var(--mono)', fontSize:12, color:'var(--accent)' }}>
        Demo code: <strong>{demoOtp}</strong>
      </div>
    )}
    <form onSubmit={submit} style={{ display:'flex', flexDirection:'column', gap:14 }}>
      <OtpBoxes value={otp} onChange={setOtp} error={!!error} />
      {error && <div style={{ color:'var(--red)', fontSize:12, textAlign:'center' }}>{error}</div>}
      <button type="submit" className="btn btn-primary btn-full" disabled={loading || otp.length < 6}>
        {loading && <span className="spinner" />}{loading ? 'Verifying…' : 'Continue →'}
      </button>
    </form>
    <div style={{ textAlign:'center', fontSize:12, color:'var(--text-3)', marginTop:12 }}>
      Didn't receive it?{' '}
      <span onClick={resent ? null : resend} style={{ color: resent ? 'var(--text-3)' : 'var(--accent)', cursor: resent ? 'default' : 'pointer' }}>
        {resent ? 'Sent!' : 'Resend code'}
      </span>
    </div>
  </>)
}

function ForgotStep3({ email, otp, onDone, onBack }) {
  const [newPwd, setNewPwd]   = useState('')
  const [confPwd, setConfPwd] = useState('')
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)

  const strength = newPwd.length >= 12 && /[A-Z]/.test(newPwd) && /[0-9]/.test(newPwd) && /[^A-Za-z0-9]/.test(newPwd) ? 4
    : newPwd.length >= 8 && /[A-Z]/.test(newPwd) && /[0-9]/.test(newPwd) ? 3
    : newPwd.length >= 6 ? 2 : 1
  const strengthColor = ['','var(--red)','var(--amber)','var(--accent)','var(--green)'][strength]
  const strengthLabel = ['','Weak','Fair','Good','Strong'][strength]

  const submit = async e => {
    e.preventDefault()
    if (newPwd.length < 6)  { setError('Min 6 characters.'); return }
    if (newPwd !== confPwd) { setError('Passwords do not match.'); return }
    setError(''); setLoading(true)
    try {
      if (DEMO_MODE) { await new Promise(r => setTimeout(r, 600)); onDone() }
      else { await api.post('/auth/reset-password', { email, otp, newPassword: newPwd }); onDone() }
    } catch (err) { setError(err.response?.data?.message ?? 'Reset failed.') }
    finally { setLoading(false) }
  }

  return (<>
    <button onClick={onBack} style={{ background:'none', border:'none', color:'var(--text-3)', cursor:'pointer', fontSize:12, marginBottom:16, padding:0 }}>← Back</button>
    <h2 style={{ fontSize:18, fontWeight:600, marginBottom:4, letterSpacing:'-.01em' }}>Set new password</h2>
    <p style={{ color:'var(--text-2)', fontSize:13, marginBottom:24, lineHeight:1.6 }}>Choose a strong password for your account.</p>
    <form onSubmit={submit} style={{ display:'flex', flexDirection:'column', gap:14 }}>
      <div className="field">
        <label>New Password</label>
        <input type="password" value={newPwd} onChange={e => setNewPwd(e.target.value)} placeholder="Min 6 characters" autoFocus />
      </div>
      {newPwd.length > 0 && (
        <div>
          <div style={{ display:'flex', gap:4, marginBottom:4 }}>
            {[1,2,3,4].map(i => <div key={i} style={{ flex:1, height:3, borderRadius:2, background: i <= strength ? strengthColor : 'var(--border-md)', transition:'background 200ms' }} />)}
          </div>
          <div style={{ fontSize:11, color:'var(--text-3)' }}>{strengthLabel}</div>
        </div>
      )}
      <div className="field">
        <label>Confirm Password</label>
        <input type="password" value={confPwd} onChange={e => setConfPwd(e.target.value)} placeholder="Repeat new password" />
      </div>
      {error && <div className="alert alert-error">{error}</div>}
      <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
        {loading && <span className="spinner" />}{loading ? 'Resetting…' : 'Reset Password'}
      </button>
    </form>
  </>)
}

function ForgotDone({ onLogin }) {
  return (
    <div style={{ textAlign:'center', padding:'8px 0' }}>
      <div style={{ fontSize:36, marginBottom:16 }}>✓</div>
      <h2 style={{ fontSize:18, fontWeight:600, marginBottom:8 }}>Password reset!</h2>
      <p style={{ color:'var(--text-2)', fontSize:13, marginBottom:24, lineHeight:1.6 }}>Your password has been updated. You can now sign in.</p>
      <button className="btn btn-primary btn-full" onClick={onLogin}>Back to Sign In</button>
    </div>
  )
}

export default function LoginPage({ goRegister }) {
  const { login } = useAuth()
  const [form,    setForm]    = useState({ username: '', password: '' })
  const [error,   setError]   = useState('')
  const [loading, setLoading] = useState(false)

  const [forgotStep, setForgotStep] = useState(null)
  const [fpEmail,    setFpEmail]    = useState('')
  const [fpOtp,      setFpOtp]      = useState('')
  const [fpDemoOtp,  setFpDemoOtp]  = useState('')

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  // Direct login — no OTP step
  const submitCreds = async e => {
    e.preventDefault()
    if (!form.username || !form.password) { setError('Both fields are required.'); return }
    setError(''); setLoading(true)
    try {
      if (DEMO_MODE) {
        await login(form)
      } else {
        // Call the direct /auth/login endpoint (bypasses OTP)
        const { data } = await api.post('/auth/login', { username: form.username, password: form.password })
        storage.setToken(data.data.accessToken)
        storage.setUser(data.data.user)
        window.location.replace('/dashboard')
      }
    }
    catch (err) { setError(err.response?.data?.message ?? 'Invalid credentials.') }
    finally { setLoading(false) }
  }

  return (
    <div className="auth-shell">
      <div className="auth-bg-grid" />
      <div className="auth-card" style={{ minHeight: forgotStep ? 360 : 'auto' }}>

        <div className="auth-logo" style={{ marginBottom: forgotStep ? 4 : 28 }}>
          <div className="auth-logo-mark">
            <img src="/logo.png" alt="InventOS" style={{ width:'100%', height:'100%', objectFit:'cover', borderRadius:8 }} />
          </div>
          <span className="auth-logo-text">InventOS</span>
        </div>

        {forgotStep === 'email'    && <ForgotStep1 onNext={(email, demoOtp) => { setFpEmail(email); setFpDemoOtp(demoOtp || ''); setForgotStep('otp') }} onBack={() => setForgotStep(null)} />}
        {forgotStep === 'otp'      && <ForgotStep2 email={fpEmail} demoOtp={fpDemoOtp} onNext={otp => { setFpOtp(otp); setForgotStep('password') }} onBack={() => setForgotStep('email')} />}
        {forgotStep === 'password' && <ForgotStep3 email={fpEmail} otp={fpOtp} onDone={() => setForgotStep('done')} onBack={() => setForgotStep('otp')} />}
        {forgotStep === 'done'     && <ForgotDone onLogin={() => { setForgotStep(null); setFpEmail(''); setFpOtp('') }} />}

        {!forgotStep && (<>
          <h2 style={{ fontSize:18, fontWeight:600, marginBottom:4, letterSpacing:'-.01em' }}>Sign in</h2>
          <p style={{ color:'var(--text-2)', fontSize:13, marginBottom:24 }}>Enter your credentials to continue.</p>

          <form className="auth-form" onSubmit={submitCreds}>
            <div className="field">
              <label>Username</label>
              <input type="text" placeholder="Enter username" value={form.username}
                onChange={set('username')} autoFocus autoComplete="username" />
            </div>
            <div className="field">
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', marginBottom:5 }}>
                <label style={{ margin:0 }}>Password</label>
                <span onClick={() => setForgotStep('email')}
                  style={{ color:'var(--accent)', fontSize:12, cursor:'pointer' }}
                  onMouseEnter={e => e.target.style.textDecoration='underline'}
                  onMouseLeave={e => e.target.style.textDecoration='none'}>
                  Forgot password?
                </span>
              </div>
              <input type="password" placeholder="Enter password" value={form.password}
                onChange={set('password')} autoComplete="current-password" />
            </div>
            {error && <div className="alert alert-error">{error}</div>}
            <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
              {loading && <span className="spinner" />}
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          <div className="auth-footer" style={{ marginTop:20 }}>
            No account? <span className="auth-link" onClick={goRegister}>Create one</span>
          </div>

          {DEMO_MODE && (
            <div style={{ marginTop:20, background:'var(--raised)', border:'1px solid var(--border-md)', borderRadius:'var(--r)', padding:'12px 14px' }}>

              <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
              
              </div>
            </div>
          )}
        </>)}

      </div>
    </div>
  )
}
