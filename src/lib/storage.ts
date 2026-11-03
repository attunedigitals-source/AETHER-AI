import { Conversation, Message, Project, UserSettings, VerifiedFreeModel, Attachment, OpenRouterConfig } from '../types';

const API_BASE = '/api';

function getUserId(): string {
  let userId = localStorage.getItem('aether_user_id');
  if (!userId) {
    userId = `user-${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('aether_user_id', userId);
  }
  return userId;
}

export function getOpenRouterConfig(): OpenRouterConfig {
  try {
    const raw = localStorage.getItem('aether_openrouter_config');
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (_) {}

  return {
    apiKey: '',
    baseUrl: 'https://openrouter.ai/api/v1',
    appName: 'Aether AI',
    siteUrl: typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173',
  };
}

export function saveOpenRouterConfig(config: Partial<OpenRouterConfig>): OpenRouterConfig {
  const current = getOpenRouterConfig();
  const updated = { ...current, ...config };
  localStorage.setItem('aether_openrouter_config', JSON.stringify(updated));
  return updated;
}

export function clearOpenRouterConfig() {
  localStorage.removeItem('aether_openrouter_config');
}

export const getHeaders = (): Record<string, string> => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-user-id': getUserId(),
  };

  const orConfig = getOpenRouterConfig();
  if (orConfig.apiKey?.trim()) {
    headers['x-openrouter-key'] = orConfig.apiKey.trim();
  }
  if (orConfig.baseUrl?.trim()) {
    headers['x-openrouter-base-url'] = orConfig.baseUrl.trim();
  }
  if (orConfig.appName?.trim()) {
    headers['x-openrouter-app-name'] = orConfig.appName.trim();
  }
  if (orConfig.siteUrl?.trim()) {
    headers['x-openrouter-site-url'] = orConfig.siteUrl.trim();
  }

  return headers;
};

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

  async testOpenRouter(customConfig?: Partial<OpenRouterConfig>): Promise<{ success: boolean; message: string; modelCount?: number }> {
    const cfg = customConfig ? { ...getOpenRouterConfig(), ...customConfig } : getOpenRouterConfig();
    const headers = { ...getHeaders() };
    if (cfg.apiKey) headers['x-openrouter-key'] = cfg.apiKey;
    if (cfg.baseUrl) headers['x-openrouter-base-url'] = cfg.baseUrl;
    if (cfg.appName) headers['x-openrouter-app-name'] = cfg.appName;
    if (cfg.siteUrl) headers['x-openrouter-site-url'] = cfg.siteUrl;

    const res = await fetch(`${API_BASE}/settings/test-openrouter`, {
      method: 'POST',
      headers,
      body: JSON.stringify(cfg),
    });
    return res.json();
  },
};

