import React from 'react'
import GameLayout from '../components/GameLayout'
import { useRequireGameSession } from '../hooks/useRequireGameSession'

type ActiveCharacter = { id: number; name: string }

export default function WorldPage() {
  useRequireGameSession()

  const character = React.useMemo<ActiveCharacter | null>(() => {
    const raw = localStorage.getItem('activeCharacter')
    if (!raw) return null
    try {
      const parsed = JSON.parse(raw) as ActiveCharacter
      if (typeof parsed?.id === 'number' && typeof parsed?.name === 'string') return parsed
    } catch {}
    return null
  }, [])

  return (
    <GameLayout>
      <div style={worldContainer}>
        <header style={header}>
          <h1>World</h1>
          {character && (
            <p>
              Playing as <strong>{character.name}</strong>
            </p>
          )}
        </header>
        <section style={mapSection}>
          <div style={mapPlaceholder}>World map placeholder</div>
        </section>
      </div>
    </GameLayout>
  )
}

const worldContainer: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 24, flex: 1 }
const header: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'center' }
const mapSection: React.CSSProperties = { flex: 1, display: 'flex' }
const mapPlaceholder: React.CSSProperties = {
  flex: 1,
  border: '2px dashed rgba(255,255,255,0.2)',
  borderRadius: 12,
  display: 'grid',
  placeItems: 'center',
  fontSize: 24,
  color: 'rgba(255,255,255,0.7)',
}
