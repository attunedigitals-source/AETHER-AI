import { Router, Request, Response } from 'express';
import { openRouterService } from '../services/openrouter.js';
import { storageService } from '../services/storage.js';

const router = Router();

// Helper to get authenticated user ID or guest default
function getUserId(req: Request): string {
  const customHeader = req.headers['x-user-id'];
  if (typeof customHeader === 'string' && customHeader.trim()) {
    return customHeader.trim();
  }
  return 'default-user';
}

// POST /api/chat/stream - Streaming inference SSE
router.post('/stream', async (req: Request, res: Response) => {
  const { modelId, messages, systemPrompt, temperature, maxTokens, openrouterConfig } = req.body;
  const effectiveModelId = modelId || 'auto:free';

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Missing messages array.' });
  }

  const customConfig = {
    apiKey: (req.headers['x-openrouter-key'] as string) || openrouterConfig?.apiKey,
    baseUrl: (req.headers['x-openrouter-base-url'] as string) || openrouterConfig?.baseUrl,
    appName: (req.headers['x-openrouter-app-name'] as string) || openrouterConfig?.appName,
    siteUrl: (req.headers['x-openrouter-site-url'] as string) || openrouterConfig?.siteUrl,
  };

  // Handle client disconnect only when the response connection is terminated prematurely
  const abortController = new AbortController();
  res.on('close', () => {
    if (!res.writableEnded) {
      abortController.abort();
    }
  });

  await openRouterService.streamChat(
    {
      modelId: effectiveModelId,
      messages,
      systemPrompt,
      temperature,
      maxTokens,
      customConfig,
    },
    res,
    abortController.signal
  );
});

// GET /api/conversations - List conversations
router.get('/conversations', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const conversations = await storageService.listConversations(userId);
    res.json({ success: true, data: conversations });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/conversations - Create conversation
router.post('/conversations', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const { id, title, model_id, project_id } = req.body;

    const conv = await storageService.createConversation({
      id: id || `conv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      user_id: userId,
      title: title || 'New Conversation',
      model_id: model_id || 'meta-llama/llama-3.3-70b-instruct:free',
      project_id: project_id || null,
      is_archived: false,
      is_starred: false,
    });

    res.json({ success: true, data: conv });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/conversations/:id - Get conversation with messages
router.get('/conversations/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const conv = await storageService.getConversation(req.params.id, userId);

    if (!conv) {
      return res.status(404).json({ success: false, error: 'Conversation not found.' });
    }

    const messages = await storageService.listMessages(req.params.id, userId);
    res.json({
      success: true,
      data: {
        ...conv,
        messages,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PATCH /api/conversations/:id - Update conversation
router.patch('/conversations/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const { title, model_id, is_archived, is_starred, project_id } = req.body;

    const updated = await storageService.updateConversation(req.params.id, userId, {
      title,
      model_id,
      is_archived,
      is_starred,
      project_id,
    });

    if (!updated) {
      return res.status(404).json({ success: false, error: 'Conversation not found.' });
    }

    res.json({ success: true, data: updated });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/conversations/:id - Delete conversation
router.delete('/conversations/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const success = await storageService.deleteConversation(req.params.id, userId);
    res.json({ success });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/conversations - Delete all conversations
router.delete('/conversations', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    await storageService.deleteAllConversations(userId);
    res.json({ success: true, message: 'All conversations cleared.' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/messages - Save message
router.post('/messages', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const { id, conversation_id, role, content, attachments, model_id } = req.body;

    if (!conversation_id || !role || content === undefined) {
      return res.status(400).json({ error: 'Missing conversation_id, role, or content.' });
    }

    // Verify ownership
    const conv = await storageService.getConversation(conversation_id, userId);
    if (!conv) {
      return res.status(404).json({ error: 'Conversation not found.' });
    }

    const saved = await storageService.saveMessage({
      id: id || `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      conversation_id,
      role,
      content,
      attachments: attachments || [],
      model_id: model_id || null,
    });

    res.json({ success: true, data: saved });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;

