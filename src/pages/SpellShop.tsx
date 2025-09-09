import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { GameLayout } from '@/components/game/game-layout';
import { useToast } from '@/hooks/use-toast';
import type { SpellDTO } from '@/types/dto';
import { ArrowLeft, Sparkles, Zap, Clock, Coins } from 'lucide-react';

// Mock spells data - in real app this would come from spellService
const mockSpells: SpellDTO[] = [
  { id: 'double_attack', name: 'Double Attack', description: 'Passive: Chance to attack twice', cooldown: 0 },
  { id: 'double_cast', name: 'Double Cast', description: 'Passive: Chance to cast spells twice', cooldown: 0 },
  { id: 'fireball', name: 'Fireball', description: 'Hurls a ball of fire at target', cooldown: 3 },
  { id: 'cleave', name: 'Cleave', description: 'Attacks multiple adjacent enemies', cooldown: 2 },
  { id: 'shiv', name: 'Shiv', description: 'Quick poisonous strike', cooldown: 1 },
  { id: 'ice_lance', name: 'Ice Lance', description: 'Piercing ice projectile', cooldown: 2 },
  { id: 'arcane_bolt', name: 'Arcane Bolt', description: 'Pure magical damage', cooldown: 1 },
  { id: 'heal', name: 'Heal', description: 'Restores health to target', cooldown: 4 },
  { id: 'shield', name: 'Magic Shield', description: 'Grants temporary protection', cooldown: 5 },
  { id: 'poison_dagger', name: 'Poison Dagger', description: 'Throws a poisoned blade', cooldown: 3 },
];

export default function SpellShop() {
  const [spells, setSpells] = useState<SpellDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [knownSpells] = useState<string[]>(['fireball', 'heal', 'arcane_bolt', 'shield']);
  const { toast } = useToast();

  useEffect(() => {
    // Simulate API call
    const loadSpells = async () => {
      try {
        await new Promise(resolve => setTimeout(resolve, 500));
        setSpells(mockSpells);
      } catch (error) {
        toast({
          title: "Failed to load spells",
          description: "Please try again later",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    loadSpells();
  }, [toast]);

  const handleLearnSpell = async (spellId: string, spellName: string) => {
    if (knownSpells.includes(spellId)) {
      toast({
        title: "Spell already known",
        description: `You already know ${spellName}`,
      });
      return;
    }

    // Mock learning logic
    const cost = getSpellCost(spellId);
    toast({
      title: "Spell learned!",
      description: `You learned ${spellName} for ${cost} gold`,
    });
  };

  const getSpellCost = (spellId: string): number => {
    const spell = spells.find(s => s.id === spellId);
    if (!spell) return 100;
    
    if (spell.cooldown === 0) return 500; // Passive spells are expensive
    if (spell.cooldown >= 4) return 300; // High cooldown = powerful = expensive
    if (spell.cooldown >= 2) return 200;
    return 150;
  };

  const getSpellRarity = (spell: SpellDTO): string => {
    if (spell.cooldown === 0) return 'legendary';
    if (spell.cooldown >= 4) return 'epic';
    if (spell.cooldown >= 2) return 'rare';
    return 'uncommon';
  };

  const getSpellIcon = (spellName: string) => {
    if (spellName.toLowerCase().includes('fire')) return '🔥';
    if (spellName.toLowerCase().includes('ice')) return '❄️';
    if (spellName.toLowerCase().includes('heal')) return '💚';
    if (spellName.toLowerCase().includes('shield')) return '🛡️';
    if (spellName.toLowerCase().includes('poison')) return '☠️';
    if (spellName.toLowerCase().includes('arcane')) return '✨';
    return '⚡';
  };

  if (loading) {
    return (
      <GameLayout title="Spell Shop">
        <div className="animate-pulse space-y-4">
          <div className="h-20 bg-muted rounded"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="h-48 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </GameLayout>
    );
  }

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
          <h1 className="text-3xl font-bold bg-gradient-magic bg-clip-text text-transparent flex items-center gap-2">
            <Sparkles className="w-8 h-8 text-primary animate-magical-pulse" />
            Spell Shop
          </h1>
          <div className="flex items-center gap-2 text-primary">
            <Coins className="w-5 h-5" />
            <span className="font-bold">450</span>
          </div>
        </div>

        {/* Spells Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {spells.map(spell => {
            const isKnown = knownSpells.includes(spell.id);
            const cost = getSpellCost(spell.id);
            const rarity = getSpellRarity(spell);
            
            return (
              <Card 
                key={spell.id} 
                className={`hover:bg-accent/5 transition-all ${
                  isKnown ? 'bg-accent/10 border-primary/30' : ''
                } ${rarity === 'legendary' ? 'animate-magical-pulse' : ''}`}
              >
                <CardHeader className="text-center pb-4">
                  <div className="text-4xl mb-2">
                    {getSpellIcon(spell.name)}
                  </div>
                  <CardTitle className="flex items-center justify-center gap-2">
                    {spell.name}
                    {isKnown && (
                      <Badge variant="secondary" className="text-xs">
                        Known
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {spell.description && (
                    <p className="text-sm text-muted-foreground text-center">
                      {spell.description}
                    </p>
                  )}
                  
                  <div className="flex items-center justify-center gap-4 text-sm">
                    {spell.cooldown === 0 ? (
                      <Badge variant="outline" className="bg-rarity-legendary/20 text-rarity-legendary">
                        Passive
                      </Badge>
                    ) : (
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        <span>{spell.cooldown}s cooldown</span>
                      </div>
                    )}
                  </div>

                  <div className="text-center">
                    <div className="flex items-center justify-center gap-2 mb-3 text-lg font-bold text-primary">
                      <Coins className="w-4 h-4" />
                      {cost} gold
                    </div>
                    
                    <Button
                      onClick={() => handleLearnSpell(spell.id, spell.name)}
                      disabled={isKnown}
                      variant={
                        isKnown ? 'secondary' :
                        rarity === 'legendary' ? 'legendary' :
                        rarity === 'epic' ? 'epic' :
                        rarity === 'rare' ? 'magic' : 'default'
                      }
                      className="w-full"
                    >
                      {isKnown ? (
                        <>
                          <Zap className="w-4 h-4" />
                          Already Known
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          Learn Spell
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Card className="bg-gradient-magic border-primary/30">
          <CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground">
              💡 <strong>Tip:</strong> Passive spells are always active once learned. 
              Active spells have cooldowns and consume mana.
            </p>
          </CardContent>
        </Card>
      </div>
    </GameLayout>
  );
}