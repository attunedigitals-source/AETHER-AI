import { Router } from 'express';
import { openRouterService } from '../services/openrouter.js';

const router = Router();

// GET /api/models - Returns all verified free models
router.get('/', async (req, res) => {
  try {
    const models = await openRouterService.getVerifiedFreeModels(false);
    res.json({
      success: true,
      data: models,
      total: models.length,
      note: 'All models verified strictly for zero prompt and completion pricing with :free suffix.',
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/models/refresh - Re-fetches models from OpenRouter dynamically
router.post('/refresh', async (req, res) => {
  try {
    const models = await openRouterService.getVerifiedFreeModels(true);
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

