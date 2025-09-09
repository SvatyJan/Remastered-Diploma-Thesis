import { cn } from "@/lib/utils";

interface StatBarProps {
  label: string;
  current: number;
  max: number;
  type?: 'health' | 'mana' | 'stamina' | 'xp';
  className?: string;
  showValues?: boolean;
}

const typeStyles = {
  health: "bg-combat-health",
  mana: "bg-combat-mana", 
  stamina: "bg-combat-stamina",
  xp: "bg-primary",
};

export function StatBar({ 
  label, 
  current, 
  max, 
  type = 'health', 
  className,
  showValues = true 
}: StatBarProps) {
  const percentage = Math.min((current / max) * 100, 100);

  return (
    <div className={cn("space-y-1", className)}>
      <div className="flex justify-between text-sm">
        <span className="font-medium">{label}</span>
        {showValues && (
          <span className="text-muted-foreground">
            {current}/{max}
          </span>
        )}
      </div>
      <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
        <div
          className={cn(
            "h-full transition-all duration-300 ease-out rounded-full",
            typeStyles[type]
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}