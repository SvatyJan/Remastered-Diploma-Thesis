import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import GameLayout from '../components/GameLayout'
import { useRequireGameSession } from '../hooks/useRequireGameSession'

type ProfessionRecord = { id: number; name: string; description: string | null }

export default function ProfessionPage() {
  useRequireGameSession()
  const { id } = useParams<{ id?: string }>()
  const navigate = useNavigate()
  const [profession, setProfession] = useState<ProfessionRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const rawId = Number(id)
    if (!Number.isInteger(rawId) || rawId <= 0) {
      setError('Invalid profession reference.')
      setLoading(false)
      return
    }

    const token = localStorage.getItem('token')
    if (!token) {
      setError('Missing session token')
      setLoading(false)
      return
    }

    let cancelled = false
    ;(async () => {
      try {
        setError(null)
        const res = await fetch('/api/professions', { headers: { Authorization: `Bearer ${token}` } })
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data?.error ?? 'Failed to load professions')
        }
        const payload = await res.json()
        const list = parseProfessionDefinitions(payload?.items ?? [])
        const found = list.find((entry) => entry.id === rawId) ?? null
        if (!cancelled) {
          if (!found) setError('Profession not found.')
          setProfession(found)
        }
      } catch (err: any) {
        if (!cancelled) setError(err?.message ?? 'Failed to load profession')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [id])

  const handleBack = () => {
    navigate(-1)
  }

  return (
    <GameLayout>
      <div style={pageShell}>
        <header style={header}>
          <button type="button" style={backButton} onClick={handleBack}>
            Back
          </button>
          <h1 style={title}>{profession?.name ?? 'Profession'}</h1>
        </header>

        {loading ? (
          <div style={card}><p>Loading profession...</p></div>
        ) : error ? (
          <div style={{ ...card, color: '#fca5a5' }}>{error}</div>
        ) : profession ? (
          <section style={card}>
            <p style={tagline}>Crafting content for this profession is coming soon.</p>
            {profession.description && <p style={description}>{profession.description}</p>}
            <div style={placeholder}>Placeholder crafting interface for {profession.name}</div>
          </section>
        ) : (
          <div style={card}><p>Profession data not available.</p></div>
        )}
      </div>
    </GameLayout>
  )
}

function parseProfessionDefinitions(raw: any): ProfessionRecord[] {
  if (!Array.isArray(raw)) return []
  const result: ProfessionRecord[] = []
  for (const entry of raw) {
    const id = Number(entry?.id ?? 0)
    if (!Number.isFinite(id) || id <= 0) continue
    result.push({
      id,
      name: String(entry?.name ?? 'Unknown'),
      description:
        entry?.description === undefined
          ? null
          : entry.description === null
          ? null
          : String(entry.description),
    })
  }
  return result
}

const pageShell: React.CSSProperties = {
  display: 'grid',
  gap: 24,
  padding: '24px 16px',
  color: '#e5e7eb',
}

const header: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 16,
}

const backButton: React.CSSProperties = {
  padding: '8px 14px',
  borderRadius: 10,
  border: '1px solid rgba(148,163,184,0.4)',
  background: 'rgba(15,18,24,0.8)',
  color: '#cbd5f5',
  cursor: 'pointer',
}

const title: React.CSSProperties = { margin: 0, fontSize: 28, fontWeight: 600 }

const card: React.CSSProperties = {
  borderRadius: 16,
  border: '1px solid rgba(59,130,246,0.25)',
  background: 'rgba(15,18,24,0.75)',
  padding: 24,
  boxShadow: '0 16px 40px rgba(0,0,0,0.35)',
  display: 'grid',
  gap: 16,
}

const tagline: React.CSSProperties = { margin: 0, fontSize: 16, color: '#bfdbfe' }
const description: React.CSSProperties = { margin: 0, color: '#cbd5f5' }
const placeholder: React.CSSProperties = {
  padding: '40px 16px',
  borderRadius: 12,
  background: 'rgba(37,99,235,0.15)',
  border: '1px dashed rgba(37,99,235,0.35)',
  textAlign: 'center',
  color: '#bfdbfe',
}
