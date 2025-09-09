import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { GameLayout } from '@/components/game/game-layout';
import { friendService } from '@/lib/services';
import { useToast } from '@/hooks/use-toast';
import { AddFriendSchema } from '@/lib/validators';
import type { FriendDTO } from '@/types/dto';
import { 
  ArrowLeft, 
  Users, 
  UserPlus, 
  UserX, 
  MessageSquare,
  Shield,
  ShieldCheck
} from 'lucide-react';

export default function Friends() {
  const [friends, setFriends] = useState<FriendDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newFriendName, setNewFriendName] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const loadFriends = async () => {
      try {
        const data = await friendService.list();
        setFriends(data);
      } catch (error) {
        toast({
          title: "Failed to load friends",
          description: "Please try again later",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    loadFriends();
  }, [toast]);

  const handleAddFriend = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const validatedData = AddFriendSchema.parse({ name: newFriendName });
      
      setAdding(true);
      const result = await friendService.add(validatedData.name);
      
      if (result.success) {
        // Refresh friends list
        const updatedFriends = await friendService.list();
        setFriends(updatedFriends);
        setNewFriendName('');
        setDialogOpen(false);
        
        toast({
          title: "Friend added!",
          description: result.message,
        });
      } else {
        toast({
          title: "Failed to add friend",
          description: result.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Invalid name",
        description: "Please enter a valid player name",
        variant: "destructive",
      });
    } finally {
      setAdding(false);
    }
  };

  const handleBlockFriend = async (friendId: string, friendName: string) => {
    try {
      const result = await friendService.block(friendId);
      
      if (result.success) {
        const updatedFriends = await friendService.list();
        setFriends(updatedFriends);
        
        toast({
          title: "Player blocked",
          description: `${friendName} has been blocked`,
        });
      }
    } catch (error) {
      toast({
        title: "Failed to block player",
        description: "Please try again",
        variant: "destructive",
      });
    }
  };

  const handleUnblockFriend = async (friendId: string, friendName: string) => {
    try {
      const result = await friendService.unblock(friendId);
      
      if (result.success) {
        const updatedFriends = await friendService.list();
        setFriends(updatedFriends);
        
        toast({
          title: "Player unblocked",
          description: `${friendName} has been unblocked`,
        });
      }
    } catch (error) {
      toast({
        title: "Failed to unblock player",
        description: "Please try again",
        variant: "destructive",
      });
    }
  };

  const activeFriends = friends.filter(f => f.status === 'friend');
  const blockedFriends = friends.filter(f => f.status === 'blocked');

  if (loading) {
    return (
      <GameLayout title="Friends & Guild">
        <div className="animate-pulse space-y-4">
          <div className="h-20 bg-muted rounded"></div>
          <div className="grid gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-20 bg-muted rounded"></div>
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
          <h1 className="text-3xl font-bold bg-gradient-nature bg-clip-text text-transparent flex items-center gap-2">
            <Users className="w-8 h-8 text-accent" />
            Friends & Guild
          </h1>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="magic">
                <UserPlus className="w-4 h-4" />
                Add Friend
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Friend</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAddFriend} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="friendName">Player Name</Label>
                  <Input
                    id="friendName"
                    value={newFriendName}
                    onChange={(e) => setNewFriendName(e.target.value)}
                    placeholder="Enter player name..."
                    disabled={adding}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setDialogOpen(false)}
                    disabled={adding}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={adding || !newFriendName.trim()}>
                    {adding ? 'Adding...' : 'Add Friend'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Friends List */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Friends ({activeFriends.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {activeFriends.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No friends yet</p>
                    <p className="text-sm">Add some friends to begin your adventures together!</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {activeFriends.map(friend => (
                      <div 
                        key={friend.id}
                        className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent/20 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-magic flex items-center justify-center">
                            <Users className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="font-medium">{friend.name}</div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">
                                <div className="w-2 h-2 bg-green-500 rounded-full mr-1"></div>
                                Online
                              </Badge>
                              <span className="text-xs text-muted-foreground">Level 12</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm">
                            <MessageSquare className="w-3 h-3" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleBlockFriend(friend.id, friend.name)}
                          >
                            <UserX className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Blocked Players */}
            {blockedFriends.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="w-5 h-5" />
                    Blocked Players ({blockedFriends.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {blockedFriends.map(blocked => (
                      <div 
                        key={blocked.id}
                        className="flex items-center justify-between p-3 rounded-lg border bg-destructive/5"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-destructive/20 flex items-center justify-center">
                            <UserX className="w-4 h-4 text-destructive" />
                          </div>
                          <div>
                            <div className="font-medium text-muted-foreground">{blocked.name}</div>
                            <Badge variant="destructive" className="text-xs">Blocked</Badge>
                          </div>
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleUnblockFriend(blocked.id, blocked.name)}
                        >
                          <ShieldCheck className="w-3 h-3" />
                          Unblock
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Guild Section */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Guild Status
                </CardTitle>
              </CardHeader>
              <CardContent className="text-center py-8">
                <div className="text-muted-foreground space-y-4">
                  <Shield className="w-16 h-16 mx-auto opacity-50" />
                  <div>
                    <h3 className="font-medium mb-2">No Guild</h3>
                    <p className="text-sm">
                      Join a guild to access exclusive quests, group dungeons, and guild rewards!
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Button variant="magic" className="w-full">
                      Find Guild
                    </Button>
                    <Button variant="outline" className="w-full">
                      Create Guild
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="text-base">Friend Suggestions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {['Frodo', 'Samwise', 'Meriadoc', 'Peregrin'].map(player => (
                    <div key={player} className="flex items-center justify-between p-2 rounded hover:bg-accent/20">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center">
                          <Users className="w-3 h-3" />
                        </div>
                        <span className="text-sm">{player}</span>
                        <Badge variant="outline" className="text-xs">Lvl 8</Badge>
                      </div>
                      <Button variant="outline" size="sm">
                        <UserPlus className="w-3 h-3" />
                      </Button>
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