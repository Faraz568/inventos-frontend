import { useState, useRef } from 'react'
import AppLayout from '../../components/layout/AppLayout'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { DEMO_MODE } from '../../api/axiosInstance'
import api from '../../api/axiosInstance'

function OtpModal({ email, onVerified, onClose, generatedOtp }) {
  const [digits, setDigits] = useState(['','','','','',''])
  const [error, setError]   = useState('')
  const [resent, setResent] = useState(false)
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
  const handlePaste = e => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g,'').slice(0,6)
    if (pasted.length === 6) { setDigits(pasted.split('')); refsArr.current[5]?.focus() }
  }

  const verify = () => {
    const code = digits.join('')
    if (code.length < 6) { setError('Enter all 6 digits.'); return }
    if (DEMO_MODE) {
      if (code === generatedOtp) { onVerified(code); onClose() }
      else setError('Incorrect OTP. Try again.')
    } else {
      onVerified(code); onClose()
    }
  }

  const handleResend = async () => {
    setResent(true)
    if (!DEMO_MODE) {
      try { await api.post('/auth/send-otp', { email }) } catch {}
    }
    setTimeout(() => setResent(false), 30000)
  }

  return (
    <div style={{
      position:'fixed', inset:0, background:'rgba(0,0,0,.6)', backdropFilter:'blur(4px)',
      display:'flex', alignItems:'center', justifyContent:'center', zIndex:300,
      animation:'fadeIn 120ms ease',
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background:'var(--surface)', border:'1px solid var(--border-md)',
        borderRadius:14, padding:'32px 28px', width:360, maxWidth:'95vw',
        boxShadow:'0 24px 64px rgba(0,0,0,.5)', animation:'slideUp 180ms ease',
      }}>
        <div style={{ marginBottom:20 }}>
          <div style={{ fontSize:17, fontWeight:600, color:'var(--text)', marginBottom:6 }}>Verify your email</div>
          <div style={{ color:'var(--text-2)', fontSize:13, lineHeight:1.6 }}>
            A 6-digit code was sent to <strong style={{ color:'var(--text)' }}>{email}</strong>.
            {DEMO_MODE && <span style={{ display:'block', color:'var(--accent)', fontFamily:'var(--mono)', fontSize:12, marginTop:4 }}>Demo OTP: <strong>{generatedOtp}</strong></span>}
          </div>
        </div>

        <div style={{ display:'flex', gap:8, justifyContent:'center', marginBottom:16 }} onPaste={handlePaste}>
          {digits.map((d, i) => (
            <input key={i} ref={setRef(i)} value={d} maxLength={1}
              onChange={e => handleChange(i, e.target.value)}
              onKeyDown={e => handleKeyDown(i, e)}
              style={{
                width:44, height:52, textAlign:'center', fontSize:22, fontFamily:'var(--mono)',
                fontWeight:600, background:'var(--raised)', border:`1px solid ${error ? 'var(--red)' : d ? 'var(--accent-border)' : 'var(--border-md)'}`,
                borderRadius:8, color:'var(--text)', outline:'none', transition:'border-color 120ms',
              }}
              onFocus={e => e.target.style.borderColor='var(--accent)'}
              onBlur={e => e.target.style.borderColor = error ? 'var(--red)' : d ? 'var(--accent-border)' : 'var(--border-md)'}
            />
          ))}
        </div>

        {error && <div style={{ color:'var(--red)', fontSize:12, textAlign:'center', marginBottom:12 }}>{error}</div>}

        <button onClick={verify} className="btn btn-primary btn-full" style={{ marginBottom:12 }}>
          Verify Email
        </button>

        <div style={{ textAlign:'center', fontSize:12, color:'var(--text-3)' }}>
          Didn't receive it?{' '}
          <span onClick={resent ? null : handleResend}
            style={{ color: resent ? 'var(--text-3)' : 'var(--accent)', cursor: resent ? 'default' : 'pointer' }}>
            {resent ? 'Sent! (wait 30s)' : 'Resend code'}
          </span>
        </div>
      </div>
    </div>
  )
}

export default function SettingsPage() {
  const { user, updateUser } = useAuth()
  const toast = useToast()

  const [fullName,   setFullName]   = useState(user?.fullName  || '')
  const [email,      setEmail]      = useState(user?.email     || '')
  const [newEmail,   setNewEmail]   = useState('')
  const [profilePic, setProfilePic] = useState(user?.profilePic || null)

  const [curPwd,  setCurPwd]  = useState('')
  const [newPwd,  setNewPwd]  = useState('')
  const [confPwd, setConfPwd] = useState('')

  const [savingProfile, setSavingProfile] = useState(false)
  const [savingPwd,     setSavingPwd]     = useState(false)
  const [otpTarget,     setOtpTarget]     = useState(null)
  const [activeTab,     setActiveTab]     = useState('profile')

  const fileRef = useRef(null)
  const makeOtp = () => String(Math.floor(100000 + Math.random() * 900000))

  const handleAvatarChange = e => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) { toast.error('Image must be under 2MB'); return }
    const reader = new FileReader()
    reader.onload = ev => {
      const src = ev.target.result
      setProfilePic(src)
      updateUser({ profilePic: src })
      toast.success('Profile picture updated.')
    }
    reader.readAsDataURL(file)
  }

  const saveProfile = async () => {
    if (!fullName.trim()) { toast.error('Full name is required.'); return }
    setSavingProfile(true)
    try {
      if (DEMO_MODE) {
        await new Promise(r => setTimeout(r, 500))
        updateUser({ fullName })
        toast.success('Profile updated.')
      } else {
        await api.put('/users/me/profile', { fullName })
        updateUser({ fullName })
        toast.success('Profile updated.')
      }
    } catch (err) { toast.error(err.response?.data?.message || 'Update failed') }
    finally { setSavingProfile(false) }
  }

  const requestEmailChange = () => {
    if (!newEmail.trim() || !/\S+@\S+\.\S+/.test(newEmail)) { toast.error('Enter a valid email address.'); return }
    if (newEmail === email) { toast.error('This is already your current email.'); return }
    const otp = makeOtp()
    if (!DEMO_MODE) {
      api.post('/auth/send-otp', { email: newEmail }).catch(() => {})
    }
    setOtpTarget({
      email: newEmail,
      otp,
      onVerified: async (verifiedOtp) => {
        try {
          if (DEMO_MODE) {
            await new Promise(r => setTimeout(r, 400))
          } else {
            await api.put('/users/me/email', { email: newEmail, otp: verifiedOtp })
          }
          updateUser({ email: newEmail })
          setEmail(newEmail); setNewEmail('')
          toast.success('Email updated successfully.')
        } catch (err) { toast.error(err.response?.data?.message || 'Email update failed') }
      }
    })
  }

  const changePassword = async () => {
    if (!curPwd)               { toast.error('Enter your current password.'); return }
    if (newPwd.length < 6)     { toast.error('New password must be at least 6 characters.'); return }
    if (newPwd !== confPwd)    { toast.error('Passwords do not match.'); return }
    setSavingPwd(true)
    try {
      if (DEMO_MODE) { await new Promise(r => setTimeout(r, 600)) }
      else await api.put('/users/me/password', { currentPassword: curPwd, newPassword: newPwd })
      toast.success('Password changed successfully.')
      setCurPwd(''); setNewPwd(''); setConfPwd('')
    } catch (err) { toast.error(err.response?.data?.message || 'Password change failed') }
    finally { setSavingPwd(false) }
  }

  const tabs = [
    { id:'profile',  label:'Profile' },
    { id:'email',    label:'Email & Security' },
    { id:'password', label:'Password' },
  ]

  return (
    <AppLayout title="Account Settings">
      <div className="page-header">
        <div className="page-title">Account Settings</div>
        <div className="page-sub">Manage your profile, email and security</div>
      </div>

      <div style={{ maxWidth:640 }}>
        <div className="tab-bar" style={{ marginBottom:24 }}>
          {tabs.map(t => (
            <button key={t.id} className={`tab-btn${activeTab === t.id ? ' active' : ''}`}
              onClick={() => setActiveTab(t.id)}>
              {t.label}
            </button>
          ))}
        </div>

        {activeTab === 'profile' && (
          <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
            <div className="card" style={{ padding:20 }}>
              <div style={{ fontSize:13, fontWeight:500, color:'var(--text)', marginBottom:16 }}>Profile Picture</div>
              <div style={{ display:'flex', alignItems:'center', gap:16 }}>
                <div style={{
                  width:72, height:72, borderRadius:'50%', overflow:'hidden',
                  background:'var(--accent-dim)', border:'2px solid var(--accent-border)',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  color:'var(--accent)', fontFamily:'var(--mono)', fontSize:24, fontWeight:600,
                  flexShrink:0,
                }}>
                  {profilePic
                    ? <img src={profilePic} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                    : user?.username?.[0]?.toUpperCase()
                  }
                </div>
                <div>
                  <button className="btn btn-ghost btn-sm" onClick={() => fileRef.current?.click()} style={{ marginBottom:6 }}>
                    Upload photo
                  </button>
                  {profilePic && (
                    <button className="btn btn-ghost btn-sm" style={{ marginLeft:6, color:'var(--red)' }}
                      onClick={() => {
                        setProfilePic(null)
                        updateUser({ profilePic: null })
                        toast.success('Picture removed.')
                      }}>
                      Remove
                    </button>
                  )}
                  <div style={{ color:'var(--text-3)', fontSize:11, marginTop:4 }}>JPG, PNG or GIF · max 2 MB</div>
                </div>
                <input ref={fileRef} type="file" accept="image/*" style={{ display:'none' }} onChange={handleAvatarChange} />
              </div>
            </div>

            <div className="card" style={{ padding:20 }}>
              <div style={{ fontSize:13, fontWeight:500, color:'var(--text)', marginBottom:16 }}>Personal Details</div>
              <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                <div className="field">
                  <label>Full Name</label>
                  <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Your full name" />
                </div>
                <div className="field">
                  <label>Username</label>
                  <input type="text" value={user?.username || ''} disabled
                    style={{ opacity:.5, cursor:'not-allowed' }} />
                  <div style={{ color:'var(--text-3)', fontSize:11, marginTop:2 }}>Username cannot be changed.</div>
                </div>
              </div>
              <div style={{ marginTop:16 }}>
                <button className="btn btn-primary" onClick={saveProfile} disabled={savingProfile}>
                  {savingProfile && <span className="spinner" />}
                  {savingProfile ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'email' && (
          <div className="card" style={{ padding:20 }}>
            <div style={{ fontSize:13, fontWeight:500, color:'var(--text)', marginBottom:16 }}>Email Address</div>

            <div style={{ background:'var(--raised)', border:'1px solid var(--border)', borderRadius:'var(--r)', padding:'10px 12px', marginBottom:16, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <span style={{ color:'var(--text)', fontSize:13 }}>{email}</span>
              <span style={{ background:'var(--green-dim)', color:'var(--green)', fontSize:10, fontWeight:500, padding:'2px 8px', borderRadius:4 }}>Current</span>
            </div>

            <div style={{ fontSize:13, fontWeight:500, color:'var(--text)', marginBottom:12 }}>Change Email</div>
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              <div className="field">
                <label>New Email Address</label>
                <input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="new@example.com" />
              </div>
              <div style={{ color:'var(--text-3)', fontSize:12, lineHeight:1.5 }}>
                A 6-digit verification code will be sent to your new email address to confirm the change.
              </div>
              <button className="btn btn-primary" onClick={requestEmailChange} style={{ alignSelf:'flex-start' }}>
                Send Verification Code
              </button>
            </div>
          </div>
        )}

        {activeTab === 'password' && (
          <div className="card" style={{ padding:20 }}>
            <div style={{ fontSize:13, fontWeight:500, color:'var(--text)', marginBottom:16 }}>Change Password</div>
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              <div className="field">
                <label>Current Password</label>
                <input type="password" value={curPwd} onChange={e => setCurPwd(e.target.value)} placeholder="••••••••" />
              </div>
              <div className="field">
                <label>New Password</label>
                <input type="password" value={newPwd} onChange={e => setNewPwd(e.target.value)} placeholder="Min 6 characters" />
              </div>
              <div className="field">
                <label>Confirm New Password</label>
                <input type="password" value={confPwd} onChange={e => setConfPwd(e.target.value)} placeholder="Repeat new password" />
              </div>
              {newPwd && confPwd && newPwd !== confPwd && (
                <div style={{ color:'var(--red)', fontSize:12 }}>Passwords do not match.</div>
              )}
            </div>
            <div style={{ marginTop:16 }}>
              <button className="btn btn-primary" onClick={changePassword} disabled={savingPwd}>
                {savingPwd && <span className="spinner" />}
                {savingPwd ? 'Updating…' : 'Update Password'}
              </button>
            </div>
          </div>
        )}
      </div>

      {otpTarget && (
        <OtpModal
          email={otpTarget.email}
          generatedOtp={otpTarget.otp}
          onVerified={otpTarget.onVerified}
          onClose={() => setOtpTarget(null)}
        />
      )}
    </AppLayout>
  )
}
