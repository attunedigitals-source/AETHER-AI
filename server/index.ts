import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from './config.js';
import modelsRouter from './routes/models.js';
import chatRouter from './routes/chat.js';
import uploadRouter from './routes/upload.js';
import settingsRouter from './routes/settings.js';
import { openRouterService } from './services/openrouter.js';

const __filename = typeof import.meta?.url === 'string' ? fileURLToPath(import.meta.url) : '';
const __dirname = __filename ? path.dirname(__filename) : process.cwd();

const app = express();

// Security & Cross-Origin Configuration
app.use(cors());
app.use(express.json({ limit: '30mb' }));
app.use(express.urlencoded({ extended: true, limit: '30mb' }));

// Request logging (sanitized, NEVER logs sensitive API keys)
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (req.path.startsWith('/api') && req.path !== '/api/health') {
      console.log(`[HTTP] ${req.method} ${req.path} -> ${res.statusCode} (${duration}ms)`);
    }
  });
  next();
});

// Vercel Serverless URL rewrite path normalizer
app.use((req, _res, next) => {
  if (req.originalUrl && req.url !== req.originalUrl) {
    req.url = req.originalUrl;
  }
  next();
});

// API Routes
app.use('/api/models', modelsRouter);
app.use('/api/chat', chatRouter);
app.use('/api', chatRouter); // mounts /api/conversations, /api/messages
app.use('/api/upload', uploadRouter);
app.use('/api/settings', settingsRouter);
app.use('/api', settingsRouter); // mounts /api/projects

// Healthcheck endpoint
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'Aether Claude AI Backend',
    free_models_only: true,
    has_api_key: Boolean(config.openrouter.apiKey),
    supabase_configured: Boolean(config.supabase.url),
  });
});

// Production client serving
if (config.nodeEnv === 'production' && process.env.VERCEL !== '1') {
  const clientDist = path.resolve(__dirname, '../../dist');
  app.use(express.static(clientDist));
  app.get('*', (_req, res) => {
    res.sendFile(path.resolve(clientDist, 'index.html'));
  });
}

// Start Server if not in Vercel serverless environment
if (process.env.VERCEL !== '1') {
  app.listen(config.port, async () => {
    console.log(`\n======================================================`);
    console.log(`  ✦ Aether AI Assistant Server running on http://localhost:${config.port}`);
    console.log(`  ✦ Mode: ${config.nodeEnv}`);
    console.log(`  ✦ Free Models Only Policy: ENFORCED (Fail-closed)`);
    console.log(`  ✦ OpenRouter Key Configured: ${config.openrouter.apiKey ? 'YES (Masked)' : 'NO'}`);
    console.log(`======================================================\n`);

    // Warm up verified models cache on boot
    try {
      const models = await openRouterService.getVerifiedFreeModels(false);
      console.log(`[Boot] Initialized with ${models.length} verified free models.`);
    } catch (err: any) {
      console.warn('[Boot] Could not fetch models on boot:', err.message);
    }
  });
}

export default app;
export { app };

