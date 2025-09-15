import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

export default function CharactersPage() {
  const [items, setItems] = useState<Array<{ id: string | number; name: string; level: number; ancestryId: string | number }>>([])
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      navigate('/login')
      return
    }
    ;(async () => {
      try {
        const res = await fetch('/api/characters', {
          headers: { Authorization: `Bearer ${token}` },
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data?.error || 'Failed to load characters')
        setItems(data.items ?? [])
      } catch (e: any) {
        setError(e.message)
      }
    })()
  }, [navigate])

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    const token = localStorage.getItem('token')
    if (!token) return navigate('/login')
    try {
      setLoading(true)
      const res = await fetch('/api/characters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Failed to create character')
      setItems((prev) => [data.item, ...prev])
      setName('')
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const onLogout = () => {
    localStorage.removeItem('token')
    navigate('/login')
  }

  return (
    <div style={container}>
      <h1>Character Selection / Creation</h1>
      <div style={{ display: 'grid', gap: 12, minWidth: 360 }}>
        <section>
          <h2>My Characters</h2>
          {items.length === 0 ? (
            <p>No characters yet.</p>
          ) : (
            <ul>
              {items.map((c) => (
                <li key={String(c.id)}>
                  {c.name} (lvl {c.level})
                </li>
              ))}
            </ul>
          )}
        </section>
        <section>
          <h2>Create New</h2>
          <form onSubmit={onCreate} style={{ display: 'flex', gap: 8 }}>
            <input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} required />
            <button type="submit" disabled={loading}>{loading ? 'Creating…' : 'Create'}</button>
          </form>
        </section>
        {error && <div style={{ color: 'crimson' }}>{error}</div>}
        <button onClick={onLogout}>Log out</button>
      </div>
    </div>
  )
}

const container: React.CSSProperties = { display: 'grid', placeItems: 'center', height: '100vh', gap: 8, fontFamily: 'system-ui, sans-serif' }
