import React from 'react'
import { useNavigate } from 'react-router-dom'
import GameLayout from '../components/GameLayout'
import { useRequireGameSession } from '../hooks/useRequireGameSession'

type BattleResponse = {
  character: { id: number; name: string; level: number }
  monster: { id: number; name: string; rarity: string; description: string | null; ancestry: string | null }
  rolls: { player: number; monster: number }
  outcome: 'win' | 'loss'
}

type BattleState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'success'; data: BattleResponse }

export default function BattlePage() {
  useRequireGameSession()
  const navigate = useNavigate()
  const [state, setState] = React.useState<BattleState>({ status: 'loading' })

  const beginBattle = React.useCallback(async () => {
    const token = localStorage.getItem('token')
    const rawActive = localStorage.getItem('activeCharacter')
    if (!token || !rawActive) {
      navigate('/characters')
      return
    }

    let activeId: number | null = null
    try {
      const parsed = JSON.parse(rawActive) as { id?: number }
      if (typeof parsed?.id === 'number') activeId = parsed.id
    } catch (err) {
      console.warn('Failed to parse activeCharacter', err)
    }

    if (!activeId) {
      navigate('/characters')
      return
    }

    setState({ status: 'loading' })

    try {
      const res = await fetch('/api/battles/random', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ characterId: activeId }),
      })

      const payload = (await res.json().catch(() => null)) as (BattleResponse & { error?: string }) | { error?: string } | null
      if (!res.ok) {
        const message = payload && 'error' in payload && payload.error ? payload.error : 'Souboj se nepodarilo spustit.'
        throw new Error(message)
      }
      if (!payload || !('character' in payload)) throw new Error('Neplatna odpoved serveru.')

      setState({ status: 'success', data: payload })
    } catch (err: any) {
      setState({ status: 'error', message: err?.message ?? 'Souboj se nepodarilo spustit.' })
    }
  }, [navigate])

  React.useEffect(() => {
    beginBattle()
  }, [beginBattle])

  const handleRetry = () => beginBattle()
  const handleReturn = () => navigate('/world')

  return (
    <GameLayout>
      <div style={container}>
        <header style={header}>
          <h1>Souboj s priserou</h1>
          <button type="button" onClick={handleReturn} style={secondaryButton}>
            Zpet do sveta
          </button>
        </header>
        {state.status === 'loading' && <p>Nacitam nahodneho protivnika...</p>}
        {state.status === 'error' && (
          <div style={panel}>
            <p>{state.message}</p>
            <button type="button" onClick={handleRetry} style={primaryButton}>
              Zkusit to znovu
            </button>
          </div>
        )}
        {state.status === 'success' && <BattleResult data={state.data} onRetry={handleRetry} />}
      </div>
    </GameLayout>
  )
}

type ResultProps = { data: BattleResponse; onRetry: () => void }

function BattleResult({ data, onRetry }: ResultProps) {
  const { character, monster, rolls, outcome } = data
  const outcomeLabel = outcome === 'win' ? 'Vyhral jsi!' : 'Byl jsi porazen.'
  const outcomeColor = outcome === 'win' ? '#2ecc71' : '#e74c3c'

  return (
    <section style={panel}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <h2 style={{ margin: 0 }}>{monster.name}</h2>
        <p style={{ margin: 0, color: 'rgba(255,255,255,0.7)' }}>
          {monster.ancestry ? `${monster.ancestry} - ${monster.rarity}` : monster.rarity}
        </p>
        {monster.description && <p style={{ margin: '8px 0 0' }}>{monster.description}</p>}
        <div style={rollsRow}>
          <div style={rollCard}>
            <h3 style={rollHeading}>{character.name}</h3>
            <p style={rollValue}>{rolls.player}</p>
          </div>
          <div style={rollCard}>
            <h3 style={rollHeading}>{monster.name}</h3>
            <p style={rollValue}>{rolls.monster}</p>
          </div>
        </div>
        <strong style={{ color: outcomeColor, fontSize: 20 }}>{outcomeLabel}</strong>
      </div>
      <button type="button" onClick={onRetry} style={{ ...primaryButton, alignSelf: 'flex-start' }}>
        Novy souboj
      </button>
    </section>
  )
}

const container: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 24, flex: 1 }
const header: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'center' }
const panel: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 16,
  padding: 24,
  background: 'rgba(255,255,255,0.04)',
  borderRadius: 12,
  maxWidth: 480,
}
const primaryButton: React.CSSProperties = {
  background: '#4b6cff',
  color: '#fff',
  border: 'none',
  padding: '10px 16px',
  borderRadius: 8,
  cursor: 'pointer',
  fontWeight: 600,
}
const secondaryButton: React.CSSProperties = {
  ...primaryButton,
  background: 'rgba(255,255,255,0.1)',
}
const rollsRow: React.CSSProperties = { display: 'flex', gap: 16 }
const rollCard: React.CSSProperties = {
  flex: 1,
  background: 'rgba(255,255,255,0.06)',
  padding: 16,
  borderRadius: 10,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 8,
}
const rollHeading: React.CSSProperties = { margin: 0, fontSize: 16, color: 'rgba(255,255,255,0.8)' }
const rollValue: React.CSSProperties = { margin: 0, fontSize: 32, fontWeight: 700 }
