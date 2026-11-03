import { Conversation, Message, Project, UserSettings, VerifiedFreeModel, Attachment } from '../types';

const API_BASE = '/api';

function getUserId(): string {
  let userId = localStorage.getItem('aether_user_id');
  if (!userId) {
    userId = `user-${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('aether_user_id', userId);
  }
  return userId;
}

const getHeaders = (): HeadersInit => ({
  'Content-Type': 'application/json',
  'x-user-id': getUserId(),
});

export const api = {
  // Models
  async getModels(refresh = false): Promise<VerifiedFreeModel[]> {
    const endpoint = refresh ? `${API_BASE}/models/refresh` : `${API_BASE}/models`;
    const res = await fetch(endpoint, {
      method: refresh ? 'POST' : 'GET',
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to load free models');
    const json = await res.json();
    return json.data || [];
  },

  // Conversations
  async getConversations(): Promise<Conversation[]> {
    const res = await fetch(`${API_BASE}/conversations`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to load conversations');
    const json = await res.json();
    return json.data || [];
  },

  async getConversation(id: string): Promise<Conversation & { messages: Message[] }> {
    const res = await fetch(`${API_BASE}/conversations/${id}`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to load conversation');
    const json = await res.json();
    return json.data;
  },

  async createConversation(data: Partial<Conversation>): Promise<Conversation> {
    const res = await fetch(`${API_BASE}/conversations`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to create conversation');
    const json = await res.json();
    return json.data;
  },

  async updateConversation(id: string, updates: Partial<Conversation>): Promise<Conversation> {
    const res = await fetch(`${API_BASE}/conversations/${id}`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error('Failed to update conversation');
    const json = await res.json();
    return json.data;
  },

  async deleteConversation(id: string): Promise<boolean> {
    const res = await fetch(`${API_BASE}/conversations/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    return res.ok;
  },

  async deleteAllConversations(): Promise<boolean> {
    const res = await fetch(`${API_BASE}/conversations`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    return res.ok;
  },

  // Messages
  async saveMessage(msg: Partial<Message>): Promise<Message> {
    const res = await fetch(`${API_BASE}/messages`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(msg),
    });
    if (!res.ok) throw new Error('Failed to save message');
    const json = await res.json();
    return json.data;
  },

  // Uploads
  async uploadFile(file: File): Promise<Attachment> {
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch(`${API_BASE}/upload`, {
      method: 'POST',
      headers: {
        'x-user-id': getUserId(),
      },
      body: formData,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'File upload failed');
    }

    const json = await res.json();
    return json.data;
  },

  // Projects
  async getProjects(): Promise<Project[]> {
    const res = await fetch(`${API_BASE}/projects`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to load projects');
    const json = await res.json();
    return json.data || [];
  },

  async createProject(project: Partial<Project>): Promise<Project> {
    const res = await fetch(`${API_BASE}/projects`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(project),
    });
    if (!res.ok) throw new Error('Failed to create project');
    const json = await res.json();
    return json.data;
  },

  async updateProject(id: string, updates: Partial<Project>): Promise<Project> {
    const res = await fetch(`${API_BASE}/projects/${id}`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error('Failed to update project');
    const json = await res.json();
    return json.data;
  },

  async deleteProject(id: string): Promise<boolean> {
    const res = await fetch(`${API_BASE}/projects/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    return res.ok;
  },

  // Settings
  async getSettings(): Promise<UserSettings> {
    const res = await fetch(`${API_BASE}/settings`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to load settings');
    const json = await res.json();
    return json.data;
  },

  async updateSettings(updates: Partial<UserSettings>): Promise<UserSettings> {
    const res = await fetch(`${API_BASE}/settings`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error('Failed to update settings');
    const json = await res.json();
    return json.data;
  },

  async testOpenRouter(): Promise<{ success: boolean; message: string; modelCount?: number }> {
    const res = await fetch(`${API_BASE}/settings/test-openrouter`, { headers: getHeaders() });
    return res.json();
  },
};

