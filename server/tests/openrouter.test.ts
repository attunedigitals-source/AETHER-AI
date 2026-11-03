import test from 'node:test';
import assert from 'node:assert/strict';
import { openRouterService } from '../services/openrouter.js';
import { VerifiedFreeModel } from '../services/modelValidator.js';

test('OpenRouterService: Verifies free models cache correctly', async () => {
  const models = await openRouterService.getVerifiedFreeModels(false);
  assert.ok(models.length > 0, 'Should have initial verified free models');

  // Verify all returned models are 100% free and have :free suffix
  for (const model of models) {
    assert.ok(model.id.endsWith(':free'), `Model ${model.id} must end with :free`);
    assert.equal(model.is_free, true);
    assert.equal(model.pricing.prompt, 0);
    assert.equal(model.pricing.completion, 0);
  }
});

test('OpenRouterService: Strictly rejects paid model IDs (Fail-Closed)', async () => {
  const isPaidEligible = await openRouterService.isModelEligibleFree('openai/gpt-4o');
  assert.equal(isPaidEligible, false, 'Paid models like gpt-4o must be rejected');

  const isClaudeEligible = await openRouterService.isModelEligibleFree('anthropic/claude-3.5-sonnet');
  assert.equal(isClaudeEligible, false, 'Paid models like claude-3.5-sonnet must be rejected');

  const isArbitraryEligible = await openRouterService.isModelEligibleFree('custom/random-model');
  assert.equal(isArbitraryEligible, false, 'Unverified models without :free suffix must be rejected');
});

test('OpenRouterService: Approves verified free model IDs', async () => {
  const models = await openRouterService.getVerifiedFreeModels(false);
  assert.ok(models.length > 0);
  const sampleModel = models[0];
  const isEligible = await openRouterService.isModelEligibleFree(sampleModel.id);
  assert.equal(isEligible, true, `Verified free model ${sampleModel.id} should be accepted`);
});

test('OpenRouterService: Provides alternative free models on demand', () => {
  const alternatives = openRouterService.getAlternativeFreeModels('meta-llama/llama-3.3-70b-instruct:free');
  assert.ok(alternatives.length > 0, 'Should return alternatives');
  assert.ok(!alternatives.some((a: VerifiedFreeModel) => a.id === 'meta-llama/llama-3.3-70b-instruct:free'), 'Should not include the same model');
});
