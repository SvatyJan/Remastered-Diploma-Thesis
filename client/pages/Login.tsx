import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

export default function LoginPage() {
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Login failed')
      navigate('/characters')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={container}>
      <h1>Login</h1>
      <form onSubmit={onSubmit} style={form}>
        <label>
          Username or Email
          <input value={identifier} onChange={(e) => setIdentifier(e.target.value)} required />
        </label>
        <label>
          Password
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>
        {error && <div style={errorBox}>{error}</div>}
        <button type="submit" disabled={loading}>
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
      <p>
        Nemáš účet? <Link to="/register">Zaregistruj se</Link>
      </p>
    </div>
  )
}

const container: React.CSSProperties = { display: 'grid', placeItems: 'center', height: '100vh', gap: 12, fontFamily: 'system-ui, sans-serif' }
const form: React.CSSProperties = { display: 'grid', gap: 8, minWidth: 320 }
const errorBox: React.CSSProperties = { color: 'crimson', background: '#fee', padding: 8, borderRadius: 6 }

