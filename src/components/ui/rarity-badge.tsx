import { cn } from "@/lib/utils";
import type { Rarity } from "@/types/dto";
import { Sparkles } from "lucide-react";

interface RarityBadgeProps {
  rarity: Rarity;
  className?: string;
  showIcon?: boolean;
}

const rarityStyles = {
  common: "bg-rarity-common/20 text-rarity-common border-rarity-common/30",
  uncommon: "bg-rarity-uncommon/20 text-rarity-uncommon border-rarity-uncommon/30",
  rare: "bg-rarity-rare/20 text-rarity-rare border-rarity-rare/30 animate-shimmer",
  epic: "bg-rarity-epic/20 text-rarity-epic border-rarity-epic/30 animate-shimmer",
  legendary: "bg-rarity-legendary/20 text-rarity-legendary border-rarity-legendary/30 animate-magical-pulse",
};

export function RarityBadge({ rarity, className, showIcon = false }: RarityBadgeProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 px-2 py-1 rounded-md border text-xs font-medium capitalize",
        rarityStyles[rarity],
        className
      )}
    >
      {showIcon && (rarity === 'epic' || rarity === 'legendary') && (
        <Sparkles className="w-3 h-3" />
      )}
      {rarity}
    </div>
  );
}