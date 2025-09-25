import React from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import GameLayout from '../components/GameLayout'
import { useRequireGameSession } from '../hooks/useRequireGameSession'

type CombatParticipantDto = {
  id: number
  name: string
  team: number
  isAi: boolean
  position: { x: number; y: number }
  hp: number
  stats: Record<string, number> | null
  current: { hp: number; mana: number | null; position: { x: number; y: number } }
  initial: Record<string, unknown> | null
  actions: Record<string, { label?: string; description?: string; range?: number; manaCost?: number; cooldown?: number }> | null
  meta: Record<string, unknown> | null
}

type CombatSummary = {
  winner?: 'player' | 'enemy'
  totalRounds?: number
  rounds?: Array<{ round: number; log: string[] }>
  enemy?: { name?: string; rarity?: string }
} | null

type CombatDetails = {
  id: number
  status: string
  board: { width: number; height: number }
  currentRound: number
  currentTurnIndex: number
  participants: CombatParticipantDto[]
  playerTeam: number | null
  result: { winningTeam: number | null; summary: CombatSummary } | null
  originMeta: Record<string, unknown> | null
}

type CombatState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'success'; data: CombatDetails }

function normalizeCombatResponse(raw: any): CombatDetails {
  const participants: CombatParticipantDto[] = Array.isArray(raw?.participants)
    ? raw.participants.map((p: any) => {
        const position = p?.position ?? {}
        const current = p?.current ?? {}
        const posX = Number(position?.x ?? 0)
        const posY = Number(position?.y ?? 0)
        const currentPos =
          current?.position &&
          typeof current.position.x === 'number' &&
          typeof current.position.y === 'number'
            ? { x: Number(current.position.x), y: Number(current.position.y) }
            : { x: posX, y: posY }
        const stats =
          p?.stats && typeof p.stats === 'object' && !Array.isArray(p.stats) ? p.stats : null
        const actions =
          p?.actions && typeof p.actions === 'object' && !Array.isArray(p.actions) ? p.actions : null
        const meta =
          p?.meta && typeof p.meta === 'object' && !Array.isArray(p.meta) ? p.meta : null
        const initial =
          p?.initial && typeof p.initial === 'object' && !Array.isArray(p.initial) ? p.initial : null
        const manaValue = current?.mana
        let mana: number | null = null
        if (typeof manaValue === 'number') mana = manaValue
        else if (typeof manaValue === 'string' && manaValue.trim() !== '')
          mana = Number(manaValue)
        return {
          id: Number(p?.id ?? 0),
          name: String(p?.name ?? 'Unknown'),
          team: Number(p?.team ?? 0),
          isAi: Boolean(p?.isAi),
          position: { x: posX, y: posY },
          hp: Number(p?.hp ?? 0),
          stats,
          current: {
            hp: Number(current?.hp ?? p?.hp ?? 0),
            mana: Number.isFinite(mana) ? (mana as number) : null,
            position: currentPos,
          },
          initial,
          actions,
          meta,
        }
      })
    : []

  const summaryRaw = raw?.result?.summary
  let summary: CombatSummary = null
  if (summaryRaw && typeof summaryRaw === 'object' && !Array.isArray(summaryRaw)) {
    const rounds = Array.isArray(summaryRaw.rounds)
      ? summaryRaw.rounds.map((round: any) => ({
          round: Number(round?.round ?? 0),
          log: Array.isArray(round?.log)
            ? round.log.map((line: any) => String(line))
            : [],
        }))
      : undefined
    const winner =
      summaryRaw.winner === 'player' || summaryRaw.winner === 'enemy'
        ? summaryRaw.winner
        : undefined
    summary = {
      winner,
      totalRounds: typeof summaryRaw.totalRounds === 'number' ? summaryRaw.totalRounds : undefined,
      rounds,
      enemy:
        summaryRaw.enemy && typeof summaryRaw.enemy === 'object'
          ? {
              name: summaryRaw.enemy.name ?? undefined,
              rarity: summaryRaw.enemy.rarity ?? undefined,
            }
          : undefined,
    }
  }

  return {
    id: Number(raw?.id ?? 0),
    status: String(raw?.status ?? 'pending'),
    board: {
      width: Number(raw?.board?.width ?? 8),
      height: Number(raw?.board?.height ?? 8),
    },
    currentRound: Number(raw?.currentRound ?? 1),
    currentTurnIndex: Number(raw?.currentTurnIndex ?? 0),
    participants,
    playerTeam: raw?.playerTeam != null ? Number(raw.playerTeam) : null,
    result: raw?.result
      ? {
          winningTeam:
            raw.result.winningTeam != null ? Number(raw.result.winningTeam) : null,
          summary,
        }
      : null,
    originMeta:
      raw?.originMeta && typeof raw.originMeta === 'object' && !Array.isArray(raw.originMeta)
        ? (raw.originMeta as Record<string, unknown>)
        : null,
  }
}

export default function CombatPage() {
  useRequireGameSession()
  const { id } = useParams()
  const navigate = useNavigate()
  const [state, setState] = React.useState<CombatState>({ status: 'loading' })
  const [reloadToken, setReloadToken] = React.useState(0)

  const numericId = React.useMemo(() => {
    if (!id) return NaN
    const parsed = Number(id)
    return Number.isFinite(parsed) ? parsed : NaN
  }, [id])

  React.useEffect(() => {
    if (!Number.isFinite(numericId) || numericId <= 0) {
      setState({ status: 'error', message: 'Invalid combat id.' })
      return
    }

    const token = localStorage.getItem('token')
    if (!token) {
      navigate('/login')
      return
    }

    let ignore = false
    const load = async () => {
      setState({ status: 'loading' })
      try {
        const res = await fetch(`/api/combat/${numericId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
        const payload = await res.json().catch(() => null)
        if (!res.ok || !payload || typeof payload.id !== 'number') {
          const message =
            payload && typeof payload.error === 'string'
              ? payload.error
              : 'Combat data could not be loaded.'
          throw new Error(message)
        }
        if (ignore) return
        setState({ status: 'success', data: normalizeCombatResponse(payload) })
      } catch (err: any) {
        if (ignore) return
        setState({
          status: 'error',
          message: err?.message ?? 'Combat data could not be loaded.',
        })
      }
    }

    load()

    return () => {
      ignore = true
    }
  }, [navigate, numericId, reloadToken])

  React.useEffect(() => {
    if (state.status !== 'success') return
    if (state.data.status.toLowerCase() !== 'finished') return
    const stored = localStorage.getItem('activeCombatId')
    if (stored && Number(stored) === numericId) localStorage.removeItem('activeCombatId')
  }, [state, numericId])

  const handleRetry = React.useCallback(() => {
    setReloadToken((value) => value + 1)
  }, [])

  const handleReturn = React.useCallback(() => {
    navigate('/world')
  }, [navigate])

  const isFinished =
    state.status === 'success' && state.data.status.toLowerCase() === 'finished'
  const summary: CombatSummary = state.status === 'success' ? state.data.result?.summary ?? null : null

  const winnerLabel = React.useMemo(() => {
    if (state.status !== 'success') return 'Unknown'
    if (summary?.winner) return summary.winner === 'player' ? 'Player' : 'Enemy'
    const winningTeam = state.data.result?.winningTeam ?? null
    if (!winningTeam) return 'Unknown'
    return winningTeam === state.data.playerTeam ? 'Player' : 'Enemy'
  }, [state, summary])

  const enemyLabel = React.useMemo(() => {
    if (summary?.enemy?.name) {
      return summary.enemy.rarity
        ? `${summary.enemy.name} · ${summary.enemy.rarity}`
        : summary.enemy.name
    }
    const metaName = state.status === 'success'
      ? (state.data.originMeta?.monsterName as string | undefined)
      : undefined
    if (!metaName) return null
    const rarity = state.status === 'success'
      ? (state.data.originMeta?.monsterRarity as string | undefined)
      : undefined
    return rarity ? `${metaName} · ${rarity}` : metaName
  }, [state, summary])

  return (
    <GameLayout>
      <div style={layout}>
        <header style={header}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <h1 style={{ margin: 0 }}>Combat</h1>
            {state.status === 'success' && (
              <p style={statusLine}>
                Status: <strong>{state.data.status}</strong> · Board {state.data.board.width}×
                {state.data.board.height} · Round {state.data.currentRound}
              </p>
            )}
            {enemyLabel && <p style={statusLine}>Opponent: {enemyLabel}</p>}
            {summary?.totalRounds != null && (
              <p style={statusLine}>Total rounds: {summary.totalRounds}</p>
            )}
            {state.status === 'success' && (
              <p style={statusLine}>Winner: {winnerLabel}</p>
            )}
          </div>
          <div style={headerActions}>
            <button type='button' onClick={handleRetry} style={secondaryButton}>
              Refresh
            </button>
            <button
              type='button'
              onClick={handleReturn}
              style={{ ...primaryButton, opacity: isFinished ? 1 : 0.6 }}
              disabled={!isFinished}
            >
              Back to world
            </button>
          </div>
        </header>

        {state.status === 'loading' && <p>Loading combat...</p>}

        {state.status === 'error' && (
          <div style={panel}>
            <p>{state.message}</p>
            <button type='button' onClick={handleRetry} style={primaryButton}>
              Try again
            </button>
          </div>
        )}

        {state.status === 'success' && (
          <>
            <section style={participantsSection}>
              {state.data.participants.map((participant) => {
                const stats = participant.stats ?? {}
                const hpMax = typeof stats.hpMax === 'number' ? stats.hpMax : null
                const manaMax = typeof stats.manaMax === 'number' ? stats.manaMax : null
                return (
                  <div key={participant.id} style={participantCard}>
                    <h2 style={participantName}>{participant.name}</h2>
                    <p style={participantMeta}>
                      Team {participant.team} · {participant.isAi ? 'AI' : 'Player'}
                    </p>
                    <p style={statLine}>
                      HP {participant.current.hp}
                      {hpMax != null ? ` / ${hpMax}` : ''}
                    </p>
                    {participant.current.mana != null && (
                      <p style={statLine}>
                        Mana {participant.current.mana}
                        {manaMax != null ? ` / ${manaMax}` : ''}
                      </p>
                    )}
                    <div style={statBlock}>
                      <span>STR {stats.str ?? '?'}</span>
                      <span>AGI {stats.agi ?? '?'}</span>
                      <span>INT {stats.int ?? '?'}</span>
                      <span>SPD {stats.spd ?? '?'}</span>
                    </div>
                    <p style={statLine}>
                      Position ({participant.position.x + 1}, {participant.position.y + 1})
                    </p>
                    {participant.meta && participant.meta.description && (
                      <p style={metaLine}>{String(participant.meta.description)}</p>
                    )}
                  </div>
                )
              })}
            </section>

            <section style={logSection}>
              <h2 style={sectionHeading}>Round log</h2>
              {summary?.rounds && summary.rounds.length ? (
                <div style={logList}>
                  {summary.rounds.map((round) => (
                    <div key={round.round} style={roundCard}>
                      <strong>Round {round.round}</strong>
                      <ul style={roundLogList}>
                        {round.log.map((line, index) => (
                          <li key={index}>{line}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              ) : (
                <p>No combat log available.</p>
              )}
            </section>
          </>
        )}
      </div>
    </GameLayout>
  )
}

const layout: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 24 }
const header: React.CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  gap: 16,
}
const headerActions: React.CSSProperties = { display: 'flex', gap: 12 }
const primaryButton: React.CSSProperties = {
  background: '#2ecc71',
  border: 'none',
  padding: '10px 16px',
  borderRadius: 8,
  color: '#0b0d11',
  cursor: 'pointer',
  fontWeight: 600,
}
const secondaryButton: React.CSSProperties = {
  background: 'rgba(255,255,255,0.08)',
  border: '1px solid rgba(255,255,255,0.2)',
  padding: '10px 16px',
  borderRadius: 8,
  color: '#f5f5f5',
  cursor: 'pointer',
}
const panel: React.CSSProperties = {
  background: 'rgba(255,255,255,0.05)',
  borderRadius: 12,
  padding: 24,
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
  maxWidth: 480,
}
const statusLine: React.CSSProperties = { margin: 0, color: 'rgba(255,255,255,0.7)' }
const participantsSection: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
  gap: 20,
}
const participantCard: React.CSSProperties = {
  background: 'rgba(255,255,255,0.04)',
  borderRadius: 12,
  padding: 20,
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
  border: '1px solid rgba(255,255,255,0.08)',
}
const participantName: React.CSSProperties = { margin: 0 }
const participantMeta: React.CSSProperties = { margin: 0, color: 'rgba(255,255,255,0.6)' }
const statLine: React.CSSProperties = { margin: 0, color: 'rgba(255,255,255,0.85)' }
const statBlock: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  gap: 4,
  fontSize: 14,
  color: 'rgba(255,255,255,0.75)',
}
const metaLine: React.CSSProperties = { margin: 0, color: 'rgba(255,255,255,0.6)', fontStyle: 'italic' }
const logSection: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
}
const sectionHeading: React.CSSProperties = { margin: 0 }
const logList: React.CSSProperties = {
  display: 'grid',
  gap: 12,
}
const roundCard: React.CSSProperties = {
  background: 'rgba(255,255,255,0.04)',
  borderRadius: 10,
  padding: 16,
  border: '1px solid rgba(255,255,255,0.08)',
}
const roundLogList: React.CSSProperties = {
  margin: '8px 0 0',
  padding: '0 0 0 18px',
  display: 'grid',
  gap: 4,
}
