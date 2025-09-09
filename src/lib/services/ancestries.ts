import type { AncestryDTO } from '@/types/dto';
import { USE_MOCK } from '@/lib/config';

export interface AncestryService {
  list(): Promise<AncestryDTO[]>;
}

class AncestryServiceMock implements AncestryService {
  async list(): Promise<AncestryDTO[]> {
    const { mockAncestries } = await import('@/mocks/data');
    await new Promise(resolve => setTimeout(resolve, 100));
    return mockAncestries;
  }
}

class AncestryServiceReal implements AncestryService {
  async list(): Promise<AncestryDTO[]> {
    // TODO: Implement with fetch('/api/ancestries') or server actions
    throw new Error('Real AncestryService not implemented yet. Set VITE_API_MOCK=1 to use mock data.');
  }
}

const ancestryService: AncestryService = USE_MOCK 
  ? new AncestryServiceMock()
  : new AncestryServiceReal();

export default ancestryService;