import React, { useState, useEffect } from 'react';
import {
  X,
  Settings,
  Sliders,
  Key,
  Database,
  CheckCircle2,
  AlertTriangle,
  RotateCw,
  ExternalLink,
  Download,
  Trash2,
  Moon,
  Sun,
  Laptop,
  Eye,
  EyeOff,
  Globe,
  RotateCcw,
} from 'lucide-react';
import { UserSettings, VerifiedFreeModel } from '../../types';
import { Theme } from '../../hooks/useTheme';
import {
  api,
  getOpenRouterConfig,
  saveOpenRouterConfig,
  clearOpenRouterConfig,
} from '../../lib/storage';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: UserSettings | null;
  onUpdateSettings: (updates: Partial<UserSettings>) => Promise<void>;
  freeModels: VerifiedFreeModel[];
  theme: Theme;
  onSetTheme: (t: Theme) => void;
  onClearAllChats: () => Promise<void>;
  initialTab?: 'general' | 'ai' | 'openrouter' | 'data';
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  freeModels,
  theme,
  onSetTheme,
  onClearAllChats,
  initialTab = 'general',
}) => {
  const [activeTab, setActiveTab] = useState<'general' | 'ai' | 'openrouter' | 'data'>(initialTab);
  const [defaultModel, setDefaultModel] = useState(
    settings?.default_model || 'meta-llama/llama-3.3-70b-instruct:free'
  );
  const [customInstructions, setCustomInstructions] = useState(settings?.custom_instructions || '');
  const [temperature, setTemperature] = useState(settings?.preferences?.temperature ?? 0.7);
  const [enterToSend, setEnterToSend] = useState(settings?.preferences?.enterToSend ?? true);

  // OpenRouter Custom Client Configuration
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState('https://openrouter.ai/api/v1');
  const [appName, setAppName] = useState('Aether AI');
  const [siteUrl, setSiteUrl] = useState(typeof window !== 'undefined' ? window.location.origin : '');
  const [showApiKey, setShowApiKey] = useState(false);

  // OpenRouter test state
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    modelCount?: number;
  } | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const cfg = getOpenRouterConfig();
      setApiKey(cfg.apiKey || '');
      setBaseUrl(cfg.baseUrl || 'https://openrouter.ai/api/v1');
      setAppName(cfg.appName || 'Aether AI');
      setSiteUrl(cfg.siteUrl || (typeof window !== 'undefined' ? window.location.origin : ''));
      if (initialTab) {
        setActiveTab(initialTab);
      }
    }
  }, [isOpen, initialTab]);

  if (!isOpen) return null;

  const handleTestConnection = async () => {
    try {
      setIsTesting(true);
      setTestResult(null);
      const res = await api.testOpenRouter({
        apiKey: apiKey.trim(),
        baseUrl: baseUrl.trim(),
        appName: appName.trim(),
        siteUrl: siteUrl.trim(),
      });
      setTestResult(res);
    } catch (err: any) {
      setTestResult({ success: false, message: err.message });
    } finally {
      setIsTesting(false);
    }
  };

  const handleResetOpenRouterConfig = () => {
    clearOpenRouterConfig();
    const defaults = getOpenRouterConfig();
    setApiKey('');
    setBaseUrl(defaults.baseUrl);
    setAppName(defaults.appName);
    setSiteUrl(typeof window !== 'undefined' ? window.location.origin : '');
    setTestResult({
      success: true,
      message: 'Reset to default OpenRouter settings. Server-side environment variables will be used if configured.',
    });
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);

      // Save client-side OpenRouter credentials
      saveOpenRouterConfig({
        apiKey: apiKey.trim(),
        baseUrl: baseUrl.trim() || 'https://openrouter.ai/api/v1',
        appName: appName.trim() || 'Aether AI',
        siteUrl: siteUrl.trim() || (typeof window !== 'undefined' ? window.location.origin : ''),
      });

      // Save user database preferences
      await onUpdateSettings({
        default_model: defaultModel,
        custom_instructions: customInstructions,
        preferences: {
          temperature,
          stream: true,
          enterToSend,
        },
      });

      onClose();
    } catch (err) {
      console.error('Failed to save settings:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportData = () => {
    window.open('/api/settings/export', '_blank');
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-warm-900 border border-warm-200 dark:border-warm-800 rounded-3xl max-w-2xl w-full h-[600px] flex flex-col shadow-warm-lg overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-warm-150 dark:border-warm-800 bg-warm-50 dark:bg-warm-850">
          <div className="flex items-center space-x-2.5">
            <Settings className="w-5 h-5 text-claude-coral" />
            <h2 className="text-lg font-serif font-semibold text-warm-900 dark:text-warm-50">
              Preferences & Configuration
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-warm-400 hover:text-warm-800 dark:hover:text-warm-200 hover:bg-warm-100 dark:hover:bg-warm-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content with Tabs */}
        <div className="flex flex-1 overflow-hidden">
          {/* Navigation Tabs */}
          <div className="w-48 border-r border-warm-150 dark:border-warm-800 bg-warm-50/50 dark:bg-warm-850/30 p-3 space-y-1">
            <button
              onClick={() => setActiveTab('general')}
              className={`w-full text-left px-3 py-2 rounded-xl text-xs font-medium flex items-center space-x-2 transition-colors ${
                activeTab === 'general'
                  ? 'bg-claude-coral text-white font-semibold'
                  : 'text-warm-600 dark:text-warm-400 hover:bg-warm-100 dark:hover:bg-warm-800'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>General</span>
            </button>

            <button
              onClick={() => setActiveTab('ai')}
              className={`w-full text-left px-3 py-2 rounded-xl text-xs font-medium flex items-center space-x-2 transition-colors ${
                activeTab === 'ai'
                  ? 'bg-claude-coral text-white font-semibold'
                  : 'text-warm-600 dark:text-warm-400 hover:bg-warm-100 dark:hover:bg-warm-800'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>AI Instructions</span>
            </button>

            <button
              onClick={() => setActiveTab('openrouter')}
              className={`w-full text-left px-3 py-2 rounded-xl text-xs font-medium flex items-center space-x-2 transition-colors ${
                activeTab === 'openrouter'
                  ? 'bg-claude-coral text-white font-semibold'
                  : 'text-warm-600 dark:text-warm-400 hover:bg-warm-100 dark:hover:bg-warm-800'
              }`}
            >
              <Key className="w-3.5 h-3.5" />
              <span>OpenRouter API</span>
            </button>

            <button
              onClick={() => setActiveTab('data')}
              className={`w-full text-left px-3 py-2 rounded-xl text-xs font-medium flex items-center space-x-2 transition-colors ${
                activeTab === 'data'
                  ? 'bg-claude-coral text-white font-semibold'
                  : 'text-warm-600 dark:text-warm-400 hover:bg-warm-100 dark:hover:bg-warm-800'
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              <span>Data & Privacy</span>
            </button>
          </div>

          {/* Tab Panel */}
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            {activeTab === 'general' && (
              <div className="space-y-5">
                <div>
                  <label className="block text-xs font-semibold text-warm-700 dark:text-warm-300 uppercase tracking-wider mb-2">
                    Interface Theme
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => onSetTheme('light')}
                      className={`p-3 rounded-2xl border text-xs font-medium flex flex-col items-center space-y-1.5 transition-all ${
                        theme === 'light'
                          ? 'border-claude-coral bg-claude-coral/10 text-claude-coral font-semibold'
                          : 'border-warm-200 dark:border-warm-800 hover:bg-warm-50 dark:hover:bg-warm-850'
                      }`}
                    >
                      <Sun className="w-4 h-4" />
                      <span>Light</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onSetTheme('dark')}
                      className={`p-3 rounded-2xl border text-xs font-medium flex flex-col items-center space-y-1.5 transition-all ${
                        theme === 'dark'
                          ? 'border-claude-coral bg-claude-coral/10 text-claude-coral font-semibold'
                          : 'border-warm-200 dark:border-warm-800 hover:bg-warm-50 dark:hover:bg-warm-850'
                      }`}
                    >
                      <Moon className="w-4 h-4" />
                      <span>Dark</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onSetTheme('system')}
                      className={`p-3 rounded-2xl border text-xs font-medium flex flex-col items-center space-y-1.5 transition-all ${
                        theme === 'system'
                          ? 'border-claude-coral bg-claude-coral/10 text-claude-coral font-semibold'
                          : 'border-warm-200 dark:border-warm-800 hover:bg-warm-50 dark:hover:bg-warm-850'
                      }`}
                    >
                      <Laptop className="w-4 h-4" />
                      <span>System</span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-warm-700 dark:text-warm-300 uppercase tracking-wider mb-1.5">
                    Default Free Model
                  </label>
                  <select
                    value={defaultModel}
                    onChange={(e) => setDefaultModel(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-warm-50 dark:bg-warm-850 border border-warm-200 dark:border-warm-700 text-sm focus:outline-none"
                  >
                    {freeModels.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.provider}) - Free
                      </option>
                    ))}
                  </select>
                </div>

                <div className="pt-2">
                  <label className="flex items-center space-x-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={enterToSend}
                      onChange={(e) => setEnterToSend(e.target.checked)}
                      className="rounded text-claude-coral focus:ring-claude-coral"
                    />
                    <span className="text-xs text-warm-800 dark:text-warm-200 font-medium">
                      Press Enter to send (Shift + Enter for new line)
                    </span>
                  </label>
                </div>
              </div>
            )}

            {activeTab === 'ai' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-warm-700 dark:text-warm-300 uppercase tracking-wider mb-1.5">
                    Global System Instructions
                  </label>
                  <p className="text-xs text-warm-500 mb-2">
                    These instructions are prepended to every conversation across all models.
                  </p>
                  <textarea
                    rows={6}
                    value={customInstructions}
                    onChange={(e) => setCustomInstructions(e.target.value)}
                    placeholder="e.g. 'You are an insightful, thoughtful research assistant. Prioritize concise, clear responses with code snippets formatted in TypeScript...'"
                    className="w-full p-3.5 rounded-2xl bg-warm-50 dark:bg-warm-850 border border-warm-200 dark:border-warm-700 text-sm focus:outline-none focus:ring-2 focus:ring-claude-coral/40 resize-none"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-warm-700 dark:text-warm-300 uppercase tracking-wider">
                      Creativity & Temperature
                    </label>
                    <span className="text-xs font-mono font-semibold text-claude-coral">
                      {temperature}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={temperature}
                    onChange={(e) => setTemperature(parseFloat(e.target.value))}
                    className="w-full accent-claude-coral"
                  />
                  <div className="flex justify-between text-[10px] text-warm-400 mt-1">
                    <span>Precise (0.0)</span>
                    <span>Balanced (0.7)</span>
                    <span>Creative (1.0)</span>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'openrouter' && (
              <div className="space-y-4 text-xs">
                {/* Custom API Credentials Box */}
                <div className="p-4 rounded-2xl bg-warm-50 dark:bg-warm-850 border border-warm-200 dark:border-warm-800 space-y-3.5">
                  <div className="flex items-center justify-between pb-2 border-b border-warm-200/60 dark:border-warm-800">
                    <div>
                      <div className="font-semibold text-warm-900 dark:text-warm-100 text-sm">
                        Client API Credentials
                      </div>
                      <div className="text-[11px] text-warm-500">
                        Configure your key and endpoint directly in the browser (no Vercel env setup needed)
                      </div>
                    </div>
                    {apiKey && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        Custom Key Active
                      </span>
                    )}
                  </div>

                  {/* API Key */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="font-semibold text-warm-800 dark:text-warm-200 uppercase tracking-wider text-[11px]">
                        OpenRouter API Key
                      </label>
                      <a
                        href="https://openrouter.ai/settings/keys"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-claude-coral hover:underline inline-flex items-center space-x-0.5 text-[11px]"
                      >
                        <span>Get free key</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    </div>
                    <div className="relative">
                      <input
                        type={showApiKey ? 'text' : 'password'}
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder="sk-or-v1-..."
                        className="w-full pl-3.5 pr-10 py-2 rounded-xl bg-white dark:bg-warm-800 border border-warm-200 dark:border-warm-700 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-claude-coral/40"
                      />
                      <button
                        type="button"
                        onClick={() => setShowApiKey(!showApiKey)}
                        className="absolute right-2.5 top-2.5 text-warm-400 hover:text-warm-700 dark:hover:text-warm-200"
                        title={showApiKey ? 'Hide key' : 'Show key'}
                      >
                        {showApiKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                    <p className="text-[10px] text-warm-500 mt-1">
                      Your key is stored locally in your browser storage and forwarded to the backend proxy for free-model inference.
                    </p>
                  </div>

                  {/* Base URL */}
                  <div>
                    <label className="block font-semibold text-warm-800 dark:text-warm-200 uppercase tracking-wider text-[11px] mb-1.5">
                      API Base URL
                    </label>
                    <input
                      type="text"
                      value={baseUrl}
                      onChange={(e) => setBaseUrl(e.target.value)}
                      placeholder="https://openrouter.ai/api/v1"
                      className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-warm-800 border border-warm-200 dark:border-warm-700 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-claude-coral/40"
                    />
                    <p className="text-[10px] text-warm-500 mt-1">
                      Default is <code>https://openrouter.ai/api/v1</code>. You can customize this if you use an alternative proxy gateway.
                    </p>
                  </div>

                  {/* App Name & Site URL */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block font-medium text-warm-700 dark:text-warm-300 text-[11px] mb-1">
                        App Name (Header)
                      </label>
                      <input
                        type="text"
                        value={appName}
                        onChange={(e) => setAppName(e.target.value)}
                        placeholder="Aether AI"
                        className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-warm-800 border border-warm-200 dark:border-warm-700 text-xs focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block font-medium text-warm-700 dark:text-warm-300 text-[11px] mb-1">
                        Site URL (Header)
                      </label>
                      <input
                        type="text"
                        value={siteUrl}
                        onChange={(e) => setSiteUrl(e.target.value)}
                        placeholder="https://..."
                        className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-warm-800 border border-warm-200 dark:border-warm-700 text-xs focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Test & Reset Buttons */}
                  <div className="flex items-center justify-between pt-2">
                    <button
                      type="button"
                      onClick={handleResetOpenRouterConfig}
                      className="px-3 py-1.5 rounded-xl text-xs font-medium text-warm-600 dark:text-warm-400 hover:bg-warm-200 dark:hover:bg-warm-800 flex items-center space-x-1 transition-colors"
                      title="Clear custom browser keys and use server environment variables"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Reset to Server Defaults</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleTestConnection}
                      disabled={isTesting}
                      className="px-3.5 py-1.5 rounded-xl bg-claude-coral hover:bg-claude-coral-hover text-white font-medium flex items-center space-x-1.5 transition-colors disabled:opacity-50 shadow-xs"
                    >
                      <RotateCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
                      <span>{isTesting ? 'Verifying...' : 'Test Connection'}</span>
                    </button>
                  </div>

                  {/* Test Result Message */}
                  {testResult && (
                    <div
                      className={`p-3 rounded-xl border text-xs flex items-start space-x-2 animate-in fade-in duration-100 ${
                        testResult.success
                          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                          : 'bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400'
                      }`}
                    >
                      {testResult.success ? (
                        <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-500 mt-0.5" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 flex-shrink-0 text-red-500 mt-0.5" />
                      )}
                      <span>{testResult.message}</span>
                    </div>
                  )}
                </div>

                {/* Free Tier Notice */}
                <div className="p-4 rounded-2xl bg-warm-100/60 dark:bg-warm-800/40 border border-warm-200 dark:border-warm-800 space-y-2">
                  <div className="font-semibold text-warm-900 dark:text-warm-100 flex items-center space-x-1.5">
                    <span>How OpenRouter Free Models Work</span>
                  </div>
                  <ul className="list-disc pl-4 space-y-1 text-warm-600 dark:text-warm-400">
                    <li>Create an account at <strong>openrouter.ai</strong> and generate a free API key.</li>
                    <li>Enter your key above and click <strong>Save Preferences</strong>.</li>
                    <li>You do not need to add credits or purchase paid tokens: Aether strictly restricts selection to models ending with <code>:free</code> with verified $0 costs.</li>
                    <li>If deploying to Vercel, this browser settings option removes the need to re-configure environment variables in your Vercel project dashboard.</li>
                  </ul>
                </div>
              </div>
            )}

            {activeTab === 'data' && (
              <div className="space-y-4 text-xs">
                <div className="p-4 rounded-2xl bg-warm-50 dark:bg-warm-850 border border-warm-200 dark:border-warm-800 flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-warm-900 dark:text-warm-100">
                      Export All Data
                    </div>
                    <div className="text-[11px] text-warm-500">
                      Download complete archive of conversations, projects, and settings as JSON
                    </div>
                  </div>
                  <button
                    onClick={handleExportData}
                    className="px-3.5 py-1.5 rounded-xl bg-warm-200 hover:bg-warm-300 dark:bg-warm-800 dark:hover:bg-warm-700 text-warm-900 dark:text-warm-100 font-medium flex items-center space-x-1.5 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Export JSON</span>
                  </button>
                </div>

                <div className="p-4 rounded-2xl bg-red-500/5 border border-red-500/20 flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-red-700 dark:text-red-400">
                      Delete All Conversations
                    </div>
                    <div className="text-[11px] text-red-600/70 dark:text-red-400/70">
                      Permanently wipe all conversation histories and messages
                    </div>
                  </div>
                  <button
                    onClick={async () => {
                      if (confirm('Are you absolutely sure you want to delete ALL conversations? This action cannot be undone.')) {
                        await onClearAllChats();
                        onClose();
                      }
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-medium flex items-center space-x-1.5 transition-colors shadow-sm"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Clear All</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end space-x-2 px-6 py-3.5 border-t border-warm-150 dark:border-warm-800 bg-warm-50 dark:bg-warm-850">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-warm-600 dark:text-warm-400 hover:bg-warm-100 dark:hover:bg-warm-800"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-5 py-2 rounded-xl text-xs font-semibold bg-claude-coral hover:bg-claude-coral-hover text-white transition-colors shadow-sm disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save Preferences'}
          </button>
        </div>
      </div>
    </div>
  );
};

