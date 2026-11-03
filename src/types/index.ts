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

export const AUTO_MODEL_ID = 'auto:free';

export const AUTO_FREE_MODEL: VerifiedFreeModel = {
  id: AUTO_MODEL_ID,
  name: 'Auto (Smart Free Router)',
  description: 'Automatically picks the fastest available free model and auto-switches if any rate limit is reached.',
  context_length: 131072,
  provider: 'Auto Router',
  is_free: true,
  supports_vision: true,
  pricing: { prompt: 0, completion: 0 },
  verified_at: new Date().toISOString(),
};

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
  is_interrupted?: boolean;
  interrupted_reason?: string;
  task_stage?: string;
}

export interface TaskStageInfo {
  index: number;
  id: string;
  title: string;
  shortTitle: string;
  status: 'completed' | 'active' | 'pending';
}

export interface TaskFrameworkState {
  isConfigured: boolean;
  frameworkName: string;
  currentStage: string;
  stageIndex: number;
  totalStages: number;
  stages: TaskStageInfo[];
  lastMilestone?: string;
  pendingDeliverable?: string;
  isInterrupted: boolean;
  interruptedMessageId?: string;
  snippetAtInterruption?: string;
  canResume: boolean;
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
  task_state?: TaskFrameworkState;
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

export interface OpenRouterConfig {
  apiKey: string;
  baseUrl: string;
  appName: string;
  siteUrl: string;
}
