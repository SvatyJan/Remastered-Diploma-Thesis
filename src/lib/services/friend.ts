import type { FriendDTO } from '@/types/dto';
import { USE_MOCK } from '@/lib/config';

export interface FriendService {
  list(): Promise<FriendDTO[]>;
  add(name: string): Promise<{ success: boolean; message: string }>;
  block(id: string): Promise<{ success: boolean; message: string }>;
  unblock(id: string): Promise<{ success: boolean; message: string }>;
}

class FriendServiceMock implements FriendService {
  private friends: FriendDTO[] = [];

  async list(): Promise<FriendDTO[]> {
    if (this.friends.length === 0) {
      const { mockFriends } = await import('@/mocks/data');
      this.friends = [...mockFriends];
    }
    await new Promise(resolve => setTimeout(resolve, 100));
    return [...this.friends];
  }

  async add(name: string): Promise<{ success: boolean; message: string }> {
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // Check if already exists
    const existing = this.friends.find(f => f.name.toLowerCase() === name.toLowerCase());
    if (existing) {
      return { success: false, message: 'Player is already in your friends list' };
    }

    // Mock: 10% chance player not found
    if (Math.random() < 0.1) {
      return { success: false, message: 'Player not found' };
    }

    const newFriend: FriendDTO = {
      id: `friend_${Date.now()}`,
      name,
      status: 'friend',
    };

    this.friends.push(newFriend);
    return { success: true, message: `${name} added to friends` };
  }

  async block(id: string): Promise<{ success: boolean; message: string }> {
    await new Promise(resolve => setTimeout(resolve, 150));
    
    const friendIndex = this.friends.findIndex(f => f.id === id);
    if (friendIndex === -1) {
      return { success: false, message: 'Friend not found' };
    }

    this.friends[friendIndex].status = 'blocked';
    return { success: true, message: 'Player blocked' };
  }

  async unblock(id: string): Promise<{ success: boolean; message: string }> {
    await new Promise(resolve => setTimeout(resolve, 150));
    
    const friendIndex = this.friends.findIndex(f => f.id === id);
    if (friendIndex === -1) {
      return { success: false, message: 'Player not found' };
    }

    this.friends[friendIndex].status = 'friend';
    return { success: true, message: 'Player unblocked' };
  }
}

class FriendServiceReal implements FriendService {
  async list(): Promise<FriendDTO[]> {
    // TODO: fetch(`${API_CONFIG.baseUrl}/friends`)
    throw new Error('Real FriendService not implemented yet. Set VITE_API_MOCK=1 to use mock data.');
  }

  async add(name: string): Promise<{ success: boolean; message: string }> {
    // TODO: POST to /api/friends/add
    throw new Error('Real FriendService not implemented yet. Set VITE_API_MOCK=1 to use mock data.');
  }

  async block(id: string): Promise<{ success: boolean; message: string }> {
    // TODO: POST to /api/friends/block
    throw new Error('Real FriendService not implemented yet. Set VITE_API_MOCK=1 to use mock data.');
  }

  async unblock(id: string): Promise<{ success: boolean; message: string }> {
    // TODO: POST to /api/friends/unblock
    throw new Error('Real FriendService not implemented yet. Set VITE_API_MOCK=1 to use mock data.');
  }
}

const friendService: FriendService = USE_MOCK 
  ? new FriendServiceMock()
  : new FriendServiceReal();

export default friendService;