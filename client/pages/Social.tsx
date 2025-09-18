import React from 'react'
import GameLayout from '../components/GameLayout'
import { useRequireGameSession } from '../hooks/useRequireGameSession'

export default function SocialPage() {
  useRequireGameSession()

  return <GameLayout><div /></GameLayout>
}
