import type { ChatMessageDTO } from '@/types/dto';
import { USE_MOCK } from '@/lib/config';

export interface ChatService {
  list(): Promise<ChatMessageDTO[]>;
  send(text: string): Promise<void>;
}

class ChatServiceMock implements ChatService {
  private messages: ChatMessageDTO[] = [];

  async list(): Promise<ChatMessageDTO[]> {
    if (this.messages.length === 0) {
      const { mockChatMessages } = await import('@/mocks/data');
      this.messages = [...mockChatMessages];
    }
    await new Promise(resolve => setTimeout(resolve, 100));
    return [...this.messages];
  }

  async send(text: string): Promise<void> {
    const newMessage: ChatMessageDTO = {
      id: `msg_${Date.now()}`,
      from: 'Aldor', // Current player
      text,
      at: new Date().toISOString(),
    };
    
    this.messages.push(newMessage);
    await new Promise(resolve => setTimeout(resolve, 200));
  }
}

class ChatServiceReal implements ChatService {
  async list(): Promise<ChatMessageDTO[]> {
    // TODO: fetch(`${API_CONFIG.baseUrl}/chat/messages`)
    throw new Error('Real ChatService not implemented yet. Set VITE_API_MOCK=1 to use mock data.');
  }

  async send(text: string): Promise<void> {
    // TODO: POST to /api/chat/send with WebSocket support
    throw new Error('Real ChatService not implemented yet. Set VITE_API_MOCK=1 to use mock data.');
  }
}

const chatService: ChatService = USE_MOCK 
  ? new ChatServiceMock()
  : new ChatServiceReal();

export default chatService;