import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { GameLayout } from '@/components/game/game-layout';
import { chatService } from '@/lib/services';
import { useToast } from '@/hooks/use-toast';
import { SendMessageSchema } from '@/lib/validators';
import type { ChatMessageDTO } from '@/types/dto';
import { ArrowLeft, MessageSquare, Send, Users } from 'lucide-react';

export default function Chat() {
  const [messages, setMessages] = useState<ChatMessageDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    const loadMessages = async () => {
      try {
        const data = await chatService.list();
        setMessages(data.reverse()); // Show newest at bottom
      } catch (error) {
        toast({
          title: "Failed to load chat",
          description: "Please try again later",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    loadMessages();

    // Simulate real-time updates by polling every 5 seconds
    const interval = setInterval(loadMessages, 5000);
    return () => clearInterval(interval);
  }, [toast]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const validatedData = SendMessageSchema.parse({ text: newMessage });
      
      setSending(true);
      await chatService.send(validatedData.text);
      
      // Refresh messages after sending
      const updatedMessages = await chatService.list();
      setMessages(updatedMessages.reverse());
      
      setNewMessage('');
      
    } catch (error) {
      toast({
        title: "Failed to send message",
        description: "Please check your message and try again",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getPlayerColor = (playerName: string) => {
    // Generate consistent colors for players
    const colors = [
      'text-rarity-uncommon',
      'text-rarity-rare', 
      'text-rarity-epic',
      'text-primary',
      'text-accent',
    ];
    
    const hash = playerName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  if (loading) {
    return (
      <GameLayout title="Global Chat">
        <div className="animate-pulse space-y-4">
          <div className="h-20 bg-muted rounded"></div>
          <div className="h-96 bg-muted rounded"></div>
          <div className="h-12 bg-muted rounded"></div>
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
            <MessageSquare className="w-8 h-8 text-accent" />
            Global Chat
          </h1>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Users className="w-4 h-4" />
            <span className="text-sm">12 online</span>
          </div>
        </div>

        <div className="grid lg:grid-cols-4 gap-6">
          {/* Main Chat */}
          <div className="lg:col-span-3">
            <Card className="h-[500px] flex flex-col">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" />
                  Realm Chat
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col p-0">
                {/* Messages */}
                <ScrollArea className="flex-1 px-4">
                  <div className="space-y-3 py-4">
                    {messages.map(message => (
                      <div 
                        key={message.id}
                        className={`flex flex-col space-y-1 ${
                          message.from === 'Aldor' ? 'items-end' : 'items-start'
                        }`}
                      >
                        <div className={`
                          max-w-[80%] p-3 rounded-lg
                          ${message.from === 'Aldor' 
                            ? 'bg-primary text-primary-foreground ml-auto' 
                            : 'bg-muted'
                          }
                        `}>
                          {message.from !== 'Aldor' && (
                            <div className={`text-xs font-medium mb-1 ${getPlayerColor(message.from)}`}>
                              {message.from}
                            </div>
                          )}
                          <div className="text-sm">{message.text}</div>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatTime(message.at)}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>

                {/* Message Input */}
                <div className="p-4 border-t">
                  <form onSubmit={handleSendMessage} className="flex gap-2">
                    <Input
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Type your message..."
                      disabled={sending}
                      maxLength={500}
                      className="flex-1"
                    />
                    <Button type="submit" disabled={sending || !newMessage.trim()}>
                      <Send className="w-4 h-4" />
                    </Button>
                  </form>
                  <div className="text-xs text-muted-foreground mt-1">
                    {newMessage.length}/500 characters
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Online Players */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Online Players
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {['Aldor', 'Gandalf', 'Legolas', 'Aragorn', 'Gimli', 'Boromir'].map((player, index) => (
                    <div key={player} className="flex items-center justify-between p-2 rounded hover:bg-accent/20">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className={`text-sm font-medium ${getPlayerColor(player)}`}>
                          {player}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Lvl {5 + index}
                      </div>
                    </div>
                  ))}
                  <div className="pt-2 border-t text-center">
                    <div className="text-xs text-muted-foreground">
                      6 players in realm
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="text-base">Chat Commands</CardTitle>
              </CardHeader>
              <CardContent className="text-xs space-y-1 text-muted-foreground">
                <div>/who - List online players</div>
                <div>/whisper [name] - Private message</div>
                <div>/guild - Guild chat</div>
                <div>/help - Show all commands</div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </GameLayout>
  );
}