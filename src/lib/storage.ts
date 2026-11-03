import { Conversation, Message, Project, UserSettings, VerifiedFreeModel, Attachment, OpenRouterConfig } from '../types';
import { INSIGHTFORGE_STUDIO_INSTRUCTIONS } from './projectTemplates';

const API_BASE = '/api';

const STORAGE_KEYS = {
  PROJECTS: 'aether_local_projects',
  CONVERSATIONS: 'aether_local_conversations',
  MESSAGES_PREFIX: 'aether_local_messages_',
  SETTINGS: 'aether_local_settings',
  OPENROUTER_CONFIG: 'aether_openrouter_config',
  USER_ID: 'aether_user_id',
  DELETED_PROJECTS: 'aether_deleted_project_ids',
  DELETED_CONVERSATIONS: 'aether_deleted_conversation_ids',
};

function getUserId(): string {
  let userId = localStorage.getItem(STORAGE_KEYS.USER_ID);
  if (!userId) {
    userId = `user-${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem(STORAGE_KEYS.USER_ID, userId);
  }
  return userId;
}

export function getOpenRouterConfig(): OpenRouterConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.OPENROUTER_CONFIG);
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
  localStorage.setItem(STORAGE_KEYS.OPENROUTER_CONFIG, JSON.stringify(updated));
  return updated;
}

export function clearOpenRouterConfig() {
  localStorage.removeItem(STORAGE_KEYS.OPENROUTER_CONFIG);
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

// --- Local-First Storage & Deletion Tracking Helpers ---

function getDeletedProjectIds(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.DELETED_PROJECTS);
    if (raw) return new Set(JSON.parse(raw));
  } catch (_) {}
  return new Set();
}

function markProjectDeleted(id: string) {
  const set = getDeletedProjectIds();
  set.add(id);
  try {
    localStorage.setItem(STORAGE_KEYS.DELETED_PROJECTS, JSON.stringify(Array.from(set)));
  } catch (_) {}
}

function unmarkProjectDeleted(id: string) {
  const set = getDeletedProjectIds();
  if (set.delete(id)) {
    try {
      localStorage.setItem(STORAGE_KEYS.DELETED_PROJECTS, JSON.stringify(Array.from(set)));
    } catch (_) {}
  }
}

function getDeletedConversationIds(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.DELETED_CONVERSATIONS);
    if (raw) return new Set(JSON.parse(raw));
  } catch (_) {}
  return new Set();
}

function markConversationDeleted(id: string) {
  const set = getDeletedConversationIds();
  set.add(id);
  try {
    localStorage.setItem(STORAGE_KEYS.DELETED_CONVERSATIONS, JSON.stringify(Array.from(set)));
  } catch (_) {}
}

function unmarkConversationDeleted(id: string) {
  const set = getDeletedConversationIds();
  if (set.delete(id)) {
    try {
      localStorage.setItem(STORAGE_KEYS.DELETED_CONVERSATIONS, JSON.stringify(Array.from(set)));
    } catch (_) {}
  }
}

function getLocalProjects(): Project[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PROJECTS);
    if (raw !== null) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (_) {}

  // Pre-seed default InsightForge Studio only on very first launch
  const defaultProj: Project = {
    id: 'proj-insightforge-default',
    user_id: getUserId(),
    name: 'InsightForge Studio',
    description: 'Original research-first workflow for educational YouTube explainers (4-stage pipeline)',
    custom_instructions: INSIGHTFORGE_STUDIO_INSTRUCTIONS,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  saveLocalProjects([defaultProj]);
  return [defaultProj];
}

function saveLocalProjects(projects: Project[]) {
  try {
    localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(projects));
  } catch (_) {}
}

function getLocalConversations(): Conversation[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CONVERSATIONS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (_) {}
  return [];
}

function saveLocalConversations(convs: Conversation[]) {
  try {
    localStorage.setItem(STORAGE_KEYS.CONVERSATIONS, JSON.stringify(convs));
  } catch (_) {}
}

function getLocalMessages(convId: string): Message[] {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEYS.MESSAGES_PREFIX}${convId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (_) {}
  return [];
}

function saveLocalMessages(convId: string, msgs: Message[]) {
  try {
    localStorage.setItem(`${STORAGE_KEYS.MESSAGES_PREFIX}${convId}`, JSON.stringify(msgs));
  } catch (_) {}
}

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

  // Conversations (Local-First Persistent)
  async getConversations(): Promise<Conversation[]> {
    const local = getLocalConversations();

    try {
      const res = await fetch(`${API_BASE}/conversations`, { headers: getHeaders() });
      if (res.ok) {
        const json = await res.json();
        const serverConvs: Conversation[] = json.data || [];
        if (serverConvs.length > 0) {
          const deleted = getDeletedConversationIds();
          const validServerConvs = serverConvs.filter((c) => !deleted.has(c.id));
          const mergedMap = new Map<string, Conversation>();
          local.forEach((c) => mergedMap.set(c.id, c));
          validServerConvs.forEach((c) => {
            const existing = mergedMap.get(c.id);
            if (!existing || new Date(c.updated_at).getTime() >= new Date(existing.updated_at).getTime()) {
              mergedMap.set(c.id, c);
            }
          });
          const merged = Array.from(mergedMap.values()).sort(
            (a, b) => new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime()
          );
          saveLocalConversations(merged);
          return merged;
        } else if (local.length > 0) {
          // Background sync to serverless
          for (const c of local) {
            fetch(`${API_BASE}/conversations`, {
              method: 'POST',
              headers: getHeaders(),
              body: JSON.stringify(c),
            }).catch(() => {});
          }
        }
      }
    } catch (_) {}

    return local.sort(
      (a, b) => new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime()
    );
  },

  async getConversation(id: string): Promise<Conversation & { messages: Message[] }> {
    const localConvs = getLocalConversations();
    const localConv = localConvs.find((c) => c.id === id) || {
      id,
      user_id: getUserId(),
      title: 'Conversation',
      model_id: 'meta-llama/llama-3.3-70b-instruct:free',
      is_archived: false,
      is_starred: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const localMsgs = getLocalMessages(id);

    try {
      const res = await fetch(`${API_BASE}/conversations/${id}`, { headers: getHeaders() });
      if (res.ok) {
        const json = await res.json();
        if (json.data) {
          const serverMsgs: Message[] = json.data.messages || [];
          if (serverMsgs.length >= localMsgs.length) {
            saveLocalMessages(id, serverMsgs);
            return json.data;
          }
        }
      }
    } catch (_) {}

    return {
      ...localConv,
      messages: localMsgs,
    };
  },

  async createConversation(data: Partial<Conversation>): Promise<Conversation> {
    const now = new Date().toISOString();
    const newConv: Conversation = {
      id: data.id || `conv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      user_id: getUserId(),
      title: data.title || 'New Conversation',
      model_id: data.model_id || 'meta-llama/llama-3.3-70b-instruct:free',
      project_id: data.project_id || null,
      is_archived: false,
      is_starred: false,
      created_at: now,
      updated_at: now,
    };

    unmarkConversationDeleted(newConv.id);
    const local = getLocalConversations();
    saveLocalConversations([newConv, ...local.filter((c) => c.id !== newConv.id)]);

    fetch(`${API_BASE}/conversations`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(newConv),
    }).catch(() => {});

    return newConv;
  },

  async updateConversation(id: string, updates: Partial<Conversation>): Promise<Conversation> {
    const local = getLocalConversations();
    const existing = local.find((c) => c.id === id);
    const now = new Date().toISOString();

    const updatedConv: Conversation = {
      ...(existing || { id, user_id: getUserId(), title: 'Conversation', model_id: 'meta-llama/llama-3.3-70b-instruct:free', is_archived: false, is_starred: false, created_at: now }),
      ...updates,
      updated_at: now,
    };

    unmarkConversationDeleted(id);
    saveLocalConversations(local.map((c) => (c.id === id ? updatedConv : c)));

    fetch(`${API_BASE}/conversations/${id}`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify(updates),
    }).catch(() => {});

    return updatedConv;
  },

  async deleteConversation(id: string): Promise<boolean> {
    markConversationDeleted(id);
    const local = getLocalConversations();
    saveLocalConversations(local.filter((c) => c.id !== id));
    try {
      localStorage.removeItem(`${STORAGE_KEYS.MESSAGES_PREFIX}${id}`);
    } catch (_) {}

    fetch(`${API_BASE}/conversations/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    }).catch(() => {});

    return true;
  },

  async deleteAllConversations(): Promise<boolean> {
    const local = getLocalConversations();
    local.forEach((c) => {
      markConversationDeleted(c.id);
      try {
        localStorage.removeItem(`${STORAGE_KEYS.MESSAGES_PREFIX}${c.id}`);
      } catch (_) {}
    });
    saveLocalConversations([]);

    fetch(`${API_BASE}/conversations`, {
      method: 'DELETE',
      headers: getHeaders(),
    }).catch(() => {});

    return true;
  },

  // Messages (Local-First Persistent)
  async saveMessage(msg: Partial<Message>): Promise<Message> {
    const now = new Date().toISOString();
    const fullMsg: Message = {
      id: msg.id || `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      conversation_id: msg.conversation_id || '',
      role: msg.role || 'user',
      content: msg.content || '',
      attachments: msg.attachments || [],
      model_id: msg.model_id || null,
      created_at: msg.created_at || now,
      feedback: msg.feedback || null,
      versions: msg.versions || [msg.content || ''],
      activeVersionIndex: msg.activeVersionIndex || 0,
      is_interrupted: msg.is_interrupted || false,
    };

    if (fullMsg.conversation_id) {
      const currentMsgs = getLocalMessages(fullMsg.conversation_id);
      const existsIndex = currentMsgs.findIndex((m) => m.id === fullMsg.id);
      let updatedMsgs: Message[];
      if (existsIndex >= 0) {
        updatedMsgs = [...currentMsgs];
        updatedMsgs[existsIndex] = fullMsg;
      } else {
        updatedMsgs = [...currentMsgs, fullMsg];
      }
      saveLocalMessages(fullMsg.conversation_id, updatedMsgs);

      // Touch conversation updated_at in local storage
      const convs = getLocalConversations();
      const targetConv = convs.find((c) => c.id === fullMsg.conversation_id);
      if (targetConv) {
        targetConv.updated_at = now;
        saveLocalConversations(convs);
      }
    }

    fetch(`${API_BASE}/messages`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(fullMsg),
    }).catch(() => {});

    return fullMsg;
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

  // Projects (Local-First Persistent)
  async getProjects(): Promise<Project[]> {
    const local = getLocalProjects();

    try {
      const res = await fetch(`${API_BASE}/projects`, { headers: getHeaders() });
      if (res.ok) {
        const json = await res.json();
        const serverProjects: Project[] = json.data || [];
        if (serverProjects.length > 0) {
          const deleted = getDeletedProjectIds();
          const validServerProjects = serverProjects.filter((p) => !deleted.has(p.id));
          const mergedMap = new Map<string, Project>();
          local.forEach((p) => mergedMap.set(p.id, p));
          validServerProjects.forEach((p) => {
            const existing = mergedMap.get(p.id);
            if (!existing || new Date(p.updated_at).getTime() >= new Date(existing.updated_at).getTime()) {
              mergedMap.set(p.id, p);
            }
          });
          const merged = Array.from(mergedMap.values()).sort(
            (a, b) => new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime()
          );
          saveLocalProjects(merged);
          return merged;
        } else if (local.length > 0) {
          // Sync local projects to serverless backend
          for (const p of local) {
            fetch(`${API_BASE}/projects`, {
              method: 'POST',
              headers: getHeaders(),
              body: JSON.stringify(p),
            }).catch(() => {});
          }
        }
      }
    } catch (_) {}

    return local.sort(
      (a, b) => new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime()
    );
  },

  async createProject(project: Partial<Project>): Promise<Project> {
    const now = new Date().toISOString();
    const newProject: Project = {
      id: project.id || `proj-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      user_id: getUserId(),
      name: project.name || 'Untitled Project',
      description: project.description || '',
      custom_instructions: project.custom_instructions || '',
      created_at: now,
      updated_at: now,
    };

    unmarkProjectDeleted(newProject.id);
    const current = getLocalProjects();
    const updated = [newProject, ...current.filter((p) => p.id !== newProject.id)];
    saveLocalProjects(updated);

    fetch(`${API_BASE}/projects`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(newProject),
    }).catch(() => {});

    return newProject;
  },

  async updateProject(id: string, updates: Partial<Project>): Promise<Project> {
    unmarkProjectDeleted(id);
    const current = getLocalProjects();
    const existing = current.find((p) => p.id === id);
    const now = new Date().toISOString();

    const updatedProject: Project = {
      ...(existing || { id, user_id: getUserId(), name: '', created_at: now }),
      ...updates,
      updated_at: now,
    };

    const updatedList = current.map((p) => (p.id === id ? updatedProject : p));
    if (!current.some((p) => p.id === id)) {
      updatedList.unshift(updatedProject);
    }
    saveLocalProjects(updatedList);

    fetch(`${API_BASE}/projects/${id}`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify(updates),
    }).catch(() => {});

    return updatedProject;
  },

  async deleteProject(id: string): Promise<boolean> {
    markProjectDeleted(id);
    const current = getLocalProjects();
    const filtered = current.filter((p) => p.id !== id);
    saveLocalProjects(filtered);

    // Keep associated conversations safe by detaching project_id instead of deleting them
    const localConvs = getLocalConversations();
    let hasChanges = false;
    const updatedConvs = localConvs.map((c) => {
      if (c.project_id === id) {
        hasChanges = true;
        return { ...c, project_id: undefined };
      }
      return c;
    });
    if (hasChanges) {
      saveLocalConversations(updatedConvs);
    }

    fetch(`${API_BASE}/projects/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    }).catch(() => {});

    return true;
  },

  // Settings
  async getSettings(): Promise<UserSettings> {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (raw) return JSON.parse(raw);
    } catch (_) {}

    try {
      const res = await fetch(`${API_BASE}/settings`, { headers: getHeaders() });
      if (res.ok) {
        const json = await res.json();
        if (json.data) {
          localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(json.data));
          return json.data;
        }
      }
    } catch (_) {}

    return {
      id: 'settings-default',
      user_id: getUserId(),
      default_model: 'meta-llama/llama-3.3-70b-instruct:free',
      theme: 'system',
      custom_instructions: '',
      preferences: {
        temperature: 0.7,
        stream: true,
        enterToSend: true,
      },
      updated_at: new Date().toISOString(),
    };
  },

  async updateSettings(updates: Partial<UserSettings>): Promise<UserSettings> {
    const current = await this.getSettings();
    const updated = { ...current, ...updates, updated_at: new Date().toISOString() };
    try {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(updated));
    } catch (_) {}

    fetch(`${API_BASE}/settings`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify(updates),
    }).catch(() => {});

    return updated;
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
