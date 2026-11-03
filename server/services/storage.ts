import fs from 'fs';
import path from 'path';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { config } from '../config.js';

export interface Profile {
  id: string;
  email?: string;
  display_name?: string;
  avatar_url?: string;
  created_at: string;
}

export interface Conversation {
  id: string;
  user_id: string;
  project_id?: string | null;
  title: string;
  model_id: string;
  is_archived: boolean;
  is_starred: boolean;
  created_at: string;
  updated_at: string;
}

export interface MessageAttachment {
  name: string;
  type: string;
  size?: number;
  content: string;
  isImage?: boolean;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  attachments?: MessageAttachment[];
  model_id?: string | null;
  created_at: string;
}

export interface Project {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  custom_instructions?: string;
  created_at: string;
  updated_at: string;
}

export interface UserSettings {
  id: string;
  user_id: string;
  default_model: string;
  theme: 'light' | 'dark' | 'system';
  custom_instructions: string;
  preferences: {
    temperature: number;
    stream: boolean;
    enterToSend: boolean;
  };
  updated_at: string;
}

interface LocalStoreData {
  profiles: Record<string, Profile>;
  conversations: Record<string, Conversation>;
  messages: Record<string, Message>;
  projects: Record<string, Project>;
  settings: Record<string, UserSettings>;
}

class StorageService {
  private supabase: SupabaseClient | null = null;
  private localStorePath: string;
  private localData: LocalStoreData;

  constructor() {
    this.localStorePath = path.resolve(process.cwd(), 'server', 'data', 'store.json');
    this.localData = this.loadLocalStore();

    if (config.supabase.url && config.supabase.anonKey) {
      try {
        this.supabase = createClient(config.supabase.url, config.supabase.serviceRoleKey || config.supabase.anonKey);
        console.log('[Storage] Connected to Supabase PostgreSQL at', config.supabase.url);
      } catch (err: any) {
        console.warn('[Storage] Failed to initialize Supabase client:', err.message);
      }
    } else {
      console.log('[Storage] Supabase credentials not set. Operating with persistent local storage at:', this.localStorePath);
    }
  }

  private loadLocalStore(): LocalStoreData {
    try {
      if (fs.existsSync(this.localStorePath)) {
        const raw = fs.readFileSync(this.localStorePath, 'utf-8');
        return JSON.parse(raw);
      }
    } catch (e) {
      console.warn('[Storage] Error reading local store:', e);
    }

    const defaultData: LocalStoreData = {
      profiles: {},
      conversations: {},
      messages: {},
      projects: {},
      settings: {},
    };
    return defaultData;
  }

  private persistLocalStore() {
    try {
      const dir = path.dirname(this.localStorePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.localStorePath, JSON.stringify(this.localData, null, 2), 'utf-8');
    } catch (e) {
      console.error('[Storage] Error saving local store:', e);
    }
  }

  // --- Conversations ---

  async listConversations(userId: string): Promise<Conversation[]> {
    if (this.supabase) {
      const { data, error } = await this.supabase
        .from('conversations')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });

      if (!error && data) return data as Conversation[];
      console.warn('[Supabase] listConversations fallback to local:', error?.message);
    }

    return Object.values(this.localData.conversations)
      .filter((c) => c.user_id === userId)
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
  }

  async getConversation(id: string, userId: string): Promise<Conversation | null> {
    if (this.supabase) {
      const { data, error } = await this.supabase
        .from('conversations')
        .select('*')
        .eq('id', id)
        .eq('user_id', userId)
        .single();

      if (!error && data) return data as Conversation;
    }

    const conv = this.localData.conversations[id];
    if (conv && conv.user_id === userId) return conv;
    return null;
  }

  async createConversation(conv: Omit<Conversation, 'created_at' | 'updated_at'>): Promise<Conversation> {
    const now = new Date().toISOString();
    const newConv: Conversation = {
      ...conv,
      created_at: now,
      updated_at: now,
    };

    if (this.supabase) {
      const { data, error } = await this.supabase
        .from('conversations')
        .insert(newConv)
        .select()
        .single();

      if (!error && data) return data as Conversation;
      console.warn('[Supabase] createConversation error, saving locally:', error?.message);
    }

    this.localData.conversations[newConv.id] = newConv;
    this.persistLocalStore();
    return newConv;
  }

  async updateConversation(
    id: string,
    userId: string,
    updates: Partial<Pick<Conversation, 'title' | 'model_id' | 'is_archived' | 'is_starred' | 'project_id'>>
  ): Promise<Conversation | null> {
    const now = new Date().toISOString();

    if (this.supabase) {
      const { data, error } = await this.supabase
        .from('conversations')
        .update({ ...updates, updated_at: now })
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single();

      if (!error && data) return data as Conversation;
    }

    const conv = this.localData.conversations[id];
    if (conv && conv.user_id === userId) {
      this.localData.conversations[id] = {
        ...conv,
        ...updates,
        updated_at: now,
      };
      this.persistLocalStore();
      return this.localData.conversations[id];
    }
    return null;
  }

  async deleteConversation(id: string, userId: string): Promise<boolean> {
    if (this.supabase) {
      const { error } = await this.supabase
        .from('conversations')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);

      if (!error) return true;
    }

    const conv = this.localData.conversations[id];
    if (conv && conv.user_id === userId) {
      delete this.localData.conversations[id];
      // Cascade delete messages
      for (const msgId of Object.keys(this.localData.messages)) {
        if (this.localData.messages[msgId].conversation_id === id) {
          delete this.localData.messages[msgId];
        }
      }
      this.persistLocalStore();
      return true;
    }
    return false;
  }

  // --- Messages ---

  async listMessages(conversationId: string, userId: string): Promise<Message[]> {
    // Verify user owns conversation
    const conv = await this.getConversation(conversationId, userId);
    if (!conv) return [];

    if (this.supabase) {
      const { data, error } = await this.supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (!error && data) return data as Message[];
    }

    return Object.values(this.localData.messages)
      .filter((m) => m.conversation_id === conversationId)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }

  async saveMessage(msg: Omit<Message, 'created_at'>): Promise<Message> {
    const now = new Date().toISOString();
    const newMsg: Message = {
      ...msg,
      attachments: msg.attachments || [],
      created_at: now,
    };

    if (this.supabase) {
      const { data, error } = await this.supabase
        .from('messages')
        .insert(newMsg)
        .select()
        .single();

      if (!error && data) {
        // Update conversation updated_at
        await this.supabase
          .from('conversations')
          .update({ updated_at: now })
          .eq('id', msg.conversation_id);

        return data as Message;
      }
    }

    this.localData.messages[newMsg.id] = newMsg;
    if (this.localData.conversations[newMsg.conversation_id]) {
      this.localData.conversations[newMsg.conversation_id].updated_at = now;
    }
    this.persistLocalStore();
    return newMsg;
  }

  // --- Projects ---

  async listProjects(userId: string): Promise<Project[]> {
    if (this.supabase) {
      const { data, error } = await this.supabase
        .from('projects')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (!error && data) return data as Project[];
    }

    return Object.values(this.localData.projects)
      .filter((p) => p.user_id === userId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  async createProject(project: Omit<Project, 'created_at' | 'updated_at'>): Promise<Project> {
    const now = new Date().toISOString();
    const newProject: Project = {
      ...project,
      created_at: now,
      updated_at: now,
    };

    if (this.supabase) {
      const { data, error } = await this.supabase
        .from('projects')
        .insert(newProject)
        .select()
        .single();

      if (!error && data) return data as Project;
    }

    this.localData.projects[newProject.id] = newProject;
    this.persistLocalStore();
    return newProject;
  }

  async updateProject(
    id: string,
    userId: string,
    updates: Partial<Pick<Project, 'name' | 'description' | 'custom_instructions'>>
  ): Promise<Project | null> {
    const now = new Date().toISOString();

    if (this.supabase) {
      const { data, error } = await this.supabase
        .from('projects')
        .update({ ...updates, updated_at: now })
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single();

      if (!error && data) return data as Project;
    }

    const p = this.localData.projects[id];
    if (p && p.user_id === userId) {
      this.localData.projects[id] = {
        ...p,
        ...updates,
        updated_at: now,
      };
      this.persistLocalStore();
      return this.localData.projects[id];
    }
    return null;
  }

  async deleteProject(id: string, userId: string): Promise<boolean> {
    if (this.supabase) {
      const { error } = await this.supabase
        .from('projects')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);

      if (!error) return true;
    }

    const p = this.localData.projects[id];
    if (p && p.user_id === userId) {
      delete this.localData.projects[id];
      this.persistLocalStore();
      return true;
    }
    return false;
  }

  // --- User Settings ---

  async getUserSettings(userId: string): Promise<UserSettings> {
    const defaultSettings: UserSettings = {
      id: `settings-${userId}`,
      user_id: userId,
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

    if (this.supabase) {
      const { data, error } = await this.supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (!error && data) return data as UserSettings;
    }

    if (!this.localData.settings[userId]) {
      this.localData.settings[userId] = defaultSettings;
      this.persistLocalStore();
    }
    return this.localData.settings[userId];
  }

  async updateUserSettings(
    userId: string,
    updates: Partial<Pick<UserSettings, 'default_model' | 'theme' | 'custom_instructions' | 'preferences'>>
  ): Promise<UserSettings> {
    const existing = await this.getUserSettings(userId);
    const updated: UserSettings = {
      ...existing,
      ...updates,
      updated_at: new Date().toISOString(),
    };

    if (this.supabase) {
      const { data, error } = await this.supabase
        .from('user_settings')
        .upsert(updated)
        .select()
        .single();

      if (!error && data) return data as UserSettings;
    }

    this.localData.settings[userId] = updated;
    this.persistLocalStore();
    return updated;
  }

  // --- Bulk Management ---

  async deleteAllConversations(userId: string): Promise<void> {
    if (this.supabase) {
      await this.supabase.from('conversations').delete().eq('user_id', userId);
    }

    for (const [id, conv] of Object.entries(this.localData.conversations)) {
      if (conv.user_id === userId) {
        delete this.localData.conversations[id];
        for (const [mId, msg] of Object.entries(this.localData.messages)) {
          if (msg.conversation_id === id) {
            delete this.localData.messages[mId];
          }
        }
      }
    }
    this.persistLocalStore();
  }

  async exportUserData(userId: string) {
    const conversations = await this.listConversations(userId);
    const projects = await this.listProjects(userId);
    const settings = await this.getUserSettings(userId);

    const conversationsWithMessages = [];
    for (const conv of conversations) {
      const messages = await this.listMessages(conv.id, userId);
      conversationsWithMessages.push({
        ...conv,
        messages,
      });
    }

    return {
      exported_at: new Date().toISOString(),
      user_id: userId,
      settings,
      projects,
      conversations: conversationsWithMessages,
    };
  }
}

export const storageService = new StorageService();

