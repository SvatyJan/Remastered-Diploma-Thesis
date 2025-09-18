import React from 'react'
import GameLayout from '../components/GameLayout'
import { useRequireGameSession } from '../hooks/useRequireGameSession'

export default function ShopPage() {
  useRequireGameSession()

  return <GameLayout><div /></GameLayout>
}
