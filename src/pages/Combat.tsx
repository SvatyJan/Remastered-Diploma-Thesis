import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { GameLayout } from '@/components/game/game-layout';
import { StatBar } from '@/components/ui/stat-bar';
import { useToast } from '@/hooks/use-toast';
import type { CombatStateDTO, CombatActionDTO } from '@/types/dto';
import { ArrowLeft, Swords, Move, Zap, Shield, User, Skull } from 'lucide-react';
import { mockCombatState } from '@/mocks/data';

export default function Combat() {
  const [combatState, setCombatState] = useState<CombatStateDTO>(mockCombatState);
  const [selectedAction, setSelectedAction] = useState<'move' | 'attack' | 'cast' | null>(null);
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);
  const { toast } = useToast();

  const currentParticipant = combatState.participants.find(p => p.id === combatState.currentTurn);
  
  const handleTileClick = (x: number, y: number) => {
    if (!currentParticipant) return;
    
    const targetParticipant = combatState.participants.find(
      p => p.position.x === x && p.position.y === y
    );

    if (selectedAction === 'move' && !targetParticipant) {
      // Move to empty tile
      const newAction: CombatActionDTO = {
        id: `action_${Date.now()}`,
        type: 'move',
        participantId: currentParticipant.id,
        position: { x, y },
        message: `${currentParticipant.name} moved to (${x},${y})`,
        timestamp: new Date().toISOString(),
      };
      
      // Update participant position
      const updatedParticipants = combatState.participants.map(p => 
        p.id === currentParticipant.id ? { ...p, position: { x, y } } : p
      );
      
      // Add to action log and advance turn
      setCombatState(prev => ({
        ...prev,
        participants: updatedParticipants,
        actionLog: [newAction, ...prev.actionLog],
        currentTurn: getNextTurn(prev.currentTurn, prev.participants),
      }));
      
      setSelectedAction(null);
      toast({ title: "Moved successfully" });
      
    } else if (selectedAction === 'attack' && targetParticipant && targetParticipant.id !== currentParticipant.id) {
      // Attack target
      const damage = Math.floor(Math.random() * 20) + 5;
      const newHealth = Math.max(0, targetParticipant.health - damage);
      
      const newAction: CombatActionDTO = {
        id: `action_${Date.now()}`,
        type: 'attack',
        participantId: currentParticipant.id,
        targetId: targetParticipant.id,
        message: `${currentParticipant.name} attacked ${targetParticipant.name} for ${damage} damage`,
        timestamp: new Date().toISOString(),
      };
      
      // Update target health
      const updatedParticipants = combatState.participants.map(p => 
        p.id === targetParticipant.id ? { ...p, health: newHealth } : p
      );
      
      setCombatState(prev => ({
        ...prev,
        participants: updatedParticipants,
        actionLog: [newAction, ...prev.actionLog],
        currentTurn: getNextTurn(prev.currentTurn, prev.participants),
      }));
      
      setSelectedAction(null);
      toast({ 
        title: `Attack hit for ${damage} damage!`,
        description: newHealth === 0 ? `${targetParticipant.name} was defeated!` : undefined
      });
    }
  };

  const handleCastSpell = (spellId: string) => {
    if (!currentParticipant || !selectedTarget) return;
    
    const target = combatState.participants.find(p => p.id === selectedTarget);
    if (!target) return;
    
    const spellNames: Record<string, string> = {
      fireball: 'Fireball',
      heal: 'Heal',
      arcane_bolt: 'Arcane Bolt',
      shield: 'Magic Shield',
    };
    
    const spellName = spellNames[spellId] || 'Unknown Spell';
    const isHeal = spellId === 'heal';
    const effect = isHeal ? Math.floor(Math.random() * 30) + 20 : Math.floor(Math.random() * 25) + 10;
    
    const newAction: CombatActionDTO = {
      id: `action_${Date.now()}`,
      type: 'cast',
      participantId: currentParticipant.id,
      targetId: target.id,
      spellId,
      message: isHeal 
        ? `${currentParticipant.name} healed ${target.name} for ${effect} HP`
        : `${currentParticipant.name} cast ${spellName} on ${target.name} for ${effect} damage`,
      timestamp: new Date().toISOString(),
    };
    
    // Update target health
    const newHealth = isHeal 
      ? Math.min(target.maxHealth, target.health + effect)
      : Math.max(0, target.health - effect);
      
    const updatedParticipants = combatState.participants.map(p => 
      p.id === target.id ? { ...p, health: newHealth } : p
    );
    
    setCombatState(prev => ({
      ...prev,
      participants: updatedParticipants,
      actionLog: [newAction, ...prev.actionLog],
      currentTurn: getNextTurn(prev.currentTurn, prev.participants),
    }));
    
    setSelectedAction(null);
    setSelectedTarget(null);
    toast({ title: `${spellName} cast successfully!` });
  };

  const getNextTurn = (currentId: string, participants: typeof combatState.participants): string => {
    const aliveParticipants = participants.filter(p => p.health > 0);
    const currentIndex = aliveParticipants.findIndex(p => p.id === currentId);
    const nextIndex = (currentIndex + 1) % aliveParticipants.length;
    return aliveParticipants[nextIndex]?.id || currentId;
  };

  const renderCombatGrid = () => {
    const grid = [];
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        const participant = combatState.participants.find(
          p => p.position.x === x && p.position.y === y
        );
        
        const isClickable = selectedAction === 'move' && !participant;
        const isAttackTarget = selectedAction === 'attack' && participant && participant.id !== combatState.currentTurn;
        
        grid.push(
          <div
            key={`${x}-${y}`}
            className={`
              aspect-square border border-border bg-muted/20 hover:bg-accent/30 cursor-pointer
              transition-all duration-200 rounded flex items-center justify-center text-xs
              ${isClickable ? 'bg-accent/50 hover:bg-accent' : ''}
              ${isAttackTarget ? 'bg-destructive/30 hover:bg-destructive/50' : ''}
              ${participant?.id === combatState.currentTurn ? 'ring-2 ring-primary' : ''}
            `}
            onClick={() => handleTileClick(x, y)}
            title={participant ? `${participant.name} (${participant.health}/${participant.maxHealth} HP)` : `(${x},${y})`}
          >
            {participant && (
              <div className="text-center">
                {participant.type === 'player' ? (
                  <User className="w-4 h-4 text-primary" />
                ) : (
                  <Skull className="w-4 h-4 text-destructive" />
                )}
                <div className="text-xs mt-1">
                  {participant.health}
                </div>
              </div>
            )}
          </div>
        );
      }
    }
    return grid;
  };

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
          <h1 className="text-3xl font-bold bg-gradient-combat bg-clip-text text-transparent flex items-center gap-2">
            <Swords className="w-8 h-8 text-destructive" />
            Combat Arena
          </h1>
          <Badge variant={combatState.isActive ? "destructive" : "secondary"}>
            {combatState.isActive ? "Active" : "Ended"}
          </Badge>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Combat Grid */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Battlefield
                  {currentParticipant && (
                    <Badge variant="outline">
                      {currentParticipant.name}'s Turn
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-8 gap-1 p-4 bg-background/50 rounded-lg">
                  {renderCombatGrid()}
                </div>
                
                {/* Action Buttons */}
                {currentParticipant?.type === 'player' && (
                  <div className="flex gap-2 mt-4">
                    <Button
                      variant={selectedAction === 'move' ? 'default' : 'outline'}
                      onClick={() => setSelectedAction(selectedAction === 'move' ? null : 'move')}
                    >
                      <Move className="w-4 h-4" />
                      Move
                    </Button>
                    <Button
                      variant={selectedAction === 'attack' ? 'destructive' : 'outline'}
                      onClick={() => setSelectedAction(selectedAction === 'attack' ? null : 'attack')}
                    >
                      <Swords className="w-4 h-4" />
                      Attack
                    </Button>
                    <Button
                      variant={selectedAction === 'cast' ? 'magic' : 'outline'}
                      onClick={() => setSelectedAction(selectedAction === 'cast' ? null : 'cast')}
                    >
                      <Zap className="w-4 h-4" />
                      Cast
                    </Button>
                  </div>
                )}

                {/* Spell Selection */}
                {selectedAction === 'cast' && (
                  <div className="mt-4 p-4 border rounded-lg">
                    <h4 className="font-medium mb-2">Select Spell:</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {['fireball', 'heal', 'arcane_bolt', 'shield'].map(spell => (
                        <Button
                          key={spell}
                          variant="outline"
                          size="sm"
                          onClick={() => handleCastSpell(spell)}
                          disabled={!selectedTarget}
                        >
                          <Zap className="w-3 h-3" />
                          {spell.replace('_', ' ')}
                        </Button>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Click a participant on the grid to target them
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Participants & Log */}
          <div className="space-y-6">
            {/* Participants */}
            <Card>
              <CardHeader>
                <CardTitle>Participants</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {combatState.participants.map(participant => (
                  <div 
                    key={participant.id}
                    className={`p-3 rounded border cursor-pointer transition-colors ${
                      participant.id === combatState.currentTurn ? 'border-primary bg-primary/10' : 'border-border'
                    } ${selectedAction === 'cast' ? 'hover:bg-accent/20' : ''}`}
                    onClick={() => {
                      if (selectedAction === 'cast') {
                        setSelectedTarget(participant.id);
                      }
                    }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      {participant.type === 'player' ? (
                        <User className="w-4 h-4 text-primary" />
                      ) : (
                        <Skull className="w-4 h-4 text-destructive" />
                      )}
                      <span className="font-medium">{participant.name}</span>
                      {participant.id === selectedTarget && (
                        <Badge variant="outline">Targeted</Badge>
                      )}
                    </div>
                    <StatBar
                      label="Health"
                      current={participant.health}
                      max={participant.maxHealth}
                      type="health"
                    />
                    <div className="text-xs text-muted-foreground mt-1">
                      Position: ({participant.position.x}, {participant.position.y})
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Action Log */}
            <Card>
              <CardHeader>
                <CardTitle>Action Log</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {combatState.actionLog.map(action => (
                    <div key={action.id} className="text-sm p-2 rounded bg-muted/50">
                      <div className="flex items-center gap-2">
                        {action.type === 'move' && <Move className="w-3 h-3" />}
                        {action.type === 'attack' && <Swords className="w-3 h-3 text-destructive" />}
                        {action.type === 'cast' && <Zap className="w-3 h-3 text-primary" />}
                        <span>{action.message}</span>
                      </div>
                    </div>
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