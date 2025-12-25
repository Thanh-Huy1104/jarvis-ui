import type { ChatSession, ChatMessage } from '../types/session';

export const getSessions = async (apiEndpoint: string, limit: number = 20, offset: number = 0): Promise<ChatSession[]> => {
  const response = await fetch(`${apiEndpoint}/sessions?limit=${limit}&offset=${offset}`);
  if (!response.ok) {
    throw new Error('Failed to fetch sessions');
  }
  return response.json();
};

export const createSession = async (apiEndpoint: string): Promise<{ session_id: string }> => {
  const response = await fetch(`${apiEndpoint}/sessions`, {
    method: 'POST',
  });
  if (!response.ok) {
    throw new Error('Failed to create session');
  }
  return response.json();
};

export const getSessionHistory = async (apiEndpoint: string, sessionId: string): Promise<ChatMessage[]> => {
  const response = await fetch(`${apiEndpoint}/history/${sessionId}`);
  if (!response.ok) {
    throw new Error('Failed to fetch session history');
  }
  return response.json();
};
