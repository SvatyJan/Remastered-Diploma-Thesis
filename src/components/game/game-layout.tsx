import { ReactNode } from 'react';
import { Card } from '@/components/ui/card';

interface GameLayoutProps {
  children: ReactNode;
  title?: string;
  className?: string;
}

export function GameLayout({ children, title, className }: GameLayoutProps) {
  return (
    <div className="min-h-screen bg-background p-4">
      <div className="container mx-auto">
        {title && (
          <div className="mb-6">
            <h1 className="text-3xl font-bold bg-gradient-gold bg-clip-text text-transparent">
              {title}
            </h1>
          </div>
        )}
        <Card className="p-6 bg-card/50 backdrop-blur-sm border-primary/20">
          {children}
        </Card>
      </div>
    </div>
  );
}