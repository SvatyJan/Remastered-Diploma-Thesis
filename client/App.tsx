import React from 'react'
import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom'
import LoginPage from './pages/Login'
import RegisterPage from './pages/Register'
import CharactersPage from './pages/Characters'
import CreateCharacterPage from './pages/CreateCharacter'
import WorldPage from './pages/World'
import CharacterPage from './pages/Character'
import SocialPage from './pages/Social'
import ShopPage from './pages/Shop'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/characters" element={<CharactersPage />} />
        <Route path="/characters/new" element={<CreateCharacterPage />} />
        <Route path="/world" element={<WorldPage />} />
        <Route path="/character" element={<CharacterPage />} />
        <Route path="/social" element={<SocialPage />} />
        <Route path="/shop" element={<ShopPage />} />
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  )
}

function NotFound() {
  return (
    <div style={container}>
      <h1>Page not found</h1>
      <Link to="/login">Go to Login</Link>
    </div>
  )
}

const container: React.CSSProperties = {
  display: 'grid',
  placeItems: 'center',
  height: '100vh',
  gap: 12,
  fontFamily: 'system-ui, sans-serif',
}
