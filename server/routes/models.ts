import { Router, Request } from 'express';
import { openRouterService, ClientOpenRouterConfig } from '../services/openrouter.js';

const router = Router();

function getClientConfig(req: Request): ClientOpenRouterConfig {
  return {
    apiKey: (req.headers['x-openrouter-key'] as string) || req.body?.apiKey,
    baseUrl: (req.headers['x-openrouter-base-url'] as string) || req.body?.baseUrl,
    appName: (req.headers['x-openrouter-app-name'] as string) || req.body?.appName,
    siteUrl: (req.headers['x-openrouter-site-url'] as string) || req.body?.siteUrl,
  };
}

// GET /api/models - Returns all verified free models
router.get('/', async (req, res) => {
  try {
    const customConfig = getClientConfig(req);
    const models = await openRouterService.getVerifiedFreeModels(false, customConfig);
    res.json({
      success: true,
      data: models,
      total: models.length,
      refreshed_at: new Date(openRouterService.getLastFetchTime() || Date.now()).toISOString(),
      note: 'All models verified strictly for zero prompt and completion pricing with :free suffix or openrouter/free router.',
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/models/refresh - Re-fetches models from OpenRouter dynamically
router.post('/refresh', async (req, res) => {
  try {
    const customConfig = getClientConfig(req);
    const models = await openRouterService.getVerifiedFreeModels(true, customConfig);
    res.json({
      success: true,
      data: models,
      total: models.length,
      refreshed_at: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/models/:id - Get specific free model details
router.get('/:id(*)', async (req, res) => {
  try {
    const modelId = req.params.id;
    const model = await openRouterService.getModel(modelId);
    if (!model) {
      return res.status(404).json({
        success: false,
        error: `Model '${modelId}' is either unavailable or does not meet free tier eligibility.`,
      });
    }
    res.json({ success: true, data: model });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
