import React, {

  useCallback,

  useEffect,

  useMemo,

  useState,

} from 'react'

import { useNavigate, useParams } from 'react-router-dom'

import GameLayout from '../components/GameLayout'

import { useRequireGameSession } from '../hooks/useRequireGameSession'



type AttributeMap = Record<string, number>



type ApiAttribute = { name: string; value: number }



type ApiInventoryItem = {

  id: number

  amount: number

  name: string

  slug: string

  description: string | null

  slotCode: string | null

  allowedSlots: string[]

  equippedSlot: string | null

  modifiers: Array<{ name: string; value: number }>

  isConsumable: boolean

}



type Item = {

  inventoryId: number

  name: string

  description: string | null

  amount: number

  allowedSlots: string[]

  modifiers: AttributeMap

  slot: string | null

  position: { x: number; y: number } | null

  icon: string

  isConsumable: boolean

}



type ApiSpell = { id: number; name: string; slug: string; description: string | null; cooldown: number; slotCode: string }



type ApiLearnedSpell = ApiSpell & { level: number }



type ApiSpellSlot = { slotCode: string; slotIndex: number; slotName: string; spell: ApiSpell | null }



type Spell = {

  id: number

  name: string

  description: string | null

  cooldown: number

  level?: number

  icon: string

  slotCode: string

}



type SpellSlot = {

  slotCode: string

  slotIndex: number

  slotName: string

  spell: Spell | null

}



type ApiProfession = { id: number; name: string; description: string | null; skill: number }

type ApiProfessionDefinition = { id: number; name: string; description: string | null }



type TooltipState =

  | { kind: 'item'; id: number; x: number; y: number }

  | { kind: 'spell'; id: number; x: number; y: number }



type CharacterSummary = {

  id: number

  name: string

  level: number

  ancestry: { id: number; name: string; description: string | null } | null

  isSelf: boolean

}



type DragPayload =

  | { kind: 'item'; inventoryId: number }

  | { kind: 'spell'; spellId: number; fromSlot?: { slotCode: string; slotIndex: number } }



type DraggingSpellState = { spellId: number; slotCode: string; fromSlot?: { slotCode: string; slotIndex: number } }



type TabKey = 'inventory' | 'spellbook' | 'profession'



type SlotBlueprint = { slotCode: string; slotIndex: number; slotName: string }



const INVENTORY_COLS = 8

const INVENTORY_ROWS = 6

const CELL_SIZE = 64



const EQUIPMENT_SLOTS: Array<{ code: string; label: string; top: number; left: number }> = [

  { code: 'head', label: 'Head', top: 16, left: 170 },

  { code: 'neck', label: 'Neck', top: 86, left: 170 },

  { code: 'shoulder', label: 'Shoulder', top: 86, left: 60 },

  { code: 'back', label: 'Back', top: 156, left: 60 },

  { code: 'chest', label: 'Chest', top: 156, left: 170 },

  { code: 'wrist', label: 'Wrist', top: 226, left: 290 },

  { code: 'hands', label: 'Hands', top: 296, left: 290 },

  { code: 'waist', label: 'Waist', top: 236, left: 170 },

  { code: 'legs', label: 'Legs', top: 306, left: 170 },

  { code: 'feet', label: 'Feet', top: 376, left: 170 },

  { code: 'ring', label: 'Ring', top: 206, left: 290 },

  { code: 'trinket', label: 'Trinket', top: 136, left: 290 },

  { code: 'mainhand', label: 'Main-hand', top: 246, left: 60 },

  { code: 'offhand', label: 'Off-hand', top: 316, left: 60 },

  { code: 'twohand', label: 'Two-hand', top: 386, left: 290 },

]



const SPELL_SLOT_BLUEPRINT: SlotBlueprint[] = [

  { slotCode: 'passive', slotIndex: 0, slotName: 'Passive' },

  { slotCode: 'spell', slotIndex: 0, slotName: 'Spell 1' },

  { slotCode: 'spell', slotIndex: 1, slotName: 'Spell 2' },

  { slotCode: 'spell', slotIndex: 2, slotName: 'Spell 3' },

  { slotCode: 'ultimate', slotIndex: 0, slotName: 'Ultimate' },

]



const SPELL_SLOT_BLUEPRINT_KEYS = new Set(SPELL_SLOT_BLUEPRINT.map(toSlotKey))



const SLOT_CODE_LABELS: Record<string, string> = {

  passive: 'Passive',

  spell: 'Spell',

  ultimate: 'Ultimate',

}



function slotCodeToLabel(slotCode: string) {

  return SLOT_CODE_LABELS[slotCode] ?? slotCode

}

export default function CharacterPage() {

  useRequireGameSession()

  const [character, setCharacter] = useState<CharacterSummary | null>(null)

  const [baseAttributes, setBaseAttributes] = useState<AttributeMap>({})

  const [items, setItems] = useState<Item[]>([])

  const [spellSlots, setSpellSlots] = useState<SpellSlot[]>(ensureDefaultSlots([]))

  const [spellLibrary, setSpellLibrary] = useState<Spell[]>([])

  const [spellSearch, setSpellSearch] = useState('')

  const [profession, setProfession] = useState<ApiProfession | null>(null)

  const [availableProfessions, setAvailableProfessions] = useState<ApiProfessionDefinition[]>([])

  const [professionBusy, setProfessionBusy] = useState(false)

  const [professionError, setProfessionError] = useState<string | null>(null)

  const [loading, setLoading] = useState(true)

  const [error, setError] = useState<string | null>(null)

  const [draggingId, setDraggingId] = useState<number | null>(null)

  const [draggingSpell, setDraggingSpell] = useState<DraggingSpellState | null>(null)

  const [tooltip, setTooltip] = useState<TooltipState | null>(null)

  const [friendStatus, setFriendStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')

  const [friendError, setFriendError] = useState<string | null>(null)

  const [activeTab, setActiveTab] = useState<TabKey>('inventory')

  const [focusedSlotKey, setFocusedSlotKey] = useState<string | null>(null)



  const navigate = useNavigate()

  const params = useParams<{ id?: string }>()

  const rawParamId = params.id

  const parsedParamId = rawParamId ? Number(rawParamId) : null

  const invalidCharacterParam = Boolean(

    rawParamId &&

      (Number.isNaN(parsedParamId ?? Number.NaN) ||

        !Number.isFinite(parsedParamId ?? Number.NaN) ||

        !Number.isInteger(parsedParamId ?? Number.NaN) ||

        (parsedParamId ?? 0) <= 0),

  )



  const activeCharacter = useMemo(() => {

    const stored = localStorage.getItem('activeCharacter')

    if (!stored) return null

    try {

      return JSON.parse(stored) as { id: number; name: string }

    } catch (err) {

      console.warn('Failed to parse activeCharacter', err)

      return null

    }

  }, [])



  const characterId = useMemo(() => {

    if (invalidCharacterParam) return null

    if (parsedParamId) return parsedParamId

    return activeCharacter?.id ?? null

  }, [invalidCharacterParam, parsedParamId, activeCharacter])



  const fetchData = useCallback(async () => {

    if (!characterId) return

    setLoading(true)

    setError(null)

    setProfessionError(null)

    try {

      const token = localStorage.getItem('token')

      if (!token) throw new Error('Missing session token')

      const res = await fetch(`/api/characters/${characterId}`, {

        headers: { Authorization: `Bearer ${token}` },

      })

      if (!res.ok) {

        const data = await res.json().catch(() => ({}))

        throw new Error(data?.error ?? 'Failed to load character')

      }

      const data: {

        character: CharacterSummary

        attributes: ApiAttribute[]

        inventory: ApiInventoryItem[]

        spellbook?: { slots: ApiSpellSlot[]; learned: ApiLearnedSpell[] }

        profession?: ApiProfession | null

      } = await res.json()



      setCharacter(data.character)

      setProfession(parseCharacterProfession(data.profession))

      setBaseAttributes(mapAttributeList(data.attributes))

      const builtItems = buildItems(data.inventory)

      setItems(builtItems)



      const spellState = buildSpellState(data.spellbook ?? null)

      const normalizedSlots = ensureDefaultSlots(spellState.slots)

      setSpellSlots(normalizedSlots)

      setSpellLibrary(createSpellLibrary(spellState.learned, normalizedSlots))

      setDraggingSpell(null)

      setFriendStatus('idle')

      setFriendError(null)



      if (data.character?.isSelf) {

        try {

          const profRes = await fetch('/api/professions', {

            headers: { Authorization: `Bearer ${token}` },

          })

          if (!profRes.ok) {

            const payload = await profRes.json().catch(() => ({}))

            throw new Error(payload?.error ?? 'Failed to load professions')

          }

          const payload = await profRes.json()

          setAvailableProfessions(parseProfessionDefinitions(payload?.items ?? []))

        } catch (catalogErr: any) {

          setAvailableProfessions([])

          setProfessionError(catalogErr?.message ?? 'Failed to load professions')

        }

      } else {

        setAvailableProfessions([])

      }

    } catch (err: any) {

      setError(err?.message ?? 'Failed to load character')

    } finally {

      setLoading(false)

    }

  }, [characterId])



  useEffect(() => {

    fetchData()

  }, [fetchData])



  useEffect(() => {

    setFriendStatus('idle')

    setFriendError(null)

    setProfessionError(null)

    setProfessionBusy(false)

  }, [characterId])



  useEffect(() => {

    if (activeTab !== 'spellbook') setFocusedSlotKey(null)

  }, [activeTab])







  const equippedAttributes = useMemo(() => computeAttributes(baseAttributes, items), [baseAttributes, items])



  const equippedBySlot = useMemo(() => {

    const map: Record<string, Item | undefined> = {}

    for (const slot of EQUIPMENT_SLOTS) {

      map[slot.code] = items.find((item) => item.slot === slot.code)

    }

    return map

  }, [items])



  const allowInteraction = Boolean(character && activeCharacter && character.id === activeCharacter.id)

  const itemsInInventory = useMemo(

    () => (allowInteraction ? items.filter((item) => !item.slot && item.position) : []),

    [items, allowInteraction],

  )



  const tooltipItem = tooltip?.kind === 'item' ? items.find((item) => item.inventoryId === tooltip.id) : undefined

  const tooltipSpell = useMemo(() => {

    if (!tooltip || tooltip.kind !== 'spell') return undefined

    const fromLibrary = spellLibrary.find((spell) => spell.id === tooltip.id)

    if (fromLibrary) return fromLibrary

    const fromSlot = spellSlots.find((slot) => slot.spell?.id === tooltip.id)

    return fromSlot?.spell ?? undefined

  }, [tooltip, spellLibrary, spellSlots])



  const filteredSpells = useMemo(() => {

    const query = spellSearch.trim().toLowerCase()

    if (!query) return spellLibrary

    return spellLibrary.filter((spell) => spell.name.toLowerCase().includes(query))

  }, [spellLibrary, spellSearch])



  const handleDragStart = useCallback(

    (item: Item) => (event: React.DragEvent) => {

      if (!item.position && !item.slot) return

      const payload: DragPayload = { kind: 'item', inventoryId: item.inventoryId }

      event.dataTransfer.setData('application/json', JSON.stringify(payload))

      event.dataTransfer.effectAllowed = 'move'

      event.dataTransfer.setDragImage(event.currentTarget as HTMLElement, 32, 32)

      setDraggingId(item.inventoryId)

    },

    [],

  )



  const handleDragEnd = useCallback(() => setDraggingId(null), [])



  const handleSlotDrop = useCallback(

    (slotCode: string) => async (event: React.DragEvent) => {

      event.preventDefault()

      if (!allowInteraction || !characterId) return

      const payload = parsePayload(event.dataTransfer)

      if (!payload || payload.kind !== 'item') return

      const item = items.find((candidate) => candidate.inventoryId === payload.inventoryId)

      if (!item) return

      if (!item.allowedSlots.includes(slotCode)) return



      try {

        const token = localStorage.getItem('token')

        if (!token) throw new Error('Missing session token')

        await fetch(`/api/characters/${characterId}/equipment`, {

          method: 'POST',

          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },

          body: JSON.stringify({ inventoryId: payload.inventoryId, slotCode }),

        }).then(assertOk)

        setItems((prev) => equipLocally(prev, payload.inventoryId, slotCode))

      } catch (err: any) {

        setError(err?.message ?? 'Failed to equip item')

        await fetchData()

      } finally {

        setDraggingId(null)

      }

    },

    [allowInteraction, characterId, items, fetchData],

  )



  const handleSlotDragOver = useCallback((event: React.DragEvent) => {

    event.preventDefault()

    event.dataTransfer.dropEffect = 'move'

  }, [])



  const handleInventoryDrop = useCallback(

    async (event: React.DragEvent<HTMLDivElement>) => {

      event.preventDefault()

      if (!allowInteraction) return

      const payload = parsePayload(event.dataTransfer)

      if (!payload || payload.kind !== 'item') return

      const item = items.find((candidate) => candidate.inventoryId === payload.inventoryId)

      if (!item) return

      const rect = event.currentTarget.getBoundingClientRect()

      const x = clamp(Math.floor((event.clientX - rect.left) / CELL_SIZE), 0, INVENTORY_COLS - 1)

      const y = clamp(Math.floor((event.clientY - rect.top) / CELL_SIZE), 0, INVENTORY_ROWS - 1)



      try {

        if (item.slot && characterId) {

          const token = localStorage.getItem('token')

          if (!token) throw new Error('Missing session token')

          await fetch(`/api/characters/${characterId}/equipment/${item.slot}`, {

            method: 'DELETE',

            headers: { Authorization: `Bearer ${token}` },

          }).then(assertOk)

        }

        setItems((prev) => placeInInventory(prev, payload.inventoryId, x, y))

      } catch (err: any) {

        setError(err?.message ?? 'Failed to move item')

        await fetchData()

      } finally {

        setDraggingId(null)

      }

    },

    [allowInteraction, items, characterId, fetchData],

  )



  const handleUseConsumable = useCallback(

    async (item: Item) => {

      if (!allowInteraction || !characterId || !item.isConsumable) return

      try {

        const token = localStorage.getItem('token')

        if (!token) throw new Error('Missing session token')

        const res = await fetch(`/api/characters/${characterId}/inventory/${item.inventoryId}/use`, {

          method: 'POST',

          headers: { Authorization: `Bearer ${token}` },

        })

        type ConsumableResponse = {

          inventory: ApiInventoryItem[]

          attributes: ApiAttribute[]

          appliedModifiers?: Array<{ name: string; value: number }>

        }

        const payload = (await res.json().catch(() => null)) as ConsumableResponse | { error?: string } | null

        if (!res.ok) {

          const message = (payload as { error?: string } | null)?.error ?? 'Failed to use item'

          throw new Error(message)

        }

        if (!payload || !Array.isArray((payload as ConsumableResponse).inventory) || !Array.isArray((payload as ConsumableResponse).attributes))

          throw new Error('Invalid response from server')

        const data = payload as ConsumableResponse

        setBaseAttributes(mapAttributeList(data.attributes))

        const updatedItems = buildItems(data.inventory)

        setItems(updatedItems)

        setTooltip(null)

        setError(null)

      } catch (err: any) {

        setError(err?.message ?? 'Failed to use item')

      }

    },

    [allowInteraction, characterId],

  )



  const handleInventoryDragOver = useCallback((event: React.DragEvent) => {

    event.preventDefault()

    event.dataTransfer.dropEffect = 'move'

  }, [])



  const handleSpellDragStart = useCallback(

    (spell: Spell, origin: 'library' | 'slot', slot?: SpellSlot) => (event: React.DragEvent<HTMLDivElement>) => {

      const payload: DragPayload =

        origin === 'slot' && slot

          ? { kind: 'spell', spellId: spell.id, fromSlot: { slotCode: slot.slotCode, slotIndex: slot.slotIndex } }

          : { kind: 'spell', spellId: spell.id }

      event.dataTransfer.setData('application/json', JSON.stringify(payload))

      event.dataTransfer.effectAllowed = 'move'

      event.dataTransfer.setDragImage(event.currentTarget as HTMLElement, 24, 24)

      const slotCode = payload.fromSlot?.slotCode ?? spell.slotCode

      setDraggingSpell({ spellId: payload.spellId, slotCode, fromSlot: payload.fromSlot })

    },

    [],

  )



  const handleSpellDragEnd = useCallback(() => setDraggingSpell(null), [])

  const handleSpellSlotDrop = useCallback(

    (targetSlot: SpellSlot) => async (event: React.DragEvent<HTMLDivElement>) => {

      event.preventDefault()

      if (!allowInteraction || !characterId) return

      const payload = parsePayload(event.dataTransfer)

      if (!payload || payload.kind !== 'spell') return



      const sourceSlot = payload.fromSlot

        ? spellSlots.find((candidate) =>

            candidate.slotCode === payload.fromSlot?.slotCode && candidate.slotIndex === payload.fromSlot?.slotIndex,

          ) ?? null

        : null

      const incomingSpell = sourceSlot?.spell ?? spellLibrary.find((spell) => spell.id === payload.spellId) ?? null

      if (!incomingSpell) return



      if (sourceSlot && toSlotKey(sourceSlot) === toSlotKey(targetSlot)) return



      const targetSpell = targetSlot.spell

      const incomingSlotCode = sourceSlot ? sourceSlot.slotCode : incomingSpell.slotCode

      if (incomingSlotCode !== targetSlot.slotCode) {

        setError(`Cannot place ${slotCodeToLabel(incomingSlotCode)} spells into ${targetSlot.slotName}.`)

        setDraggingSpell(null)

        setTooltip((current) => (current?.kind === 'spell' ? null : current))

        return

      }

      if (sourceSlot && targetSpell && targetSpell.slotCode !== sourceSlot.slotCode) {

        setError('Cannot swap spells between different slot types.')

        setDraggingSpell(null)

        setTooltip((current) => (current?.kind === 'spell' ? null : current))

        return

      }



      try {

        const token = localStorage.getItem('token')

        if (!token) throw new Error('Missing session token')



        await fetch(`/api/characters/${characterId}/spells`, {

          method: 'POST',

          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },

          body: JSON.stringify({ slotCode: targetSlot.slotCode, slotIndex: targetSlot.slotIndex, spellId: incomingSpell.id }),

        }).then(assertOk)



        if (sourceSlot) {

          if (targetSpell) {

            await fetch(`/api/characters/${characterId}/spells`, {

              method: 'POST',

              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },

              body: JSON.stringify({

                slotCode: sourceSlot.slotCode,

                slotIndex: sourceSlot.slotIndex,

                spellId: targetSpell.id,

              }),

            }).then(assertOk)

          } else {

            await fetch(`/api/characters/${characterId}/spells/${sourceSlot.slotCode}/${sourceSlot.slotIndex}`, {

              method: 'DELETE',

              headers: { Authorization: `Bearer ${token}` },

            }).then(assertOk)

          }

        }



        setSpellSlots((prev) =>

          prev.map((slot) => {

            const key = toSlotKey(slot)

            if (key === toSlotKey(targetSlot)) return { ...slot, spell: incomingSpell }

            if (sourceSlot && key === toSlotKey(sourceSlot)) return { ...slot, spell: targetSpell ?? null }

            return slot

          }),

        )



        if (!sourceSlot) {

          setSpellLibrary((prev) => {

            const withoutIncoming = prev.filter((spell) => spell.id !== incomingSpell.id)

            return targetSpell ? appendSpellToLibraryEnd(withoutIncoming, targetSpell) : withoutIncoming

          })

        }



        setTooltip((current) => (current?.kind === 'spell' ? null : current))

      } catch (err: any) {

        setError(err?.message ?? 'Failed to assign spell')

        await fetchData()

      } finally {

        setDraggingSpell(null)

      }

    },

    [allowInteraction, characterId, spellSlots, spellLibrary, fetchData],

  )



  const handleSpellSlotDragOver = useCallback(

    (event: React.DragEvent<HTMLDivElement>) => {

      event.preventDefault()

      if (allowInteraction) event.dataTransfer.dropEffect = 'move'

    },

    [allowInteraction],

  )



  const handleSpellLibraryDrop = useCallback(

    async (event: React.DragEvent<HTMLDivElement>) => {

      event.preventDefault()

      if (!allowInteraction || !characterId) return

      const payload = parsePayload(event.dataTransfer)

      if (!payload || payload.kind !== 'spell' || !payload.fromSlot) return



      const slot = spellSlots.find(

        (candidate) =>

          candidate.slotCode === payload.fromSlot?.slotCode && candidate.slotIndex === payload.fromSlot?.slotIndex,

      )

      const spell = slot?.spell

      if (!slot || !spell) return



      try {

        const token = localStorage.getItem('token')

        if (!token) throw new Error('Missing session token')

        await fetch(`/api/characters/${characterId}/spells/${slot.slotCode}/${slot.slotIndex}`, {

          method: 'DELETE',

          headers: { Authorization: `Bearer ${token}` },

        }).then(assertOk)



        setSpellSlots((prev) =>

          prev.map((candidate) => (toSlotKey(candidate) === toSlotKey(slot) ? { ...candidate, spell: null } : candidate)),

        )

        setSpellLibrary((prev) => appendSpellToLibraryEnd(prev, spell))

        setTooltip((current) => (current?.kind === 'spell' ? null : current))

      } catch (err: any) {

        setError(err?.message ?? 'Failed to remove spell')

        await fetchData()

      } finally {

        setDraggingSpell(null)

      }

    },

    [allowInteraction, characterId, spellSlots, fetchData],

  )



  const handleProfessionSelect = useCallback(

    async (professionId: number) => {

      if (!allowInteraction || !characterId) return

      setProfessionBusy(true)

      setProfessionError(null)

      try {

        const token = localStorage.getItem('token')

        if (!token) throw new Error('Missing session token')

        const res = await fetch(`/api/characters/${characterId}/profession`, {

          method: 'POST',

          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },

          body: JSON.stringify({ professionId }),

        })

        if (!res.ok) {

          const data = await res.json().catch(() => ({}))

          throw new Error(data?.error ?? 'Failed to learn profession')

        }

        const payload: { profession: ApiProfession } = await res.json()

        setProfession(parseCharacterProfession(payload.profession))

        setActiveTab('profession')

      } catch (err: any) {

        setProfessionError(err?.message ?? 'Failed to learn profession')

      } finally {

        setProfessionBusy(false)

      }

    },

    [allowInteraction, characterId, setActiveTab],

  )



  const handleProfessionUnlearn = useCallback(async () => {

    if (!allowInteraction || !characterId || !profession) return

    if (!window.confirm(`Opravdu se chces odnaucit ${profession.name}? Progres bude ztracen.`)) return

    setProfessionBusy(true)

    setProfessionError(null)

    try {

      const token = localStorage.getItem('token')

      if (!token) throw new Error('Missing session token')

      const res = await fetch(`/api/characters/${characterId}/profession`, {

        method: 'DELETE',

        headers: { Authorization: `Bearer ${token}` },

      })

      if (!res.ok) {

        const data = await res.json().catch(() => ({}))

        throw new Error(data?.error ?? 'Failed to unlearn profession')

      }

      setProfession(null)

    } catch (err: any) {

      setProfessionError(err?.message ?? 'Failed to unlearn profession')

    } finally {

      setProfessionBusy(false)

    }

  }, [allowInteraction, characterId, profession])



  const handleProfessionVisit = useCallback(() => {

    if (!profession) return

    navigate(`/profession/${profession.id}`, { state: { professionName: profession.name } })

  }, [navigate, profession])



  const handleProfessionTrain = useCallback(async () => {

    if (!allowInteraction || !characterId || !profession) return

    if (profession.skill >= 300) return

    setProfessionBusy(true)

    setProfessionError(null)

    try {

      const token = localStorage.getItem('token')

      if (!token) throw new Error('Missing session token')

      const nextSkill = Math.min(profession.skill + 1, 300)

      const res = await fetch(`/api/characters/${characterId}/profession`, {

        method: 'PATCH',

        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },

        body: JSON.stringify({ skill: nextSkill }),

      })

      if (!res.ok) {

        const data = await res.json().catch(() => ({}))

        throw new Error(data?.error ?? 'Failed to train profession')

      }

      const payload: { profession: ApiProfession } = await res.json()

      setProfession(parseCharacterProfession(payload.profession))

    } catch (err: any) {

      setProfessionError(err?.message ?? 'Failed to train profession')

    } finally {

      setProfessionBusy(false)

    }

  }, [allowInteraction, characterId, profession])



  const clearSpellSlot = useCallback(

    async (slot: SpellSlot) => {

      if (!allowInteraction || !characterId || !slot.spell) return

      try {

        const token = localStorage.getItem('token')

        if (!token) throw new Error('Missing session token')

        await fetch(`/api/characters/${characterId}/spells/${slot.slotCode}/${slot.slotIndex}`, {

          method: 'DELETE',

          headers: { Authorization: `Bearer ${token}` },

        }).then(assertOk)



        setSpellSlots((prev) =>

          prev.map((candidate) => (toSlotKey(candidate) === toSlotKey(slot) ? { ...candidate, spell: null } : candidate)),

        )

        setSpellLibrary((prev) => appendSpellToLibraryEnd(prev, slot.spell!))

        setTooltip((current) => (current?.kind === 'spell' ? null : current))

      } catch (err: any) {

        setError(err?.message ?? 'Failed to remove spell')

        await fetchData()

      }

    },

    [allowInteraction, characterId, fetchData],

  )



  useEffect(() => {

    if (activeTab !== 'spellbook' || !allowInteraction) return

    const listener = (event: KeyboardEvent) => {

      if (event.key !== 'Delete' || !focusedSlotKey) return

      const slot = spellSlots.find((candidate) => toSlotKey(candidate) === focusedSlotKey)

      if (!slot || !slot.spell) return

      event.preventDefault()

      void clearSpellSlot(slot)

    }

    window.addEventListener('keydown', listener)

    return () => window.removeEventListener('keydown', listener)

  }, [activeTab, allowInteraction, focusedSlotKey, spellSlots, clearSpellSlot])

  const onItemHover = useCallback((item: Item) => (event: React.MouseEvent<HTMLDivElement>) => {

    setTooltip({ kind: 'item', id: item.inventoryId, x: event.clientX + 16, y: event.clientY + 16 })

  }, [])



  const onItemLeave = useCallback(() => setTooltip(null), [])



  const onSpellHover = useCallback((spell: Spell) => (event: React.MouseEvent<HTMLDivElement>) => {

    setTooltip({ kind: 'spell', id: spell.id, x: event.clientX + 16, y: event.clientY + 16 })

  }, [])



  const clearTooltip = useCallback(() => setTooltip(null), [])



  const handleAddFriend = useCallback(async () => {

    if (!character || character.isSelf) return

    if (!activeCharacter) {

      setFriendError('Select your character first to add friends.')

      return

    }

    try {

      setFriendError(null)

      setFriendStatus('loading')

      const token = localStorage.getItem('token')

      if (!token) throw new Error('Missing session token')

      await fetch('/api/relationships', {

        method: 'POST',

        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },

        body: JSON.stringify({ sourceCharacterId: activeCharacter.id, targetCharacterId: character.id }),

      }).then(assertOk)

      setFriendStatus('success')

    } catch (err: any) {

      setFriendStatus('error')

      setFriendError(err?.message ?? 'Failed to add friend')

    }

  }, [character, activeCharacter])

  if (invalidCharacterParam) {

    return (

      <GameLayout>

        <div style={centerMessage}>Invalid character reference.</div>

      </GameLayout>

    )

  }



  if (!characterId) {

    return (

      <GameLayout>

        <div style={centerMessage}>Open the Characters page to select a hero.</div>

      </GameLayout>

    )

  }



  const friendButtonDisabled =

    !character || !activeCharacter || friendStatus === 'loading' || friendStatus === 'success'

  const friendButtonLabel = !activeCharacter

    ? 'Select a character'

    : friendStatus === 'success'

    ? 'Friend added'

    : friendStatus === 'loading'

    ? 'Adding...'

    : 'Add friend'



  const showItemTooltip = Boolean(tooltip && tooltip.kind === 'item' && tooltipItem)

  const showSpellTooltip = Boolean(tooltip && tooltip.kind === 'spell' && tooltipSpell)



  return (

    <GameLayout>

      <div style={pageShell}>

        <header style={header}>

          <div>

            <h1 style={title}>{character?.name ?? activeCharacter?.name ?? 'Character'}</h1>

            <p style={subtitle}>

              {loading

                ? 'Loading...'

                : allowInteraction

                ? activeTab === 'inventory'

                  ? 'Drag items between equipment and inventory.'

                  : activeTab === 'spellbook'

                  ? 'Drag & drop spells into your loadout.'

                  : 'Manage your profession.'

                : 'Review equipment, attributes, spells, and professions.'}

            </p>

          </div>

          {!allowInteraction && character && (

            <div style={friendActions}>

              <button

                type="button"

                style={friendButton}

                onClick={handleAddFriend}

                disabled={friendButtonDisabled}

              >

                {friendButtonLabel}

              </button>

              {friendStatus === 'success' && <span style={friendSuccess}>{'Friend added'}</span>}

              {friendError && <span style={friendErrorText}>{friendError}</span>}

            </div>

          )}

        </header>



        <CharacterTabs activeTab={activeTab} onTabChange={setActiveTab} />



        {activeTab === 'inventory' ? (

          <InventoryTab

            allowInteraction={allowInteraction}

            loading={loading}

            equippedBySlot={equippedBySlot}

            itemsInInventory={itemsInInventory}

            draggingId={draggingId}

            equippedAttributes={equippedAttributes}

            onSlotDrop={handleSlotDrop}

            onSlotDragOver={handleSlotDragOver}

            onItemDragStart={handleDragStart}

            onItemDragEnd={handleDragEnd}

            onItemDoubleClick={handleUseConsumable}

            onInventoryDrop={handleInventoryDrop}

            onInventoryDragOver={handleInventoryDragOver}

            onItemHover={onItemHover}

            onItemLeave={onItemLeave}

          />

        ) : activeTab === 'spellbook' ? (

          <SpellbookTab

            allowInteraction={allowInteraction}

            slots={spellSlots}

            spellLibrary={filteredSpells}

            fullLibrary={spellLibrary}

            draggingSpell={draggingSpell}

            focusedSlotKey={focusedSlotKey}

            spellSearch={spellSearch}

            onSpellSearchChange={setSpellSearch}

            onSlotDrop={handleSpellSlotDrop}

            onSlotDragOver={handleSpellSlotDragOver}

            onSlotFocus={setFocusedSlotKey}

            onSlotClear={clearSpellSlot}

            onSpellDragStart={handleSpellDragStart}

            onSpellDragEnd={handleSpellDragEnd}

            onSpellHover={onSpellHover}

            onSpellLeave={clearTooltip}

            onLibraryDrop={handleSpellLibraryDrop}

          />

        ) : (

          <ProfessionTab

            allowInteraction={allowInteraction}

            loading={loading}

            profession={profession}

            availableProfessions={availableProfessions}

            error={professionError}

            busy={professionBusy}

            onSelect={handleProfessionSelect}

            onUnlearn={handleProfessionUnlearn}

            onVisit={handleProfessionVisit}

            onTrain={handleProfessionTrain}

          />

        )}



        {error && <div style={errorBox}>{error}</div>}

      </div>



      {(showItemTooltip || showSpellTooltip) && tooltip && (

        <div style={{ ...tooltipBox, transform: `translate(${tooltip.x}px, ${tooltip.y}px)` }}>

          {showItemTooltip && tooltipItem && (

            <>

              <strong style={{ display: 'block', marginBottom: 4 }}>{tooltipItem.name}</strong>

              {tooltipItem.description && (

                <span style={{ display: 'block', marginBottom: 8 }}>{tooltipItem.description}</span>

              )}

              {Object.entries(tooltipItem.modifiers).map(([key, value]) => (

                <div key={key}>{`+${value} ${key}`}</div>

              ))}

              {tooltipItem.amount > 1 && <div>{`Amount: ${tooltipItem.amount}`}</div>}

            </>

          )}

          {showSpellTooltip && tooltipSpell && (

            <>

              <strong style={{ display: 'block', marginBottom: 4 }}>{tooltipSpell.name}</strong>

              {tooltipSpell.description && (

                <span style={{ display: 'block', marginBottom: 8 }}>{tooltipSpell.description}</span>

              )}

              <div>{`Slot: ${slotCodeToLabel(tooltipSpell.slotCode)}`}</div>

              <div>{`Cooldown: ${tooltipSpell.cooldown}s`}</div>

              {tooltipSpell.level !== undefined && <div>{`Level: ${tooltipSpell.level}`}</div>}

            </>

          )}

        </div>

      )}

    </GameLayout>

  )

}

type CharacterTabsProps = { activeTab: TabKey; onTabChange: (tab: TabKey) => void }



function CharacterTabs({ activeTab, onTabChange }: CharacterTabsProps) {

  return (

    <div style={tabsContainer}>

      <button

        type="button"

        style={activeTab === 'inventory' ? tabButtonActive : tabButton}

        onClick={() => onTabChange('inventory')}

      >

        Inventory

      </button>

      <button

        type="button"

        style={activeTab === 'spellbook' ? tabButtonActive : tabButton}

        onClick={() => onTabChange('spellbook')}

      >

        Spellbook

      </button>

      <button

        type="button"

        style={activeTab === 'profession' ? tabButtonActive : tabButton}

        onClick={() => onTabChange('profession')}

      >

        Profession

      </button>

    </div>

  )

}



type InventoryTabProps = {

  allowInteraction: boolean

  loading: boolean

  equippedBySlot: Record<string, Item | undefined>

  itemsInInventory: Item[]

  draggingId: number | null

  equippedAttributes: AttributeMap

  onSlotDrop: (slotCode: string) => (event: React.DragEvent<HTMLDivElement>) => void

  onSlotDragOver: (event: React.DragEvent<HTMLDivElement>) => void

  onItemDragStart: (item: Item) => (event: React.DragEvent) => void

  onItemDragEnd: () => void

  onItemDoubleClick: (item: Item) => void

  onInventoryDrop: (event: React.DragEvent<HTMLDivElement>) => void

  onInventoryDragOver: (event: React.DragEvent<HTMLDivElement>) => void

  onItemHover: (item: Item) => (event: React.MouseEvent<HTMLDivElement>) => void

  onItemLeave: () => void

}



function InventoryTab({

  allowInteraction,

  loading,

  equippedBySlot,

  itemsInInventory,

  draggingId,

  equippedAttributes,

  onSlotDrop,

  onSlotDragOver,

  onItemDragStart,

  onItemDragEnd,

  onItemDoubleClick,

  onInventoryDrop,

  onInventoryDragOver,

  onItemHover,

  onItemLeave,

}: InventoryTabProps) {

  return (

    <div style={inventoryTabLayout}>

      <div style={inventoryLeftColumn}>

        <section style={equipmentSection}>

          {allowInteraction ? (

            <div style={equipmentBoard}>

              <div style={silhouette} />

              {EQUIPMENT_SLOTS.map((slot) => {

                const equipped = equippedBySlot[slot.code]

                return (

                  <div

                    key={slot.code}

                    onDrop={onSlotDrop(slot.code)}

                    onDragOver={onSlotDragOver}

                    style={{

                      ...slotBase,

                      top: slot.top,

                      left: slot.left,

                      borderColor: equipped ? '#3fc380' : draggingId ? '#3f7ac3' : '#555',

                    }}

                  >

                    {equipped ? (

                      <div

                        draggable={allowInteraction}

                        onDragStart={allowInteraction ? onItemDragStart(equipped) : undefined}

                        onDragEnd={allowInteraction ? onItemDragEnd : undefined}

                        onMouseMove={onItemHover(equipped)}

                        onMouseLeave={onItemLeave}

                        style={{

                          ...equippedItem,

                          cursor: allowInteraction ? 'grab' : 'default',

                          opacity: allowInteraction ? 1 : 0.95,

                        }}

                      >

                        <span style={itemIcon}>{equipped.icon}</span>

                      </div>

                    ) : (

                      <span style={slotLabel}>{slot.label}</span>

                    )}

                  </div>

                )

              })}

            </div>

          ) : (

            <div style={equipmentPlaceholder}>Equipment is private.</div>

          )}

        </section>

        <section style={attributesSection}>

          <h2 style={sectionTitle}>Attributes</h2>

          {loading ? (

            <p>Loading attributes...</p>

          ) : (

            <ul style={attributeList}>

              {Object.entries(equippedAttributes).map(([key, value]) => (

                <li key={key} style={attributeRow}>

                  <span>{key}</span>

                  <span>{value}</span>

                </li>

              ))}

            </ul>

          )}

        </section>

      </div>

      <aside style={inventorySection}>

        <h2 style={sectionTitle}>Inventory</h2>

        {allowInteraction ? (

          <div style={inventoryBoard} onDrop={onInventoryDrop} onDragOver={onInventoryDragOver}>

            {itemsInInventory.map((item) => (

              <div

                key={item.inventoryId}

                draggable={allowInteraction}

                onDragStart={allowInteraction ? onItemDragStart(item) : undefined}

                onDragEnd={allowInteraction ? onItemDragEnd : undefined}

                onMouseMove={onItemHover(item)}

                onMouseLeave={onItemLeave}

                onDoubleClick={allowInteraction && item.isConsumable ? () => onItemDoubleClick(item) : undefined}

                style={{

                  ...inventoryItem,

                  left: (item.position!.x || 0) * CELL_SIZE,

                  top: (item.position!.y || 0) * CELL_SIZE,

                  borderColor: draggingId === item.inventoryId ? '#3f7ac3' : '#444',

                  cursor: allowInteraction ? 'grab' : 'default',

                }}

              >

                <span style={itemIcon}>{item.icon}</span>

                {item.amount > 1 && <span style={stackBadge}>{item.amount}</span>}

              </div>

            ))}

          </div>

        ) : (

          <div style={inventoryPlaceholder}>Inventory is private.</div>

        )}

      </aside>

    </div>

  )

}



type SpellbookTabProps = {

  allowInteraction: boolean

  slots: SpellSlot[]

  spellLibrary: Spell[]

  fullLibrary: Spell[]

  draggingSpell: DraggingSpellState | null

  focusedSlotKey: string | null

  spellSearch: string

  onSpellSearchChange: (value: string) => void

  onSlotDrop: (slot: SpellSlot) => (event: React.DragEvent<HTMLDivElement>) => void

  onSlotDragOver: (event: React.DragEvent<HTMLDivElement>) => void

  onSlotFocus: (slotKey: string) => void

  onSlotClear: (slot: SpellSlot) => Promise<void>

  onSpellDragStart: (spell: Spell, origin: 'library' | 'slot', slot?: SpellSlot) => (event: React.DragEvent<HTMLDivElement>) => void

  onSpellDragEnd: () => void

  onSpellHover: (spell: Spell) => (event: React.MouseEvent<HTMLDivElement>) => void

  onSpellLeave: () => void

  onLibraryDrop: (event: React.DragEvent<HTMLDivElement>) => void

}



function SpellbookTab({

  allowInteraction,

  slots,

  spellLibrary,

  fullLibrary,

  draggingSpell,

  focusedSlotKey,

  spellSearch,

  onSpellSearchChange,

  onSlotDrop,

  onSlotDragOver,

  onSlotFocus,

  onSlotClear,

  onSpellDragStart,

  onSpellDragEnd,

  onSpellHover,

  onSpellLeave,

  onLibraryDrop,

}: SpellbookTabProps) {

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {

    onSpellSearchChange(event.target.value)

  }



  const hasResults = spellLibrary.length > 0



  return (

    <section style={spellbookSection}>

      <div>

        <h2 style={sectionTitle}>Spellbook</h2>

        <p style={spellDescription}>Drag & drop your spells into slots.</p>

      </div>

      <div style={spellbookLayout}>

        <div

          style={spellLibraryContainer}

          onDrop={allowInteraction ? onLibraryDrop : undefined}

          onDragOver={allowInteraction ? (event) => {

            event.preventDefault()

            if (allowInteraction) event.dataTransfer.dropEffect = 'move'

          } : undefined}

        >

          <div style={spellSearchRow}>

            <input

              type="search"

              value={spellSearch}

              onChange={handleSearchChange}

              placeholder="Search spells..."

              style={spellSearchInput}

            />

            <span style={spellSearchCount}>{`${spellLibrary.length}/${fullLibrary.length}`}</span>

          </div>

          {hasResults ? (

            <SpellList

              spells={spellLibrary}

              allowInteraction={allowInteraction}

              onSpellDragStart={onSpellDragStart}

              onSpellDragEnd={onSpellDragEnd}

              onSpellHover={onSpellHover}

              onSpellLeave={onSpellLeave}

            />

          ) : (

            <div style={spellEmptyMessage}>No spells match the current search.</div>

          )}

        </div>

        <SpellSlotGrid

          slots={slots}

          allowInteraction={allowInteraction}

          draggingSpell={draggingSpell}

          focusedSlotKey={focusedSlotKey}

          onSlotDrop={onSlotDrop}

          onSlotDragOver={onSlotDragOver}

          onSlotFocus={onSlotFocus}

          onSlotClear={onSlotClear}

          onSpellDragStart={onSpellDragStart}

          onSpellDragEnd={onSpellDragEnd}

          onSpellHover={onSpellHover}

          onSpellLeave={onSpellLeave}

        />

      </div>

    </section>

  )

}



type ProfessionTabProps = {

  allowInteraction: boolean

  loading: boolean

  profession: ApiProfession | null

  availableProfessions: ApiProfessionDefinition[]

  error: string | null

  busy: boolean

  onSelect: (professionId: number) => void

  onUnlearn: () => void

  onVisit: () => void

  onTrain: () => void

}



function ProfessionTab({

  allowInteraction,

  loading,

  profession,

  availableProfessions,

  error,

  busy,

  onSelect,

  onUnlearn,

  onVisit,

  onTrain,

}: ProfessionTabProps) {

  const hasProfession = Boolean(profession)

  const selectableProfessions = availableProfessions.filter((item) =>

    profession ? item.id !== profession.id : true,

  )

  return (

    <section style={professionSection}>

      <div style={professionColumns}>

        <div style={professionCard}>

          <h2 style={sectionTitle}>Current Profession</h2>

          {loading ? (

            <p>Loading profession data...</p>

          ) : hasProfession && profession ? (

            <>

              <div style={professionName}>{profession.name}</div>

              {profession.description && <p style={professionDescription}>{profession.description}</p>}

              <div style={professionSkillRow}>

                <span>{`Skill: ${profession.skill}/300`}</span>

                <div style={skillBarWrapper}>

                  <div

                    style={{

                      ...skillBarFill,

                      width: `${Math.max(0, Math.min(100, Math.round((profession.skill / 300) * 100)))}%`,

                    }}

                  />

                </div>

              </div>

              <div style={professionActionsRow}>

                <button type="button" onClick={onVisit} disabled={busy}>

                  Open Crafting

                </button>

                {allowInteraction && (

                  <>

                    <button

                      type="button"

                      onClick={onTrain}

                      disabled={busy || profession.skill >= 300}

                    >

                      {profession.skill >= 300 ? 'Skill Maxed' : 'Train Skill (+1)'}

                    </button>

                    <button type="button" onClick={onUnlearn} disabled={busy}>

                      Unlearn

                    </button>

                  </>

                )}

              </div>

            </>

          ) : (

            <p>{allowInteraction ? 'Choose a profession to begin crafting.' : 'No profession selected.'}</p>

          )}

        </div>

        <div style={professionCard}>

          <h2 style={sectionTitle}>Available Professions</h2>

          {loading ? (

            <p>Loading available professions...</p>

          ) : allowInteraction ? (

            hasProfession ? (

              <p>Unlearn your current profession to choose a new one.</p>

            ) : selectableProfessions.length > 0 ? (

              <div style={professionList}>

                {selectableProfessions.map((item) => (

                  <div key={item.id} style={professionListItem}>

                    <div>

                      <div style={professionListName}>{item.name}</div>

                      {item.description && <div style={professionListDescription}>{item.description}</div>}

                    </div>

                    <button type="button" onClick={() => onSelect(item.id)} disabled={busy}>

                      Learn

                    </button>

                  </div>

                ))}

              </div>

            ) : (

              <p>No professions available.</p>

            )

          ) : availableProfessions.length > 0 ? (

            <ul style={professionPublicList}>

              {availableProfessions.map((item) => (

                <li key={item.id}>

                  <strong>{item.name}</strong>

                  {item.description ? ` — ${item.description}` : ''}

                </li>

              ))}

            </ul>

          ) : (

            <p>Professions can only be chosen by the owner.</p>

          )}

        </div>

      </div>

      {error && <div style={professionError}>{error}</div>}

    </section>

  )

}



type SpellListProps = {

  spells: Spell[]

  allowInteraction: boolean

  onSpellDragStart: (spell: Spell, origin: 'library', slot?: SpellSlot) => (event: React.DragEvent<HTMLDivElement>) => void

  onSpellDragEnd: () => void

  onSpellHover: (spell: Spell) => (event: React.MouseEvent<HTMLDivElement>) => void

  onSpellLeave: () => void

}



function SpellList({ spells, allowInteraction, onSpellDragStart, onSpellDragEnd, onSpellHover, onSpellLeave }: SpellListProps) {

  return (

    <div style={spellList}>

      {spells.map((spell) => {

        const slotLabel = slotCodeToLabel(spell.slotCode)

        return (

          <div

            key={spell.id}

            draggable={allowInteraction}

            onDragStart={allowInteraction ? onSpellDragStart(spell, 'library') : undefined}

            onDragEnd={allowInteraction ? onSpellDragEnd : undefined}

            onMouseMove={onSpellHover(spell)}

            onMouseLeave={onSpellLeave}

            style={{

              ...spellCard,

              cursor: allowInteraction ? 'grab' : 'default',

              opacity: allowInteraction ? 1 : 0.9,

            }}

          >

            <span style={spellIcon}>{spell.icon}</span>

            <div>

              <div style={spellName}>{spell.name}</div>

              <div style={spellMeta}>{`${slotLabel} · Cooldown ${spell.cooldown}s`}</div>













            </div>

          </div>

        )

      })}

    </div>

  )

}

type SpellSlotGridProps = {

  slots: SpellSlot[]

  allowInteraction: boolean

  draggingSpell: DraggingSpellState | null

  focusedSlotKey: string | null

  onSlotDrop: (slot: SpellSlot) => (event: React.DragEvent<HTMLDivElement>) => void

  onSlotDragOver: (event: React.DragEvent<HTMLDivElement>) => void

  onSlotFocus: (slotKey: string) => void

  onSlotClear: (slot: SpellSlot) => Promise<void>

  onSpellDragStart: (spell: Spell, origin: 'slot', slot: SpellSlot) => (event: React.DragEvent<HTMLDivElement>) => void

  onSpellDragEnd: () => void

  onSpellHover: (spell: Spell) => (event: React.MouseEvent<HTMLDivElement>) => void

  onSpellLeave: () => void

}



function SpellSlotGrid({

  slots,

  allowInteraction,

  draggingSpell,

  focusedSlotKey,

  onSlotDrop,

  onSlotDragOver,

  onSlotFocus,

  onSlotClear,

  onSpellDragStart,

  onSpellDragEnd,

  onSpellHover,

  onSpellLeave,

}: SpellSlotGridProps) {

  return (

    <div style={spellSlotsContainer}>

      {slots.map((slot) => (

        <SpellSlot

          key={toSlotKey(slot)}

          slot={slot}

          allowInteraction={allowInteraction}

          draggingSpell={draggingSpell}

          isFocused={focusedSlotKey === toSlotKey(slot)}

          onDrop={onSlotDrop(slot)}

          onDragOver={onSlotDragOver}

          onFocus={() => onSlotFocus(toSlotKey(slot))}

          onClear={() => onSlotClear(slot)}

          onSpellDragStart={onSpellDragStart}

          onSpellDragEnd={onSpellDragEnd}

          onSpellHover={onSpellHover}

          onSpellLeave={onSpellLeave}

        />

      ))}

    </div>

  )

}



type SpellSlotProps = {

  slot: SpellSlot

  allowInteraction: boolean

  draggingSpell: DraggingSpellState | null

  isFocused: boolean

  onDrop: (event: React.DragEvent<HTMLDivElement>) => void

  onDragOver: (event: React.DragEvent<HTMLDivElement>) => void

  onFocus: () => void

  onClear: () => Promise<void>

  onSpellDragStart: (spell: Spell, origin: 'slot', slot: SpellSlot) => (event: React.DragEvent<HTMLDivElement>) => void

  onSpellDragEnd: () => void

  onSpellHover: (spell: Spell) => (event: React.MouseEvent<HTMLDivElement>) => void

  onSpellLeave: () => void

}



function SpellSlot({

  slot,

  allowInteraction,

  draggingSpell,

  isFocused,

  onDrop,

  onDragOver,

  onFocus,

  onClear,

  onSpellDragStart,

  onSpellDragEnd,

  onSpellHover,

  onSpellLeave,

}: SpellSlotProps) {

  const hasSpell = Boolean(slot.spell)

  const isSelfDragged = Boolean(

    draggingSpell?.fromSlot &&

      draggingSpell.fromSlot.slotCode === slot.slotCode &&

      draggingSpell.fromSlot.slotIndex === slot.slotIndex,

  )

  const canAccept = !draggingSpell || draggingSpell.slotCode === slot.slotCode

  const isActiveDrop = Boolean(draggingSpell && !isSelfDragged && canAccept)

  const isRejectingDrop = Boolean(draggingSpell && !isSelfDragged && !canAccept)

  const borderColor = isRejectingDrop

    ? '#ef4444'

    : isActiveDrop

    ? '#3f7ac3'

    : hasSpell

    ? '#3fc380'

    : '#3b4253'

  const background = hasSpell

    ? 'rgba(40,46,58,0.6)'

    : isRejectingDrop

    ? 'rgba(153,27,27,0.2)'

    : 'rgba(15,18,24,0.55)'



  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {

    if (event.key === 'Delete') {

      event.preventDefault()

      void onClear()

    }

  }



  return (

    <div

      tabIndex={allowInteraction ? 0 : -1}

      onFocus={onFocus}

      onClick={onFocus}

      onKeyDown={allowInteraction ? handleKeyDown : undefined}

      onDrop={(event) => {

        if (draggingSpell && draggingSpell.slotCode !== slot.slotCode) {

          event.preventDefault()

          return

        }

        onDrop(event)

      }}

      onDragOver={(event) => {

        if (!allowInteraction) return

        if (draggingSpell && draggingSpell.slotCode !== slot.slotCode) {

          event.preventDefault()

          event.dataTransfer.dropEffect = 'none'

          return

        }

        onDragOver(event)

      }}

      style={{

        ...spellSlotCard,

        borderColor,

        background,

        boxShadow: isFocused ? '0 0 0 2px rgba(63, 122, 195, 0.35)' : 'none',

      }}

    >

      <div style={spellSlotHeader}>

        <span>{slot.slotName}</span>

        <span>{hasSpell ? 'Equipped' : 'Empty'}</span>

      </div>

      {slot.spell ? (

        <div

          draggable={allowInteraction}

          onDragStart={allowInteraction ? onSpellDragStart(slot.spell, 'slot', slot) : undefined}

          onDragEnd={allowInteraction ? onSpellDragEnd : undefined}

          onMouseMove={onSpellHover(slot.spell)}

          onMouseLeave={onSpellLeave}

          style={{

            ...spellSlotContent,

            cursor: allowInteraction ? 'grab' : 'default',

            opacity: allowInteraction ? 1 : 0.95,

          }}

        >

          <span style={spellIcon}>{slot.spell.icon}</span>

          <div>

            <div style={spellName}>{slot.spell.name}</div>

            <div style={spellMeta}>

              {slot.spell.level ? `Level ${slot.spell.level}` : 'Level N/A'} · {`Cooldown ${slot.spell.cooldown}s`}

            </div>

          </div>

        </div>

      ) : (

        <div style={spellSlotEmpty}>{draggingSpell && draggingSpell.slotCode !== slot.slotCode ? `Requires ${slot.slotName}` : allowInteraction ? 'Drop a spell here' : 'No spell assigned'}</div>

      )}

    </div>

  )

}

function mapAttributeList(apiAttributes: ApiAttribute[]): AttributeMap {

  const result: AttributeMap = {}

  for (const attr of apiAttributes) {

    result[attr.name] = attr.value

  }

  return result

}



function buildItems(apiItems: ApiInventoryItem[]): Item[] {

  const inventoryItems: Item[] = []

  let cursorX = 0

  let cursorY = 0



  const advanceCursor = () => {

    cursorX += 1

    if (cursorX >= INVENTORY_COLS) {

      cursorX = 0

      cursorY += 1

    }

  }



  for (const apiItem of apiItems) {

    const base: Item = {

      inventoryId: apiItem.id,

      name: apiItem.name,

      description: apiItem.description,

      amount: apiItem.amount,

      allowedSlots: apiItem.allowedSlots,

      modifiers: mapModifierPairs(apiItem.modifiers),

      slot: apiItem.equippedSlot,

      position: null,

      icon: createIconFromName(apiItem.name),

      isConsumable: apiItem.isConsumable,

    }



    if (!apiItem.equippedSlot) {

      if (cursorY >= INVENTORY_ROWS) {

        base.position = { x: INVENTORY_COLS - 1, y: INVENTORY_ROWS - 1 }

      } else {

        base.position = { x: cursorX, y: cursorY }

        advanceCursor()

      }

    }



    inventoryItems.push(base)

  }



  return inventoryItems

}



function buildSpellState(spellbook: { slots: ApiSpellSlot[]; learned: ApiLearnedSpell[] } | null | undefined) {

  if (!spellbook) return { slots: [] as SpellSlot[], learned: [] as Spell[] }

  return {

    slots: spellbook.slots.map((slot) => ({

      slotCode: slot.slotCode,

      slotIndex: slot.slotIndex,

      slotName: slot.slotName,

      spell: slot.spell ? buildSpell(slot.spell) : null,

    })),

    learned: spellbook.learned.map((spell) => buildSpell(spell)),

  }

}



function buildSpell(spell: ApiSpell | ApiLearnedSpell): Spell {

  return {

    id: spell.id,

    name: spell.name,

    description: spell.description,

    cooldown: spell.cooldown,

    level: 'level' in spell ? (spell as ApiLearnedSpell).level : undefined,

    icon: createIconFromName(spell.name),

    slotCode: spell.slotCode,

  }

}



function createSpellLibrary(allSpells: Spell[], slots: SpellSlot[]): Spell[] {

  const assigned = new Set(slots.filter((slot) => slot.spell).map((slot) => slot.spell!.id))

  return allSpells.filter((spell) => !assigned.has(spell.id))

}



function ensureDefaultSlots(slots: SpellSlot[]): SpellSlot[] {

  const map = new Map(slots.map((slot) => [toSlotKey(slot), slot]))

  const ordered: SpellSlot[] = SPELL_SLOT_BLUEPRINT.map((blueprint) => {

    const existing = map.get(toSlotKey(blueprint))

    if (existing) return existing

    return { ...blueprint, spell: null }

  })

  for (const slot of slots) {

    const key = toSlotKey(slot)

    if (!SPELL_SLOT_BLUEPRINT_KEYS.has(key)) ordered.push(slot)

  }

  return ordered

}



function computeAttributes(base: AttributeMap, items: Item[]): AttributeMap {

  const total: AttributeMap = { ...base }

  for (const item of items) {

    if (!item.slot) continue

    for (const [key, value] of Object.entries(item.modifiers)) {

      total[key] = (total[key] ?? 0) + value

    }

  }

  return total

}



function equipLocally(items: Item[], inventoryId: number, slotCode: string): Item[] {

  return items

    .map((item) => {

      if (item.inventoryId === inventoryId) {

        return { ...item, slot: slotCode, position: null }

      }

      if (item.slot === slotCode) {

        return { ...item, slot: null }

      }

      return item

    })

    .map((item, _, all) => {

      if (!item.position && !item.slot) {

        const pos = findFirstFreeCell(all, item.inventoryId)

        return { ...item, position: pos }

      }

      return item

    })

}



function placeInInventory(items: Item[], inventoryId: number, x: number, y: number): Item[] {

  return items.map((item) =>

    item.inventoryId === inventoryId

      ? {

          ...item,

          slot: null,

          position: { x, y },

        }

      : item,

  )

}



function findFirstFreeCell(items: Item[], ignoreId: number) {

  const occupied = new Set(

    items

      .filter((item) => item.inventoryId !== ignoreId && item.position)

      .map((item) => `${item.position!.x}:${item.position!.y}`),

  )

  for (let row = 0; row < INVENTORY_ROWS; row += 1) {

    for (let col = 0; col < INVENTORY_COLS; col += 1) {

      const key = `${col}:${row}`

      if (!occupied.has(key)) return { x: col, y: row }

    }

  }

  return { x: INVENTORY_COLS - 1, y: INVENTORY_ROWS - 1 }

}



function mapModifierPairs(pairs: Array<{ name: string; value: number }>): AttributeMap {

  const result: AttributeMap = {}

  for (const { name, value } of pairs) {

    result[name] = value

  }

  return result

}



function clamp(value: number, min: number, max: number): number {

  return Math.min(Math.max(value, min), max)

}



async function assertOk(response: Response) {

  if (!response.ok) {

    const data = await response.json().catch(() => ({}))

    throw new Error(data?.error ?? 'Request failed')

  }

}



function createIconFromName(name: string): string {

  const trimmed = name.trim()

  if (!trimmed) return '?'

  return trimmed[0]?.toUpperCase() ?? '?'

}



function parsePayload(transfer: DataTransfer): DragPayload | null {

  const raw = transfer.getData('application/json')

  if (!raw) return null

  try {

    const parsed = JSON.parse(raw)

    if (parsed?.kind === 'item' && typeof parsed.inventoryId === 'number') {

      return { kind: 'item', inventoryId: parsed.inventoryId }

    }

    if (parsed?.kind === 'spell' && typeof parsed.spellId === 'number') {

      const fromSlot = parsed.fromSlot

      if (fromSlot && typeof fromSlot.slotCode === 'string' && Number.isInteger(fromSlot.slotIndex)) {

        return {

          kind: 'spell',

          spellId: parsed.spellId,

          fromSlot: { slotCode: fromSlot.slotCode, slotIndex: Number(fromSlot.slotIndex) },

        }

      }

      return { kind: 'spell', spellId: parsed.spellId }

    }

  } catch (err) {

    console.warn('Invalid drag payload', err)

  }

  return null

}



function appendSpellToLibraryEnd(library: Spell[], spell: Spell): Spell[] {

  const without = library.filter((entry) => entry.id !== spell.id)

  return [...without, spell]

}



function parseCharacterProfession(raw: any): ApiProfession | null {

  if (!raw) return null

  const id = Number(raw?.id ?? raw?.profession?.id ?? 0)

  if (!Number.isFinite(id) || id <= 0) return null

  const skillValue = Number(raw?.skill ?? raw?.profession?.skill ?? 0)

  return {

    id,

    name: String(raw?.name ?? raw?.profession?.name ?? 'Unknown'),

    description:

      raw?.description !== undefined

        ? raw.description === null

          ? null

          : String(raw.description)

        : raw?.profession?.description ?? null,

    skill: clamp(Math.round(skillValue), 1, 300),

  }

}



function parseProfessionDefinitions(raw: any): ApiProfessionDefinition[] {

  if (!Array.isArray(raw)) return []

  const result: ApiProfessionDefinition[] = []

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



function toSlotKey(slot: SlotBlueprint | SpellSlot): string {

  return `${slot.slotCode}:${slot.slotIndex}`

}

const pageShell: React.CSSProperties = {

  display: 'grid',

  gap: 24,

  padding: '16px 0',

  color: '#e5e7eb',

}



const centerMessage: React.CSSProperties = {

  minHeight: '80vh',

  display: 'grid',

  placeItems: 'center',

  fontSize: 18,

}



const header: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'center' }

const title: React.CSSProperties = { margin: 0, fontSize: 28, fontWeight: 600 }

const subtitle: React.CSSProperties = { margin: 0, color: '#9ca3af', fontSize: 14 }



const tabsContainer: React.CSSProperties = {

  display: 'flex',

  gap: 12,

  background: 'rgba(15,18,24,0.8)',

  padding: 8,

  borderRadius: 12,

  width: 'fit-content',

}



const tabButton: React.CSSProperties = {

  padding: '6px 14px',

  borderRadius: 10,

  border: '1px solid transparent',

  background: 'transparent',

  color: '#cbd5f5',

  cursor: 'pointer',

  fontSize: 14,

}



const tabButtonActive: React.CSSProperties = {

  ...tabButton,

  border: '1px solid rgba(59,130,246,0.6)',

  background: 'rgba(37,99,235,0.25)',

}



const inventoryTabLayout: React.CSSProperties = {

  display: 'grid',

  gridTemplateColumns: 'minmax(480px, 1fr) minmax(320px, 360px)',

  gap: 24,

}



const inventoryLeftColumn: React.CSSProperties = { display: 'grid', gap: 24 }



const equipmentSection: React.CSSProperties = {

  background: 'rgba(24,28,36,0.9)',

  borderRadius: 20,

  padding: 24,

  boxShadow: '0 16px 40px rgba(0,0,0,0.35)',

}



const equipmentBoard: React.CSSProperties = {

  position: 'relative',

  width: 360,

  height: 460,

  margin: '0 auto',

}



const silhouette: React.CSSProperties = {

  position: 'absolute',

  top: 0,

  left: 0,

  width: '100%',

  height: '100%',

  borderRadius: 24,

  background: 'radial-gradient(circle at top, rgba(63, 122, 195, 0.2), rgba(15, 18, 24, 0.8))',

  filter: 'blur(12px)',

}



const slotBase: React.CSSProperties = {

  position: 'absolute',

  width: 80,

  height: 80,

  border: '2px dashed #555',

  borderRadius: 16,

  display: 'grid',

  placeItems: 'center',

  background: 'rgba(12,14,18,0.75)',

  color: '#9ca3af',

  textAlign: 'center',

  fontSize: 12,

  padding: 6,

}



const slotLabel: React.CSSProperties = { lineHeight: 1.2 }

const equippedItem: React.CSSProperties = {

  width: '100%',

  height: '100%',

  display: 'grid',

  placeItems: 'center',

  borderRadius: 14,

  background: 'rgba(44,92,60,0.55)',

  border: '1px solid rgba(63,195,128,0.45)',

  cursor: 'grab',

}



const equipmentPlaceholder: React.CSSProperties = {

  padding: '60px 0',

  textAlign: 'center',

  color: '#9ca3af',

}



const itemIcon: React.CSSProperties = { fontSize: 28 }



const attributesSection: React.CSSProperties = {

  background: 'rgba(24,28,36,0.9)',

  borderRadius: 20,

  padding: 24,

  boxShadow: '0 16px 40px rgba(0,0,0,0.35)',

}



const sectionTitle: React.CSSProperties = { margin: '0 0 16px', fontSize: 18, fontWeight: 600 }

const attributeList: React.CSSProperties = { listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 8 }

const attributeRow: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', background: 'rgba(12,14,18,0.5)', borderRadius: 12, padding: '8px 12px', fontSize: 14 }



const inventorySection: React.CSSProperties = {

  background: 'rgba(24,28,36,0.9)',

  borderRadius: 20,

  padding: 24,

  boxShadow: '0 16px 40px rgba(0,0,0,0.35)',

  display: 'grid',

  gap: 16,

  height: 'fit-content',

}



const inventoryBoard: React.CSSProperties = {

  position: 'relative',

  width: INVENTORY_COLS * CELL_SIZE,

  height: INVENTORY_ROWS * CELL_SIZE,

  backgroundColor: '#0f1218',

  backgroundImage: 'linear-gradient(#323744 1px, transparent 1px), linear-gradient(90deg, #323744 1px, transparent 1px)',

  backgroundSize: `${CELL_SIZE}px ${CELL_SIZE}px`,

  borderRadius: 12,

  border: '1px solid #3b4253',

}



const inventoryItem: React.CSSProperties = {

  position: 'absolute',

  width: CELL_SIZE,

  height: CELL_SIZE,

  display: 'grid',

  placeItems: 'center',

  background: 'rgba(40,46,58,0.85)',

  borderRadius: 12,

  border: '2px solid #444',

  cursor: 'grab',

  boxShadow: '0 8px 18px rgba(0,0,0,0.35)',

}



const stackBadge: React.CSSProperties = {

  position: 'absolute',

  bottom: 6,

  right: 6,

  background: 'rgba(12,14,18,0.85)',

  borderRadius: 6,

  padding: '2px 6px',

  fontSize: 12,

}



const inventoryPlaceholder: React.CSSProperties = {

  padding: '20px 0',

  textAlign: 'center',

  color: '#9ca3af',

}

const spellbookSection: React.CSSProperties = {

  background: 'rgba(24,28,36,0.9)',

  borderRadius: 20,

  padding: 24,

  boxShadow: '0 16px 40px rgba(0,0,0,0.35)',

  display: 'grid',

  gap: 24,

}



const spellDescription: React.CSSProperties = { margin: '4px 0 0', color: '#9ca3af', fontSize: 13 }



const spellbookLayout: React.CSSProperties = {

  display: 'grid',

  gridTemplateColumns: 'minmax(220px, 320px) minmax(220px, 1fr)',

  gap: 24,

  alignItems: 'start',

}



const spellLibraryContainer: React.CSSProperties = {

  border: '1px solid #323744',

  borderRadius: 12,

  background: 'rgba(12,15,22,0.7)',

  padding: 16,

  display: 'grid',

  gap: 16,

  minHeight: 260,

}



const spellSearchRow: React.CSSProperties = { display: 'flex', gap: 12, alignItems: 'center' }

const spellSearchInput: React.CSSProperties = {

  flex: 1,

  padding: '8px 12px',

  borderRadius: 10,

  border: '1px solid #3b4253',

  background: 'rgba(9,11,16,0.8)',

  color: '#e5e7eb',

}

const spellSearchCount: React.CSSProperties = { fontSize: 12, color: '#9ca3af' }



const spellList: React.CSSProperties = { display: 'grid', gap: 12, maxHeight: 320, overflowY: 'auto', paddingRight: 4 }

const spellCard: React.CSSProperties = {

  display: 'flex',

  alignItems: 'center',

  gap: 12,

  padding: '10px 12px',

  borderRadius: 10,

  background: 'rgba(28,34,46,0.9)',

  border: '1px solid rgba(63,122,195,0.25)',

}



const spellIcon: React.CSSProperties = {

  width: 36,

  height: 36,

  borderRadius: '50%',

  background: 'rgba(15,18,24,0.85)',

  display: 'grid',

  placeItems: 'center',

  fontWeight: 600,

  color: '#f8fafc',

}



const spellName: React.CSSProperties = { fontWeight: 600, fontSize: 14 }

const spellMeta: React.CSSProperties = { fontSize: 12, color: '#9ca3af' }

const spellEmptyMessage: React.CSSProperties = { color: '#9ca3af', textAlign: 'center', padding: '36px 8px', fontSize: 14 }



const spellSlotsContainer: React.CSSProperties = {

  display: 'grid',

  gap: 16,

}



const spellSlotCard: React.CSSProperties = {

  borderRadius: 12,

  border: '1px solid #3b4253',

  padding: 12,

  background: 'rgba(15,18,24,0.55)',

  display: 'grid',

  gap: 12,

  minHeight: 130,

  outline: 'none',

}



const spellSlotHeader: React.CSSProperties = {

  display: 'flex',

  justifyContent: 'space-between',

  fontSize: 12,

  color: '#9ca3af',

  textTransform: 'uppercase',

  letterSpacing: 0.8,

}



const spellSlotContent: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 12, minHeight: 64 }

const spellSlotEmpty: React.CSSProperties = { color: '#6b7280', fontSize: 13 }



const tooltipBox: React.CSSProperties = {

  position: 'fixed',

  zIndex: 1000,

  pointerEvents: 'none',

  background: 'rgba(17,20,27,0.95)',

  border: '1px solid #3b4253',

  borderRadius: 12,

  padding: '12px 16px',

  color: '#f1f5f9',

  boxShadow: '0 20px 40px rgba(0,0,0,0.35)',

  minWidth: 180,

  transform: 'translate(-50%, -50%)',

}



const errorBox: React.CSSProperties = {

  background: 'rgba(133, 15, 32, 0.4)',

  border: '1px solid rgba(248, 113, 113, 0.6)',

  borderRadius: 12,

  padding: '12px 16px',

  color: '#fecaca',

}



const friendActions: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 12 }

const friendButton: React.CSSProperties = {

  padding: '8px 14px',

  borderRadius: 10,

  border: '1px solid rgba(59,130,246,0.6)',

  background: 'rgba(37,99,235,0.2)',

  color: '#bfdbfe',

  cursor: 'pointer',

  fontSize: 14,

}

const friendSuccess: React.CSSProperties = { color: '#86efac', fontSize: 12 }

const friendErrorText: React.CSSProperties = { color: '#fca5a5', fontSize: 12 }









const professionSection: React.CSSProperties = {

  background: 'rgba(24,28,36,0.9)',

  borderRadius: 20,

  padding: 24,

  boxShadow: '0 16px 40px rgba(0,0,0,0.35)',

  display: 'grid',

  gap: 24,

}



const professionColumns: React.CSSProperties = {

  display: 'grid',

  gap: 24,

  gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',

}



const professionCard: React.CSSProperties = {

  border: '1px solid #323744',

  borderRadius: 16,

  padding: 20,

  background: 'rgba(12,15,22,0.8)',

  display: 'grid',

  gap: 16,

}



const professionName: React.CSSProperties = { fontSize: 20, fontWeight: 600, color: '#f8fafc' }

const professionDescription: React.CSSProperties = { margin: 0, color: '#cbd5f5', fontSize: 13 }

const professionSkillRow: React.CSSProperties = { display: 'grid', gap: 8 }

const skillBarWrapper: React.CSSProperties = { height: 10, borderRadius: 999, background: 'rgba(59,130,246,0.15)', overflow: 'hidden' }

const skillBarFill: React.CSSProperties = { height: '100%', background: 'rgba(59,130,246,0.7)' }

const professionActionsRow: React.CSSProperties = { display: 'flex', gap: 12, flexWrap: 'wrap' }

const professionList: React.CSSProperties = { display: 'grid', gap: 12 }

const professionListItem: React.CSSProperties = {

  display: 'flex',

  justifyContent: 'space-between',

  alignItems: 'center',

  gap: 12,

  padding: '12px 14px',

  borderRadius: 12,

  background: 'rgba(15,18,24,0.7)',

  border: '1px solid rgba(63,122,195,0.25)',

}

const professionListName: React.CSSProperties = { fontWeight: 600, color: '#e2e8f0' }

const professionListDescription: React.CSSProperties = { fontSize: 12, color: '#94a3b8' }

const professionPublicList: React.CSSProperties = { display: 'grid', gap: 8, paddingLeft: 18 }

const professionError: React.CSSProperties = { color: '#fca5a5', fontSize: 13 }





































