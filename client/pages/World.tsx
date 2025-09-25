import React from 'react'
import GameLayout from '../components/GameLayout'
import { useRequireGameSession } from '../hooks/useRequireGameSession'
import { useNavigate } from 'react-router-dom'

type ActiveCharacter = { id: number; name: string }

export default function WorldPage() {
  useRequireGameSession()
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const character = React.useMemo<ActiveCharacter | null>(() => {
    const raw = localStorage.getItem('activeCharacter')
    if (!raw) return null
    try {
      const parsed = JSON.parse(raw) as ActiveCharacter
      if (typeof parsed?.id === 'number' && typeof parsed?.name === 'string') return parsed
    } catch {}
    return null
  }, [])

  const handleStartCombat = React.useCallback(async () => {
    setError(null)
    const token = localStorage.getItem('token')
    const rawActive = localStorage.getItem('activeCharacter')
    if (!token || !rawActive) {
      navigate('/characters')
      return
    }

    let characterId: number | null = null
    try {
      const parsed = JSON.parse(rawActive) as { id?: number }
      if (typeof parsed?.id === 'number') characterId = parsed.id
    } catch {}

    if (!characterId) {
      navigate('/characters')
      return
    }

    setIsLoading(true)
    try {
      const res = await fetch('/api/combat/random', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ characterId }),
      })

      const payload = await res.json().catch(() => null)
      if (!res.ok || !payload || typeof payload.combatId !== 'number') {
        const message =
          payload && typeof payload.error === 'string'
            ? payload.error
            : 'Combat could not be created.'
        throw new Error(message)
      }

      localStorage.setItem('activeCombatId', String(payload.combatId))
      navigate(`/combat/${payload.combatId}`)
    } catch (err: any) {
      setError(err?.message ?? 'Combat could not be created.')
    } finally {
      setIsLoading(false)
    }
  }, [navigate])

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
        <section style={panelSection}>
          <div style={ctaCard}>
            <h2 style={{ margin: '0 0 8px' }}>PvE encounter</h2>
            <p style={description}>
              Generate a random duel on an 8×8 grid. You face one enemy, each round select a single action (move,
              attack, Spell 1, defend, wait).
            </p>
            <ul style={ruleList}>
              <li>Attack deals ceil(1.5×STR) damage with slight variance.</li>
              <li>Spell 1: range 3, damage 2×INT, costs 5 mana, cooldown 2 rounds.</li>
              <li>Defend halves incoming damage until the end of the round.</li>
              <li>Victory when the opponent reaches 0 HP; defeat if you drop to 0 HP.</li>
            </ul>
            <p style={description}>AI prioritises spells, then melee, moves closer, defends when low, otherwise waits.</p>
            {error && <p style={errorText}>{error}</p>}
            <button
              type="button"
              onClick={handleStartCombat}
              style={{ ...primaryButton, opacity: isLoading ? 0.7 : 1 }}
              disabled={isLoading}
            >
              {isLoading ? 'Preparing combat...' : 'Start random combat'}
            </button>
          </div>
        </section>
      </div>
    </GameLayout>
  )
}

const worldContainer: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 24, flex: 1 }
const header: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'center' }
const panelSection: React.CSSProperties = { flex: 1, display: 'flex' }
const ctaCard: React.CSSProperties = {
  flex: 1,
  borderRadius: 12,
  padding: 24,
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.08)',
}
const description: React.CSSProperties = { margin: 0, color: 'rgba(255,255,255,0.75)' }
const ruleList: React.CSSProperties = {
  margin: 0,
  paddingLeft: 18,
  display: 'grid',
  gap: 4,
  color: 'rgba(255,255,255,0.75)',
}
const primaryButton: React.CSSProperties = {
  background: '#3498db',
  color: '#fff',
  border: 'none',
  padding: '12px 18px',
  borderRadius: 8,
  cursor: 'pointer',
  fontWeight: 600,
  maxWidth: 220,
}
const errorText: React.CSSProperties = { margin: 0, color: '#ff6b6b' }
