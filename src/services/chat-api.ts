import { apiClient } from '../hooks/use-connection';

export interface Participant {
  id: string;
  username: string;
  displayName?: string | null;
  avatar?: string | null;
  isAdmin: boolean;
  joinedAt: string;
  lastReadAt: string | null;
}

export interface LastMessage {
  id: string;
  content: string | null;
  type: 'text' | 'image' | 'video' | 'audio' | 'document' | 'event_share';
  senderId: string;
  createdAt: string;
  isDeleted: boolean;
  mediaUrl: string | null;
}

export interface Conversation {
  id: string;
  type: 'private' | 'group';
  name: string | null;
  avatar: string | null;
  createdAt: string;
  updatedAt: string;
  participants: Participant[];
  lastMessage: LastMessage | null;
  unreadCount: number;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderUsername?: string;
  senderDisplayName?: string;
  senderAvatar?: string | null;
  type: 'text' | 'image' | 'video' | 'audio' | 'document' | 'event_share';
  content?: string | null;
  mediaUrl?: string | null;
  mediaType?: string | null;
  mediaSize?: number | null;
  mediaName?: string | null;
  eventType?: string | null;
  eventId?: string | null;
  replyToId?: string | null;
  createdAt: string;
  isDeleted: boolean;
  status?: 'sending' | 'sent' | 'error';
  isSending?: boolean;
}

export interface SendMessagePayload {
  type?: 'text' | 'image' | 'video' | 'audio' | 'document' | 'event_share';
  content?: string;
  mediaUrl?: string;
  mediaType?: string;
  mediaSize?: number;
  mediaName?: string;
  eventType?: string;
  eventId?: string;
  replyToId?: string;
}

export interface CreateConversationPayload {
  type: 'private' | 'group';
  participantIds: (string | number)[];
  name?: string;
  avatar?: string;
}

export interface UserItem {
  id: string | number;
  username?: string;
  displayName?: string;
  avatar?: string | null;
  name?: string;
  full_name?: string;
  avatar_img?: string;
  division?: string;
}

const BASE = 'api/messages';

export const getConversations = async (): Promise<Conversation[]> => {
  const res = await apiClient.get<Conversation[]>(`${BASE}/conversations`);
  return res.data;
};

export const createConversation = async (
  payload: CreateConversationPayload,
): Promise<Conversation> => {
  const res = await apiClient.post<Conversation>(
    `${BASE}/conversations`,
    payload,
  );
  return res.data;
};

export const getMessages = async (
  conversationId: string,
  limit = 50,
  offset = 0,
): Promise<Message[]> => {
  const res = await apiClient.get<Message[]>(
    `${BASE}/conversations/${conversationId}/messages?limit=${limit}&offset=${offset}`,
  );
  return res.data;
};

export const sendMessage = async (
  conversationId: string,
  payload: SendMessagePayload,
): Promise<Message> => {
  const res = await apiClient.post<Message>(
    `${BASE}/conversations/${conversationId}/messages`,
    payload,
  );
  return res.data;
};

export const markConversationRead = async (
  conversationId: string,
): Promise<void> => {
  await apiClient.post(`${BASE}/conversations/${conversationId}/read`);
};

export const getUsers = async (): Promise<UserItem[]> => {
  const res = await apiClient.get<UserItem[]>(`${BASE}/users`);
  return res.data;
};

export const uploadAttachment = async (
  formData: FormData,
): Promise<{ url: string; filename: string; mimetype: string; size: number }> => {
  const res = await apiClient.post(`${BASE}/upload`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return res.data;
};

export const registerFcmToken = async (fcmToken: string): Promise<void> => {
  await apiClient.post(`${BASE}/fcm-token`, { fcm_token: fcmToken });
};
