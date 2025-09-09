# How to install
docker compose down -v
docker compose up -d
npx prisma generate
npx prisma migrate dev --name init
npm run seed

# How to run
docker compose up -d
npm run dev

# Links
http://localhost:3000
http://localhost:3000/api/characters

https://lovable.dev/projects/b6d78e19-5de2-4407-b047-cb5bac9fb05f

# Mystic Realms - RPG Web Application

A fantasy RPG web application built with React, TypeScript, Tailwind CSS, and shadcn/ui components. Features a complete ports/adapters architecture for easy backend integration.

![Mystic Realms Screenshot](https://img.shields.io/badge/RPG-Fantasy-purple)

## 🎮 Features

- **Character Management**: Stats, equipment, inventory, spellbook
- **Item Shop**: Browse and purchase weapons, armor, consumables  
- **Spell Shop**: Learn magical spells and abilities
- **Turn-based Combat**: Strategic 8x8 grid combat system
- **Social Features**: Friends list, global chat
- **Mock/Real API Toggle**: Easy switch between mock and real backend

## 🏗️ Architecture

### Ports/Adapters Pattern
```
src/
  lib/
    services/        # Service interfaces (ports)
    adapters/        # Mock & Real implementations  
    config.ts        # Environment configuration
  types/             # Shared DTOs and types
  mocks/            # Mock data and MSW handlers
  components/       # Reusable UI components
  pages/            # Application routes
```

### Services Available
- `attributeService` - Character attributes (health, strength, etc.)
- `characterService` - Player character management
- `itemService` - Items and shop functionality  
- `chatService` - Global chat messages
- `friendService` - Friends and social features

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm

### Installation
```bash
# Install dependencies
npm install

# Copy environment config
cp .env.local.example .env.local

# Start development server
npm run dev
```

### Mock Configuration

**Enable Mocks (Default):**
```bash
# .env.local
VITE_API_MOCK=1
```

**Use Real API:**
```bash  
# .env.local
VITE_API_MOCK=0
VITE_API_BASE_URL=http://localhost:3000/api
```

### Quick Scripts
```bash
npm run dev          # Start development server
npm run build        # Build for production  
npm run preview      # Preview production build
```

## 🎯 Game Features

### 🧙‍♂️ Character System
- **6 Core Attributes**: Health, Strength, Agility, Intelligence, Armor, Magic Resist
- **5 Ancestries**: Human, Elf, Dwarf, Orc, Merfolk  
- **Equipment Slots**: Weapon, Offhand, Head, Chest, Legs, Ring, Amulet
- **Experience & Leveling**: Character progression system

### ⚔️ Combat System
- **Turn-based Strategy**: 8x8 grid battlefield
- **Actions**: Move, Attack, Cast Spell
- **Real-time Updates**: Action log and participant tracking

### 🛒 Economy
- **Item Rarities**: Common → Uncommon → Rare → Epic → Legendary
- **Gold Currency**: Purchase items and spells
- **Equipment System**: Stat bonuses and special effects

### 🔮 Magic System  
- **10 Unique Spells**: Combat and utility abilities
- **Cooldown System**: Strategic spell usage
- **Passive Skills**: Always-active bonuses

## 🔧 Backend Integration

### Current State (Mocks)
All services use mock implementations with simulated API delays and realistic data.

### Adding Real Backend

1. **Update Service Implementations**:
```typescript
// src/lib/adapters/itemsReal.ts
class ItemServiceReal implements ItemService {
  async list(): Promise<ItemTemplateDTO[]> {
    const response = await fetch(`${API_CONFIG.baseUrl}/items`);
    return await response.json();
  }
  
  // Add other methods...
}
```

2. **Set Environment**:
```bash
VITE_API_MOCK=0
```

3. **API Endpoints Needed**:
```
GET  /api/items              # List items
POST /api/items/purchase     # Purchase item
GET  /api/character          # Get character 
GET  /api/chat/messages      # Chat history
POST /api/chat/send          # Send message
GET  /api/friends            # Friends list
POST /api/friends/add        # Add friend
```

## 🎨 Design System

The app uses a dark fantasy theme with:

- **Colors**: Gold primary, purple secondary, rarity-based item colors
- **Animations**: Magical pulses, floating elements, shimmer effects  
- **Typography**: Bold headings with gradient text effects
- **Components**: Custom RPG-themed variants for buttons, cards, badges

## 🔮 Mock Data

Includes complete game data:
- **20+ Items**: Weapons, armor, consumables with realistic stats
- **10 Spells**: Combat and utility abilities  
- **5 Monsters**: Various difficulties and types
- **Sample Character**: "Aldor" with equipment and progression

## 📱 Responsive Design

- **Desktop**: Full feature set with keyboard shortcuts
- **Tablet**: Optimized layouts and touch interactions  
- **Mobile**: Essential features with simplified UI

## 🚧 Future Enhancements

- [ ] Real-time multiplayer combat
- [ ] Guild system implementation
- [ ] Quest and achievement system  
- [ ] Advanced crafting mechanics
- [ ] Mobile app with React Native

---

Built with ❤️ for fantasy RPG enthusiasts. Ready for your backend integration!