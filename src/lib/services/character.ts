import type { CharacterSheetDTO } from '@/types/dto';
import { USE_MOCK } from '@/lib/config';

export interface CharacterService {
  get(): Promise<CharacterSheetDTO>;
  updateStats(stats: Partial<CharacterSheetDTO['stats']>): Promise<CharacterSheetDTO>;
  equipItem(slotCode: string, itemId: string): Promise<{ success: boolean; message: string }>;
  unequipItem(slotCode: string): Promise<{ success: boolean; message: string }>;
}

class CharacterServiceMock implements CharacterService {
  private character: CharacterSheetDTO | null = null;

  async get(): Promise<CharacterSheetDTO> {
    if (!this.character) {
      const { mockCharacter } = await import('@/mocks/data');
      this.character = { ...mockCharacter };
    }
    await new Promise(resolve => setTimeout(resolve, 100));
    return { ...this.character };
  }

  async updateStats(stats: Partial<CharacterSheetDTO['stats']>): Promise<CharacterSheetDTO> {
    if (!this.character) {
      await this.get();
    }
    const filteredStats = Object.fromEntries(
      Object.entries(stats).filter(([_, v]) => v !== undefined)
    ) as { [k: string]: number };
    this.character!.stats = { ...this.character!.stats, ...filteredStats };
    await new Promise(resolve => setTimeout(resolve, 150));
    return { ...this.character! };
  }

  async equipItem(slotCode: string, itemId: string): Promise<{ success: boolean; message: string }> {
    await new Promise(resolve => setTimeout(resolve, 200));
    // Mock equip logic
    return { success: true, message: `Equipped item to ${slotCode} slot` };
  }

  async unequipItem(slotCode: string): Promise<{ success: boolean; message: string }> {
    await new Promise(resolve => setTimeout(resolve, 150));
    return { success: true, message: `Unequipped item from ${slotCode} slot` };
  }
}

class CharacterServiceReal implements CharacterService {
  async get(): Promise<CharacterSheetDTO> {
    // TODO: fetch(`${API_CONFIG.baseUrl}/character`)
    throw new Error('Real CharacterService not implemented yet. Set VITE_API_MOCK=1 to use mock data.');
  }

  async updateStats(stats: Partial<CharacterSheetDTO['stats']>): Promise<CharacterSheetDTO> {
    // TODO: PATCH to /api/character/stats
    throw new Error('Real CharacterService not implemented yet. Set VITE_API_MOCK=1 to use mock data.');
  }

  async equipItem(slotCode: string, itemId: string): Promise<{ success: boolean; message: string }> {
    // TODO: POST to /api/character/equip
    throw new Error('Real CharacterService not implemented yet. Set VITE_API_MOCK=1 to use mock data.');
  }

  async unequipItem(slotCode: string): Promise<{ success: boolean; message: string }> {
    // TODO: POST to /api/character/unequip
    throw new Error('Real CharacterService not implemented yet. Set VITE_API_MOCK=1 to use mock data.');
  }
}

const characterService: CharacterService = USE_MOCK 
  ? new CharacterServiceMock()
  : new CharacterServiceReal();

export default characterService;