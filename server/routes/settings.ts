import { Router, Request, Response } from 'express';
import { storageService } from '../services/storage.js';
import { openRouterService } from '../services/openrouter.js';

const router = Router();

function getUserId(req: Request): string {
  const customHeader = req.headers['x-user-id'];
  if (typeof customHeader === 'string' && customHeader.trim()) {
    return customHeader.trim();
  }
  return 'default-user';
}

// GET /api/settings - User settings
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const settings = await storageService.getUserSettings(userId);
    res.json({ success: true, data: settings });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PATCH /api/settings - Update user settings
router.patch('/', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const { default_model, theme, custom_instructions, preferences } = req.body;

    const updated = await storageService.updateUserSettings(userId, {
      default_model,
      theme,
      custom_instructions,
      preferences,
    });

    res.json({ success: true, data: updated });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/settings/test-openrouter - Test connection to OpenRouter
router.get('/test-openrouter', async (_req: Request, res: Response) => {
  try {
    const result = await openRouterService.testConnection();
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/settings/export - Export conversation & project data
router.get('/export', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const data = await storageService.exportUserData(userId);
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="aether-export-${Date.now()}.json"`);
    res.send(JSON.stringify(data, null, 2));
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Projects endpoints
router.get('/projects', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const projects = await storageService.listProjects(userId);
    res.json({ success: true, data: projects });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/projects', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const { name, description, custom_instructions } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Project name is required.' });
    }

    const project = await storageService.createProject({
      id: `proj-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      user_id: userId,
      name,
      description: description || '',
      custom_instructions: custom_instructions || '',
    });

    res.json({ success: true, data: project });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.patch('/projects/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const { name, description, custom_instructions } = req.body;

    const updated = await storageService.updateProject(req.params.id, userId, {
      name,
      description,
      custom_instructions,
    });

    if (!updated) {
      return res.status(404).json({ success: false, error: 'Project not found.' });
    }

    res.json({ success: true, data: updated });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.delete('/projects/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const success = await storageService.deleteProject(req.params.id, userId);
    res.json({ success });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;

