export interface VerifiedFreeModel {
  id: string;
  name: string;
  description: string;
  context_length: number;
  provider: string;
  is_free: true;
  supports_vision: boolean;
  pricing: {
    prompt: number;
    completion: number;
  };
  verified_at: string;
}

export interface Attachment {
  id?: string;
  name: string;
  type: string;
  size?: number;
  content: string; // extracted text or data URL for image
  isImage?: boolean;
  pageCount?: number;
  wordCount?: number;
  truncated?: boolean;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  attachments?: Attachment[];
  model_id?: string | null;
  created_at: string;
  feedback?: 'like' | 'dislike' | null;
  versions?: string[]; // for branching / editing history
  activeVersionIndex?: number;
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

export interface UserProfile {
  id: string;
  email?: string;
  display_name?: string;
  avatar_url?: string;
}

