import { config } from '../config.js';
import {
  FreeModelValidator,
  VerifiedFreeModel,
  RawOpenRouterModel,
  OPENROUTER_FREE_MODEL,
  OPENROUTER_FREE_ROUTER_ID,
  AUTO_FREE_MODEL,
  AUTO_MODEL_ID,
} from './modelValidator.js';
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
  OPENROUTER_FREE_MODEL,
  {
    id: 'nvidia/nemotron-3-ultra-550b-a55b:free',
    name: 'Nemotron 3 Ultra',
    description: 'NVIDIA 550B flagship reasoning model, highly optimized for rapid high-quality dialogue.',
    context_length: 65536,
    provider: 'Nvidia',
    is_free: true,
    supports_vision: false,
    pricing: { prompt: 0, completion: 0 },
    verified_at: new Date().toISOString(),
  },
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
    id: 'nvidia/nemotron-3.5-lightning:free',
    name: 'Nemotron 3.5 Lightning',
    description: 'Ultra-fast low-latency free assistant model from NVIDIA.',
    context_length: 32768,
    provider: 'Nvidia',
    is_free: true,
    supports_vision: false,
    pricing: { prompt: 0, completion: 0 },
    verified_at: new Date().toISOString(),
  },
  {
    id: 'dots-studio/dots-3-note-preview:free',
    name: 'Dots 3 Note Preview',
    description: 'Lightweight free model tuned for notes, drafting and creative workflows.',
    context_length: 16384,
    provider: 'Dots Studio',
    is_free: true,
    supports_vision: false,
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
];

class OpenRouterService {
  private verifiedModelsCache: Map<string, VerifiedFreeModel> = new Map();
  private lastFetchTime: number = 0;
  private readonly CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes dynamic cache for fresh model tracking
  private modelCooldowns: Map<string, number> = new Map(); // modelId -> cooldown expiration timestamp

  constructor() {
    // Seed initial cache with official router and top fallback models
    for (const m of INITIAL_VERIFIED_FREE_MODELS) {
      this.verifiedModelsCache.set(m.id, m);
    }
  }

  getLastFetchTime(): number {
    return this.lastFetchTime;
  }

  /**
   * Checks whether a model is temporarily in rate-limit cooldown.
   */
  isModelInCooldown(modelId: string): boolean {
    const expiresAt = this.modelCooldowns.get(modelId);
    if (!expiresAt) return false;
    if (Date.now() > expiresAt) {
      this.modelCooldowns.delete(modelId);
      return false;
    }
    return true;
  }

  /**
   * Puts a model on temporary cooldown when rate limited (HTTP 429) or unavailable.
   */
  markModelCooldown(modelId: string, durationMs = 90_000): void {
    this.modelCooldowns.set(modelId, Date.now() + durationMs);
    console.warn(`[OpenRouter RateLimit] Model '${modelId}' marked on cooldown for ${durationMs / 1000}s`);
  }

  /**
   * Retrieves all verified free models from OpenRouter dynamically.
   * Regularly refreshes the list to capture new free models.
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

      // Always include official OpenRouter Free Models Router at index 0
      newMap.set(OPENROUTER_FREE_ROUTER_ID, OPENROUTER_FREE_MODEL);

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
        console.log(`[OpenRouter] Successfully verified and refreshed ${newMap.size} free models.`);
      }

      return Array.from(this.verifiedModelsCache.values());
    } catch (err: any) {
      console.error('[OpenRouter] Network error fetching models:', err.message);
      return Array.from(this.verifiedModelsCache.values());
    }
  }

  /**
   * Checks if a model ID is strictly free.
   * Supports 'openrouter/free', 'auto', and 'auto:free'.
   */
  async isModelEligibleFree(modelId: string, customConfig?: ClientOpenRouterConfig): Promise<boolean> {
    if (!modelId) return true; // defaults to openrouter/free
    const lower = modelId.trim().toLowerCase();
    if (lower === 'openrouter/free' || lower === 'auto' || lower === 'auto:free') {
      return true;
    }
    if (!lower.endsWith(':free')) {
      return false;
    }

    if (this.verifiedModelsCache.has(modelId)) {
      return true;
    }

    await this.getVerifiedFreeModels(true, customConfig);
    return this.verifiedModelsCache.has(modelId);
  }

  /**
   * Returns a specific verified free model or null.
   */
  async getModel(modelId: string): Promise<VerifiedFreeModel | null> {
    if (!modelId || modelId === OPENROUTER_FREE_ROUTER_ID || modelId === AUTO_MODEL_ID || modelId === 'auto') {
      return OPENROUTER_FREE_MODEL;
    }
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
   * Generates candidate models ordered by priority and health.
   * When openrouter/free (or auto) is selected, openrouter/free is tried first,
   * followed immediately by individual top verified free models as rate-limit failovers.
   */
  async getCandidateModels(
    requestedModelId: string,
    requiresVision: boolean,
    customConfig?: ClientOpenRouterConfig
  ): Promise<VerifiedFreeModel[]> {
    const allModels = await this.getVerifiedFreeModels(false, customConfig);
    const isAutoOrRouter =
      !requestedModelId ||
      requestedModelId === 'auto' ||
      requestedModelId === 'auto:free' ||
      requestedModelId === OPENROUTER_FREE_ROUTER_ID;

    // Filter by vision requirement if images are attached
    let eligible = allModels;
    if (requiresVision) {
      const visionModels = allModels.filter((m) => m.supports_vision);
      if (visionModels.length > 0) {
        eligible = visionModels;
      }
    }

    // Ordered list of top-performing reliable free models
    const PRIORITY_ORDER = [
      'openrouter/free',
      'nvidia/nemotron-3-ultra-550b-a55b:free',
      'meta-llama/llama-3.3-70b-instruct:free',
      'deepseek/deepseek-chat:free',
      'deepseek/deepseek-r1:free',
      'nvidia/nemotron-3.5-lightning:free',
      'qwen/qwen-2.5-coder-32b-instruct:free',
      'mistralai/mistral-small-24b-instruct-2501:free',
      'google/gemini-2.0-flash-exp:free',
      'google/gemini-2.0-flash-thinking-exp:free',
      'dots-studio/dots-3-note-preview:free',
    ];

    const sortScore = (m: VerifiedFreeModel) => {
      // If user selected a specific model, prioritize it unless it is already known to be in cooldown
      if (!isAutoOrRouter && m.id === requestedModelId) {
        return this.isModelInCooldown(m.id) ? 500 : -1000;
      }
      if (isAutoOrRouter && m.id === OPENROUTER_FREE_ROUTER_ID) {
        return this.isModelInCooldown(m.id) ? 300 : -1000;
      }
      // Move models currently in cooldown down the list
      if (this.isModelInCooldown(m.id)) return 1000;
      const idx = PRIORITY_ORDER.indexOf(m.id);
      return idx >= 0 ? idx : 100;
    };

    const sorted = [...eligible].sort((a, b) => sortScore(a) - sortScore(b));

    // If requested model wasn't in cache but has valid :free suffix, insert it as first candidate
    if (!isAutoOrRouter && !sorted.some((m) => m.id === requestedModelId) && requestedModelId.endsWith(':free')) {
      const fallbackName = requestedModelId.split('/').pop()?.replace(':free', '') || requestedModelId;
      const requestedObj: VerifiedFreeModel = {
        id: requestedModelId,
        name: fallbackName,
        description: 'Selected Free Model',
        context_length: 32768,
        provider: requestedModelId.split('/')[0] || 'OpenRouter',
        is_free: true,
        supports_vision: requiresVision,
        pricing: { prompt: 0, completion: 0 },
        verified_at: new Date().toISOString(),
      };
      sorted.unshift(requestedObj);
    }

    return sorted;
  }

  /**
   * Prepares and formats chat messages and attachments for a specific target model.
   */
  private formatMessagesForModel(
    messages: StreamChatPayload['messages'],
    model: VerifiedFreeModel,
    effectiveSystemPrompt: string
  ): ChatMessage[] {
    const formatted: ChatMessage[] = [];

    if (effectiveSystemPrompt) {
      formatted.push({
        role: 'system',
        content: effectiveSystemPrompt,
      });
    }

    for (const msg of messages) {
      let textContent = msg.content || '';

      if (msg.role === 'assistant' && textContent) {
        textContent = textContent
          .replace(/\n\n> ⚠️ \*\*Error\*\*[\s\S]*$/gi, '')
          .replace(/\n\n> ⚠️ \*\*Notice\*\*[\s\S]*$/gi, '')
          .replace(/\n\n> ⚡ \*\*Auto Rate-Limit Switch\*\*[\s\S]*$/gi, '')
          .trimEnd();
      }

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

        if (imageAttachments.length > 0) {
          if (model.supports_vision) {
            const contentParts: any[] = [{ type: 'text', text: textContent }];
            for (const img of imageAttachments) {
              contentParts.push({
                type: 'image_url',
                image_url: {
                  url: img.content.startsWith('data:') ? img.content : `data:${img.type};base64,${img.content}`,
                },
              });
            }
            formatted.push({
              role: msg.role,
              content: contentParts,
            });
            continue;
          } else {
            textContent += `\n\n[Notice: ${imageAttachments.length} image attachment(s) included, but ${model.name} does not support vision inputs.]`;
          }
        }
      }

      formatted.push({
        role: msg.role,
        content: textContent,
      });
    }

    return formatted;
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
   * AUTOMATIC RATE-LIMIT FAILOVER: If openrouter/free or any model returns 429 (rate limit) or 502/503/504,
   * automatically fails over to the next healthy verified free model without interruption or manual intervention.
   */
  async streamChat(payload: StreamChatPayload, res: Response, abortSignal?: AbortSignal) {
    const { modelId, messages, systemPrompt, temperature = 0.7, maxTokens = 4096 } = payload;

    // Fail-closed enforcement: Re-verify model eligibility
    const isFree = await this.isModelEligibleFree(modelId, payload.customConfig);
    if (!isFree) {
      res.status(403).json({
        error: {
          code: 'UNAUTHORIZED_MODEL',
          message: `Security violation: Model '${modelId}' is not a verified OpenRouter FREE model. The application strictly forbids paid models.`,
        },
      });
      return;
    }

    const FILE_CAPABILITY_INSTRUCTION = `[ENVIRONMENT CAPABILITIES & DELIVERABLE SPECIFICATIONS]:
This chat interface natively supports downloadable files, code artifacts, and script files.
When asked to create, deliver, or export a file (such as script_*.txt, image_prompts_*.txt, .py, .json, .csv, markdown):
1. NEVER state or say "I cannot create actual downloadable files in this chat environment" or refuse file delivery.
2. Deliver the complete content inside a fenced code block with the filename specified (e.g. \`\`\`text:filename="script_[topic].txt"\\n...\\n\`\`\`).
3. The user interface automatically renders a 1-click Download button allowing the user to immediately download the file to their machine.`;

    let effectiveSystemPrompt = systemPrompt ? systemPrompt.trim() : '';
    if (effectiveSystemPrompt) {
      effectiveSystemPrompt = effectiveSystemPrompt.replace(
        /If you cannot create an actual downloadable file in the current environment[\s\S]*?state the limitation briefly\./gi,
        'Deliver the complete narration script inside a downloadable file block named script_[short_topic_slug].txt. The chat environment automatically provides a 1-click Download button for the file.'
      );
      effectiveSystemPrompt = `${effectiveSystemPrompt}\n\n---\n\n${FILE_CAPABILITY_INSTRUCTION}`;
    } else {
      effectiveSystemPrompt = FILE_CAPABILITY_INSTRUCTION;
    }

    const effectiveApiKey = payload.customConfig?.apiKey?.trim() || config.openrouter.apiKey;
    const effectiveBaseUrl = payload.customConfig?.baseUrl?.trim() || config.openrouter.baseUrl;
    const effectiveAppName = payload.customConfig?.appName?.trim() || config.openrouter.appName;
    const effectiveSiteUrl = payload.customConfig?.siteUrl?.trim() || config.openrouter.siteUrl;

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();

    if (!effectiveApiKey) {
      const simulatedMsg = `### OpenRouter API Key Required\n\nTo start chatting with free AI models, please configure your free OpenRouter API key:\n\n1. Visit [OpenRouter Keys](https://openrouter.ai/settings/keys) and create a free key.\n2. Open **Settings** (⚙ in the bottom left or top bar) → **OpenRouter API** and enter your key.\n3. Click **Save Preferences**.\n\nAll models ending in \`:free\` have $0 prompt and completion costs!`;
      res.write(`data: ${JSON.stringify({ content: simulatedMsg, finish_reason: 'stop' })}\n\n`);
      res.write('data: [DONE]\n\n');
      (res as any).flush?.();
      res.end();
      return;
    }

    const requiresVision = messages.some((m) => m.attachments && m.attachments.some((a) => a.isImage));
    const candidates = await this.getCandidateModels(modelId, requiresVision, payload.customConfig);

    if (candidates.length === 0) {
      res.write(`data: ${JSON.stringify({ error: { status: 500, message: 'No verified free models are currently available.' } })}\n\n`);
      res.write('data: [DONE]\n\n');
      res.end();
      return;
    }

    const isAutoOrRouter =
      !modelId ||
      modelId === 'auto' ||
      modelId === 'auto:free' ||
      modelId === OPENROUTER_FREE_ROUTER_ID;

    const attemptedModels: string[] = [];
    let switchedFrom: string | null = null;
    const maxAttempts = Math.min(candidates.length, 5);

    // Multi-candidate automatic failover loop
    for (let i = 0; i < maxAttempts; i++) {
      if (abortSignal?.aborted) {
        res.write('data: [DONE]\n\n');
        res.end();
        return;
      }

      const candidate = candidates[i];
      const currentModelId = candidate.id;
      attemptedModels.push(candidate.name);

      try {
        const formattedMessages = this.formatMessagesForModel(messages, candidate, effectiveSystemPrompt);

        const response = await fetch(`${effectiveBaseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${effectiveApiKey}`,
            'HTTP-Referer': effectiveSiteUrl,
            'X-Title': effectiveAppName,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: currentModelId,
            messages: formattedMessages,
            temperature,
            max_tokens: maxTokens,
            stream: true,
          }),
          signal: abortSignal,
        });

        if (!response.ok) {
          const statusCode = response.status;
          let errorJson: any = {};
          try {
            errorJson = await response.json();
          } catch (_) {}

          console.warn(`[OpenRouter Auto-Failover] Model '${currentModelId}' returned HTTP ${statusCode}: ${errorJson?.error?.message || response.statusText}`);

          // Rate limit (429) or upstream outage (502, 503, 504, 404, 408)
          if (statusCode === 429 || statusCode === 502 || statusCode === 503 || statusCode === 504 || statusCode === 404 || statusCode === 408) {
            this.markModelCooldown(currentModelId, 90_000);
            if (!switchedFrom) {
              switchedFrom = currentModelId;
            }
            // Automatically try next candidate model!
            continue;
          }

          if (statusCode === 401) {
            res.write(`data: ${JSON.stringify({ error: { status: 401, message: 'OpenRouter API Key authentication failed. Please check your key in Settings.' } })}\n\n`);
            res.write('data: [DONE]\n\n');
            res.end();
            return;
          }

          // Other errors: mark cooldown and attempt next free model
          this.markModelCooldown(currentModelId, 60_000);
          continue;
        }

        if (!response.body) {
          this.markModelCooldown(currentModelId, 60_000);
          continue;
        }

        // Successfully connected to candidate model!
        const didAutoSwitch = switchedFrom || (candidate.id !== modelId && !isAutoOrRouter);
        if (didAutoSwitch) {
          const originalName = switchedFrom ? (candidates.find((c) => c.id === switchedFrom)?.name || switchedFrom) : modelId;
          const switchReason = `Rate limit reached on ${originalName}. Automatically switched to ${candidate.name} without interruption.`;

          res.write(
            `data: ${JSON.stringify({
              model_switched: {
                from: switchedFrom || modelId,
                to: candidate.id,
                model_name: candidate.name,
                provider: candidate.provider,
                reason: switchReason,
              },
            })}\n\n`
          );
        }

        // Stream response chunks and capture underlying routed model if openrouter/free
        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let buffer = '';
        let actualAssignedModel = candidate.id;
        let notifiedAssignedModel = false;

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
              // OpenRouter passes the actual underlying selected model in parsed.model
              if (parsed.model && parsed.model !== actualAssignedModel) {
                actualAssignedModel = parsed.model;
                if (!notifiedAssignedModel && currentModelId === OPENROUTER_FREE_ROUTER_ID) {
                  notifiedAssignedModel = true;
                  res.write(
                    `data: ${JSON.stringify({
                      model_switched: {
                        from: OPENROUTER_FREE_ROUTER_ID,
                        to: actualAssignedModel,
                        model_name: actualAssignedModel,
                        provider: 'OpenRouter Free Router',
                        reason: `OpenRouter Free Models Router automatically assigned ${actualAssignedModel}.`,
                      },
                    })}\n\n`
                  );
                }
              }

              const delta = parsed.choices?.[0]?.delta?.content || '';
              const finishReason = parsed.choices?.[0]?.finish_reason;

              if (delta || finishReason) {
                res.write(
                  `data: ${JSON.stringify({
                    content: delta,
                    finish_reason: finishReason,
                    model_id: actualAssignedModel,
                    model_name: actualAssignedModel,
                  })}\n\n`
                );
                (res as any).flush?.();
              }
            } catch (e) {
              // ignore partial JSON parse errors
            }
          }
        }

        res.write('data: [DONE]\n\n');
        res.end();
        return; // Completed successfully!
      } catch (err: any) {
        if (err.name === 'AbortError') {
          res.write('data: [DONE]\n\n');
          res.end();
          return;
        }
        console.warn(`[OpenRouter Network Failover] Candidate '${currentModelId}' threw error: ${err.message}. Trying next candidate...`);
        this.markModelCooldown(currentModelId, 60_000);
        continue;
      }
    }

    // If all candidate models failed
    const errorNotice = `> ⚠️ **All Free Models Temporarily At Capacity**: Tested ${attemptedModels.join(', ')} but all are currently experiencing high global traffic or rate limits on OpenRouter.\n\nPlease click **Resume Task** in 30 seconds to automatically retry.`;
    res.write(
      `data: ${JSON.stringify({
        error: {
          status: 429,
          message: 'All free models are temporarily rate-limited. Automatic failover will retry on next request.',
        },
        content: `\n\n${errorNotice}\n`,
      })}\n\n`
    );
    res.write('data: [DONE]\n\n');
    res.end();
  }
}

export const openRouterService = new OpenRouterService();
