import { useState, useRef } from 'react'
import { useAuth } from '../../context/AuthContext'
import { DEMO_MODE } from '../../api/axiosInstance'
import api from '../../api/axiosInstance'

const makeOtp = () => String(Math.floor(100000 + Math.random() * 900000))

function OtpStep({ email, otp: generatedOtp, onVerified, onBack }) {
  const [digits, setDigits] = useState(['','','','','',''])
  const [error, setError]   = useState('')
  const refsArr = useRef([])
  const setRef = i => el => { refsArr.current[i] = el }

  const handleChange = (i, val) => {
    if (!/^\d?$/.test(val)) return
    const next = [...digits]; next[i] = val
    setDigits(next); setError('')
    if (val && i < 5) refsArr.current[i+1]?.focus()
  }
  const handleKeyDown = (i, e) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) refsArr.current[i-1]?.focus()
  }

  const verify = () => {
    const code = digits.join('')
    if (code.length < 6) { setError('Enter all 6 digits.'); return }
    if (DEMO_MODE) {
      if (code === generatedOtp) onVerified()
      else setError('Incorrect OTP.')
    } else {
      api.post('/auth/verify-email-otp', { email, otp: code })
        .then(onVerified)
        .catch(() => setError('Incorrect or expired OTP.'))
    }
  }

  return (
    <>
      <div style={{ marginBottom:24 }}>
        <h2 style={{ fontSize:18, fontWeight:600, marginBottom:4, letterSpacing:'-.01em' }}>Verify your email</h2>
        <p style={{ color:'var(--text-2)', fontSize:13, lineHeight:1.6 }}>
          A 6-digit code was sent to <strong style={{ color:'var(--text)' }}>{email}</strong>.
          {DEMO_MODE && <span style={{ display:'block', color:'var(--accent)', fontFamily:'var(--mono)', fontSize:12, marginTop:4 }}>Demo OTP: <strong>{generatedOtp}</strong></span>}
        </p>
      </div>

      <div style={{ display:'flex', gap:8, justifyContent:'center', marginBottom:16 }}>
        {digits.map((d, i) => (
          <input key={i} ref={setRef(i)} value={d} maxLength={1}
            onChange={e => handleChange(i, e.target.value)}
            onKeyDown={e => handleKeyDown(i, e)}
            autoFocus={i === 0}
            style={{
              width:44, height:52, textAlign:'center', fontSize:22, fontFamily:'var(--mono)',
              fontWeight:600, background:'var(--raised)', border:`1px solid ${error ? 'var(--red)' : d ? 'var(--accent-border)' : 'var(--border-md)'}`,
              borderRadius:8, color:'var(--text)', outline:'none', transition:'border-color 120ms',
            }}
            onFocus={e => e.target.style.borderColor = 'var(--accent)'}
            onBlur={e => e.target.style.borderColor = error ? 'var(--red)' : d ? 'var(--accent-border)' : 'var(--border-md)'}
          />
        ))}
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom:12 }}>{error}</div>}

      <button className="btn btn-primary btn-full" onClick={verify} style={{ marginBottom:10 }}>
        Verify & Create Account
      </button>
      <button className="btn btn-ghost btn-full" onClick={onBack}>← Back</button>
    </>
  )
}

export default function RegisterPage({ goLogin }) {
  const { register } = useAuth()
  const [form, setForm]     = useState({ username:'', fullName:'', email:'', password:'', confirm:'' })
  const [error, setError]   = useState('')
  const [loading, setLoading] = useState(false)
  const [otpStep, setOtpStep] = useState(null)   
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  const submitForm = async e => {
    e.preventDefault(); setError('')
    if (!form.username || !form.fullName || !form.email || !form.password) { setError('All fields required.'); return }
    if (form.password.length < 6) { setError('Password must be at least 6 characters.'); return }
    if (form.password !== form.confirm) { setError('Passwords do not match.'); return }

    setLoading(true)
    try {
      const otp = makeOtp()
      if (!DEMO_MODE) {
        await api.post('/auth/send-otp', { email: form.email })
      }
      setOtpStep({ email: form.email, otp })
    } catch (err) {
      setError(err.response?.data?.message ?? 'Could not send verification code.')
    } finally { setLoading(false) }
  }

  const onVerified = async () => {
    setLoading(true)
    try {
      await register({ username:form.username, fullName:form.fullName, email:form.email, password:form.password })
    } catch (err) {
      setError(err.response?.data?.message ?? 'Registration failed')
      setOtpStep(null)
    } finally { setLoading(false) }
  }

  return (
    <div className="auth-shell">
      <div className="auth-bg-grid" />
      <div className="auth-card">
        <div className="auth-logo">
          <div className="auth-logo-mark">
            <img src="/logo.png" alt="InventOS" style={{ width:'100%', height:'100%', objectFit:'cover', borderRadius:8 }} />
          </div>
          <span className="auth-logo-text">InventOS</span>

        </div>

        {!otpStep ? (
          <>
            <h2 style={{ fontSize:18, fontWeight:600, marginBottom:4, letterSpacing:'-.01em' }}>Create account</h2>
            <p style={{ color:'var(--text-2)', fontSize:13, marginBottom:24 }}>Fill in your details to get started.</p>

            <form className="auth-form" onSubmit={submitForm}>
              <div className="field">
                <label>Username</label>
                <input type="text" placeholder="Choose a username" value={form.username} onChange={set('username')} autoFocus />
              </div>
              <div className="field">
                <label>Full Name</label>
                <input type="text" placeholder="Your full name" value={form.fullName} onChange={set('fullName')} />
              </div>
              <div className="field">
                <label>Email</label>
                <input type="email" placeholder="you@example.com" value={form.email} onChange={set('email')} />
              </div>
              <div className="field-row">
                <div className="field">
                  <label>Password</label>
                  <input type="password" placeholder="Min 6 chars" value={form.password} onChange={set('password')} />
                </div>
                <div className="field">
                  <label>Confirm</label>
                  <input type="password" placeholder="Repeat" value={form.confirm} onChange={set('confirm')} />
                </div>
              </div>
              {error && <div className="alert alert-error">{error}</div>}
              <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
                {loading && <span className="spinner" />}
                {loading ? 'Sending code…' : 'Continue →'}
              </button>
            </form>

            <div className="auth-footer" style={{ marginTop:20 }}>
              Already have an account?{' '}
              <span className="auth-link" onClick={goLogin}>Sign in</span>
            </div>
          </>
        ) : (
          <OtpStep
            email={otpStep.email}
            otp={otpStep.otp}
            onVerified={onVerified}
            onBack={() => setOtpStep(null)}
          />
        )}
      </div>
    </div>
  )
}
