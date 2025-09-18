import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

type Ancestry = { id: number; name: string; description: string | null }

type FetchState = 'idle' | 'loading' | 'error'

enum SubmitState {
  Idle = 'idle',
  Submitting = 'submitting',
}

export default function CreateCharacterPage() {
  const [ancestries, setAncestries] = useState<Ancestry[]>([])
  const [selectedAncestryId, setSelectedAncestryId] = useState<number | null>(null)
  const [name, setName] = useState('')
  const [fetchState, setFetchState] = useState<FetchState>('loading')
  const [error, setError] = useState<string | null>(null)
  const [submitState, setSubmitState] = useState<SubmitState>(SubmitState.Idle)
  const navigate = useNavigate()

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      navigate('/login')
      return
    }
    ;(async () => {
      try {
        setFetchState('loading')
        const res = await fetch('/api/ancestries', {
          headers: { Authorization: `Bearer ${token}` },
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data?.error || 'Failed to load ancestries')
        const items: Ancestry[] = (data.items ?? []).map(parseAncestry)
        setAncestries(items)
        setSelectedAncestryId(items.length > 0 ? items[0].id : null)
        setFetchState('idle')
        setError(null)
      } catch (e: any) {
        setFetchState('error')
        setError(e.message ?? 'Failed to load ancestries')
      }
    })()
  }, [navigate])

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)
    const token = localStorage.getItem('token')
    if (!token) return navigate('/login')
    if (!selectedAncestryId) {
      setError('Please choose an ancestry.')
      return
    }
    try {
      setSubmitState(SubmitState.Submitting)
      const res = await fetch('/api/characters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name, ancestryId: selectedAncestryId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Failed to create character')
      navigate('/characters')
    } catch (e: any) {
      setError(e.message ?? 'Failed to create character')
    } finally {
      setSubmitState(SubmitState.Idle)
    }
  }

  const disableSubmit = submitState === SubmitState.Submitting || fetchState === 'loading'

  return (
    <div style={container}>
      <div style={panel}>
        <h1>New Character</h1>
        {fetchState === 'loading' && <p>Loading ancestries...</p>}
        {fetchState === 'error' && <p style={{ color: 'crimson' }}>{error}</p>}
        {fetchState === 'idle' && ancestries.length === 0 && <p>No ancestries available.</p>}
        {fetchState === 'idle' && ancestries.length > 0 && (
          <form onSubmit={onSubmit} style={form}>
            <label style={label}>
              Character name
              <input value={name} onChange={(e) => setName(e.target.value)} required />
            </label>
            <fieldset style={fieldset}>
              <legend>Choose ancestry</legend>
              <div style={{ display: 'grid', gap: 8 }}>
                {ancestries.map((ancestry) => (
                  <label key={ancestry.id} style={ancestryRow}>
                    <input
                      type="radio"
                      name="ancestry"
                      value={ancestry.id}
                      checked={selectedAncestryId === ancestry.id}
                      onChange={(e) => setSelectedAncestryId(Number(e.target.value))}
                      required
                    />
                    <div>
                      <div style={{ fontWeight: 600 }}>{ancestry.name}</div>
                      {ancestry.description && <div style={{ fontSize: 12 }}>{ancestry.description}</div>}
                    </div>
                  </label>
                ))}
              </div>
            </fieldset>
            {fetchState === 'idle' && error && <div style={{ color: 'crimson' }}>{error}</div>}
            <div style={actions}>
              <button type="submit" disabled={disableSubmit}>
                {submitState === SubmitState.Submitting ? 'Creating...' : 'Create character'}
              </button>
              <Link to="/characters">Back</Link>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

function parseAncestry(raw: any): Ancestry {
  return {
    id: Number(raw?.id ?? 0),
    name: String(raw?.name ?? ''),
    description: raw?.description ?? null,
  }
}

const container: React.CSSProperties = { display: 'grid', placeItems: 'center', minHeight: '100vh', padding: 24, background: '#f4f5f6', fontFamily: 'system-ui, sans-serif' }
const panel: React.CSSProperties = { background: '#fff', padding: 24, borderRadius: 12, minWidth: 360, boxShadow: '0 12px 24px rgba(15, 23, 42, 0.12)', display: 'grid', gap: 16 }
const form: React.CSSProperties = { display: 'grid', gap: 16 }
const label: React.CSSProperties = { display: 'grid', gap: 6 }
const fieldset: React.CSSProperties = { border: '1px solid #ddd', borderRadius: 8, padding: 12, display: 'grid', gap: 12 }
const ancestryRow: React.CSSProperties = { display: 'flex', gap: 12, alignItems: 'flex-start' }
const actions: React.CSSProperties = { display: 'flex', gap: 12, alignItems: 'center' }

