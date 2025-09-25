import React from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import GameLayout from '../components/GameLayout'
import { useRequireGameSession } from '../hooks/useRequireGameSession'

type Position = { x: number; y: number }

type CombatParticipantDto = {
  id: number
  name: string
  team: number
  isAi: boolean
  position: Position
  hp: number
  stats: Record<string, number>
  current: { hp: number; mana: number | null; position: Position }
  initial: { hp: number; mana: number | null; position: Position }
  meta: { name?: string; rarity?: string; description?: string | null } | null
}

type CombatRoundLog = { round: number; log: string[] }

type CombatAvailableActions = {
  canMove: boolean
  movePositions: Position[]
  canAttack: boolean
  attackTargets: number[]
  canWait: boolean
}

type CombatSpell = {
  id: number
  name: string
  slug: string
  description: string | null
  cooldown: number
  slotCode: string
}

type CombatMeta = {
  monsterName?: string
  monsterRarity?: string
  monsterDescription?: string | null
  playerCharacterName?: string
}

type CombatDetails = {
  id: number
  status: string
  turn: 'player' | 'enemy' | 'finished'
  board: { width: number; height: number }
  currentRound: number
  participants: CombatParticipantDto[]
  playerTeam: number | null
  result: { winningTeam: number | null; summary: Record<string, unknown> | null } | null
  meta: CombatMeta
  availableActions: CombatAvailableActions
  playerSpells: CombatSpell[]
  rounds: CombatRoundLog[]
}

type CombatState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'success'; data: CombatDetails }

function normalizeCombatResponse(raw: any): CombatDetails {
  const board = {
    width: Number(raw?.board?.width ?? 8),
    height: Number(raw?.board?.height ?? 8),
  }

  const participants: CombatParticipantDto[] = Array.isArray(raw?.participants)
    ? raw.participants.map((p: any) => {
        const position = p?.position ?? p?.current?.position ?? { x: 0, y: 0 }
        const current = p?.current ?? {}
        const initial = p?.initial ?? {}
        const stats = p?.stats ?? {}
        return {
          id: Number(p?.id ?? 0),
          name: String(p?.name ?? 'Unknown'),
          team: Number(p?.team ?? 0),
          isAi: Boolean(p?.isAi),
          position: {
            x: Number(position?.x ?? 0),
            y: Number(position?.y ?? 0),
          },
          hp: Number(p?.hp ?? current?.hp ?? 0),
          stats: {
            str: Number(stats?.str ?? stats?.strength ?? 0),
            agi: Number(stats?.agi ?? stats?.agility ?? 0),
            int: Number(stats?.int ?? stats?.intelligence ?? 0),
            spd: Number(stats?.spd ?? stats?.speed ?? 0),
            hpMax: Number(stats?.hpMax ?? initial?.hp ?? current?.hp ?? 0),
            manaMax: Number(stats?.manaMax ?? initial?.mana ?? current?.mana ?? 0),
          },
          current: {
            hp: Number(current?.hp ?? p?.hp ?? 0),
            mana:
              current?.mana == null
                ? null
                : Number.isFinite(Number(current.mana))
                ? Number(current.mana)
                : null,
            position: {
              x: Number(current?.position?.x ?? position?.x ?? 0),
              y: Number(current?.position?.y ?? position?.y ?? 0),
            },
          },
          initial: {
            hp: Number(initial?.hp ?? current?.hp ?? p?.hp ?? 0),
            mana:
              initial?.mana == null
                ? current?.mana ?? null
                : Number.isFinite(Number(initial.mana))
                ? Number(initial.mana)
                : null,
            position: {
              x: Number(initial?.position?.x ?? position?.x ?? 0),
              y: Number(initial?.position?.y ?? position?.y ?? 0),
            },
          },
          meta:
            p?.meta && typeof p.meta === 'object'
              ? {
                  name: p.meta.name ?? undefined,
                  rarity: p.meta.rarity ?? undefined,
                  description: p.meta.description ?? null,
                }
              : null,
        }
      })
    : []

  const rounds: CombatRoundLog[] = Array.isArray(raw?.rounds)
    ? raw.rounds
        .map((round: any) => ({
          round: Number(round?.round ?? 0),
          log: Array.isArray(round?.log)
            ? round.log.map((line: any) => String(line))
            : [],
        }))
        .sort((a, b) => a.round - b.round)
    : []

  const actionsRaw = raw?.availableActions ?? {}
  const availableActions: CombatAvailableActions = {
    canMove: Boolean(actionsRaw?.canMove),
    movePositions: Array.isArray(actionsRaw?.movePositions)
      ? actionsRaw.movePositions.map((pos: any) => ({
          x: Number(pos?.x ?? 0),
          y: Number(pos?.y ?? 0),
        }))
      : [],
    canAttack: Boolean(actionsRaw?.canAttack),
    attackTargets: Array.isArray(actionsRaw?.attackTargets)
      ? actionsRaw.attackTargets.map((value: any) => Number(value)).filter((value: number) => Number.isFinite(value))
      : [],
    canWait: Boolean(actionsRaw?.canWait),
  }

  const playerSpells: CombatSpell[] = Array.isArray(raw?.playerSpells)
    ? raw.playerSpells.map((spell: any) => ({
        id: Number(spell?.id ?? 0),
        name: String(spell?.name ?? 'Spell'),
        slug: String(spell?.slug ?? 'spell'),
        description: spell?.description != null ? String(spell.description) : null,
        cooldown: Number(spell?.cooldown ?? 0),
        slotCode: String(spell?.slotCode ?? 'spell'),
      }))
    : []

  const meta: CombatMeta = raw?.meta && typeof raw.meta === 'object' ? { ...raw.meta } : {}

  return {
    id: Number(raw?.id ?? 0),
    status: String(raw?.status ?? 'pending'),
    turn:
      raw?.turn === 'enemy' || raw?.turn === 'finished'
        ? raw.turn
        : 'player',
    board,
    currentRound: Number(raw?.currentRound ?? 1),
    participants,
    playerTeam: raw?.playerTeam != null ? Number(raw.playerTeam) : null,
    result: raw?.result
      ? {
          winningTeam: raw.result.winningTeam != null ? Number(raw.result.winningTeam) : null,
          summary: raw.result.summary ?? null,
        }
      : null,
    meta,
    availableActions,
    playerSpells,
    rounds,
  }
}

export default function CombatPage() {
  useRequireGameSession()
  const { id } = useParams()
  const navigate = useNavigate()
  const [state, setState] = React.useState<CombatState>({ status: 'loading' })
  const [selectedAction, setSelectedAction] = React.useState<'move' | 'attack' | null>(null)
  const [pending, setPending] = React.useState(false)
  const [actionError, setActionError] = React.useState<string | null>(null)
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
      setActionError(null)
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
    if (state.data.status === 'finished') {
      const stored = localStorage.getItem('activeCombatId')
      if (stored && Number(stored) === state.data.id) localStorage.removeItem('activeCombatId')
    }
  }, [state])

  React.useEffect(() => {
    if (state.status !== 'success') return
    if (state.data.turn !== 'player') setSelectedAction(null)
  }, [state])

  const handleRefresh = () => setReloadToken((value) => value + 1)

  const isPlayersTurn =
    state.status === 'success' && state.data.status === 'active' && state.data.turn === 'player'

  const sendAction = React.useCallback(
    async (payload: Record<string, unknown>) => {
      if (!Number.isFinite(numericId) || numericId <= 0) return
      const token = localStorage.getItem('token')
      if (!token) {
        navigate('/login')
        return
      }
      setPending(true)
      setActionError(null)
      try {
        const res = await fetch(`/api/combat/${numericId}/action`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        })
        const body = await res.json().catch(() => null)
        if (!res.ok || !body || typeof body.id !== 'number') {
          const message = body && typeof body.error === 'string' ? body.error : 'Action failed.'
          throw new Error(message)
        }
        setState({ status: 'success', data: normalizeCombatResponse(body) })
        setSelectedAction(null)
      } catch (err: any) {
        setActionError(err?.message ?? 'Action failed.')
      } finally {
        setPending(false)
      }
    },
    [navigate, numericId],
  )

  const handleMoveSelect = React.useCallback(
    (position: Position) => {
      if (!isPlayersTurn || pending) return
      sendAction({ action: 'move', position })
    },
    [isPlayersTurn, pending, sendAction],
  )

  const handleAttack = React.useCallback(() => {
    if (!isPlayersTurn || pending) return
    sendAction({ action: 'attack' })
  }, [isPlayersTurn, pending, sendAction])

  const handleWait = React.useCallback(() => {
    if (!isPlayersTurn || pending) return
    sendAction({ action: 'wait' })
  }, [isPlayersTurn, pending, sendAction])

  const boardContent = React.useMemo(() => {
    if (state.status !== 'success') return null
    const { data } = state
    const moveKeys = new Set(
      selectedAction === 'move'
        ? data.availableActions.movePositions.map((pos) => `${pos.x}:${pos.y}`)
        : [],
    )
    const attackTargets = new Set(
      selectedAction === 'attack' ? data.availableActions.attackTargets : [],
    )

    const participantByPosition = new Map<string, CombatParticipantDto>()
    for (const participant of data.participants) {
      const current = participant.current?.position ?? participant.position
      participantByPosition.set(`${current.x}:${current.y}`, participant)
    }

    const rows: React.ReactNode[] = []
    for (let y = 0; y < data.board.height; y++) {
      for (let x = 0; x < data.board.width; x++) {
        const key = `${x}:${y}`
        const participant = participantByPosition.get(key)
        const isMoveOption = moveKeys.has(key)
        const occupantIsEnemy = participant?.isAi ?? false
        const canSelectEnemy =
          selectedAction === 'attack' && participant && attackTargets.has(participant.id)

        const tileHandlers: { onClick?: () => void } = {}
        if (isMoveOption) {
          tileHandlers.onClick = () => handleMoveSelect({ x, y })
        } else if (canSelectEnemy) {
          tileHandlers.onClick = handleAttack
        }

        const tokenTooltip = participant
          ? `${participant.name}\nHP ${participant.current.hp}/${participant.initial.hp}\nMana ${
              participant.current.mana != null
                ? `${participant.current.mana}/${participant.initial.mana ?? participant.stats.manaMax}`
                : '—'
            }\nSTR ${participant.stats.str} · AGI ${participant.stats.agi} · INT ${participant.stats.int} · SPD ${participant.stats.spd}`
          : ''

        rows.push(
          <div
            key={key}
            style={{
              ...tile,
              cursor: isMoveOption || canSelectEnemy ? 'pointer' : 'default',
              background:
                selectedAction === 'move' && isMoveOption
                  ? 'rgba(46, 204, 113, 0.25)'
                  : selectedAction === 'attack' && canSelectEnemy
                  ? 'rgba(231, 76, 60, 0.25)'
                  : (x + y) % 2 === 0
                  ? 'rgba(255,255,255,0.03)'
                  : 'rgba(255,255,255,0.06)',
              borderColor: canSelectEnemy ? '#e74c3c' : 'rgba(255,255,255,0.08)',
            }}
            {...tileHandlers}
            title={tokenTooltip}
          >
            {participant && (
              <div
                style={{
                  ...token,
                  background: participant.isAi ? '#e74c3c' : '#2ecc71',
                  borderColor: participant.isAi ? '#ff9b81' : '#a8ffbf',
                }}
              />
            )}
          </div>,
        )
      }
    }
    return rows
  }, [state, selectedAction, handleMoveSelect, handleAttack])

  const renderSpells = (spells: CombatSpell[]) => {
    if (!spells.length) return <p style={subtleText}>No combat spells equipped.</p>
    return (
      <div style={spellList}>
        {spells.map((spell) => (
          <div key={spell.id} style={spellCard} title={spell.description ?? undefined}>
            <strong>{spell.name}</strong>
            <span style={spellMeta}>Cooldown {spell.cooldown}</span>
            <span style={spellMeta}>Slot {spell.slotCode}</span>
          </div>
        ))}
      </div>
    )
  }

  const handleReturn = () => navigate('/world')

  return (
    <GameLayout>
      <div style={layout}>
        {state.status === 'loading' && <p>Loading combat...</p>}
        {state.status === 'error' && (
          <div style={panel}>
            <p>{state.message}</p>
            <div style={{ display: 'flex', gap: 12 }}>
              <button type='button' style={primaryButton} onClick={handleRefresh}>
                Try again
              </button>
              <button type='button' style={secondaryButton} onClick={() => navigate('/world')}>
                Back to world
              </button>
            </div>
          </div>
        )}
        {state.status === 'success' && (
          <>
            <header style={header}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <h1 style={{ margin: 0 }}>Combat</h1>
                <p style={statusLine}>
                  Status: <strong>{state.data.status}</strong> · Round {state.data.currentRound} · Turn{' '}
                  {state.data.turn}
                </p>
                {state.data.meta?.monsterName && (
                  <p style={statusLine}>
                    Opponent: {state.data.meta.monsterName}
                    {state.data.meta.monsterRarity ? ` · ${state.data.meta.monsterRarity}` : ''}
                  </p>
                )}
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <button type='button' style={secondaryButton} onClick={handleRefresh} disabled={pending}>
                  Refresh
                </button>
                <button
                  type='button'
                  style={{ ...primaryButton, opacity: state.data.status === 'finished' ? 1 : 0.6 }}
                  disabled={state.data.status !== 'finished'}
                  onClick={handleReturn}
                >
                  Back to world
                </button>
              </div>
            </header>

            <section style={boardSection}>
              <div style={{ ...boardGrid, gridTemplateColumns: `repeat(${state.data.board.width}, 56px)` }}>
                {boardContent}
              </div>
            </section>

            <section style={controlSection}>
              <h2 style={sectionHeading}>Actions</h2>
              <div style={actionRow}>
                <button
                  type='button'
                  style={{
                    ...actionButton,
                    ...(selectedAction === 'move' ? actionButtonActive : {}),
                  }}
                  disabled={!isPlayersTurn || !state.data.availableActions.canMove || pending}
                  onClick={() =>
                    setSelectedAction((prev) => (prev === 'move' ? null : 'move'))
                  }
                >
                  Move
                </button>
                <button
                  type='button'
                  style={{
                    ...actionButton,
                    ...(selectedAction === 'attack' ? actionButtonActive : {}),
                  }}
                  disabled={!isPlayersTurn || !state.data.availableActions.canAttack || pending}
                  onClick={() =>
                    setSelectedAction((prev) => (prev === 'attack' ? null : 'attack'))
                  }
                >
                  Attack
                </button>
                <button
                  type='button'
                  style={actionButton}
                  disabled={!isPlayersTurn || pending}
                  onClick={handleWait}
                >
                  Wait
                </button>
              </div>
              {actionError && <p style={errorText}>{actionError}</p>}
            </section>

            <section style={spellSection}>
              <h2 style={sectionHeading}>Spells</h2>
              {renderSpells(state.data.playerSpells)}
            </section>

            <section style={logSection}>
              <h2 style={sectionHeading}>Round log</h2>
              {state.data.rounds.length === 0 && <p style={subtleText}>No actions yet.</p>}
              <div style={logList}>
                {state.data.rounds.map((round) => (
                  <div key={round.round} style={roundCard}>
                    <strong>Round {round.round}</strong>
                    <ul style={roundLogList}>
                      {round.log.map((line, index) => (
                        <li key={`${round.round}-${index}`}>{line}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
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
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  gap: 16,
}
const boardSection: React.CSSProperties = { display: 'flex', justifyContent: 'center' }
const boardGrid: React.CSSProperties = {
  display: 'grid',
  gap: 2,
  background: 'rgba(255,255,255,0.05)',
  padding: 8,
  borderRadius: 12,
  border: '1px solid rgba(255,255,255,0.1)',
}
const tile: React.CSSProperties = {
  width: 52,
  height: 52,
  borderRadius: 6,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  border: '1px solid rgba(255,255,255,0.08)',
  transition: 'all 0.12s ease',
}
const token: React.CSSProperties = {
  width: 32,
  height: 32,
  borderRadius: 8,
  border: '2px solid transparent',
}
const controlSection: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
}
const actionRow: React.CSSProperties = { display: 'flex', gap: 12, flexWrap: 'wrap' }
const actionButton: React.CSSProperties = {
  background: 'rgba(255,255,255,0.08)',
  border: '1px solid rgba(255,255,255,0.2)',
  borderRadius: 8,
  padding: '10px 18px',
  color: '#f5f5f5',
  cursor: 'pointer',
  fontWeight: 600,
}
const actionButtonActive: React.CSSProperties = {
  background: '#3498db',
  borderColor: '#5dade2',
}
const spellSection: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
}
const spellList: React.CSSProperties = {
  display: 'grid',
  gap: 12,
  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
}
const spellCard: React.CSSProperties = {
  background: 'rgba(255,255,255,0.05)',
  borderRadius: 10,
  padding: 12,
  border: '1px solid rgba(255,255,255,0.1)',
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
}
const spellMeta: React.CSSProperties = { fontSize: 12, color: 'rgba(255,255,255,0.6)' }
const logSection: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
}
const sectionHeading: React.CSSProperties = { margin: 0 }
const logList: React.CSSProperties = { display: 'grid', gap: 12 }
const roundCard: React.CSSProperties = {
  background: 'rgba(255,255,255,0.05)',
  borderRadius: 10,
  padding: 16,
  border: '1px solid rgba(255,255,255,0.1)',
}
const roundLogList: React.CSSProperties = {
  margin: '8px 0 0',
  padding: '0 0 0 18px',
  display: 'grid',
  gap: 4,
}
const panel: React.CSSProperties = {
  background: 'rgba(255,255,255,0.05)',
  borderRadius: 12,
  padding: 24,
  border: '1px solid rgba(255,255,255,0.1)',
  display: 'flex',
  flexDirection: 'column',
  gap: 16,
  maxWidth: 480,
}
const primaryButton: React.CSSProperties = {
  background: '#2ecc71',
  border: 'none',
  padding: '10px 18px',
  borderRadius: 8,
  color: '#0b0d11',
  cursor: 'pointer',
  fontWeight: 600,
}
const secondaryButton: React.CSSProperties = {
  background: 'rgba(255,255,255,0.08)',
  border: '1px solid rgba(255,255,255,0.2)',
  padding: '10px 18px',
  borderRadius: 8,
  color: '#f5f5f5',
  cursor: 'pointer',
  fontWeight: 600,
}
const statusLine: React.CSSProperties = { margin: 0, color: 'rgba(255,255,255,0.7)' }
const subtleText: React.CSSProperties = { margin: 0, color: 'rgba(255,255,255,0.5)' }
const errorText: React.CSSProperties = { margin: 0, color: '#ff6b6b' }
