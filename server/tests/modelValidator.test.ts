import test from 'node:test';
import assert from 'node:assert/strict';
import { FreeModelValidator, RawOpenRouterModel } from '../services/modelValidator.js';

test('FreeModelValidator: Validates legitimate free models', () => {
  const validModel: RawOpenRouterModel = {
    id: 'meta-llama/llama-3.3-70b-instruct:free',
    name: 'Meta: Llama 3.3 70B Instruct (free)',
    description: 'A powerful open model by Meta',
    context_length: 131072,
    pricing: {
      prompt: '0',
      completion: '0',
      request: '0',
    },
    architecture: {
      modality: 'text->text',
    },
  };

  const result = FreeModelValidator.validateModel(validModel);
  assert.equal(result.isValid, true);

  const formatted = FreeModelValidator.formatVerifiedModel(validModel);
  assert.equal(formatted.id, 'meta-llama/llama-3.3-70b-instruct:free');
  assert.equal(formatted.provider, 'Meta Llama');
  assert.equal(formatted.is_free, true);
  assert.equal(formatted.pricing.prompt, 0);
  assert.equal(formatted.pricing.completion, 0);
  assert.equal(formatted.supports_vision, false);
});

test('FreeModelValidator: Rejects paid models without :free suffix', () => {
  const paidModels: RawOpenRouterModel[] = [
    {
      id: 'anthropic/claude-3.5-sonnet',
      pricing: { prompt: '0.000003', completion: '0.000015' },
    },
    {
      id: 'openai/gpt-4o',
      pricing: { prompt: '0.000005', completion: '0.000015' },
    },
    {
      id: 'google/gemini-pro',
      pricing: { prompt: '0.0000005', completion: '0.0000015' },
    },
  ];

  for (const model of paidModels) {
    const result = FreeModelValidator.validateModel(model);
    assert.equal(result.isValid, false);
    assert.match(result.reason || '', /does not end with the mandatory ':free' suffix/);
  }
});

test('FreeModelValidator: Rejects pseudo-free models with non-zero pricing (Fail-Closed)', () => {
  const trickyModel: RawOpenRouterModel = {
    id: 'rogue-provider/sneak-model:free',
    pricing: {
      prompt: '0.000001', // Non-zero prompt!
      completion: '0',
    },
  };

  const result = FreeModelValidator.validateModel(trickyModel);
  assert.equal(result.isValid, false);
  assert.match(result.reason || '', /non-zero/);
});

test('FreeModelValidator: Rejects models with non-zero completion cost', () => {
  const trickyModel: RawOpenRouterModel = {
    id: 'rogue-provider/sneak-model-2:free',
    pricing: {
      prompt: '0',
      completion: '0.0005',
    },
  };

  const result = FreeModelValidator.validateModel(trickyModel);
  assert.equal(result.isValid, false);
  assert.match(result.reason || '', /non-zero/);
});

test('FreeModelValidator: Detects vision/multimodal capabilities properly', () => {
  const visionModel: RawOpenRouterModel = {
    id: 'google/gemini-2.0-flash-exp:free',
    name: 'Google Gemini 2.0 Flash Exp (free)',
    description: 'Multimodal vision model',
    context_length: 1048576,
    pricing: { prompt: 0, completion: 0 },
    architecture: {
      modality: 'multimodal',
    },
  };

  const result = FreeModelValidator.validateModel(visionModel);
  assert.equal(result.isValid, true);

  const formatted = FreeModelValidator.formatVerifiedModel(visionModel);
  assert.equal(formatted.supports_vision, true);
});

