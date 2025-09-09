import type { ItemTemplateDTO } from '@/types/dto';
import { USE_MOCK } from '@/lib/config';

export interface ItemService {
  list(): Promise<ItemTemplateDTO[]>;
  create(input: Omit<ItemTemplateDTO, 'id'>): Promise<ItemTemplateDTO>;
  purchase(itemId: string, playerId: string): Promise<{ success: boolean; message: string }>;
}

class ItemServiceMock implements ItemService {
  async list(): Promise<ItemTemplateDTO[]> {
    const { mockItems } = await import('@/mocks/data');
    await new Promise(resolve => setTimeout(resolve, 150));
    return mockItems;
  }

  async create(input: Omit<ItemTemplateDTO, 'id'>): Promise<ItemTemplateDTO> {
    await new Promise(resolve => setTimeout(resolve, 200));
    const newItem: ItemTemplateDTO = {
      ...input,
      id: `item_${Date.now()}`,
    };
    // TODO: In real implementation, save to backend
    return newItem;
  }

  async purchase(itemId: string, playerId: string): Promise<{ success: boolean; message: string }> {
    await new Promise(resolve => setTimeout(resolve, 100));
    // Mock purchase logic
    const random = Math.random();
    if (random > 0.9) {
      return { success: false, message: 'Insufficient gold!' };
    }
    return { success: true, message: 'Item purchased successfully!' };
  }
}

class ItemServiceReal implements ItemService {
  async list(): Promise<ItemTemplateDTO[]> {
    // TODO: fetch(`${API_CONFIG.baseUrl}/items`)
    throw new Error('Real ItemService not implemented yet. Set VITE_API_MOCK=1 to use mock data.');
  }

  async create(input: Omit<ItemTemplateDTO, 'id'>): Promise<ItemTemplateDTO> {
    // TODO: POST to /api/items with validation
    throw new Error('Real ItemService not implemented yet. Set VITE_API_MOCK=1 to use mock data.');
  }

  async purchase(itemId: string, playerId: string): Promise<{ success: boolean; message: string }> {
    // TODO: POST to /api/items/purchase
    throw new Error('Real ItemService not implemented yet. Set VITE_API_MOCK=1 to use mock data.');
  }
}

const itemService: ItemService = USE_MOCK 
  ? new ItemServiceMock()
  : new ItemServiceReal();

export default itemService;