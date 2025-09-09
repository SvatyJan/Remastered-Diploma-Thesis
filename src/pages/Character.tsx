import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { GameLayout } from '@/components/game/game-layout';
import { RarityBadge } from '@/components/ui/rarity-badge';
import { StatBar } from '@/components/ui/stat-bar';
import { characterService } from '@/lib/services';
import { useToast } from '@/hooks/use-toast';
import type { CharacterSheetDTO } from '@/types/dto';
import { 
  ArrowLeft, 
  Search, 
  Filter,
  Sword,
  Shield,
  Crown,
  Shirt,
  CircleOff,
  Gem,
  Zap
} from 'lucide-react';

export default function Character() {
  const [character, setCharacter] = useState<CharacterSheetDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [inventoryFilter, setInventoryFilter] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    const loadCharacter = async () => {
      try {
        const data = await characterService.get();
        setCharacter(data);
      } catch (error) {
        toast({
          title: "Failed to load character",
          description: "Please try again later",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    loadCharacter();
  }, [toast]);

  const handleEquipClick = (slotCode: string, itemId?: string) => {
    toast({
      title: "Feature not implemented",
      description: "Equipment changes coming soon!",
    });
  };

  const getSlotIcon = (slotCode: string) => {
    switch (slotCode) {
      case 'weapon': return <Sword className="w-4 h-4" />;
      case 'offhand': return <Shield className="w-4 h-4" />;
      case 'head': return <Crown className="w-4 h-4" />;
      case 'chest': 
      case 'legs': return <Shirt className="w-4 h-4" />;
      case 'ring':
      case 'amulet': return <Gem className="w-4 h-4" />;
      default: return <CircleOff className="w-4 h-4" />;
    }
  };

  const filteredInventory = character?.inventory.filter(item =>
    item.name.toLowerCase().includes(inventoryFilter.toLowerCase())
  ) || [];

  if (loading) {
    return (
      <GameLayout title="Character Sheet">
        <div className="animate-pulse space-y-4">
          <div className="h-32 bg-muted rounded"></div>
          <div className="grid lg:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div className="h-64 bg-muted rounded"></div>
              <div className="h-48 bg-muted rounded"></div>
            </div>
            <div className="h-96 bg-muted rounded"></div>
          </div>
        </div>
      </GameLayout>
    );
  }

  if (!character) {
    return (
      <GameLayout title="Character Sheet">
        <div className="text-center py-8">
          <p className="text-muted-foreground">Character not found</p>
          <Button asChild className="mt-4">
            <Link to="/game">Return to Game</Link>
          </Button>
        </div>
      </GameLayout>
    );
  }

  const equipmentSlots = ['weapon', 'offhand', 'head', 'chest', 'legs', 'ring', 'amulet'];

  return (
    <GameLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button variant="outline" asChild>
            <Link to="/game">
              <ArrowLeft className="w-4 h-4" />
              Back to Game
            </Link>
          </Button>
          <h1 className="text-3xl font-bold bg-gradient-gold bg-clip-text text-transparent">
            Character Sheet
          </h1>
          <div className="w-20" /> {/* Spacer */}
        </div>

        {/* Character Info */}
        <Card className="bg-gradient-magic border-primary/30">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row md:items-center gap-6">
              <div className="flex-1">
                <div className="flex items-center gap-4 mb-4">
                  <h2 className="text-2xl font-bold">{character.name}</h2>
                  <Badge variant="secondary">Level {character.level}</Badge>
                  <Badge variant="outline">{character.ancestryName}</Badge>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">{character.gold}</div>
                    <div className="text-sm text-muted-foreground">Gold</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-accent">{character.xp}</div>
                    <div className="text-sm text-muted-foreground">Experience</div>
                  </div>
                  <div className="text-center md:col-span-1 col-span-2">
                    <div className="text-2xl font-bold text-rarity-rare">{character.spellbook.length}</div>
                    <div className="text-sm text-muted-foreground">Spells Known</div>
                  </div>
                </div>
              </div>
              <StatBar 
                label="Experience Progress"
                current={character.xp % 1000}
                max={1000}
                type="xp"
                className="md:w-48"
              />
            </div>
          </CardContent>
        </Card>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left Column: Equipment & Stats */}
          <div className="space-y-6">
            {/* Equipment */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Equipment
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {equipmentSlots.map(slot => {
                    const equippedItem = character.equipment.find(eq => eq.slotCode === slot);
                    return (
                      <Card 
                        key={slot}
                        className={`p-3 cursor-pointer hover:bg-accent/50 transition-colors ${
                          equippedItem ? 'bg-accent/20' : 'bg-muted/20'
                        }`}
                        onClick={() => handleEquipClick(slot, equippedItem?.itemName)}
                      >
                        <div className="text-center space-y-2">
                          <div className="flex justify-center text-muted-foreground">
                            {getSlotIcon(slot)}
                          </div>
                          <div className="text-xs font-medium capitalize text-muted-foreground">
                            {slot}
                          </div>
                          {equippedItem ? (
                            <div className="text-sm font-medium text-primary">
                              {equippedItem.itemName}
                            </div>
                          ) : (
                            <div className="text-xs text-muted-foreground">Empty</div>
                          )}
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Stats */}
            <Card>
              <CardHeader>
                <CardTitle>Character Stats</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(character.stats).map(([stat, value]) => (
                    <div key={stat} className="flex items-center justify-between">
                      <span className="font-medium capitalize">
                        {stat.replace('_', ' ')}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-primary">{value}</span>
                        {stat === 'health' && (
                          <StatBar
                            label=""
                            current={value}
                            max={value}
                            type="health"
                            className="w-24"
                            showValues={false}
                          />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Inventory & Spellbook */}
          <div className="space-y-6">
            {/* Inventory */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Search className="w-5 h-5" />
                    Inventory ({character.inventory.length})
                  </CardTitle>
                  <Button variant="outline" size="sm">
                    <Filter className="w-4 h-4" />
                  </Button>
                </div>
                <Input
                  placeholder="Search items..."
                  value={inventoryFilter}
                  onChange={(e) => setInventoryFilter(e.target.value)}
                />
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {filteredInventory.map(item => (
                    <div 
                      key={item.id}
                      className="flex items-center justify-between p-3 rounded-md hover:bg-accent/20 cursor-pointer transition-colors"
                      onClick={() => handleEquipClick('', item.id)}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{item.name}</span>
                          <RarityBadge rarity={item.rarity} />
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        x{item.qty}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Spellbook */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-5 h-5" />
                  Spellbook ({character.spellbook.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2">
                  {character.spellbook.map(spell => (
                    <Card 
                      key={spell.id}
                      className="p-3 hover:bg-accent/20 cursor-pointer transition-colors"
                    >
                      <div className="text-center">
                        <Zap className="w-6 h-6 mx-auto mb-2 text-rarity-epic" />
                        <div className="text-sm font-medium">{spell.name}</div>
                      </div>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </GameLayout>
  );
}