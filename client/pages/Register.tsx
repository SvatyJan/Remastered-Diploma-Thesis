import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

export default function RegisterPage() {
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [passwordAgain, setPasswordAgain] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setOk(null)
    if (password !== passwordAgain) {
      setError('Passwords do not match')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, username, password, passwordAgain }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Registration failed')
      setOk('Registration successful. You can log in now.')
      setTimeout(() => navigate('/login'), 800)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={container}>
      <h1>Register</h1>
      <form onSubmit={onSubmit} style={form}>
        <label>
          Email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label>
          Username
          <input value={username} onChange={(e) => setUsername(e.target.value)} required />
        </label>
        <label>
          Password
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>
        <label>
          Password again
          <input type="password" value={passwordAgain} onChange={(e) => setPasswordAgain(e.target.value)} required />
        </label>
        {error && <div style={errorBox}>{error}</div>}
        {ok && <div style={okBox}>{ok}</div>}
        <button type="submit" disabled={loading}>
          {loading ? 'Creating…' : 'Create account'}
        </button>
      </form>
      <p>
        Máš účet? <Link to="/login">Přihlas se</Link>
      </p>
    </div>
  )
}

const container: React.CSSProperties = { display: 'grid', placeItems: 'center', height: '100vh', gap: 12, fontFamily: 'system-ui, sans-serif' }
const form: React.CSSProperties = { display: 'grid', gap: 8, minWidth: 320 }
const errorBox: React.CSSProperties = { color: 'crimson', background: '#fee', padding: 8, borderRadius: 6 }
const okBox: React.CSSProperties = { color: 'green', background: '#efe', padding: 8, borderRadius: 6 }

