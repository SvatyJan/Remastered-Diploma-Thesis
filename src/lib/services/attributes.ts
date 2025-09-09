import type { AttributeDTO } from '@/types/dto';
import { USE_MOCK } from '@/lib/config';

// Port/Interface
export interface AttributeService {
  list(): Promise<AttributeDTO[]>;
}

// Mock implementation
class AttributeServiceMock implements AttributeService {
  async list(): Promise<AttributeDTO[]> {
    const { mockAttributes } = await import('@/mocks/data');
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 100));
    return mockAttributes;
  }
}

// Real implementation (TODO)
class AttributeServiceReal implements AttributeService {
  async list(): Promise<AttributeDTO[]> {
    // TODO: Implement real API call
    // Example: const response = await fetch(`${API_CONFIG.baseUrl}/attributes`);
    // return await response.json();
    throw new Error('Real AttributeService not implemented yet. Set VITE_API_MOCK=1 to use mock data.');
  }
}

// Default export - switches based on USE_MOCK flag
const attributeService: AttributeService = USE_MOCK 
  ? new AttributeServiceMock()
  : new AttributeServiceReal();

export default attributeService;