import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Swords, Sparkles, Crown } from 'lucide-react';

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Auto redirect to login after a moment for demo purposes
    const timer = setTimeout(() => {
      navigate('/login');
    }, 3000);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="w-full max-w-lg bg-card/50 backdrop-blur-sm border-primary/20 text-center">
        <CardHeader className="space-y-4">
          <div className="flex items-center justify-center gap-4">
            <Swords className="w-12 h-12 text-primary animate-float" />
            <Crown className="w-16 h-16 text-primary animate-magical-pulse" />
            <Sparkles className="w-12 h-12 text-primary animate-float" />
          </div>
          <CardTitle className="text-4xl font-bold bg-gradient-gold bg-clip-text text-transparent">
            Welcome to Mystic Realms
          </CardTitle>
          <CardDescription className="text-lg">
            An epic RPG adventure awaits you in a world of magic, monsters, and legendary treasures.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-muted-foreground">
            Create your hero, explore mystical lands, battle fearsome creatures, and forge legendary friendships.
          </p>
          
          <div className="space-y-3">
            <Button 
              onClick={() => navigate('/login')} 
              variant="legendary"
              size="lg"
              className="w-full"
            >
              Enter the Realm
            </Button>
            <Button 
              onClick={() => navigate('/game')} 
              variant="magic"
              size="lg" 
              className="w-full"
            >
              Continue Adventure
            </Button>
          </div>

          <div className="text-sm text-muted-foreground">
            Redirecting to login in 3 seconds...
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Index;