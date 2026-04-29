import { useState } from 'react'
import { auth, googleProvider } from '../firebase'
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  updateProfile
} from 'firebase/auth'

export default function Login({ onLogin }) {
  const [mode, setMode] = useState('signin')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleEmailAuth() {
    if (!email || !password) { setError('Please fill in all fields'); return }
    if (mode === 'signup' && !name) { setError('Please enter your name'); return }
    setLoading(true)
    setError('')
    try {
      if (mode === 'signup') {
        const result = await createUserWithEmailAndPassword(auth, email, password)
        await updateProfile(result.user, { displayName: name })
        onLogin(result.user)
      } else {
        const result = await signInWithEmailAndPassword(auth, email, password)
        onLogin(result.user)
      }
    } catch (err) {
      setError(err.message.replace('Firebase: ', '').replace(/\(auth.*\)/, ''))
    }
    setLoading(false)
  }

  async function handleGoogle() {
    setLoading(true)
    setError('')
    try {
      const result = await signInWithPopup(auth, googleProvider)
      onLogin(result.user)
    } catch (err) {
      setError(err.message.replace('Firebase: ', '').replace(/\(auth.*\)/, ''))
    }
    setLoading(false)
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--g1)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', padding: 24 }}>

      {/* Logo */}
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{ fontFamily: 'Bebas Neue', fontSize: 48,
          color: '#4db87a', letterSpacing: 2 }}>⛳ Eagle AI</div>
        <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>
          Your tour-level caddie
        </div>
      </div>

      {/* Card */}
      <div style={{ background: '#fff', borderRadius: 16, padding: 24,
        width: '100%', maxWidth: 380 }}>

        {/* Toggle */}
        <div style={{ display: 'flex', background: 'var(--bg2)',
          borderRadius: 10, padding: 4, marginBottom: 20 }}>
          {['signin', 'signup'].map(m => (
            <button key={m} onClick={() => { setMode(m); setError('') }}
              style={{ flex: 1, border: 'none', borderRadius: 8,
                padding: '8px', cursor: 'pointer', fontWeight: 600,
                fontSize: 13,
                background: mode === m ? '#fff' : 'transparent',
                color: mode === m ? 'var(--tx)' : 'var(--tx2)',
                boxShadow: mode === m ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}>
              {m === 'signin' ? 'Sign In' : 'Sign Up'}
            </button>
          ))}
        </div>

        {/* Name field (signup only) */}
        {mode === 'signup' && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--tx2)',
              marginBottom: 6 }}>Name</div>
            <input value={name} onChange={e => setName(e.target.value)}
              placeholder="Your name"
              style={{ width: '100%', border: '1px solid var(--bd)',
                borderRadius: 8, padding: '10px 12px', fontSize: 14,
                color: 'var(--tx)', boxSizing: 'border-box' }} />
          </div>
        )}

        {/* Email */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--tx2)',
            marginBottom: 6 }}>Email</div>
          <input value={email} onChange={e => setEmail(e.target.value)}
            placeholder="you@example.com" type="email"
            style={{ width: '100%', border: '1px solid var(--bd)',
              borderRadius: 8, padding: '10px 12px', fontSize: 14,
              color: 'var(--tx)', boxSizing: 'border-box' }} />
        </div>

        {/* Password */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--tx2)',
            marginBottom: 6 }}>Password</div>
          <input value={password} onChange={e => setPassword(e.target.value)}
            placeholder="••••••••" type="password"
            onKeyDown={e => e.key === 'Enter' && handleEmailAuth()}
            style={{ width: '100%', border: '1px solid var(--bd)',
              borderRadius: 8, padding: '10px 12px', fontSize: 14,
              color: 'var(--tx)', boxSizing: 'border-box' }} />
        </div>

        {/* Error */}
        {error && (
          <div style={{ background: '#fee2e2', borderRadius: 8,
            padding: '10px 12px', marginBottom: 12,
            fontSize: 13, color: '#991b1b' }}>
            {error}
          </div>
        )}

        {/* Email button */}
        <button onClick={handleEmailAuth} disabled={loading}
          style={{ width: '100%', background: 'var(--g1)', color: '#fff',
            border: 'none', borderRadius: 10, padding: '12px',
            fontWeight: 700, fontSize: 15, cursor: 'pointer',
            marginBottom: 12, opacity: loading ? 0.7 : 1 }}>
          {loading ? 'Loading...' : mode === 'signin' ? 'Sign In' : 'Create Account'}
        </button>

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12,
          marginBottom: 12 }}>
          <div style={{ flex: 1, height: 1, background: 'var(--bd)' }} />
          <div style={{ fontSize: 12, color: 'var(--tx2)' }}>or</div>
          <div style={{ flex: 1, height: 1, background: 'var(--bd)' }} />
        </div>

        {/* Google button */}
        <button onClick={handleGoogle} disabled={loading}
          style={{ width: '100%', background: '#fff', color: 'var(--tx)',
            border: '1px solid var(--bd)', borderRadius: 10, padding: '12px',
            fontWeight: 600, fontSize: 14, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: 10, opacity: loading ? 0.7 : 1 }}>
          <svg width="18" height="18" viewBox="0 0 48 48">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            <path fill="none" d="M0 0h48v48H0z"/>
          </svg>
          Continue with Google
        </button>
      </div>

      <div style={{ marginTop: 20, fontSize: 12,
        color: 'rgba(255,255,255,0.3)', textAlign: 'center' }}>
        Eagle AI · Your tour-level caddie
      </div>
    </div>
  )
}