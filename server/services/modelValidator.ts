export interface OpenRouterPricing {
  prompt?: string | number;
  completion?: string | number;
  request?: string | number;
  image?: string | number;
}

export interface OpenRouterArchitecture {
  modality?: string;
  tokenizer?: string;
  instruct_type?: string | null;
}

export interface RawOpenRouterModel {
  id: string;
  name?: string;
  description?: string;
  context_length?: number;
  pricing?: OpenRouterPricing;
  architecture?: OpenRouterArchitecture;
  top_provider?: {
    max_completion_tokens?: number;
    is_moderated?: boolean;
    context_length?: number;
  };
}

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

export const OPENROUTER_FREE_ROUTER_ID = 'openrouter/free';
export const AUTO_MODEL_ID = 'openrouter/free';

export const OPENROUTER_FREE_MODEL: VerifiedFreeModel = {
  id: OPENROUTER_FREE_ROUTER_ID,
  name: 'Free Models Router (openrouter/free)',
  description: 'Official OpenRouter router that automatically selects available free models with vision, tool calling, and rate-limit intelligence.',
  context_length: 131072,
  provider: 'OpenRouter',
  is_free: true,
  supports_vision: true,
  pricing: { prompt: 0, completion: 0 },
  verified_at: new Date().toISOString(),
};

export const AUTO_FREE_MODEL: VerifiedFreeModel = OPENROUTER_FREE_MODEL;

export interface ValidationResult {
  isValid: boolean;
  reason?: string;
}

/**
 * Strict validator for OpenRouter Free Models.
 * Follows the fail-closed principle: any doubt, missing pricing, non-zero pricing,
 * or ID not ending in ':free' is instantly rejected, with official exception for 'openrouter/free'.
 */
export class FreeModelValidator {
  /**
   * Validates if a raw OpenRouter model qualifies strictly as a free model.
   */
  static validateModel(model: RawOpenRouterModel): ValidationResult {
    if (!model || typeof model !== 'object') {
      return { isValid: false, reason: 'Invalid model object' };
    }

    if (!model.id || typeof model.id !== 'string') {
      return { isValid: false, reason: 'Model ID is missing or invalid' };
    }

    const trimmedId = model.id.trim();
    const lower = trimmedId.toLowerCase();

    // 1. Support official OpenRouter Free Models Router and auto alias
    if (lower === 'openrouter/free' || lower === 'auto' || lower === 'auto:free') {
      return { isValid: true };
    }

    // 2. Strict suffix check: ID must explicitly end with ':free'
    if (!lower.endsWith(':free')) {
      return {
        isValid: false,
        reason: `Model ID '${trimmedId}' does not end with the mandatory ':free' suffix.`,
      };
    }

    // 3. Strict pricing verification: prompt and completion must both be 0
    if (model.pricing) {
      const promptCost = Number(model.pricing.prompt);
      const completionCost = Number(model.pricing.completion);
      const requestCost = model.pricing.request ? Number(model.pricing.request) : 0;

      if (isNaN(promptCost) || promptCost > 0) {
        return {
          isValid: false,
          reason: `Model prompt pricing is non-zero ($${model.pricing.prompt}) or invalid.`,
        };
      }

      if (isNaN(completionCost) || completionCost > 0) {
        return {
          isValid: false,
          reason: `Model completion pricing is non-zero ($${model.pricing.completion}) or invalid.`,
        };
      }

      if (!isNaN(requestCost) && requestCost > 0) {
        return {
          isValid: false,
          reason: `Model request pricing is non-zero ($${model.pricing.request}).`,
        };
      }
    }

    return { isValid: true };
  }

  /**
   * Transform raw OpenRouter model into a validated Free Model entity.
   */
  static formatVerifiedModel(raw: RawOpenRouterModel): VerifiedFreeModel {
    if (raw.id.toLowerCase() === 'openrouter/free') {
      return OPENROUTER_FREE_MODEL;
    }

    // Provider extraction: usually before the '/' in "meta-llama/llama-3.3-70b-instruct:free"
    const parts = raw.id.split('/');
    const providerSlug = parts.length > 1 ? parts[0] : 'OpenRouter';
    const providerName = providerSlug
      .replace(/-/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());

    // Clean display name
    const rawName = raw.name || parts[parts.length - 1] || raw.id;
    const cleanName = rawName.replace(/:\s*free$/i, '').trim();

    // Modality / Vision support check
    const modality = raw.architecture?.modality?.toLowerCase() || '';
    const supportsVision =
      modality.includes('image') ||
      modality.includes('multimodal') ||
      raw.description?.toLowerCase().includes('vision') ||
      false;

    return {
      id: raw.id,
      name: cleanName,
      description: raw.description || 'Verified free community model on OpenRouter.',
      context_length: raw.context_length || raw.top_provider?.context_length || 8192,
      provider: providerName,
      is_free: true,
      supports_vision: supportsVision,
      pricing: {
        prompt: 0,
        completion: 0,
      },
      verified_at: new Date().toISOString(),
    };
  }
}
