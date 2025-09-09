import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { GameLayout } from '@/components/game/game-layout';
import { 
  User, 
  ShoppingCart, 
  Sparkles, 
  Swords, 
  MessageSquare, 
  Users,
  Map,
  LogOut
} from 'lucide-react';
import { useEffect } from 'react';

export default function GameHub() {
  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) return; // Don't interfere with browser shortcuts
      
      switch (e.key) {
        case '1':
          window.location.href = '/game/character';
          break;
        case '2':
          window.location.href = '/game/shop';
          break;
        case '3':
          window.location.href = '/game/spellshop';
          break;
        case '4':
          window.location.href = '/game/combat';
          break;
        case '5':
          window.location.href = '/game/chat';
          break;
        case '6':
          window.location.href = '/game/friends';
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  return (
    <GameLayout title="Mystic Realms">
      <div className="grid lg:grid-cols-2 gap-8">
        {/* World Map */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Map className="w-6 h-6 text-primary" />
            World Map
          </h2>
          
          <Card className="bg-gradient-nature border-accent/30">
            <CardContent className="p-8">
              <div className="grid grid-cols-8 gap-2 aspect-square">
                {Array.from({ length: 64 }, (_, i) => {
                  const row = Math.floor(i / 8);
                  const col = i % 8;
                  const isPath = (row + col) % 3 === 0;
                  const isSpecial = (row === 2 && col === 3) || (row === 5 && col === 6);
                  
                  return (
                    <div
                      key={i}
                      className={`
                        aspect-square rounded border transition-all hover:scale-110 cursor-pointer
                        ${isSpecial ? 'bg-primary animate-magical-pulse border-primary' : 
                          isPath ? 'bg-accent/30 border-accent' : 
                          'bg-muted border-muted-foreground/20'}
                      `}
                      title={isSpecial ? 'Special Location' : isPath ? 'Safe Path' : 'Wilderness'}
                    />
                  );
                })}
              </div>
              <p className="text-center mt-4 text-muted-foreground">
                Explore the mystical lands (Click tiles to travel)
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Game Menu */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold">Game Menu</h2>
          
          <div className="grid gap-4">
            <Card className="hover:bg-card/80 transition-all">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between">
                  Character Sheet
                  <span className="text-sm text-muted-foreground">[1]</span>
                </CardTitle>
                <CardDescription>
                  View stats, equipment, and inventory
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <Button asChild variant="magic" className="w-full">
                  <Link to="/game/character">
                    <User className="w-4 h-4" />
                    Open Character
                  </Link>
                </Button>
              </CardContent>
            </Card>

            <div className="grid md:grid-cols-2 gap-4">
              <Card className="hover:bg-card/80 transition-all">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center justify-between text-lg">
                    Item Shop
                    <span className="text-sm text-muted-foreground">[2]</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <Button asChild variant="gold" size="sm" className="w-full">
                    <Link to="/game/shop">
                      <ShoppingCart className="w-4 h-4" />
                      Browse Items
                    </Link>
                  </Button>
                </CardContent>
              </Card>

              <Card className="hover:bg-card/80 transition-all">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center justify-between text-lg">
                    Spell Shop
                    <span className="text-sm text-muted-foreground">[3]</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <Button asChild variant="epic" size="sm" className="w-full">
                    <Link to="/game/spellshop">
                      <Sparkles className="w-4 h-4" />
                      Learn Spells
                    </Link>
                  </Button>
                </CardContent>
              </Card>

              <Card className="hover:bg-card/80 transition-all">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center justify-between text-lg">
                    Combat Arena
                    <span className="text-sm text-muted-foreground">[4]</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <Button asChild variant="combat" size="sm" className="w-full">
                    <Link to="/game/combat">
                      <Swords className="w-4 h-4" />
                      Enter Battle
                    </Link>
                  </Button>
                </CardContent>
              </Card>

              <Card className="hover:bg-card/80 transition-all">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center justify-between text-lg">
                    Chat
                    <span className="text-sm text-muted-foreground">[5]</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <Button asChild variant="nature" size="sm" className="w-full">
                    <Link to="/game/chat">
                      <MessageSquare className="w-4 h-4" />
                      Global Chat
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </div>

            <Card className="hover:bg-card/80 transition-all">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between">
                  Friends & Guild
                  <span className="text-sm text-muted-foreground">[6]</span>
                </CardTitle>
                <CardDescription>
                  Manage your social connections
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <Button asChild variant="secondary" className="w-full">
                  <Link to="/game/friends">
                    <Users className="w-4 h-4" />
                    View Friends
                  </Link>
                </Button>
              </CardContent>
            </Card>

            <div className="pt-4 border-t">
              <Button variant="outline" className="w-full" asChild>
                <Link to="/login">
                  <LogOut className="w-4 h-4" />
                  Return to Login
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 text-center text-sm text-muted-foreground">
        <p>Use keyboard shortcuts [1-6] to quickly navigate between sections</p>
      </div>
    </GameLayout>
  );
}