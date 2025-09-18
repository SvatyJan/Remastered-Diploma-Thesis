import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

type Character = { id: number; name: string; level: number; ancestryId: number }

export default function CharactersPage() {
  const [items, setItems] = useState<Character[]>([])
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [removingId, setRemovingId] = useState<number | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      navigate('/login')
      return
    }
    ;(async () => {
      try {
        setError(null)
        const res = await fetch('/api/characters', {
          headers: { Authorization: `Bearer ${token}` },
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data?.error || 'Failed to load characters')
        const normalized: Character[] = (data.items ?? []).map(parseCharacter)
        setItems(normalized)
      } catch (e: any) {
        setError(e.message ?? 'Failed to load characters')
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
      const created = parseCharacter(data.item)
      setItems((prev) => [created, ...prev])
      setName('')
    } catch (e: any) {
      setError(e.message ?? 'Failed to create character')
    } finally {
      setLoading(false)
    }
  }

  const onPlay = (character: Character) => {
    localStorage.setItem(
      'activeCharacter',
      JSON.stringify({ id: character.id, name: character.name })
    )
    navigate('/world')
  }

  const onDelete = async (character: Character) => {
    if (!window.confirm(`Opravdu chces smazat ${character.name}?`)) return
    setError(null)
    const token = localStorage.getItem('token')
    if (!token) return navigate('/login')
    try {
      setRemovingId(character.id)
      const res = await fetch(`/api/characters/${character.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok && res.status !== 204) {
        let message = 'Failed to delete character'
        try {
          const data = await res.json()
          message = data?.error || message
        } catch {}
        throw new Error(message)
      }
      setItems((prev) => prev.filter((item) => item.id !== character.id))
      const active = localStorage.getItem('activeCharacter')
      if (active) {
        try {
          const parsed = JSON.parse(active)
          if (Number(parsed?.id) === character.id) localStorage.removeItem('activeCharacter')
        } catch {}
      }
    } catch (e: any) {
      setError(e.message ?? 'Failed to delete character')
    } finally {
      setRemovingId(null)
    }
  }

  const onLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('activeCharacter')
    navigate('/login')
  }

  return (
    <div style={container}>
      <h1>Character Selection / Creation</h1>
      <div style={panel}>
        <section>
          <h2>My Characters</h2>
          {items.length === 0 ? (
            <p>No characters yet.</p>
          ) : (
            <ul style={list}>
              {items.map((c) => (
                <li key={String(c.id)} style={listItem}>
                  <div>
                    <strong>{c.name}</strong> (lvl {c.level})
                  </div>
                  <div style={listActions}>
                    <button type="button" onClick={() => onPlay(c)}>Play</button>
                    <button
                      type="button"
                      onClick={() => onDelete(c)}
                      disabled={removingId === c.id}
                    >
                      {removingId === c.id ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section>
          <h2>Create New</h2>
          <form onSubmit={onCreate} style={{ display: 'flex', gap: 8 }}>
            <input
              placeholder="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create'}
            </button>
          </form>
        </section>
        {error && <div style={{ color: 'crimson' }}>{error}</div>}
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onLogout}>Log out</button>
          <Link to="/world">Go to world</Link>
        </div>
      </div>
    </div>
  )
}

function parseCharacter(raw: any): Character {
  return {
    id: Number(raw?.id ?? 0),
    name: String(raw?.name ?? ''),
    level: Number(raw?.level ?? 1),
    ancestryId: Number(raw?.ancestryId ?? 0),
  }
}

const container: React.CSSProperties = { display: 'grid', placeItems: 'center', height: '100vh', gap: 8, fontFamily: 'system-ui, sans-serif' }
const panel: React.CSSProperties = { display: 'grid', gap: 12, minWidth: 360 }
const list: React.CSSProperties = { listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 8 }
const listItem: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', border: '1px solid #ddd', borderRadius: 8 }
const listActions: React.CSSProperties = { display: 'flex', gap: 8 }

