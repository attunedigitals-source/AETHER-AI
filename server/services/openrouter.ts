import { config } from '../config.js';
import { FreeModelValidator, VerifiedFreeModel, RawOpenRouterModel } from './modelValidator.js';
import { Response } from 'express';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>;
}

export interface ClientOpenRouterConfig {
  apiKey?: string;
  baseUrl?: string;
  appName?: string;
  siteUrl?: string;
}

export interface StreamChatPayload {
  modelId: string;
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
    attachments?: Array<{
      name: string;
      type: string;
      content: string;
      isImage?: boolean;
    }>;
  }>;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  customConfig?: ClientOpenRouterConfig;
}

// Fallback verified free models list if network is completely offline during initial cold boot
const INITIAL_VERIFIED_FREE_MODELS: VerifiedFreeModel[] = [
  {
    id: 'meta-llama/llama-3.3-70b-instruct:free',
    name: 'Llama 3.3 70B Instruct',
    description: 'Meta state-of-the-art 70B parameter open model with 128k context window.',
    context_length: 131072,
    provider: 'Meta Llama',
    is_free: true,
    supports_vision: false,
    pricing: { prompt: 0, completion: 0 },
    verified_at: new Date().toISOString(),
  },
  {
    id: 'deepseek/deepseek-r1:free',
    name: 'DeepSeek R1',
    description: 'High-performance open reasoning model with chain-of-thought capabilities.',
    context_length: 65536,
    provider: 'DeepSeek',
    is_free: true,
    supports_vision: false,
    pricing: { prompt: 0, completion: 0 },
    verified_at: new Date().toISOString(),
  },
  {
    id: 'deepseek/deepseek-chat:free',
    name: 'DeepSeek V3 Chat',
    description: 'Versatile conversational assistant with strong coding and general abilities.',
    context_length: 65536,
    provider: 'DeepSeek',
    is_free: true,
    supports_vision: false,
    pricing: { prompt: 0, completion: 0 },
    verified_at: new Date().toISOString(),
  },
  {
    id: 'google/gemini-2.0-flash-thinking-exp:free',
    name: 'Gemini 2.0 Flash Thinking Experimental',
    description: 'Google experimental reasoning model with multimodal understanding.',
    context_length: 32768,
    provider: 'Google',
    is_free: true,
    supports_vision: true,
    pricing: { prompt: 0, completion: 0 },
    verified_at: new Date().toISOString(),
  },
  {
    id: 'google/gemini-2.0-flash-exp:free',
    name: 'Gemini 2.0 Flash Experimental',
    description: 'Next-generation fast multimodal model from Google with vision support.',
    context_length: 1048576,
    provider: 'Google',
    is_free: true,
    supports_vision: true,
    pricing: { prompt: 0, completion: 0 },
    verified_at: new Date().toISOString(),
  },
  {
    id: 'qwen/qwen-2.5-coder-32b-instruct:free',
    name: 'Qwen 2.5 Coder 32B Instruct',
    description: 'Exceptional code generation, refactoring, and technical reasoning model.',
    context_length: 32768,
    provider: 'Qwen',
    is_free: true,
    supports_vision: false,
    pricing: { prompt: 0, completion: 0 },
    verified_at: new Date().toISOString(),
  },
  {
    id: 'mistralai/mistral-small-24b-instruct-2501:free',
    name: 'Mistral Small 24B Instruct',
    description: 'State-of-the-art multilingual and instruction-tuned model by Mistral AI.',
    context_length: 32768,
    provider: 'Mistral AI',
    is_free: true,
    supports_vision: false,
    pricing: { prompt: 0, completion: 0 },
    verified_at: new Date().toISOString(),
  },
];

class OpenRouterService {
  private verifiedModelsCache: Map<string, VerifiedFreeModel> = new Map();
  private lastFetchTime: number = 0;
  private readonly CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

  constructor() {
    // Seed initial cache
    for (const m of INITIAL_VERIFIED_FREE_MODELS) {
      this.verifiedModelsCache.set(m.id, m);
    }
  }

  /**
   * Retrieves all verified free models from OpenRouter dynamically.
   * Strictly filters out any model not ending in ':free' or with non-zero pricing.
   */
  async getVerifiedFreeModels(forceRefresh = false, customConfig?: ClientOpenRouterConfig): Promise<VerifiedFreeModel[]> {
    const now = Date.now();
    const isCacheExpired = now - this.lastFetchTime > this.CACHE_TTL_MS;

    if (!forceRefresh && !isCacheExpired && this.verifiedModelsCache.size > 0) {
      return Array.from(this.verifiedModelsCache.values());
    }

    const apiKey = customConfig?.apiKey?.trim() || config.openrouter.apiKey;
    const baseUrl = customConfig?.baseUrl?.trim() || config.openrouter.baseUrl;
    const appName = customConfig?.appName?.trim() || config.openrouter.appName;
    const siteUrl = customConfig?.siteUrl?.trim() || config.openrouter.siteUrl;

    try {
      const headers: Record<string, string> = {
        'HTTP-Referer': siteUrl,
        'X-Title': appName,
      };

      if (apiKey) {
        headers['Authorization'] = `Bearer ${apiKey}`;
      }

      const response = await fetch(`${baseUrl}/models`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        console.warn(`[OpenRouter] Failed to fetch models: ${response.status} ${response.statusText}`);
        return Array.from(this.verifiedModelsCache.values());
      }

      const json = await response.json();
      const rawModels: RawOpenRouterModel[] = json.data || [];

      const newMap = new Map<string, VerifiedFreeModel>();

      for (const raw of rawModels) {
        const validation = FreeModelValidator.validateModel(raw);
        if (validation.isValid) {
          const verified = FreeModelValidator.formatVerifiedModel(raw);
          newMap.set(verified.id, verified);
        }
      }

      if (newMap.size > 0) {
        this.verifiedModelsCache = newMap;
        this.lastFetchTime = now;
        console.log(`[OpenRouter] Successfully verified ${newMap.size} free models.`);
      }

      return Array.from(this.verifiedModelsCache.values());
    } catch (err: any) {
      console.error('[OpenRouter] Network error fetching models:', err.message);
      return Array.from(this.verifiedModelsCache.values());
    }
  }

  /**
   * Checks if a model ID is strictly free.
   * If not currently in cache, attempts dynamic re-verification from OpenRouter.
   */
  async isModelEligibleFree(modelId: string): Promise<boolean> {
    if (!modelId || !modelId.trim().toLowerCase().endsWith(':free')) {
      return false;
    }

    if (this.verifiedModelsCache.has(modelId)) {
      return true;
    }

    // Try refreshing cache in case it's a newly released free model
    await this.getVerifiedFreeModels(true);
    return this.verifiedModelsCache.has(modelId);
  }

  /**
   * Returns a specific verified free model or null.
   */
  async getModel(modelId: string): Promise<VerifiedFreeModel | null> {
    if (this.verifiedModelsCache.has(modelId)) {
      return this.verifiedModelsCache.get(modelId)!;
    }
    await this.getVerifiedFreeModels(true);
    return this.verifiedModelsCache.get(modelId) || null;
  }

  /**
   * Suggests alternative verified free models when a model hits a rate limit or error.
   */
  getAlternativeFreeModels(currentModelId: string): VerifiedFreeModel[] {
    return Array.from(this.verifiedModelsCache.values())
      .filter((m) => m.id !== currentModelId)
      .slice(0, 3);
  }

  /**
   * Tests the connection with OpenRouter.
   */
  async testConnection(customConfig?: ClientOpenRouterConfig): Promise<{ success: boolean; message: string; modelCount?: number }> {
    const apiKey = customConfig?.apiKey?.trim() || config.openrouter.apiKey;
    const baseUrl = customConfig?.baseUrl?.trim() || config.openrouter.baseUrl;
    const appName = customConfig?.appName?.trim() || config.openrouter.appName;
    const siteUrl = customConfig?.siteUrl?.trim() || config.openrouter.siteUrl;

    if (!apiKey) {
      return {
        success: false,
        message: 'No OpenRouter API key provided. Please enter your key in Settings or add OPENROUTER_API_KEY in .env.',
      };
    }

    try {
      const response = await fetch(`${baseUrl}/models`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'HTTP-Referer': siteUrl,
          'X-Title': appName,
        },
      });

      if (!response.ok) {
        return {
          success: false,
          message: `OpenRouter returned HTTP ${response.status}: ${response.statusText}`,
        };
      }

      const models = await this.getVerifiedFreeModels(true, customConfig);
      return {
        success: true,
        message: `Successfully connected to OpenRouter! Discovered ${models.length} active verified free models.`,
        modelCount: models.length,
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Connection failed: ${err.message}`,
      };
    }
  }

  /**
   * Streams a chat completion via Server-Sent Events (SSE).
   * Enforces fail-closed: rejects non-free models immediately.
   */
  async streamChat(payload: StreamChatPayload, res: Response, abortSignal?: AbortSignal) {
    const { modelId, messages, systemPrompt, temperature = 0.7, maxTokens = 4096 } = payload;

    // Fail-closed enforcement: Re-verify model eligibility
    const isFree = await this.isModelEligibleFree(modelId);
    if (!isFree) {
      res.status(403).json({
        error: {
          code: 'UNAUTHORIZED_MODEL',
          message: `Security violation: Model '${modelId}' is not a verified OpenRouter FREE model. The application strictly forbids paid models.`,
        },
      });
      return;
    }

    const modelInfo = await this.getModel(modelId);

    // Format messages for OpenRouter
    const formattedMessages: ChatMessage[] = [];

    // Prepend system prompt if provided
    if (systemPrompt && systemPrompt.trim()) {
      formattedMessages.push({
        role: 'system',
        content: systemPrompt.trim(),
      });
    }

    // Format chat turns and attachments
    for (const msg of messages) {
      let textContent = msg.content || '';

      // If text attachments are present, append extracted contents to the user prompt cleanly
      if (msg.attachments && msg.attachments.length > 0) {
        const textAttachments = msg.attachments.filter((a) => !a.isImage);
        const imageAttachments = msg.attachments.filter((a) => a.isImage);

        if (textAttachments.length > 0) {
          textContent += '\n\n--- ATTACHED DOCUMENTS & CONTEXT ---';
          for (const doc of textAttachments) {
            textContent += `\n\n[Document: ${doc.name}]\n${doc.content}`;
          }
          textContent += '\n--- END OF ATTACHMENTS ---\n';
        }

        // Handle image attachments
        if (imageAttachments.length > 0) {
          if (modelInfo?.supports_vision) {
            // Multimodal content array
            const contentParts: any[] = [{ type: 'text', text: textContent }];
            for (const img of imageAttachments) {
              contentParts.push({
                type: 'image_url',
                image_url: {
                  url: img.content.startsWith('data:') ? img.content : `data:${img.type};base64,${img.content}`,
                },
              });
            }
            formattedMessages.push({
              role: msg.role,
              content: contentParts,
            });
            continue;
          } else {
            textContent += `\n\n[Notice: ${imageAttachments.length} image attachment(s) included, but ${modelInfo?.name || modelId} does not support multimodal vision inputs. To analyze images, switch to a vision-capable free model like Gemini 2.0 Flash Exp:free.]`;
          }
        }
      }

      formattedMessages.push({
        role: msg.role,
        content: textContent,
      });
    }

    const effectiveApiKey = payload.customConfig?.apiKey?.trim() || config.openrouter.apiKey;
    const effectiveBaseUrl = payload.customConfig?.baseUrl?.trim() || config.openrouter.baseUrl;
    const effectiveAppName = payload.customConfig?.appName?.trim() || config.openrouter.appName;
    const effectiveSiteUrl = payload.customConfig?.siteUrl?.trim() || config.openrouter.siteUrl;

    if (!effectiveApiKey) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      const simulatedMsg = `### OpenRouter API Key Required\n\nTo start chatting with free AI models, please configure your free OpenRouter API key:\n\n1. Visit [OpenRouter Keys](https://openrouter.ai/settings/keys) and create a free key.\n2. Open **Settings** (⚙ in the bottom left or top bar) → **OpenRouter API** and enter your key.\n3. Click **Save Preferences**.\n\nAll models ending in \`:free\` have $0 prompt and completion costs!`;
      res.write(`data: ${JSON.stringify({ content: simulatedMsg, finish_reason: 'stop' })}\n\n`);
      res.write('data: [DONE]\n\n');
      res.end();
      return;
    }

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    try {
      const response = await fetch(`${effectiveBaseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${effectiveApiKey}`,
          'HTTP-Referer': effectiveSiteUrl,
          'X-Title': effectiveAppName,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: modelId,
          messages: formattedMessages,
          temperature,
          max_tokens: maxTokens,
          stream: true,
        }),
        signal: abortSignal,
      });

      if (!response.ok) {
        let errorData: any = {};
        try {
          errorData = await response.json();
        } catch (_) {}

        const statusCode = response.status;
        let userMessage = `Error ${statusCode}: Failed to generate response.`;
        const alternatives = this.getAlternativeFreeModels(modelId);

        if (statusCode === 429) {
          userMessage = `The free model **${modelInfo?.name || modelId}** is temporarily experiencing high demand or has reached its free tier rate limit. OpenRouter imposes per-minute and per-day caps on free endpoints.\n\n**Suggested Alternative Free Models:**\n` +
            alternatives.map((a) => `- **${a.name}** (\`${a.id}\`)`).join('\n') +
            `\n\nYou can switch models in the dropdown above and continue your conversation seamlessly.`;
        } else if (statusCode === 401) {
          userMessage = `OpenRouter API Authentication failed (HTTP 401). Please verify your \`OPENROUTER_API_KEY\` in your environment settings.`;
        } else if (statusCode === 404) {
          userMessage = `Model **${modelId}** is currently unavailable on OpenRouter. Please select another verified free model from the dropdown.`;
        } else if (statusCode === 400 && errorData.error?.message) {
          userMessage = `Request rejected: ${errorData.error.message}`;
        }

        res.write(
          `data: ${JSON.stringify({
            error: {
              status: statusCode,
              message: userMessage,
              alternatives,
            },
          })}\n\n`
        );
        res.write('data: [DONE]\n\n');
        res.end();
        return;
      }

      if (!response.body) {
        throw new Error('No readable stream returned by OpenRouter.');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data:')) continue;

          const dataStr = trimmed.replace(/^data:\s*/, '');
          if (dataStr === '[DONE]') {
            res.write('data: [DONE]\n\n');
            continue;
          }

          try {
            const parsed = JSON.parse(dataStr);
            const delta = parsed.choices?.[0]?.delta?.content || '';
            const finishReason = parsed.choices?.[0]?.finish_reason;

            if (delta || finishReason) {
              res.write(
                `data: ${JSON.stringify({
                  content: delta,
                  finish_reason: finishReason,
                })}\n\n`
              );
            }
          } catch (e) {
            // ignore partial JSON parse errors
          }
        }
      }

      res.write('data: [DONE]\n\n');
      res.end();
    } catch (err: any) {
      if (err.name === 'AbortError') {
        res.write('data: [DONE]\n\n');
        res.end();
        return;
      }

      console.error('[OpenRouter Stream Error]:', err);
      res.write(
        `data: ${JSON.stringify({
          error: {
            status: 500,
            message: `Stream interrupted: ${err.message}`,
          },
        })}\n\n`
      );
      res.write('data: [DONE]\n\n');
      res.end();
    }
  }
}

export const openRouterService = new OpenRouterService();

