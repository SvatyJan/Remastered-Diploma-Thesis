import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { GameLayout } from '@/components/game/game-layout';
import { RarityBadge } from '@/components/ui/rarity-badge';
import { itemService } from '@/lib/services';
import { useToast } from '@/hooks/use-toast';
import type { ItemTemplateDTO, Rarity } from '@/types/dto';
import { ArrowLeft, Search, ShoppingCart, Coins } from 'lucide-react';

export default function Shop() {
  const [items, setItems] = useState<ItemTemplateDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchFilter, setSearchFilter] = useState('');
  const [rarityFilter, setRarityFilter] = useState<Rarity | 'all'>('all');
  const { toast } = useToast();

  useEffect(() => {
    const loadItems = async () => {
      try {
        const data = await itemService.list();
        setItems(data);
      } catch (error) {
        toast({
          title: "Failed to load shop items",
          description: "Please try again later",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    loadItems();
  }, [toast]);

  const handlePurchase = async (itemId: string, itemName: string, price: number) => {
    try {
      const result = await itemService.purchase(itemId, 'current_player');
      toast({
        title: result.success ? "Purchase successful!" : "Purchase failed",
        description: result.success 
          ? `You bought ${itemName} for ${price} gold`
          : result.message,
        variant: result.success ? "default" : "destructive",
      });
    } catch (error) {
      toast({
        title: "Purchase error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    }
  };

  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchFilter.toLowerCase());
    const matchesRarity = rarityFilter === 'all' || item.rarity === rarityFilter;
    return matchesSearch && matchesRarity;
  });

  const shopItems = filteredItems.filter(item => 
    !['gold_coin', 'diamond'].includes(item.id)
  );

  if (loading) {
    return (
      <GameLayout title="Item Shop">
        <div className="animate-pulse space-y-4">
          <div className="h-20 bg-muted rounded"></div>
          <div className="grid gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-32 bg-muted rounded"></div>
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
          <h1 className="text-3xl font-bold bg-gradient-gold bg-clip-text text-transparent flex items-center gap-2">
            <ShoppingCart className="w-8 h-8 text-primary" />
            Item Shop
          </h1>
          <div className="flex items-center gap-2 text-primary">
            <Coins className="w-5 h-5" />
            <span className="font-bold">450</span>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Browse Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <Input
                  placeholder="Search items..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                />
              </div>
              <Select value={rarityFilter} onValueChange={(value) => setRarityFilter(value as Rarity | 'all')}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Filter by rarity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Rarities</SelectItem>
                  <SelectItem value="common">Common</SelectItem>
                  <SelectItem value="uncommon">Uncommon</SelectItem>
                  <SelectItem value="rare">Rare</SelectItem>
                  <SelectItem value="epic">Epic</SelectItem>
                  <SelectItem value="legendary">Legendary</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Items Grid */}
        <div className="grid gap-4">
          {shopItems.map(item => (
            <Card key={item.id} className="hover:bg-accent/5 transition-colors">
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-bold text-lg">{item.name}</h3>
                      <RarityBadge rarity={item.rarity} showIcon />
                      {item.isEquipable && item.slotCode && (
                        <Badge variant="outline" className="capitalize">
                          {item.slotCode}
                        </Badge>
                      )}
                      {item.isConsumable && (
                        <Badge variant="secondary">Consumable</Badge>
                      )}
                    </div>
                    {item.description && (
                      <p className="text-muted-foreground mb-2">{item.description}</p>
                    )}
                    {item.attributes && item.attributes.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {item.attributes.map(attr => (
                          <Badge key={attr.attributeId} variant="outline" className="text-xs">
                            +{attr.value} {attr.attributeId.replace('_', ' ')}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col sm:items-end gap-2">
                    <div className="flex items-center gap-2 text-lg font-bold text-primary">
                      <Coins className="w-4 h-4" />
                      {item.valueGold}
                    </div>
                    <Button
                      onClick={() => handlePurchase(item.id, item.name, item.valueGold)}
                      variant={item.rarity === 'legendary' ? 'legendary' : 
                              item.rarity === 'epic' ? 'epic' :
                              item.rarity === 'rare' ? 'magic' : 'gold'}
                      size="sm"
                    >
                      <ShoppingCart className="w-4 h-4" />
                      Buy Now
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {shopItems.length === 0 && (
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-muted-foreground">No items found matching your criteria</p>
            </CardContent>
          </Card>
        )}
      </div>
    </GameLayout>
  );
}